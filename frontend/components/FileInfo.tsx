import React, { useState } from 'react';
import { Copy, ExternalLink, File, Check, Hash, Calendar } from 'lucide-react';
import { FileMetadata } from '../lib/types';
import { formatFileSize, formatDisplayDate, copyToClipboard, truncateFileName } from '../lib/utils';

interface FileInfoProps {
  metadata: FileMetadata;
}

export default function FileInfo({ metadata }: FileInfoProps) {
  const [copied, setCopied] = useState(false);
  const [blobKeyCopied, setBlobKeyCopied] = useState(false);

  const blobExplorerBase = (process.env.NEXT_PUBLIC_BLOB_EXPLORER_URL || 'https://blobs-sepolia.eigenda.xyz/blobs').replace(/\/$/, '');
  const blobExplorerUrl = metadata.blobKey
    ? `${blobExplorerBase}${blobExplorerBase.includes('?') ? '&' : '?'}blobKey=${metadata.blobKey}`
    : null;

  const handleCopy = async () => {
    const success = await copyToClipboard(metadata.permanentLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyBlobKey = async () => {
    if (!metadata.blobKey) return;

    const success = await copyToClipboard(metadata.blobKey);
    if (success) {
      setBlobKeyCopied(true);
      setTimeout(() => setBlobKeyCopied(false), 2000);
    }
  };

  const handleExternalLink = () => {
    window.open(metadata.permanentLink, '_blank', 'noopener,noreferrer');
  };

  const handleBlobExplorerLink = () => {
    if (!blobExplorerUrl) return;
    window.open(blobExplorerUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">File Information</h2>
        <p className="text-sm text-gray-500">Details about your uploaded file</p>
      </div>

      {/* File Details */}
      <div className="space-y-4">
        {/* File Name */}
        <div className="flex items-start space-x-3">
          <File className="w-5 h-5 text-gray-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">File Name</p>
            <p className="text-sm text-gray-600 break-all" title={metadata.fileName}>
              {truncateFileName(metadata.fileName, 50)}
            </p>
          </div>
        </div>

        {/* Expiry Date */}
        <div className="flex items-start space-x-3">
          <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Expires</p>
            <p className="text-sm text-gray-600">
              {metadata.expiryDate ? (
                <>
                  {formatDisplayDate(metadata.expiryDate)}
                  {metadata.daysRemaining && (
                    <span className="ml-2 text-gray-500">
                      ({metadata.daysRemaining} days remaining)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-gray-500">Never</span>
              )}
            </p>
          </div>
        </div>

        {/* File Size */}
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-gray-400 mt-0.5 flex items-center justify-center">
            <span className="text-xs font-mono">📁</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">File Size</p>
            <p className="text-sm text-gray-600">{formatFileSize(metadata.fileSize)}</p>
          </div>
        </div>

        {/* Upload Date */}
        <div className="flex items-start space-x-3">
          <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Upload Date</p>
            <p className="text-sm text-gray-600">{formatDisplayDate(metadata.uploadDate)}</p>
          </div>
        </div>

        {/* File Hash */}
        <div className="flex items-start space-x-3">
          <Hash className="w-5 h-5 text-gray-400 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">File Hash</p>
            <p className="text-xs font-mono text-gray-600 break-all bg-gray-50 p-2 rounded">
              {metadata.fileHash}
            </p>
          </div>
        </div>

        {/* Current Blob ID */}
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-gray-400 mt-0.5 flex items-center justify-center">
            <span className="text-xs font-mono">🔗</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Current Blob ID</p>
            <p className="text-xs font-mono text-gray-600 break-all bg-gray-50 p-2 rounded">
              {metadata.currentBlobId}
            </p>
          </div>
        </div>

        {/* Blob Explorer */}
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-gray-400 mt-0.5 flex items-center justify-center">
            <span className="text-xs font-mono">🛰️</span>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Blob Explorer</p>
              {metadata.blobKey && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyBlobKey}
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                      blobKeyCopied
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {blobKeyCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copy key
                      </>
                    )}
                  </button>
                  {blobExplorerUrl && (
                    <button
                      onClick={handleBlobExplorerLink}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 transition-colors duration-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Open explorer
                    </button>
                  )}
                </div>
              )}
            </div>
            {metadata.blobKey ? (
              <>
                <p className="text-xs font-mono text-gray-600 break-all bg-gray-50 p-2 rounded">
                  {metadata.blobKey}
                </p>
                <p className="text-xs text-gray-500">
                  Use this blob key to inspect the dispersal on EigenDA relays or the official blob explorer.
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                Blob key will be available after the first successful upload completes.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Permanent Link Section */}
      <div className="border-t border-gray-100 pt-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Permanent Link</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className={`
                  inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
                  ${copied 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }
                `}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </button>
              
              <button
                onClick={handleExternalLink}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 transition-colors duration-200"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Open
              </button>
            </div>
          </div>

          {/* Link Display */}
          <div className="relative">
            <input
              type="text"
              value={metadata.permanentLink}
              readOnly
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-100/20 to-purple-100/20 pointer-events-none" />
          </div>

          <p className="text-xs text-gray-500">
            This link will remain accessible forever. Share it with anyone who needs access to your file.
          </p>
        </div>
      </div>

      {/* Success Message with ASCII art */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-green-900">Upload Successful!</h4>
            <p className="text-xs text-green-700 mt-1">
              Your file has been permanently stored on EigenDA. The link above will work forever.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="px-2 py-1 bg-green-100 rounded">
              <span className="text-xs font-semibold text-green-700">FOREVER</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}