import React, { useState } from 'react';
import { CheckCircle, Upload } from 'lucide-react';
import UploadForm from '../components/UploadForm';
import { UploadResponse } from '../lib/types';

export default function HomePage() {
  const [uploadResult, setUploadResult] = useState<{response: UploadResponse, file: File} | null>(null);

  const handleUploadSuccess = (response: UploadResponse, file: File) => {
    setUploadResult({response, file});
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

          {/* Simple File Info */}
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">File Details</h3>
              <p className="text-sm text-gray-600">Name: {uploadResult.file.name}</p>
              <p className="text-sm text-gray-600">Size: {(uploadResult.file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Permanent Link</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={uploadResult.response.link}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(uploadResult.response.link)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={handleUploadAnother}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
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