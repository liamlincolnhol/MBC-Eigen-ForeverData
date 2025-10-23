import { ethers } from 'ethers';
import { getContractInstance } from './contract.js';

// Base gas cost for EigenDA operations (rough estimate)
const BASE_GAS_COST = ethers.parseEther('0.0001');

export interface PaymentDetails {
    requiredAmount: bigint;  // in Wei
    estimatedDuration: number;  // in days
    breakdown: {
        storageCost: bigint;
        gasCost: bigint;
    };
}

/**
 * Calculate required payment amount based on file size
 * @param fileSize File size in bytes
 * @param targetDuration Target duration in days (optional, defaults to 30)
 */
export function calculateRequiredPayment(fileSize: number, targetDuration: number = 30): PaymentDetails {
    // Much simpler pricing: 0.001 ETH per MB for 30 days
    const sizeInMB = fileSize / (1024 * 1024);
    const costPerMB = ethers.parseEther('0.001'); // 0.001 ETH per MB
    const storageCost = costPerMB * BigInt(Math.ceil(sizeInMB));
    
    // Add base gas cost for operations
    const totalGasCost = BASE_GAS_COST;
    
    // Total required amount
    const requiredAmount = storageCost + totalGasCost;
    
    return {
        requiredAmount,
        estimatedDuration: targetDuration,
        breakdown: {
            storageCost,
            gasCost: totalGasCost
        }
    };
}

/**
 * Calculate estimated duration based on current balance
 * @param fileId File ID to check
 */
export async function calculateRemainingDuration(fileId: string): Promise<number> {
    const contract = await getContractInstance();
    const balance = await contract.getFileBalance(fileId);
    
    if (balance === 0n) {
        return 0;
    }
    
    // Get daily cost for this file
    // For now using a simplified calculation
    const dailyCost = ethers.parseEther('0.001'); // Placeholder - should use actual file size
    
    const daysRemaining = Number(balance / dailyCost);
    return Math.floor(daysRemaining);
}

/**
 * Verify payment for a file
 * @param fileId File ID to verify
 * @param requiredAmount Required payment amount in Wei
 */
export async function verifyPayment(fileId: string, requiredAmount: bigint): Promise<boolean> {
    const contract = await getContractInstance();
    const balance = await contract.getFileBalance(fileId);
    return balance >= requiredAmount;
}

/**
 * Calculate refresh cost for a file based on its size
 * @param fileSize File size in bytes
 * @returns Refresh cost in Wei
 */
export function calculateRefreshCost(fileSize: number): bigint {
    if (!fileSize || fileSize <= 0) {
        // Default cost for files without size information
        return ethers.parseEther('0.001');
    }
    
    // Calculate based on file size - roughly 0.001 ETH per MB for 14 days
    const sizeInMB = fileSize / (1024 * 1024);
    const costPerMB = ethers.parseEther('0.001');
    return costPerMB * BigInt(Math.ceil(sizeInMB));
}

/**
 * Check if file has sufficient balance for refresh
 * @param fileId File ID to check
 * @param refreshCost Required refresh cost in Wei
 * @returns Boolean indicating if balance is sufficient
 */
export async function checkSufficientBalance(fileId: string, refreshCost: bigint): Promise<boolean> {
    const contract = await getContractInstance();
    const balance = await contract.getFileBalance(fileId);
    return balance >= refreshCost;
}

/**
 * Format Wei amount to ETH with specified decimals
 * @param wei Amount in Wei
 * @param decimals Number of decimals to show
 */
export function formatEth(wei: bigint, decimals: number = 6): string {
    return ethers.formatEther(wei).slice(0, decimals + 2);
}
