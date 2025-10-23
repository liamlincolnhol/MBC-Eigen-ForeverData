import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle, Loader2, Wallet } from 'lucide-react';
import { uploadFile } from '../lib/api';
import { UploadResponse, ApiError } from '../lib/types';
import { useWallet } from '../hooks/useWallet';
import { default as WalletConnectComponent } from '../components/WalletConnect';
import { default as PaymentModalComponent } from '../components/PaymentModal';

interface UploadFormProps {
  onUploadSuccess: (response: UploadResponse, file: File) => void;
}

export default function UploadForm({ onUploadSuccess }: UploadFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { isConnected } = useWallet();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setSelectedFile(file);
    
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    
    // Show payment modal
    setShowPaymentModal(true);
  }, [isConnected]);

  const handlePaymentSuccess = async () => {
    if (!selectedFile) return;
    
    setShowPaymentModal(false);
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const response = await uploadFile(selectedFile, (progressValue) => {
        setProgress(progressValue);
      });
      
      onUploadSuccess(response, selectedFile);
      setSelectedFile(null);
      setIsUploading(false);
      setProgress(0);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
      setIsUploading(false);
      setProgress(0);
    }
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
                <p className="text-lg font-medium text-gray-700">Uploading...</p>
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
        />
      )}
    </div>
  );
}