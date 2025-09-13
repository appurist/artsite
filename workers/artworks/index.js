/**
 * Artworks API handlers
 */

import { withCors } from '../shared/cors.js';
import { authenticateRequest } from '../shared/auth.js';
import { 
  createArtwork,
  getArtworks,
  getArtworkById,
  executeQuery,
  queryFirst,
  generateId,
  getCurrentTimestamp
} from '../shared/db.js';

export async function handleArtworks(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Route artwork endpoints
    if (path === '/api/artworks' && method === 'GET') {
      return await listArtworks(request, env);
    }
    
    if (path === '/api/artworks' && method === 'POST') {
      return await createArtworkHandler(request, env);
    }
    
    if (path.match(/^\/api\/artworks\/[^/]+$/) && method === 'GET') {
      return await getArtwork(request, env);
    }
    
    if (path.match(/^\/api\/artworks\/[^/]+$/) && method === 'PUT') {
      return await updateArtwork(request, env);
    }
    
    if (path.match(/^\/api\/artworks\/[^/]+$/) && method === 'DELETE') {
      return await deleteArtwork(request, env);
    }

    return withCors(new Response(JSON.stringify({ 
      error: 'Endpoint not found' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Artworks error:', error);
    return withCors(new Response(JSON.stringify({ 
      error: 'Artworks error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * List artworks with optional filtering
 */
async function listArtworks(request, env) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status') || 'published';
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;

    const artworks = await getArtworks(env.DB, {
      userId,
      status,
      page,
      limit
    });

    return withCors(new Response(JSON.stringify({
      artworks,
      pagination: {
        page,
        limit,
        hasMore: artworks.length === limit
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('List artworks error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to fetch artworks',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Create new artwork
 */
async function createArtworkHandler(request, env) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    const artworkData = await request.json();
    
    // Validate required fields
    if (!artworkData.title || !artworkData.image_url) {
      return withCors(new Response(JSON.stringify({
        error: 'Title and image URL are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Create artwork
    const artworkId = await createArtwork(env.DB, {
      userId: user.userId,
      title: artworkData.title,
      description: artworkData.description,
      medium: artworkData.medium,
      dimensions: artworkData.dimensions,
      yearCreated: artworkData.year_created,
      price: artworkData.price,
      tags: artworkData.tags || [],
      imageUrl: artworkData.image_url,
      thumbnailUrl: artworkData.thumbnail_url,
      storagePath: artworkData.storage_path,
      imageId: artworkData.image_id,
      originalUrl: artworkData.original_url,
      originalFilename: artworkData.original_filename,
      status: artworkData.status || 'published'
    });

    // Fetch the created artwork with user info
    const artwork = await getArtworkById(env.DB, artworkId);

    return withCors(new Response(JSON.stringify({
      message: 'Artwork created successfully',
      artwork
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Create artwork error:', error);
    
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
      error: 'Failed to create artwork',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Get single artwork by ID
 */
async function getArtwork(request, env) {
  try {
    const url = new URL(request.url);
    const artworkId = url.pathname.split('/').pop();

    const artwork = await getArtworkById(env.DB, artworkId);

    if (!artwork) {
      return withCors(new Response(JSON.stringify({
        error: 'Artwork not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Parse tags if they exist
    if (artwork.tags) {
      try {
        artwork.tags = JSON.parse(artwork.tags);
      } catch (e) {
        artwork.tags = [];
      }
    }

    return withCors(new Response(JSON.stringify({
      artwork
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Get artwork error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to fetch artwork',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Update artwork (only by owner)
 */
async function updateArtwork(request, env) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    const url = new URL(request.url);
    const artworkId = url.pathname.split('/').pop();
    
    // Check if artwork exists and user owns it
    const existingArtwork = await getArtworkById(env.DB, artworkId);
    if (!existingArtwork) {
      return withCors(new Response(JSON.stringify({
        error: 'Artwork not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (existingArtwork.user_id !== user.userId) {
      return withCors(new Response(JSON.stringify({
        error: 'Forbidden: You can only update your own artworks'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const updateData = await request.json();
    const now = getCurrentTimestamp();

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const params = [];

    if (updateData.title !== undefined) {
      updateFields.push('title = ?');
      params.push(updateData.title);
    }
    if (updateData.description !== undefined) {
      updateFields.push('description = ?');
      params.push(updateData.description);
    }
    if (updateData.medium !== undefined) {
      updateFields.push('medium = ?');
      params.push(updateData.medium);
    }
    if (updateData.dimensions !== undefined) {
      updateFields.push('dimensions = ?');
      params.push(updateData.dimensions);
    }
    if (updateData.yearCreated !== undefined) {
      updateFields.push('year_created = ?');
      params.push(updateData.yearCreated);
    }
    if (updateData.price !== undefined) {
      updateFields.push('price = ?');
      params.push(updateData.price);
    }
    if (updateData.tags !== undefined) {
      updateFields.push('tags = ?');
      params.push(JSON.stringify(updateData.tags));
    }
    if (updateData.status !== undefined) {
      updateFields.push('status = ?');
      params.push(updateData.status);
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = ?');
    params.push(now);
    params.push(artworkId);

    const query = `UPDATE artworks SET ${updateFields.join(', ')} WHERE id = ?`;
    await executeQuery(env.DB, query, params);

    // Fetch updated artwork
    const updatedArtwork = await getArtworkById(env.DB, artworkId);

    return withCors(new Response(JSON.stringify({
      message: 'Artwork updated successfully',
      artwork: updatedArtwork
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Update artwork error:', error);
    
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
      error: 'Failed to update artwork',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Delete artwork (only by owner)
 */
async function deleteArtwork(request, env) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    const url = new URL(request.url);
    const artworkId = url.pathname.split('/').pop();
    
    // Check if artwork exists and user owns it
    const existingArtwork = await getArtworkById(env.DB, artworkId);
    if (!existingArtwork) {
      return withCors(new Response(JSON.stringify({
        error: 'Artwork not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (existingArtwork.user_id !== user.userId) {
      return withCors(new Response(JSON.stringify({
        error: 'Forbidden: You can only delete your own artworks'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Delete the artwork
    await executeQuery(env.DB, 'DELETE FROM artworks WHERE id = ?', [artworkId]);

    // TODO: Also delete associated files from R2 storage
    // if (existingArtwork.storage_path) {
    //   await env.ARTWORK_IMAGES.delete(existingArtwork.storage_path);
    // }

    return withCors(new Response(JSON.stringify({
      message: 'Artwork deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Delete artwork error:', error);
    
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
      error: 'Failed to delete artwork',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}