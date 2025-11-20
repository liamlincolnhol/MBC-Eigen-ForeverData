-- Add index on payerAddress for fast wallet-based filtering
CREATE INDEX IF NOT EXISTS idx_files_payer ON files(payerAddress);

-- Normalize all existing addresses to lowercase for consistent matching
UPDATE files SET payerAddress = LOWER(payerAddress) WHERE payerAddress IS NOT NULL;
