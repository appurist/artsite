import { createSignal, createEffect, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { getArtworks, getCustomDomainUserSettings } from '../api.js';
import { useSettings } from '../contexts/SettingsContext';

function GalleryPage() {
  const params = useParams();
  const { customDomainUser, siteTitle } = useSettings();
  const [artworks, setArtworks] = createSignal([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  const [userDisplayName, setUserDisplayName] = createSignal(null);
  const [galleryDescription, setGalleryDescription] = createSignal(null);
  const [artistBio, setArtistBio] = createSignal(null);
  const [primaryColor, setPrimaryColor] = createSignal(null);
  const [secondaryColor, setSecondaryColor] = createSignal(null);

  // Determine which user's gallery to show
  const getCurrentUser = () => {
    return params.userId || customDomainUser() || undefined;
  };

  const galleryTitle = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return window.location.hostname;
    }
    
    // For custom domain users, show the site title from settings instead of @username
    if (customDomainUser() === currentUser) {
      return siteTitle() || window.location.hostname;
    }
    
    // For regular user pages, show @username format
    const displayName = userDisplayName();
    return displayName ? `@${displayName}` : `@${currentUser}`;
  };

  const gallerySubtitle = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return 'Original paintings and artwork';
    }
    
    // For custom domain users, don't show subtitle since we display bio/description inline
    if (customDomainUser() === currentUser) {
      return null;
    }
    
    return 'Art Portfolio';
  };

  // Load artworks and user display name when component mounts or user changes
  createEffect(() => {
    (async () => {
      const currentUser = getCurrentUser();
      setIsLoading(true);
      setError(null);
      setUserDisplayName(null);
      setGalleryDescription(null);
      setArtistBio(null);
      setPrimaryColor(null);
      setSecondaryColor(null);

      try {
        // Load artworks
        const fetchedArtworks = await getArtworks({ 
          userId: currentUser 
        });
        setArtworks(fetchedArtworks);

        // Load user display name and gallery settings if we have a specific user
        if (currentUser) {
          try {
            const settings = await getCustomDomainUserSettings(currentUser);
            if (settings?.artist_name) {
              setUserDisplayName(settings.artist_name);
            }
            if (settings?.gallery_description) {
              setGalleryDescription(settings.gallery_description);
            }
            if (settings?.artist_bio) {
              setArtistBio(settings.artist_bio);
            }
            if (settings?.primary_color) {
              setPrimaryColor(settings.primary_color);
            }
            if (settings?.secondary_color) {
              setSecondaryColor(settings.secondary_color);
            }
          } catch (settingsError) {
            console.log('Could not load user display name:', settingsError);
          }
        }
      } catch (err) {
        console.error('Error loading gallery:', err);
        setError('Unable to load gallery');
      } finally {
        setIsLoading(false);
      }
    })();
  });

  const createArtworkCard = (artwork) => {
    const thumbnailUrl = artwork.thumbnail_url || artwork.image_url || '/placeholder.jpg';
    
    // Extract artist info from profile record if available
    const getArtistInfo = () => {
      if (!artwork.profile_record) return null;
      try {
        const profile = JSON.parse(artwork.profile_record);
        return {
          name: profile.name || profile.display_name || null,
          avatar: profile.avatar_url || null
        };
      } catch {
        return null;
      }
    };

    const artistInfo = getArtistInfo();
    const showArtistInfo = !getCurrentUser() && artistInfo?.name;

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
            <h3 class="artwork-title" style={primaryColor() ? `color: ${primaryColor()}` : undefined}>{artwork.title}</h3>
            <Show when={showArtistInfo}>
              <div class="artwork-artist-info">
                <Show 
                  when={artistInfo.avatar}
                  fallback={
                    <div class="artist-avatar-placeholder">
                      <span>{artistInfo.name.charAt(0).toUpperCase()}</span>
                    </div>
                  }
                >
                  <img src={artistInfo.avatar} alt={artistInfo.name} class="artist-avatar-small" />
                </Show>
                <a href={`/artist/${artwork.user_id}`} class="artist-name-link">
                  {artistInfo.name}
                </a>
              </div>
            </Show>
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
            <Show when={artwork.tags}>
              <div class="artwork-tags">
                {artwork.tags.split(',').map(tag => 
                  <span class="tag-pill" style={secondaryColor() ? `background-color: ${secondaryColor()}; color: white` : undefined}>{tag.replace(/"/g, '').trim()}</span>
                )}
              </div>
            </Show>
          </div>
        </a>
      </div>
    );
  };

  return (
    <div>
      <div class="gallery-header">
        <h1 class="gallery-title">{galleryTitle()}</h1>
        <Show when={gallerySubtitle()}>
          <p class="gallery-subtitle">{gallerySubtitle()}</p>
        </Show>
        <Show when={customDomainUser() === getCurrentUser()}>
          <Show when={artistBio() && artistBio().trim() !== ''}>
            <div class="gallery-bio">
              <p>{artistBio()}</p>
            </div>
          </Show>
          <Show when={galleryDescription() && galleryDescription().trim() !== ''}>
            <div class="gallery-site-description">
              <p>{galleryDescription()}</p>
            </div>
          </Show>
        </Show>
      </div>

      <div class="content-container">
        <Show 
          when={!isLoading() && !error()} 
          fallback={
            <Show when={isLoading()} fallback={
              <div class="empty-gallery">
                <h2>Unable to load gallery</h2>
                <p>{error()}</p>
              </div>
            }>
              <div class="loading">
                <p>Loading gallery...</p>
              </div>
            </Show>
          }
        >
          <Show 
            when={artworks().length > 0} 
            fallback={
              <div class="empty-gallery">
                <h2>No artworks yet</h2>
                <p>The gallery is empty. Please use the admin panel to add some artwork.</p>
              </div>
            }
          >
            <div class="gallery-grid">
              {artworks().map(artwork => createArtworkCard(artwork))}
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}

export default GalleryPage;