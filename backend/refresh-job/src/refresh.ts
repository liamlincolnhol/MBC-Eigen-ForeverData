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
import { getExpiringFiles, refreshFileInfo, initializeDb } from "../../backend/src/db.js";
import fetch from "node-fetch";
import crypto from "crypto";
import { eigenDAConfig } from "../../backend/src/config.js";
import cron from "node-cron";

// Step 2: Main refresh function (to be called periodically)
export async function refreshFiles() {
    await initializeDb();
    console.log('Checking for expiring files...');
    const expiringFiles = await getExpiringFiles();
    console.log(`Found ${expiringFiles.length} file(s) expiring soon`);
    
    if (expiringFiles.length === 0) {
        return;
    }

    for (const file of expiringFiles) {
        try {
            console.log(`\nProcessing file: ${file.fileName} (${file.fileId})`);
            
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
