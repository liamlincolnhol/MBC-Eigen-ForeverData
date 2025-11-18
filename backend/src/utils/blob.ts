import { keccak256 } from "ethers";

/**
 * Compute a blob key from an EigenDA blob certificate.
 *
 * The blob key is defined as the keccak256 hash of the blob header; the
 * certificate bytes we receive from the disperser wrap that header, so we
 * hash the full certificate payload to derive the same 32-byte identifier.
 */
export function computeBlobKeyFromCertificate(certificateBytes: Uint8Array): string {
  return keccak256(certificateBytes);
}
