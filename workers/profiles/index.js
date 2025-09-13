/**
 * Profiles API handlers
 */

import { withCors } from '../shared/cors.js';
import { authenticateRequest } from '../shared/auth.js';
import { 
  executeQuery,
  queryFirst,
  queryAll,
  generateId,
  getCurrentTimestamp
} from '../shared/db.js';

export async function handleProfiles(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Route profile endpoints
    if (path === '/api/profiles' && method === 'GET') {
      return await listProfiles(request, env);
    }
    
    if (path === '/api/profiles' && method === 'PUT') {
      return await updateProfile(request, env);
    }
    
    if (path.match(/^\/api\/profiles\/[^/]+$/) && method === 'GET') {
      return await getProfile(request, env);
    }

    return withCors(new Response(JSON.stringify({ 
      error: 'Endpoint not found' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Profiles error:', error);
    return withCors(new Response(JSON.stringify({ 
      error: 'Profiles error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * List all public profiles
 */
async function listProfiles(request, env) {
  try {
    const url = new URL(request.url);
    const includePrivate = url.searchParams.get('includePrivate') === 'true';

    let query = `
      SELECT p.*, u.name, u.email 
      FROM profiles p
      JOIN users u ON p.user_id = u.id
    `;

    if (!includePrivate) {
      query += ' WHERE p.public_profile = true';
    }

    query += ' ORDER BY p.created_at DESC';

    const profiles = await queryAll(env.DB, query);

    // Remove sensitive data for public listing
    const publicProfiles = profiles.map(profile => ({
      user_id: profile.user_id,
      display_name: profile.display_name,
      bio: profile.bio,
      statement: profile.statement,
      avatar_url: profile.avatar_url,
      website: profile.website,
      instagram: profile.instagram,
      twitter: profile.twitter,
      location: profile.location,
      created_at: profile.created_at
    }));

    return withCors(new Response(JSON.stringify({
      profiles: publicProfiles
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('List profiles error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to fetch profiles',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Get specific profile by user ID
 */
async function getProfile(request, env) {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();

    const profile = await queryFirst(
      env.DB,
      `
        SELECT p.*, u.name, u.email 
        FROM profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
      `,
      [userId]
    );

    if (!profile) {
      return withCors(new Response(JSON.stringify({
        error: 'Profile not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Check if profile is public or if user is requesting their own profile
    let isOwner = false;
    try {
      const user = await authenticateRequest(request, env.JWT_SECRET);
      isOwner = user.userId === userId;
    } catch (e) {
      // Not authenticated, continue as public view
    }

    if (!profile.public_profile && !isOwner) {
      return withCors(new Response(JSON.stringify({
        error: 'Profile is private'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Return appropriate fields based on ownership
    const responseProfile = {
      user_id: profile.user_id,
      display_name: profile.display_name,
      bio: profile.bio,
      statement: profile.statement,
      avatar_url: profile.avatar_url,
      website: profile.website,
      instagram: profile.instagram,
      twitter: profile.twitter,
      location: profile.location,
      created_at: profile.created_at
    };

    // Include private fields if owner
    if (isOwner) {
      responseProfile.phone = profile.phone;
      responseProfile.public_profile = profile.public_profile;
      responseProfile.name = profile.name;
      responseProfile.email = profile.email;
    }

    return withCors(new Response(JSON.stringify({
      profile: responseProfile
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Get profile error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to fetch profile',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Update user's own profile
 */
async function updateProfile(request, env) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    const profileData = await request.json();
    const now = getCurrentTimestamp();

    // Check if profile exists
    const existingProfile = await queryFirst(
      env.DB,
      'SELECT * FROM profiles WHERE user_id = ?',
      [user.userId]
    );

    if (existingProfile) {
      // Update existing profile
      const updateFields = [];
      const params = [];

      if (profileData.displayName !== undefined) {
        updateFields.push('display_name = ?');
        params.push(profileData.displayName);
      }
      if (profileData.bio !== undefined) {
        updateFields.push('bio = ?');
        params.push(profileData.bio);
      }
      if (profileData.statement !== undefined) {
        updateFields.push('statement = ?');
        params.push(profileData.statement);
      }
      if (profileData.avatarUrl !== undefined) {
        updateFields.push('avatar_url = ?');
        params.push(profileData.avatarUrl);
      }
      if (profileData.website !== undefined) {
        updateFields.push('website = ?');
        params.push(profileData.website);
      }
      if (profileData.instagram !== undefined) {
        updateFields.push('instagram = ?');
        params.push(profileData.instagram);
      }
      if (profileData.twitter !== undefined) {
        updateFields.push('twitter = ?');
        params.push(profileData.twitter);
      }
      if (profileData.location !== undefined) {
        updateFields.push('location = ?');
        params.push(profileData.location);
      }
      if (profileData.phone !== undefined) {
        updateFields.push('phone = ?');
        params.push(profileData.phone);
      }
      if (profileData.publicProfile !== undefined) {
        updateFields.push('public_profile = ?');
        params.push(profileData.publicProfile);
      }

      updateFields.push('updated_at = ?');
      params.push(now);
      params.push(user.userId);

      const query = `UPDATE profiles SET ${updateFields.join(', ')} WHERE user_id = ?`;
      await executeQuery(env.DB, query, params);

    } else {
      // Create new profile
      const query = `
        INSERT INTO profiles (
          user_id, display_name, bio, statement, avatar_url, 
          website, instagram, twitter, location, phone, 
          public_profile, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await executeQuery(env.DB, query, [
        user.userId,
        profileData.displayName || null,
        profileData.bio || null,
        profileData.statement || null,
        profileData.avatarUrl || null,
        profileData.website || null,
        profileData.instagram || null,
        profileData.twitter || null,
        profileData.location || null,
        profileData.phone || null,
        profileData.publicProfile !== undefined ? profileData.publicProfile : true,
        now,
        now
      ]);
    }

    // Fetch updated profile
    const updatedProfile = await queryFirst(
      env.DB,
      `
        SELECT p.*, u.name, u.email 
        FROM profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
      `,
      [user.userId]
    );

    return withCors(new Response(JSON.stringify({
      message: 'Profile updated successfully',
      profile: updatedProfile
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Update profile error:', error);
    
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
      error: 'Failed to update profile',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}