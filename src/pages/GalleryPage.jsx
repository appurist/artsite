import { createSignal, createEffect, Show } from 'solid-js';
import { useParams } from '@solidjs/router';
import { getArtworks } from '../api.js';
import { useSettings } from '../contexts/SettingsContext';

function GalleryPage() {
  const params = useParams();
  const { customDomainUser } = useSettings();
  const [artworks, setArtworks] = createSignal([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal(null);

  // Determine which user's gallery to show
  const getCurrentUser = () => {
    return params.userId || customDomainUser || undefined;
  };

  const galleryTitle = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return window.location.hostname;
    }
    return `@${currentUser}`;
  };

  const gallerySubtitle = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return 'Original paintings and artwork';
    }
    return 'Art Portfolio';
  };

  // Load artworks when component mounts or user changes
  createEffect(async () => {
    const currentUser = getCurrentUser();
    setIsLoading(true);
    setError(null);

    try {
      const fetchedArtworks = await getArtworks({ 
        userId: currentUser 
      });
      setArtworks(fetchedArtworks);
    } catch (err) {
      console.error('Error loading gallery:', err);
      setError('Unable to load gallery');
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
            <Show when={artwork.tags}>
              <div class="artwork-tags">
                {artwork.tags.split(',').map(tag => 
                  <span class="tag-pill">{tag.replace(/"/g, '').trim()}</span>
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
        <p class="gallery-subtitle">{gallerySubtitle()}</p>
        <Show when={getCurrentUser()}>
          <div class="gallery-actions">
            <a href="/about" class="btn btn-secondary">About {getCurrentUser()}</a>
          </div>
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