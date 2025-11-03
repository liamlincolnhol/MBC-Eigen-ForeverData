import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { AlertTriangle, TrendingUp, Download, Eye } from 'lucide-react';
import { FOREVER_DATA_PAYMENTS_ADDRESS, FOREVER_DATA_PAYMENTS_ABI } from '../lib/payment';
import { formatUsd, ethToUsd } from '../lib/coinGecko';

interface FileBalanceCardProps {
  fileId: string;
  fileName: string;
  fileSize: number; // in bytes
  createdAt: string;
  ownerAddress?: string | null;
  onTopUp: (balance: bigint) => void;
  onView: () => void;
  onDownload: () => void;
}

export default function FileBalanceCard({
  fileId,
  fileName,
  fileSize,
  createdAt,
  onTopUp,
  ownerAddress,
  onView,
  onDownload,
}: FileBalanceCardProps) {
  const [usdBalance, setUsdBalance] = useState<string>('...');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [balanceWei, setBalanceWei] = useState<bigint>(BigInt(0));

  // Fetch file balance from smart contract
  const { data: balanceData, isLoading } = useReadContract({
    address: FOREVER_DATA_PAYMENTS_ADDRESS as `0x${string}`,
    abi: FOREVER_DATA_PAYMENTS_ABI,
    functionName: 'getFileBalance',
    args: [fileId],
    query: {
      enabled: Boolean(fileId),
      refetchInterval: 15000
    }
  });

  useEffect(() => {
    if (typeof balanceData === 'bigint') {
      setBalanceWei(balanceData);
    } else {
      setBalanceWei(BigInt(0));
    }
  }, [balanceData]);

  const balance = parseFloat(formatEther(balanceWei));

  useEffect(() => {
    if (balance > 0) {
      // Calculate USD value
      ethToUsd(balance).then((usd) => setUsdBalance(formatUsd(usd)));

      // Calculate days remaining
      // Daily cost = (file size in MB) * 0.001 ETH per MB / 30 days
      const fileSizeMB = fileSize / (1024 * 1024);
      if (fileSizeMB > 0) {
        const dailyCost = (fileSizeMB * 0.001) / 30;
        const days = Math.floor(balance / dailyCost);
        setDaysRemaining(days);
      } else {
        setDaysRemaining(null);
      }
    } else {
      setUsdBalance('$0.00');
      setDaysRemaining(0);
    }
  }, [balance, fileSize]);

  const getStatusColor = () => {
    if (daysRemaining === null || isLoading) return 'gray';
    if (daysRemaining < 3) return 'red';
    if (daysRemaining < 7) return 'yellow';
    return 'green';
  };

  const statusColor = getStatusColor();
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

  return (
    <div className={`rounded-xl border-2 ${
      statusColor === 'red' ? 'border-red-200 bg-red-50' :
      statusColor === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
      statusColor === 'green' ? 'border-green-200 bg-green-50' :
      'border-gray-200 bg-white'
    } p-4 space-y-3 hover:shadow-lg transition-shadow`}>
      {/* File Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{fileName}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {fileSizeMB} MB • Uploaded {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Balance Info */}
      <div className={`rounded-lg ${
        statusColor === 'red' ? 'bg-red-100' :
        statusColor === 'yellow' ? 'bg-yellow-100' :
        statusColor === 'green' ? 'bg-green-100' :
        'bg-gray-100'
      } p-3 space-y-2`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">Balance:</span>
          <div className="text-right">
            <div className="text-sm font-bold text-gray-900">
              {isLoading ? '...' : balance.toFixed(6)} ETH
            </div>
            <div className="text-xs text-gray-600">{usdBalance}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">Storage Left:</span>
          <div className={`text-sm font-bold ${
            statusColor === 'red' ? 'text-red-700' :
            statusColor === 'yellow' ? 'text-yellow-700' :
            statusColor === 'green' ? 'text-green-700' :
            'text-gray-700'
          }`}>
            {isLoading ? '...' : daysRemaining !== null ? `~${daysRemaining} days` : 'N/A'}
          </div>
        </div>

        {/* Warning Message */}
        {daysRemaining !== null && daysRemaining < 7 && daysRemaining > 0 && (
          <div className="flex items-start space-x-2 pt-2 border-t border-current/20">
            <AlertTriangle className={`w-4 h-4 mt-0.5 ${
              daysRemaining < 3 ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <p className={`text-xs ${
              daysRemaining < 3 ? 'text-red-700' : 'text-yellow-700'
            }`}>
              {daysRemaining < 3 ? 'Critical: ' : 'Warning: '}
              Storage expires soon. Top up to extend.
            </p>
          </div>
        )}

        {daysRemaining === 0 && (
          <div className="flex items-start space-x-2 pt-2 border-t border-red-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600" />
            <p className="text-xs text-red-700 font-medium">
              File has expired. Top up to restore access.
            </p>
          </div>
        )}
      </div>

      {ownerAddress && (
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>Owner</span>
          <span className="font-mono">
            {ownerAddress.slice(0, 6)}...{ownerAddress.slice(-4)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2 pt-2">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <Eye className="w-3 h-3" />
          <span>View</span>
        </button>
        <button
          onClick={() => onTopUp(balanceWei)}
          disabled={isLoading}
          className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-xs font-medium rounded-lg transition ${
            statusColor === 'red' || statusColor === 'yellow'
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-blue-700 bg-blue-100 border border-blue-300 hover:bg-blue-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <TrendingUp className="w-3 h-3" />
          <span>Top Up</span>
        </button>
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <Download className="w-3 h-3" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
}
