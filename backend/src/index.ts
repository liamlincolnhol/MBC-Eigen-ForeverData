import express from "express";
import multer from "multer";
import cors from "cors";
import { v4 } from "uuid";
import { handleUpload } from "./upload.js";
import { handleChunkUpload } from "./uploadChunk.js";
import { handleFetch } from "./fetch.js";
import { logEigenDAConfig } from "./config.js";
import { refreshFiles } from "./jobs/refresh.js";
import { initializeDb, getExpiringFiles, getFileMetadata, getAllFiles, getFilesByOwner } from "./db.js";
import { calculateRequiredPayment, calculateChunkedPayment } from "./utils/payments.js";

const app = express();

// Use multer to handle file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://foreverdata.live',
  'https://www.foreverdata.live',
  'https://mbc-eigen-forever-data-f6tdvcz02-liam-lincolnhols-projects.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow all vercel.app domains
    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === Routes ===

// Upload endpoint
// Receives a file, hashes it, uploads to EigenDA, saves metadata, returns permanent link
app.post("/upload", upload.single("file"), handleUpload);

// Chunk upload endpoint
// Receives a file chunk, uploads to EigenDA, stores chunk metadata
app.post("/upload-chunk", upload.single("chunk"), handleChunkUpload);

// Fetch endpoint
// Fetches file by fileId (serves latest blob from EigenDA)
app.get("/f/:fileId", handleFetch);

// Get file metadata endpoint
// Get file metadata endpoint
app.get("/api/metadata/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await getFileMetadata(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual refresh trigger endpoint
app.post("/api/admin/trigger-refresh", async (req, res) => {
  try {
    console.log('🔄 Manual refresh job triggered at', new Date().toISOString());
    
    // Get count of expiring files first
    const expiringFiles = await getExpiringFiles();
    await refreshFiles();
    
    res.json({ 
      success: true, 
      message: 'Refresh job completed successfully',
      filesProcessed: expiringFiles.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Refresh job error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Generate fileId endpoint for payment flow
app.post("/api/generate-fileid", async (req, res) => {
  try {
    const { fileName, fileSize, targetDuration } = req.body;

    if (!fileName || !fileSize) {
      return res.status(400).json({ error: "fileName and fileSize are required" });
    }

    let duration = 14;
    if (targetDuration !== undefined) {
      const parsed = parseInt(targetDuration, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        duration = Math.min(parsed, 365 * 5); // cap at ~5 years to avoid overflow
      }
    }

    // Generate consistent fileId using filename and size
    const fileId = v4();

    // Calculate payment details with chunking info
    const payment = calculateChunkedPayment(fileSize, duration);

    res.json({
      fileId,
      payment: {
        requiredAmount: payment.requiredAmount.toString(),
        estimatedDuration: payment.estimatedDuration,
        breakdown: {
          storageCost: payment.breakdown.storageCost.toString(),
          gasCost: payment.breakdown.gasCost.toString()
        }
      },
      chunkingInfo: {
        willBeChunked: payment.isChunked,
        totalChunks: payment.chunkCount,
        chunkSize: payment.chunkSize
      }
    });
  } catch (error) {
    console.error("Error generating fileId:", error);
    res.status(500).json({ error: "Failed to generate fileId" });
  }
});

// Dashboard API endpoint
// Returns all files with status information for dashboard
// Accepts optional 'walletAddress' query parameter to filter by owner
app.get("/api/files", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    let files;
    if (walletAddress && typeof walletAddress === 'string') {
      // Filter by wallet address
      files = await getFilesByOwner(walletAddress);
    } else {
      // Return all files
      files = await getAllFiles();
    }

    res.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// Health check / status endpoint (optional)??
app.get("/status", (_req, res) => {
  res.json({ status: "ok", service: "ForeverData Backend" });
});

// Default 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// === Start Server ===
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database and load schema
    await initializeDb();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`ForeverData backend running on port ${PORT}`);
      console.log(`Public URL: https://8a32f4028ff1.ngrok-free.app`);
      console.log(`Stable links: https://8a32f4028ff1.ngrok-free.app/f/:fileId`);
      logEigenDAConfig();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
