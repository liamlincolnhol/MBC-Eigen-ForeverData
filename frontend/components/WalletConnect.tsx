import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, ExternalLink } from 'lucide-react';

interface WalletConnectProps {
    onConnect: (address: string) => void;
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
    const [address, setAddress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    
    // Handle client-side mounting
    useEffect(() => {
        setIsClient(true);
    }, []);
    
    // Check if MetaMask is installed (only on client)
    const isMetaMaskInstalled = isClient && typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
    
    // Connect wallet
    const connectWallet = async () => {
        if (!isMetaMaskInstalled) {
            setError('Please install MetaMask to continue');
            return;
        }
        
        try {
            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const address = accounts[0];
            setAddress(address);
            onConnect(address);
            setError(null);
            
        } catch (err) {
            console.error('Error connecting wallet:', err);
            setError('Failed to connect wallet');
        }
    };
    
    // Listen for account changes
    useEffect(() => {
        if (isClient && isMetaMaskInstalled) {
            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length === 0) {
                    setAddress(null);
                } else {
                    setAddress(accounts[0]);
                    onConnect(accounts[0]);
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            
            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, [isClient, isMetaMaskInstalled, onConnect]);
    
    // Show loading state during hydration
    if (!isClient) {
        return (
            <div className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg">
                <span>Loading...</span>
            </div>
        );
    }
    
    if (!isMetaMaskInstalled) {
        return (
            <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-orange-50 border-orange-200">
                <div className="text-orange-600">
                    <Wallet className="w-8 h-8" />
                </div>
                <div className="text-center">
                    <p className="font-medium text-orange-800">MetaMask Required</p>
                    <p className="text-sm text-orange-600 mt-1">
                        Please install MetaMask to continue
                    </p>
                </div>
                <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-orange-600 hover:text-orange-700"
                >
                    Install MetaMask
                    <ExternalLink className="w-4 h-4 ml-1" />
                </a>
            </div>
        );
    }
    
    if (address) {
        return (
            <div className="flex items-center space-x-2 p-2 border rounded-lg bg-green-50 border-green-200">
                <Wallet className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                    {`${address.slice(0, 6)}...${address.slice(-4)}`}
                </span>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <button
                onClick={connectWallet}
                className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                <Wallet className="w-5 h-5" />
                <span>Connect Wallet</span>
            </button>
            
            {error && (
                <div className="p-2 text-sm text-red-600 bg-red-50 rounded-lg">
                    {error}
                </div>
            )}
        </div>
    );
}
