import express from "express";
import crypto from "crypto";
import fetch from "node-fetch";
import path from "path";
import { addChunkToFile, initializeChunkedFile, getFileMetadata } from "./db.js";
import { eigenDAConfig } from "./config.js";
import { calculateExpiry } from "./utils.js";
import type { ChunkMetadata } from "./types/chunking.js";

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MiB - stays within 8 MiB EigenDA proxy limit
const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB maximum file size
const MAX_CHUNKS = Math.ceil(MAX_FILE_SIZE / CHUNK_SIZE); // 256 chunks for 1 GB with 4 MiB chunks

/**
 * Upload a chunk to EigenDA and return the certificate
 */
async function uploadChunkToEigenDA(chunkBuffer: Buffer): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), eigenDAConfig.timeout);

  const response = await fetch(
    `${eigenDAConfig.proxyUrl}/put`,
    {
      method: "POST",
      body: chunkBuffer,
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      signal: controller.signal
    }
  );

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EigenDA upload failed: ${response.status} - ${errorText}`);
  }

  // Get the certificate (blob ID) from response
  const certificateBuffer = await response.arrayBuffer();
  const certificate = Buffer.from(certificateBuffer).toString('hex');

  return certificate;
}

/**
 * Handle chunk upload request
 */
export async function handleChunkUpload(req: express.Request, res: express.Response) {
  if (!req.file) {
    return res.status(400).json({ message: "No chunk uploaded" });
  }

  const { fileId, fileName, chunkIndex, totalChunks, isFirstChunk, isLastChunk, targetDuration } = req.body;

  // === INPUT VALIDATION ===
  if (!fileId || chunkIndex === undefined || !totalChunks || !fileName) {
    return res.status(400).json({
      error: "Missing required fields: fileId, fileName, chunkIndex, totalChunks"
    });
  }

  // Validate and parse numeric inputs
  const chunkIdx = parseInt(chunkIndex, 10);
  const total = parseInt(totalChunks, 10);

  if (isNaN(chunkIdx) || isNaN(total)) {
    return res.status(400).json({
      error: "chunkIndex and totalChunks must be valid integers"
    });
  }

  // Validate chunk count limits
  if (total <= 0 || total > MAX_CHUNKS) {
    return res.status(400).json({
      error: `Invalid totalChunks ${total} (must be 1 to ${MAX_CHUNKS})`
    });
  }

  // Validate chunk index bounds
  if (chunkIdx < 0 || chunkIdx >= total) {
    return res.status(400).json({
      error: `Invalid chunkIndex ${chunkIdx} (must be 0 to ${total - 1})`
    });
  }

  // Parse and validate boolean flags
  const isFirst = isFirstChunk === 'true' || isFirstChunk === true;
  const isLast = isLastChunk === 'true' || isLastChunk === true;

  // Validate boolean consistency with index
  if (isFirst && chunkIdx !== 0) {
    return res.status(400).json({
      error: "First chunk must have chunkIndex 0"
    });
  }

  if (isLast && chunkIdx !== total - 1) {
    return res.status(400).json({
      error: `Last chunk must have chunkIndex ${total - 1}`
    });
  }

  // Validate first chunk has fileHash
  if (isFirst && !req.body.fileHash) {
    return res.status(400).json({
      error: "Missing fileHash for first chunk"
    });
  }

  // Validate fileHash format (if provided)
  if (req.body.fileHash && !/^[a-f0-9]{64}$/i.test(req.body.fileHash)) {
    return res.status(400).json({
      error: "Invalid fileHash format (must be 64-character hex SHA-256)"
    });
  }

  // Sanitize fileName to prevent path traversal
  const sanitizedFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');

  const actualChunkSize = req.file.size; // REAL size from multer

  console.log(`\nProcessing chunk ${chunkIdx + 1}/${total} for file ${fileId}`);
  console.log(`Actual chunk size: ${actualChunkSize} bytes`);

  // Validate chunk size (should be <= 4 MiB)
  if (actualChunkSize > CHUNK_SIZE) {
    return res.status(400).json({
      error: `Chunk too large: ${actualChunkSize} bytes (max: ${CHUNK_SIZE})`
    });
  }

  if (actualChunkSize === 0) {
    return res.status(400).json({
      error: "Cannot upload empty chunk"
    });
  }

  let duration = 30;
  if (targetDuration !== undefined) {
    const parsedDuration = parseInt(targetDuration, 10);
    if (!Number.isNaN(parsedDuration) && parsedDuration > 0) {
      duration = Math.min(parsedDuration, 365 * 5);
    }
  }

  try {
    // === CHUNK ORDER VALIDATION ===
    // If not first chunk, verify file exists and validate chunk order
    if (!isFirst) {
      const existingFile = await getFileMetadata(fileId);

      if (!existingFile) {
        return res.status(400).json({
          error: `File ${fileId} not found. First chunk must be uploaded before subsequent chunks.`
        });
      }

      // Verify file is marked as chunked
      if (!existingFile.isChunked) {
        return res.status(400).json({
          error: `File ${fileId} is not a chunked file`
        });
      }

      const existingChunks = existingFile.chunks || [];

      // Check for duplicate chunk index
      if (existingChunks.some((c: ChunkMetadata) => c.chunkIndex === chunkIdx)) {
        return res.status(400).json({
          error: `Chunk ${chunkIdx} already uploaded for this file`
        });
      }

      // Enforce sequential upload (optional but recommended for data integrity)
      const expectedIndex = existingChunks.length;
      if (chunkIdx !== expectedIndex) {
        return res.status(400).json({
          error: `Expected chunk ${expectedIndex}, got ${chunkIdx}. Chunks must be uploaded sequentially.`
        });
      }
    }

    // If this is the first chunk, initialize the file record
    if (isFirst) {
      console.log(`Initializing chunked file record for ${sanitizedFileName}`);
      const expiry = calculateExpiry(duration);
      const fileHash = req.body.fileHash;

      await initializeChunkedFile(
        fileId,
        sanitizedFileName,
        fileHash,
        0, // Will be calculated from sum of chunks
        CHUNK_SIZE,
        expiry,
        'pending'
      );
    }

    // Calculate chunk hash
    const chunkHash = crypto.createHash("sha256")
      .update(req.file.buffer)
      .digest("hex");

    // Validate frontend-provided chunk hash (if provided)
    const frontendChunkHash = req.body.chunkHash;
    if (frontendChunkHash && frontendChunkHash !== chunkHash) {
      console.error(`Hash mismatch for chunk ${chunkIdx}: frontend=${frontendChunkHash}, backend=${chunkHash}`);
      return res.status(400).json({
        error: "Chunk integrity check failed - hash mismatch",
        expected: chunkHash,
        received: frontendChunkHash
      });
    }

    // Upload chunk to EigenDA
    console.log(`Uploading chunk to EigenDA (${eigenDAConfig.mode})...`);
    const certificate = await uploadChunkToEigenDA(req.file.buffer);
    console.log(`Chunk ${chunkIdx} uploaded successfully: 0x${certificate.slice(0, 20)}...`);

    // Store chunk metadata
    const chunkMetadata: ChunkMetadata = {
      chunkIndex: chunkIdx,
      certificate,
      size: req.file.size,
      hash: chunkHash
    };

    await addChunkToFile(fileId, chunkMetadata);

    // Check if this is the last chunk
    const isComplete = isLast;

    // If this is the last chunk, calculate and update the real total file size
    if (isComplete) {
      const { getFileMetadata, updateFileSize } = await import("./db.js");
      const fileRecord = await getFileMetadata(fileId);

      if (fileRecord && fileRecord.chunks) {
        // Validate chunk count matches expected
        const actualChunkCount = fileRecord.chunks.length;
        if (actualChunkCount !== total) {
          return res.status(400).json({
            error: `Chunk count mismatch: expected ${total}, got ${actualChunkCount}`
          });
        }

        // Calculate REAL total size from actual chunk sizes
        const actualTotalSize = fileRecord.chunks.reduce((sum: number, chunk: any) => sum + chunk.size, 0);
        console.log(`File complete! Calculated total size: ${actualTotalSize} bytes from ${fileRecord.chunks.length} chunks`);

        // Validate total file size doesn't exceed maximum
        if (actualTotalSize > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: `Total file size ${actualTotalSize} exceeds maximum ${MAX_FILE_SIZE} bytes`
          });
        }

        // Update file record with real total size
        await updateFileSize(fileId, actualTotalSize);
      }
    }

    res.json({
      success: true,
      message: `Chunk ${chunkIdx + 1}/${total} uploaded successfully`,
      chunkIndex: chunkIdx,
      totalChunks: total,
      isComplete,
      certificate: `0x${certificate}`
    });

  } catch (error: any) {
    console.error(`Chunk upload error (chunk ${chunkIdx}):`, error);
    res.status(500).json({
      message: "Chunk upload failed",
      error: error.message,
      chunkIndex: chunkIdx
    });
  }
}
