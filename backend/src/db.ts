import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";

let db;

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
export async function insertFile(fileId: string, fileName: string, hash: string, certificate: string, expiry: string | null): Promise<void> {
  const sql = `
    INSERT INTO files (fileId, fileName, hash, blobId, expiry)
    VALUES (?, ?, ?, ?, ?)
  `;
  // Use empty string instead of null for memstore compatibility with NOT NULL constraint
  const expiryValue = expiry || '';
  await db.run(sql, fileId, fileName, hash, certificate, expiryValue);
}

// function to retrieve file info using fileId
export async function getFile(fileId: string): Promise<any | undefined> {
  const sql = `SELECT * FROM files WHERE fileId = ?`;
  // .get() resolves with the row, or undefined if not found
  const row = await db.get(sql, fileId);
  return row;
}

// function to refresh the expiry date
export async function refreshExpiryDate(fileId: string): Promise<void> {
  const sql = `
    UPDATE files
    SET expiryDate = datetime(CURRENT_TIMESTAMP, '+14 days')
    WHERE fileId = ?
  `;
  await db.run(sql, fileId);
}

