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
    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 p-5 space-y-4 border border-blue-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Payment Breakdown</h3>
        <span className="text-xs text-gray-500">{paymentData.estimatedDuration} days storage</span>
      </div>

      {/* File Details */}
      <div className="text-xs text-gray-600 bg-white/60 rounded-lg p-3 space-y-1">
        <div className="flex justify-between">
          <span>File Size:</span>
          <span className="font-medium text-gray-800">{fileSizeMB.toFixed(2)} MB</span>
        </div>
        {paymentData.chunkCount && paymentData.chunkCount > 0 && paymentData.chunkSize && (
          <div className="flex justify-between">
            <span>Chunks:</span>
            <span className="font-medium text-gray-800">
              {paymentData.chunkCount} {paymentData.chunkCount === 1 ? 'chunk' : 'chunks'}
              {formattedChunkSize ? ` (${formattedChunkSize} MiB target)` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-3">
        {/* Storage Cost */}
        <div className="bg-white/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Storage Cost</span>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">{storageEth.toFixed(6)} ETH</div>
              <div className="text-xs text-gray-500">{usdStorage}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {fileSizeMB.toFixed(2)} MB × 0.001 ETH/MB
          </div>
        </div>

        {/* Gas Cost */}
        <div className="bg-white/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className="text-sm font-medium text-gray-700">Gas Fee</span>
              <div className="group relative">
                <Info className="w-3 h-3 text-gray-400 cursor-help" />
                <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                  <div className="space-y-1">
                    <p className="font-medium">Gas fees cover blockchain transaction costs.</p>
                    {paymentData.chunkCount && paymentData.chunkCount > 1 ? (
                      <p>
                        Your file requires {paymentData.chunkCount} separate transactions to EigenDA ({paymentData.chunkCount} {paymentData.chunkCount === 1 ? 'chunk' : 'chunks'} × 0.0001 ETH = {gasEth.toFixed(4)} ETH)
                      </p>
                    ) : (
                      <p>Single transaction to EigenDA (0.0001 ETH)</p>
                    )}
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">{gasEth.toFixed(6)} ETH</div>
              <div className="text-xs text-gray-500">{usdGas}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {chunkLabel} × 0.0001 ETH
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="pt-3 border-t border-blue-200">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-800">Total Payment</span>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">{totalEth.toFixed(6)} ETH</div>
            <div className="text-sm text-gray-600">{usdTotal}</div>
          </div>
        </div>
      </div>

      {/* Duration Info */}
      <div className="text-xs text-center text-gray-500 pt-2">
        Covers storage for <span className="font-medium text-gray-700">{paymentData.estimatedDuration} days</span>
      </div>
    </div>
  );
}
