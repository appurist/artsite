import { createSignal, createEffect, onMount, Show, Suspense, createResource } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, updateProfile, uploadFile } from '../api.js';
import { vanillaToast } from 'vanilla-toast';
import LoadingSpinner from '../components/Spinner';

// Import icons
import cancelIcon from '../assets/icons/cancel.svg';
import contentSaveIcon from '../assets/icons/content-save.svg';
import userIcon from '../assets/icons/user.svg';

function ProfilePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [name, setName] = createSignal('');
  const [bio, setBio] = createSignal('');
  const [website, setWebsite] = createSignal('');
  const [location, setLocation] = createSignal('');
  const [avatarUrl, setAvatarUrl] = createSignal('');

  // UI state
  const [isSaving, setIsSaving] = createSignal(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = createSignal(false);

  // Redirect if not authenticated (but wait for auth to load first)
  createEffect(() => {
    if (!authLoading() && !isAuthenticated()) {
      navigate('/login');
    }
  });

  // Load current profile using createResource
  const [profile] = createResource(
    () => user()?.id, // Source signal - only run when user is available
    async (userId) => {
      try {
        const profile = await getProfile(userId);
        
        // Populate form with current profile data
        setName(profile?.name || user()?.name || '');
        setBio(profile?.bio || '');
        setWebsite(profile?.website || '');
        setLocation(profile?.location || '');
        setAvatarUrl(profile?.avatar_url || '');
        
        return profile;
      } catch (error) {
        console.error('Error loading profile:', error);
        vanillaToast.error('Error loading profile', { duration: 5000 });
        throw error;
      }
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const profileData = {
        name: name().trim() || null,
        bio: bio().trim() || null,
        website: website().trim() || null,
        location: location().trim() || null,
        avatar_url: avatarUrl() || null,
      };

      await updateProfile(profileData);
      vanillaToast.success('Profile updated successfully!', { duration: 5000 });
    } catch (error) {
      console.error('Error saving profile:', error);
      vanillaToast.error('Error saving profile: ' + error.message, { duration: 5000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      vanillaToast.error('Please select an image file', { duration: 5000 });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      vanillaToast.error('File size must be less than 5MB', { duration: 5000 });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const uploadResult = await uploadFile(file);
      setAvatarUrl(uploadResult.url);
      vanillaToast.success('Avatar uploaded successfully!', { duration: 5000 });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      vanillaToast.error('Error uploading avatar: ' + error.message, { duration: 5000 });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div class="page-container">
      <div class="page-header">
        <h1>My Profile</h1>
      </div>

      <div class="page-content">
        <Suspense fallback={<div class="loading"><LoadingSpinner size={40} /></div>}>
        <form onSubmit={handleSubmit}>
          {/* Trigger resource loading */}
          <div style="display: none">{profile()}</div>
          <div class="form-group">
            <label for="avatar-upload">Profile Picture</label>
            <div class="avatar-upload-section">
              <div class="current-avatar">
                <Show 
                  when={avatarUrl()} 
                  fallback={
                    <div class="avatar-placeholder">
                      <img src={userIcon} alt="Default Avatar" class="default-avatar-icon" />
                    </div>
                  }
                >
                  <img src={avatarUrl()} alt="Profile Picture" class="avatar-preview" />
                </Show>
              </div>
              <div class="avatar-upload-controls">
                <input 
                  type="file" 
                  id="avatar-upload" 
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar()}
                />
                <label for="avatar-upload" class="btn btn-secondary">
                  {isUploadingAvatar() ? 'Uploading...' : 'Choose Image'}
                </label>
                <small>JPG, PNG, or GIF up to 5MB</small>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="profile-name">Display Name</label>
            <input 
              type="text" 
              id="profile-name" 
              placeholder="Your display name"
              value={name()}
              onInput={(e) => setName(e.target.value)}
            />
          </div>

          <div class="form-group">
            <label for="profile-bio">Bio</label>
            <textarea 
              id="profile-bio" 
              rows="4" 
              placeholder="Tell visitors about yourself..."
              value={bio()}
              onInput={(e) => setBio(e.target.value)}
            ></textarea>
          </div>

          <div class="form-group">
            <label for="profile-website">Website</label>
            <input 
              type="url" 
              id="profile-website" 
              placeholder="https://yourwebsite.com"
              value={website()}
              onInput={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div class="form-group">
            <label for="profile-location">Location</label>
            <input 
              type="text" 
              id="profile-location" 
              placeholder="City, Country"
              value={location()}
              onInput={(e) => setLocation(e.target.value)}
            />
          </div>

          <div class="form-actions">
            <A href="/art" class="btn btn-secondary">
              <img src={cancelIcon} alt="Cancel" class="icon" aria-hidden="true" />
              Cancel
            </A>
            <button type="submit" class="btn btn-primary" disabled={isSaving()}>
              <img src={contentSaveIcon} alt="Save" class="icon" aria-hidden="true" />
              {isSaving() ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
        </Suspense>
      </div>
    </div>
  );
}

export default ProfilePage;