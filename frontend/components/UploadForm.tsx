import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle, Loader2 } from 'lucide-react';
import { uploadFile, uploadChunk, generateFileId } from '../lib/api';
import { UploadResponse, ApiError, PaymentSummary } from '../lib/types';
import WalletConnect from './WalletConnectNew';
import PaymentModal from './PaymentModalNew';
import { chunkFile, calculateProgress, ChunkUploadProgress } from '../lib/chunking';
import { useAccount } from 'wagmi';
import InteractiveCard from './InteractiveCard';

// Testing mode: Controlled by NEXT_PUBLIC_SKIP_PAYMENT_CHECKS environment variable
const SKIP_PAYMENT_CHECKS = process.env.NEXT_PUBLIC_SKIP_PAYMENT_CHECKS === 'true';

interface UploadFormProps {
  onUploadSuccess: (response: UploadResponse, file: File) => void;
}

export default function UploadForm({ onUploadSuccess }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentSummary | null>(null);
  const [chunkProgress, setChunkProgress] = useState<ChunkUploadProgress | null>(null);
  const [willBeChunked, setWillBeChunked] = useState(false);
  const [chunkInfo, setChunkInfo] = useState<{ totalChunks: number; chunkSize: number } | null>(null);
  const { address, isConnected } = useAccount();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(address ?? null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

  const resetUploadState = useCallback(() => {
    setSelectedFile(null);
    setFileId(null);
    setPaymentData(null);
    setIsUploading(false);
    setProgress(0);
    setChunkProgress(null);
    setWillBeChunked(false);
    setChunkInfo(null);
    setSelectedDuration(null);
  }, []);

  useEffect(() => {
    setConnectedAddress(address ?? null);
  }, [address]);

  


  const handleSingleUpload = useCallback(async (file: File, fileId: string, targetDuration: number) => {
    const response = await uploadFile(
      file,
      fileId,
      (progressValue) => {
        setProgress(progressValue);
      },
      targetDuration,
      connectedAddress
    );

    onUploadSuccess(response, file);
    resetUploadState();
  }, [connectedAddress, onUploadSuccess, resetUploadState]);

  const handleChunkedUpload = useCallback(async (file: File, fileId: string, targetDuration: number) => {
    // Split file into chunks
    const chunkingResult = await chunkFile(
      file,
      fileId,
      chunkInfo?.chunkSize
    );

    if (!chunkingResult.willBeChunked || chunkingResult.chunks.length === 0) {
      throw new Error('File chunking failed');
    }

    let bytesUploaded = 0;
    const totalBytes = chunkingResult.totalSize;

    // Upload each chunk sequentially
    for (let i = 0; i < chunkingResult.chunks.length; i++) {
      const chunk = chunkingResult.chunks[i];

      // Update chunk progress state
      const progress = calculateProgress(i, chunkingResult.chunks.length, bytesUploaded, totalBytes);
      setChunkProgress(progress);

      // Upload this chunk with its own progress tracking
      await uploadChunk(
        chunk.chunkData,
        fileId,
        chunkingResult.fileName,
        chunk.chunkIndex,
        chunk.totalChunks,
        chunk.chunkHash,
        chunkingResult.fileHash,
        chunk.isFirstChunk,
        chunk.isLastChunk,
        chunk.chunkCapacity,
        (chunkProgressValue) => {
          // Calculate overall progress including this chunk's progress
          const chunkBytesUploaded = bytesUploaded + (chunk.chunkSize * chunkProgressValue / 100);
          const overallProgress = Math.round((chunkBytesUploaded / totalBytes) * 100);
          setProgress(overallProgress);
        },
        targetDuration,
        connectedAddress
      );

      // Mark chunk as uploaded
      bytesUploaded += chunk.chunkSize;
      const finalProgress = calculateProgress(i + 1, chunkingResult.chunks.length, bytesUploaded, totalBytes);
      setChunkProgress(finalProgress);
      setProgress(finalProgress.overallProgress);
    }

    // Create success response (mimicking single upload response)
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.foreverdata.live').replace(/\/$/, '');
    const successResponse: UploadResponse = {
      fileId: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileHash: chunkingResult.fileHash,
      uploadDate: new Date().toISOString(),
      permanentLink: `${apiBaseUrl}/f/${fileId}`,
      currentBlobId: 'CHUNKED', // Chunked files don't have single blobId
      expiryDate: new Date(Date.now() + targetDuration * 24 * 60 * 60 * 1000).toISOString(),
      daysRemaining: targetDuration,
      refreshHistory: [],
    };

    onUploadSuccess(successResponse, file);
    resetUploadState();
  }, [chunkInfo, connectedAddress, onUploadSuccess, resetUploadState]);

  const handlePaymentSuccess = useCallback(async () => {
    if (!selectedFile || !fileId) return;

    setShowPaymentModal(false);
    setIsUploading(true);
    setProgress(0);
    setChunkProgress(null);
    setError(null);

    try {
      if (willBeChunked) {
        await handleChunkedUpload(
          selectedFile,
          fileId,
          selectedDuration ?? paymentData?.estimatedDuration ?? 14
        );
      } else {
        await handleSingleUpload(
          selectedFile,
          fileId,
          selectedDuration ?? paymentData?.estimatedDuration ?? 14
        );
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
      setIsUploading(false);
      setProgress(0);
      setChunkProgress(null);
    }
  }, [
    fileId,
    handleChunkedUpload,
    handleSingleUpload,
    paymentData,
    selectedDuration,
    selectedFile,
    willBeChunked
  ]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setSelectedFile(file);
    setError(null);

    if (!SKIP_PAYMENT_CHECKS && !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large: ${(file.size / 1024 / 1024 / 1024).toFixed(2)} GB (max: 1 GB)`);
      return;
    }

    if (file.size === 0) {
      setError('Cannot upload empty file');
      return;
    }

    try {
      const fileIdData = await generateFileId(file.name, file.size);
      const generatedFileId = fileIdData.fileId;
      setFileId(generatedFileId);
      setPaymentData({
        requiredAmount: BigInt(fileIdData.payment.requiredAmount),
        estimatedDuration: fileIdData.payment.estimatedDuration,
        breakdown: {
          storageCost: BigInt(fileIdData.payment.breakdown.storageCost),
          gasCost: BigInt(fileIdData.payment.breakdown.gasCost)
        },
        chunkCount: fileIdData.chunkingInfo?.totalChunks,
        chunkSize: fileIdData.chunkingInfo?.chunkSize
      });
      setSelectedDuration(fileIdData.payment.estimatedDuration);

      const isChunked = fileIdData.chunkingInfo?.willBeChunked || false;
      setWillBeChunked(isChunked);
      setChunkInfo({
        totalChunks: fileIdData.chunkingInfo?.totalChunks ?? 1,
        chunkSize: fileIdData.chunkingInfo?.chunkSize ?? 0
      });

      if (SKIP_PAYMENT_CHECKS) {
        setIsUploading(true);
        setProgress(0);
        setChunkProgress(null);

        if (isChunked) {
          await handleChunkedUpload(file, generatedFileId, fileIdData.payment.estimatedDuration);
        } else {
          await handleSingleUpload(file, generatedFileId, fileIdData.payment.estimatedDuration);
        }
      } else {
        setShowPaymentModal(true);
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to upload file. Please try again.');
      setIsUploading(false);
      setProgress(0);
      setChunkProgress(null);
    }
  }, [handleChunkedUpload, handleSingleUpload, isConnected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: isUploading
  });

  const dropzoneClassName = [
    'group relative overflow-hidden rounded-[32px] border border-white/15 p-6 sm:p-8 md:p-12 text-center',
    'bg-slate-950/70 text-white backdrop-blur-xl',
    'transition-all duration-300 ease-out shadow-[rgba(3,7,18,0.7)_0px_45px_95px_-25px]',
    isDragActive
      ? 'border-blue-200/80 shadow-[rgba(59,130,246,0.65)_0px_55px_105px_-25px] scale-[1.01]'
      : 'hover:border-white/35 hover:shadow-[rgba(59,130,246,0.45)_0px_55px_105px_-35px]',
    isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
  ].join(' ');

  const rootProps = getRootProps({ className: dropzoneClassName });
  const inputProps = getInputProps();

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Wallet Connection - Hidden in testing mode */}
      {!SKIP_PAYMENT_CHECKS && (
        <div className="mb-6">
      <WalletConnect onConnect={(walletAddress) => setConnectedAddress(walletAddress)} showBalance={true} />
        </div>
      )}

      {/* Testing Mode Indicator */}
      {SKIP_PAYMENT_CHECKS && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-medium">
            ⚠️ Testing Mode: Payment checks disabled
          </p>
        </div>
      )}

      {/* Upload Area */}
      <InteractiveCard containerClassName="mb-10" {...rootProps}>
        <input {...inputProps} />

        {/* Layered background */}
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.45),rgba(79,70,229,0.12),transparent_75%)] opacity-90" />
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.15)_0%,transparent_40%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.3),transparent_60%)]" />
        </div>
        <div className="pointer-events-none absolute inset-8 rounded-[24px] border border-white/20 opacity-60" />

        <div className="relative z-10">
          {isUploading ? (
            <div className="space-y-5">
              <div className="flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-200 animate-spin" />
              </div>
              <div className="space-y-3 text-white/90">
                <p className="text-lg font-semibold">
                  {willBeChunked ? 'Uploading in EigenDA blobs' : 'Uploading to EigenDA'}
                </p>
                {chunkProgress && (
                  <p className="text-sm text-white/70">
                    Chunk {chunkProgress.currentChunk} of {chunkProgress.totalChunks}
                  </p>
                )}
                <div className="w-full bg-white/15 rounded-full h-2 max-w-md mx-auto overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-300 via-indigo-300 to-pink-300 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-white/70">{progress}% complete</p>
              </div>
            </div>
          ) : (
            <div className="relative min-h-[260px] text-white md:min-h-[280px]">
              <div className="absolute inset-x-4 top-4 flex flex-col gap-3 text-left sm:inset-x-6 sm:flex-row sm:items-center sm:gap-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/30 bg-white/5 shrink-0">
                  {isDragActive ? (
                    <Upload className="w-4 h-4 text-sky-200" />
                  ) : (
                    <File className="w-4 h-4 text-white/85" />
                  )}
                </div>
                <div className="space-y-1 max-w-2xl sm:text-left">
                  <p className="text-[0.55rem] sm:text-[0.6rem] uppercase tracking-[0.5em] text-white/45">
                    EigenDA ready
                  </p>
                  <p className="text-[clamp(0.78rem,1.35vw,0.95rem)] text-white/70 leading-relaxed">
                    Drop any file—ForeverData handles payments, proofs, and chunking automatically.
                  </p>
                </div>
              </div>

              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center px-4 pt-12 sm:px-6 sm:pt-14">
                <p className="font-semibold tracking-tight text-white text-[clamp(1.5rem,3vw,2.2rem)] leading-tight">
                  {isDragActive ? 'Drop your file into orbit' : 'Upload a file to EigenDA'}
                </p>
                <p className="text-[clamp(0.85rem,1.8vw,1rem)] text-white/80">
                  Drag and drop, or{' '}
                  <span className="text-sky-200 font-semibold underline-offset-4 hover:underline">
                    click to browse
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </InteractiveCard>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Payment Modal - Only shown when not in testing mode */}
      {!SKIP_PAYMENT_CHECKS && showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          file={selectedFile}
          fileId={fileId}
          paymentData={paymentData}
          walletAddress={connectedAddress}
          chunkCount={chunkInfo?.totalChunks ?? 1}
          chunkSize={chunkInfo?.chunkSize ?? paymentData?.chunkSize}
          onQuoteChange={(quote, days) => {
            setPaymentData((prev) => {
              if (
                prev &&
                prev.requiredAmount === quote.requiredAmount &&
                prev.estimatedDuration === quote.estimatedDuration &&
                prev.breakdown.storageCost === quote.breakdown.storageCost &&
                prev.breakdown.gasCost === quote.breakdown.gasCost &&
                prev.chunkCount === quote.chunkCount &&
                prev.chunkSize === quote.chunkSize
              ) {
                return prev;
              }
              return quote;
            });
            setSelectedDuration(days);
          }}
        />
      )}
    </div>
  );
}
