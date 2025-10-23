import { ethers } from 'ethers';
import deploymentInfo from '../contracts/deployment.json' with { type: "json" };
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load ABI from artifacts
const ForeverDataPaymentsABI = JSON.parse(
    readFileSync(join(__dirname, '../../contracts/artifacts/contracts/ForeverDataPayments.sol/ForeverDataPayments.json'), 'utf8')
);

let contractInstance: ethers.Contract | null = null;

export async function getContractInstance(): Promise<ethers.Contract> {
    if (contractInstance) {
        return contractInstance;
    }

    // Get provider based on environment
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Get contract address from deployment info
    const contractAddress = deploymentInfo.ForeverDataPayments.address;
    
    // Create contract instance
    contractInstance = new ethers.Contract(
        contractAddress,
        ForeverDataPaymentsABI.abi,
        provider
    );
    
    return contractInstance;
}

export async function getSignedContract(): Promise<ethers.Contract> {
    const contract = await getContractInstance();
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(
        process.env.PRIVATE_KEY || '',
        contract.runner.provider
    );
    
    // Return contract connected to wallet
    return contract.connect(wallet) as ethers.Contract;
}
