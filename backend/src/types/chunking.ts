export interface ChunkMetadata {
  chunkIndex: number;      // 0-based chunk sequence
  certificate: string;     // EigenDA blob certificate
  size: number;            // Actual chunk size in bytes
  hash: string;            // SHA256 hash for integrity
}

export interface ChunkedFileRecord {
  fileId: string;
  fileName: string;
  hash: string;            // Overall file SHA256
  isChunked: boolean;      // true for chunked files
  fileSize: number;        // Total file size
  chunkSize: number;       // Standard chunk size (16 MiB)
  chunks: ChunkMetadata[]; // Array of chunk data
  expiry: string;
  createdAt: string;
  // Payment fields
  paymentStatus?: string;
  payerAddress?: string;
  paymentAmount?: string;
  paymentTxHash?: string;
  lastBalanceCheck?: string;
  contractBalance?: string;
}

export interface SingleBlobFileRecord {
  fileId: string;
  fileName: string;
  hash: string;
  blobId: string;          // Legacy single-blob certificate
  blobKey?: string;
  isChunked: boolean;      // false for single-blob files
  fileSize: number;
  expiry: string;
  createdAt: string;
  // Payment fields
  paymentStatus?: string;
  payerAddress?: string;
  paymentAmount?: string;
  paymentTxHash?: string;
  lastBalanceCheck?: string;
  contractBalance?: string;
}

// Union type for file records
export type FileRecord = ChunkedFileRecord | SingleBlobFileRecord;

export interface ChunkUploadRequest {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  isLastChunk: boolean;
  chunkData: Buffer;
}

export interface ChunkUploadResponse {
  success: boolean;
  chunkIndex: number;
  totalChunks: number;
  isComplete: boolean;
  certificate?: string;
}
