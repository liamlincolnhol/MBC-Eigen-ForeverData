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
}

export interface AccountBlobResponse {
  accountId: string;
  blobs: AccountBlob[];
}
