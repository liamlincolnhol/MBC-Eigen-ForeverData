import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { X, TrendingUp, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FOREVER_DATA_PAYMENTS_ADDRESS, FOREVER_DATA_PAYMENTS_ABI } from '../lib/payment';
import { ethToUsd, formatUsd } from '../lib/coinGecko';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  fileSize: number; // in bytes
  currentBalance: bigint;
  fileOwner: string; // Address of file owner
}

const DURATION_OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

export default function TopUpModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  fileSize,
  currentBalance,
  fileOwner,
}: TopUpModalProps) {
  const { address } = useAccount();
  const [selectedDays, setSelectedDays] = useState(30);
  const [customDays, setCustomDays] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usdAmount, setUsdAmount] = useState<string>('...');

  const { writeContract, data: hash, isPending, isError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Check if connected wallet is the owner
  const isOwner = address?.toLowerCase() === fileOwner?.toLowerCase();

  // Calculate top-up amount
  const rawFileSizeMB = fileSize / (1024 * 1024);
  const fileSizeMB = rawFileSizeMB > 0 ? rawFileSizeMB : 1;
  const daysToAdd = useCustom ? parseInt(customDays) || 0 : selectedDays;
  const costPerMB = 0.001; // 0.001 ETH per MB for 30 days
  const dailyCostPerMB = costPerMB / 30;
  const topUpAmount = fileSizeMB * dailyCostPerMB * daysToAdd;
  const topUpAmountWei = parseEther(topUpAmount.toFixed(18));

  // Calculate new balance and days
  const currentBalanceEth = parseFloat(formatEther(currentBalance));
  const currentDays = Math.floor(currentBalanceEth / (fileSizeMB * dailyCostPerMB));
  const newBalanceEth = currentBalanceEth + topUpAmount;
  const newDays = Math.floor(newBalanceEth / (fileSizeMB * dailyCostPerMB));

  useEffect(() => {
    if (topUpAmount > 0) {
      ethToUsd(topUpAmount).then((usd) => setUsdAmount(formatUsd(usd)));
    }
  }, [topUpAmount]);

  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [isConfirmed, onClose]);

  useEffect(() => {
    if (isError) {
      setError('Failed to process top-up. Please try again.');
    }
  }, [isError]);

  if (!isOpen) return null;

  const handleTopUp = () => {
    if (!isOwner) {
      setError('Only the file owner can top up this file.');
      return;
    }

    if (topUpAmount <= 0) {
      setError('Please select a valid duration.');
      return;
    }

    setError(null);

    try {
      writeContract({
        address: FOREVER_DATA_PAYMENTS_ADDRESS as `0x${string}`,
        abi: FOREVER_DATA_PAYMENTS_ABI,
        functionName: 'depositForFile',
        args: [fileId],
        value: topUpAmountWei,
      });
    } catch (err) {
      console.error('Top-up failed:', err);
      setError('Failed to process top-up. Please try again.');
    }
  };

  const isProcessing = isPending || isConfirming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Top Up Storage</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">File Details</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Name:</span>
              <span className="font-medium text-gray-900 truncate max-w-xs">{fileName}</span>
            </div>
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="font-medium text-gray-900">
                {rawFileSizeMB > 0 ? rawFileSizeMB.toFixed(2) : 'Unknown'} MB
              </span>
            </div>
            <div className="flex justify-between">
              <span>Current Balance:</span>
              <span className="font-medium text-gray-900">{currentBalanceEth.toFixed(6)} ETH</span>
            </div>
            <div className="flex justify-between">
              <span>Days Remaining:</span>
              <span className={`font-medium ${
                currentDays < 3 ? 'text-red-600' :
                currentDays < 7 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                ~{currentDays} days
              </span>
            </div>
          </div>
        </div>

        {/* Owner Check Warning */}
        {!isOwner && (
          <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Not File Owner</p>
              <p className="text-xs mt-1">Only the file owner can top up this file.</p>
            </div>
          </div>
        )}

        {/* Duration Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Add Storage Duration</h3>

          <div className="grid grid-cols-2 gap-2">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.days}
                onClick={() => {
                  setSelectedDays(option.days);
                  setUseCustom(false);
                }}
                disabled={isProcessing || !isOwner}
                className={`p-3 rounded-lg border-2 transition ${
                  !useCustom && selectedDays === option.days
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">
                  +{(fileSizeMB * dailyCostPerMB * option.days).toFixed(6)} ETH
                </div>
              </button>
            ))}
          </div>

          {/* Custom Duration */}
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={customDays}
              onChange={(e) => {
                setCustomDays(e.target.value);
                setUseCustom(true);
              }}
              onFocus={() => setUseCustom(true)}
              placeholder="Custom days"
              disabled={isProcessing || !isOwner}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
            <span className="text-sm text-gray-600">days</span>
          </div>
        </div>

        {/* New Balance Preview */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Top-Up Amount:</span>
            <div className="text-right">
              <div className="font-semibold text-gray-900">{topUpAmount.toFixed(6)} ETH</div>
              <div className="text-xs text-gray-600">{usdAmount}</div>
            </div>
          </div>
          <div className="border-t border-blue-200 pt-2 flex justify-between text-sm">
            <span className="text-gray-700">New Balance:</span>
            <div className="text-right">
              <div className="font-bold text-blue-600">{newBalanceEth.toFixed(6)} ETH</div>
              <div className="text-xs text-green-600">~{newDays} days total</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-sm text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {isConfirmed && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg text-sm text-green-600">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Top-up successful! Balance updated.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleTopUp}
            disabled={isProcessing || !isOwner || topUpAmount <= 0}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isConfirming ? 'Confirming...' : 'Processing...'}</span>
              </div>
            ) : (
              `Top Up ${topUpAmount.toFixed(6)} ETH`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
