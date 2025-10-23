/**
 * refresh.ts
 * -------------------------
 * This script will run on a schedule (like a cron job) to keep files from expiring on EigenDA.
 * It uses ONLY the metadata in our database to find files nearing expiry and refresh them.
 *
 * WHAT IM THINKING FOR THE HIGH-LEVEL FLOW (you don't have to do this!):
 * 1. Connect to the database.
 * 2. Query for all files where `expiry` is within the next 24 hours.
 * 3. For each file:
 *    - Use its `blobId or whatever the certificate gives to download the blob bytes from EigenDA (via Proxy).
 *    - (Optional but I suggest) Recompute the SHA-256 hash and verify it matches what we stored.
 *    - Call `disperseBlob()` on the Proxy again to re-upload the file
 *    - Get the new certificate from the Proxy response
 *    - Update the database with these new values (the `fileId` stays the same).
 * 4. Log results for monitoring and debugging.
 *
 * IMPORTANT NOTES:
 * - The stable link never changes because the `fileId` in our database does not change.
 * - We are only refreshing files BEFORE they expire (e.g., 24 hours prior).
 * - If the Proxy or EigenDA fails, log the error and retry on the next run.
 * - This script should run automatically every few hours (via cron or a background worker).
 */

// Step 1: Import database + proxy connection
import { getExpiringFiles, refreshFileInfo, initializeDb, updateContractBalance, updatePaymentStatus, recordPayment, getFilesForBalanceCheck } from "../db.js";
import fetch from "node-fetch";
import crypto from "crypto";
import { eigenDAConfig } from "../config.js";
import cron from "node-cron";
import { getContractInstance, getSignedContract } from "../utils/contract.js";
import { calculateRefreshCost, checkSufficientBalance, formatEth } from "../utils/payments.js";

// Step 2: Function to check and update contract balances
async function updateContractBalances() {
    console.log('Updating contract balances...');
    const filesToCheck = await getFilesForBalanceCheck();
    console.log(`Found ${filesToCheck.length} file(s) needing balance updates`);
    
    if (filesToCheck.length === 0) {
        return;
    }

    const contract = await getContractInstance();
    
    for (const file of filesToCheck) {
        try {
            console.log(`Checking balance for file: ${file.fileId}`);
            const balance = await contract.getFileBalance(file.fileId);
            await updateContractBalance(file.fileId, balance.toString());
            
            console.log(`Updated balance for ${file.fileId}: ${formatEth(balance)} ETH`);
        } catch (err: any) {
            console.error(`Failed to check balance for file ${file.fileId}:`, err.message);
        }
    }
}

// Step 3: Function to deduct refresh cost from contract
async function deductRefreshCost(fileId: string, refreshCost: bigint): Promise<boolean> {
    try {
        const signedContract = await getSignedContract();
        
        console.log(`Deducting ${formatEth(refreshCost)} ETH for file ${fileId}...`);
        const tx = await signedContract.deductRefreshCost(fileId, refreshCost);
        const receipt = await tx.wait();
        
        // Record the deduction in our database
        await recordPayment(
            receipt.hash,
            fileId,
            await signedContract.getAddress(), // Contract owner address
            refreshCost.toString(),
            'refresh'
        );
        
        console.log(`✓ Deducted refresh cost. TX: ${receipt.hash}`);
        return true;
    } catch (err: any) {
        console.error(`Failed to deduct refresh cost for file ${fileId}:`, err.message);
        return false;
    }
}

// Step 4: Main refresh function (to be called periodically)
export async function refreshFiles() {
    await initializeDb();
    
    // First, update contract balances for all paid files
    await updateContractBalances();
    
    console.log('Checking for expiring files...');
    const expiringFiles = await getExpiringFiles();
    console.log(`Found ${expiringFiles.length} file(s) expiring soon`);
    
    if (expiringFiles.length === 0) {
        return;
    }

    for (const file of expiringFiles) {
        try {
            console.log(`\nProcessing file: ${file.fileName} (${file.fileId})`);
            
            // Check if this file has crypto payments enabled
            if (file.paymentStatus === 'paid' || file.payerAddress) {
                // Calculate refresh cost based on file size
                const refreshCost = calculateRefreshCost(file.fileSize);
                console.log(`Refresh cost: ${formatEth(refreshCost)} ETH`);
                
                // Check if file has sufficient balance
                const hasSufficientBalance = await checkSufficientBalance(file.fileId, refreshCost);
                
                if (!hasSufficientBalance) {
                    console.log(`❌ Insufficient balance for file ${file.fileId}. Skipping refresh.`);
                    await updatePaymentStatus(file.fileId, 'insufficient');
                    continue;
                }
                
                // Deduct refresh cost from contract
                const deductionSuccess = await deductRefreshCost(file.fileId, refreshCost);
                if (!deductionSuccess) {
                    console.log(`❌ Failed to deduct refresh cost for file ${file.fileId}. Skipping refresh.`);
                    continue;
                }
                
                console.log(`✓ Crypto payment deducted successfully`);
            } else {
                console.log(`File ${file.fileId} has no crypto payment. Proceeding with free refresh.`);
            }
            
            // 2a. Download blob bytes from EigenDA Proxy
            const cleanCertificate = file.blobId.startsWith('0x') ? file.blobId.slice(2) : file.blobId;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), eigenDAConfig.timeout);
            
            const blobResponse = await fetch(
                `${eigenDAConfig.proxyUrl}/get/0x${cleanCertificate}`,
                { signal: controller.signal }
            );
            
            clearTimeout(timeoutId);
            
            if (!blobResponse.ok) {
                throw new Error(`Failed to fetch blob: ${blobResponse.status} ${blobResponse.statusText}`);
            }
            
            const arrayBuf = await blobResponse.arrayBuffer();
            const blobBuffer = Buffer.from(arrayBuf);
            
            // 2b. Recompute hash and verify integrity
            const hash = crypto.createHash('sha256').update(blobBuffer).digest('hex');
            if (hash !== file.hash) {
                throw new Error(`Hash mismatch for file ${file.fileId}. Expected: ${file.hash}, Got: ${hash}`);
            }
            console.log('Hash verified! ✓');

            // 2c. Re-upload blob to EigenDA
            console.log(`Re-uploading to EigenDA (${eigenDAConfig.mode})...`);
            
            const uploadController = new AbortController();
            const uploadTimeoutId = setTimeout(() => uploadController.abort(), eigenDAConfig.timeout);
            
            const disperseResponse = await fetch(
                `${eigenDAConfig.proxyUrl}/put`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/octet-stream" },
                    body: blobBuffer,
                    signal: uploadController.signal
                }
            );
            
            clearTimeout(uploadTimeoutId);


            if (!disperseResponse.ok) {
                const errorText = await disperseResponse.text();
                throw new Error(`Failed to disperse blob: ${disperseResponse.status} - ${errorText}`);
            }

            const certificateBuffer = await disperseResponse.arrayBuffer();
            const newBlobId = Buffer.from(certificateBuffer).toString('hex');
            
            console.log(`New Blob ID: 0x${newBlobId.slice(0, 20)}...`);

            // 2d. Update database with new blobId and expiry
            await refreshFileInfo(file.fileId, newBlobId);

            console.log(`Refreshed file ${file.fileId} successfully`);
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.error(`Failed to refresh file ${file.fileId}: Request timeout`);
            } else {
                console.error(`Failed to refresh file ${file.fileId}:`, err.message || err);
            }
        }
    }
}


// using background worker
// (change first number to adjust number of hours)

// const REFRESH_PERIOD = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
// console.log('Starting refresh job...');
// refreshFiles(); // run on startup
// setInterval(refreshFiles, REFRESH_PERIOD); // run every refresh period



// using node-cron

// Run at minute 0 past every 4th hour
console.log('Starting refresh job scheduler...');
cron.schedule('0 */4 * * *', async () => {
    console.log(`\nRunning scheduled refresh at ${new Date().toISOString()}`);
    await refreshFiles();
    console.log(`Completed refresh at ${new Date().toISOString()}\n`);
});

// Run immediately on startup
console.log('Running initial refresh...');
refreshFiles();