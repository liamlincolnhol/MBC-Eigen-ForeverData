import React, { useState } from "react";
import { ethers } from "ethers";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  FOREVER_DATA_PAYMENTS_ADDRESS,
  FOREVER_DATA_PAYMENTS_ABI,
} from "../lib/payment";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileId: string | null;
  paymentData: any;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  file,
  fileId,
  paymentData,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !file || !fileId || !paymentData) return null;

  const handlePayment = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask to make a payment");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        FOREVER_DATA_PAYMENTS_ADDRESS,
        FOREVER_DATA_PAYMENTS_ABI,
        signer
      );

      const tx = await contract.depositForFile(fileId, {
        value: ethers.parseEther(paymentData.requiredAmount),
      });

      await tx.wait();

      setIsProcessing(false);
      onPaymentSuccess();
    } catch (err) {
      console.error("Payment failed:", err);
      setError("Failed to process payment. Please try again.");
      setIsProcessing(false);
    }
  };

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

        {/* Payment Section */}
        <div className="rounded-xl bg-gray-50 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Required Payment
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {ethers.formatEther(paymentData.requiredAmount)} ETH
            </p>
            <p className="text-sm text-gray-600">
              Estimated storage duration: {paymentData.estimatedDuration} days
            </p>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>
              Storage cost: {ethers.formatEther(paymentData.breakdown.storageCost)} ETH
            </p>
            <p>
              Gas cost: {ethers.formatEther(paymentData.breakdown.gasCost)} ETH
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-sm text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
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
                <span>Processing...</span>
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
