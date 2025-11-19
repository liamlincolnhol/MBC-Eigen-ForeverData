import { execFileSync } from "child_process";
import { getBytes } from "ethers";
import path from "path";

const helperPath =
  process.env.BLOB_KEY_HELPER_PATH ||
  path.join(process.cwd(), "bin", "blobkeyhelper");

/**
 * Compute a blob key from an EigenDA blob certificate by delegating to the Go
 * helper that understands the gob serialization used by the proxy.
 */
export function computeBlobKeyFromCertificate(
  certificateBytes: Uint8Array | string
): string {
  const normalized =
    typeof certificateBytes === "string"
      ? getBytes(
          certificateBytes.startsWith("0x")
            ? certificateBytes
            : `0x${certificateBytes}`
        )
      : certificateBytes;

  const certificateHex = Buffer.from(normalized).toString("hex");

  let output: string;
  try {
    output = execFileSync(helperPath, {
      input: certificateHex,
      encoding: "utf8",
      timeout: 30_000
    }).trim();
  } catch (error: any) {
    throw new Error(
      `Failed to compute blob key via helper: ${error?.message ?? error}`
    );
  }

  if (!output) {
    throw new Error("Blob key helper returned empty result");
  }

  return output.startsWith("0x") ? output : `0x${output}`;
}
