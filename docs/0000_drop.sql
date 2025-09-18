-- Drop all existing tables to start fresh
-- This migration removes both old schema tables (users) and new schema tables (accounts)
-- to ensure a clean state before running 0001_initial.sql

-- Drop tables with foreign key dependencies first
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS artwork_categories;
DROP TABLE IF EXISTS artwork_views;

-- Drop main data tables
DROP TABLE IF EXISTS artworks;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS verifications;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS categories;

-- Drop authentication tables (both old and new schema)
DROP TABLE IF EXISTS accounts;  -- New schema
DROP TABLE IF EXISTS users;     -- Old schema (if it exists)

-- Drop any other legacy tables that might exist
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS password_resets;