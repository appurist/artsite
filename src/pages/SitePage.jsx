import { createSignal, createEffect, onMount, Show } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { getSettings, updateSettings } from '../api.js';

// Import icons
import cancelIcon from '../assets/icons/cancel.svg';
import contentSaveIcon from '../assets/icons/content-save.svg';

function SitePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [siteTitle, setSiteTitle] = createSignal('');
  const [artistName, setArtistName] = createSignal('');
  const [artistBio, setArtistBio] = createSignal('');
  const [galleryDescription, setGalleryDescription] = createSignal('');
  const [primaryColor, setPrimaryColor] = createSignal('#667eea');
  const [secondaryColor, setSecondaryColor] = createSignal('#764ba2');
  const [contactEmail, setContactEmail] = createSignal('');
  const [contactPhone, setContactPhone] = createSignal('');

  // UI state
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSaving, setIsSaving] = createSignal(false);
  const [statusMessage, setStatusMessage] = createSignal('');
  const [statusType, setStatusType] = createSignal('');

  // Redirect if not authenticated (but wait for auth to load first)
  createEffect(() => {
    if (!authLoading() && !isAuthenticated()) {
      navigate('/login');
    }
  });

  // Load current settings
  onMount(async () => {
    try {
      const settings = await getSettings();
      
      // Populate form with current settings
      setSiteTitle(settings.site_title || '');
      setArtistName(settings.artist_name || '');
      setArtistBio(settings.artist_bio || '');
      setGalleryDescription(settings.gallery_description || '');
      setPrimaryColor(settings.primary_color || '#667eea');
      setSecondaryColor(settings.secondary_color || '#764ba2');
      setContactEmail(settings.contact_email || '');
      setContactPhone(settings.contact_phone || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      setStatusMessage('Error loading settings');
      setStatusType('error');
    } finally {
      setIsLoading(false);
    }
  });

  const showStatus = (message, type) => {
    setStatusMessage(message);
    setStatusType(type);
    // Clear status after 5 seconds
    setTimeout(() => {
      setStatusMessage('');
      setStatusType('');
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const settingsData = {
        site_title: siteTitle().trim() || null,
        artist_name: artistName().trim() || null,
        artist_bio: artistBio().trim() || null,
        gallery_description: galleryDescription().trim() || null,
        primary_color: primaryColor(),
        secondary_color: secondaryColor(),
        contact_email: contactEmail().trim() || null,
        contact_phone: contactPhone().trim() || null,
      };

      await updateSettings(settingsData);
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error saving settings: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading()) {
    return (
      <div class="page-container">
        <div class="loading">
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div class="page-container">
      <div class="page-header">
        <h1>My Site Settings</h1>
      </div>

      <div class="page-content">
        <form onSubmit={handleSubmit}>
          <div class="form-group">
            <label for="site-title-setting">Site Title (e.g. Art Gallery)</label>
            <input 
              type="text" 
              id="site-title-setting" 
              placeholder="My Art Gallery"
              value={siteTitle()}
              onInput={(e) => setSiteTitle(e.target.value)}
            />
          </div>

          <div class="form-group">
            <label for="artist-name">Artist Name</label>
            <input 
              type="text" 
              id="artist-name" 
              placeholder="Your name"
              value={artistName()}
              onInput={(e) => setArtistName(e.target.value)}
            />
          </div>

          <div class="form-group">
            <label for="artist-bio">Artist Bio</label>
            <textarea 
              id="artist-bio" 
              rows="4" 
              placeholder="Tell visitors about yourself and your art..."
              value={artistBio()}
              onInput={(e) => setArtistBio(e.target.value)}
            ></textarea>
          </div>

          <div class="form-group">
            <label for="gallery-description">Gallery Description</label>
            <textarea 
              id="gallery-description" 
              rows="3" 
              placeholder="Describe your gallery and artistic focus..."
              value={galleryDescription()}
              onInput={(e) => setGalleryDescription(e.target.value)}
            ></textarea>
          </div>

          <div class="form-group">
            <div class="color-controls">
              <div class="color-input-group">
                <label for="primary-color">Primary Color:</label>
                <input 
                  type="color" 
                  id="primary-color" 
                  class="color-swatch" 
                  title="Primary theme color used for navigation and accents"
                  value={primaryColor()}
                  onInput={(e) => setPrimaryColor(e.target.value)}
                />
              </div>
              <div class="color-input-group">
                <label for="secondary-color">Secondary Color:</label>
                <input 
                  type="color" 
                  id="secondary-color" 
                  class="color-swatch" 
                  title="Secondary theme color used for gradients and highlights"
                  value={secondaryColor()}
                  onInput={(e) => setSecondaryColor(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="contact-email">Contact Email</label>
            <input 
              type="email" 
              id="contact-email" 
              placeholder="your.email@example.com"
              value={contactEmail()}
              onInput={(e) => setContactEmail(e.target.value)}
            />
          </div>

          <div class="form-group">
            <label for="contact-phone">Contact Phone</label>
            <input 
              type="tel" 
              id="contact-phone" 
              placeholder="+1 (555) 123-4567"
              value={contactPhone()}
              onInput={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <Show when={statusMessage()}>
            <div class={`settings-status message ${statusType()}`}>
              {statusMessage()}
            </div>
          </Show>

          <div class="form-actions">
            <A href="/art" class="btn btn-secondary">
              <img src={cancelIcon} alt="Cancel" class="icon" aria-hidden="true" />
              Cancel
            </A>
            <button type="submit" class="btn btn-primary" disabled={isSaving()}>
              <img src={contentSaveIcon} alt="Save" class="icon" aria-hidden="true" />
              {isSaving() ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SitePage;