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

    // Process image through Cloudflare Images to create optimized variants
    const { displayImageUrl, thumbnailImageUrl, originalImageUrl } = await processImageWithCloudflare(
      imageBuffer, 
      imageFile.name, 
      imageFile.type, 
      env,
      user.account_id,
      fileId
    );

    // Store the optimized variants in R2
    if (displayImageUrl && thumbnailImageUrl) {
      // Cloudflare Images processing succeeded - download and store variants
      const variants = [
        { url: displayImageUrl, path: displayPath, name: 'display' },
        { url: thumbnailImageUrl, path: thumbPath, name: 'thumbnail' }
      ];

      for (const variant of variants) {
        try {
          const response = await fetch(variant.url);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            await env.ARTWORK_IMAGES.put(variant.path, buffer, {
              httpMetadata: {
                contentType: 'image/webp', // Cloudflare Images serves WebP when possible
                cacheControl: 'public, max-age=31536000'
              }
            });
          }
        } catch (error) {
          console.error(`Failed to download and store ${variant.name} variant:`, error);
        }
      }
    } else {
      // Fallback: create basic display version (same as original for now)
      await env.ARTWORK_IMAGES.put(displayPath, imageBuffer, {
        httpMetadata: {
          contentType: imageFile.type,
          cacheControl: 'public, max-age=31536000'
        }
      });
      
      console.log('Using fallback: stored original as display variant');
    }

    // Generate public URLs using environment configuration
    const baseUrl = env.ARTWORK_IMAGES_BASE_URL;
    console.log('Upload baseUrl:', baseUrl);
    const imageUrl = `${baseUrl}/${displayPath}`;
    const thumbnailUrl = thumbnailImageUrl ? `${baseUrl}/${thumbPath}` : imageUrl; // Fallback to display if no thumbnail
    const originalUrl = `${baseUrl}/${originalPath}`;

    return withCors(new Response(JSON.stringify({
      message: 'Image uploaded successfully',
      fileId,
      imageUrl,
      thumbnailUrl,
      originalUrl,
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
 * Process image through Cloudflare Images API to create optimized variants
 * Uses Cloudflare Images free tier to generate display and thumbnail versions
 */
async function processImageWithCloudflare(imageBuffer, filename, mimeType, env, accountId, fileId) {
  try {
    // Upload to Cloudflare Images
    const uploadResult = await uploadToCloudflareImages(imageBuffer, filename, env);
    
    if (!uploadResult.success) {
      throw new Error(`Cloudflare Images upload failed: ${uploadResult.error}`);
    }
    
    const imageId = uploadResult.result.id;
    const accountHash = env.CLOUDFLARE_ACCOUNT_HASH;
    
    // Generate variant URLs using Cloudflare Images delivery URLs
    const baseImageUrl = `https://imagedelivery.net/${accountHash}/${imageId}`;
    
    return {
      displayImageUrl: `${baseImageUrl}/display`,     // 1200px max width variant
      thumbnailImageUrl: `${baseImageUrl}/thumbnail`, // 300x300px variant
      originalImageUrl: `${baseImageUrl}/original`,   // Original size variant
      cloudflareImageId: imageId
    };
    
  } catch (error) {
    console.error('Cloudflare Images processing error:', error);
    
    // Fallback: use original image for all variants
    // This ensures the upload doesn't fail if Cloudflare Images has issues
    console.warn('Falling back to original image for all variants');
    return {
      displayImageUrl: null,
      thumbnailImageUrl: null, 
      originalImageUrl: null,
      cloudflareImageId: null
    };
  }
}

/**
 * Upload image to Cloudflare Images API
 */
async function uploadToCloudflareImages(imageBuffer, filename, env) {
  const formData = new FormData();
  formData.append('file', new File([imageBuffer], filename));
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_IMAGES_TOKEN}`,
      },
      body: formData,
    }
  );
  
  const result = await response.json();
  
  if (!response.ok) {
    console.error('Cloudflare Images API error:', result);
    throw new Error(result.errors?.[0]?.message || 'Upload failed');
  }
  
  return result;
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : 'jpg';
}