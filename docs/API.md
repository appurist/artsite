# Artsite API Documentation

This document describes the REST API for the artsite.ca platform built on Cloudflare Workers.

## Base URL
- **Development**: `https://dev.artsite.ca`
- **Production**: `https://artsite.ca`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are returned from login/register endpoints and should be stored client-side.

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
**POST** `/api/auth/password-reset-request`

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
**POST** `/api/auth/password-reset`

Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newsecurepassword"
}
```

### Verify Email
**POST** `/api/auth/verify-email`

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
- `featured` (optional): Filter featured artworks only
- `limit` (optional): Number of results to return
- `offset` (optional): Number of results to skip

**Examples:**
- `/api/artworks` - Get all artworks
- `/api/artworks?userId=123` - Get artworks by specific user
- `/api/artworks?featured=true` - Get featured artworks only

**Response:**
```json
[
  {
    "id": "artwork-id",
    "title": "Artwork Title",
    "description": "Artwork description",
    "medium": "Oil on canvas",
    "dimensions": "24x36 inches",
    "year_created": 2024,
    "price": "$1,200",
    "tags": "abstract, modern",
    "image_url": "https://images.artsite.ca/artwork-image.jpg",
    "thumbnail_url": "https://images.artsite.ca/artwork-thumb.jpg",
    "user_id": "artist-user-id",
    "featured": false,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### Get Single Artwork
**GET** `/api/artworks/{id}`

Get details for a specific artwork.

**Response:**
```json
{
  "id": "artwork-id",
  "title": "Artwork Title",
  "description": "Artwork description",
  "medium": "Oil on canvas",
  "dimensions": "24x36 inches",
  "year_created": 2024,
  "price": "$1,200",
  "tags": "abstract, modern",
  "image_url": "https://images.artsite.ca/artwork-image.jpg",
  "thumbnail_url": "https://images.artsite.ca/artwork-thumb.jpg",
  "original_url": "https://images.artsite.ca/artwork-original.jpg",
  "user_id": "artist-user-id",
  "featured": false,
  "created_at": "2024-01-01T00:00:00.000Z"
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
  "tags": "abstract, modern",
  "image_id": "uploaded-file-id",
  "image_url": "https://images.artsite.ca/artwork-image.jpg",
  "thumbnail_url": "https://images.artsite.ca/artwork-thumb.jpg",
  "featured": false
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
  "success": true,
  "file": {
    "$id": "file-id",
    "url": "https://images.artsite.ca/image.jpg",
    "thumbnailUrl": "https://images.artsite.ca/thumb.jpg",
    "originalUrl": "https://images.artsite.ca/original.jpg",
    "storagePath": "user-id/unique-filename.jpg",
    "size": 1024000,
    "mimeType": "image/jpeg"
  }
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

## Database Schema

### Users Table
- `id` (TEXT PRIMARY KEY)
- `email` (TEXT UNIQUE)
- `password_hash` (TEXT)
- `name` (TEXT)
- `email_verified` (BOOLEAN)
- `verification_token` (TEXT)
- `reset_token` (TEXT)
- `reset_token_expires` (INTEGER)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### Artworks Table
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT)
- `title` (TEXT)
- `description` (TEXT)
- `medium` (TEXT)
- `dimensions` (TEXT)
- `year_created` (INTEGER)
- `price` (TEXT)
- `tags` (TEXT)
- `image_id` (TEXT)
- `image_url` (TEXT)
- `thumbnail_url` (TEXT)
- `featured` (BOOLEAN)
- `created_at` (DATETIME)

### Profiles Table
- `user_id` (TEXT PRIMARY KEY)
- `display_name` (TEXT)
- `bio` (TEXT)
- `website` (TEXT)
- `instagram` (TEXT)
- `location` (TEXT)
- `avatar_url` (TEXT)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### Settings Table
- `user_id` (TEXT PRIMARY KEY)
- `settings_json` (TEXT) - JSON blob containing all settings

---

*Generated for artsite.ca - The portfolio site for artists.*
