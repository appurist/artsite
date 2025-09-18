import { createSignal, Show } from 'solid-js';
import { vanillaToast } from 'vanilla-toast';
import { API_BASE_URL } from '../api.js';

function BackupModal(props) {
  const [selectedComponents, setSelectedComponents] = createSignal(['artworks', 'settings', 'profile']);
  const [isCreatingBackup, setIsCreatingBackup] = createSignal(false);

  const handleComponentChange = (component, checked) => {
    if (checked) {
      setSelectedComponents([...selectedComponents(), component]);
    } else {
      setSelectedComponents(selectedComponents().filter(c => c !== component));
    }
  };

  const handleBackup = async () => {
    if (selectedComponents().length === 0) {
      vanillaToast.error('Please select at least one component to backup', { duration: 5000 });
      return;
    }

    setIsCreatingBackup(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/backup/create?components=${selectedComponents().join(',')}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Backup failed');
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'artsite-backup.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      vanillaToast.success('Backup created successfully!', { duration: 5000 });

      // Close modal
      props.onClose();

    } catch (error) {
      console.error('Error creating backup:', error);
      vanillaToast.error('Failed to create backup: ' + error.message, { duration: 5000 });
    } finally {
      setIsCreatingBackup(false);
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
        .backup-components-section {
          background: #f5f5f5;
          padding: 4px 15px;
          margin: 10px 0;
          border-radius: 5px;
        }
        
        .backup-component {
          display: flex;
          align-items: flex-start;
          margin: 2px 0;
          padding: 8px 0;
          gap: 8px;
          background: none;
          border: none;
        }
        
        .backup-component input[type="checkbox"] {
          margin: 4px 0 0 0;
        }
        
        .backup-components-section h4 {
          margin: 0 0 10px 0;
          font-size: 1rem;
        }
        
        .modal-actions {
          margin-top: 0px;
        }
      `}</style>
      <Show when={props.isOpen}>
        <div class="modal-overlay" onClick={handleOverlayClick}>
        <div class="backup-modal-content">
          <div class="modal-close" onClick={props.onClose}>&times;</div>
          <h2>Create Backup</h2>

          <div class="backup-components-section">
            <h4>Components to Backup</h4>
            <div class="backup-component">
              <input 
                type="checkbox" 
                value="artworks" 
                checked={selectedComponents().includes('artworks')}
                onChange={(e) => handleComponentChange('artworks', e.target.checked)}
              />
              <span>Artworks: All artwork images and metadata</span>
            </div>
            <div class="backup-component">
              <input 
                type="checkbox" 
                value="settings" 
                checked={selectedComponents().includes('settings')}
                onChange={(e) => handleComponentChange('settings', e.target.checked)}
              />
              <span>Site Settings: Site configuration and preferences</span>
            </div>
            <div class="backup-component">
              <input 
                type="checkbox" 
                value="profile" 
                checked={selectedComponents().includes('profile')}
                onChange={(e) => handleComponentChange('profile', e.target.checked)}
              />
              <span>Profile: Profile information and avatar</span>
            </div>
          </div>

          <div class="modal-actions">
            <button 
              class="btn btn-secondary" 
              onClick={props.onClose}
              disabled={isCreatingBackup()}
            >
              Cancel
            </button>
            <button 
              class="btn btn-primary" 
              onClick={handleBackup}
              disabled={isCreatingBackup() || selectedComponents().length === 0}
            >
              {isCreatingBackup() ? 'Creating Backup...' : 'Create Backup'}
            </button>
          </div>
        </div>
      </div>
    </Show>
    </>
  );
}

export default BackupModal;