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

// Step 1: Import database connection
// import { getExpiringFiles, updateFileRecord } from "../backend/src/db";
// import fetch from "node-fetch";
// import crypto from "crypto";
// Step 2: Define how close to expiry we start refreshing (e.g., 24 hours)

// Step 3: Main refresh function (to be called periodically)
async function refreshFiles() {
  /**
   * 1. Get all files expiring soon from the database.
   *    Example: SELECT * FROM files WHERE expiry < now() + 24h
   * 
   */
  // const expiringFiles = await getExpiringFiles(REFRESH_THRESHOLD_HOURS);

  /**
   * 2. Loop through each file and refresh it
   */
  // for (const file of expiringFiles) {
  //   try {
  //     // 2a. Download blob bytes from EigenDA Proxy
  //     const blobResponse = await fetch(`${process.env.PROXY_URL}/getBlob/${file.blobId}`);
  //     const blobBuffer = await blobResponse.arrayBuffer();

  //     // 2b. (Optional like I said, but I suggest it) Recompute hash and verify
  //     // const hash = crypto.createHash('sha256').update(Buffer.from(blobBuffer)).digest('hex');
  //     // if (hash !== file.hash) throw new Error(`Hash mismatch for file ${file.fileId}`);

  //     // 2c. Re-upload blob to EigenDA
  //     const disperseResponse = await fetch(`${process.env.PROXY_URL}/disperseBlob`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/octet-stream" },
  //       body: blobBuffer,
  //     });
  //     const { blobId: newBlobId, expiry: newExpiry } = await disperseResponse.json();

  //     // 2d. Update database with new blobId and expiry
  //     await updateFileRecord(file.fileId, newBlobId, newExpiry);

  //     console.log(`✅ Refreshed file ${file.fileId} successfully`);
  //   } catch (err) {
  //     console.error(`❌ Failed to refresh file ${file.fileId}:`, err);
  //   }
  // Use emoji for yes/no also pls
  // }
}

// Step 4: Run periodically (e.g., every 6 hours) ? just my suggestion... i'm sure there's other ways to go about this 
// setInterval(refreshFiles, 6 * 60 * 60 * 1000);

// refreshFiles(); // uncomment this line if running as a standalone script
