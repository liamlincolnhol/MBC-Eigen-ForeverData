import express from "express";
import multer from "multer";
import crypto from "crypto";
import fetch from "node-fetch";
import { insertFile } from "./db.js";
import { eigenDAConfig } from "./config.js";
import { calculateExpiry, getRemainingDays } from "./utils.js";
import { calculateRequiredPayment, verifyPayment } from "./utils/payments.js";

// Testing mode: Controlled by SKIP_PAYMENT_VERIFICATION environment variable
const SKIP_PAYMENT_VERIFICATION = process.env.SKIP_PAYMENT_VERIFICATION === 'true';

// using memory storage
export const upload = multer({ storage: multer.memoryStorage() });

export async function handleUpload(req: express.Request, res: express.Response) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  console.log("\nProcessing:", req.file.originalname, `(${req.file.size} bytes)`);

  // Get fileId from request body (should be provided by frontend after payment)
  const fileId = req.body.fileId;
  
  if (!fileId) {
    return res.status(400).json({ 
      error: "fileId is required. Please generate a fileId and complete payment first.",
      hint: "Use /api/generate-fileid endpoint first"
    });
  }

  const walletAddressRaw = req.body.walletAddress;
  const walletAddress = walletAddressRaw ? String(walletAddressRaw).toLowerCase() : undefined;

  // Determine requested storage duration
  let targetDuration = 30;
  if (req.body.targetDuration !== undefined) {
    const parsedDuration = parseInt(req.body.targetDuration, 10);
    if (!Number.isNaN(parsedDuration) && parsedDuration > 0) {
      targetDuration = Math.min(parsedDuration, 365 * 5); // Cap at ~5 years
    }
  }

  // Calculate required payment
  const payment = calculateRequiredPayment(req.file.size, targetDuration);

  // Check if payment exists and is sufficient (skip if in testing mode)
  let isValid = SKIP_PAYMENT_VERIFICATION;

  if (!SKIP_PAYMENT_VERIFICATION) {
    isValid = await verifyPayment(fileId, payment.requiredAmount);
  }

  if (!isValid) {
    return res.status(402).json({
      error: "Payment required or insufficient",
      fileId,
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

  // Log testing mode status
  if (SKIP_PAYMENT_VERIFICATION) {
    console.log('⚠️  TESTING MODE: Payment verification skipped');
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
    
    // Extract blob key for explorer (keccak256 hash of certificate)
    const blobKey = crypto.createHash('sha256').update(Buffer.from(certificateBuffer)).digest('hex');

    console.log(`Upload successful!`);
    console.log(`Certificate: 0x${certificate.slice(0, 20)}...`);
    console.log(`Blob Key: 0x${blobKey}`);

    // Store in database
    const expiry = calculateExpiry(targetDuration);
    await insertFile(
      fileId,
      req.file.originalname,
      fileHash,
      certificate,
      expiry,
      req.file.size,
      walletAddress ? 'paid' : 'pending',
      walletAddress,
      undefined,
      blobKey
    );

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
