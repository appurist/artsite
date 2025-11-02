-- Remove the old focus_domain column by recreating the accounts table
-- This completes the rename from focus_domain to domain

-- Create new accounts table without focus_domain column
CREATE TABLE accounts_new (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    record TEXT NOT NULL,
    domain TEXT
);

-- Copy data from old table to new table
INSERT INTO accounts_new (id, email, record, domain)
SELECT id, email, record, domain FROM accounts;

-- Drop old table
DROP TABLE accounts;

-- Rename new table to accounts
ALTER TABLE accounts_new RENAME TO accounts;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_domain ON accounts(domain);