-- Initial database schema for artsite.ca
-- SQLite/D1 compatible

-- Accounts table for authentication (JSON-based with promoted email field)
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL, -- Promoted field for efficient lookups
    record TEXT NOT NULL -- JSON object containing all account data except email
);

-- Create index for email lookups (automatically created due to UNIQUE constraint)
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

-- Verifications table for short-lived tokens
CREATE TABLE IF NOT EXISTS verifications (
    account_id TEXT NOT NULL,
    token_type TEXT NOT NULL, -- 'email_verification', 'password_reset'
    token_value TEXT NOT NULL,
    expires_at DATETIME, -- For tokens that expire (like password reset)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, token_type)
);

CREATE INDEX IF NOT EXISTS idx_verifications_token_value ON verifications(token_value);

-- Profiles table for artist information (JSON-based)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY, -- Same as account_id, references accounts.id
    public_profile BOOLEAN DEFAULT TRUE, -- Promoted field for efficient filtering
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Promoted field for efficient ordering
    record TEXT NOT NULL -- JSON object containing all profile data
);

-- Artworks table for gallery pieces
CREATE TABLE IF NOT EXISTS artworks (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    medium TEXT,
    dimensions TEXT,
    year_created INTEGER,
    price TEXT,
    tags TEXT,  -- JSON array stored as text
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    storage_path TEXT,
    file_size INTEGER,
    image_width INTEGER,
    image_height INTEGER,
    status TEXT DEFAULT 'published', -- published, draft, archived
    featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for artworks
CREATE INDEX IF NOT EXISTS idx_artworks_account_id ON artworks(account_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status);
CREATE INDEX IF NOT EXISTS idx_artworks_featured ON artworks(featured);
CREATE INDEX IF NOT EXISTS idx_artworks_created_at ON artworks(created_at);

-- Settings table for user preferences
CREATE TABLE IF NOT EXISTS settings (
    account_id TEXT PRIMARY KEY,
    settings TEXT NOT NULL, -- JSON object stored as text
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table (optional - for organizing artworks)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Artwork categories junction table
CREATE TABLE IF NOT EXISTS artwork_categories (
    artwork_id TEXT,
    category_id TEXT,
    PRIMARY KEY (artwork_id, category_id)
);

-- Views/analytics table (for tracking artwork views)
CREATE TABLE IF NOT EXISTS artwork_views (
    id TEXT PRIMARY KEY,
    artwork_id TEXT NOT NULL,
    viewer_ip TEXT,
    user_agent TEXT,
    referrer TEXT,
    country TEXT,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_artwork_views_artwork_id ON artwork_views(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_views_viewed_at ON artwork_views(viewed_at);

-- Comments table (for future feature)
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    artwork_id TEXT NOT NULL,
    account_id TEXT,
    author_name TEXT,
    author_email TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, spam
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_artwork_id ON comments(artwork_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
