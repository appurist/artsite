/**
 * Health check API handler
 */

import { withCors } from '../shared/cors.js';

export async function handleHealth(request, env, ctx) {
  try {
    const healthData = {
      name: 'ARTSITE',
      version: '0.9.0',
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: env.ARTWORK_IMAGES_BASE_URL?.includes('localhost') ? 'local' : 'production',
      services: {
        database: 'OK',
        storage: 'OK'
      }
    };

    return withCors(new Response(JSON.stringify(healthData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }));

  } catch (error) {
    console.error('Health check error:', error);
    
    return withCors(new Response(JSON.stringify({
      name: 'ARTSITE',
      version: '0.9.0',
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  }
}