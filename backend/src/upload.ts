import express from "express";
import multer from "multer";
import crypto from "crypto";
import { v4 } from "uuid";
import fetch from "node-fetch";
import { insertFile } from "./db.js";
import { eigenDAConfig } from "./config.js";
import { calculateExpiry, getRemainingDays } from "./utils.js";
import { calculateRequiredPayment, verifyPayment } from "./utils/payments.js";
import { PaymentDetails } from "./types/payments.js";

// using memory storage
export const upload = multer({ storage: multer.memoryStorage() });

export async function handleUpload(req: express.Request, res: express.Response) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  console.log("\nProcessing:", req.file.originalname, `(${req.file.size} bytes)`);

  const fileId = v4();

  // Calculate required payment
  const payment = calculateRequiredPayment(req.file.size);
  
  // Check if payment exists and is sufficient
  const isValid = await verifyPayment(fileId, payment.requiredAmount);
  
  if (!isValid) {
    return res.status(402).json({
      error: "Payment required",
      fileId, // Return fileId so frontend can initiate payment
      details: {
        requiredAmount: payment.requiredAmount.toString(),
        estimatedDuration: payment.estimatedDuration,
        breakdown: {
          storageCost: payment.breakdown.storageCost.toString(),
          gasCost: payment.breakdown.gasCost.toString()
        }
      }
    });
  }

  // Calculate hash
  const hash = crypto.createHash("sha256");
  hash.update(req.file.buffer);
  const fileHash = hash.digest("hex");
  console.log("Hash:", fileHash);

  try {    
    // Upload file to EigenDA
    console.log(`Uploading to EigenDA (${eigenDAConfig.mode})...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), eigenDAConfig.timeout);
    
    const response = await fetch(
      `${eigenDAConfig.proxyUrl}/put`, 
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

    if (response.status === 503) {
      console.error("EigenDA unavailable");
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
        error: `Proxy error: ${response.status}`,
        details: errorText
      });
    }

    // Get the certificate (blob ID) from response
    const certificateBuffer = await response.arrayBuffer();
    const certificate = Buffer.from(certificateBuffer).toString('hex');

    console.log(`Upload successful!`);
    console.log(`Blob ID: 0x${certificate.slice(0, 20)}...`);

    // Store in database
    const expiry = calculateExpiry();
    await insertFile(fileId, req.file.originalname, fileHash, certificate, expiry);

    // Respond with metadata
    res.json({
      fileId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileHash: fileHash,
      uploadDate: new Date().toISOString(),
      permanentLink: `https://api.foreverdata.live/f/${fileId}`,
      blobId: `0x${certificate}`,
      expiryDate: expiry,
      daysRemaining: getRemainingDays(expiry),
      refreshHistory: []
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
}

// Fetch Function
export async function fetchBlob(certificate: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), eigenDAConfig.timeout);
  
  // Remove '0x' prefix if present
  const cleanCertificate = certificate.startsWith('0x') ? certificate.slice(2) : certificate;
  
  const response = await fetch(
    `${eigenDAConfig.proxyUrl}/get/0x${cleanCertificate}`,
    {
      signal: controller.signal
    }
  );
  
  clearTimeout(timeoutId);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch blob from EigenDA: ${response.status}`);
  }
  
  return response.body;
}