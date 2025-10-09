import express from "express";
import multer from "multer";
import crypto from "crypto";
import { v4 } from "uuid";
import FormData from "form-data";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { Wallet, ethers } from "ethers";
import { insertFile } from "./db.js"; // your DB function

dotenv.config();

//const router = express.Router();<----
//const upload = multer({ storage: multer.memoryStorage() }); <----
export const upload = multer({ storage: multer.memoryStorage() }); //NEW

const EIGENDA_AUTH_PK = process.env.EIGENDA_AUTH_PK!;
const EIGENDA_ETH_ADDRESS = process.env.EIGENDA_ETH_ADDRESS!;
const EIGENDA_PROXY_URL = process.env.EIGENDA_PROXY_SEPOLIA!;

// Pad bytes to 32-byte alignment for EigenDA
function padBytes(data: Uint8Array, blockSize = 32): Uint8Array {
  const padding = blockSize - (data.length % blockSize);
  if (padding === 0) return data;
  return Buffer.concat([data, Buffer.alloc(padding)]);
}

// Sign payment requirement (ECDSA) using ethers.js
async function signPaymentRequirement(requirement: any, privateKey: string): Promise<string> {
  const wallet = new Wallet(privateKey);
  const messageHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(JSON.stringify(requirement))
  );
  return wallet.signMessage(ethers.utils.arrayify(messageHash));
}
//router.post("/upload", upload.single("file"), async (req, res) => { <----
export async function handleUpload(req: express.Request, res: express.Response) { //NEW
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  console.log("Received file:", req.file.originalname, req.file.size);

  // SHA-256 hash for DB tracking
  const hash = crypto.createHash("sha256");
  hash.update(req.file.buffer);
  const fileHash = hash.digest("hex");

  const fileId = v4();
  const paddedBytes = padBytes(req.file.buffer);

  // Create payment requirement for Sepolia
  const paymentRequirement = {
    price: "1000000", // Example price (in wei or token units)
    resource: `/upload/${fileId}`,
    merchantAddress: EIGENDA_ETH_ADDRESS,
    network: "sepolia",
  };

  try {
    // Sign the payment requirement
    const signature = await signPaymentRequirement(paymentRequirement, EIGENDA_AUTH_PK);

    // Prepare FormData for EigenDA proxy
    const formData = new FormData();
    formData.append("file", paddedBytes, { filename: req.file.originalname, contentType: req.file.mimetype });
    formData.append("signer", EIGENDA_ETH_ADDRESS);
    formData.append("signature", signature);
    formData.append("paymentRequirement", JSON.stringify(paymentRequirement));

    // Send to Sepolia proxy
    const response = await fetch(EIGENDA_PROXY_URL, {
      method: "POST",
      body: formData,
      headers: { ...formData.getHeaders() },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("EigenDA upload failed:", err);
      return res.status(500).json({ message: "Failed to upload to EigenDA", error: err });
    }

    const data = await response.json();
    const blobId = data.blobId || data.request_id || null;
    const expiry = data.expiry || null;

    if (!blobId) throw new Error("No blobId returned from EigenDA Sepolia");

    // Insert file metadata into DB
    await insertFile(fileId, fileHash, blobId, expiry);

    res.json({
      fileId,
      link: `https://foreverdata.io/f/${fileId}`,
      expiry,
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
//}); <----
//export default router; <----
} //NEW


//EVERYTHING BELOW IS NEW
// Fetch a blob from EigenDA proxy by blobId
export async function fetchBlob(blobId: string) {
  // You may need to adjust the endpoint and headers for your proxy
  const response = await fetch(`${EIGENDA_PROXY_URL}/blob/${blobId}`); //is this correct url?
  if (!response.ok) {
    throw new Error("Failed to fetch blob from EigenDA");
  }
  // Return the response stream for piping
  return response.body;
}
