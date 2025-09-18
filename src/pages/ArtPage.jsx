import { createSignal, createEffect, Show, For } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { getArtworks, deleteArtwork, API_BASE_URL } from '../api.js';

// Import icons
import imagePlusIcon from '../assets/icons/image-plus.svg';
import pencilIcon from '../assets/icons/pencil.svg';
import deleteIcon from '../assets/icons/delete.svg';
import downloadIcon from '../assets/icons/download.svg';
import uploadIcon from '../assets/icons/upload.svg';

function ArtPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [artworks, setArtworks] = createSignal([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal(null);

  // Redirect if not authenticated (but wait for auth to load first)
  createEffect(() => {
    if (!authLoading() && !isAuthenticated()) {
      navigate('/login');
    }
  });

  // Load user's artworks
  createEffect(() => {
    if (!user()) return;
    
    const loadArtworks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userArtworks = await getArtworks({ userId: user().id });
        setArtworks(userArtworks || []); // Ensure it's always an array
      } catch (err) {
        console.error('Error loading artworks:', err);
        setError('Error loading artworks. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadArtworks();
  });

  const handleEditArtwork = (artworkId) => {
    console.log('Edit artwork:', artworkId);
    alert('Edit functionality not yet implemented');
  };

  const handleDeleteArtwork = async (artworkId) => {
    if (!confirm('Are you sure you want to delete this artwork? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteArtwork(artworkId);
      alert('Artwork deleted successfully');
      
      // Remove the artwork from the list reactively
      setArtworks(artworks().filter(artwork => artwork.id !== artworkId));
    } catch (err) {
      console.error('Error deleting artwork:', err);
      alert('Error deleting artwork: ' + err.message);
    }
  };

  const handleBackup = async () => {
    try {
      const selectedComponents = ['artworks', 'settings', 'profile'];
      
      const response = await fetch(`${API_BASE_URL}/api/backup/create?components=${selectedComponents.join(',')}`, {
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

      alert('Backup created successfully!');

    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup: ' + error.message);
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!confirm('This will restore data from the backup file. Are you sure you want to continue?')) {
        return;
      }

      try {
        const selectedComponents = ['artworks', 'settings', 'profile'];
        const restoreMode = 'add';

        const formData = new FormData();
        formData.append('backup', file);
        formData.append('components', selectedComponents.join(','));
        formData.append('restore_mode', restoreMode);

        const response = await fetch(`${API_BASE_URL}/api/backup/restore`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
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

        alert('Backup restored successfully! ' + Object.entries(result.results)
          .map(([comp, res]) => `${comp}: ${res.success ? 'Success' : 'Failed - ' + res.error}`)
          .join(', '));
        
        // Reload artworks to show restored data
        window.location.reload();

      } catch (error) {
        console.error('Error restoring backup:', error);
        alert('Failed to restore backup: ' + error.message);
      }
    };
    input.click();
  };

  return (
    <Show 
      when={!authLoading()} 
      fallback={
        <div class="page-container">
          <div class="loading">
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <Show 
        when={isAuthenticated()} 
        fallback={
          <div class="page-container">
            <div class="page-header">
              <h1>Access Denied</h1>
            </div>
            <div class="page-content">
              <p>Redirecting to login...</p>
            </div>
          </div>
        }
      >
        {/* Main art management interface */}
    <div class="page-container">
      <div class="page-header">
        <h1>My Art</h1>
      </div>

      <div class="page-content">
        <div class="artworks-section">
          <div class="artworks-header">
            <h3>Manage Artworks</h3>
            <div class="artwork-actions">
              <button class="btn btn-secondary" onClick={handleBackup}>
                <img src={downloadIcon} alt="Backup" class="icon" aria-hidden="true" />
                Backup
              </button>
              <button class="btn btn-secondary" onClick={handleRestore}>
                <img src={uploadIcon} alt="Restore" class="icon" aria-hidden="true" />
                Restore
              </button>
              <A href="/art/upload" class="btn btn-success">
                <img src={imagePlusIcon} alt="Upload" class="icon" aria-hidden="true" />
                Upload Artwork
              </A>
            </div>
          </div>

          <div class="artworks-list">
            <Show 
              when={!isLoading() && !error()}
              fallback={
                <Show when={isLoading()} fallback={
                  <div class="empty-artworks">
                    <p>{error()}</p>
                  </div>
                }>
                  <div class="loading">
                    <p>Loading artworks...</p>
                  </div>
                </Show>
              }
            >
              <Show 
                when={artworks().length > 0}
                fallback={
                  <div class="empty-artworks">
                    <p>No artworks uploaded yet. Click "Upload Artwork" to get started.</p>
                  </div>
                }
              >
                <div class="admin-artworks-grid">
                  <For each={artworks()}>
                    {(artwork) => (
                      <A href={`/art/${artwork.id}`} class="admin-artwork-link">
                        <div class="admin-artwork-item">
                          <div class="admin-artwork-preview">
                            <img 
                              src={artwork.thumbnail_url || artwork.image_url || '/placeholder.jpg'} 
                              alt={artwork.title}
                            />
                          </div>
                          <div class="admin-artwork-details">
                            <h4>{artwork.title}</h4>
                            <p>
                              {artwork.medium || 'No medium specified'} 
                              {artwork.year_created && ` (${artwork.year_created})`}
                            </p>
                            <p class="artwork-created">
                              Uploaded: {new Date(artwork.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div class="admin-artwork-actions">
                            <button 
                              class="btn btn-secondary btn-sm" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditArtwork(artwork.id);
                              }}
                            >
                              <img src={pencilIcon} alt="Edit" class="icon" aria-hidden="true" />
                              Edit
                            </button>
                            <button 
                              class="btn btn-danger btn-sm" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteArtwork(artwork.id);
                              }}
                            >
                              <img src={deleteIcon} alt="Delete" class="icon" aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </A>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
        </div>
      </div>
    </div>
      </Show>
    </Show>
  );
}

export default ArtPage;