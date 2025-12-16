export interface BlobCommitments {
  commitment?: string;
  lengthCommitment?: string;
  lengthProof?: string;
  length?: number;
}

export interface BlobPaymentMetadata {
  accountId?: string;
  timestamp?: number;
  cumulativePayment?: string;
}

export interface BlobHeader {
  blobVersion?: number;
  blobCommitments?: BlobCommitments;
  quorumNumbers?: number[];
  paymentMetadata?: BlobPaymentMetadata;
}

export interface BlobMetadata {
  blobHeader?: BlobHeader;
  signature?: string;
  blobStatus?: string;
  blobSizeBytes?: number;
  requestedAt?: number;
  expiryUnixSec?: number;
}

export interface AccountBlob {
  blobId?: string;
  blobKey?: string;
  accountId?: string;
  commitment?: string;
  txHash?: string;
  status?: string;
  blockNumber?: number;
  slot?: number;
  length?: number;
  submittedAt?: string;
  confirmedAt?: string;
  blobMetadata?: BlobMetadata;
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
