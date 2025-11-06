// Backend API Response Types - must match backend contract exactly

export interface UploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  uploadDate: string;
  permanentLink: string;
  currentBlobId: string;
  expiryDate: string;
  daysRemaining: number;
  refreshHistory: RefreshRecord[];
}

export interface RefreshRecord {
  timestamp: string; // ISO 8601 timestamp
  oldBlobId: string;
  newBlobId: string;
  status: 'success' | 'failed';
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number; // bytes
  fileHash: string;
  uploadDate: string; // ISO 8601 timestamp
  permanentLink: string;
  currentBlobId: string;
  expiryDate: string; // ISO 8601 timestamp
  daysRemaining?: number; // days until expiry
  refreshHistory: RefreshRecord[];
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// UI State Types

export interface UploadState {
  isUploading: boolean;
  progress: number; // 0-100
  error: string | null;
}

export type StatusLevel = 'healthy' | 'warning' | 'critical';

export interface FileStatus {
  level: StatusLevel;
  timeUntilExpiry: string;
  daysRemaining: number;
}

export interface PaymentSummary {
  requiredAmount: bigint;
  estimatedDuration: number;
  breakdown: {
    storageCost: bigint;
    gasCost: bigint;
  };
  chunkCount?: number;
  chunkSize?: number;
}
