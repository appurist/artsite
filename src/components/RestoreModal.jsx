import { createSignal, Show } from 'solid-js';
import { vanillaToast } from 'vanilla-toast';
import { API_BASE_URL } from '../api.js';

function RestoreModal(props) {
  const [selectedComponents, setSelectedComponents] = createSignal(['artworks', 'settings', 'profile']);
  const [restoreMode, setRestoreMode] = createSignal('add');
  const [selectedFile, setSelectedFile] = createSignal(null);
  const [isRestoring, setIsRestoring] = createSignal(false);

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
      const formData = new FormData();
      formData.append('backup', selectedFile());
      formData.append('components', selectedComponents().join(','));
      formData.append('restore_mode', restoreMode());

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/backup/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Restore failed');
      }

      console.log('Restore completed!', 'Results:', Object.entries(result.results)
        .map(([comp, res]) => `${comp}: ${res.success ? 'Success' : 'Failed - ' + res.error}`)
        .join(', '));

      vanillaToast.success('Backup restored successfully! ' + Object.entries(result.results)
        .map(([comp, res]) => `${comp}: ${res.success ? 'Success' : 'Failed - ' + res.error}`)
        .join(', '), { duration: 5000 });

      // Close modal and reload page
      props.onClose();
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error restoring backup:', error);
      vanillaToast.error('Failed to restore backup: ' + error.message, { duration: 5000 });
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