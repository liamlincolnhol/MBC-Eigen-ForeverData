import { Request, Response } from "express";
import { getFile } from "./db.js";
import { fetchBlob } from "./upload.js";

/**
 *  - Takes a permanent fileId (from https://foreverdata.io/f/:fileId)
 *  - Looks up metadata (blobId + expiry) in the DB
 *  - Fetches the current blob from EigenDA
 *  - Streams it directly to the user
 */

export async function handleFetch(req: Request, res: Response) {
  const { fileId } = req.params;

  try {
    // Look up file metadata
    const record = await getFile(fileId);
    if (!record) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Ask EigenDA for the blob
    const blobStream = await fetchBlob(record.blobId); 
    //does this work with proxy call?
    //should we call api here instead of going through upload?
    if (!blobStream) {
      res.status(502).json({ error: "Failed to retrieve blob from EigenDA" });
      return;
    }

    // Prepare response headers - do we want this??
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileId}.bin"`
    );

    // Stream the blob directly back to client
    blobStream.pipe(res);

    console.log(`Served file ${fileId} (blobId=${record.blobId})`);
  } catch (err) {
    console.error(`Error serving file ${fileId}:`, err);
    res.status(500).json({ error: "Internal server error" });
  }
}
