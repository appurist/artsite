/**
 * Generic backup/restore system with component selection
 */

import { createZip } from 'littlezipper';
import JSZip from 'jszip';
import { authenticateRequest } from '../shared/auth.js';
import { withCors, corsHeaders } from '../shared/cors.js';
import { executeQuery, queryAll, queryFirst } from '../shared/db.js';

/**
 * Component-specific backup and restore handlers will be defined below
 */

/**
 * Generic backup endpoint with component selection
 */
export async function handleBackup(request, env, ctx) {
  const url = new URL(request.url);
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders } });
  }

  try {
    if (method === 'GET' && url.pathname === '/api/backup/create') {
      return await createBackup(request, env, ctx);
    }

    if (method === 'POST' && url.pathname === '/api/backup/restore') {
      return await restoreBackup(request, env, ctx);
    }

    if (method === 'GET' && url.pathname === '/api/backup/components') {
      return await getBackupComponents(request, env);
    }

    return withCors(new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Backup API error:', error);
    return withCors(new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Get available backup components
 */
async function getBackupComponents(request, env) {
  const components = Object.entries(BACKUP_COMPONENTS).map(([key, config]) => ({
    key,
    name: config.name,
    description: config.description
  }));

  return withCors(new Response(JSON.stringify({ components }), {
    headers: { 'Content-Type': 'application/json' }
  }));
}

/**
 * Create backup with selected components
 */
async function createBackup(request, env, ctx) {
  try {
    const user = await authenticateRequest(request, env.JWT_SECRET);
    const url = new URL(request.url);
    const selectedComponents = url.searchParams.get('components')?.split(',') || [];

    if (selectedComponents.length === 0) {
      return withCors(new Response(JSON.stringify({
        error: 'No components selected for backup'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Prepare files for ZIP creation
    const files = [];
    
    // Add backup metadata
    const backupMetadata = {
      export_date: new Date().toISOString(),
      user_id: user.account_id,
      components: selectedComponents,
      version: '1.0'
    };
    
    files.push({
      path: 'backup-metadata.json',
      data: JSON.stringify(backupMetadata, null, 2)
    });

    // Process each selected component
    const results = {};
    for (const componentKey of selectedComponents) {
      const component = BACKUP_COMPONENTS[componentKey];
      if (component) {
        try {
          console.log(`Backing up component: ${componentKey}`);
          const componentData = await component.handler(user, env, files);
          results[componentKey] = { success: true, ...componentData };
        } catch (error) {
          console.error(`Failed to backup ${componentKey}:`, error);
          results[componentKey] = { success: false, error: error.message };
        }
      }
    }

    // Add results summary
    files.push({
      path: 'backup-results.json',
      data: JSON.stringify(results, null, 2)
    });

    // Create ZIP using littlezipper
    const zipBuffer = await createZip(files);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const componentNames = selectedComponents.join('-');
    const filename = `artsite-backup-${componentNames}-${timestamp}.zip`;
    
    return withCors(new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    }));

  } catch (error) {
    console.error('Backup error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to create backup',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Restore backup with component selection
 */
async function restoreBackup(request, env, ctx) {
  try {
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    // Get uploaded ZIP file
    const formData = await request.formData();
    const zipFile = formData.get('backup');
    const selectedComponents = formData.get('components')?.split(',') || [];
    const restoreMode = formData.get('restore_mode') || 'add'; // 'add' or 'replace'
    
    if (!zipFile) {
      return withCors(new Response(JSON.stringify({
        error: 'No backup file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const zipBuffer = await zipFile.arrayBuffer();
    
    try {
      // Load ZIP with JSZip
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipBuffer);
      
      // Extract metadata
      const metadataFile = zipContent.file('backup-metadata.json');
      if (!metadataFile) {
        throw new Error('No backup metadata found in file');
      }
      
      const backupMetadata = JSON.parse(await metadataFile.async('text'));
      
      // Prepare entries object for restore handlers
      const entries = {};
      
      // Extract all files
      for (const fileName in zipContent.files) {
        const file = zipContent.files[fileName];
        if (!file.dir && fileName !== 'backup-metadata.json') {
          // Check if it's a text file or binary file
          if (fileName.endsWith('.json')) {
            entries[fileName] = await file.async('text');
          } else {
            entries[fileName] = await file.async('uint8array');
          }
        }
      }

      const restoreResults = {};
      
      // Process selected components
      for (const componentKey of selectedComponents) {
        if (backupMetadata.components.includes(componentKey)) {
          try {
            const component = BACKUP_COMPONENTS[componentKey];
            if (component && component.restoreHandler) {
              const restoreResult = await component.restoreHandler(user, env, entries, restoreMode);
              restoreResults[componentKey] = { success: true, ...restoreResult };
            } else {
              restoreResults[componentKey] = { success: false, error: 'Restore handler not implemented' };
            }
          } catch (error) {
            console.error(`Error restoring component ${componentKey}:`, error);
            restoreResults[componentKey] = { success: false, error: error.message };
          }
        } else {
          restoreResults[componentKey] = { success: false, error: 'Component not found in backup' };
        }
      }

      return withCors(new Response(JSON.stringify({
        message: 'Restore completed',
        results: restoreResults,
        backup_date: backupMetadata.export_date
      }), {
        headers: { 'Content-Type': 'application/json' }
      }));

    } catch (error) {
      console.error('ZIP processing error:', error);
      return withCors(new Response(JSON.stringify({
        error: 'Failed to process backup file',
        details: error.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

  } catch (error) {
    console.error('Restore error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to restore backup',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Component-specific backup handlers
 */

async function backupArtworksComponent(user, env, files) {
  const artworks = await queryAll(
    env.DB,
    'SELECT * FROM artworks WHERE account_id = ? ORDER BY created_at ASC',
    [user.account_id]
  );

  if (artworks.length === 0) {
    return { count: 0, message: 'No artworks found' };
  }

  // Add artworks metadata to art/ folder
  const artworksData = artworks.map(artwork => ({
    ...artwork,
    tags: artwork.tags ? JSON.parse(artwork.tags) : []
  }));
  
  files.push({
    path: 'art/artworks.json',
    data: JSON.stringify(artworksData, null, 2)
  });

  // Add image files to art/images/
  let imageCount = 0;
  for (const artwork of artworks) {
    if (artwork.storage_path) {
      try {
        const imageObject = await env.ARTWORK_IMAGES.get(artwork.storage_path);
        if (imageObject) {
          const imageBuffer = await imageObject.arrayBuffer();
          const filename = `art/images/${artwork.id}-${artwork.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
          files.push({
            path: filename,
            data: new Uint8Array(imageBuffer)
          });
          imageCount++;
        }
      } catch (error) {
        console.warn(`Failed to backup image for artwork ${artwork.id}:`, error);
      }
    }
  }

  return { count: artworks.length, images: imageCount };
}

async function backupSettingsComponent(user, env, files) {
  const settings = await queryFirst(
    env.DB,
    'SELECT * FROM settings WHERE account_id = ?',
    [user.account_id]
  );

  const settingsData = settings ? JSON.parse(settings.settings) : {};
  
  files.push({
    path: 'site/settings.json',
    data: JSON.stringify(settingsData, null, 2)
  });

  return { count: Object.keys(settingsData).length };
}

async function backupProfileComponent(user, env, files) {
  const profile = await queryFirst(
    env.DB,
    'SELECT * FROM profiles WHERE id = ?',
    [user.account_id]
  );

  const profileData = profile ? JSON.parse(profile.record) : {};
  
  files.push({
    path: 'profile/profile.json',
    data: JSON.stringify(profileData, null, 2)
  });

  // Backup avatar if it exists
  let avatarBackedUp = false;
  if (profileData.avatar_url && profileData.avatar_type === 'uploaded') {
    try {
      // Extract avatar path from URL
      const url = new URL(profileData.avatar_url);
      const avatarPath = url.pathname.split('/api/images/')[1];
      
      if (avatarPath) {
        const avatarObject = await env.ARTWORK_IMAGES.get(avatarPath);
        if (avatarObject) {
          const avatarBuffer = await avatarObject.arrayBuffer();
          const extension = avatarPath.split('.').pop();
          files.push({
            path: `profile/avatar.${extension}`,
            data: new Uint8Array(avatarBuffer)
          });
          avatarBackedUp = true;
        }
      }
    } catch (error) {
      console.warn('Failed to backup avatar:', error);
    }
  }

  return { hasProfile: !!profile, avatarBackedUp };
}

/**
 * Component-specific restore handlers
 */

async function restoreArtworksComponent(user, env, entries, restoreMode = 'add') {
  let restored = 0;
  let skipped = 0;
  let deleted = 0;

  // If replace mode, delete all existing artworks first
  if (restoreMode === 'replace') {
    const existingArtworks = await queryAll(
      env.DB,
      'SELECT id, storage_path FROM artworks WHERE account_id = ?',
      [user.account_id]
    );

    // Delete images from storage
    for (const artwork of existingArtworks) {
      if (artwork.storage_path) {
        try {
          await env.ARTWORK_IMAGES.delete(artwork.storage_path);
          console.log(`Deleted image: ${artwork.storage_path}`);
        } catch (error) {
          // 404/not found is success - file is already gone
          if (error.message?.includes('404') || error.message?.includes('not found')) {
            console.log(`File already deleted (continuing): ${artwork.storage_path}`);
          } else {
            console.warn(`Failed to delete image ${artwork.storage_path}:`, error);
          }
        }
      }
    }

    // Delete all artworks from database
    await executeQuery(env.DB, 'DELETE FROM artworks WHERE account_id = ?', [user.account_id]);
    deleted = existingArtworks.length;
  }

  // Parse artworks metadata
  const artworksData = entries['art/artworks.json'] 
    ? JSON.parse(entries['art/artworks.json']) 
    : [];

  for (const artwork of artworksData) {
    try {
      // Check if artwork already exists (only in add mode)
      if (restoreMode === 'add') {
        const existing = await queryFirst(
          env.DB,
          'SELECT id FROM artworks WHERE id = ? AND account_id = ?',
          [artwork.id, user.account_id]
        );

        if (existing) {
          skipped++;
          continue;
        }
      }

      // Restore image if present, or update URLs to current environment
      let storage_path = null;
      let image_url = null;
      const imagePath = `art/images/${artwork.id}-${artwork.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      
      if (entries[imagePath]) {
        // Image file exists in backup - restore it
        storage_path = `artworks/${user.account_id}/${artwork.id}/restored.jpg`;
        await env.ARTWORK_IMAGES.put(storage_path, entries[imagePath], {
          httpMetadata: { contentType: 'image/jpeg' }
        });
        image_url = `${env.ARTWORK_IMAGES_BASE_URL}/${storage_path}`;
      } else if (artwork.storage_path) {
        // No image file in backup, but metadata has storage info
        // Update storage path and URL to match current user and environment
        const pathParts = artwork.storage_path.split('/');
        if (pathParts.length >= 3) {
          // Update account_id in storage path: artworks/[old_account_id]/[artwork_id]/file.ext
          storage_path = `artworks/${user.account_id}/${pathParts[2]}/${pathParts[3] || 'original.jpg'}`;
          image_url = `${env.ARTWORK_IMAGES_BASE_URL}/${storage_path}`;
        }
      }

      // Insert artwork record
      await executeQuery(env.DB, `
        INSERT INTO artworks (
          id, account_id, title, description, medium, dimensions, 
          year_created, price, tags, image_url, storage_path,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        artwork.id,
        user.account_id,
        artwork.title,
        artwork.description,
        artwork.medium,
        artwork.dimensions,
        artwork.year_created,
        artwork.price,
        JSON.stringify(artwork.tags || []),
        image_url,
        storage_path,
        'published',
        artwork.created_at,
        new Date().toISOString()
      ]);

      restored++;
    } catch (error) {
      console.error(`Failed to restore artwork ${artwork.id}:`, error);
      skipped++;
    }
  }

  return { restored, skipped, deleted, total: artworksData.length, mode: restoreMode };
}

async function restoreSettingsComponent(user, env, entries, restoreMode = 'add') {
  if (!entries['site/settings.json']) {
    return { restored: 0, message: 'No settings data in backup' };
  }

  try {
    const settingsData = JSON.parse(entries['site/settings.json']);
    
    // Check if settings exist for this user
    const existing = await queryFirst(
      env.DB,
      'SELECT account_id FROM settings WHERE account_id = ?',
      [user.account_id]
    );

    if (existing) {
      // Update existing settings
      await executeQuery(env.DB,
        'UPDATE settings SET settings = ?, updated_at = ? WHERE account_id = ?',
        [JSON.stringify(settingsData), new Date().toISOString(), user.account_id]
      );
    } else {
      // Create new settings record (only account_id, settings, updated_at)
      await executeQuery(env.DB, `
        INSERT INTO settings (account_id, settings, updated_at)
        VALUES (?, ?, ?)
      `, [
        user.account_id,
        JSON.stringify(settingsData),
        new Date().toISOString()
      ]);
    }

    return { restored: 1, settingsCount: Object.keys(settingsData).length };
  } catch (error) {
    throw new Error(`Failed to restore settings: ${error.message}`);
  }
}

async function restoreProfileComponent(user, env, entries, restoreMode = 'add') {
  if (!entries['profile/profile.json']) {
    return { restored: 0, message: 'No profile data in backup' };
  }

  try {
    const profileData = JSON.parse(entries['profile/profile.json']);
    
    // Restore avatar if present
    let avatarRestored = false;
    if (profileData.avatar_type === 'uploaded') {
      // Look for avatar files
      const avatarFiles = Object.keys(entries).filter(key => key.startsWith('profile/avatar.'));
      if (avatarFiles.length > 0) {
        const avatarFile = avatarFiles[0];
        const extension = avatarFile.split('.').pop();
        const avatarPath = `avatars/${user.account_id}/restored.${extension}`;
        
        await env.ARTWORK_IMAGES.put(avatarPath, entries[avatarFile], {
          httpMetadata: { contentType: `image/${extension}` }
        });
        
        // Update profile data with new avatar URL
        profileData.avatar_url = `${env.ARTWORK_IMAGES_BASE_URL}/${avatarPath}`;
        avatarRestored = true;
      }
    }

    // Check if profile exists for this user
    const existing = await queryFirst(
      env.DB,
      'SELECT id FROM profiles WHERE id = ?',
      [user.account_id]
    );

    if (existing) {
      // Update existing profile (profiles table doesn't have updated_at)
      await executeQuery(env.DB,
        'UPDATE profiles SET record = ? WHERE id = ?',
        [JSON.stringify(profileData), user.account_id]
      );
    } else {
      // Create new profile record (only id, record, created_at)
      await executeQuery(env.DB, `
        INSERT INTO profiles (id, record, created_at)
        VALUES (?, ?, ?)
      `, [
        user.account_id,
        JSON.stringify(profileData),
        new Date().toISOString()
      ]);
    }

    return { restored: 1, avatarRestored };
  } catch (error) {
    throw new Error(`Failed to restore profile: ${error.message}`);
  }
}

/**
 * Component-specific backup handlers configuration
 */
const BACKUP_COMPONENTS = {
  artworks: {
    name: 'Artworks',
    description: 'All artwork images and metadata',
    handler: backupArtworksComponent,
    restoreHandler: restoreArtworksComponent
  },
  settings: {
    name: 'Site Settings',
    description: 'Site configuration and preferences',
    handler: backupSettingsComponent,
    restoreHandler: restoreSettingsComponent
  },
  profile: {
    name: 'Profile',
    description: 'Profile information and avatar',
    handler: backupProfileComponent,
    restoreHandler: restoreProfileComponent
  }
};