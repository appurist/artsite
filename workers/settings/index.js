/**
 * Settings API handlers
 */

import { withCors } from '../shared/cors.js';
import { authenticateRequest } from '../shared/auth.js';
import { 
  executeQuery,
  queryFirst,
  getCurrentTimestamp
} from '../shared/db.js';

export async function handleSettings(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Route settings endpoints
    if (path === '/api/settings' && method === 'GET') {
      return await getSettings(request, env);
    }
    
    if (path.match(/^\/api\/settings\/[^/]+$/) && method === 'GET') {
      const userId = path.split('/')[3];
      return await getUserSettings(request, env, userId);
    }
    
    if (path === '/api/settings' && method === 'PUT') {
      return await updateSettings(request, env);
    }

    return withCors(new Response(JSON.stringify({ 
      error: 'Endpoint not found' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Settings error:', error);
    return withCors(new Response(JSON.stringify({ 
      error: 'Settings error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Get user's settings
 */
async function getSettings(request, env) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request, env.JWT_SECRET);

    const settingsRow = await queryFirst(
      env.DB,
      'SELECT * FROM settings WHERE account_id = ?',
      [user.account_id]
    );

    let settings = {};
    if (settingsRow && settingsRow.settings) {
      try {
        settings = JSON.parse(settingsRow.settings);
      } catch (e) {
        console.error('Error parsing settings JSON:', e);
        settings = {};
      }
    }

    // Provide default values for expected settings
    const defaultSettings = {
      site_title: '',
      artist_name: '',
      artist_bio: '',
      contact_email: '',
      contact_phone: '',
      gallery_description: '',
      primary_color: '#667eea',
      secondary_color: '#764ba2',
      theme: 'light',
      public_gallery: true,
      show_contact_info: true,
      enable_comments: false,
      enable_analytics: false
    };

    const mergedSettings = { ...defaultSettings, ...settings };

    return withCors(new Response(JSON.stringify({
      settings: mergedSettings
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Get settings error:', error);
    
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
      error: 'Failed to fetch settings',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Get settings for a specific user (public access for focus mode)
 */
async function getUserSettings(request, env, userId) {
  try {
    // No authentication required - this is for public display of focus user settings
    const settingsRow = await queryFirst(
      env.DB,
      'SELECT * FROM settings WHERE account_id = ?',
      [userId]
    );

    let settings = {};
    if (settingsRow && settingsRow.settings) {
      try {
        settings = JSON.parse(settingsRow.settings);
      } catch (e) {
        console.error('Error parsing settings JSON:', e);
        settings = {};
      }
    }

    // Only return public-safe settings for focus mode
    const publicSettings = {
      site_title: settings.site_title || '',
      artist_name: settings.artist_name || '',
      artist_bio: settings.artist_bio || '',
      contact_email: settings.contact_email || '',
      gallery_description: settings.gallery_description || '',
      primary_color: settings.primary_color || '#667eea',
      secondary_color: settings.secondary_color || '#764ba2'
    };

    return withCors(new Response(JSON.stringify({
      settings: publicSettings
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Get user settings error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to fetch user settings',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Update user's settings
 */
async function updateSettings(request, env) {
  try {
    // Authenticate user
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    const newSettings = await request.json();
    const now = getCurrentTimestamp();

    // Validate settings object
    if (!newSettings || typeof newSettings !== 'object') {
      return withCors(new Response(JSON.stringify({
        error: 'Invalid settings data'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Get current settings if they exist
    const existingSettingsRow = await queryFirst(
      env.DB,
      'SELECT * FROM settings WHERE account_id = ?',
      [user.account_id]
    );

    let currentSettings = {};
    if (existingSettingsRow && existingSettingsRow.settings) {
      try {
        currentSettings = JSON.parse(existingSettingsRow.settings);
      } catch (e) {
        console.error('Error parsing existing settings:', e);
        currentSettings = {};
      }
    }

    // Merge with new settings
    const mergedSettings = { ...currentSettings, ...newSettings };
    const settingsJson = JSON.stringify(mergedSettings);

    if (existingSettingsRow) {
      // Update existing settings
      await executeQuery(
        env.DB,
        'UPDATE settings SET settings = ?, updated_at = ? WHERE account_id = ?',
        [settingsJson, now, user.account_id]
      );
    } else {
      // Create new settings record
      await executeQuery(
        env.DB,
        'INSERT INTO settings (account_id, settings, updated_at) VALUES (?, ?, ?)',
        [user.account_id, settingsJson, now]
      );
    }

    return withCors(new Response(JSON.stringify({
      message: 'Settings updated successfully',
      settings: mergedSettings
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Update settings error:', error);
    
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
      error: 'Failed to update settings',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}