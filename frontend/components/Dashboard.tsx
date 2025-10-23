import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, FileText, ExternalLink, AlertCircle, CheckCircle, AlertTriangle, ChevronUp, Wallet, DollarSign } from 'lucide-react';
import { ethers } from 'ethers';

interface FileData {
  fileId: string;
  fileName: string;
  hash: string;
  blobId: string;
  expiry: string;
  createdAt: string;
  status: 'active' | 'expiring_soon' | 'expired';
  days_remaining: number;
  // Crypto payment fields
  paymentStatus?: 'pending' | 'paid' | 'insufficient' | 'expired';
  payerAddress?: string;
  paymentAmount?: string;
  contractBalance?: string;
  lastBalanceCheck?: string;
  fileSize?: number;
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
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api.foreverdata.live' 
        : 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/files`);
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

  const formatEth = (weiString?: string) => {
    if (!weiString || weiString === '0') return '0.000';
    try {
      const wei = BigInt(weiString);
      return parseFloat(ethers.formatEther(wei)).toFixed(6);
    } catch {
      return '0.000';
    }
  };

  const getPaymentStatusBadge = (paymentStatus?: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (paymentStatus) {
      case 'paid':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'insufficient':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'expired':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-blue-100 text-blue-800`;
    }
  };

  const getPaymentStatusIcon = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'paid':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'insufficient':
        return <AlertTriangle className="w-3 h-3 text-red-500" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      default:
        return <DollarSign className="w-3 h-3 text-blue-500" />;
    }
  };

  const calculateRefreshCost = (fileSize?: number): string => {
    if (!fileSize || fileSize <= 0) {
      // Default cost for files without size information: 0.001 ETH
      return '1000000000000000'; // 0.001 ETH in Wei
    }
    
    // Calculate based on file size - roughly 0.001 ETH per MB for 14 days
    const sizeInMB = fileSize / (1024 * 1024);
    const costPerMB = parseFloat(ethers.formatEther('1000000000000000')); // 0.001 ETH
    const totalCost = costPerMB * Math.ceil(sizeInMB);
    return ethers.parseEther(totalCost.toString()).toString();
  };

  const calculateRefreshesRemaining = (contractBalance?: string, fileSize?: number): number => {
    if (!contractBalance || contractBalance === '0') return 0;
    
    try {
      const balance = BigInt(contractBalance);
      const refreshCost = BigInt(calculateRefreshCost(fileSize));
      
      if (refreshCost === BigInt(0)) return 0;
      
      return Number(balance / refreshCost);
    } catch {
      return 0;
    }
  };

  const calculateDaysRemaining = (refreshesRemaining: number): number => {
    // Each refresh extends file life by 14 days
    return refreshesRemaining * 14;
  };

  const getBalanceWarning = (refreshesRemaining: number) => {
    if (refreshesRemaining === 0) {
      return { color: 'text-red-600', message: 'Balance depleted - add funds!' };
    } else if (refreshesRemaining <= 2) {
      return { color: 'text-red-600', message: 'Critical: Very low balance' };
    } else if (refreshesRemaining <= 5) {
      return { color: 'text-yellow-600', message: 'Warning: Low balance' };
    } else {
      return { color: 'text-green-600', message: 'Good balance' };
    }
  };

  const copyLink = (fileId: string) => {
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
      <div className={`fixed top-0 right-0 w-1/2 h-full bg-white rounded-l-2xl shadow-2xl z-50 transition-all duration-500 ease-out flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto min-h-0">
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
              {/* Crypto Payment Summary */}
              {files.some(f => f.payerAddress) && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                  <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                    <Wallet className="w-4 h-4 mr-2" />
                    Crypto Payment Summary
                  </h3>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div className="text-center">
                      <p className="text-blue-600 font-medium">
                        {files.filter(f => f.payerAddress).length}
                      </p>
                      <p className="text-blue-700">Paid Files</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-600 font-medium font-mono">
                        {formatEth(
                          files
                            .filter(f => f.contractBalance)
                            .reduce((sum, f) => sum + BigInt(f.contractBalance || '0'), BigInt(0))
                            .toString()
                        )}
                      </p>
                      <p className="text-blue-700">Total Balance (ETH)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-600 font-medium">
                        {files
                          .filter(f => f.payerAddress)
                          .reduce((sum, f) => sum + calculateRefreshesRemaining(f.contractBalance, f.fileSize), 0)
                        }
                      </p>
                      <p className="text-blue-700">Total Refreshes</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-600 font-medium">
                        {files.filter(f => calculateRefreshesRemaining(f.contractBalance, f.fileSize) <= 2 && f.payerAddress).length}
                      </p>
                      <p className="text-blue-700">Critical Balance</p>
                    </div>
                  </div>
                </div>
              )}

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

                    {/* Crypto Payment Information */}
                    {file.payerAddress && (
                      <div className="border-t border-gray-200 pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Wallet className="w-3 h-3 text-blue-500" />
                            <span className="text-xs font-medium text-gray-700">Crypto Payment</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getPaymentStatusIcon(file.paymentStatus)}
                            <span className={getPaymentStatusBadge(file.paymentStatus)}>
                              {file.paymentStatus || 'free'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Contract Balance</span>
                            <p className="font-mono text-gray-900">
                              {formatEth(file.contractBalance)} ETH
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment Amount</span>
                            <p className="font-mono text-gray-900">
                              {formatEth(file.paymentAmount)} ETH
                            </p>
                          </div>
                        </div>

                        {/* Refresh Calculator */}
                        {(() => {
                          const refreshesRemaining = calculateRefreshesRemaining(file.contractBalance, file.fileSize);
                          const daysRemaining = calculateDaysRemaining(refreshesRemaining);
                          const refreshCostEth = formatEth(calculateRefreshCost(file.fileSize));
                          const warning = getBalanceWarning(refreshesRemaining);
                          
                          return (
                            <div className="bg-gray-50 rounded p-2 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">Refresh Calculator</span>
                                <span className={`font-medium ${warning.color}`}>
                                  {warning.message}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center">
                                  <p className="font-medium text-gray-900">{refreshesRemaining}</p>
                                  <p className="text-gray-500">Refreshes Left</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-medium text-gray-900">{daysRemaining}d</p>
                                  <p className="text-gray-500">Days Coverage</p>
                                </div>
                                <div className="text-center">
                                  <p className="font-mono text-gray-900">{refreshCostEth}</p>
                                  <p className="text-gray-500">Per Refresh</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        
                        <div className="text-xs">
                          <span className="text-gray-500">Payer: </span>
                          <span className="font-mono text-gray-700">
                            {file.payerAddress.slice(0, 6)}...{file.payerAddress.slice(-4)}
                          </span>
                        </div>
                        
                        {file.lastBalanceCheck && (
                          <div className="text-xs text-gray-500">
                            Last checked: {formatDate(file.lastBalanceCheck)}
                          </div>
                        )}
                      </div>
                    )}

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

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyLink(file.fileId)}
                        className="flex items-center justify-center space-x-2 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Copy Link</span>
                      </button>
                      <a
                        href={`https://blobs-sepolia.eigenda.xyz/blobs/${file.blobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Blob on Blob Explorer</span>
                      </a>
                    </div>
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
