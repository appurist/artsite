import { createSignal, createEffect, onMount, Show } from 'solid-js';
import { useParams, A, useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { getArtwork, deleteArtwork } from '../api.js';
import { vanillaToast } from 'vanilla-toast';
import LoadingSpinner from '../components/Spinner';

// Import icons
import pencilIcon from '../assets/icons/pencil.svg';
import deleteIcon from '../assets/icons/delete.svg';

function ArtworkDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [artwork, setArtwork] = createSignal(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

  // Load artwork details
  onMount(async () => {
    if (!params.id) {
      setError('No artwork ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const artworkData = await getArtwork(params.id);
      
      if (artworkData) {
        setArtwork(artworkData);
      } else {
        setError('Artwork not found');
      }
    } catch (err) {
      console.error('Error loading artwork:', err);
      setError('Artwork not found or failed to load');
    } finally {
      setIsLoading(false);
    }
  });

  const handleEdit = () => {
    navigate(`/art/${params.id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this artwork? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteArtwork(params.id);
      vanillaToast.success('Artwork deleted successfully', { duration: 5000 });
      navigate('/art');
    } catch (err) {
      console.error('Error deleting artwork:', err);
      vanillaToast.error('Error deleting artwork: ' + err.message, { duration: 5000 });
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = () => {
    return artwork() && user() && artwork().user_id === user().id;
  };

  return (
    <div class="page-container artwork-detail-page">
      <Show 
        when={!isLoading()}
        fallback={
          <div class="loading">
            <LoadingSpinner size={40} />
          </div>
        }
      >
        <Show 
          when={!error()}
          fallback={
            <>
              <div class="page-header">
                <h1>Artwork Not Found</h1>
              </div>
              <div class="page-content">
                <div class="error-message">
                  <p>{error()}</p>
                  <A href="/" class="btn btn-primary">Back to Gallery</A>
                </div>
              </div>
            </>
          }
        >
          <Show 
            when={artwork()}
            fallback={
              <>
                <div class="page-header">
                  <h1>Artwork Not Found</h1>
                </div>
                <div class="page-content">
                  <A href="/" class="btn btn-primary">Back to Gallery</A>
                </div>
              </>
            }
          >
            <div class="artwork-detail-container">
              <div class="artwork-detail-image-section">
                <div class="artwork-detail-image-container">
                  <img 
                    src={artwork().image_url || '/placeholder.jpg'} 
                    alt={artwork().title}
                    class="artwork-detail-image"
                  />
                  <Show when={artwork().original_url}>
                    <div class="artwork-full-size-link">
                      <a 
                        href={artwork().original_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="btn btn-secondary"
                      >
                        View Full Size
                      </a>
                    </div>
                  </Show>
                </div>
              </div>

              <div class="artwork-detail-info-section">
                <div class="artwork-detail-header">
                  <h1 class="artwork-detail-title">{artwork().title}</h1>
                  <Show when={isOwner()}>
                    <div class="artwork-detail-actions">
                      <button 
                        class="btn btn-secondary btn-sm" 
                        onClick={handleEdit}
                        disabled={isDeleting()}
                      >
                        <img src={pencilIcon} alt="Edit" class="icon" aria-hidden="true" />
                        Edit
                      </button>
                      <button 
                        class="btn btn-danger btn-sm" 
                        onClick={handleDelete}
                        disabled={isDeleting()}
                      >
                        <img src={deleteIcon} alt="Delete" class="icon" aria-hidden="true" />
                        {isDeleting() ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </Show>
                </div>

                <div class="artwork-detail-metadata">
                  <Show when={artwork().artist_name}>
                    <div class="artwork-detail-field">
                      <label>Artist:</label>
                      <span class="artwork-artist">{artwork().artist_name}</span>
                    </div>
                  </Show>

                  <Show when={artwork().year_created}>
                    <div class="artwork-detail-field">
                      <label>Year:</label>
                      <span class="artwork-year">{artwork().year_created}</span>
                    </div>
                  </Show>

                  <Show when={artwork().medium}>
                    <div class="artwork-detail-field">
                      <label>Medium:</label>
                      <span class="artwork-medium">{artwork().medium}</span>
                    </div>
                  </Show>

                  <Show when={artwork().dimensions}>
                    <div class="artwork-detail-field">
                      <label>Dimensions:</label>
                      <span class="artwork-dimensions">{artwork().dimensions}</span>
                    </div>
                  </Show>

                  <Show when={artwork().price}>
                    <div class="artwork-detail-field">
                      <label>Price:</label>
                      <span class="artwork-price">${artwork().price}</span>
                    </div>
                  </Show>

                  <Show when={artwork().description}>
                    <div class="artwork-detail-field">
                      <label>Description:</label>
                      <div class="artwork-description">{artwork().description}</div>
                    </div>
                  </Show>

                  <div class="artwork-detail-field">
                    <label>Uploaded:</label>
                    <span class="artwork-created">
                      {new Date(artwork().created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div class="artwork-detail-navigation">
                  <A href="/" class="btn btn-secondary">Back to Gallery</A>
                  <Show when={isAuthenticated() && user()?.id === artwork().user_id}>
                    <A href="/art" class="btn btn-secondary">My Art</A>
                  </Show>
                </div>
              </div>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}

export default ArtworkDetailPage;