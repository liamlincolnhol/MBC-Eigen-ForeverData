import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import type { Database } from "sqlite";
import path from "path";
import type { ChunkMetadata } from "./types/chunking.js";

let db: Database | null = null;

export async function initializeDb() {
  db = await open({
    filename: 'fileInfo.db',
    driver: sqlite3.Database
  });
  
  // Load and execute schema.sql (without the ALTER TABLE)
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Remove the ALTER TABLE statement to handle it separately
  const schemaWithoutAlter = schema.replace(/-- Add blobKey column[\s\S]*$/, '');
  await db.exec(schemaWithoutAlter);
  
  // Handle blobKey column migration safely
  try {
    await db.exec('ALTER TABLE files ADD COLUMN blobKey TEXT');
    console.log('Added blobKey column to files table');
  } catch (err: any) {
    if (err.code === 'SQLITE_ERROR' && err.message.includes('duplicate column')) {
      console.log('blobKey column already exists, skipping migration');
    } else {
      throw err; // Re-throw other errors
    }
  }

  // Handle chunking columns migration safely
  try {
    await db.exec('ALTER TABLE files ADD COLUMN isChunked BOOLEAN DEFAULT 0');
    console.log('Added isChunked column to files table');
  } catch (err: any) {
    if (err.code === 'SQLITE_ERROR' && err.message.includes('duplicate column')) {
      console.log('isChunked column already exists, skipping migration');
    } else {
      throw err;
    }
  }

  try {
    await db.exec('ALTER TABLE files ADD COLUMN chunkSize INTEGER');
    console.log('Added chunkSize column to files table');
  } catch (err: any) {
    if (err.code === 'SQLITE_ERROR' && err.message.includes('duplicate column')) {
      console.log('chunkSize column already exists, skipping migration');
    } else {
      throw err;
    }
  }

  try {
    await db.exec('ALTER TABLE files ADD COLUMN chunks TEXT');
    console.log('Added chunks column to files table');
  } catch (err: any) {
    if (err.code === 'SQLITE_ERROR' && err.message.includes('duplicate column')) {
      console.log('chunks column already exists, skipping migration');
    } else {
      throw err;
    }
  }
}

// function to insert new file info
export async function insertFile(
  fileId: string, 
  fileName: string, 
  hash: string, 
  certificate: string, 
  expiry: string,
  fileSize?: number,
  paymentStatus: string = 'pending',
  payerAddress?: string,
  paymentAmount?: string,
  blobKey?: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    INSERT INTO files (
      fileId, fileName, hash, blobId, blobKey, expiry, fileSize,
      paymentStatus, payerAddress, paymentAmount
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await db.run(sql, [
    fileId, fileName, hash, certificate, blobKey || null, expiry, fileSize || null,
    paymentStatus, payerAddress || null, paymentAmount || null
  ]);
}

// function to insert chunked file info
export async function insertChunkedFile(
  fileId: string,
  fileName: string,
  hash: string,
  chunks: ChunkMetadata[],
  expiry: string,
  fileSize: number,
  chunkSize: number,
  paymentStatus: string = 'pending',
  payerAddress?: string,
  paymentAmount?: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    INSERT INTO files (
      fileId, fileName, hash, isChunked, chunks, chunkSize, fileSize, expiry,
      paymentStatus, payerAddress, paymentAmount
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await db.run(sql, [
    fileId, fileName, hash, 1, JSON.stringify(chunks), chunkSize, fileSize, expiry,
    paymentStatus, payerAddress || null, paymentAmount || null
  ]);
}

// function to update payment status
export async function updatePaymentStatus(
  fileId: string,
  status: string,
  payerAddress?: string,
  paymentAmount?: string,
  txHash?: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    UPDATE files 
    SET paymentStatus = ?,
        payerAddress = COALESCE(?, payerAddress),
        paymentAmount = COALESCE(?, paymentAmount),
        paymentTxHash = COALESCE(?, paymentTxHash)
    WHERE fileId = ?
  `;
  await db.run(sql, [status, payerAddress, paymentAmount, txHash, fileId]);
}

// function to record payment transaction
export async function recordPayment(
  txHash: string,
  fileId: string,
  payerAddress: string,
  amount: string,
  type: 'deposit' | 'refresh' | 'withdrawal'
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    INSERT INTO payments (txHash, fileId, payerAddress, amount, type)
    VALUES (?, ?, ?, ?, ?)
  `;
  await db.run(sql, [txHash, fileId, payerAddress, amount, type]);
}

// function to retrieve file info using fileId
export async function getFile(fileId: string): Promise<any | undefined> {
  if (!db) throw new Error("Database not initialized");
  const sql = `SELECT * FROM files WHERE fileId = ?`;
  // .get() resolves with the row, or undefined if not found
  const row = await db.get(sql, fileId);
  return row;
}

// function to retrieve files where expiry is within the next 24 hours
export async function getExpiringFiles(): Promise<any[]> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    SELECT * FROM files 
    WHERE expiry <= datetime('now', '+24 hours')
    AND expiry > datetime('now')
  `;
  const rows = await db.all(sql);
  return rows || [];
}

// function to refresh the expiry date and blobId
export async function refreshFileInfo(fileId: string, newBlobId: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    UPDATE files
    SET blobId = ?, expiry = datetime(CURRENT_TIMESTAMP, '+14 days')
    WHERE fileId = ?
  `;
  await db.run(sql, [newBlobId, fileId]);
}

// function to get file metadata
export async function getFileMetadata(fileId: string): Promise<any> {
  if (!db) throw new Error("Database not initialized");
  const sql = `SELECT * FROM files WHERE fileId = ?`;
  const file = await db.get(sql, fileId);

  // Parse chunks JSON if file is chunked
  if (file && file.chunks) {
    file.chunks = JSON.parse(file.chunks);
  }

  return file;
}

// function to get all files with status information
export async function getAllFiles(): Promise<any[]> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    SELECT *,
      CASE
        WHEN expiry <= datetime('now') THEN 'expired'
        WHEN expiry <= datetime('now', '+24 hours') THEN 'expiring_soon'
        ELSE 'active'
      END as status,
      ROUND((julianday(expiry) - julianday('now'))) as days_remaining
    FROM files
    ORDER BY createdAt DESC
  `;
  const rows = await db.all(sql);

  // Parse chunks JSON for chunked files
  if (rows) {
    rows.forEach(file => {
      if (file.chunks) {
        file.chunks = JSON.parse(file.chunks);
      }
    });
  }

  return rows || [];
}

// function to update contract balance info
export async function updateContractBalance(
  fileId: string,
  balance: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    UPDATE files 
    SET contractBalance = ?,
        lastBalanceCheck = datetime('now')
    WHERE fileId = ?
  `;
  await db.run(sql, [balance, fileId]);
}

// function to get files that need balance checks (haven't been checked in the last hour)
export async function getFilesForBalanceCheck(): Promise<any[]> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    SELECT * FROM files
    WHERE paymentStatus IN ('paid', 'pending')
    AND (lastBalanceCheck IS NULL OR lastBalanceCheck <= datetime('now', '-1 hour'))
  `;
  const rows = await db.all(sql);
  return rows || [];
}

// function to add a chunk to a file's chunks array
export async function addChunkToFile(
  fileId: string,
  chunk: ChunkMetadata
): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  // Use IMMEDIATE transaction to prevent race conditions
  // IMMEDIATE acquires a reserved lock immediately
  await db.run('BEGIN IMMEDIATE');

  try {
    // Get current file within transaction
    const sql = 'SELECT * FROM files WHERE fileId = ?';
    const file = await db.get(sql, fileId);

    if (!file) {
      await db.run('ROLLBACK');
      throw new Error(`File ${fileId} not found`);
    }

    // Parse existing chunks or initialize empty array
    const chunks: ChunkMetadata[] = file.chunks ? JSON.parse(file.chunks) : [];
    chunks.push(chunk);

    // Update file with new chunks array
    const updateSql = `UPDATE files SET chunks = ? WHERE fileId = ?`;
    await db.run(updateSql, [JSON.stringify(chunks), fileId]);

    // Commit transaction
    await db.run('COMMIT');
  } catch (error) {
    // Rollback on any error
    await db.run('ROLLBACK');
    throw error;
  }
}

// function to update file size (used when finalizing chunked uploads)
export async function updateFileSize(
  fileId: string,
  fileSize: number
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const sql = `UPDATE files SET fileSize = ? WHERE fileId = ?`;
  await db.run(sql, [fileSize, fileId]);
}

// function to initialize a chunked file record (before chunks are uploaded)
export async function initializeChunkedFile(
  fileId: string,
  fileName: string,
  hash: string,
  totalSize: number,
  chunkSize: number,
  expiry: string,
  paymentStatus: string = 'pending',
  payerAddress?: string,
  paymentAmount?: string
): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    INSERT INTO files (
      fileId, fileName, hash, blobId, isChunked, chunkSize, fileSize, expiry,
      chunks, paymentStatus, payerAddress, paymentAmount
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await db.run(sql, [
    fileId, fileName, hash, 'CHUNKED', 1, chunkSize, totalSize, expiry,
    JSON.stringify([]), // Empty chunks array
    paymentStatus, payerAddress || null, paymentAmount || null
  ]);
}

/**
 * Clean up incomplete chunked uploads older than 24 hours
 * This prevents database bloat from abandoned uploads
 */
export async function cleanupIncompleteChunkedUploads(): Promise<number> {
  if (!db) throw new Error("Database not initialized");

  const sql = `
    DELETE FROM files
    WHERE isChunked = 1
    AND fileSize = 0
    AND createdAt < datetime('now', '-24 hours')
  `;

  const result = await db.run(sql);
  const deletedCount = result.changes || 0;

  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} incomplete chunked upload(s)`);
  }

  return deletedCount;
}