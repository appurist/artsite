-- Add original_url column to artworks table for full-resolution images
-- This supports the Cloudflare Images optimization implementation

ALTER TABLE artworks ADD COLUMN original_url TEXT;