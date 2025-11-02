import { createSignal, createEffect, onMount, Show, Suspense, createResource } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, updateProfile, uploadFile, deleteAccount, updateAvatarType, uploadAvatar, importGravatar } from '../api.js';
import { vanillaToast } from 'vanilla-toast';
import LoadingSpinner from '../components/Spinner';
import { getAvatarUrl, generateInitials } from '../avatar-utils.js';

// Import icons
import cancelIcon from '../assets/icons/cancel.svg';
import contentSaveIcon from '../assets/icons/content-save.svg';
import userIcon from '../assets/icons/user.svg';

function ProfilePage() {
  const { isAuthenticated, user, isLoading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [name, setName] = createSignal('');
  const [bio, setBio] = createSignal('');
  const [customDomain, setCustomDomain] = createSignal('');
  const [website, setWebsite] = createSignal('');
  const [location, setLocation] = createSignal('');
  const [avatarType, setAvatarType] = createSignal('initials');

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
        setCustomDomain(profile?.custom_domain || '');
        setWebsite(profile?.website || '');
        setLocation(profile?.location || '');
        setAvatarType(profile?.avatar_type || 'initials');

        return profile;
      } catch (error) {
        console.error('Error loading profile:', error);
        vanillaToast.error('Error loading profile', { duration: 5000 });
        throw error;
      }
    }
  );

  // Function to clean custom domain input
  const cleanCustomDomain = (domain) => {
    if (!domain || !domain.trim()) return null;
    
    let cleaned = domain.trim();
    
    // Remove http:// or https:// prefix
    cleaned = cleaned.replace(/^https?:\/\//, '');
    
    // Remove trailing slash and any path
    cleaned = cleaned.split('/')[0];
    
    return cleaned || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const profileData = {
        name: name().trim() || null,
        bio: bio().trim() || null,
        customDomain: cleanCustomDomain(customDomain()),
        website: website().trim() || null,
        location: location().trim() || null,
        avatar_url: getAvatarUrl(user(), profile()) || null,
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

  const handleAvatarTypeChange = async (newAvatarType) => {
    try {
      await updateAvatarType(newAvatarType);
      setAvatarType(newAvatarType);
      vanillaToast.success('Avatar type updated successfully!', { duration: 5000 });
    } catch (error) {
      console.error('Error updating avatar type:', error);
      vanillaToast.error('Error updating avatar type: ' + error.message, { duration: 5000 });
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
      await uploadAvatar(file);
      setAvatarType('uploaded');
      vanillaToast.success('Avatar uploaded successfully!', { duration: 5000 });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      vanillaToast.error('Error uploading avatar: ' + error.message, { duration: 5000 });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleGravatarImport = async () => {
    try {
      await importGravatar();
      setAvatarType('gravatar');
      vanillaToast.success('Gravatar imported successfully!', { duration: 5000 });
    } catch (error) {
      console.error('Error importing Gravatar:', error);
      vanillaToast.error('Error importing Gravatar: ' + error.message, { duration: 5000 });
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data, artworks, and profile information.')) {
      return;
    }

    // Triple confirmation for account deletion
    const confirmText = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmText !== 'DELETE') {
      vanillaToast.error('Account deletion cancelled', { duration: 5000 });
      return;
    }

    if (!confirm('This is your final warning. Deleting your account will permanently remove ALL your data. Are you absolutely sure?')) {
      return;
    }

    try {
      await deleteAccount();
      vanillaToast.success('Account deleted successfully. Goodbye!', { duration: 5000 });
      // Log out and redirect to home
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Error deleting account:', err);
      vanillaToast.error('Error deleting account: ' + err.message, { duration: 5000 });
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

          {/* Public Profile Section */}
          <div class="profile-section">
            <h2>Profile (Public)</h2>
          <div class="form-group">
            <div style="display: flex; align-items: flex-start; gap: 2rem;">
              <img
                src={getAvatarUrl(user(), profile())}
                alt="Avatar"
                class="avatar-preview"
              />
              <div style="display: flex; gap: 0.5rem;">
                <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                  <button type="button" class="btn btn-secondary" onClick={() => handleAvatarTypeChange('icon')}>
                    Use Icon
                  </button>
                  <button type="button" class="btn btn-secondary" onClick={() => handleAvatarTypeChange('initials')}>
                    Use Initials
                  </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
                  <button type="button" class="btn btn-secondary" onClick={() => document.getElementById('avatar-upload-file').click()}>
                    Upload Image
                  </button>
                  <button type="button" class="btn btn-secondary" onClick={handleGravatarImport}>
                    Import Gravatar
                  </button>
                </div>
              </div>
            </div>
            <input
              type="file"
              id="avatar-upload-file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={isUploadingAvatar()}
              style="display: none;"
            />
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
            <label for="profile-custom-domain">Custom Artsite Domain</label>
            <input
              type="text"
              id="profile-custom-domain"
              placeholder="yourdomain.com (optional)"
              value={customDomain()}
              onInput={(e) => setCustomDomain(e.target.value)}
            />
            <small class="field-note">Optional: Your own domain that will display your artworks exclusively</small>
          </div>

          <div class="form-group">
            <label for="profile-website">External Website</label>
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
          </div>

          {/* Private Profile Section */}
          <div class="profile-section">
            <h2>Account Information (Private)</h2>

            <div class="form-group">
              <label for="profile-email">Email Address</label>
              <input
                type="email"
                id="profile-email"
                value={user()?.email || ''}
                disabled
                class="disabled-field"
              />
              <small class="field-note">Email cannot be changed. Contact support if needed.</small>
            </div>
          </div>

          {/* Account Management Section */}
          <div class="profile-section account-management">
            <h2>Account Management</h2>

            <div class="danger-zone">
              <h3>Danger Zone</h3>
              <div class="form-group">
                <button type="button" class="btn btn-danger" onClick={handleDeleteAccount}>
                  Delete Account
                </button>
                <small class="field-note">Permanently delete your account and all associated data. This action cannot be undone.</small>
              </div>
            </div>
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
