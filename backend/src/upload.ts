import express from "express";
import multer from "multer";
import crypto from "crypto";
import { v4 } from "uuid";
import fetch from "node-fetch";
import { insertFile } from "./db.js";
import { eigenDAConfig } from "./config.js";

export const upload = multer({ storage: multer.memoryStorage() });
export async function handleUpload(req: express.Request, res: express.Response) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  console.log("Received file:", req.file.originalname, req.file.size);

  // SHA-256 hash for DB tracking
  const hash = crypto.createHash("sha256");
  hash.update(req.file.buffer);
  const fileHash = hash.digest("hex");

  const fileId = v4();

  try {
    console.log(`Uploading to EigenDA (${eigenDAConfig.mode})...`);
    
    // POST raw file data to proxy
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), eigenDAConfig.timeout);
    
    const response = await fetch(
      `${eigenDAConfig.proxyUrl}/put?commitment_mode=standard`, 
      {
        method: "POST",
        body: req.file.buffer,
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);

    // Handle 503 for real EigenDA failover
    if (response.status === 503) {
      console.error("EigenDA unavailable - service temporarily down");
      return res.status(503).json({ 
        message: "EigenDA service unavailable", 
        error: "Storage service temporarily down" 
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Proxy upload failed: ${response.status} - ${errorText}`);
      return res.status(500).json({ 
        message: "Failed to upload to EigenDA", 
        error: `Proxy error: ${response.status}` 
      });
    }

    // Get certificate as response body (binary)
    const certificateBuffer = await response.arrayBuffer();
    const certificate = Buffer.from(certificateBuffer).toString('hex');

    console.log(`Upload successful. Certificate: ${certificate.slice(0, 20)}...`);

    // Calculate expiry for real EigenDA (2 weeks from now)
    const expiry = eigenDAConfig.mode !== 'memstore' 
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Store certificate instead of blobId
    await insertFile(fileId, fileHash, certificate, expiry);

    res.json({
      fileId,
      link: `https://foreverdata.io/f/${fileId}`,
      expiry
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
}

// Fetch a blob from EigenDA proxy using certificate
export async function fetchBlob(certificate: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), eigenDAConfig.timeout);
  
  const response = await fetch(
    `${eigenDAConfig.proxyUrl}/get/${certificate}?commitment_mode=standard`,
    {
      signal: controller.signal
    }
  );
  
  clearTimeout(timeoutId);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch blob from EigenDA: ${response.status}`);
  }
  
  // Return the response stream for piping
  return response.body;
}
