import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, ArrowRight, Upload } from 'lucide-react';
import UploadForm from '../components/UploadForm';
import FileInfo from '../components/FileInfo';
import { UploadResponse } from '../lib/types';

export default function HomePage() {
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const router = useRouter();

  const handleUploadSuccess = (response: UploadResponse) => {
    setUploadResult(response);
  };

  const handleViewDashboard = () => {
    if (uploadResult) {
      router.push(`/file/${uploadResult.fileId}`);
    }
  };

  const handleUploadAnother = () => {
    setUploadResult(null);
  };

  if (uploadResult) {
    // After upload success state
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          {/* Success Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              Upload Successful!
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your file has been permanently stored on EigenDA. Here are your file details and permanent link.
            </p>
          </div>

          {/* File Info Component */}
          <div className="max-w-2xl mx-auto">
            <FileInfo 
              metadata={{
                fileId: uploadResult.fileId,
                fileName: uploadResult.fileName,
                fileSize: uploadResult.fileSize,
                fileHash: uploadResult.fileHash,
                uploadDate: new Date().toISOString(),
                permanentLink: uploadResult.permanentLink,
                currentBlobId: uploadResult.blobId,
                expiryDate: uploadResult.expiryDate,
                refreshHistory: []
              }} 
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleViewDashboard}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              View Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            
            <button
              onClick={handleUploadAnother}
              className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Another File
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial upload state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gray-900">
              ForeverData
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Store your files permanently on EigenDA with guaranteed access forever. 
              No subscriptions, no expiration dates.
            </p>
          </div>

          {/* Subtitle */}
          <div className="flex justify-center">
            <div className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
              <p className="text-sm font-medium text-gray-700">Powered by EigenDA</p>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <UploadForm onUploadSuccess={handleUploadSuccess} />

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Powered by EigenDA • Decentralized • Permanent • Forever
          </p>
        </div>
      </div>
    </div>
  );
}