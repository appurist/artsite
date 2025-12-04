/**
 * Cloudflare Pages Function - API Router
 * Handles all /api/* routes using dynamic routing
 */

// Import route handlers from workers directory
import { handleAuth } from '../../workers/auth/index.js';
import { handleArtworks } from '../../workers/artworks/index.js';
import { handleProfiles } from '../../workers/profiles/index.js';
import { handleProfile } from '../../workers/profile/index.js';
import { handleSettings } from '../../workers/settings/index.js';
import { handleUpload } from '../../workers/upload/index.js';
import { handleBackup } from '../../workers/backup/index.js';
import { handleHealth } from '../../workers/health/index.js';
import { corsHeaders } from '../../workers/shared/cors.js';
import { getCustomDomainUser } from '../../workers/shared/db.js';

/**
 * Handle image serving from R2 storage for local development only
 */
async function handleImageServing(request, env, ctx) {
  try {
    // Only serve images for local development (when ARTWORK_IMAGES_BASE_URL contains localhost)
    if (!env.ARTWORK_IMAGES_BASE_URL?.includes('localhost')) {
      return new Response('Image serving not available in this environment', { status: 404 });
    }

    const url = new URL(request.url);
    const imagePath = url.pathname.replace('/api/images/', '');
    
    if (!imagePath) {
      return new Response('Image path required', { status: 400 });
    }

    // Get image from R2 storage (local emulation)
    const object = await env.ARTWORK_IMAGES.get(imagePath);
    
    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    // Return the image with appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000');
    
    return new Response(object.body, { headers });
    
  } catch (error) {
    console.error('Image serving error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle custom domain user lookup for a domain
 */
async function handleCustomDomainUser(request, env, ctx) {
  try {
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const hostname = url.searchParams.get('hostname') || request.headers.get('host') || 'localhost';
    
    const customDomainUserId = await getCustomDomainUser(env.DB, hostname);
    
    return new Response(JSON.stringify({ 
      hostname: hostname.split(':')[0], 
      custom_domain_user_id: customDomainUserId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Custom domain user lookup error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get custom domain user',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route API requests
    if (path.startsWith('/api/auth/')) {
      return await handleAuth(request, env, context);
    }
    
    if (path.startsWith('/api/artworks')) {
      return await handleArtworks(request, env, context);
    }
    
    if (path.startsWith('/api/profiles')) {
      return await handleProfiles(request, env, context);
    }
    
    if (path.startsWith('/api/profile')) {
      return await handleProfile(request, env, context);
    }
    
    if (path.startsWith('/api/settings')) {
      return await handleSettings(request, env, context);
    }
    
    if (path.startsWith('/api/upload')) {
      return await handleUpload(request, env, context);
    }
    
    if (path === '/api/custom-domain-user') {
      return await handleCustomDomainUser(request, env, context);
    }
    
    if (path.startsWith('/api/backup')) {
      return await handleBackup(request, env, context);
    }
    
    if (path.startsWith('/api/health')) {
      return await handleHealth(request, env, context);
    }
    
    if (path.startsWith('/api/images/')) {
      return await handleImageServing(request, env, context);
    }

    // API route not found
    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('Pages Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}