import React, { useState, useMemo } from 'react';
import { ethers } from 'ethers';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { calculatePaymentDetails, PaymentDetails, FOREVER_DATA_PAYMENTS_ADDRESS, FOREVER_DATA_PAYMENTS_ABI } from '../lib/payment';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: File | null;
    onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, file, onPaymentSuccess }: PaymentModalProps) {
    const { address } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Calculate payment details based on file size
    const paymentDetails = useMemo(() => {
        if (!file) return null;
        return calculatePaymentDetails(file.size);
    }, [file]);

    if (!isOpen || !file) return null;

    const handlePayment = async () => {
        if (!window.ethereum) {
            setError('Please install MetaMask to make a payment');
            return;
        }

        if (!paymentDetails) {
            setError('Failed to calculate payment details');
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        
        try {
            // Get the provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Create contract instance
            const contract = new ethers.Contract(
                FOREVER_DATA_PAYMENTS_ADDRESS,
                FOREVER_DATA_PAYMENTS_ABI,
                signer
            );
            
            // Generate a unique file ID (hash of file name, size, and timestamp)
            const fileId = ethers.keccak256(
                ethers.toUtf8Bytes(`${file.name}-${file.size}-${Date.now()}`)
            );
            
            // Send the payment
            const tx = await contract.depositForFile(fileId, {
                value: paymentDetails.totalAmount
            });
            
            // Wait for the transaction to be mined
            await tx.wait();
            
            setIsProcessing(false);
            onPaymentSuccess();
        } catch (err) {
            console.error('Payment failed:', err);
            setError('Failed to process payment. Please try again.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                        Complete Payment
                    </h3>
                    <p className="text-sm text-gray-600">
                        Payment required to store your file on EigenDA
                    </p>
                </div>
                
                {/* File Info */}
                <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">File</p>
                    <p className="text-sm text-gray-600">{file.name}</p>
                    <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                
                {/* Payment Details */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700">
                            Required Payment
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                            {paymentDetails ? ethers.formatEther(paymentDetails.totalAmount) : '0'} ETH
                        </p>
                        <p className="text-sm text-gray-600">
                            Estimated storage duration: {paymentDetails?.estimatedDuration || 365} days
                        </p>
                    </div>
                    
                    {/* Breakdown */}
                    <div className="space-y-2 text-sm text-gray-600">
                        <p>Storage cost: {paymentDetails ? ethers.formatEther(paymentDetails.breakdown.storageCost) : '0'} ETH</p>
                        <p>Gas cost: {paymentDetails ? ethers.formatEther(paymentDetails.breakdown.gasCost) : '0'} ETH</p>
                    </div>
                </div>
                
                {/* Error */}
                {error && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg text-sm text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                )}
                
                {/* Actions */}
                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <div className="flex items-center justify-center space-x-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            'Pay & Upload'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
