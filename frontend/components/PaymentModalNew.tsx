import React, { useMemo, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  FOREVER_DATA_PAYMENTS_ADDRESS,
  FOREVER_DATA_PAYMENTS_ABI,
} from '../lib/payment';
import PaymentBreakdown from './PaymentBreakdown';
import { PaymentSummary } from '../lib/types';
import { ethToUsd, formatUsd } from '../lib/coinGecko';
import { sepolia } from 'viem/chains';
import { resolveChunkSize } from '../lib/chunking';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileId: string | null;
  paymentData: PaymentSummary | null;
  onPaymentSuccess: () => void;
  walletAddress?: string | null;
  chunkCount?: number;
  chunkSize?: number;
  onQuoteChange?: (summary: PaymentSummary, days: number) => void;
}

const DURATION_OPTIONS = [
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const COST_PER_MB_30_DAYS = parseEther('0.001'); // 0.001 ETH per MB for 30 days
const BASE_GAS_PER_CHUNK = parseEther('0.0001'); // Matches backend constant

export default function PaymentModal({
  isOpen,
  onClose,
  file,
  fileId,
  paymentData,
  onPaymentSuccess,
  walletAddress,
  chunkCount = 1,
  chunkSize,
  onQuoteChange,
}: PaymentModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [usdTotal, setUsdTotal] = useState<string>('...');
  const [selectedDays, setSelectedDays] = useState<number>(paymentData?.estimatedDuration ?? 14);
  const [useCustom, setUseCustom] = useState(false);
  const [customDays, setCustomDays] = useState('');
  const [quote, setQuote] = useState<PaymentSummary | null>(paymentData);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);

  const {
    writeContractAsync,
    isPending,
    isError: isWriteError,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReceiptError,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: sepolia.id,
  });

  React.useEffect(() => {
    if (isConfirmed) {
      onPaymentSuccess();
    }
  }, [isConfirmed, onPaymentSuccess]);

  React.useEffect(() => {
    if (isWriteError && writeError) {
      console.error('[PaymentModal] writeContract error', writeError);
      setError(writeError.message || "Failed to process payment. Please try again.");
    }
  }, [isWriteError, writeError]);

  React.useEffect(() => {
    if (isReceiptError && receiptError) {
      console.error('[PaymentModal] receipt error', receiptError);
      setError(receiptError.message || "Payment transaction failed on-chain.");
    }
  }, [isReceiptError, receiptError]);

  React.useEffect(() => {
    if (!isOpen) {
      setInitialized(false);
      return;
    }

    if (paymentData) {
      if (!initialized) {
        setSelectedDays(paymentData.estimatedDuration);
        setUseCustom(false);
        setCustomDays('');
        setQuote(paymentData);
        onQuoteChange?.(paymentData, paymentData.estimatedDuration);
        setInitialized(true);
      }
    } else {
      setQuote(null);
    }
  }, [initialized, isOpen, onQuoteChange, paymentData]);

  const resolvedDays = useMemo(() => {
    if (useCustom) {
      const parsed = parseInt(customDays, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    return selectedDays;
  }, [useCustom, customDays, selectedDays]);

  const fallbackChunkSize = file ? resolveChunkSize(file.size) : undefined;
  const chunkSizeSafe =
    chunkSize ??
    paymentData?.chunkSize ??
    fallbackChunkSize ??
    0;
  const chunkCountSafe =
    chunkCount ??
    paymentData?.chunkCount ??
    (chunkSizeSafe > 0 && file
      ? Math.max(1, Math.ceil(file.size / chunkSizeSafe))
      : 1);
  const normalizedChunkCount = Math.max(1, chunkCountSafe);
  const normalizedChunkSize = chunkSizeSafe > 0 ? chunkSizeSafe : undefined;

  const calculateQuoteForDays = React.useCallback(
    (days: number): PaymentSummary | null => {
      if (!file || days <= 0) return null;
      const sizeInMbRounded = Math.max(1, Math.ceil(file.size / (1024 * 1024)));
      const storageNumerator = COST_PER_MB_30_DAYS * BigInt(sizeInMbRounded) * BigInt(days);
      const storageCost = (storageNumerator + BigInt(29)) / BigInt(30); // round up to avoid undercharging
      const gasCost = BASE_GAS_PER_CHUNK * BigInt(normalizedChunkCount);
      const requiredAmount = storageCost + gasCost;

      return {
        requiredAmount,
        estimatedDuration: days,
        breakdown: {
          storageCost,
          gasCost
        },
        chunkCount: normalizedChunkCount,
        chunkSize: normalizedChunkSize
      };
    },
    [file, normalizedChunkCount, normalizedChunkSize]
  );

  React.useEffect(() => {
    const newQuote = calculateQuoteForDays(resolvedDays);
    if (!newQuote) return;

    setQuote((prev) => {
      if (
        prev &&
        prev.requiredAmount === newQuote.requiredAmount &&
        prev.estimatedDuration === newQuote.estimatedDuration &&
        prev.breakdown.storageCost === newQuote.breakdown.storageCost &&
        prev.breakdown.gasCost === newQuote.breakdown.gasCost &&
        prev.chunkCount === newQuote.chunkCount &&
        prev.chunkSize === newQuote.chunkSize
      ) {
        return prev;
      }
      return newQuote;
    });
    onQuoteChange?.(newQuote, resolvedDays);
  }, [calculateQuoteForDays, onQuoteChange, resolvedDays]);

  React.useEffect(() => {
    const currentQuote = quote ?? paymentData;
    if (!currentQuote) {
      setUsdTotal('...');
      return;
    }

    ethToUsd(Number(formatEther(currentQuote.requiredAmount)))
      .then((usd) => setUsdTotal(formatUsd(usd)))
      .catch(() => setUsdTotal('N/A'));
  }, [paymentData, quote]);

  if (!isOpen || !file || !fileId || !paymentData) return null;

  const effectiveQuote = quote ?? paymentData;

  const handlePayment = async () => {
    setError(null);
    resetWrite();
    console.log('[PaymentModal] submitting deposit', {
      fileId,
      requiredAmount: effectiveQuote.requiredAmount.toString()
    });

    if (!walletAddress) {
      setError('Wallet not connected. Please reconnect and try again.');
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: FOREVER_DATA_PAYMENTS_ADDRESS as `0x${string}`,
        abi: FOREVER_DATA_PAYMENTS_ABI,
        functionName: 'depositForFile',
        args: [fileId],
        value: effectiveQuote.requiredAmount,
        chainId: sepolia.id,
        account: walletAddress as `0x${string}`
      });
      console.log('[PaymentModal] deposit tx submitted', hash);
      setTxHash(hash);
    } catch (err) {
      console.error("Payment failed:", err);
      const message = err instanceof Error ? err.message : "Failed to process payment. Please try again.";
      setError(message);
    }
  };

  const isProcessing = isPending || isConfirming;
  const totalEth = Number(formatEther(effectiveQuote.requiredAmount)).toFixed(6);
  const storageEth = Number(formatEther(effectiveQuote.breakdown.storageCost)).toFixed(6);
  const gasEth = Number(formatEther(effectiveQuote.breakdown.gasCost)).toFixed(6);
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;
  const payDisabled = isProcessing || resolvedDays <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Complete Payment
          </h2>
          <p className="text-sm text-gray-500">
            Payment required to store your file on EigenDA
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
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
                      Estimated storage duration: {effectiveQuote.estimatedDuration} days
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

              {/* Duration selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Choose Storage Duration</h3>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                      key={option.days}
                      onClick={() => {
                        setSelectedDays(option.days);
                        setUseCustom(false);
                      }}
                      className={`p-3 rounded-lg border-2 transition ${
                        !useCustom && selectedDays === option.days
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(() => {
                          const optionQuote = calculateQuoteForDays(option.days);
                          if (!optionQuote) return 'Select to update';
                          return `${Number(formatEther(optionQuote.requiredAmount)).toFixed(6)} ETH`;
                        })()}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2 w-full">
                  <input
                    type="number"
                    min={1}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Custom"
                    value={customDays}
                    onFocus={() => setUseCustom(true)}
                    onChange={(event) => setCustomDays(event.target.value)}
                  />
                  <span className="text-sm text-gray-500">days</span>
                </div>
              </div>
            </div>

            <div>
              <PaymentBreakdown fileSize={file.size} paymentData={effectiveQuote} />
            </div>
          </div>
        </div>

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
            disabled={payDisabled}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isConfirming ? 'Confirming...' : 'Processing...'}</span>
              </div>
            ) : (
              `Pay ${totalEth} ETH`
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
