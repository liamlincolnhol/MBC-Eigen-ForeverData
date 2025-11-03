import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  FOREVER_DATA_PAYMENTS_ADDRESS,
  FOREVER_DATA_PAYMENTS_ABI,
} from '../lib/payment';
import PaymentBreakdown from './PaymentBreakdown';
import { PaymentSummary } from '../lib/types';
import { ethToUsd, formatUsd } from '../lib/coinGecko';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileId: string | null;
  paymentData: PaymentSummary | null;
  onPaymentSuccess: () => void;
  walletAddress?: string | null;
}

export default function PaymentModal({
  isOpen,
  onClose,
  file,
  fileId,
  paymentData,
  onPaymentSuccess,
  walletAddress,
}: PaymentModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [usdTotal, setUsdTotal] = useState<string>('...');

  const { writeContract, data: hash, isPending, isError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle successful transaction
  React.useEffect(() => {
    if (isConfirmed) {
      onPaymentSuccess();
    }
  }, [isConfirmed, onPaymentSuccess]);

  // Handle transaction error
  React.useEffect(() => {
    if (isError) {
      setError("Failed to process payment. Please try again.");
    }
  }, [isError]);

  React.useEffect(() => {
    if (paymentData) {
      ethToUsd(Number(formatEther(paymentData.requiredAmount)))
        .then((usd) => setUsdTotal(formatUsd(usd)))
        .catch(() => setUsdTotal('N/A'));
    } else {
      setUsdTotal('...');
    }
  }, [paymentData]);

  if (!isOpen || !file || !fileId || !paymentData) return null;

  const handlePayment = async () => {
    setError(null);

    try {
      writeContract({
        address: FOREVER_DATA_PAYMENTS_ADDRESS as `0x${string}`,
        abi: FOREVER_DATA_PAYMENTS_ABI,
        functionName: 'depositForFile',
        args: [fileId],
        value: paymentData.requiredAmount,
      });
    } catch (err) {
      console.error("Payment failed:", err);
      setError("Failed to process payment. Please try again.");
    }
  };

  const isProcessing = isPending || isConfirming;
  const totalEth = Number(formatEther(paymentData.requiredAmount)).toFixed(6);
  const storageEth = Number(formatEther(paymentData.breakdown.storageCost)).toFixed(6);
  const gasEth = Number(formatEther(paymentData.breakdown.gasCost)).toFixed(6);
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Complete Payment
          </h2>
          <p className="text-sm text-gray-500">
            Payment required to store your file on EigenDA
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* File Info */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">File</p>
          <p className="text-sm text-gray-600 truncate">{file.name}</p>
          <p className="text-sm text-gray-600">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        {/* Payment Summary */}
        <div className="rounded-xl bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Required Payment</p>
              <p className="text-sm text-gray-600">
                Estimated storage duration: {paymentData.estimatedDuration} days
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{totalEth} ETH</p>
              <p className="text-xs text-gray-500">{usdTotal}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="rounded-lg bg-white/60 p-2">
              <p className="font-medium text-gray-700">Storage</p>
              <p className="text-sm text-gray-900">{storageEth} ETH</p>
            </div>
            <div className="rounded-lg bg-white/60 p-2">
              <p className="font-medium text-gray-700">Gas</p>
              <p className="text-sm text-gray-900">{gasEth} ETH</p>
            </div>
          </div>
          {shortAddress && (
            <div className="rounded-lg bg-white/80 p-2 text-xs text-gray-600">
              Paying from <span className="font-mono font-medium text-gray-800">{shortAddress}</span>
            </div>
          )}
        </div>

        <PaymentBreakdown fileSize={file.size} paymentData={paymentData} />

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-sm text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {isConfirmed && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg text-sm text-green-600">
            <span>✓ Payment successful!</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isConfirming ? 'Confirming...' : 'Processing...'}</span>
              </div>
            ) : (
              "Pay & Upload"
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-2">
          Permanent • Decentralized • Secure
        </p>
      </div>
    </div>
  );
}
