-- Initial database schema for artsite.ca
-- SQLite/D1 compatible

-- Users table for authentication (JSON-based)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    record TEXT NOT NULL -- JSON object containing all user data
);

-- Create indexes for common queries on JSON fields
CREATE INDEX IF NOT EXISTS idx_users_email ON users(json_extract(record, '$.email'));
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(json_extract(record, '$.email_verification_token'));
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(json_extract(record, '$.password_reset_token'));

-- Profiles table for artist information (JSON-based)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY, -- Same as user_id, references users.id
    record TEXT NOT NULL -- JSON object containing all profile data
);

-- Artworks table for gallery pieces
CREATE TABLE IF NOT EXISTS artworks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for artworks
CREATE INDEX IF NOT EXISTS idx_artworks_user_id ON artworks(user_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status);
CREATE INDEX IF NOT EXISTS idx_artworks_featured ON artworks(featured);
CREATE INDEX IF NOT EXISTS idx_artworks_created_at ON artworks(created_at);

-- Settings table for user preferences
CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    settings TEXT NOT NULL, -- JSON object stored as text
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
    PRIMARY KEY (artwork_id, category_id),
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Views/analytics table (for tracking artwork views)
CREATE TABLE IF NOT EXISTS artwork_views (
    id TEXT PRIMARY KEY,
    artwork_id TEXT NOT NULL,
    viewer_ip TEXT,
    user_agent TEXT,
    referrer TEXT,
    country TEXT,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_artwork_views_artwork_id ON artwork_views(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_views_viewed_at ON artwork_views(viewed_at);

-- Comments table (for future feature)
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    artwork_id TEXT NOT NULL,
    user_id TEXT,
    author_name TEXT,
    author_email TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, spam
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_artwork_id ON comments(artwork_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
