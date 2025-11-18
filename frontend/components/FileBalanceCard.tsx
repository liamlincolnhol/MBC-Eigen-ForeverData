import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { AlertTriangle, TrendingUp, Download, Eye, Copy, ExternalLink } from 'lucide-react';
import { FOREVER_DATA_PAYMENTS_ADDRESS, FOREVER_DATA_PAYMENTS_ABI } from '../lib/payment';
import { formatUsd, ethToUsd } from '../lib/coinGecko';

interface FileBalanceCardProps {
  fileId: string;
  fileName: string;
  fileSize: number; // in bytes
  createdAt: string;
  permanentLink: string;
  blobKey?: string;
  ownerAddress?: string | null;
  onTopUp: (balance: bigint, owner: string | null) => void;
  onView: () => void;
  onDownload: () => void;
}

export default function FileBalanceCard({
  fileId,
  fileName,
  fileSize,
  createdAt,
  permanentLink,
  blobKey,
  onTopUp,
  ownerAddress,
  onView,
  onDownload,
}: FileBalanceCardProps) {
  const [usdBalance, setUsdBalance] = useState<string>('...');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [balanceWei, setBalanceWei] = useState<bigint>(BigInt(0));
  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [copiedBlobKey, setCopiedBlobKey] = useState(false);

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

  const { data: ownerData } = useReadContract({
    address: FOREVER_DATA_PAYMENTS_ADDRESS as `0x${string}`,
    abi: FOREVER_DATA_PAYMENTS_ABI,
    functionName: 'getFileOwner',
    args: [fileId],
    query: {
      enabled: Boolean(fileId)
    }
  });

  useEffect(() => {
    if (typeof balanceData === 'bigint') {
      setBalanceWei(balanceData);
    } else {
      setBalanceWei(BigInt(0));
    }
  }, [balanceData]);

  useEffect(() => {
    if (typeof ownerData === 'string' && ownerData !== '0x0000000000000000000000000000000000000000') {
      setContractOwner(ownerData);
    } else if (ownerAddress) {
      setContractOwner(ownerAddress);
    }
  }, [ownerData, ownerAddress]);

  const balance = parseFloat(formatEther(balanceWei));
  const blobExplorerBase = (process.env.NEXT_PUBLIC_BLOB_EXPLORER_URL || 'https://blobs-sepolia.eigenda.xyz/blobs').replace(/\/$/, '');
  const blobExplorerUrl = blobKey
    ? `${blobExplorerBase}${blobExplorerBase.includes('?') ? '&' : '?'}blobKey=${blobKey}`
    : null;

  useEffect(() => {
    if (balance > 0) {
      ethToUsd(balance).then((usd) => setUsdBalance(formatUsd(usd)));

      const bytesPerMb = 1024 * 1024;
      const roundedSizeInMb = fileSize > 0 ? Math.max(1, Math.ceil(fileSize / bytesPerMb)) : 1;
      const monthlyCostEth = roundedSizeInMb * 0.001; // Matches backend pricing
      const dailyCostEth = monthlyCostEth / 30;

      if (dailyCostEth > 0) {
        const days = Math.floor(balance / dailyCostEth);
        setDaysRemaining(days);
      } else {
        setDaysRemaining(null);
      }
    } else {
      setUsdBalance('$0.00');
      setDaysRemaining(0);
    }
  }, [balance, fileSize]);

  const roundedDays = daysRemaining !== null ? Math.max(0, Math.floor(daysRemaining)) : daysRemaining;

  const getStatusColor = () => {
    if (roundedDays === null || isLoading) return 'gray';
    if (roundedDays < 3) return 'red';
    if (roundedDays < 7) return 'yellow';
    return 'green';
  };

  const statusColor = getStatusColor();
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

  const handleCopyBlobKey = async () => {
    if (!blobKey) return;
    try {
      await navigator.clipboard.writeText(blobKey);
      setCopiedBlobKey(true);
      setTimeout(() => setCopiedBlobKey(false), 1500);
    } catch (err) {
      console.error('Failed to copy blob key', err);
    }
  };

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

      {/* Permanent Link */}
      <div className="rounded-lg bg-white/70 border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 flex items-center justify-between space-x-2">
        <span className="truncate font-mono">{permanentLink}</span>
        <button
          onClick={() => navigator.clipboard.writeText(permanentLink)}
          className="px-2 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition"
        >
          Copy
        </button>
      </div>

      {/* Blob key + explorer */}
      {blobKey && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-900">Blob key</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopyBlobKey}
                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md border text-[10px] ${copiedBlobKey ? 'border-green-300 bg-green-100 text-green-800' : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-100'}`}
              >
                <Copy className="w-3 h-3" />
                <span>{copiedBlobKey ? 'Copied' : 'Copy'}</span>
              </button>
              {blobExplorerUrl && (
                <button
                  onClick={() => window.open(blobExplorerUrl, '_blank', 'noopener,noreferrer')}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-md border border-blue-200 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Explorer</span>
                </button>
              )}
            </div>
          </div>
          <p className="font-mono break-all text-[11px] text-blue-900">{blobKey}</p>
        </div>
      )}

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
            {isLoading ? '...' : roundedDays !== null ? `~${roundedDays} days` : 'N/A'}
          </div>
        </div>

        {/* Warning Message */}
        {roundedDays !== null && roundedDays < 7 && roundedDays > 0 && (
          <div className="flex items-start space-x-2 pt-2 border-t border-current/20">
            <AlertTriangle className={`w-4 h-4 mt-0.5 ${
              roundedDays < 3 ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <p className={`text-xs ${
              roundedDays < 3 ? 'text-red-700' : 'text-yellow-700'
            }`}>
              {roundedDays < 3 ? 'Critical: ' : 'Warning: '}
              Storage expires soon. Top up to extend.
            </p>
          </div>
        )}

        {roundedDays === 0 && (
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
          onClick={() => onTopUp(balanceWei, contractOwner)}
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
