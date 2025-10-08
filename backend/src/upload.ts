import multer from "multer";
import crypto from "crypto";
import { v4 } from "uuid";
import { insertFile } from "./db.js";
import FormData from "form-data";
import fetch from "node-fetch";
import express from "express";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  console.log("Received file:", req.file.originalname, req.file.size);

  // Generate SHA-256 hash of file data
  const hash = crypto.createHash("sha256");
  hash.update(req.file.buffer);
  const fileHash = hash.digest("hex");

  // Generate UUID for DB tracking
  const fileId = v4();

  // 3Prepare FormData for EigenDA proxy
  const formData = new FormData();
  formData.append("file", req.file.buffer, {
    filename: req.file.originalname,
    contentType: req.file.mimetype,
  });

  try {
    // Call the EigenDA proxy upload endpoint
    const response = await fetch("https://disperser-holesky.eigenda.xyz/api/v2/upload", {
      method: "POST",
      body: formData,
      headers: {
        ...formData.getHeaders(),
      },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("EigenDA upload failed:", err);
      return res.status(500).json({ message: "Failed to upload to EigenDA", error: err });
    }

    const data = await response.json();
    const blobId = data.blobId || data.request_id || null;
    const expiry = data.expiry || null;

    if (!blobId) {
      throw new Error("No blobId returned from EigenDA.");
    }

    // Insert file metadata into your database
    await insertFile(fileId, fileHash, blobId, expiry);

    // Respond to client
    res.json({
      fileId,
      link: `https://foreverdata.io/f/${fileId}`,
      expiry,
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

export default router;
