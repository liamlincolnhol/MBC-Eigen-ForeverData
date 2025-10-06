import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { StatusLevel, FileStatus } from './types';

// Format file size from bytes to human-readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Calculate time until expiry and return countdown string
export function getTimeUntilExpiry(expiryDate: string): string {
  try {
    const expiry = parseISO(expiryDate);
    const now = new Date();
    
    if (expiry <= now) {
      return 'Expired';
    }
    
    return formatDistanceToNow(expiry, { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
}

// Get status level based on days remaining until expiry
export function getStatusLevel(expiryDate: string): StatusLevel {
  try {
    const expiry = parseISO(expiryDate);
    const now = new Date();
    const daysRemaining = differenceInDays(expiry, now);
    
    if (daysRemaining <= 0) return 'critical';
    if (daysRemaining <= 3) return 'critical';
    if (daysRemaining <= 7) return 'warning';
    return 'healthy';
  } catch (error) {
    return 'critical';
  }
}

// Get complete file status information
export function getFileStatus(expiryDate: string): FileStatus {
  try {
    const expiry = parseISO(expiryDate);
    const now = new Date();
    const daysRemaining = differenceInDays(expiry, now);
    
    return {
      level: getStatusLevel(expiryDate),
      timeUntilExpiry: getTimeUntilExpiry(expiryDate),
      daysRemaining: Math.max(0, daysRemaining),
    };
  } catch (error) {
    return {
      level: 'critical',
      timeUntilExpiry: 'Invalid date',
      daysRemaining: 0,
    };
  }
}

// Format date for display (e.g., "Oct 6, 2023 at 2:30 PM")
export function formatDisplayDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return 'Invalid date';
  }
}

// Format relative time for display (e.g., "2 days ago")
export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
}

// Copy text to clipboard with fallback
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// Get CSS classes for status badge based on level
export function getStatusBadgeClasses(level: StatusLevel): string {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  switch (level) {
    case 'healthy':
      return `${baseClasses} bg-green-100 text-green-800`;
    case 'warning':
      return `${baseClasses} bg-yellow-100 text-yellow-800`;
    case 'critical':
      return `${baseClasses} bg-red-100 text-red-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
}

// Get human-readable status text
export function getStatusText(level: StatusLevel): string {
  switch (level) {
    case 'healthy':
      return 'Healthy';
    case 'warning':
      return 'Expires Soon';
    case 'critical':
      return 'Expired/Critical';
    default:
      return 'Unknown';
  }
}

// Truncate long file names for display
export function truncateFileName(fileName: string, maxLength: number = 30): string {
  if (fileName.length <= maxLength) return fileName;
  
  const extension = fileName.split('.').pop() || '';
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  
  if (extension && nameWithoutExt.length > maxLength - extension.length - 4) {
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4);
    return `${truncatedName}...${extension}`;
  }
  
  return fileName.substring(0, maxLength - 3) + '...';
}