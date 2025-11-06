/**
 * File Chunking Utilities
 *
 * Handles splitting large files into EigenDA blob-sized chunks.
 * Uses the same greedy bucket selection as the backend to maximise blob utilisation.
 */

const BYTES_PER_MEBIBYTE = 1024 * 1024;

export const EIGENDA_BLOB_BUCKETS_MIB = [1, 2, 4, 8, 16] as const;
export const EIGENDA_BLOB_BUCKETS_BYTES = EIGENDA_BLOB_BUCKETS_MIB.map(
  size => size * BYTES_PER_MEBIBYTE
);

const MIN_CHUNK_SIZE = EIGENDA_BLOB_BUCKETS_BYTES[0];
const MAX_CHUNK_SIZE =
  EIGENDA_BLOB_BUCKETS_BYTES[EIGENDA_BLOB_BUCKETS_BYTES.length - 1];

export interface ChunkInfo {
  chunkIndex: number;        // 0-based chunk index
  chunkData: Blob;           // Actual chunk data
  chunkSize: number;         // Size of this chunk in bytes (actual payload)
  chunkCapacity: number;     // EigenDA blob bucket size in bytes for this chunk
  chunkHash: string;         // SHA256 hash of chunk for integrity
  isFirstChunk: boolean;     // Flag for first chunk
  isLastChunk: boolean;      // Flag for last chunk
  totalChunks: number;       // Total number of chunks for this file
}

export interface FileChunkingResult {
  fileId: string;
  fileName: string;
  fileHash: string;          // Hash of entire file
  totalSize: number;         // Total file size in bytes
  chunks: ChunkInfo[];       // Array of chunk information
  willBeChunked: boolean;    // Whether file needs chunking
}

/**
 * Calculate SHA256 hash of a blob using Web Crypto API
 */
async function calculateHash(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Greedily resolve the EigenDA blob bucket size to use for a given file size.
 * Optionally accepts a preferred chunk size (from the backend) and validates it.
 */
export function resolveChunkSize(
  fileSize: number,
  preferredChunkSize?: number
): number {
  if (
    typeof preferredChunkSize === 'number' &&
    EIGENDA_BLOB_BUCKETS_BYTES.includes(preferredChunkSize)
  ) {
    return preferredChunkSize;
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return MIN_CHUNK_SIZE;
  }

  for (const bucket of EIGENDA_BLOB_BUCKETS_BYTES) {
    if (fileSize <= bucket) {
      return bucket;
    }
  }

  return MAX_CHUNK_SIZE;
}

/**
 * Determine if a file needs to be chunked
 */
export function shouldChunkFile(
  fileSize: number,
  preferredChunkSize?: number
): boolean {
  return calculateChunkCount(fileSize, preferredChunkSize) > 1;
}

/**
 * Calculate the number of chunks needed for a file
 */
export function calculateChunkCount(
  fileSize: number,
  preferredChunkSize?: number
): number {
  if (fileSize <= 0) return 0;
  const chunkSize = resolveChunkSize(fileSize, preferredChunkSize);
  return Math.max(1, Math.ceil(fileSize / chunkSize));
}

/**
 * Split a file into chunks
 *
 * @param file - File to be chunked
 * @param fileId - Generated fileId from backend
 * @returns Promise resolving to chunking result with metadata
 */
export async function chunkFile(
  file: File,
  fileId: string,
  preferredChunkSize?: number
): Promise<FileChunkingResult> {
  const totalSize = file.size;
  const targetChunkSize = resolveChunkSize(totalSize, preferredChunkSize);
  const totalChunks = calculateChunkCount(totalSize, targetChunkSize);
  const willBeChunked = totalChunks > 1;

  // Calculate hash of entire file
  const fileHash = await calculateHash(file);

  // If file is small enough, don't chunk it
  if (!willBeChunked) {
    return {
      fileId,
      fileName: file.name,
      fileHash,
      totalSize,
      chunks: [],
      willBeChunked: false,
    };
  }

  // Split file into chunks
  const chunks: ChunkInfo[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * targetChunkSize;
    const end = Math.min(totalSize, start + targetChunkSize);
    const chunkBlob = file.slice(start, end);
    const chunkBytes = end - start;

    // Calculate hash for this chunk
    const chunkHash = await calculateHash(chunkBlob);

    chunks.push({
      chunkIndex: i,
      chunkData: chunkBlob,
      chunkSize: chunkBytes,
      chunkCapacity: targetChunkSize,
      chunkHash,
      isFirstChunk: i === 0,
      isLastChunk: i === totalChunks - 1,
      totalChunks,
    });
  }

  return {
    fileId,
    fileName: file.name,
    fileHash,
    totalSize,
    chunks,
    willBeChunked: true,
  };
}

/**
 * Progress tracking for chunked uploads
 */
export interface ChunkUploadProgress {
  totalChunks: number;
  uploadedChunks: number;
  currentChunk: number;
  overallProgress: number;    // 0-100
  bytesUploaded: number;
  totalBytes: number;
}

/**
 * Calculate overall progress from chunk upload state
 */
export function calculateProgress(
  uploadedChunks: number,
  totalChunks: number,
  bytesUploaded: number,
  totalBytes: number
): ChunkUploadProgress {
  const overallProgress = totalBytes > 0
    ? Math.round((bytesUploaded / totalBytes) * 100)
    : 0;

  return {
    totalChunks,
    uploadedChunks,
    currentChunk: uploadedChunks + 1,
    overallProgress,
    bytesUploaded,
    totalBytes,
  };
}

/**
 * Reassemble chunks back into a file (for retrieval)
 *
 * @param chunks - Array of chunk blobs in order
 * @param fileName - Original file name
 * @param mimeType - MIME type of the file
 * @returns Reconstructed File object
 */
export function reassembleChunks(
  chunks: Blob[],
  fileName: string,
  mimeType: string = 'application/octet-stream'
): File {
  const blob = new Blob(chunks, { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Validate chunk integrity after download
 *
 * @param chunk - Chunk blob to validate
 * @param expectedHash - Expected SHA256 hash
 * @returns Promise resolving to true if valid, false otherwise
 */
export async function validateChunk(
  chunk: Blob,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await calculateHash(chunk);
  return actualHash === expectedHash;
}
