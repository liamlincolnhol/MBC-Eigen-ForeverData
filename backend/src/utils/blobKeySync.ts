import { eigenDADataApiConfig } from "../config.js";
import { fetchAccountBlobs } from "./dataApi.js";
import type { AccountBlob } from "../types/dataApi.js";
import {
  getFilesMissingBlobKey,
  setFileBlobKey
} from "../db.js";

type FileRecord = {
  fileId: string;
  createdAt: string;
  fileSize?: number | null;
  payerAddress?: string | null;
};

const normalizeAddress = (value?: string | null) =>
  typeof value === 'string' ? value.toLowerCase() : undefined;

/**
 * Attempt to pair blobs from EigenDA Data API with local files that are missing blobKey.
 * Matching heuristic:
 *   1) Only consider blobs that include blob_key.
 *   2) If blob_size_bytes is present, prefer files with identical size.
 *   3) Prefer files whose payerAddress matches the blob account (if present).
 *   4) Break ties by closest createdAt timestamp to requested_at from the feed.
 */
function findAssignments(blobs: AccountBlob[], files: FileRecord[]) {
  const assignments: { fileId: string; blobKey: string }[] = [];
  const usedFiles = new Set<string>();

  for (const blob of blobs) {
    const blobKey = blob.blobKey;
    if (!blobKey) continue;

    const blobSize = blob.blobMetadata?.blobSizeBytes;
    const blobAccount = normalizeAddress(blob.accountId);
    const requestedAtNs = blob.blobMetadata?.requestedAt;
    const requestedAtMs = typeof requestedAtNs === 'number' ? Math.floor(requestedAtNs / 1_000_000) : undefined;

    let candidates = files.filter((file) => !usedFiles.has(file.fileId));

    if (blobAccount) {
      candidates = candidates.filter((file) => {
        const payer = normalizeAddress(file.payerAddress);
        return !payer || payer === blobAccount;
      });
    }

    if (typeof blobSize === 'number') {
      const sizeMatches = candidates.filter((file) => typeof file.fileSize === 'number' && file.fileSize === blobSize);
      if (sizeMatches.length > 0) {
        candidates = sizeMatches;
      }
    }

    if (candidates.length === 0) {
      continue;
    }

    candidates.sort((a, b) => {
      if (!requestedAtMs) return 0;
      const aDiff = Math.abs(requestedAtMs - new Date(a.createdAt).getTime());
      const bDiff = Math.abs(requestedAtMs - new Date(b.createdAt).getTime());
      return aDiff - bDiff;
    });

    const chosen = candidates[0];
    assignments.push({ fileId: chosen.fileId, blobKey });
    usedFiles.add(chosen.fileId);
  }

  return assignments;
}

export async function syncBlobKeysForAccount(explicitAccountId?: string) {
  const accountId = explicitAccountId || eigenDADataApiConfig.defaultAccountId;
  if (!accountId) {
    console.warn('EigenDA blobKey sync skipped: no account ID configured');
    return;
  }

  const [filesMissingBlobKey, blobFeed] = await Promise.all([
    getFilesMissingBlobKey(accountId),
    fetchAccountBlobs({
      accountId,
      limit: 50,
      direction: 'backward'
    })
  ]);

  if (!Array.isArray(blobFeed.blobs) || filesMissingBlobKey.length === 0) {
    return;
  }

  const assignments = findAssignments(blobFeed.blobs, filesMissingBlobKey);

  for (const assignment of assignments) {
    try {
      await setFileBlobKey(assignment.fileId, assignment.blobKey);
      console.log(`Bound blobKey ${assignment.blobKey} to file ${assignment.fileId}`);
    } catch (err) {
      console.error(`Failed to set blobKey for file ${assignment.fileId}:`, err);
    }
  }
}
