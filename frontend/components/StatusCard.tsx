import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, CheckCircle, XCircle, AlertTriangle, Activity } from 'lucide-react';
import { FileMetadata } from '../lib/types';
import { 
  getFileStatus, 
  formatRelativeTime, 
  getStatusBadgeClasses, 
  getStatusText 
} from '../lib/utils';

interface StatusCardProps {
  metadata: FileMetadata;
}

export default function StatusCard({ metadata }: StatusCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const fileStatus = getFileStatus(metadata.expiryDate);

  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">File Status</h2>
        <p className="text-sm text-gray-500">Monitor refresh cycles and health</p>
      </div>

      {/* Status Overview */}
      <div className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Current Status</p>
              <p className="text-xs text-gray-500">EigenDA blob health</p>
            </div>
          </div>
          <span className={getStatusBadgeClasses(fileStatus.level)}>
            {getStatusText(fileStatus.level)}
          </span>
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Next Refresh</p>
              <p className="text-xs text-gray-500">Automatic blob renewal</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">
              {fileStatus.timeUntilExpiry}
            </p>
            <p className="text-xs text-gray-500">
              {fileStatus.daysRemaining} days remaining
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Refresh Progress</span>
            <span>{Math.max(0, Math.min(100, ((30 - fileStatus.daysRemaining) / 30) * 100)).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                fileStatus.level === 'healthy' 
                  ? 'bg-gradient-to-r from-green-400 to-green-600'
                  : fileStatus.level === 'warning'
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                  : 'bg-gradient-to-r from-red-400 to-red-600'
              }`}
              style={{ 
                width: `${Math.max(0, Math.min(100, ((30 - fileStatus.daysRemaining) / 30) * 100))}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Refresh History */}
      {metadata.refreshHistory && metadata.refreshHistory.length > 0 && (
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <RefreshCw className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Refresh History</h3>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {metadata.refreshHistory.map((refresh, index) => (
              <div 
                key={`${refresh.timestamp}-${index}`}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {refresh.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {refresh.status === 'success' ? 'Refresh Successful' : 'Refresh Failed'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRelativeTime(refresh.timestamp)}
                    </p>
                  </div>
                  
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-gray-600">
                      <span className="font-mono">Old:</span> {refresh.oldBlobId.substring(0, 16)}...
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className="font-mono">New:</span> {refresh.newBlobId.substring(0, 16)}...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No History Message */}
      {(!metadata.refreshHistory || metadata.refreshHistory.length === 0) && (
        <div className="border-t border-gray-100 pt-6">
          <div className="text-center py-8">
            <RefreshCw className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">No Refresh History</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Your file was recently uploaded. Refresh cycles will appear here as they occur automatically.
            </p>
          </div>
        </div>
      )}

      {/* Status Info with ASCII Art */}
      <div className={`
        rounded-lg p-4 border
        ${fileStatus.level === 'healthy' 
          ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
          : fileStatus.level === 'warning'
          ? 'bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200'
          : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
        }
      `}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {fileStatus.level === 'healthy' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : fileStatus.level === 'warning' ? (
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          
          <div className="flex-1">
            <h4 className={`text-sm font-semibold mb-1 ${
              fileStatus.level === 'healthy' 
                ? 'text-green-900'
                : fileStatus.level === 'warning'
                ? 'text-yellow-900'
                : 'text-red-900'
            }`}>
              {fileStatus.level === 'healthy' 
                ? 'File is Healthy'
                : fileStatus.level === 'warning'
                ? 'Refresh Coming Soon'
                : 'Needs Attention'
              }
            </h4>
            <p className={`text-xs ${
              fileStatus.level === 'healthy' 
                ? 'text-green-700'
                : fileStatus.level === 'warning'
                ? 'text-yellow-700'
                : 'text-red-700'
            }`}>
              {fileStatus.level === 'healthy' 
                ? 'Your file is safely stored and accessible. Next refresh will happen automatically.'
                : fileStatus.level === 'warning'
                ? 'Your file will be refreshed soon to maintain permanent availability.'
                : 'Your file may need immediate attention. Check refresh status above.'
              }
            </p>
          </div>

          <div className="flex-shrink-0">
            <div className={`text-xs font-mono leading-none ${
              fileStatus.level === 'healthy' 
                ? 'text-green-300'
                : fileStatus.level === 'warning'
                ? 'text-yellow-300'
                : 'text-red-300'
            }`}>
              {'   öööööööööööööööööööööööööööööööD  '}
              <br />
              {'  ¸                                  G  '}
              <br />
              {'  ¸          MONITOR           G  '}
              <br />
              {'  ¸                                  G  '}
              <br />
              {'  $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$  '}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}