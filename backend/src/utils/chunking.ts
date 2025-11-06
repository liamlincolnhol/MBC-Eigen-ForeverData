const BYTES_PER_MEBIBYTE = 1024 * 1024;

export const EIGENDA_BLOB_BUCKETS_MIB = [1, 2, 4, 8, 16] as const;
export const EIGENDA_BLOB_BUCKETS_BYTES = EIGENDA_BLOB_BUCKETS_MIB.map(
  size => size * BYTES_PER_MEBIBYTE
);

export const MIN_CHUNK_SIZE_BYTES = EIGENDA_BLOB_BUCKETS_BYTES[0];
export const MAX_CHUNK_SIZE_BYTES =
  EIGENDA_BLOB_BUCKETS_BYTES[EIGENDA_BLOB_BUCKETS_BYTES.length - 1];

/**
 * Determine the EigenDA blob bucket size (in bytes) to use for a given file size.
 * Uses a greedy strategy: pick the smallest bucket that can fit the remaining bytes,
 * falling back to the largest bucket when the file exceeds all configured buckets.
 */
export function resolveChunkSize(fileSize: number): number {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return MIN_CHUNK_SIZE_BYTES;
  }

  for (const bucket of EIGENDA_BLOB_BUCKETS_BYTES) {
    if (fileSize <= bucket) {
      return bucket;
    }
  }

  return MAX_CHUNK_SIZE_BYTES;
}

/**
 * Calculate chunk count using the provided chunk size. If chunkSize is omitted,
 * resolves the bucket size using resolveChunkSize.
 */
export function calculateChunkCount(
  fileSize: number,
  chunkSize?: number
): number {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return 0;
  }

  const effectiveChunkSize =
    typeof chunkSize === 'number' && chunkSize > 0
      ? chunkSize
      : resolveChunkSize(fileSize);

  return Math.max(1, Math.ceil(fileSize / effectiveChunkSize));
}

/**
 * Check if the provided chunk size matches one of the supported EigenDA buckets.
 */
export function isSupportedChunkSize(size: number): boolean {
  return EIGENDA_BLOB_BUCKETS_BYTES.includes(size);
}
