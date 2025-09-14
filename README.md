# artsite.ca

A modern, responsive art portfolio site built with Vite and deployed on Cloudflare Workers with full-stack serverless architecture.

## Features

- **Public Gallery**: Browse artworks in a responsive grid layout
- **Artwork Detail Pages**: Individual pages for each artwork with shareable URLs
- **User Registration**: Create admin accounts with email/password authentication  
- **Admin Dashboard**: Secure login to manage artworks and site settings
- **Upload System**: Upload artworks with metadata (title, description, medium, etc.) to R2 storage
- **Site Settings**: Configure gallery title, artist bio, contact information
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Artist Profiles**: User profiles with bio, website, and social links

## Tech Stack

- **Frontend**: Vite + Vanilla JavaScript (SPA with client-side routing)
- **Backend**: Cloudflare Workers (serverless API)
- **Database**: Cloudflare D1 (SQLite-based)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **Auth**: Custom JWT-based authentication
- **Hosting**: Cloudflare Workers with integrated static assets
- **Styling**: CSS with custom properties for theming

## Development

### Prerequisites

- Node.js 18+
- pnpm package manager
- Cloudflare account with Workers, D1, and R2 access
- Wrangler CLI installed globally: `npm install -g wrangler`

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   cd workers && pnpm install
   ```

3. Start development server:
   ```bash
   pnpm run dev
   ```

4. Start backend server (separate terminal):
   ```bash
   pnpm run dev:backend
   ```

### Build & Deploy

Build for production:
```bash
pnpm run build
```

Deploy to production:
```bash
pnpm run deploy:prod
```

Deploy to development:
```bash
pnpm run deploy:dev
```

## Configuration

### Cloudflare Setup

The application uses Cloudflare Workers for backend services. Configuration is in `wrangler.toml`:

- **D1 Database**: SQLite database for artwork, user, and profile data
- **R2 Storage**: Object storage for artwork images with automatic thumbnailing
- **Workers**: Serverless API handling authentication, CRUD operations, and file uploads
- **Custom Domain**: Routes configured for artsite.ca (production) and dev.artsite.ca (development)

### Required Cloudflare Resources

- **D1 Database**: SQLite database with tables:
  - `accounts` - User accounts and authentication
  - `artworks` - Artwork metadata and file references
  - `profiles` - User profiles and artist information 
  - `settings` - Site configuration per user
- **R2 Bucket**: `artsite-images` for storing artwork files
- **Workers**: API routes for auth, artworks, profiles, settings, and uploads

See `docs/APPWRITE_SETUP.md` for legacy setup instructions.

## Getting Started

1. **Setup Cloudflare resources** (D1 database, R2 bucket, Workers)
2. **Run database migrations**: `wrangler d1 execute artsite-db --file=migrations/0001_initial.sql`
3. **Set environment secrets**: `wrangler secret put JWT_SECRET` and `wrangler secret put EMAIL_API_KEY`
4. **Start development servers**: `pnpm run dev` (frontend) and `pnpm run dev:backend` (API)
5. **Navigate to registration page** and create your first admin account
6. **Upload artworks** and configure site settings through the admin dashboard

## Project Structure

```
src/
├── api.js         # Frontend API client (replaces Appwrite SDK)
├── main.js        # Main SPA application with client-side routing
└── style.css      # Styles with CSS custom properties

workers/           # Cloudflare Workers backend
├── index.js       # Main worker entry point with routing
├── auth/          # Authentication endpoints
├── artworks/      # Artwork CRUD endpoints
├── profiles/      # User profile endpoints
├── settings/      # Site settings endpoints
├── upload/        # File upload handling
└── shared/        # Shared utilities (DB, auth, CORS, etc.)

migrations/        # Database schema migrations
docs/             # Documentation
public/           # Static assets (favicons, icons)
dist/             # Built files for deployment
```

## Deployment

The project is configured for Cloudflare Workers deployment with integrated static assets:

- **Build Command**: `pnpm run build`
- **Deploy to Production**: `pnpm run deploy:prod`
- **Deploy to Development**: `pnpm run deploy:dev`

Configuration is managed via `wrangler.toml` with environment-specific settings.

## License

See LICENSE file for details.
