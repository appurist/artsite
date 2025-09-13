# artsite.ca

A modern, responsive art portfolio site built with Vite and deployed on Cloudflare.

## Features

- **Public Gallery**: Browse artworks in a responsive grid layout
- **Modal Viewer**: Click any artwork to view in full-screen 3-column modal with metadata sidebar
- **User Registration**: Create admin accounts with email/password authentication
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
- **Auth**: Email/password authentication with user registration support

See `APPWRITE_SETUP.md` for detailed setup instructions.

## Getting Started

1. **Setup Appwrite backend** following the instructions in `APPWRITE_SETUP.md`
2. **Start development server**: `pnpm run dev`
3. **Navigate to Admin section** and create your first admin account using the registration form
4. **Upload artworks** and configure site settings through the admin dashboard

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
