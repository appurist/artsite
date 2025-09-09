# Appwrite Setup Guide

## Prerequisites
1. Install the Appwrite CLI: `npm install -g appwrite-cli`
2. Have your Appwrite project created with ID "artsite"
3. Get an API key from your Appwrite console (with full permissions)

## Setup Steps

### 1. Login to Appwrite CLI
```bash
appwrite login
```
Follow the prompts to authenticate with your Appwrite account.

### 2. Initialize Project
```bash
appwrite init project
```
- Select your existing project "artsite"
- This will link the local folder to your Appwrite project

### 3. Deploy Configuration
```bash
appwrite deploy
```
This will read the `appwrite.json` file and create:
- Database "artsite" with tables and attributes
- Storage bucket "images" 
- Proper permissions for public read, authenticated user write

### 4. Create Admin User
In your Appwrite Console:
- Go to Auth → Users
- Create a new user with email/password
- Note the credentials for testing

### 5. Add Platform
In your Appwrite Console:
- Go to Settings → Platforms
- Add Web Platform: `localhost:5173` (for development)
- Add your production domain when deployed to Cloudflare Workers

### 6. Verify Setup
Run the test connection page: `/test-connection.html`

## Manual Setup Alternative

If the CLI doesn't work, manually create in Appwrite Console:

### Database: "artsite"
- **Table: "artworks"**
  - Permissions: Read: Any, Create/Update/Delete: Users
  - Attributes:
    - `title` (String, 255, Required)
    - `description` (String, 2000, Optional)
    - `medium` (String, 255, Optional)
    - `dimensions` (String, 255, Optional)
    - `year_created` (Integer, Optional)
    - `price` (String, 255, Optional)
    - `tags` (String, 1000, Optional)
    - `image_id` (String, 255, Required)
    - `user_id` (String, 255, Required) - Owner user ID for access control
    - `storage_path` (String, 512, Required) - Secure path in storage: user-id/file-id.ext
    - `original_filename` (String, 255, Required) - Original uploaded filename
    - Note: `$createdAt` and `$updatedAt` are automatically added by Appwrite

- **Table: "settings"**
  - Permissions: Read: Any, Create/Update/Delete: Users
  - Attributes:
    - `key` (String, 255, Required, Unique Index)
    - `value` (String, 5000, Required)

### Storage Bucket: "images"
- Permissions: Read: Any, Create/Update/Delete: Users
- File extensions: jpg, jpeg, png, gif, webp
- Max size: 30MB

## Permissions Explained
- `read("any")` - Anyone can read (public gallery)
- `create("users")` - Only authenticated users can create
- `update("users")` - Only authenticated users can update
- `delete("users")` - Only authenticated users can delete

This allows:
- Public access to view gallery and settings
- Admin-only access to manage content (when logged in)

## Testing
1. Run `/test-connection.html` to verify database/storage access
2. Start development server: `pnpm run dev`
3. Navigate to the admin section and log in with your created user
4. Test creating/updating content (requires authentication)

## Production Deployment
The application is configured for Cloudflare Workers deployment. After Appwrite setup:
1. Build: `pnpm run build`
2. Deploy: `pnpm run deploy`
3. Add your Cloudflare Workers domain to Appwrite platforms