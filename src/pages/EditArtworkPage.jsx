import { createSignal, onMount, createEffect, Show } from 'solid-js';
import { A, useNavigate, useParams } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { getArtwork, updateArtwork } from '../api.js';

// Import icons
import cancelIcon from '../assets/icons/cancel.svg';
import contentSaveIcon from '../assets/icons/content-save.svg';

function EditArtworkPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  
  // Form state
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [medium, setMedium] = createSignal('');
  const [dimensions, setDimensions] = createSignal('');
  const [yearCreated, setYearCreated] = createSignal('');
  const [price, setPrice] = createSignal('');
  const [tags, setTags] = createSignal('');
  
  // UI state
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSaving, setIsSaving] = createSignal(false);
  const [statusMessage, setStatusMessage] = createSignal('');
  const [statusType, setStatusType] = createSignal('');
  const [artwork, setArtwork] = createSignal(null);

  const showStatus = (message, type) => {
    setStatusMessage(message);
    setStatusType(type);
    // Clear status after 5 seconds
    setTimeout(() => {
      setStatusMessage('');
      setStatusType('');
    }, 5000);
  };

  // Load artwork data when authentication is ready
  createEffect(() => {
    // Only proceed when authentication loading is complete
    if (authLoading()) return;

    const loadArtwork = async () => {
      if (!isAuthenticated()) {
        navigate('/login');
        return;
      }

      try {
        const artworkData = await getArtwork(params.id);
        
        // Check if user owns this artwork
        if (artworkData.account_id !== user().id) {
          showStatus('You can only edit your own artworks', 'error');
          setTimeout(() => navigate('/art'), 2000);
          return;
        }

        setArtwork(artworkData);
        
        // Populate form with current data
        setTitle(artworkData.title || '');
        setDescription(artworkData.description || '');
        setMedium(artworkData.medium || '');
        setDimensions(artworkData.dimensions || '');
        setYearCreated(artworkData.year_created?.toString() || '');
        setPrice(artworkData.price || '');
        setTags(Array.isArray(artworkData.tags) ? artworkData.tags.join(', ') : (artworkData.tags || ''));
        
      } catch (error) {
        console.error('Error loading artwork:', error);
        showStatus('Error loading artwork: ' + error.message, 'error');
        setTimeout(() => navigate('/art'), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    loadArtwork();
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title().trim()) {
      showStatus('Please enter a title.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const updateData = {
        title: title().trim(),
        description: description().trim() || null,
        medium: medium().trim() || null,
        dimensions: dimensions().trim() || null,
        yearCreated: yearCreated() ? parseInt(yearCreated()) : null,
        price: price().trim() || null,
        tags: tags().trim() || null
      };

      await updateArtwork(params.id, updateData);
      showStatus('Artwork updated successfully!', 'success');

      // Redirect after delay
      setTimeout(() => {
        navigate('/art');
      }, 2000);

    } catch (error) {
      console.error('Update error:', error);
      showStatus('Update failed: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <Show when={!authLoading() && !isLoading()} fallback={
      <div class="page-container">
        <div class="loading">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <Show when={isAuthenticated() && artwork()} fallback={
        <div class="page-container">
          <div class="page-content">
            <p>Please log in to edit artwork.</p>
            <A href="/login" class="btn btn-primary">Login</A>
          </div>
        </div>
      }>
        <div class="page-container">
          <div class="page-header">
            <h2>Edit Artwork</h2>
          </div>

          <div class="page-content">
            <Show when={artwork()}>
              <div class="artwork-preview">
                <img 
                  src={artwork().thumbnail_url || artwork().image_url || '/placeholder.jpg'} 
                  alt={artwork().title}
                  style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;"
                />
              </div>
            </Show>

            <form class="upload-form" onSubmit={handleSubmit}>
              <div class="form-group">
                <label for="artwork-title">Title *</label>
                <input 
                  type="text" 
                  id="artwork-title" 
                  required 
                  maxlength="255"
                  value={title()}
                  onInput={(e) => setTitle(e.target.value)}
                />
              </div>

              <div class="form-group">
                <label for="artwork-description">Description</label>
                <textarea 
                  id="artwork-description" 
                  rows="4" 
                  maxlength="2000"
                  value={description()}
                  onInput={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="artwork-medium">Medium</label>
                  <input 
                    type="text" 
                    id="artwork-medium" 
                    maxlength="255" 
                    placeholder="Oil on canvas, Watercolor, etc."
                    value={medium()}
                    onInput={(e) => setMedium(e.target.value)}
                  />
                </div>

                <div class="form-group">
                  <label for="artwork-dimensions">Dimensions</label>
                  <input 
                    type="text" 
                    id="artwork-dimensions" 
                    maxlength="255" 
                    placeholder='24" x 36"'
                    value={dimensions()}
                    onInput={(e) => setDimensions(e.target.value)}
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="artwork-year">Year Created</label>
                  <input 
                    type="number" 
                    id="artwork-year" 
                    min="1900" 
                    max={currentYear} 
                    placeholder={currentYear.toString()}
                    value={yearCreated()}
                    onInput={(e) => setYearCreated(e.target.value)}
                  />
                </div>

                <div class="form-group">
                  <label for="artwork-price">Price</label>
                  <input 
                    type="text" 
                    id="artwork-price" 
                    maxlength="255" 
                    placeholder="$500, Not for sale, etc."
                    value={price()}
                    onInput={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="artwork-tags">Tags</label>
                <input 
                  type="text" 
                  id="artwork-tags" 
                  maxlength="1000" 
                  placeholder="landscape, mountains, sunset (separated by commas)"
                  value={tags()}
                  onInput={(e) => setTags(e.target.value)}
                />
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary" disabled={isSaving()}>
                  <img src={contentSaveIcon} alt="Save" class="icon" aria-hidden="true" />
                  {isSaving() ? 'Saving...' : 'Save Changes'}
                </button>
                <A href="/art" class="btn btn-secondary">
                  <img src={cancelIcon} alt="Cancel" class="icon" aria-hidden="true" />
                  Cancel
                </A>
              </div>
            </form>

            <Show when={statusMessage()}>
              <div class={`upload-status message ${statusType()}`} style="display: block;">
                {statusMessage()}
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </Show>
  );
}

export default EditArtworkPage;