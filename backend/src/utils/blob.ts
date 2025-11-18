import { getBytes, keccak256 } from "ethers";

/**
 * Compute a blob key from an EigenDA blob certificate or blob header bytes.
 *
 * The blob key is defined as the keccak256 hash of the blob header (as
 * encoded by EigenDA). Certificates contain the header bytes; we normalize to
 * a byte array and hash so callers can pass either the raw certificate bytes
 * or a hex-encoded certificate/header string.
 */
export function computeBlobKeyFromCertificate(certificateBytes: Uint8Array | string): string {
  const normalized = typeof certificateBytes === 'string'
    ? getBytes(certificateBytes.startsWith('0x') ? certificateBytes : `0x${certificateBytes}`)
    : certificateBytes;

  return keccak256(normalized);
}
