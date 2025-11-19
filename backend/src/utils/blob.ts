import { AbiCoder, getBytes, keccak256 } from "ethers";
import protobuf from "protobufjs";

type Uint8ArrayLike = Uint8Array | Buffer;

const abiCoder = AbiCoder.defaultAbiCoder();
const protoDescriptor = {
  nested: {
    common: {
      options: {
        go_package: "github.com/Layr-Labs/eigenda/api/grpc/common"
      },
      nested: {
        v2: {
          options: {
            go_package: "github.com/Layr-Labs/eigenda/api/grpc/common/v2"
          },
          nested: {
            BlobHeader: {
              fields: {
                version: { type: "uint32", id: 1 },
                quorumNumbers: { rule: "repeated", type: "uint32", id: 2 },
                commitment: { type: "common.BlobCommitment", id: 3 },
                paymentHeader: { type: "PaymentHeader", id: 4 }
              }
            },
            BlobCertificate: {
              fields: {
                blobHeader: { type: "BlobHeader", id: 1 },
                signature: { type: "bytes", id: 2 },
                relayKeys: { rule: "repeated", type: "uint32", id: 3 }
              }
            },
            BatchHeader: {
              fields: {
                batchRoot: { type: "bytes", id: 1 },
                referenceBlockNumber: { type: "uint64", id: 2 }
              }
            },
            Batch: {
              fields: {
                header: { type: "BatchHeader", id: 1 },
                blobCertificates: { rule: "repeated", type: "BlobCertificate", id: 2 }
              }
            },
            PaymentHeader: {
              fields: {
                accountId: { type: "string", id: 1 },
                timestamp: { type: "int64", id: 2 },
                cumulativePayment: { type: "bytes", id: 3 }
              }
            }
          }
        },
        G1Commitment: {
          fields: {
            x: { type: "bytes", id: 1 },
            y: { type: "bytes", id: 2 }
          }
        },
        BlobCommitment: {
          fields: {
            commitment: { type: "bytes", id: 1 },
            lengthCommitment: { type: "bytes", id: 2 },
            lengthProof: { type: "bytes", id: 3 },
            length: { type: "uint32", id: 4 }
          }
        }
      }
    }
  }
};

const protoRoot = protobuf.Root.fromJSON(protoDescriptor as protobuf.INamespace);
const blobCertificateType = protoRoot.lookupType("common.v2.BlobCertificate");

function toHex(bytes: Uint8ArrayLike): string {
  return Buffer.from(bytes).toString("hex");
}

function bytesToBigInt(bytes: Uint8ArrayLike): bigint {
  const hex = toHex(bytes);
  if (!hex) {
    return BigInt(0);
  }
  return BigInt(`0x${hex}`);
}

function normalizeAddress(addr: string | undefined | null): string {
  if (!addr) return "0x0000000000000000000000000000000000000000";
  return addr.startsWith("0x") ? addr.toLowerCase() : `0x${addr.toLowerCase()}`;
}

function normalizeTimestamp(value: number | protobuf.Long | string | undefined): bigint {
  if (value === undefined || value === null) return BigInt(0);
  if (typeof value === "string") {
    return BigInt(value);
  }
  if (typeof value === "number") {
    return BigInt(value);
  }
  return BigInt(value.toString());
}

function splitFp2(bytes: Uint8ArrayLike): { a0: bigint; a1: bigint } {
  const buffer = Buffer.from(bytes);
  if (buffer.length !== 64) {
    throw new Error("Invalid FP2 byte length");
  }
  const a0 = bytesToBigInt(buffer.subarray(0, 32));
  const a1 = bytesToBigInt(buffer.subarray(32, 64));
  return { a0, a1 };
}

const toEthereumFp2 = ({ a0, a1 }: { a0: bigint; a1: bigint }): [bigint, bigint] => [a1, a0];

function parseCertificate(bytes: Uint8Array): protobuf.Message {
  return blobCertificateType.decode(bytes);
}

function encodePaymentMetadataHash(paymentHeader: any): string {
  const accountId = normalizeAddress(paymentHeader?.accountId);
  const timestamp = normalizeTimestamp(paymentHeader?.timestamp);
  const cumulativePaymentBytes: Uint8ArrayLike = paymentHeader?.cumulativePayment
    ? Buffer.from(paymentHeader.cumulativePayment)
    : Buffer.alloc(0);
  const cumulativePayment = bytesToBigInt(cumulativePaymentBytes);

  const encoded = abiCoder.encode(
    ["tuple(string accountID,int64 timestamp,uint256 cumulativePayment)"],
    [[accountId, timestamp, cumulativePayment]]
  );

  return keccak256(encoded);
}

function encodeBlobHeaderHash(blobHeader: any): [string, string] {
  if (!blobHeader?.commitment) {
    throw new Error("Blob header missing commitment data");
  }

  const version = Number(blobHeader.version ?? 0);
  const quorumNumbers: number[] = Array.isArray(blobHeader.quorumNumbers)
    ? [...blobHeader.quorumNumbers]
    : [];
  quorumNumbers.sort((a, b) => a - b);
  const quorumBytes = Uint8Array.from(quorumNumbers.map((q) => q & 0xff));

  const commitmentBytes = Buffer.from(blobHeader.commitment.commitment ?? []);
  if (commitmentBytes.length !== 64) {
    throw new Error("Invalid commitment byte length");
  }
  const g1X = bytesToBigInt(commitmentBytes.subarray(0, 32));
  const g1Y = bytesToBigInt(commitmentBytes.subarray(32, 64));

  const lengthCommitmentBytes = Buffer.from(blobHeader.commitment.lengthCommitment ?? []);
  const lengthProofBytes = Buffer.from(blobHeader.commitment.lengthProof ?? []);

  if (lengthCommitmentBytes.length !== 128 || lengthProofBytes.length !== 128) {
    throw new Error("Invalid length commitment/proof byte length");
  }

  const lenCommitX = toEthereumFp2(splitFp2(lengthCommitmentBytes.subarray(0, 64)));
  const lenCommitY = toEthereumFp2(splitFp2(lengthCommitmentBytes.subarray(64, 128)));
  const lenProofX = toEthereumFp2(splitFp2(lengthProofBytes.subarray(0, 64)));
  const lenProofY = toEthereumFp2(splitFp2(lengthProofBytes.subarray(64, 128)));

  const innerEncoded = abiCoder.encode(
    [
      "uint16",
      "bytes",
      "tuple(tuple(uint256,uint256),tuple(uint256[2],uint256[2]),tuple(uint256[2],uint256[2]),uint32)"
    ],
    [
      version,
      quorumBytes,
      [
        [g1X, g1Y],
        [lenCommitX, lenCommitY],
        [lenProofX, lenProofY],
        Number(blobHeader.commitment.length ?? 0)
      ]
    ]
  );

  const headerHash = keccak256(innerEncoded);
  const paymentHash = encodePaymentMetadataHash(blobHeader.paymentHeader);

  return [headerHash, paymentHash];
}

/**
 * Compute a blob key from an EigenDA blob certificate by parsing the BlobHeader
 * and re-encoding it to mirror the EigenDA hashing rules (header hash +
 * payment metadata hash).
 */
export function computeBlobKeyFromCertificate(certificateBytes: Uint8Array | string): string {
  const normalized = typeof certificateBytes === "string"
    ? getBytes(certificateBytes.startsWith("0x") ? certificateBytes : `0x${certificateBytes}`)
    : certificateBytes;

  const decoded = parseCertificate(normalized);
  const blobHeader = (decoded as any).blobHeader;
  if (!blobHeader) {
    throw new Error("Blob certificate missing blob header");
  }

  const [headerHash, paymentHash] = encodeBlobHeaderHash(blobHeader);

  const blobKeyEncoded = abiCoder.encode(
    ["tuple(bytes32 blobHeaderHash,bytes32 paymentMetadataHash)"],
    [[headerHash, paymentHash]]
  );

  return keccak256(blobKeyEncoded);
}
