CREATE TABLE IF NOT EXISTS files (
    fileId TEXT PRIMARY KEY,
    fileName TEXT NOT NULL,
    hash TEXT NOT NULL,
    blobId TEXT NOT NULL,         -- Full certificate for retrieval
    blobKey TEXT,                 -- Extracted blob key for explorer
    expiry TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    fileSize INTEGER,    -- File size in bytes for cost calculation
    paymentStatus TEXT CHECK(paymentStatus IN ('pending', 'paid', 'insufficient', 'expired')) DEFAULT 'pending',
    payerAddress TEXT,
    paymentAmount TEXT,  -- Amount in Wei (stored as string to handle large numbers)
    paymentTxHash TEXT,
    lastBalanceCheck TEXT,  -- Timestamp of last contract balance check
    contractBalance TEXT    -- Current balance in Wei (stored as string)
);

-- Track payment transactions
CREATE TABLE IF NOT EXISTS payments (
    txHash TEXT PRIMARY KEY,
    fileId TEXT NOT NULL,
    payerAddress TEXT NOT NULL,
    amount TEXT NOT NULL,  -- Amount in Wei
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('pending', 'confirmed', 'failed')) DEFAULT 'pending',
    type TEXT CHECK(type IN ('deposit', 'refresh', 'withdrawal')) NOT NULL,
    FOREIGN KEY (fileId) REFERENCES files(fileId)
);