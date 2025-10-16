# ForeverData Refresh Job

A scheduled service that keeps files from expiring on EigenDA by periodically refreshing their storage.

## Overview

This service monitors files stored in EigenDA and automatically refreshes them before they expire. It maintains permanent file availability while preserving stable file IDs and links.

## Features

- Automatically identifies files nearing expiry (within 24 hours)
- Downloads and verifies file integrity using SHA-256 hash
- Re-uploads files to EigenDA to refresh their storage
- Updates database with new blob IDs while maintaining stable file IDs
- Runs every 4 hours using node-cron scheduling
- Includes error handling and logging

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- `EIGENDA_AUTH_PK`: Your EigenDA authentication private key
- `EIGENDA_ETH_ADDRESS`: Your Ethereum address
- `EIGENDA_PROXY_SEPOLIA`: URL of your EigenDA proxy

## Running the Service

Start the refresh job:
```bash
node src/refresh.js
```

The service will:
- Run an initial refresh check on startup
- Schedule automatic checks every 4 hours (at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
- Log all actions and any errors for monitoring

## How It Works

1. The service queries the database for files expiring within 24 hours
2. For each expiring file:
   - Downloads the blob from EigenDA
   - Verifies the file hash matches the stored hash
   - Re-uploads the blob to get a new certificate
   - Updates the database with the new blob ID
3. The original file ID remains unchanged, keeping permanent links stable

## Error Handling

- Network timeouts are handled with AbortController
- Failed refreshes are logged and retried on the next scheduled run
- Hash mismatches are detected and logged
- Database connection issues are handled gracefully

## Monitoring

The service logs:
- Start/completion of each refresh cycle
- Number of files checked
- Individual file processing status
- Any errors or issues encountered

## Project Structure

```
refresh-job/
├── src/                    # Source code
│   └── refresh.ts         # Main refresh job logic
├── config/                 # Configuration
│   └── default.json       # Default settings
├── package.json           # Project dependencies
└── README.md             # Documentation
```

## Dependencies

- node-cron: Scheduling
- node-fetch: HTTP requests
- crypto: Hash verification
