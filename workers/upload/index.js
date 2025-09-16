/**
 * Upload API handlers for R2 storage
 */

import { withCors } from '../shared/cors.js';
import { authenticateRequest } from '../shared/auth.js';
import { generateId } from '../shared/db.js';
import { createStoragePath } from '../shared/storage.js';

export async function handleUpload(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Route upload endpoints
    if (path === '/api/upload' && method === 'POST') {
      return await uploadImage(request, env);
    }
    
    if (path === '/api/upload/signed-url' && method === 'POST') {
      return await generateSignedUploadUrl(request, env);
    }

    return withCors(new Response(JSON.stringify({ 
      error: 'Endpoint not found' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Upload error:', error);
    return withCors(new Response(JSON.stringify({ 
      error: 'Upload error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Upload image directly to R2
 */
async function uploadImage(request, env) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request, env.JWT_SECRET);

    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile) {
      return withCors(new Response(JSON.stringify({
        error: 'No image file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return withCors(new Response(JSON.stringify({
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return withCors(new Response(JSON.stringify({
        error: 'File too large. Maximum size is 10MB'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Generate unique file paths with environment prefixes
    const fileId = generateId();
    const fileExtension = getFileExtension(imageFile.name);
    const originalPath = createStoragePath(env, `artworks/${user.account_id}/${fileId}/original.${fileExtension}`);
    const displayPath = createStoragePath(env, `artworks/${user.account_id}/${fileId}/display.${fileExtension}`);
    const thumbPath = createStoragePath(env, `artworks/${user.account_id}/${fileId}/thumb.${fileExtension}`);

    // Convert file to ArrayBuffer
    const imageBuffer = await imageFile.arrayBuffer();

    // Upload original image to R2
    await env.ARTWORK_IMAGES.put(originalPath, imageBuffer, {
      httpMetadata: {
        contentType: imageFile.type,
        cacheControl: 'public, max-age=31536000' // 1 year cache
      },
      customMetadata: {
        uploadedBy: user.account_id,
        originalName: imageFile.name,
        uploadedAt: new Date().toISOString()
      }
    });

    // Generate display and thumbnail versions
    // Note: This is a simplified version. In production, you might want to use 
    // Cloudflare Images or implement resizing in the Worker
    const { displayImage, thumbnailImage } = await processImage(imageBuffer, imageFile.type);

    // Upload processed versions
    if (displayImage) {
      await env.ARTWORK_IMAGES.put(displayPath, displayImage, {
        httpMetadata: {
          contentType: imageFile.type,
          cacheControl: 'public, max-age=31536000'
        }
      });
    }

    if (thumbnailImage) {
      await env.ARTWORK_IMAGES.put(thumbPath, thumbnailImage, {
        httpMetadata: {
          contentType: imageFile.type,
          cacheControl: 'public, max-age=31536000'
        }
      });
    }

    // Generate public URLs using environment configuration
    const baseUrl = env.ARTWORK_IMAGES_BASE_URL;
    console.log('Upload baseUrl:', baseUrl);
    const imageUrl = displayImage ? `${baseUrl}/${displayPath}` : `${baseUrl}/${originalPath}`;
    const thumbnailUrl = thumbnailImage ? `${baseUrl}/${thumbPath}` : imageUrl;

    return withCors(new Response(JSON.stringify({
      message: 'Image uploaded successfully',
      fileId,
      imageUrl,
      thumbnailUrl,
      originalUrl: `${baseUrl}/${originalPath}`,
      storagePath: originalPath,
      fileSize: imageFile.size,
      fileType: imageFile.type
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Image upload error:', error);
    
    if (error.message.includes('Unauthorized') || error.message.includes('token')) {
      return withCors(new Response(JSON.stringify({
        error: 'Unauthorized',
        message: error.message
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    return withCors(new Response(JSON.stringify({
      error: 'Failed to upload image',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Generate signed URL for direct R2 upload (alternative approach)
 */
async function generateSignedUploadUrl(request, env) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request, env.JWT_SECRET);

    const { fileName, fileType, fileSize } = await request.json();

    // Validate input
    if (!fileName || !fileType) {
      return withCors(new Response(JSON.stringify({
        error: 'File name and type are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      return withCors(new Response(JSON.stringify({
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize && fileSize > maxSize) {
      return withCors(new Response(JSON.stringify({
        error: 'File too large. Maximum size is 10MB'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Generate unique file path with environment prefix
    const fileId = generateId();
    const fileExtension = getFileExtension(fileName);
    const uploadPath = createStoragePath(env, `artworks/${user.account_id}/${fileId}/original.${fileExtension}`);

    // This is a placeholder - R2 doesn't currently support signed URLs for uploads
    // You would typically use presigned URLs with S3-compatible APIs
    // For now, we'll return the direct upload endpoint
    
    return withCors(new Response(JSON.stringify({
      fileId,
      uploadUrl: `/api/upload`, // Client should use the direct upload endpoint
      uploadPath,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Signed URL generation error:', error);
    
    if (error.message.includes('Unauthorized') || error.message.includes('token')) {
      return withCors(new Response(JSON.stringify({
        error: 'Unauthorized',
        message: error.message
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    return withCors(new Response(JSON.stringify({
      error: 'Failed to generate upload URL',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Process image to create display and thumbnail versions
 * This is a simplified implementation - in production you might use:
 * - Cloudflare Images for automatic resizing
 * - A dedicated image processing service
 * - WebAssembly-based image processing in the Worker
 */
async function processImage(imageBuffer, mimeType) {
  // For now, return the original image for both display and thumbnail
  // In a real implementation, you would resize the images here
  
  // You could use libraries like:
  // - @squoosh/lib (WebAssembly-based)
  // - Sharp (would need to compile to WASM)
  // - Canvas API (if available in Workers)
  
  return {
    displayImage: imageBuffer, // Would be resized to max 1200px width
    thumbnailImage: null      // Would be resized to 300x300px
  };
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'jpg';
}