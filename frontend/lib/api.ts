import axios, { AxiosProgressEvent } from 'axios';
import { UploadResponse, FileMetadata, ApiError } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.foreverdata.live';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
});

// Upload file with progress tracking
export async function uploadFile(
  file: File,
  fileId: string,
  onProgress?: (progress: number) => void,
  targetDuration?: number,
  walletAddress?: string | null
): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileId', fileId);
    if (targetDuration && targetDuration > 0) {
      formData.append('targetDuration', targetDuration.toString());
    }
    if (walletAddress) {
      formData.append('walletAddress', walletAddress);
    }

    const response = await api.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to upload file');
  }
}

// Generate fileId for payment flow
export async function generateFileId(fileName: string, fileSize: number, targetDuration?: number): Promise<{
  fileId: string;
  payment: {
    requiredAmount: string;
    estimatedDuration: number;
    breakdown: {
      storageCost: string;
      gasCost: string;
    };
  };
  chunkingInfo?: {
    willBeChunked: boolean;
    totalChunks: number;
    chunkSize: number;
  };
}> {
  try {
    const response = await api.post('/api/generate-fileid', {
      fileName,
      fileSize,
      targetDuration
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to generate file ID');
  }
}

// Upload a single chunk
export async function uploadChunk(
  chunk: Blob,
  fileId: string,
  fileName: string,
  chunkIndex: number,
  totalChunks: number,
  chunkHash: string,
  fileHash: string,
  isFirstChunk: boolean,
  isLastChunk: boolean,
  chunkCapacity: number,
  onProgress?: (progress: number) => void,
  targetDuration?: number,
  walletAddress?: string | null
): Promise<{
  success: boolean;
  message: string;
  chunkIndex: number;
  totalChunks: number;
  isComplete: boolean;
  certificate?: string;
}> {
  try {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('fileId', fileId);
    formData.append('fileName', fileName);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('chunkHash', chunkHash);
    formData.append('fileHash', fileHash);
    formData.append('isFirstChunk', isFirstChunk.toString());
    formData.append('isLastChunk', isLastChunk.toString());
    if (Number.isFinite(chunkCapacity) && chunkCapacity > 0) {
      formData.append('chunkCapacity', chunkCapacity.toString());
    }
    if (targetDuration && targetDuration > 0) {
      formData.append('targetDuration', targetDuration.toString());
    }
    if (walletAddress) {
      formData.append('walletAddress', walletAddress);
    }

    const response = await api.post('/upload-chunk', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 second timeout for chunk upload
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to upload chunk');
  }
}

// Get file metadata by ID
export async function getFileMetadata(fileId: string): Promise<FileMetadata> {
  try {
    const response = await api.get<FileMetadata>(`/f/${fileId}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error, 'Failed to fetch file metadata');
  }
}

// Handle API errors and return user-friendly messages
function handleApiError(error: unknown, defaultMessage: string): ApiError {
  if (axios.isAxiosError(error)) {
    // Network/connection errors
    if (!error.response) {
      return {
        message: 'Unable to connect to the server. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        details: error.message,
      };
    }

    // HTTP error responses
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return {
          message: data?.message || 'Invalid request. Please check your input.',
          code: 'BAD_REQUEST',
          details: data,
        };
      case 404:
        return {
          message: 'File not found. It may have been deleted or the link is invalid.',
          code: 'NOT_FOUND',
          details: data,
        };
      case 413:
        return {
          message: 'File is too large. Please try uploading a smaller file.',
          code: 'FILE_TOO_LARGE',
          details: data,
        };
      case 429:
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMITED',
          details: data,
        };
      case 500:
        return {
          message: 'Server error. Please try again later.',
          code: 'SERVER_ERROR',
          details: data,
        };
      default:
        return {
          message: data?.message || defaultMessage,
          code: `HTTP_${status}`,
          details: data,
        };
    }
  }

  // Non-axios errors
  const fallbackMessage =
    error instanceof Error && error.message
      ? error.message
      : defaultMessage;

  return {
    message: fallbackMessage,
    code: 'UNKNOWN_ERROR',
    details: error,
  };
}
