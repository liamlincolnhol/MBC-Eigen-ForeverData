import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import type { Database } from "sqlite";
import path from "path";

let db: Database | null = null;

export async function initializeDb() {
  db = await open({
    filename: 'fileInfo.db',
    driver: sqlite3.Database
  });
  
  // Load and execute schema.sql
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schema);
}

// function to insert new file info
export async function insertFile(fileId: string, fileName: string, hash: string, certificate: string, expiry: string): Promise<void> {
  if (!db) throw new Error("Database not initialized");
  const sql = `
    INSERT INTO files (fileId, fileName, hash, blobId, expiry)
    VALUES (?, ?, ?, ?, ?)
  `;
  await db.run(sql, [fileId, fileName, hash, certificate, expiry]);
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
  return rows || [];
}