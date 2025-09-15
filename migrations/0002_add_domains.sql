-- Add domains table for multi-tenant functionality
-- Each domain can have a default focus user (account_id) whose artworks are featured

CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    hostname TEXT UNIQUE NOT NULL, -- The domain hostname (e.g. "viktoriasart.ca") - promoted for indexing
    focus_user_id TEXT NOT NULL,   -- Account ID of the user to focus on for this domain - promoted for indexing
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Promoted field for efficient ordering
    record TEXT NOT NULL -- JSON object containing all domain configuration data
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_domains_hostname ON domains(hostname);
CREATE INDEX IF NOT EXISTS idx_domains_focus_user_id ON domains(focus_user_id);