import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, FileText, ExternalLink, AlertCircle, CheckCircle, AlertTriangle, ChevronUp } from 'lucide-react';

interface FileData {
  fileId: string;
  fileName: string;
  hash: string;
  blobId: string;
  expiry: string;
  createdAt: string;
  status: 'active' | 'expiring_soon' | 'expired';
  days_remaining: number;
}

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Dashboard({ isOpen, onClose }: DashboardProps) {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/files');
      if (!response.ok) throw new Error('Failed to fetch files');
      const data = await response.json();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expiring_soon':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'expiring_soon':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'expired':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const copyLink = (fileId: string) => {
    // Use production URL for production, localhost for development
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.foreverdata.live' 
      : 'http://localhost:3001';
    const link = `${baseUrl}/f/${fileId}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Dashboard Peninsula - Slides in from right */}
      <div className={`fixed top-0 right-0 w-1/2 h-full bg-white rounded-l-2xl shadow-2xl z-50 transition-all duration-500 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            File Dashboard
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p>No files uploaded yet</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Files Grid */}
              <div className="grid gap-4">
                {files.map((file) => (
                  <div key={file.fileId} className="bg-gray-50 rounded-lg p-4 space-y-3 hover:bg-gray-100 transition-colors">
                    {/* File Name & Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {file.fileName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {file.fileId.slice(0, 12)}...
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        {getStatusIcon(file.status)}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-between items-center">
                      <span className={getStatusBadge(file.status)}>
                        {file.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-medium ${
                        file.days_remaining <= 0 ? 'text-red-600' :
                        file.days_remaining <= 1 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {file.days_remaining <= 0 ? 'Expired' : `${file.days_remaining}d left`}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="flex items-center text-gray-500 mb-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>Uploaded</span>
                        </div>
                        <p className="text-gray-900">{formatDate(file.createdAt)}</p>
                      </div>
                      <div>
                        <div className="flex items-center text-gray-500 mb-1">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>Expires</span>
                        </div>
                        <p className="text-gray-900">{formatDate(file.expiry)}</p>
                      </div>
                    </div>

                    {/* Copy Link Button */}
                    <button
                      onClick={() => copyLink(file.fileId)}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}