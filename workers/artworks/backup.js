/**
 * Artwork backup/restore functionality using yazl and yauzl
 */

import yazl from 'yazl';
import yauzl from 'yauzl';
import { authenticateRequest } from '../shared/auth.js';
import { withCors } from '../shared/cors.js';
import { executeQuery, queryAll } from '../shared/db.js';

/**
 * Create a backup ZIP of user's artworks (metadata + images)
 */
export async function backupArtworks(request, env, ctx) {
  try {
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    // Get all artworks for this user
    const artworks = await queryAll(
      env.DB,
      'SELECT * FROM artworks WHERE account_id = ? ORDER BY created_at ASC',
      [user.account_id]
    );

    if (artworks.length === 0) {
      return withCors(new Response(JSON.stringify({
        error: 'No artworks found to backup'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Create ZIP file
    const zip = new yazl.ZipFile();
    
    // Add metadata JSON
    const metadata = {
      export_date: new Date().toISOString(),
      user_id: user.account_id,
      artworks: artworks.map(artwork => ({
        ...artwork,
        tags: artwork.tags ? JSON.parse(artwork.tags) : []
      }))
    };
    
    zip.addBuffer(Buffer.from(JSON.stringify(metadata, null, 2)), 'artworks-metadata.json');

    // Add image files for each artwork
    for (const artwork of artworks) {
      if (artwork.storage_path) {
        try {
          // Get image from R2 storage
          const imageObject = await env.ARTWORK_IMAGES.get(artwork.storage_path);
          if (imageObject) {
            const imageBuffer = await imageObject.arrayBuffer();
            const filename = `images/${artwork.id}-${artwork.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
            zip.addBuffer(Buffer.from(imageBuffer), filename);
          }
        } catch (imageError) {
          console.warn(`Failed to fetch image for artwork ${artwork.id}:`, imageError);
          // Continue with other images
        }
      }
    }

    zip.end();

    // Convert ZIP to buffer
    const chunks = [];
    zip.outputStream.on('data', chunk => chunks.push(chunk));
    
    return new Promise((resolve) => {
      zip.outputStream.on('end', () => {
        const zipBuffer = Buffer.concat(chunks);
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `artworks-backup-${timestamp}.zip`;
        
        resolve(withCors(new Response(zipBuffer, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })));
      });
    });

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
 * Restore artworks from backup ZIP
 */
export async function restoreArtworks(request, env, ctx) {
  try {
    const user = await authenticateRequest(request, env.JWT_SECRET);
    
    // Get uploaded ZIP file
    const formData = await request.formData();
    const zipFile = formData.get('backup');
    
    if (!zipFile) {
      return withCors(new Response(JSON.stringify({
        error: 'No backup file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    
    return new Promise((resolve) => {
      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, async (err, zipfile) => {
        if (err) {
          resolve(withCors(new Response(JSON.stringify({
            error: 'Invalid backup file',
            details: err.message
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })));
          return;
        }

        const entries = {};
        let metadata = null;
        
        // Read all entries
        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          if (entry.fileName === 'artworks-metadata.json') {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) throw err;
              
              const chunks = [];
              readStream.on('data', chunk => chunks.push(chunk));
              readStream.on('end', () => {
                metadata = JSON.parse(Buffer.concat(chunks).toString());
                zipfile.readEntry();
              });
            });
          } else if (entry.fileName.startsWith('images/')) {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) throw err;
              
              const chunks = [];
              readStream.on('data', chunk => chunks.push(chunk));
              readStream.on('end', () => {
                entries[entry.fileName] = Buffer.concat(chunks);
                zipfile.readEntry();
              });
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', async () => {
          try {
            if (!metadata) {
              throw new Error('No metadata found in backup');
            }

            let imported = 0;
            let skipped = 0;

            // Process each artwork
            for (const artworkData of metadata.artworks) {
              try {
                // Check if artwork already exists
                const existing = await executeQuery(
                  env.DB,
                  'SELECT id FROM artworks WHERE id = ? AND account_id = ?',
                  [artworkData.id, user.account_id]
                );

                if (existing.length > 0) {
                  skipped++;
                  continue;
                }

                // Upload image if present
                let storage_path = null;
                const imagePath = `images/${artworkData.id}-${artworkData.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
                if (entries[imagePath]) {
                  storage_path = `artworks/${user.account_id}/${artworkData.id}/restored.jpg`;
                  await env.ARTWORK_IMAGES.put(storage_path, entries[imagePath], {
                    httpMetadata: { contentType: 'image/jpeg' }
                  });
                }

                // Insert artwork record
                await executeQuery(env.DB, `
                  INSERT INTO artworks (
                    id, account_id, title, description, medium, dimensions, 
                    year_created, price, tags, image_url, storage_path,
                    status, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  artworkData.id,
                  user.account_id,
                  artworkData.title,
                  artworkData.description,
                  artworkData.medium,
                  artworkData.dimensions,
                  artworkData.year_created,
                  artworkData.price,
                  JSON.stringify(artworkData.tags || []),
                  storage_path ? `${env.ARTWORK_IMAGES_BASE_URL}/${storage_path}` : null,
                  storage_path,
                  'published',
                  artworkData.created_at,
                  new Date().toISOString()
                ]);

                imported++;
              } catch (artworkError) {
                console.error(`Failed to restore artwork ${artworkData.id}:`, artworkError);
                skipped++;
              }
            }

            resolve(withCors(new Response(JSON.stringify({
              message: 'Restore completed',
              imported,
              skipped,
              total: metadata.artworks.length
            }), {
              headers: { 'Content-Type': 'application/json' }
            })));

          } catch (error) {
            resolve(withCors(new Response(JSON.stringify({
              error: 'Failed to restore artworks',
              details: error.message
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            })));
          }
        });
      });
    });

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