-- Add username field to accounts table
-- This allows users to have custom usernames for prettier profile URLs
-- Username should be unique and can be null initially

ALTER TABLE accounts ADD COLUMN username TEXT;

-- Create unique index on username (only for non-null values)
CREATE UNIQUE INDEX idx_accounts_username ON accounts(username) WHERE username IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_accounts_username_lookup ON accounts(username);