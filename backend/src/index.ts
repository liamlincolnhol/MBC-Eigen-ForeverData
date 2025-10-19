import express from "express";
import multer from "multer";
import cors from "cors";
import { handleUpload } from "./upload.js";
import { handleFetch } from "./fetch.js";
import { logEigenDAConfig } from "./config.js";
import { refreshFiles } from "./jobs/refresh.js";
import { initializeDb, getExpiringFiles } from "./db.js";

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

// Fetch endpoint
// Fetches file by fileId (serves latest blob from EigenDA)
app.get("/f/:fileId", handleFetch);

// Manual refresh trigger endpoint
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