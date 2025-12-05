import { createSignal, Show } from 'solid-js';
import { vanillaToast } from 'vanilla-toast';
import { API_BASE_URL } from '../api.js';
import JSZip from 'jszip';

function RestoreModal(props) {
  const [selectedComponents, setSelectedComponents] = createSignal(['artworks', 'settings', 'profile']);
  const [restoreMode, setRestoreMode] = createSignal('replace');
  const [selectedFile, setSelectedFile] = createSignal(null);
  const [isRestoring, setIsRestoring] = createSignal(false);
  const [restoreProgress, setRestoreProgress] = createSignal('');
  const [progressPercent, setProgressPercent] = createSignal(0);

  const handleComponentChange = (component, checked) => {
    if (checked) {
      setSelectedComponents([...selectedComponents(), component]);
    } else {
      setSelectedComponents(selectedComponents().filter(c => c !== component));
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const updateRestoreProgress = (message, progress) => {
    setRestoreProgress(message);
    setProgressPercent(progress);
  };

  const handleRestore = async () => {
    if (!selectedFile()) {
      vanillaToast.error('Please select a backup file', { duration: 5000 });
      return;
    }

    if (selectedComponents().length === 0) {
      vanillaToast.error('Please select at least one component to restore', { duration: 5000 });
      return;
    }

    setIsRestoring(true);

    try {
      const file = selectedFile();

      // Update modal to show progress
      updateRestoreProgress('Preparing restore...', 0);

      // Step 1: Extract ZIP file client-side
      updateRestoreProgress('Extracting backup file...', 0);
      const zip = await JSZip.loadAsync(file);
      
      // Extract metadata files from ZIP
      const entries = {};
      for (const [fileName, zipFile] of Object.entries(zip.files)) {
        if (!zipFile.dir && fileName.endsWith('.json')) {
          entries[fileName] = await zipFile.async('text');
        }
      }

      // Verify required files
      if (!entries['backup-metadata.json']) {
        throw new Error('Invalid backup file - missing metadata');
      }

      const backupMetadata = JSON.parse(entries['backup-metadata.json']);
      
      // Step 2: Send metadata as JSON to backend
      updateRestoreProgress('Restoring metadata...', 0);
      
      const token = localStorage.getItem('token');
      const metaPayload = {
        components: selectedComponents(),
        restore_mode: restoreMode(),
        backup_metadata: backupMetadata,
        entries: entries
      };

      const metaResponse = await fetch(`${API_BASE_URL}/api/backup/restore-meta`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metaPayload)
      });
      
      const metaResult = await metaResponse.json();
      if (!metaResponse.ok) {
        throw new Error(metaResult.error || 'Metadata restore failed');
      }

      console.log('Metadata restore result:', metaResult);
      console.log('Selected components:', selectedComponents());
      console.log('artworkIdMapping:', metaResult.artworkIdMapping);
      console.log('artworkIdMapping exists:', !!metaResult.artworkIdMapping);
      console.log('artworkIdMapping size:', Object.keys(metaResult.artworkIdMapping || {}).length);
      console.log('Condition check - includes artworks:', selectedComponents().includes('artworks'));
      console.log('Condition check - has mapping:', !!metaResult.artworkIdMapping);
      console.log('Condition check - mapping not empty:', Object.keys(metaResult.artworkIdMapping || {}).length > 0);

      // Step 3: Extract images from already-loaded ZIP and restore them one by one  
      console.log('About to check condition...');
      const hasArtworks = selectedComponents().includes('artworks');
      const hasArtworkData = !!entries['art/artworks.json'];
      console.log('Condition parts:', { hasArtworks, hasArtworkData });
      
      if (hasArtworks && hasArtworkData) {
        console.log('✅ All conditions met, starting image restore...');
        
        // Parse artwork metadata to match with images
        const artworksData = JSON.parse(entries['art/artworks.json']);
        console.log(`Found ${artworksData.length} artworks in metadata`);
        
        const artworkImages = [];
        
        // Find all image files in the art/images/ folder
        for (const [fileName, zipFile] of Object.entries(zip.files)) {
          if (!zipFile.dir && fileName.startsWith('art/images/')) {
            artworkImages.push({ fileName, zipFile });
          }
        }

        console.log(`Found ${artworkImages.length} images in backup`);
        if (artworkImages.length > 0) {
          updateRestoreProgress(`Starting upload of ${artworkImages.length} images...`, 0);
          
          let processedImages = 0;
          for (const { fileName, zipFile } of artworkImages) {
            console.log(`Processing image: ${fileName}`);
            try {
              // Extract artwork ID from filename (format: art/images/{oldId}-{title}.jpg)
              const baseFileName = fileName.replace('art/images/', '');
              console.log(`Base filename: ${baseFileName}`);
              // Split on the first dash after the UUID (UUIDs have 4 dashes, so take first 5 parts)
              const parts = baseFileName.split('-');
              const oldArtworkId = parts.slice(0, 5).join('-'); // Full UUID: xxxx-xxxx-xxxx-xxxx-xxxx
              console.log(`Old artwork ID: ${oldArtworkId}`);
              
              // Find the corresponding artwork metadata
              const artworkData = artworksData.find(artwork => artwork.id === oldArtworkId);
              console.log(`Artwork metadata:`, artworkData);
              
              if (artworkData) {
                console.log(`✅ Uploading image and creating artwork: ${artworkData.title}`);
                // Get image data
                const imageBlob = await zipFile.async('blob');
                
                // Create form data for image restore (now includes artwork metadata)
                const imageFormData = new FormData();
                imageFormData.append('artwork_metadata', JSON.stringify(artworkData));
                imageFormData.append('image', imageBlob);
                imageFormData.append('original_filename', baseFileName);
                imageFormData.append('restore_mode', restoreMode());

                // Restore this image
                console.log(`Making API call to /api/backup/restore-image...`);
                const imageResponse = await fetch(`${API_BASE_URL}/api/backup/restore-image`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  },
                  body: imageFormData
                });

                console.log(`Image restore response status: ${imageResponse.status}`);
                if (!imageResponse.ok) {
                  const imageError = await imageResponse.json();
                  console.warn(`❌ Failed to restore image for artwork ${artworkData.title}:`, imageError.error);
                  if (imageError.details) {
                    console.warn(`Error details:`, imageError.details);
                  }
                  if (imageError.stack) {
                    console.warn(`Error stack:`, imageError.stack);
                  }
                  if (imageError.debug) {
                    console.warn(`Debug info:`, imageError.debug);
                  }
                } else {
                  const result = await imageResponse.json();
                  console.log(`✅ Successfully created artwork ${artworkData.title} with ID: ${result.artwork_id}`);
                }
              } else {
                console.warn(`❌ No artwork metadata found for old ID: ${oldArtworkId}`);
              }
            } catch (error) {
              console.warn(`❌ Failed to process image ${fileName}:`, error);
            }
            
            processedImages++;
            const progress = Math.round((processedImages / artworkImages.length) * 100);
            updateRestoreProgress(`Uploaded ${processedImages}/${artworkImages.length} images`, progress);
          }
        } else if (artworkImages.length === 0) {
          updateRestoreProgress('No images to restore', 100);
        }
      } else {
        updateRestoreProgress('Metadata restored successfully', 100);
      }

      updateRestoreProgress('Restore completed successfully!', 100);

      console.log('Chunked restore completed!', 'Results:', Object.entries(metaResult.results)
        .map(([comp, res]) => `${comp}: ${res.success ? 'Success' : 'Failed - ' + res.error}`)
        .join(', '));

      vanillaToast.success('Backup restored successfully! ' + Object.entries(metaResult.results)
        .map(([comp, res]) => `${comp}: ${res.success ? 'Success' : 'Failed - ' + res.error}`)
        .join(', '), { duration: 5000 });

      // Close modal and reload page after a moment
      setTimeout(() => {
        props.onClose();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 1000);

    } catch (error) {
      console.error('Error restoring backup:', error);
      vanillaToast.error('Failed to restore backup: ' + error.message, { duration: 5000 });
      updateRestoreProgress(`Error: ${error.message}`, -1);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <>
      <style>{`
        .backup-file-section,
        .restore-mode-section,
        .backup-components-section {
          background: #f5f5f5;
          padding: 4px 15px;
          margin: 10px 0;
          border-radius: 5px;
        }
        
        .backup-file-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .restore-mode-option,
        .backup-component {
          display: flex;
          align-items: flex-start;
          margin: 2px 0;
          padding: 8px 0;
          gap: 8px;
          background: none;
          border: none;
        }
        
        .restore-mode-option input[type="radio"],
        .backup-component input[type="checkbox"] {
          margin: 4px 0 0 0;
        }
        
        .restore-mode-section h4,
        .backup-components-section h4 {
          margin: 0 0 10px 0;
          font-size: 1rem;
        }
        
        .option-description {
          font-size: 0.9rem;
          color: #666;
          margin-top: 2px;
        }
        
        .modal-actions {
          margin-top: 0px;
        }

        .restore-progress {
          margin: 1.5rem 0;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .progress-message {
          margin-bottom: 0.75rem;
          font-weight: 500;
          color: #333;
        }

        .progress-message.error {
          color: #d32f2f;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #ddd;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-percent {
          text-align: center;
          font-size: 0.9rem;
          color: #666;
          font-weight: 500;
        }
      `}</style>
      <Show when={props.isOpen}>
        <div class="modal-overlay" onClick={handleOverlayClick}>
        <div class="backup-modal-content">
          <div class="modal-close" onClick={props.onClose}>&times;</div>
          <h2>Restore Data</h2>

          <div class="backup-file-section">
            <label for="backup-file">Select backup file:</label>
            <input 
              type="file" 
              id="backup-file" 
              accept=".zip"
              onChange={handleFileChange}
              disabled={isRestoring()}
            />
          </div>

          <div class="restore-mode-section">
            <h4>Restore Mode</h4>
            <div class="restore-mode-option">
              <input 
                type="radio" 
                name="restore-mode" 
                value="add" 
                checked={restoreMode() === 'add'}
                onChange={(e) => setRestoreMode(e.target.value)}
                disabled={isRestoring()}
              />
              <div>
                <span>Add to existing data</span>
                <div class="option-description">Keep current data and add items from backup</div>
              </div>
            </div>
            <div class="restore-mode-option">
              <input 
                type="radio" 
                name="restore-mode" 
                value="replace"
                checked={restoreMode() === 'replace'}
                onChange={(e) => setRestoreMode(e.target.value)}
                disabled={isRestoring()}
              />
              <div>
                <span>Replace all data</span>
                <div class="option-description">Delete current data first, then restore from backup</div>
              </div>
            </div>
          </div>

          <div class="backup-components-section">
            <h4>Components to Restore</h4>
            <div class="backup-component">
              <input 
                type="checkbox" 
                value="artworks" 
                checked={selectedComponents().includes('artworks')}
                onChange={(e) => handleComponentChange('artworks', e.target.checked)}
                disabled={isRestoring()}
              />
              <span>Artworks: All artwork images and metadata</span>
            </div>
            <div class="backup-component">
              <input 
                type="checkbox" 
                value="settings" 
                checked={selectedComponents().includes('settings')}
                onChange={(e) => handleComponentChange('settings', e.target.checked)}
                disabled={isRestoring()}
              />
              <span>Site Settings: Site configuration and preferences</span>
            </div>
            <div class="backup-component">
              <input 
                type="checkbox" 
                value="profile" 
                checked={selectedComponents().includes('profile')}
                onChange={(e) => handleComponentChange('profile', e.target.checked)}
                disabled={isRestoring()}
              />
              <span>Profile: Profile information and avatar</span>
            </div>
          </div>

          <Show when={isRestoring()}>
            <div class="restore-progress">
              <div class="progress-message">{restoreProgress()}</div>
              <Show when={progressPercent() >= 0}>
                <div class="progress-bar">
                  <div class="progress-fill" style={`width: ${progressPercent()}%`}></div>
                </div>
                <div class="progress-percent">{Math.round(progressPercent())}%</div>
              </Show>
              <Show when={progressPercent() < 0}>
                <div class="progress-message error">{restoreProgress()}</div>
              </Show>
            </div>
          </Show>

          <div class="modal-actions">
            <button 
              class="btn btn-secondary" 
              onClick={props.onClose}
              disabled={isRestoring()}
            >
              Cancel
            </button>
            <button 
              class="btn btn-primary" 
              onClick={handleRestore}
              disabled={isRestoring() || !selectedFile() || selectedComponents().length === 0}
            >
              {isRestoring() ? 'Restoring...' : 'Restore'}
            </button>
          </div>
        </div>
      </div>
    </Show>
    </>
  );
}

export default RestoreModal;