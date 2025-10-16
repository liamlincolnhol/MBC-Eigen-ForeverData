import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";
let db = null;
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
export async function insertFile(fileId, fileName, hash, certificate, expiry) {
    if (!db)
        throw new Error("Database not initialized");
    const sql = `
    INSERT INTO files (fileId, fileName, hash, blobId, expiry)
    VALUES (?, ?, ?, ?, ?)
  `;
    await db.run(sql, [fileId, fileName, hash, certificate, expiry]);
}
// function to retrieve file info using fileId
export async function getFile(fileId) {
    if (!db)
        throw new Error("Database not initialized");
    const sql = `SELECT * FROM files WHERE fileId = ?`;
    // .get() resolves with the row, or undefined if not found
    const row = await db.get(sql, fileId);
    return row;
}
// function to retrieve files where expiry is within the next 24 hours
export async function getExpiringFiles() {
    if (!db)
        throw new Error("Database not initialized");
    const sql = `
    SELECT * FROM files 
    WHERE expiry <= datetime('now', '+24 hours')
    AND expiry > datetime('now')
  `;
    const rows = await db.all(sql);
    return rows || [];
}
// function to refresh the expiry date and blobId
export async function refreshFileInfo(fileId, newBlobId) {
    if (!db)
        throw new Error("Database not initialized");
    const sql = `
    UPDATE files
    SET blobId = ?, expiry = datetime(CURRENT_TIMESTAMP, '+14 days')
    WHERE fileId = ?
  `;
    await db.run(sql, [newBlobId, fileId]);
}
