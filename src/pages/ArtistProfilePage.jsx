import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { useParams, A } from '@solidjs/router';
import { getArtistProfile, getArtworks, getCustomDomainUserSettings } from '../api.js';
import LoadingSpinner from '../components/Spinner';
import { getAvatarUrl } from '../avatar-utils.js';
import { useSettings } from '../contexts/SettingsContext';

// Import icons
import homeIcon from '../assets/icons/home.svg';
import webIcon from '../assets/icons/web.svg';

// Utility function to determine if a color is dark
function isColorDark(color) {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance (0-255, where lower values are darker)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  
  // Return true if luminance is below threshold (dark color)
  return luminance < 128;
}

function ArtistProfilePage() {
  const params = useParams();
  const { customDomainUser } = useSettings();
  
  const [artist, setArtist] = createSignal(null);
  const [artworks, setArtworks] = createSignal([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal(null);

  onMount(async () => {
    // Support both /artist/:id and /*username routes (for @username pattern)
    const identifier = params.id || params.username;
    
    // Check if this is a @username route - if not, this component shouldn't handle it
    if (params.username && !params.username.startsWith('@')) {
      setError('Page not found');
      setIsLoading(false);
      return;
    }
    
    if (!identifier) {
      setError('No artist identifier provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // For @username routes, pass the @username directly; for /artist/:id routes, pass the UUID
      const lookupId = params.username || identifier;
      
      // Load artist profile and their artworks
      const artistData = await getArtistProfile(lookupId);
      // Use the account ID from the artist profile for artwork lookup
      const artworksData = await getArtworks({ userId: artistData.id });

      // Update the artist data with the actual artwork count
      artistData.artwork_count = artworksData.length;

      setArtist(artistData);
      setArtworks(artworksData);

      // Load custom colors for this artist (if not a custom domain user)
      if (customDomainUser() !== artistData.id) {
        try {
          const settings = await getCustomDomainUserSettings(artistData.id);
          if (settings?.primary_color) {
            document.documentElement.style.setProperty('--primary-color', settings.primary_color);
            // Add dark theme class if primary color is dark
            if (isColorDark(settings.primary_color)) {
              document.documentElement.classList.add('dark-primary');
            } else {
              document.documentElement.classList.remove('dark-primary');
            }
          }
          if (settings?.secondary_color) {
            document.documentElement.style.setProperty('--secondary-color', settings.secondary_color);
          }
        } catch (settingsError) {
          console.log('Could not load artist custom colors:', settingsError);
        }
      }
    } catch (err) {
      console.error('Error loading artist profile:', err);
      setError('Artist not found or profile not public');
    } finally {
      setIsLoading(false);
    }
  });

  // Cleanup effect to reset colors when navigating away from artist profile
  onCleanup(() => {
    const currentArtist = artist();
    // If we're leaving an artist profile (not a custom domain), reset colors to defaults
    if (currentArtist && customDomainUser() !== currentArtist.id) {
      document.documentElement.style.removeProperty('--primary-color');
      document.documentElement.style.removeProperty('--secondary-color');
      document.documentElement.classList.remove('dark-primary');
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
                <div class="artist-avatar-section">
                  <img src={getAvatarUrl({ name: artist().name }, artist())} alt={artist().name} class="artist-avatar" />
                </div>
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