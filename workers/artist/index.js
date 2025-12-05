/**
 * Artist API handlers
 */

import { withCors } from '../shared/cors.js';
import { executeQuery, queryFirst } from '../shared/db.js';

export async function handleArtist(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  console.log('Artist handler called:', { path, method });

  try {
    const pattern = /^\/api\/artist\/[^/]+$/;
    const matches = path.match(pattern);
    console.log('Pattern match:', { path, pattern: pattern.toString(), matches, method });
    
    // Route artist endpoints
    if (matches && method === 'GET') {
      console.log('Routing to getArtistProfile');
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
    
    console.log('Artist profile request:', { url: url.pathname, artistId });

    // Get account and profile data by UUID
    const accountQuery = `
      SELECT a.id, a.email, a.record as account_record, p.record as profile_record, s.settings as settings_record
      FROM accounts a
      LEFT JOIN profiles p ON a.id = p.id
      LEFT JOIN settings s ON a.id = s.account_id
      WHERE a.id = ?
    `;

    const result = await queryFirst(env.DB, accountQuery, [artistId]);
    
    console.log('Database query result:', { artistId, found: !!result, result });

    if (!result) {
      console.log('Artist not found in database for ID:', artistId);
      return withCors(new Response(JSON.stringify({
        error: 'Artist not found or profile not public'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Parse account, profile and settings
    let account = {};
    let profile = {};
    let settings = {};

    if (result.account_record) {
      try {
        account = JSON.parse(result.account_record);
      } catch (e) {
        console.warn('Error parsing account record:', e);
      }
    }

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
      name: profile.name || profile.display_name || settings.artist_name || account.name || 'Unknown Artist',
      bio: profile.bio || settings.artist_bio || '',
      avatar_url: profile.avatar_url || null,
      avatar_type: profile.avatar_type || 'initials',
      website: profile.website || settings.external_website || null,
      location: profile.location || null,
      // Add any other public fields as needed
    };

    // Get artwork count for this artist (always use the account UUID)
    const artworkCountQuery = `
      SELECT COUNT(*) as count 
      FROM artworks 
      WHERE account_id = ? AND status = 'published'
    `;
    
    const countResult = await queryFirst(env.DB, artworkCountQuery, [result.id]);
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