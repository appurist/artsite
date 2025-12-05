/**
 * Artist API handlers
 */

import { withCors } from '../shared/cors.js';
import { executeQuery, queryFirst } from '../shared/db.js';

export async function handleArtist(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Route artist endpoints
    if (path.match(/^\/api\/artist\/[^/]+$/) && method === 'GET') {
      return await getArtistProfile(request, env);
    }

    return withCors(new Response(JSON.stringify({ 
      error: 'Endpoint not found' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Artist error:', error);
    return withCors(new Response(JSON.stringify({ 
      error: 'Artist error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Get public artist profile by user ID
 */
async function getArtistProfile(request, env) {
  try {
    const url = new URL(request.url);
    const artistId = url.pathname.split('/').pop();

    // Get account and profile data
    const accountQuery = `
      SELECT a.id, a.email, p.record as profile_record, s.settings as settings_record
      FROM accounts a
      LEFT JOIN profiles p ON a.id = p.id
      LEFT JOIN settings s ON a.id = s.account_id
      WHERE a.id = ? AND p.public_profile = 1
    `;

    const result = await queryFirst(env.DB, accountQuery, [artistId]);

    if (!result) {
      return withCors(new Response(JSON.stringify({
        error: 'Artist not found or profile not public'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Parse profile and settings
    let profile = {};
    let settings = {};

    if (result.profile_record) {
      try {
        profile = JSON.parse(result.profile_record);
      } catch (e) {
        console.warn('Error parsing profile record:', e);
      }
    }

    if (result.settings_record) {
      try {
        settings = JSON.parse(result.settings_record);
      } catch (e) {
        console.warn('Error parsing settings record:', e);
      }
    }

    // Create public artist profile (only public information)
    const artistProfile = {
      id: result.id,
      name: profile.name || profile.display_name || settings.artist_name || 'Unknown Artist',
      bio: profile.bio || settings.artist_bio || '',
      avatar_url: profile.avatar_url || null,
      website: profile.website || settings.external_website || null,
      location: profile.location || null,
      // Add any other public fields as needed
    };

    // Get artwork count for this artist
    const artworkCountQuery = `
      SELECT COUNT(*) as count 
      FROM artworks 
      WHERE account_id = ? AND status = 'published'
    `;
    
    const countResult = await queryFirst(env.DB, artworkCountQuery, [artistId]);
    artistProfile.artwork_count = countResult?.count || 0;

    return withCors(new Response(JSON.stringify({
      artist: artistProfile
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Get artist profile error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to fetch artist profile',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}