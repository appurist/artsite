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
      SELECT p.id, p.public_profile, p.created_at, p.record, a.record as account_record
      FROM profiles p
      JOIN accounts a ON p.id = a.id
    `;

    if (!includePrivate) {
      query += ` WHERE p.public_profile = 1`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const profiles = await queryAll(env.DB, query);

    // Remove sensitive data for public listing
    const publicProfiles = profiles.map(profile => {
      const profileData = JSON.parse(profile.record);
      return {
        account_id: profile.id,
        display_name: profileData.display_name,
        bio: profileData.bio,
        statement: profileData.statement,
        avatar_url: profileData.avatar_url,
        website: profileData.website,
        instagram: profileData.instagram,
        twitter: profileData.twitter,
        location: profileData.location,
        created_at: profile.created_at
      };
    });

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
        SELECT p.id, p.public_profile, p.created_at, p.record, a.record as account_record
        FROM profiles p
        JOIN accounts a ON p.id = a.id
        WHERE p.id = ?
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
      isOwner = user.account_id === userId;
    } catch (e) {
      // Not authenticated, continue as public view
    }

    const profileData = JSON.parse(profile.record);
    const accountData = JSON.parse(profile.account_record);

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
      account_id: profile.id,
      display_name: profileData.display_name,
      bio: profileData.bio,
      statement: profileData.statement,
      avatar_url: profileData.avatar_url,
      website: profileData.website,
      instagram: profileData.instagram,
      twitter: profileData.twitter,
      location: profileData.location,
      created_at: profile.created_at
    };

    // Include private fields if owner
    if (isOwner) {
      responseProfile.phone = profileData.phone;
      responseProfile.public_profile = profile.public_profile;
      responseProfile.name = accountData.name;
      responseProfile.email = accountData.email;
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
      'SELECT id, public_profile, created_at, record FROM profiles WHERE id = ?',
      [user.account_id]
    );

    if (existingProfile) {
      // Update existing profile
      const updateFields = [];
      const params = [];

      if (profileData.displayName !== undefined) {
        updateFields.push(`'$.display_name', ?`);
        params.push(profileData.displayName);
      }
      if (profileData.bio !== undefined) {
        updateFields.push(`'$.bio', ?`);
        params.push(profileData.bio);
      }
      if (profileData.statement !== undefined) {
        updateFields.push(`'$.statement', ?`);
        params.push(profileData.statement);
      }
      if (profileData.avatarUrl !== undefined) {
        updateFields.push(`'$.avatar_url', ?`);
        params.push(profileData.avatarUrl);
      }
      if (profileData.website !== undefined) {
        updateFields.push(`'$.website', ?`);
        params.push(profileData.website);
      }
      if (profileData.instagram !== undefined) {
        updateFields.push(`'$.instagram', ?`);
        params.push(profileData.instagram);
      }
      if (profileData.twitter !== undefined) {
        updateFields.push(`'$.twitter', ?`);
        params.push(profileData.twitter);
      }
      if (profileData.location !== undefined) {
        updateFields.push(`'$.location', ?`);
        params.push(profileData.location);
      }
      if (profileData.phone !== undefined) {
        updateFields.push(`'$.phone', ?`);
        params.push(profileData.phone);
      }
      // Handle public_profile separately as it's a promoted column
      let publicProfileUpdate = '';
      if (profileData.publicProfile !== undefined) {
        publicProfileUpdate = ', public_profile = ?';
        params.push(profileData.publicProfile);
      }

      updateFields.push(`'$.updated_at', ?`);
      params.push(now);
      params.push(user.account_id);

      const query = `UPDATE profiles SET record = json_set(record, ${updateFields.join(', ')})${publicProfileUpdate} WHERE id = ?`;
      await executeQuery(env.DB, query, params);

    } else {
      // Create new profile
      const profileRecord = {
        display_name: profileData.displayName || null,
        bio: profileData.bio || null,
        statement: profileData.statement || null,
        avatar_url: profileData.avatarUrl || null,
        website: profileData.website || null,
        instagram: profileData.instagram || null,
        twitter: profileData.twitter || null,
        location: profileData.location || null,
        phone: profileData.phone || null,
        created_at: now,
        updated_at: now
      };

      const publicProfile = profileData.publicProfile !== undefined ? profileData.publicProfile : true;

      const query = `INSERT INTO profiles (id, public_profile, created_at, record) VALUES (?, ?, ?, ?)`;
      await executeQuery(env.DB, query, [
        user.account_id,
        publicProfile,
        now,
        JSON.stringify(profileRecord)
      ]);
    }

    // Fetch updated profile
    const updatedProfile = await queryFirst(
      env.DB,
      `
        SELECT p.id, p.public_profile, p.created_at, p.record, a.record as account_record
        FROM profiles p
        JOIN accounts a ON p.id = a.id
        WHERE p.id = ?
      `,
      [user.account_id]
    );

    const updatedProfileData = JSON.parse(updatedProfile.record);
    const accountData = JSON.parse(updatedProfile.account_record);

    return withCors(new Response(JSON.stringify({
      message: 'Profile updated successfully',
      profile: {
        ...updatedProfileData,
        public_profile: updatedProfile.public_profile,
        name: accountData.name,
        email: accountData.email
      }
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