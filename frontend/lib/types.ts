// Backend API Response Types - must match backend contract exactly

export interface UploadResponse {
  fileId: string;
  permanentLink: string;
  blobId: string;
  expiryDate: string; // ISO 8601 timestamp
  fileName: string;
  fileSize: number; // bytes
  fileHash: string;
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
  refreshHistory: RefreshRecord[];
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
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