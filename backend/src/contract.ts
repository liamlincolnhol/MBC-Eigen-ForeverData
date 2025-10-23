import { ethers } from 'ethers';
import { getEnvVar } from './config.js';
import deploymentInfo from './contracts/deployment.json' with { type: "json" };

// Contract ABI - just the functions we need
const CONTRACT_ABI = [
    'function fileBalances(string) external view returns (uint256)',
    'function deductRefreshCost(string memory fileId, uint256 amount) external',
];

let provider: ethers.JsonRpcProvider;
let contract: ethers.Contract;

/**
 * Initialize the contract connection
 */
export async function initializeContract() {
    // Get provider
    const rpcUrl = getEnvVar('SEPOLIA_RPC_URL');
    provider = new ethers.JsonRpcProvider(rpcUrl);

    // Get wallet
    const privateKey = getEnvVar('CONTRACT_PRIVATE_KEY');
    const wallet = new ethers.Wallet(privateKey, provider);

    // Create contract instance
    contract = new ethers.Contract(
        deploymentInfo.ForeverDataPayments.address,
        CONTRACT_ABI,
        wallet
    );
}

/**
 * Check if a file has sufficient balance for refresh
 */
export async function checkFileBalance(fileId: string): Promise<bigint> {
    try {
        return await contract.fileBalances(fileId);
    } catch (error) {
        console.error('Error checking file balance:', error);
        return BigInt(0);
    }
}

/**
 * Deduct refresh cost from file's balance
 */
export async function deductRefreshCost(fileId: string, amount: bigint): Promise<boolean> {
    try {
        const tx = await contract.deductRefreshCost(fileId, amount);
        await tx.wait();
        return true;
    } catch (error) {
        console.error('Error deducting refresh cost:', error);
        return false;
    }
}
