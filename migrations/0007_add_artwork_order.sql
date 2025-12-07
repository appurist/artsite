-- Add artwork order storage
-- This stores the custom order of artworks for each user's gallery

CREATE TABLE IF NOT EXISTS artwork_order (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  account_id TEXT NOT NULL,
  artwork_ids TEXT NOT NULL, -- JSON array of artwork IDs in order
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Create unique index to ensure one order record per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_artwork_order_account ON artwork_order(account_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artwork_order_updated ON artwork_order(updated_at);