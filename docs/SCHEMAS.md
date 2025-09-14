# Database Schema Documentation

This document describes the database schema for artsite.ca using Cloudflare D1 (SQLite).

## Core Tables

### `accounts`
Account authentication and login information with promoted email field and JSON for other data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique account identifier (UUID) |
| `email` | TEXT | UNIQUE NOT NULL | Email address (promoted for efficient lookups) |
| `record` | TEXT | NOT NULL | JSON object containing account data (excluding email) |

**Indexes:**
- `idx_accounts_email` on `email` (unique index for fast email lookups)

---

### `verifications`
Short-lived verification tokens for email verification and password reset.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `account_id` | TEXT | PK, FK → accounts.id | Account these tokens belong to |
| `token_type` | TEXT | PK, NOT NULL | Type of token ('email_verification', 'password_reset') |
| `token_value` | TEXT | NOT NULL | The actual token value |
| `expires_at` | DATETIME | | Expiration time for tokens that expire |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Token creation time |

**Primary Key:** Composite of `(account_id, token_type)` - one token per type per account  
**Relationship:**
- `account_id` logically references `accounts.id` (enforced at application level)

**Indexes:**
- `idx_verifications_token_value` on `token_value` (for token lookups during verification)

---

### `profiles`
Extended user profile information for artist pages stored as JSON documents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Account identifier (same as accounts.id) |
| `public_profile` | BOOLEAN | DEFAULT TRUE | Whether profile is publicly visible (promoted for efficient filtering) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Profile creation time (promoted for efficient ordering) |
| `record` | TEXT | NOT NULL | JSON object containing all profile data |

**Relationship:**
- `profiles.id` logically references `accounts.id` (enforced at application level)

---

### `artworks`
Individual artwork records with metadata and file references.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique artwork identifier (UUID) |
| `account_id` | TEXT | NOT NULL | Artist/owner of the artwork (references accounts.id) |
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

**Note:** Referential integrity enforced at application level.

**Indexes:**
- `idx_artworks_account_id` on `account_id`
- `idx_artworks_status` on `status`
- `idx_artworks_featured` on `featured`
- `idx_artworks_created_at` on `created_at`

---

### `settings`
User-specific site configuration stored as JSON.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `account_id` | TEXT | PRIMARY KEY, FK → accounts.id | User these settings belong to |
| `settings` | TEXT | NOT NULL | JSON object containing all settings |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last settings update timestamp |

**Note:** Referential integrity enforced at application level.

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
| `account_id` | TEXT | FK → accounts.id | Registered user who commented (optional) |
| `author_name` | TEXT | | Display name for the comment |
| `author_email` | TEXT | | Contact email (not displayed publicly) |
| `content` | TEXT | NOT NULL | Comment content |
| `status` | TEXT | DEFAULT 'pending' | Moderation status (pending, approved, spam) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Comment timestamp |

**Foreign Keys:**
- `artwork_id` REFERENCES `artworks(id)` ON DELETE CASCADE
- `account_id` REFERENCES `users(id)` ON DELETE SET NULL

**Indexes:**
- `idx_comments_artwork_id` on `artwork_id`
- `idx_comments_status` on `status`

---

## JSON Object Types

### Account Record Object
Stored in `accounts.record` as JSON text (email is stored in separate column):

```json
{
  "password_hash": "$2b$10$...",
  "name": "User Full Name",
  "email_verified": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-13T15:45:00Z"
}
```

**Account Record Fields:**
- `password_hash` (string, required): Hashed password using bcrypt
- `name` (string, optional): User's full name
- `email_verified` (boolean): Whether email address has been verified
- `created_at` (string, required): ISO datetime for account creation
- `updated_at` (string, required): ISO datetime for last account update

**Note:** Email is stored in `accounts.email` column, verification tokens are stored in `verifications` table.

---

### Profile Record Object
Stored in `profiles.record` as JSON text:

```json
{
  "display_name": "Artist Display Name",
  "bio": "Artist biography and background...",
  "statement": "Artist statement or philosophy...",
  "avatar_url": "https://r2.artsite.ca/avatars/user-123.jpg",
  "use_gravatar": true,
  "website": "https://artistwebsite.com",
  "instagram": "@artisthandle",
  "twitter": "@artisttwitter",
  "location": "City, Country",
  "phone": "+1 (555) 123-4567",
  "public_profile": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-13T15:45:00Z"
}
```

**Profile Record Fields:**
- `display_name` (string, optional): Public display name (overrides account.name)
- `bio` (string, optional): Artist biography/description
- `statement` (string, optional): Artist statement or philosophy
- `avatar_url` (string, optional): URL to user's uploaded profile picture
- `use_gravatar` (boolean): Whether to use Gravatar for avatar (defaults to true)
- `website` (string, optional): Artist's personal website
- `instagram` (string, optional): Instagram handle or URL
- `twitter` (string, optional): Twitter handle or URL
- `location` (string, optional): Artist's location (city, country)
- `phone` (string, optional): Contact phone number
- `public_profile` (boolean): Whether profile is publicly visible (defaults to true)
- `created_at` (string, required): ISO datetime for profile creation
- `updated_at` (string, required): ISO datetime for last profile update

---

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
accounts (1) ←→ (0..1) profiles
accounts (1) ←→ (0..1) settings  
accounts (1) ←→ (*) artworks
accounts (0..1) ←→ (*) comments

artworks (*) ←→ (*) categories (via artwork_categories)
artworks (1) ←→ (*) artwork_views
artworks (1) ←→ (*) comments
```

## Privacy Considerations

- Account email addresses are never exposed in public APIs
- Display names from profiles take precedence over account names
- IP addresses in analytics should be hashed for privacy
- Comments include moderation system for content safety

---

*Generated for artsite.ca - Database schema as of 2025-01-13*