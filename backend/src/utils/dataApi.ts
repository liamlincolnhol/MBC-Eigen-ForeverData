import fetch from "node-fetch";
import { eigenDADataApiConfig } from "../config.js";
import type {
  AccountBlobResponse,
  FetchAccountBlobParams,
  AccountBlob,
  AccountBlobPagination
} from "../types/dataApi.js";

const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

const sanitizeLimit = (limit: number): number => {
  if (!Number.isFinite(limit) || limit <= 0) {
    return eigenDADataApiConfig.defaultLimit;
  }
  return Math.min(Math.floor(limit), eigenDADataApiConfig.maxLimit);
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return undefined;
};

const extractEntryArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (isRecord(payload)) {
    if (Array.isArray(payload.blobs)) {
      return payload.blobs;
    }
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (Array.isArray(payload.items)) {
      return payload.items;
    }
  }

  return [];
};

const extractPagination = (payload: unknown): AccountBlobPagination | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const candidate = [payload.pagination, payload.page, payload.meta]
    .find((entry): entry is Record<string, any> => isRecord(entry));

  if (candidate) {
    return {
      nextBefore: (candidate.next_before ?? candidate.nextBefore ?? null) as string | number | null,
      nextAfter: (candidate.next_after ?? candidate.nextAfter ?? null) as string | number | null,
      total: toNumber(candidate.total)
    };
  }

  const nextBefore = (payload.next_before ?? payload.nextBefore) as string | number | null | undefined;
  const nextAfter = (payload.next_after ?? payload.nextAfter) as string | number | null | undefined;
  const total = toNumber(payload.total);

  if (nextBefore || nextAfter || typeof total === 'number') {
    return {
      nextBefore: nextBefore ?? null,
      nextAfter: nextAfter ?? null,
      total
    };
  }

  return undefined;
};

const normalizeAccountBlob = (entry: unknown, fallbackAccountId: string): AccountBlob => {
  if (!isRecord(entry)) {
    return {
      accountId: fallbackAccountId,
      raw: {}
    };
  }

  const embeddedBlob = isRecord(entry.blob) ? entry.blob : undefined;

  return {
    blobId: toStringValue(entry.blobId ?? entry.blob_id ?? entry.id ?? embeddedBlob?.id),
    accountId: toStringValue(entry.accountId ?? entry.account_id ?? entry.owner ?? fallbackAccountId),
    commitment: toStringValue(entry.commitment ?? entry.blobCommitment ?? entry.blob_commitment ?? embeddedBlob?.commitment),
    txHash: toStringValue(entry.txHash ?? entry.tx_hash ?? entry.transactionHash ?? entry.transaction_hash),
    status: toStringValue(entry.status ?? entry.blob_status ?? entry.blobStatus),
    blockNumber: toNumber(entry.blockNumber ?? entry.block_number ?? entry.blockHeight ?? entry.block),
    slot: toNumber(entry.slot ?? entry.slotNumber),
    length: toNumber(entry.length ?? entry.size ?? entry.blob_length ?? entry.totalSize ?? entry.total_length),
    submittedAt: toStringValue(entry.submittedAt ?? entry.submitted_at ?? entry.createdAt ?? entry.created_at ?? entry.timestamp),
    confirmedAt: toStringValue(entry.confirmedAt ?? entry.confirmed_at ?? entry.finalizedAt ?? entry.finalized_at),
    raw: entry
  };
};

const normalizeResponse = (payload: unknown, accountId: string): AccountBlobResponse => {
  const entries = extractEntryArray(payload);
  const blobs = entries.map((entry) => normalizeAccountBlob(entry, accountId));
  const pagination = extractPagination(payload);

  return {
    accountId,
    blobs,
    pagination
  };
};

export async function fetchAccountBlobs(params: FetchAccountBlobParams): Promise<AccountBlobResponse> {
  const direction = params.direction ?? eigenDADataApiConfig.defaultDirection;
  const limit = sanitizeLimit(params.limit ?? eigenDADataApiConfig.defaultLimit);
  const url = new URL(`${eigenDADataApiConfig.baseUrl}/accounts/${params.accountId}/blobs`);

  url.searchParams.set('direction', direction);
  url.searchParams.set('limit', limit.toString());

  if (params.before) {
    url.searchParams.set('before', params.before);
  }

  if (params.after) {
    url.searchParams.set('after', params.after);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), eigenDADataApiConfig.timeout);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EigenDA Data API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const payload = await response.json();
    return normalizeResponse(payload, params.accountId);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('EigenDA Data API request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
