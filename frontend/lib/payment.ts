import { ethers } from 'ethers';
import { parseAbi } from 'viem';

export interface PaymentDetails {
    totalAmount: bigint;      // Total amount in wei
    breakdown: {
        storageCost: bigint;  // Storage cost in wei
        gasCost: bigint;      // Gas cost in wei
    };
    estimatedDuration: number; // Duration in days
}

// Constants for payment calculation
const PRICE_PER_MB_PER_YEAR = ethers.parseEther('0.0001'); // 0.0001 ETH per MB per year
const BASE_GAS_COST = ethers.parseEther('0.0002');          // 0.0002 ETH base gas cost
const EXTRA_GAS_PER_MB = ethers.parseEther('0.00001');      // 0.00001 ETH extra gas cost per MB
const DEFAULT_DURATION = 365;                                // Default duration in days

/**
 * Calculate payment details for a file
 * @param sizeInBytes File size in bytes
 * @param durationInDays Optional duration in days (default: 365)
 * @returns PaymentDetails object with payment breakdown
 */
export function calculatePaymentDetails(
    sizeInBytes: number,
    durationInDays: number = DEFAULT_DURATION
): PaymentDetails {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    // Calculate storage cost
    const yearFraction = durationInDays / 365;
    const storageCostPerMB = PRICE_PER_MB_PER_YEAR * BigInt(Math.ceil(yearFraction));
    const storageCost = storageCostPerMB * BigInt(Math.ceil(sizeInMB));
    
    // Calculate gas cost
    const gasCost = BASE_GAS_COST + (EXTRA_GAS_PER_MB * BigInt(Math.ceil(sizeInMB)));
    
    // Calculate total
    const totalAmount = storageCost + gasCost;
    
    return {
        totalAmount,
        breakdown: {
            storageCost,
            gasCost
        },
        estimatedDuration: durationInDays
    };
}

// Import deployment info
import deploymentInfo from './contracts/deployment.json' with { type: "json" };
export const FOREVER_DATA_PAYMENTS_ADDRESS = deploymentInfo.ForeverDataPayments.address;
export const FOREVER_DATA_PAYMENTS_ABI = parseAbi([
    'function depositForFile(string fileId) payable',
    'function getFileBalance(string fileId) view returns (uint256)',
    'function getFileOwner(string fileId) view returns (address)'
]);
