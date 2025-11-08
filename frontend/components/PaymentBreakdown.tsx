import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { ethToUsd, formatUsd } from '../lib/coinGecko';
import { formatEther } from 'viem';

interface PaymentBreakdownProps {
  fileSize: number; // in bytes
  paymentData: {
    requiredAmount: bigint;
    estimatedDuration: number;
  breakdown: {
    storageCost: bigint;
    gasCost: bigint;
  };
  chunkCount?: number;
  chunkSize?: number;
};
}

export default function PaymentBreakdown({ fileSize, paymentData }: PaymentBreakdownProps) {
  const [usdTotal, setUsdTotal] = useState<string>('...');
  const [usdStorage, setUsdStorage] = useState<string>('...');
  const [usdGas, setUsdGas] = useState<string>('...');

  const fileSizeMB = fileSize / (1024 * 1024);
  const storageEth = parseFloat(formatEther(paymentData.breakdown.storageCost));
  const gasEth = parseFloat(formatEther(paymentData.breakdown.gasCost));
  const totalEth = parseFloat(formatEther(paymentData.requiredAmount));
  const chunkSizeMiB = paymentData.chunkSize
    ? paymentData.chunkSize / (1024 * 1024)
    : null;
  const formattedChunkSize = chunkSizeMiB !== null
    ? (Number.isInteger(chunkSizeMiB) ? chunkSizeMiB.toFixed(0) : chunkSizeMiB.toFixed(2))
    : null;
  const chunkLabel = paymentData.chunkCount && paymentData.chunkCount > 1
    ? `${paymentData.chunkCount} chunks`
    : '1 transaction';

  useEffect(() => {
    // Fetch USD conversions
    const fetchPrices = async () => {
      try {
        const [totalUsd, storageUsd, gasUsd] = await Promise.all([
          ethToUsd(totalEth),
          ethToUsd(storageEth),
          ethToUsd(gasEth),
        ]);

        setUsdTotal(formatUsd(totalUsd));
        setUsdStorage(formatUsd(storageUsd));
        setUsdGas(formatUsd(gasUsd));
      } catch (error) {
        console.error('Failed to fetch USD prices:', error);
        setUsdTotal('N/A');
        setUsdStorage('N/A');
        setUsdGas('N/A');
      }
    };

    fetchPrices();
  }, [totalEth, storageEth, gasEth]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 text-white shadow-inner shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <h3 className="font-semibold">Payment breakdown</h3>
        <span className="text-white/60">{paymentData.estimatedDuration} days storage</span>
      </div>

      {/* File Details */}
      <div className="text-xs text-white/70 rounded-xl border border-white/10 bg-white/5 p-3 space-y-1">
        <div className="flex justify-between">
          <span>File size</span>
          <span className="font-semibold text-white">{fileSizeMB.toFixed(2)} MB</span>
        </div>
        {paymentData.chunkCount && paymentData.chunkCount > 0 && paymentData.chunkSize && (
          <div className="flex justify-between">
            <span>Chunks</span>
            <span className="font-semibold text-white">
              {paymentData.chunkCount} {paymentData.chunkCount === 1 ? 'chunk' : 'chunks'}
              {formattedChunkSize ? ` (${formattedChunkSize} MiB target)` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-3">
        {/* Storage Cost */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Storage cost</span>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{storageEth.toFixed(6)} ETH</div>
              <div className="text-xs text-white/60">{usdStorage}</div>
            </div>
          </div>
          <div className="text-xs text-white/60">
            {fileSizeMB.toFixed(2)} MB × 0.001 ETH/MB
          </div>
        </div>

        {/* Gas Cost */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium text-white">Gas fee</span>
              <div className="group relative">
                <Info className="w-3 h-3 text-white/40 cursor-help" />
                <div className="pointer-events-none absolute bottom-full left-1/2 hidden w-64 -translate-x-1/2 transform rounded-lg bg-slate-900 p-3 text-xs text-white shadow-xl group-hover:block">
                  <div className="space-y-1">
                    <p className="font-medium text-white">
                      Gas covers EigenDA submission costs.
                    </p>
                    {paymentData.chunkCount && paymentData.chunkCount > 1 ? (
                      <p className="text-white/80">
                        {paymentData.chunkCount} chunks × 0.0001 ETH = {gasEth.toFixed(4)} ETH
                      </p>
                    ) : (
                      <p className="text-white/80">Single transaction (0.0001 ETH)</p>
                    )}
                  </div>
                  <div className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{gasEth.toFixed(6)} ETH</div>
              <div className="text-xs text-white/60">{usdGas}</div>
            </div>
          </div>
          <div className="text-xs text-white/60">
            {chunkLabel} × 0.0001 ETH
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-white">Total payment</span>
          <div className="text-right">
            <div className="text-lg font-bold text-sky-200">{totalEth.toFixed(6)} ETH</div>
            <div className="text-sm text-white/70">{usdTotal}</div>
          </div>
        </div>
      </div>

      {/* Duration Info */}
      <div className="text-xs text-center text-white/60">
        Covers storage for <span className="font-medium text-white">{paymentData.estimatedDuration} days</span>
      </div>
    </div>
  );
}
