/**
 * Main Cloudflare Worker entry point
 * Routes API requests to appropriate handlers
 */

import { router } from './shared/router.js';
import { corsHeaders } from './shared/cors.js';

// Import route handlers
import { handleAuth } from './auth/index.js';
import { handleArtworks } from './artworks/index.js';
import { handleProfiles } from './profiles/index.js';
import { handleProfile } from './profile/index.js';
import { handleSettings } from './settings/index.js';
import { handleUpload } from './upload/index.js';
import { handleDomains } from './domains/index.js';

/**
 * Handle image serving from R2 storage for local development
 */
async function handleImageServing(request, env, ctx) {
  try {
    const url = new URL(request.url);
    const imagePath = url.pathname.replace('/api/images/', '');
    
    if (!imagePath) {
      return new Response('Image path required', { status: 400 });
    }

    // Get image from R2 storage
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

export default {
  async fetch(request, env, ctx) {
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
        return await handleAuth(request, env, ctx);
      }
      
      if (path.startsWith('/api/artworks')) {
        return await handleArtworks(request, env, ctx);
      }
      
      if (path.startsWith('/api/profiles')) {
        return await handleProfiles(request, env, ctx);
      }
      
      if (path.startsWith('/api/profile')) {
        return await handleProfile(request, env, ctx);
      }
      
      if (path.startsWith('/api/settings')) {
        return await handleSettings(request, env, ctx);
      }
      
      if (path.startsWith('/api/upload')) {
        return await handleUpload(request, env, ctx);
      }
      
      if (path.startsWith('/api/domains')) {
        return await handleDomains(request, env, ctx);
      }
      
      if (path.startsWith('/api/images/')) {
        return await handleImageServing(request, env, ctx);
      }

      // Serve static files for non-API requests
      if (env.ASSETS) {
        const response = await env.ASSETS.fetch(request);
        
        // If the asset is not found, serve index.html for SPA routing
        if (response.status === 404) {
          const indexRequest = new Request(new URL('/', request.url), request);
          return await env.ASSETS.fetch(indexRequest);
        }
        
        return response;
      } else {
        // ASSETS binding not available
        return new Response('Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      
    } catch (error) {
      console.error('Worker error:', error);
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
};