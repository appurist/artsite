# Art Gallery Website

A modern, responsive art gallery website built with Vite and Appwrite, deployed on Cloudflare Workers.

## Features

- **Public Gallery**: Browse artworks in a responsive grid layout
- **Modal Viewer**: Click any artwork to view in full-screen modal with metadata
- **Admin Dashboard**: Secure login to manage artworks and site settings
- **Upload System**: Upload artworks with metadata (title, description, medium, etc.)
- **Site Settings**: Configure gallery title, artist bio, contact information
- **Responsive Design**: Optimized for desktop and mobile viewing

## Tech Stack

- **Frontend**: Vite + Vanilla JavaScript
- **Backend**: Appwrite (Database + Storage + Auth)
- **Hosting**: Cloudflare Workers
- **Styling**: CSS with custom properties for theming

## Development

### Prerequisites

- Node.js 18+
- pnpm package manager
- Appwrite account with configured project

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start development server:
   ```bash
   pnpm run dev
   ```

### Build & Deploy

Build for production:
```bash
pnpm run build
```

Deploy to Cloudflare Workers:
```bash
pnpm run deploy
```

Upload version (non-production):
```bash
pnpm run upload
```

## Configuration

### Appwrite Setup

The application connects to Appwrite for backend services. Configuration is hardcoded in `src/appwrite.js`:

```javascript
const APPWRITE_ENDPOINT = "https://nyc.cloud.appwrite.io/v1"
const APPWRITE_PROJECT_ID = "artsite"  
const APPWRITE_DATABASE_ID = "68bfaf22002f08bd470a"
```

### Required Appwrite Resources

- **Database**: PostgreSQL database with collections:
  - `artworks` - Stores artwork metadata
  - `settings` - Stores site configuration
- **Storage**: `images` bucket for artwork files
- **Auth**: Email/password authentication for admin access

See `APPWRITE_SETUP.md` for detailed setup instructions.

## Project Structure

```
src/
├── appwrite.js    # Appwrite SDK configuration and helpers
├── main.js        # Main application logic
└── style.css      # Styles with CSS custom properties

public/            # Static assets (favicons)
dist/             # Built files for deployment
```

## Deployment

The project is configured for Cloudflare Workers deployment:

- **Build Command**: `pnpm run build`
- **Deploy Command**: `pnpm run deploy`
- **Assets Directory**: `./dist`

Configuration is managed via `wrangler.toml`.

## License

See LICENSE file for details.