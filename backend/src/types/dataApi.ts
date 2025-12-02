export interface AccountBlob {
  blobId?: string;
  accountId?: string;
  commitment?: string;
  txHash?: string;
  status?: string;
  blockNumber?: number;
  slot?: number;
  length?: number;
  submittedAt?: string;
  confirmedAt?: string;
  raw: Record<string, unknown>;
}

export interface AccountBlobPagination {
  nextBefore?: string | number | null;
  nextAfter?: string | number | null;
  total?: number;
}

export interface AccountBlobResponse {
  accountId: string;
  blobs: AccountBlob[];
  pagination?: AccountBlobPagination;
}

export interface FetchAccountBlobParams {
  accountId: string;
  before?: string;
  after?: string;
  direction?: 'forward' | 'backward';
  limit?: number;
}
