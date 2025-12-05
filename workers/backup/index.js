/**
 * Generic backup/restore system with component selection
 */

import { createZip } from 'littlezipper';
import JSZip from 'jszip';
import { authenticateRequest } from '../shared/auth.js';
import { withCors, corsHeaders } from '../shared/cors.js';
import { executeQuery, queryAll, queryFirst, generateId, getCurrentTimestamp } from '../shared/db.js';

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

    if (method === 'POST' && url.pathname === '/api/backup/restore-meta') {
      return await restoreBackupMeta(request, env, ctx);
    }

    if (method === 'POST' && url.pathname === '/api/backup/restore-image') {
      return await restoreBackupImage(request, env, ctx);
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
      console.log('Starting ZIP processing, buffer size:', zipBuffer.byteLength);
      const zip = new JSZip();
      console.log('JSZip instance created');
      const zipContent = await zip.loadAsync(zipBuffer);
      console.log('ZIP loaded successfully, files found:', Object.keys(zipContent.files).length);
      
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
      console.log('Processing components:', selectedComponents);
      for (const componentKey of selectedComponents) {
        console.log(`Processing component: ${componentKey}`);
        if (backupMetadata.components.includes(componentKey)) {
          try {
            const component = BACKUP_COMPONENTS[componentKey];
            if (component && component.restoreHandler) {
              console.log(`Calling restore handler for ${componentKey}`);
              const restoreResult = await component.restoreHandler(user, env, entries, restoreMode);
              console.log(`Restore result for ${componentKey}:`, restoreResult);
              restoreResults[componentKey] = { success: true, ...restoreResult };
            } else {
              console.log(`No restore handler for ${componentKey}`);
              restoreResults[componentKey] = { success: false, error: 'Restore handler not implemented' };
            }
          } catch (error) {
            console.error(`Error restoring component ${componentKey}:`, error);
            restoreResults[componentKey] = { success: false, error: error.message };
          }
        } else {
          console.log(`Component ${componentKey} not found in backup`);
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
 * Restore metadata only (profile, settings, artworks without images)
 */
async function restoreBackupMeta(request, env, ctx) {
  try {
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    // Parse JSON payload
    const payload = await request.json();
    const { components: selectedComponents, restore_mode: restoreMode = 'add', backup_metadata: backupMetadata, entries } = payload;

    if (!backupMetadata || !entries) {
      return withCors(new Response(JSON.stringify({ 
        error: 'Invalid payload - missing backup_metadata or entries' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    if (!selectedComponents || selectedComponents.length === 0) {
      return withCors(new Response(JSON.stringify({ 
        error: 'No components specified for restore' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    console.log('Backup metadata:', backupMetadata);
    console.log('Available entries:', Object.keys(entries));

    const restoreResults = {};
    const artworkIdMapping = {};

    // Process each component (metadata only)
    for (const componentKey of selectedComponents) {
      if (backupMetadata.components.includes(componentKey)) {
        try {
          const component = BACKUP_COMPONENTS[componentKey];
          if (component && component.restoreMetaHandler) {
            const restoreResult = await component.restoreMetaHandler(user, env, entries, restoreMode, artworkIdMapping);
            restoreResults[componentKey] = { success: true, ...restoreResult };
          } else if (componentKey === 'artworks') {
            // Special handling for artworks metadata
            const restoreResult = await restoreArtworksMetaOnly(user, env, entries, restoreMode, artworkIdMapping);
            restoreResults[componentKey] = { success: true, ...restoreResult };
          } else if (componentKey === 'settings') {
            const restoreResult = await restoreSettingsComponent(user, env, entries, restoreMode);
            restoreResults[componentKey] = { success: true, ...restoreResult };
          } else if (componentKey === 'profile') {
            const restoreResult = await restoreProfileMetaOnly(user, env, entries, restoreMode);
            restoreResults[componentKey] = { success: true, ...restoreResult };
          } else {
            restoreResults[componentKey] = { success: false, error: 'Meta restore handler not implemented' };
          }
        } catch (error) {
          console.error(`Error restoring component ${componentKey}:`, error);
          restoreResults[componentKey] = { success: false, error: error.message };
        }
      }
    }

    return withCors(new Response(JSON.stringify({
      message: 'Metadata restore completed',
      results: restoreResults,
      artworkIdMapping: artworkIdMapping,
      backup_date: backupMetadata.export_date
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Restore meta error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to restore metadata',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Restore single image for an artwork
 */
async function restoreBackupImage(request, env, ctx) {
  try {
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    // Parse form data
    const formData = await request.formData();
    const artworkId = formData.get('artwork_id');
    const imageFile = formData.get('image');
    const originalFilename = formData.get('original_filename');

    if (!artworkId || !imageFile) {
      return withCors(new Response(JSON.stringify({ 
        error: 'Missing artwork_id or image file' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Verify artwork belongs to user
    console.log(`Looking for artwork ID: ${artworkId} for user: ${user.account_id}`);
    const artwork = await queryFirst(env.DB, 
      'SELECT id, account_id FROM artworks WHERE id = ? AND account_id = ?',
      [artworkId, user.account_id]
    );
    console.log(`Artwork found:`, artwork);

    if (!artwork) {
      // Additional debugging - check if artwork exists for any user
      const anyArtwork = await queryFirst(env.DB, 'SELECT id, account_id FROM artworks WHERE id = ?', [artworkId]);
      console.log(`Artwork exists for any user:`, anyArtwork);
      
      return withCors(new Response(JSON.stringify({ 
        error: 'Artwork not found or access denied',
        debug: { artworkId, userId: user.account_id, anyArtwork: !!anyArtwork }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Process and upload image  
    const imageBuffer = await imageFile.arrayBuffer();
    // Simple approach: use artwork ID as filename since each artwork has its own folder
    const storage_path = `artworks/${user.account_id}/${artworkId}.jpg`;
    
    // Store original image in R2
    await env.ARTWORK_IMAGES.put(storage_path, imageBuffer, {
      httpMetadata: { contentType: 'image/jpeg' }
    });
    
    const image_url = `${env.ARTWORK_IMAGES_BASE_URL}/${storage_path}`;

    // Update artwork with image info
    const now = getCurrentTimestamp();
    await executeQuery(env.DB, `
      UPDATE artworks SET 
        image_url = ?, storage_path = ?, updated_at = ?
      WHERE id = ? AND account_id = ?
    `, [image_url, storage_path, now, artworkId, user.account_id]);

    // Queue for Cloudflare Images optimization
    await queueImageOptimization(env, {
      artworkId: artworkId,
      accountId: user.account_id,
      imagePath: storage_path,
      imageUrl: image_url,
      type: 'artwork'
    });

    return withCors(new Response(JSON.stringify({
      message: 'Image restored successfully',
      artwork_id: artworkId,
      image_url: image_url,
      storage_path: storage_path
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Restore image error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to restore image',
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

  // Include all images in backup - chunked restore handles Worker limits
  let imageCount = 0;
  const maxImages = artworks.length; // Include all images
  let processedCount = 0;
  
  for (const artwork of artworks) {
    if (artwork.storage_path && imageCount < maxImages) {
      try {
        const imageObject = await env.ARTWORK_IMAGES.get(artwork.storage_path);
        if (imageObject) {
          // Check file size before loading into memory
          const size = imageObject.size;
          if (size && size < 5 * 1024 * 1024) { // Only include images under 5MB
            const imageBuffer = await imageObject.arrayBuffer();
            const filename = `art/images/${artwork.id}-${artwork.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
            files.push({
              path: filename,
              data: new Uint8Array(imageBuffer)
            });
            imageCount++;
          }
        }
      } catch (error) {
        console.warn(`Failed to backup image for artwork ${artwork.id}:`, error);
      }
    }
    processedCount++;
  }

  // Add a note about image limitations
  if (artworks.length > maxImages || processedCount > imageCount) {
    files.push({
      path: 'art/IMAGES_NOTE.txt',
      data: `Image Backup Information

Image files are not embedded in backup to avoid size limits.
Images will be restored by downloading from their current URLs.

Total artworks: ${artworks.length}
Images will be downloaded during restore: ${artworks.length}

All artwork metadata is preserved. Skipped images remain accessible via their original URLs.
Generated: ${new Date().toISOString()}
`
    });
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

/**
 * Restore artwork metadata only (no images)
 */
async function restoreArtworksMetaOnly(user, env, entries, restoreMode = 'add', artworkIdMapping = {}) {
  let restored = 0;
  let skipped = 0;
  let deleted = 0;

  console.log(`Starting artwork metadata restore for user ${user.account_id}, mode: ${restoreMode}`);

  // If replace mode, delete all existing artworks first
  if (restoreMode === 'replace') {
    const existingArtworks = await queryAll(
      env.DB,
      'SELECT id, storage_path FROM artworks WHERE account_id = ?',
      [user.account_id]
    );

    console.log(`Deleting ${existingArtworks.length} existing artworks in replace mode`);

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

  console.log(`Found ${artworksData.length} artworks in backup metadata`);
  if (artworksData.length > 0) {
    console.log('Sample artwork:', artworksData[0]);
  }

  for (const artwork of artworksData) {
    try {
      // Generate new artwork ID for this instance (never trust IDs from backup)
      const newArtworkId = generateId();
      const now = getCurrentTimestamp();
      
      // Store mapping of old ID to new ID for image restoration
      artworkIdMapping[artwork.id] = newArtworkId;
      
      // Check if artwork with same title already exists (for add mode)
      let existing = null;
      if (restoreMode === 'add') {
        existing = await queryFirst(
          env.DB,
          'SELECT id FROM artworks WHERE title = ? AND account_id = ?',
          [artwork.title, user.account_id]
        );
      }

      if (existing && restoreMode === 'add') {
        // Keep track of existing artwork for image restoration
        artworkIdMapping[artwork.id] = existing.id;
        skipped++;
        continue;
      } else {
        // Insert new artwork record (no images yet)
        await executeQuery(env.DB, `
          INSERT INTO artworks (
            id, account_id, title, description, medium, dimensions, 
            year_created, price, tags, image_url, thumbnail_url, display_url, original_url, storage_path,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newArtworkId,
          user.account_id,
          artwork.title,
          artwork.description,
          artwork.medium,
          artwork.dimensions,
          artwork.year_created,
          artwork.price,
          JSON.stringify(artwork.tags || []),
          null, // image_url - will be set during image restoration
          null, // thumbnail_url
          null, // display_url
          null, // original_url
          null, // storage_path
          'published',
          now,
          now
        ]);
      }

      restored++;
    } catch (error) {
      console.error(`Failed to restore artwork metadata ${artwork.id}:`, error);
      skipped++;
    }
  }

  return { restored, skipped, deleted, total: artworksData.length, mode: restoreMode, artworkIdMapping };
}

/**
 * Restore profile metadata only (no avatar image)
 */
async function restoreProfileMetaOnly(user, env, entries, restoreMode = 'add') {
  if (!entries['profile/profile.json']) {
    return { restored: 0, message: 'No profile data in backup' };
  }

  try {
    const profileData = JSON.parse(entries['profile/profile.json']);
    
    // Remove avatar URLs - will be restored separately if needed
    profileData.avatar_url = null;
    profileData.avatar_small_url = null;
    profileData.avatar_medium_url = null;

    // Check if profile exists for this user
    const existing = await queryFirst(
      env.DB,
      'SELECT id FROM profiles WHERE id = ?',
      [user.account_id]
    );

    if (existing) {
      // Update existing profile
      await executeQuery(env.DB,
        'UPDATE profiles SET record = ? WHERE id = ?',
        [JSON.stringify(profileData), user.account_id]
      );
    } else {
      // Create new profile
      await executeQuery(env.DB,
        'INSERT INTO profiles (id, record) VALUES (?, ?)',
        [user.account_id, JSON.stringify(profileData)]
      );
    }

    return { restored: 1 };
  } catch (error) {
    console.error('Profile restore error:', error);
    throw error;
  }
}

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
      // Generate new artwork ID for this instance (never trust IDs from backup)
      const newArtworkId = generateId();
      const now = getCurrentTimestamp();
      
      // Check if artwork with same title already exists (for add mode)
      let existing = null;
      if (restoreMode === 'add') {
        existing = await queryFirst(
          env.DB,
          'SELECT id FROM artworks WHERE title = ? AND account_id = ?',
          [artwork.title, user.account_id]
        );
      }

      // Handle image restoration based on backup format
      let storage_path = null;
      let image_url = null;
      let thumbnail_url = null;
      let display_url = null;
      let original_url = null;
      const imagePath = `art/images/${artwork.id}-${artwork.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      
      if (entries[imagePath]) {
        // Legacy backup with image files - store immediately, optimize later
        storage_path = `artworks/${user.account_id}/${newArtworkId}/restored.jpg`;
        await env.ARTWORK_IMAGES.put(storage_path, entries[imagePath], {
          httpMetadata: { contentType: 'image/jpeg' }
        });
        image_url = `${env.ARTWORK_IMAGES_BASE_URL}/${storage_path}`;
        
        // Queue for optimization
        await queueImageOptimization(env, {
          artworkId: newArtworkId,
          accountId: user.account_id,
          imagePath: storage_path,
          imageUrl: image_url,
          type: 'artwork'
        });
        
      } else if (artwork.storage_path) {
        // New backup format - fetch and store immediately, optimize later
        try {
          if (artwork.image_url) {
            const imageResponse = await fetch(artwork.image_url);
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer();
              storage_path = `artworks/${user.account_id}/${newArtworkId}/restored.jpg`;
              await env.ARTWORK_IMAGES.put(storage_path, imageBuffer, {
                httpMetadata: { contentType: 'image/jpeg' }
              });
              image_url = `${env.ARTWORK_IMAGES_BASE_URL}/${storage_path}`;
              
              // Queue for optimization
              await queueImageOptimization(env, {
                artworkId: newArtworkId,
                accountId: user.account_id,
                imagePath: storage_path,
                imageUrl: image_url,
                type: 'artwork'
              });
            } else {
              // Image not accessible, clear the image references
              storage_path = null;
              image_url = null;
            }
          } else {
            // No image URL available, clear references
            storage_path = null;
            image_url = null;
          }
        } catch (error) {
          console.warn(`Failed to fetch and process image for artwork ${artwork.id}:`, error);
          // Clear image references if we can't fetch the image
          storage_path = null;
          image_url = null;
        }
      }

      if (existing && restoreMode === 'add') {
        // Update existing artwork with restored image info if we have images
        if (image_url) {
          await executeQuery(env.DB, `
            UPDATE artworks SET 
              image_url = ?, thumbnail_url = ?, display_url = ?, original_url = ?, storage_path = ?, updated_at = ?
            WHERE id = ? AND account_id = ?
          `, [
            image_url,
            thumbnail_url,
            display_url, 
            original_url,
            storage_path,
            now,
            existing.id,
            user.account_id
          ]);
        }
        skipped++;
        continue;
      } else {
        // Insert new artwork record (always use new ID and current user's account_id)
        await executeQuery(env.DB, `
          INSERT INTO artworks (
            id, account_id, title, description, medium, dimensions, 
            year_created, price, tags, image_url, thumbnail_url, display_url, original_url, storage_path,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newArtworkId,
          user.account_id,
          artwork.title,
          artwork.description,
          artwork.medium,
          artwork.dimensions,
          artwork.year_created,
          artwork.price,
          JSON.stringify(artwork.tags || []),
          image_url,
          thumbnail_url,
          display_url,
          original_url,
          storage_path,
          'published',
          now,
          now
        ]);
      }

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
        const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        
        // Store avatar immediately, optimize later
        const avatarPath = `avatars/${user.account_id}/restored.${extension}`;
        await env.ARTWORK_IMAGES.put(avatarPath, entries[avatarFile], {
          httpMetadata: { contentType: mimeType }
        });
        
        // Update profile data with R2 avatar URL
        profileData.avatar_url = `${env.ARTWORK_IMAGES_BASE_URL}/${avatarPath}`;
        avatarRestored = true;
        
        // Queue for optimization
        await queueImageOptimization(env, {
          accountId: user.account_id,
          imagePath: avatarPath,
          imageUrl: profileData.avatar_url,
          type: 'avatar'
        });
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
/**
 * Process image with Cloudflare Images during restore
 */
async function processImageWithCloudflareRestore(imageBuffer, filename, mimeType, env, artworkId) {
  try {
    // Upload to Cloudflare Images
    const uploadResult = await uploadToCloudflareImagesRestore(imageBuffer, filename, mimeType, env);
    
    if (uploadResult.success && uploadResult.result?.id) {
      const accountHash = env.CLOUDFLARE_ACCOUNT_HASH;
      const imageId = uploadResult.result.id;
      const baseImageUrl = `https://imagedelivery.net/${accountHash}/${imageId}`;
      
      return {
        displayImageUrl: `${baseImageUrl}/display`,
        thumbnailImageUrl: `${baseImageUrl}/thumbnail`, 
        originalImageUrl: `${baseImageUrl}/original`,
        storagePath: null // Not using R2 storage path for Cloudflare Images
      };
    } else {
      throw new Error('Cloudflare Images upload failed: ' + JSON.stringify(uploadResult));
    }
  } catch (error) {
    console.warn('Cloudflare Images processing failed during restore:', error);
    return null; // Will trigger fallback to R2
  }
}

/**
 * Upload to Cloudflare Images during restore
 */
async function uploadToCloudflareImagesRestore(imageBuffer, filename, mimeType, env) {
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append('file', blob, filename);

  const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_IMAGES_TOKEN}`,
    },
    body: formData,
  });

  return await response.json();
}

/**
 * Process avatar with Cloudflare Images during restore
 */
async function processAvatarWithCloudflareRestore(imageBuffer, filename, mimeType, env) {
  try {
    // Upload to Cloudflare Images
    const uploadResult = await uploadToCloudflareImagesRestore(imageBuffer, filename, mimeType, env);
    
    if (uploadResult.success && uploadResult.result?.id) {
      const accountHash = env.CLOUDFLARE_ACCOUNT_HASH;
      const imageId = uploadResult.result.id;
      const baseUrl = `https://imagedelivery.net/${accountHash}/${imageId}`;
      
      return {
        originalUrl: `${baseUrl}/original`,
        smallUrl: `${baseUrl}/avatarsmall`,
        mediumUrl: `${baseUrl}/avatarmedium`
      };
    } else {
      throw new Error('Cloudflare Images upload failed: ' + JSON.stringify(uploadResult));
    }
  } catch (error) {
    console.warn('Cloudflare Images avatar processing failed during restore:', error);
    return null; // Will trigger fallback to R2
  }
}

/**
 * Queue image for background optimization
 */
async function queueImageOptimization(env, imageJob) {
  try {
    // Store job in D1 database queue table
    await executeQuery(env.DB, `
      INSERT INTO image_optimization_queue 
      (id, artwork_id, account_id, image_path, image_url, type, status, created_at, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 0)
    `, [
      generateId(),
      imageJob.artworkId || null,
      imageJob.accountId,
      imageJob.imagePath,
      imageJob.imageUrl,
      imageJob.type, // 'artwork' or 'avatar'
      new Date().toISOString()
    ]);
    
    console.log('Queued image optimization job:', imageJob);
  } catch (error) {
    console.warn('Failed to queue image optimization:', error);
    // Don't throw - restore should continue even if queueing fails
  }
}

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