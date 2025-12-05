import { createSignal, onMount, Show } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import { getArtistProfile, getArtworks } from '../api.js';
import LoadingSpinner from '../components/Spinner';

// Import icons
import homeIcon from '../assets/icons/home.svg';
import webIcon from '../assets/icons/web.svg';

function ArtistProfilePage() {
  const params = useParams();
  
  const [artist, setArtist] = createSignal(null);
  const [artworks, setArtworks] = createSignal([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal(null);

  onMount(async () => {
    if (!params.id) {
      setError('No artist ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load artist profile and their artworks
      const [artistData, artworksData] = await Promise.all([
        getArtistProfile(params.id),
        getArtworks({ userId: params.id })
      ]);

      setArtist(artistData);
      setArtworks(artworksData);
    } catch (err) {
      console.error('Error loading artist profile:', err);
      setError('Artist not found or profile not public');
    } finally {
      setIsLoading(false);
    }
  });

  const createArtworkCard = (artwork) => {
    const thumbnailUrl = artwork.thumbnail_url || artwork.image_url || '/placeholder.jpg';

    return (
      <div class="artwork-item" data-id={artwork.id}>
        <a href={`/art/${artwork.id}`} class="artwork-link">
          <div class="artwork-image-container">
            <img src={thumbnailUrl} alt={artwork.title} class="artwork-image" loading="lazy" />
            <div class="artwork-overlay">
              <span>View Details</span>
            </div>
          </div>
          <div class="artwork-details">
            <h3 class="artwork-title">{artwork.title}</h3>
            <Show when={artwork.medium || artwork.year_created}>
              <p class="artwork-medium-year">
                {artwork.medium || ''}
                <Show when={artwork.medium && artwork.year_created}> ({artwork.year_created})</Show>
                <Show when={!artwork.medium && artwork.year_created}>({artwork.year_created})</Show>
              </p>
            </Show>
            <Show when={artwork.price && artwork.price.trim() !== ''}>
              <p class="artwork-price">{artwork.price}</p>
            </Show>
          </div>
        </a>
      </div>
    );
  };

  return (
    <div class="page-container artist-profile-page">
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
                <h1>Artist Not Found</h1>
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
            when={artist()}
            fallback={
              <>
                <div class="page-header">
                  <h1>Artist Not Found</h1>
                </div>
                <div class="page-content">
                  <A href="/" class="btn btn-primary">Back to Gallery</A>
                </div>
              </>
            }
          >
            <div class="artist-profile-container">
              {/* Artist Header */}
              <div class="artist-profile-header">
                <Show when={artist().avatar_url}>
                  <div class="artist-avatar-section">
                    <img src={artist().avatar_url} alt={artist().name} class="artist-avatar" />
                  </div>
                </Show>
                <div class="artist-info-section">
                  <h1 class="artist-name">{artist().name}</h1>
                  <div class="artist-stats">
                    <span>{artist().artwork_count} {artist().artwork_count === 1 ? 'artwork' : 'artworks'}</span>
                  </div>
                  <Show when={artist().bio}>
                    <p class="artist-bio">{artist().bio}</p>
                  </Show>
                  <Show when={artist().website}>
                    <div class="artist-links">
                      <a href={artist().website} target="_blank" rel="noopener noreferrer" class="artist-website-link">
                        <img src={webIcon} alt="Website" class="icon" />
                        Visit Website
                      </a>
                    </div>
                  </Show>
                </div>
              </div>

              {/* Artist Gallery */}
              <div class="artist-gallery">
                <h2>Gallery</h2>
                <Show 
                  when={artworks().length > 0}
                  fallback={
                    <div class="empty-gallery">
                      <p>No public artworks available.</p>
                    </div>
                  }
                >
                  <div class="gallery-grid">
                    {artworks().map(artwork => createArtworkCard(artwork))}
                  </div>
                </Show>
              </div>

              {/* Navigation */}
              <div class="artist-profile-navigation">
                <A href="/" class="btn btn-secondary">
                  <img src={homeIcon} alt="Home" class="icon" />
                  Back to Gallery
                </A>
              </div>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}

export default ArtistProfilePage;