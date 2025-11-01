import { Request, Response } from "express";
import { getFileMetadata } from "./db.js";
import { fetchBlob } from "./upload.js";
import { isExpired, getRemainingDays } from "./utils.js";
import type { ChunkMetadata } from "./types/chunking.js";

/**
 *  - Takes a permanent fileId (from https://foreverdata.io/f/:fileId)
 *  - Looks up metadata (blobId + expiry) in the DB
 *  - Checks if file has expired
 *  - Fetches the current blob from EigenDA (or reassembles chunks)
 *  - Streams it directly to the user
 */

export async function handleFetch(req: Request, res: Response) {
  const { fileId } = req.params;

  try {
    // Look up file metadata
    const record = await getFileMetadata(fileId);
    if (!record) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Check if file has expired
    if (record.expiry && isExpired(record.expiry)) {
      res.status(410).json({
        error: "File has expired",
        expiry: record.expiry
      });
      return;
    }

    // Set headers for file download
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${record.fileName}"`
    );

    // Handle chunked files
    if (record.isChunked && record.chunks && record.chunks.length > 0) {
      console.log(`Serving chunked file ${fileId} (${record.chunks.length} chunks)`);
      await streamChunkedFile(res, record.chunks as ChunkMetadata[]);
      console.log(`Completed streaming chunked file ${fileId}`);
    } else {
      // Single blob file - existing logic
      const blobStream = await fetchBlob(record.blobId);
      if (!blobStream) {
        res.status(502).json({ error: "Failed to retrieve blob from EigenDA" });
        return;
      }

      // Stream the blob directly back to client
      blobStream.pipe(res);
      console.log(`Served file ${fileId} (certificate=${record.blobId.slice(0, 20)}...)`);
    }
  } catch (err) {
    console.error(`Error serving file ${fileId}:`, err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Stream a chunked file by fetching and streaming chunks sequentially
 */
async function streamChunkedFile(res: Response, chunks: ChunkMetadata[]): Promise<void> {
  // Sort chunks by index to ensure correct order
  const sortedChunks = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

  for (let i = 0; i < sortedChunks.length; i++) {
    const chunk = sortedChunks[i];

    // Validate chunk order
    if (chunk.chunkIndex !== i) {
      throw new Error(`Chunk order mismatch: expected index ${i}, got ${chunk.chunkIndex}`);
    }

    console.log(`Fetching chunk ${i + 1}/${sortedChunks.length} (certificate=${chunk.certificate.slice(0, 20)}...)`);

    // Fetch chunk from EigenDA
    const chunkStream = await fetchBlob(chunk.certificate);
    if (!chunkStream) {
      throw new Error(`Failed to retrieve chunk ${i} from EigenDA`);
    }

    // Stream chunk to response
    await new Promise<void>((resolve, reject) => {
      chunkStream.on('data', (data) => {
        res.write(data);
      });

      chunkStream.on('end', () => {
        console.log(`Chunk ${i + 1}/${sortedChunks.length} streamed successfully`);
        resolve();
      });

      chunkStream.on('error', (err) => {
        console.error(`Error streaming chunk ${i}:`, err);
        reject(err);
      });
    });
  }

  // End the response after all chunks streamed
  res.end();
}
