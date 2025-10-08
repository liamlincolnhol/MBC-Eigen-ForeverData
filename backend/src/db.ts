import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;

export async function initializeDb() {
  db = await open({
    filename: 'fileInfo.db',
    driver: sqlite3.Database
  });
}

// function to insert new file info
export async function insertFile(fileId: string, hash: string, blobId: string, expiry: string): Promise<void> {
  // Set an initial expiryDate for 14 days from now
  const sql = `
    INSERT INTO files (fileId, hash, blobId, expiry)
    VALUES (?, ?, ?, ?))
  `;
  await db.run(sql, fileId, hash, blobId);
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

