# EigenDA Proxy V2 Docker Setup Guide

Complete guide for setting up and running EigenDA Proxy V2 on Sepolia testnet using Docker.

## Prerequisites

- Docker installed on your system
- Git installed
- A valid Ethereum private key for Sepolia testnet payments

### Environment File Structure

The `.env.example` file contains all configuration options with placeholder values:
```bash
# EigenDA Proxy V2 Configuration for Sepolia Testnet

# === APIs to Enable ===
EIGENDA_PROXY_APIS_TO_ENABLE=op-generic,standard,metrics

# === Storage Configuration ===
EIGENDA_PROXY_STORAGE_BACKENDS_TO_ENABLE=V2
EIGENDA_PROXY_STORAGE_DISPERSAL_BACKEND=V2

# === V2 Configuration (Sepolia Testnet) ===
# Your private key for payments (REQUIRED - replace with your actual key)
EIGENDA_PROXY_EIGENDA_V2_SIGNER_PRIVATE_KEY_HEX=your_private_key_here

# Ethereum RPC for Sepolia testnet
EIGENDA_PROXY_EIGENDA_V2_ETH_RPC=https://ethereum-sepolia.rpc.subquery.network/public

# EigenDA network - this sets defaults for disperser URL and contract addresses
EIGENDA_PROXY_EIGENDA_V2_NETWORK=sepolia_testnet

# Maximum blob length (adjust as needed)
EIGENDA_PROXY_EIGENDA_V2_MAX_BLOB_LENGTH=1MiB

# Contract address for certificate verification (Sepolia testnet)
EIGENDA_PROXY_EIGENDA_V2_CERT_VERIFIER_ROUTER_OR_IMMUTABLE_VERIFIER_ADDR=0x17ec4112c4BbD540E2c1fE0A49D264a280176F0D

# RBN recency window (set to 0 for testing, use proper value for production)
EIGENDA_PROXY_EIGENDA_V2_RBN_RECENCY_WINDOW_SIZE=0

# === Server Configuration ===
EIGENDA_PROXY_ADDR=0.0.0.0
EIGENDA_PROXY_PORT=3100

# === Logging and Metrics ===
EIGENDA_PROXY_LOG_LEVEL=info
EIGENDA_PROXY_METRICS_ENABLED=true
EIGENDA_PROXY_METRICS_ADDR=0.0.0.0
EIGENDA_PROXY_METRICS_PORT=7300

# === Disable Memstore (we want real testnet) ===
EIGENDA_PROXY_MEMSTORE_ENABLED=false
```

### Key Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `EIGENDA_PROXY_EIGENDA_V2_SIGNER_PRIVATE_KEY_HEX` | Your Ethereum private key for payments |
| `EIGENDA_PROXY_EIGENDA_V2_ETH_RPC` | Ethereum RPC endpoint | Sepolia public RPC |
| `EIGENDA_PROXY_EIGENDA_V2_NETWORK` | EigenDA network | `sepolia_testnet` |
| `EIGENDA_PROXY_PORT` | Proxy API port | `3100` |
| `EIGENDA_PROXY_METRICS_PORT` | Metrics port | `7300` |
| `EIGENDA_PROXY_EIGENDA_V2_MAX_BLOB_LENGTH` | Maximum blob size | `1MiB` |
| `EIGENDA_PROXY_LOG_LEVEL` | Logging level | `info` |

## Running EigenDA Proxy with Docker

### Build the Docker Image
```bash
docker build -t eigenda-proxy .
```

### Run the Docker Container
```bash
docker run -d \
  --name eigenda-proxy \
  --env-file .env \
  -p 3100:3100 \
  eigenda-proxy
```

### Verify the Container is Running
```bash
docker ps
docker logs eigenda-proxy
```