import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle, Loader2, Wallet } from 'lucide-react';
import { uploadFile, uploadChunk, generateFileId } from '../lib/api';
import { UploadResponse, ApiError } from '../lib/types';
import { useWallet } from '../hooks/useWallet';
import { default as WalletConnectComponent } from '../components/WalletConnect';
import { default as PaymentModalComponent } from '../components/PaymentModal';
import { chunkFile, shouldChunkFile, calculateProgress, ChunkUploadProgress } from '../lib/chunking';

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
  const [paymentData, setPaymentData] = useState<any>(null);
  const [chunkProgress, setChunkProgress] = useState<ChunkUploadProgress | null>(null);
  const [willBeChunked, setWillBeChunked] = useState(false);
  const { isConnected } = useWallet();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setSelectedFile(file);
    setError(null);

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    // Validate file size limits
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
      // Generate fileId and payment details
      const fileIdData = await generateFileId(file.name, file.size);
      setFileId(fileIdData.fileId);
      setPaymentData(fileIdData.payment);

      // Check if file will be chunked
      const isChunked = fileIdData.chunkingInfo?.willBeChunked || false;
      setWillBeChunked(isChunked);

      // Show payment modal
      setShowPaymentModal(true);
    } catch (err) {
      console.error('Failed to generate fileId:', err);
      setError('Failed to prepare file for upload. Please try again.');
    }
  }, [isConnected]);

  const handlePaymentSuccess = async () => {
    if (!selectedFile || !fileId) return;

    setShowPaymentModal(false);
    setIsUploading(true);
    setProgress(0);
    setChunkProgress(null);
    setError(null);

    try {
      // Decide upload strategy based on file size
      if (willBeChunked) {
        await handleChunkedUpload(selectedFile, fileId);
      } else {
        await handleSingleUpload(selectedFile, fileId);
      }

      // Note: onUploadSuccess will be called from the respective handlers
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
      setIsUploading(false);
      setProgress(0);
      setChunkProgress(null);
    }
  };

  const handleSingleUpload = async (file: File, fileId: string) => {
    const response = await uploadFile(file, fileId, (progressValue) => {
      setProgress(progressValue);
    });

    onUploadSuccess(response, file);
    resetUploadState();
  };

  const handleChunkedUpload = async (file: File, fileId: string) => {
    // Split file into chunks
    const chunkingResult = await chunkFile(file, fileId);

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
        (chunkProgressValue) => {
          // Calculate overall progress including this chunk's progress
          const chunkBytesUploaded = bytesUploaded + (chunk.chunkSize * chunkProgressValue / 100);
          const overallProgress = Math.round((chunkBytesUploaded / totalBytes) * 100);
          setProgress(overallProgress);
        }
      );

      // Mark chunk as uploaded
      bytesUploaded += chunk.chunkSize;
      const finalProgress = calculateProgress(i + 1, chunkingResult.chunks.length, bytesUploaded, totalBytes);
      setChunkProgress(finalProgress);
      setProgress(finalProgress.overallProgress);
    }

    // Create success response (mimicking single upload response)
    const successResponse: UploadResponse = {
      fileId: fileId,
      fileName: file.name,
      fileSize: file.size,
      fileHash: chunkingResult.fileHash,
      uploadDate: new Date().toISOString(),
      permanentLink: `${window.location.origin}/f/${fileId}`,
      currentBlobId: 'CHUNKED', // Chunked files don't have single blobId
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      daysRemaining: 30,
      refreshHistory: [],
    };

    onUploadSuccess(successResponse, file);
    resetUploadState();
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setFileId(null);
    setPaymentData(null);
    setIsUploading(false);
    setProgress(0);
    setChunkProgress(null);
    setWillBeChunked(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: isUploading
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Wallet Connection */}
      <div className="mb-6">
        <WalletConnectComponent onConnect={() => {}} />
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {/* Background gradient effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 opacity-60" />
        
        <div className="relative z-10">
          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">
                  {willBeChunked ? 'Uploading in chunks...' : 'Uploading...'}
                </p>
                {chunkProgress && (
                  <p className="text-sm text-gray-600">
                    Chunk {chunkProgress.currentChunk} of {chunkProgress.totalChunks}
                  </p>
                )}
                <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">{progress}% complete</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                {isDragActive ? (
                  <Upload className="w-12 h-12 text-blue-600" />
                ) : (
                  <File className="w-12 h-12 text-gray-400" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-900">
                  {isDragActive ? 'Drop your file here' : 'Upload your file'}
                </p>
                <p className="text-sm text-gray-500">
                  Drag and drop a file here, or{' '}
                  <span className="text-blue-600 font-medium">click to browse</span>
                </p>
              </div>

              {/* Upload info */}
              <div className="flex justify-center mt-6">
                <div className="px-3 py-1 bg-gray-100 rounded-full">
                  <p className="text-xs text-gray-600">Permanent • Decentralized • Forever</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModalComponent
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          file={selectedFile}
          fileId={fileId}
          paymentData={paymentData}
        />
      )}
    </div>
  );
}