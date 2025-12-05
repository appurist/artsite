import { createSignal, createEffect, onMount, onCleanup, Show } from 'solid-js';
import { useParams, A, useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { getArtwork, getArtworks, deleteArtwork } from '../api.js';
import { vanillaToast } from 'vanilla-toast';
import LoadingSpinner from '../components/Spinner';
import { getAvatarUrl } from '../avatar-utils.js';

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
  const [artistArtworks, setArtistArtworks] = createSignal([]);
  const [currentIndex, setCurrentIndex] = createSignal(-1);

  // Keyboard navigation handler
  const handleKeyDown = (event) => {
    // Don't handle keyboard events if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        goToPrevious();
        break;
      case 'ArrowRight':
        event.preventDefault();
        goToNext();
        break;
      case 'ArrowUp':
      case 'Home':
        event.preventDefault();
        goToFirst();
        break;
      case 'ArrowDown':
      case 'End':
        event.preventDefault();
        goToLast();
        break;
    }
  };

  // Load artwork details
  onMount(async () => {
    if (!params.id) {
      setError('No artwork ID provided');
      setIsLoading(false);
      return;
    }

    await loadArtworkData(params.id);

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);
  });

  // Clean up keyboard event listener
  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  // Watch for route changes and reload artwork data
  createEffect(() => {
    const artworkId = params.id;
    if (artworkId && artwork() && artworkId !== artwork().id) {
      loadArtworkData(artworkId);
    }
  });

  const loadArtworkData = async (artworkId) => {
    try {
      setIsLoading(true);
      setError(null);
      const artworkData = await getArtwork(artworkId);
      
      if (artworkData) {
        setArtwork(artworkData);
        
        // Load all artworks from this artist for navigation
        try {
          const userId = artworkData.user_id || artworkData.account_id;
          const artworks = await getArtworks({ userId });
          setArtistArtworks(artworks);
          
          // Find current artwork's index in the list
          const index = artworks.findIndex(art => art.id === artworkId);
          setCurrentIndex(index);
        } catch (navErr) {
          console.warn('Could not load artist artworks for navigation:', navErr);
        }
      } else {
        setError('Artwork not found');
      }
    } catch (err) {
      console.error('Error loading artwork:', err);
      setError('Artwork not found or failed to load');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Extract artist info from profile record
  const getArtistInfo = () => {
    if (!artwork()?.profile_record) return null;
    try {
      const profile = JSON.parse(artwork().profile_record);
      const name = profile.name || profile.display_name || profile.artist_name || null;
      
      if (!name) return null;
      
      // Create a user object for avatar generation
      const user = { name: name };
      const avatarUrl = getAvatarUrl(user, profile);
      
      return {
        name: name,
        avatar: avatarUrl
      };
    } catch {
      return null;
    }
  };

  // Extract artist name from profile record (legacy function)
  const getArtistName = () => {
    const artistInfo = getArtistInfo();
    return artistInfo?.name || null;
  };

  // Navigation helpers
  const hasPrevious = () => {
    return currentIndex() > 0;
  };

  const hasNext = () => {
    return currentIndex() >= 0 && currentIndex() < artistArtworks().length - 1;
  };

  const goToPrevious = () => {
    if (hasPrevious()) {
      const prevArtwork = artistArtworks()[currentIndex() - 1];
      navigate(`/art/${prevArtwork.id}`);
    }
  };

  const goToNext = () => {
    if (hasNext()) {
      const nextArtwork = artistArtworks()[currentIndex() + 1];
      navigate(`/art/${nextArtwork.id}`);
    }
  };

  const goToFirst = () => {
    if (artistArtworks().length > 0) {
      const firstArtwork = artistArtworks()[0];
      navigate(`/art/${firstArtwork.id}`);
    }
  };

  const goToLast = () => {
    const artworks = artistArtworks();
    if (artworks.length > 0) {
      const lastArtwork = artworks[artworks.length - 1];
      navigate(`/art/${lastArtwork.id}`);
    }
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
                  
                  {/* Previous/Next navigation arrows */}
                  <Show when={hasPrevious()}>
                    <button 
                      class="artwork-nav-arrow artwork-nav-prev"
                      onClick={goToPrevious}
                      title="Previous artwork"
                    >
                      ‹
                    </button>
                  </Show>
                  
                  <Show when={hasNext()}>
                    <button 
                      class="artwork-nav-arrow artwork-nav-next"
                      onClick={goToNext}
                      title="Next artwork"
                    >
                      ›
                    </button>
                  </Show>

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
                  <div class="artwork-detail-title-section">
                    <h1 class="artwork-detail-title">{artwork().title}</h1>
                    <Show when={getArtistInfo()}>
                      <div class="artwork-detail-artist">
                        <Show when={getArtistInfo().avatar}>
                          <img src={getArtistInfo().avatar} alt={getArtistInfo().name} class="artist-avatar-small" />
                        </Show>
                        <A href={artwork().username ? `/@${artwork().username}` : `/artist/${artwork().account_id}`} class="artist-name-link">{getArtistInfo().name}</A>
                      </div>
                    </Show>
                  </div>
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

                  <Show when={artistArtworks().length > 1}>
                    <div class="artwork-detail-field">
                      <label>Gallery Position:</label>
                      <span class="artwork-position">
                        {currentIndex() + 1} of {artistArtworks().length}
                      </span>
                    </div>
                    <div class="artwork-detail-field">
                      <label>Keyboard Navigation:</label>
                      <div class="keyboard-shortcuts">
                        <small>← → = Previous/Next</small><br/>
                        <small>↑ (or Home) = First</small><br/>
                        <small>↓ (or End) = Last</small>
                      </div>
                    </div>
                  </Show>
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