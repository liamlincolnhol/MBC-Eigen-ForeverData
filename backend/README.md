# ForeverData Backend

Backend service for ForeverData, handling file uploads, retrievals, and interactions with EigenDA.

## Overview

This Express.js backend service manages the core functionality of ForeverData:
- File uploads to EigenDA
- File retrievals and streaming
- Database management for file metadata
- Integration with EigenDA proxy

## API Endpoints

### POST `/upload`
Upload a new file to permanent storage.
- Accepts multipart form data with file
- Pads file to EigenDA requirements
- Generates permanent file ID
- Returns stable access link

### GET `/f/:fileId`
Retrieve a file by its permanent ID.
- Looks up blob ID from database
- Fetches latest blob from EigenDA
- Streams file directly to client
- Handles large files efficiently

### GET `/status`
Health check endpoint.
- Returns service status
- Used for monitoring

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
PORT=3000
EIGENDA_AUTH_PK=your_private_key
EIGENDA_ETH_ADDRESS=your_eth_address
EIGENDA_PROXY_SEPOLIA=https://your-proxy-url
```

3. Initialize database:
```bash
node init-db.js
```

4. Set up EigenDA Payment Vault:

You'll need ETH on Sepolia testnet to use EigenDA's Payment Module. Deposits into the Payment Vault are non-refundable.

First, install Foundry if you haven't:
- Follow installation instructions at [Foundry Book](https://book.getfoundry.sh/getting-started/installation)

Then deposit funds (example: 1 ETH) into the Payment Vault:
```bash
cast send --rpc-url <YOUR_RPC_URL> \
 --private-key <YOUR_PRIVATE_KEY> \
 0x2E1BDB221E7D6bD9B7b2365208d41A5FD70b24Ed \
 "depositOnDemand(address)" \
 <YOUR_ADDRESS> \
 --value 0.01ether
```

This sets up your account for on-demand payments, allowing you to disperse data to the network. The Payment Vault will be used for all EigenDA request charges.

For more details about EigenDA's Payment Module, check their [reference documentation](https://docs.eigenda.xyz/payment-module).

## Database Schema

```sql
CREATE TABLE files (
  fileId TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  blobId TEXT NOT NULL,
  expiry TEXT
);
```

## Project Structure

```
backend/
├── src/                    # Source code
│   ├── index.ts           # Main application entry
│   ├── db.ts              # Database operations
│   ├── eigendaClient.ts   # EigenDA proxy client
│   ├── fetch.ts           # File retrieval handling
│   ├── types.ts           # TypeScript types
│   └── upload.ts          # File upload handling
├── schema.sql             # Database schema
└── package.json           # Project dependencies
```

## Architecture

- Express.js web framework
- SQLite database for metadata
- EigenDA for permanent storage
- Streaming file handling
- TypeScript for type safety

## Error Handling

- Input validation
- EigenDA connection errors
- Database errors
- File processing errors
- Proper error responses

## Dependencies

- express: Web framework
- multer: File upload handling
- node-fetch: HTTP client
- sqlite3: Database
- ethers: Blockchain interaction
- form-data: Multipart form handling

## Development

Run the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Railway Deployment

To deploy on Railway, configure the service as follows:

1. **Root Directory**: Set to `/MBC-Eigen-ForeverData` (the parent directory).
2. **Build Command**: Use the following command to build the Go helper and Node backend:

```bash
cd blobkeyhelper && go mod download && go build -o ../bin/blobkeyhelper . && cd .. && npm ci && npm run build
```
