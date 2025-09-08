# Art Gallery Website

A simple, file-based art gallery website for managing and displaying artwork collections.

## Features

- **File-based storage** - No database required
- **Admin interface** for uploading, editing, and managing artwork
- **Site customization** - colors, branding, artist info, and page content
- **Responsive public gallery** with navigation menu
- **Original filename preservation** - no random generated names
- **Multiple pages** - About, Contact, and optional Blog
- **Simple authentication** for admin access
- **Automatic thumbnail creation** using Sharp
- **Easy backup** - just copy the uploads and config folders

## How It Works

The system uses the filesystem as the source of truth:

### Storage Structure
```
public/uploads/
├── full/           # Original high-resolution images with original filenames
│   ├── sunset.jpg
│   ├── sunset.json      # Metadata for sunset.jpg
│   ├── landscape.png
│   └── landscape.json   # Metadata for landscape.png
└── thumbs/         # Auto-generated thumbnails
    ├── thumb_sunset.jpg
    └── thumb_landscape.png

config/
└── site.json       # Site configuration (colors, artist info, pages)
```

### Metadata Format
Each image has a corresponding JSON file with the same base name:

```json
{
  "title": "Sunset Over Mountains",
  "description": "A beautiful landscape painting...",
  "medium": "Oil on canvas",
  "dimensions": "24\" x 36\"",
  "year_created": 2024,
  "price": "$500",
  "tags": "landscape, mountains, sunset"
}
```

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

3. **Start the server:**
   ```bash
   pnpm run dev
   ```

4. **Access the application:**
   - Public gallery: http://localhost:3000
   - Admin panel: http://localhost:3000/admin (or /admin/login)
   - Default login: `admin` / `admin123`

## Usage

### Admin Interface

**Dashboard** (`/admin` or `/admin/dashboard`)
- View all uploaded artwork
- **Edit** artwork metadata (title, description, medium, etc.)
- **Delete** artwork
- Access upload and settings

**Upload** (`/admin/upload`)
- Upload images with **original filenames preserved**
- Add title, description, medium, dimensions, year, price, tags
- Automatic thumbnail generation

**Settings** (`/admin/settings`)
- Customize site title, subtitle, description
- Set theme colors (primary/secondary gradient)
- Configure artist information (name, bio, statement, contact)
- Enable/disable pages (About, Contact, Blog)
- Edit page content

### Manual File Management

You can also add artwork manually by:

1. Copying image files to `public/uploads/full/`
2. Creating corresponding `.json` metadata files
3. Thumbnails will be created automatically when the gallery is viewed

### Public Site Features

**Navigation Menu**
- Gallery (main page with all artwork)
- About (artist bio, statement, contact info)
- Contact (contact information and inquiry details)
- Blog (placeholder for future feature)

**Dynamic Theming**
- Custom colors set in admin settings
- CSS variables automatically updated
- Responsive design for all devices

### Backup

To backup the entire site:
- Copy the `public/uploads/` folder (all images and metadata)
- Copy the `config/` folder (site configuration)
- These two folders contain all customizable content

## Admin Routes

- **`/admin`** - Redirects to dashboard
- **`/admin/login`** - Admin login page
- **`/admin/dashboard`** - Main admin dashboard with artwork list
- **`/admin/upload`** - Upload new artwork
- **`/admin/edit/:id`** - Edit artwork metadata (preserves filename)
- **`/admin/settings`** - Site configuration and customization
- **`/admin/delete/:id`** - Delete artwork (via form submission)

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
# Server configuration
PORT=3000                    # Server port (default: 3000)

# Admin authentication  
ADMIN=admin                  # Admin username (default: admin)
PASSWORD=admin123            # Admin password (default: admin123)

# Security
SESSION_SECRET=your-secret-key-change-this-in-production

# Environment
NODE_ENV=development         # development or production
```

### Site Customization

All site customization is done through the admin interface at `/admin/settings`:
- Site title, subtitle, and description
- Theme colors (primary and secondary for gradients)
- Artist information and statement
- Enable/disable About, Contact, and Blog pages
- Custom content for each page

**Important:** Change the default admin password before deploying to production!

## Technical Details

- **Node.js + Express** web server
- **EJS** templating for server-rendered pages
- **Multer** for file uploads
- **Sharp** for image processing/thumbnails
- **bcryptjs** for password hashing
- **No database** - filesystem only

## Deployment

1. Upload all files to your web server
2. Run `pnpm install` on the server
3. Start with `pnpm start` or `node server.js`
4. Configure reverse proxy (nginx/Apache) if needed

The application is completely self-contained and portable between servers.