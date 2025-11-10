# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

artsite is a modern art portfolio application with a Cloudflare Workers backend and SolidJS frontend. It features multi-tenant gallery support, user authentication, image management, and customizable themes.

**Architecture**: Serverless full-stack with Cloudflare Workers (API), D1 SQLite (database), R2 (image storage), and SolidJS frontend deployed as static assets.

## Development Commands

**Start development servers:**
```bash
pnpm dev          # Frontend (port 5173)
pnpm dev:backend  # Backend API (port 8787)
```

**Build and deploy:**
```bash
pnpm build                  # Build frontend for production
pnpm deploy:dev            # Deploy to development environment
pnpm deploy:prod           # Deploy to production environment
```

**Database operations:**
```bash
# Apply migrations
wrangler d1 execute artsite-dev --file=migrations/0001_initial.sql --env=development
wrangler d1 execute artsite-prod --file=migrations/0001_initial.sql --env=production

# NEVER run the 0000_drop.sql migration without explicit confirmation!
```

**Process management:**
```bash
.\status.cmd      # Check if frontend/backend servers are running
.\kill.cmd        # Stop all development servers
```

## Architecture Overview

**Frontend (SolidJS SPA):**
- `src/main.js` - Main application with client-side routing and vanilla JS
- `src/api.js` - API client for backend communication
- Client-side routing handles: `/`, `/@userId`, `/art`, `/art/upload`, `/art/:id`, `/site`, `/profile`, `/login`, `/register`, `/about`

**Backend (Cloudflare Workers):**
- `workers/index.js` - Main worker with request routing
- `workers/shared/` - Shared utilities (auth, CORS, DB, storage)
- API endpoints: `/api/auth/*`, `/api/artworks/*`, `/api/profile/*`, `/api/settings/*`, `/api/upload/*`, `/api/backup/*`

**Database (D1 SQLite):**
- Tables: `accounts`, `artworks`, `profiles`, `settings`
- Migrations in `migrations/` directory

**Storage (R2):**
- Bucket: `artsite-images`
- Automatic thumbnail generation
- User-specific file organization

## Key Features

**Multi-tenant gallery support:**
- Focus mode: Single user galleries on custom domains (e.g., viktoriasart.ca)
- Main site: Multi-user gallery at artsite.ca

**Authentication:**
- JWT-based with custom implementation
- User registration/login with email/password
- Session management via localStorage

**Image management:**
- Upload to R2 with automatic thumbnailing
- Metadata storage in D1 database
- Backup/restore functionality

## Important Notes

- Do not call the project "Art Gallery" anywhere - use "artsite" for code, "artsite.ca" for user-facing references
- Never run the `@migrations\0000_drop.sql` migration without asking for confirmation!
- Always specify `--env=production` for production wrangler commands to avoid warnings
- Icons are saved as .svg files and referenced via `<img>` tags
- Use pnpm as the package manager throughout
- Both frontend and backend have separate package.json files and node_modules

## Configuration Files

- `wrangler.toml` - Cloudflare Workers configuration with environment-specific settings
- `vite.config.js` - Frontend build configuration
- Environment variables are set in wrangler.toml under `[vars]` sections

## Testing and Deployment

- No formal test framework is currently configured
- Manual testing via development servers
- Production deployment requires confirmation for safety
- Development environment can be deployed for bug fixes without confirmation
- We cannot store API keys on git-tracked files, as some repos are public!!! This repo is public. The Images API token must be stored outside git.