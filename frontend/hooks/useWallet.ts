import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface UseWalletReturn {
    address: string | null;
    isConnecting: boolean;
    isConnected: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
}

export function useWallet(): UseWalletReturn {
    const [address, setAddress] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    // Handle client-side mounting and check existing connection
    useEffect(() => {
        setIsClient(true);
        
        // Check if wallet is already connected
        const checkConnection = async () => {
            if (window.ethereum) {
                try {
                    const accounts = await window.ethereum.request({
                        method: 'eth_accounts'
                    });
                    
                    if (accounts.length > 0) {
                        setAddress(accounts[0]);
                    }
                } catch (err) {
                    console.error('Error checking existing connection:', err);
                }
            }
        };
        
        checkConnection();
    }, []);

    // Connect wallet
    const connect = useCallback(async () => {
        if (!isClient || !window.ethereum) {
            setError('Please install MetaMask');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts[0]) {
                setAddress(accounts[0]);
            }
        } catch (err) {
            console.error('Error connecting wallet:', err);
            setError('Failed to connect wallet');
        } finally {
            setIsConnecting(false);
        }
    }, [isClient]);

    // Disconnect wallet
    const disconnect = useCallback(() => {
        setAddress(null);
    }, []);

    // Listen for account changes
    useEffect(() => {
        if (isClient && window.ethereum) {
            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length === 0) {
                    setAddress(null);
                } else {
                    setAddress(accounts[0]);
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, [isClient]);

    return {
        address,
        isConnecting,
        isConnected: !!address,
        error,
        connect,
        disconnect
    };
}
