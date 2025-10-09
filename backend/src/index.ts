import express from "express";
import multer from "multer";
import { handleUpload } from "./upload";
import { handleFetch } from "./fetch";

const app = express();

// Use multer to handle file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === Routes ===

// Upload endpoint
// Receives a file, hashes it, uploads to EigenDA, saves metadata, returns permanent link
app.post("/upload", upload.single("file"), handleUpload);

// Fetch endpoint
// Fetches file by fileId (serves latest blob from EigenDA)
app.get("/f/:fileId", handleFetch);

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

app.listen(PORT, () => {
  console.log(`ForeverData backend running on port ${PORT}`);
  console.log(`Stable link: https://foreverdata.io/f/:fileId`);
});
