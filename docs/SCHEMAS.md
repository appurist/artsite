# Database Schema Documentation

This document describes the database schema for artsite.ca using Cloudflare D1 (SQLite).

## Core Tables

### `users`
User authentication and account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique user identifier (UUID) |
| `email` | TEXT | UNIQUE NOT NULL | User's email address (used for login) |
| `password_hash` | TEXT | NOT NULL | Hashed password using bcrypt |
| `name` | TEXT | | User's full name (optional) |
| `email_verified` | BOOLEAN | DEFAULT FALSE | Whether email address has been verified |
| `email_verification_token` | TEXT | | Token for email verification process |
| `password_reset_token` | TEXT | | Token for password reset process |
| `password_reset_expires` | DATETIME | | Expiration time for password reset token |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last account update timestamp |

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_verification_token` on `email_verification_token`
- `idx_users_reset_token` on `password_reset_token`

---

### `profiles`
Extended user profile information for artist pages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | TEXT | PRIMARY KEY, FK → users.id | References user account |
| `display_name` | TEXT | | Public display name (overrides user.name) |
| `bio` | TEXT | | Artist biography/description |
| `statement` | TEXT | | Artist statement or philosophy |
| `avatar_url` | TEXT | | URL to user's profile picture |
| `website` | TEXT | | Artist's personal website |
| `instagram` | TEXT | | Instagram handle or URL |
| `twitter` | TEXT | | Twitter handle or URL |
| `location` | TEXT | | Artist's location (city, country) |
| `phone` | TEXT | | Contact phone number |
| `public_profile` | BOOLEAN | DEFAULT TRUE | Whether profile is publicly visible |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Profile creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last profile update timestamp |

**Foreign Keys:**
- `user_id` REFERENCES `users(id)` ON DELETE CASCADE

---

### `artworks`
Individual artwork records with metadata and file references.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique artwork identifier (UUID) |
| `user_id` | TEXT | NOT NULL, FK → users.id | Artist/owner of the artwork |
| `title` | TEXT | NOT NULL | Artwork title |
| `description` | TEXT | | Detailed artwork description |
| `medium` | TEXT | | Medium used (oil on canvas, watercolor, etc.) |
| `dimensions` | TEXT | | Physical dimensions (24" x 36") |
| `year_created` | INTEGER | | Year the artwork was created |
| `price` | TEXT | | Price or availability (USD $500, Not for sale) |
| `tags` | TEXT | | Comma-separated tags for categorization |
| `image_url` | TEXT | NOT NULL | Primary display image URL (from R2) |
| `thumbnail_url` | TEXT | | Thumbnail image URL (from R2) |
| `storage_path` | TEXT | | Internal storage path in R2 bucket |
| `file_size` | INTEGER | | Image file size in bytes |
| `image_width` | INTEGER | | Image width in pixels |
| `image_height` | INTEGER | | Image height in pixels |
| `status` | TEXT | DEFAULT 'published' | Publication status (published, draft, archived) |
| `featured` | BOOLEAN | DEFAULT FALSE | Whether artwork is featured |
| `sort_order` | INTEGER | DEFAULT 0 | Manual ordering for displays |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Upload timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Foreign Keys:**
- `user_id` REFERENCES `users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_artworks_user_id` on `user_id`
- `idx_artworks_status` on `status`
- `idx_artworks_featured` on `featured`
- `idx_artworks_created_at` on `created_at`

---

### `settings`
User-specific site configuration stored as JSON.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | TEXT | PRIMARY KEY, FK → users.id | User these settings belong to |
| `settings` | TEXT | NOT NULL | JSON object containing all settings |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last settings update timestamp |

**Foreign Keys:**
- `user_id` REFERENCES `users(id)` ON DELETE CASCADE

---

## Feature Tables

### `categories`
Optional categorization system for organizing artworks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique category identifier |
| `name` | TEXT | NOT NULL | Category display name |
| `slug` | TEXT | UNIQUE NOT NULL | URL-friendly category identifier |
| `description` | TEXT | | Category description |
| `sort_order` | INTEGER | DEFAULT 0 | Display order |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

---

### `artwork_categories`
Junction table linking artworks to categories (many-to-many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `artwork_id` | TEXT | PK, FK → artworks.id | Reference to artwork |
| `category_id` | TEXT | PK, FK → categories.id | Reference to category |

**Foreign Keys:**
- `artwork_id` REFERENCES `artworks(id)` ON DELETE CASCADE
- `category_id` REFERENCES `categories(id)` ON DELETE CASCADE

**Primary Key:** Composite of `(artwork_id, category_id)`

---

## Analytics Tables

### `artwork_views`
Track individual artwork views for analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique view record identifier |
| `artwork_id` | TEXT | NOT NULL, FK → artworks.id | Artwork that was viewed |
| `viewer_ip` | TEXT | | Viewer's IP address (hashed for privacy) |
| `user_agent` | TEXT | | Browser user agent string |
| `referrer` | TEXT | | HTTP referrer URL |
| `country` | TEXT | | Viewer's country (from IP geolocation) |
| `viewed_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | View timestamp |

**Foreign Keys:**
- `artwork_id` REFERENCES `artworks(id)` ON DELETE CASCADE

**Indexes:**
- `idx_artwork_views_artwork_id` on `artwork_id`
- `idx_artwork_views_viewed_at` on `viewed_at`

---

## Future Feature Tables

### `comments`
User comments on artworks (not yet implemented).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique comment identifier |
| `artwork_id` | TEXT | NOT NULL, FK → artworks.id | Artwork being commented on |
| `user_id` | TEXT | FK → users.id | Registered user who commented (optional) |
| `author_name` | TEXT | | Display name for the comment |
| `author_email` | TEXT | | Contact email (not displayed publicly) |
| `content` | TEXT | NOT NULL | Comment content |
| `status` | TEXT | DEFAULT 'pending' | Moderation status (pending, approved, spam) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Comment timestamp |

**Foreign Keys:**
- `artwork_id` REFERENCES `artworks(id)` ON DELETE CASCADE
- `user_id` REFERENCES `users(id)` ON DELETE SET NULL

**Indexes:**
- `idx_comments_artwork_id` on `artwork_id`
- `idx_comments_status` on `status`

---

## JSON Object Types

### Settings Object
Stored in `settings.settings` as JSON text:

```json
{
  "site_title": "My Art Gallery",
  "artist_name": "Artist Display Name",
  "artist_bio": "Artist biography and background...",
  "gallery_description": "Description of the gallery and artistic focus...",
  "contact_email": "artist@example.com",
  "contact_phone": "+1 (555) 123-4567",
  "primary_color": "#667eea",
  "secondary_color": "#764ba2"
}
```

**Settings Fields:**
- `site_title` (string): Gallery title shown in navigation and headers
- `artist_name` (string): Artist's display name for the site
- `artist_bio` (string): Artist biography for about sections
- `gallery_description` (string): Description of the gallery and artistic style
- `contact_email` (string): Public contact email address
- `contact_phone` (string): Public contact phone number
- `primary_color` (string): Hex color code for primary theme color
- `secondary_color` (string): Hex color code for secondary theme color

All settings fields are optional and can be empty strings or omitted entirely.

---

## Data Relationships

```
users (1) ←→ (0..1) profiles
users (1) ←→ (0..1) settings  
users (1) ←→ (*) artworks
users (0..1) ←→ (*) comments

artworks (*) ←→ (*) categories (via artwork_categories)
artworks (1) ←→ (*) artwork_views
artworks (1) ←→ (*) comments
```

## Privacy Considerations

- User email addresses are never exposed in public APIs
- Display names from profiles take precedence over user names
- IP addresses in analytics should be hashed for privacy
- Comments include moderation system for content safety

---

*Generated for artsite.ca - Database schema as of 2025-01-13*