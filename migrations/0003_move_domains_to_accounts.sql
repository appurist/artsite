-- Move domain mapping from separate domains table to accounts table
-- This ensures no orphan records and simplifies the data model

-- First, add the focus_domain column to accounts table
ALTER TABLE accounts ADD COLUMN focus_domain TEXT;

-- Create a unique index on focus_domain for fast lookups and to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_focus_domain ON accounts(focus_domain);

-- Migrate any existing data from domains table to accounts table
-- (This will fail silently if domains table doesn't exist or has no data)
UPDATE accounts 
SET focus_domain = (
    SELECT hostname 
    FROM domains 
    WHERE domains.focus_user_id = accounts.id
    LIMIT 1
) 
WHERE EXISTS (
    SELECT 1 
    FROM domains 
    WHERE domains.focus_user_id = accounts.id
);

-- Drop the domains table since we no longer need it
-- (This will fail silently if table doesn't exist)
DROP TABLE IF EXISTS domains;