# artsite.ca API Documentation

This document describes the REST API for the artsite.ca platform built on Cloudflare Workers with D1 database and R2 storage.

## Base URL
- **Development**: `https://dev.artsite.ca/api`
- **Production**: `https://artsite.ca/api`
- **Local Development**: `http://localhost:8787/api` (via wrangler dev)

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are returned from login/register endpoints and should be stored client-side in localStorage.

---

## Authentication Endpoints

### Register User
**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": false,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Login
**POST** `/api/auth/login`

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": true
  }
}
```

### Get Current User
**GET** `/api/auth/user`

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "emailVerified": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Request Password Reset
**POST** `/api/auth/forgot-password`

Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### Reset Password
**POST** `/api/auth/reset-password`

Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "newsecurepassword"
}
```

### Verify Email
**POST** `/api/auth/verify`

Verify email address using token from verification email.

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

---

## Artwork Endpoints

### Get Artworks
**GET** `/api/artworks`

Retrieve artworks with optional filtering.

**Query Parameters:**
- `userId` (optional): Filter by specific user ID
- `status` (optional): Filter by artwork status (published, draft, archived)
- `featured` (optional): Filter featured artworks only
- `page` (optional): Page number for pagination
- `limit` (optional): Number of results per page (default: 50)

**Examples:**
- `/api/artworks` - Get all published artworks
- `/api/artworks?userId=123` - Get artworks by specific user
- `/api/artworks?status=published&featured=true` - Get featured published artworks
- `/api/artworks?page=2&limit=20` - Get page 2 with 20 results per page

**Response:**
```json
{
  "artworks": [
    {
      "id": "artwork-id",
      "user_id": "artist-user-id",
      "title": "Artwork Title",
      "description": "Artwork description",
      "medium": "Oil on canvas",
      "dimensions": "24x36 inches",
      "year_created": 2024,
      "price": "$1,200",
      "tags": "abstract,modern",
      "image_url": "https://r2.artsite.ca/user-id/artwork-image.jpg",
      "thumbnail_url": "https://r2.artsite.ca/user-id/artwork-thumb.jpg",
      "storage_path": "user-id/unique-filename.jpg",
      "file_size": 2048000,
      "image_width": 1920,
      "image_height": 1080,
      "status": "published",
      "featured": false,
      "sort_order": 0,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "hasMore": false
}
```

### Get Single Artwork
**GET** `/api/artworks/{id}`

Get details for a specific artwork.

**Response:**
```json
{
  "artwork": {
    "id": "artwork-id",
    "user_id": "artist-user-id",
    "title": "Artwork Title",
    "description": "Artwork description",
    "medium": "Oil on canvas",
    "dimensions": "24x36 inches",
    "year_created": 2024,
    "price": "$1,200",
    "tags": "abstract,modern",
    "image_url": "https://r2.artsite.ca/user-id/artwork-image.jpg",
    "thumbnail_url": "https://r2.artsite.ca/user-id/artwork-thumb.jpg",
    "original_url": "https://r2.artsite.ca/user-id/artwork-original.jpg",
    "storage_path": "user-id/unique-filename.jpg",
    "file_size": 2048000,
    "image_width": 1920,
    "image_height": 1080,
    "status": "published",
    "featured": false,
    "sort_order": 0,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Create Artwork
**POST** `/api/artworks`

Create a new artwork entry (authenticated users only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Artwork Title",
  "description": "Artwork description", 
  "medium": "Oil on canvas",
  "dimensions": "24x36 inches",
  "year_created": 2024,
  "price": "$1,200",
  "tags": "abstract,modern",
  "image_id": "uploaded-file-id",
  "image_url": "https://r2.artsite.ca/user-id/artwork-image.jpg",
  "thumbnail_url": "https://r2.artsite.ca/user-id/artwork-thumb.jpg",
  "original_url": "https://r2.artsite.ca/user-id/artwork-original.jpg",
  "storage_path": "user-id/unique-filename.jpg",
  "original_filename": "original-file.jpg",
  "status": "published",
  "featured": false,
  "sort_order": 0
}
```

**Response:**
```json
{
  "success": true,
  "artwork": {
    "id": "new-artwork-id",
    "title": "Artwork Title",
    // ... full artwork object
  }
}
```

### Update Artwork
**PUT** `/api/artworks/{id}`

Update an existing artwork (owner only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:** Same as create artwork

**Response:**
```json
{
  "success": true,
  "artwork": {
    // ... updated artwork object
  }
}
```

### Delete Artwork
**DELETE** `/api/artworks/{id}`

Delete an artwork (owner only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Artwork deleted successfully"
}
```

---

## Profile Endpoints

### Get Profiles
**GET** `/api/profiles`

Get all user profiles (for artist listings).

**Response:**
```json
[
  {
    "user_id": "user-id",
    "display_name": "Artist Display Name",
    "bio": "Artist biography",
    "website": "https://artistwebsite.com",
    "instagram": "@artisthandle",
    "location": "City, Country",
    "avatar_url": "https://images.artsite.ca/avatar.jpg",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### Get Single Profile
**GET** `/api/profiles/{userId}`

Get profile for a specific user.

**Response:**
```json
{
  "user_id": "user-id",
  "display_name": "Artist Display Name",
  "bio": "Artist biography",
  "website": "https://artistwebsite.com",
  "instagram": "@artisthandle",
  "location": "City, Country",
  "avatar_url": "https://images.artsite.ca/avatar.jpg",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### Update Profile
**PUT** `/api/profiles`

Update current user's profile (authenticated users only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "display_name": "New Display Name",
  "bio": "Updated biography",
  "website": "https://newwebsite.com",
  "instagram": "@newhandle",
  "location": "New City, Country"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    // ... updated profile object
  }
}
```

---

## Settings Endpoints

### Get Settings
**GET** `/api/settings`

Get current user's site settings (authenticated users only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "site_title": "My Art Site",
  "artist_name": "Artist Name",
  "artist_bio": "Artist biography",
  "contact_email": "contact@example.com",
  "contact_phone": "+1-555-123-4567",
  "gallery_description": "Gallery description",
  "primary_color": "#ff6b6b",
  "secondary_color": "#4ecdc4"
}
```

### Update Settings
**PUT** `/api/settings`

Update current user's site settings (authenticated users only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "site_title": "Updated Gallery Title",
  "artist_name": "Updated Artist Name",
  "primary_color": "#new-color"
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    // ... updated settings object
  }
}
```

---

## File Upload Endpoints

### Upload Image
**POST** `/api/upload`

Upload an image file for artwork or profile use.

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Request Body:**
```
FormData with 'file' field containing image file
```

**Response:**
```json
{
  "fileId": "unique-file-id",
  "imageUrl": "https://r2.artsite.ca/user-id/image.jpg",
  "thumbnailUrl": "https://r2.artsite.ca/user-id/thumb.jpg", 
  "originalUrl": "https://r2.artsite.ca/user-id/original.jpg",
  "storagePath": "user-id/unique-filename.jpg",
  "fileSize": 1024000,
  "fileType": "image/jpeg",
  "imageWidth": 1920,
  "imageHeight": 1080
}
```

---

## Error Responses

All endpoints may return the following error formats:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Specific error description"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong"
}
```

---

## Rate Limiting

API requests are subject to rate limiting:
- **Authenticated requests**: 1000 requests per minute
- **Unauthenticated requests**: 100 requests per minute
- **File uploads**: 10 uploads per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## CORS

The API supports CORS for web applications with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Database Schema (Cloudflare D1/SQLite)

### Users Table
- `id` (TEXT PRIMARY KEY)
- `email` (TEXT UNIQUE NOT NULL)
- `password_hash` (TEXT NOT NULL)
- `name` (TEXT)
- `email_verified` (BOOLEAN DEFAULT FALSE)
- `email_verification_token` (TEXT)
- `password_reset_token` (TEXT)
- `password_reset_expires` (DATETIME)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### Artworks Table
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT NOT NULL)
- `title` (TEXT NOT NULL)
- `description` (TEXT)
- `medium` (TEXT)
- `dimensions` (TEXT)
- `year_created` (INTEGER)
- `price` (TEXT)
- `tags` (TEXT) - Comma-separated values
- `image_url` (TEXT NOT NULL)
- `thumbnail_url` (TEXT)
- `storage_path` (TEXT)
- `file_size` (INTEGER)
- `image_width` (INTEGER)
- `image_height` (INTEGER)
- `status` (TEXT DEFAULT 'published') - published/draft/archived
- `featured` (BOOLEAN DEFAULT FALSE)
- `sort_order` (INTEGER DEFAULT 0)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### Profiles Table
- `user_id` (TEXT PRIMARY KEY)
- `display_name` (TEXT)
- `bio` (TEXT)
- `statement` (TEXT) - Artist statement
- `avatar_url` (TEXT)
- `website` (TEXT)
- `instagram` (TEXT)
- `twitter` (TEXT)
- `location` (TEXT)
- `phone` (TEXT)
- `public_profile` (BOOLEAN DEFAULT TRUE)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### Settings Table
- `user_id` (TEXT PRIMARY KEY)
- `settings` (TEXT NOT NULL) - JSON object stored as text
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

---

*Generated for artsite.ca - The portfolio site for artists.*
