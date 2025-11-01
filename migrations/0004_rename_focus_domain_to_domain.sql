-- Rename focus_domain column to domain for clearer naming
-- This simplifies the column name from "focus_domain" to just "domain"

-- SQLite doesn't support RENAME COLUMN directly, so we need to:
-- 1. Create new column with the desired name
-- 2. Copy data from old column to new column  
-- 3. Drop the old column
-- 4. Recreate the unique index with the new column name

-- Add the new 'domain' column
ALTER TABLE accounts ADD COLUMN domain TEXT;

-- Copy data from focus_domain to domain
UPDATE accounts SET domain = focus_domain WHERE focus_domain IS NOT NULL;

-- Drop the old unique index on focus_domain
DROP INDEX IF EXISTS idx_accounts_focus_domain;

-- Create unique index on the new domain column
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_domain ON accounts(domain);

-- Note: We can't drop the focus_domain column in SQLite without recreating the entire table
-- For now, we'll leave it but use the new 'domain' column going forward
-- The old column will be ignored and can be cleaned up in a future migration if needed