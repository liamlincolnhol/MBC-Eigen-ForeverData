import React, { useMemo, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
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
  const chainId = useChainId();
  const {
    switchChainAsync,
    isPending: isSwitchingChain,
    error: switchChainError
  } = useSwitchChain();
  const targetChainId = sepolia.id;
  const needsNetworkSwitch = Boolean(walletAddress && chainId && chainId !== targetChainId);

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

    if (chainId !== targetChainId) {
      if (!switchChainAsync) {
        setError('Please switch your wallet to Sepolia before paying.');
        return;
      }
      try {
        await switchChainAsync({ chainId: targetChainId });
      } catch (switchError) {
        const switchMessage = switchError instanceof Error
          ? switchError.message
          : 'Please approve the network switch in your wallet.';
        setError(`Switch to Sepolia to continue. ${switchMessage}`);
        return;
      }
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
  const payDisabled = isProcessing || resolvedDays <= 0 || needsNetworkSwitch;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-900/80 to-slate-900/60 p-6 sm:p-10 text-white shadow-[rgba(3,7,18,0.65)_0px_50px_120px_-30px] space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">EigenDA payment</p>
          <h2 className="text-2xl font-semibold">Complete payment</h2>
          <p className="text-sm text-white/60">Cover storage for your file before we pin it to EigenDA.</p>
        </div>
        {needsNetworkSwitch && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-200/10 p-4 text-sm text-amber-50">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold tracking-wide uppercase text-[11px] text-amber-100">
                Wrong network detected
              </p>
              <p className="mt-1 text-amber-50">
                Please switch your wallet to Sepolia before submitting the payment.
              </p>
              <button
                className="mt-3 inline-flex items-center rounded-xl border border-amber-300/40 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-200 hover:text-white disabled:opacity-60"
                onClick={() => switchChainAsync?.({ chainId: targetChainId })}
                disabled={isSwitchingChain || !switchChainAsync}
              >
                {isSwitchingChain ? 'Switching…' : 'Switch to Sepolia'}
              </button>
              {switchChainError && (
                <p className="mt-1 text-[11px] text-amber-200/80">
                  {switchChainError.message || 'Confirm the network switch in your wallet.'}
                </p>
              )}
            </div>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            {/* File Info */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">File</p>
              <div className="space-y-1.5">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-sm text-white/70">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">Required payment</p>
                  <p className="text-sm text-white/70">
                    Covers {effectiveQuote.estimatedDuration} days
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold">{totalEth} ETH</p>
                  <p className="text-xs text-white/60">{usdTotal}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-white/60">Storage</p>
                  <p className="text-base font-semibold text-white">{storageEth} ETH</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-white/60">Gas</p>
                  <p className="text-base font-semibold text-white">{gasEth} ETH</p>
                </div>
              </div>
              {shortAddress && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                  Paying from{' '}
                  <span className="font-mono text-white">{shortAddress}</span>
                </div>
              )}
            </div>

            {/* Duration selection */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-[0.3em] text-white/50">
                Choose storage duration
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.days}
                    onClick={() => {
                      setSelectedDays(option.days);
                      setUseCustom(false);
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      !useCustom && selectedDays === option.days
                        ? 'border-sky-400/70 bg-sky-400/10 text-white'
                        : 'border-white/15 bg-white/5 text-white/80 hover:border-white/35'
                    }`}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className="text-xs text-white/60 mt-1">
                      {(() => {
                        const optionQuote = calculateQuoteForDays(option.days);
                        if (!optionQuote) return 'Select to update';
                        return `${Number(formatEther(optionQuote.requiredAmount)).toFixed(6)} ETH`;
                      })()}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  className="flex-1 rounded-2xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400/60 focus:outline-none"
                  placeholder="Custom"
                  value={customDays}
                  onFocus={() => setUseCustom(true)}
                  onChange={(event) => setCustomDays(event.target.value)}
                />
                <span className="text-sm text-white/60">days</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <PaymentBreakdown fileSize={file.size} paymentData={effectiveQuote} />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-2 rounded-2xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {isConfirmed && (
          <div className="flex items-center space-x-2 rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-3 text-sm text-emerald-100">
            <span>✓ Payment successful!</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:border-white/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={payDisabled}
            className="flex-1 rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.9),rgba(96,165,250,0.8)),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.85),rgba(236,72,153,0.8))] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <p className="text-center text-xs text-white/40">
          Permanent • Decentralized • Secure
        </p>
      </div>
    </div>
  );
}
