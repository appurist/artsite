-- Create image optimization queue table for background processing
CREATE TABLE IF NOT EXISTS image_optimization_queue (
  id TEXT PRIMARY KEY,
  artwork_id TEXT,
  account_id TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('artwork', 'avatar')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at DATETIME NOT NULL,
  processed_at DATETIME,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
);

-- Index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_image_queue_status_created ON image_optimization_queue (status, created_at);
CREATE INDEX IF NOT EXISTS idx_image_queue_account ON image_optimization_queue (account_id);