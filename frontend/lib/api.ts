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
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);

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
function handleApiError(error: any, defaultMessage: string): ApiError {
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
  return {
    message: defaultMessage,
    code: 'UNKNOWN_ERROR',
    details: error.message || error,
  };
}