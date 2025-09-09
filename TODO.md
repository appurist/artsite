# Art Gallery Appwrite Implementation - Todo List

## Completed ✅
- [x] Set up new Vite project with vanilla JS
- [x] Install and configure Appwrite Web SDK
- [x] Create basic HTML structure for gallery

## In Progress 🔄
- [ ] Implement Appwrite authentication for admin

## Pending ⏳
- [ ] Set up Appwrite database collections and storage
- [ ] Build gallery display functionality
- [ ] Build admin upload interface
- [ ] Implement site settings management

## Context
This is a client-side art gallery application using:
- **Vite** for development and building
- **Appwrite** for backend (database, storage, auth)
- **Vanilla JS** for frontend logic
- **Pure CSS** for styling

## Appwrite Configuration Needed
1. **Database:** `artsite`
   - Collection: `artworks`
     - `title` (String, 255 chars, required)
     - `description` (String, 2000 chars, optional)
     - `medium` (String, 255 chars, optional)
     - `dimensions` (String, 255 chars, optional)
     - `year_created` (Integer, optional)
     - `price` (String, 255 chars, optional)
     - `tags` (String, 1000 chars, optional)
     - `image_id` (String, 255 chars, required)
     - `filename` (String, 255 chars, optional)
     - `created_at` (DateTime, required)
   - Collection: `settings`
     - `key` (String, 255 chars, required, unique index)
     - `value` (String, 5000 chars, required)
2. **Storage:** `images` bucket for artwork files
   - Allowed extensions: jpg, jpeg, png, gif, webp
   - Read permissions: Any
   - Write permissions: Users
3. **Platform:** Add `http://localhost:5173` to allowed origins
4. **Auth:** Create admin user for gallery management

## Setup Options
- **Automated:** Open `/setup.html` in browser and click "Run Setup"
- **Manual:** Follow instructions in setup.html or use Appwrite console

## Environment Variables
Located in `.env`:
- `VITE_APPWRITE_PROJECT_ID = "artsite"`
- `VITE_APPWRITE_PROJECT_NAME = "Artsite"` 
- `VITE_APPWRITE_ENDPOINT = "https://nyc.cloud.appwrite.io/v1"`

## Development
Start dev server: `pnpm run dev`