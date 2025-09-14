import './style.css'
import './avatar-styles.css'
import {
  getCurrentUser,
  register,
  login,
  logout,
  getArtworks,
  createArtwork,
  uploadFile,
  getArtwork,
  getSettings,
  updateSettings,
  getProfiles,
  getProfile,
  updateProfile,
  deleteArtwork,
  updateArtwork
} from './api.js'

// Import icons
import imagePlusIcon from './assets/icons/image-plus.svg'
import pencilIcon from './assets/icons/pencil.svg'
import deleteIcon from './assets/icons/delete.svg'
import cancelIcon from './assets/icons/cancel.svg'
import contentSaveIcon from './assets/icons/content-save.svg'
import eyeIcon from './assets/icons/eye.svg'
import eyeOffIcon from './assets/icons/eye-off.svg'
import userIcon from './assets/icons/user.svg'

// Password visibility toggle function
window.togglePasswordVisibility = function(inputId) {
  // For registration form, toggle both password fields together
  if (inputId === 'new-password' || inputId === 'confirm-password') {
    const passwordInput = document.getElementById('new-password');
    const confirmInput = document.getElementById('confirm-password');
    const passwordToggle = passwordInput.parentElement.querySelector('.password-toggle');
    const confirmToggle = confirmInput.parentElement.querySelector('.password-toggle');
    const passwordIcon = passwordToggle.querySelector('.eye-icon');
    const confirmIcon = confirmToggle.querySelector('.eye-icon');

    if (passwordInput.type === 'password') {
      // Show both passwords
      passwordInput.type = 'text';
      confirmInput.type = 'text';
      passwordIcon.src = eyeOffIcon;
      passwordIcon.alt = 'Hide password';
      confirmIcon.src = eyeOffIcon;
      confirmIcon.alt = 'Hide password';
    } else {
      // Hide both passwords
      passwordInput.type = 'password';
      confirmInput.type = 'password';
      passwordIcon.src = eyeIcon;
      passwordIcon.alt = 'Show password';
      confirmIcon.src = eyeIcon;
      confirmIcon.alt = 'Show password';
    }
  } else {
    // For login form, toggle single field
    const input = document.getElementById(inputId);
    const toggle = input.parentElement.querySelector('.password-toggle');
    const eyeIconElement = toggle.querySelector('.eye-icon');

    if (input.type === 'password') {
      input.type = 'text';
      eyeIconElement.src = eyeOffIcon;
      eyeIconElement.alt = 'Hide password';
    } else {
      input.type = 'password';
      eyeIconElement.src = eyeIcon;
      eyeIconElement.alt = 'Show password';
    }
  }
}

// Compatibility functions for Appwrite migration
async function hasActiveSession() {
  try {
    const user = await getCurrentUser();
    return !!user;
  } catch (error) {
    return false;
  }
}

function getFilePreview(fileId, width = 400, height = 400) {
  // For new API, the image URL is stored directly in artwork data
  return fileId; // fileId is now the full URL from R2/Cloudflare
}

function getFileView(fileId) {
  // For new API, return the full image URL
  return fileId; // fileId is now the full URL from R2/Cloudflare
}

function getUserAvatarInitials(user) {
  if (!user || !user.name) return '';
  const words = user.name.trim().split(/\s+/).filter(word => word.length > 0);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0][0].toUpperCase();
  // Take first letter of first and last word
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getDefaultFocusUser() {
  // This was Appwrite-specific, return null for new API
  return '*';
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  // Set current year in footer
  document.getElementById('current-year').textContent = new Date().getFullYear();

  // Set hostname as site title (preserving the icon)
  const siteTitle = document.getElementById('site-title');
  const iconElement = siteTitle.querySelector('.site-icon');
  siteTitle.innerHTML = '';
  siteTitle.appendChild(iconElement);
  siteTitle.appendChild(document.createTextNode(window.location.hostname));

  // Set up navigation
  setupNavigation();

  // Check authentication status and update navigation
  await updateNavigationAuth();

  // Handle browser back/forward
  window.addEventListener('popstate', handleRoute);

  // Load the initial page based on URL
  handleRoute();
});

// Simple client-side router
function navigateTo(path, replace = false) {
  if (replace) {
    history.replaceState({ path }, '', path);
  } else {
    history.pushState({ path }, '', path);
  }
  handleRoute();
}

// Make functions globally accessible
window.navigateTo = navigateTo;
window.editArtwork = editArtwork;
window.deleteArtworkFromUI = deleteArtworkFromUI;

async function handleRoute() {
  const path = window.location.pathname;

  if (path.startsWith('/@')) {
    // User gallery route: /@userid
    const userId = path.slice(2); // Remove /@
    if (userId) {
      loadUserGallery(userId);
    } else {
      // Get default focus user for this domain
      const focusUser = await getDefaultFocusUser();
      loadGalleryPage(focusUser);
    }
  } else if (path === '/art') {
    // Art management route
    loadArtPage();
  } else if (path === '/art/upload') {
    // Upload artwork route
    showUploadForm();
  } else if (path.startsWith('/art/') && path !== '/art/upload') {
    // Individual artwork route: /art/:id
    const artworkId = path.split('/art/')[1];
    if (artworkId && artworkId !== 'upload') {
      loadArtworkPage(artworkId);
    } else {
      // Redirect to art management if no valid ID
      navigateTo('/art');
    }
  } else if (path === '/site') {
    // Site settings route
    loadSitePage();
  } else if (path === '/profile') {
    // Profile route
    loadProfilePage();
  } else if (path === '/login') {
    // Login route - show dedicated login page
    loadLoginPage();
  } else if (path === '/register') {
    // Register route - show dedicated registration page
    loadRegisterPage()
  } else if (path === '/logout') {
    // Logout route - perform logout and redirect to home
    await logout();
    navigateTo('/');
  } else {
    // Default route (home) - use domain's focus user
    const focusUser = await getDefaultFocusUser();
    loadGalleryPage(focusUser);
  }

  // Update navigation for current route
  await updateNavigationAuth();
}

// Navigation setup
function setupNavigation() {
  // Only handle logout via JavaScript, all other navigation uses normal links
  document.getElementById('nav-auth').addEventListener('click', async (e) => {
    const navAuthText = document.getElementById('nav-auth-text');
    if (navAuthText.textContent === 'Logout') {
      e.preventDefault();
      await logout();
      await updateNavigationAuth();
      navigateTo('/');
    }
    // For Login and all other links, let the browser handle them naturally
  });
}

// Handle auth link click (login or logout)

// Update navigation based on authentication status
async function updateNavigationAuth() {
  const navUserInfo = document.getElementById('nav-user-info');
  const navUserName = document.getElementById('nav-user-name');
  const navAuthIcon = document.getElementById('nav-auth-icon');
  const navAuthText = document.getElementById('nav-auth-text');
  const navHome = document.getElementById('nav-home');
  const navArt = document.getElementById('nav-art');
  const navSite = document.getElementById('nav-site');

  try {
    // Check if there's an active session
    const hasSession = await hasActiveSession();
    if (hasSession) {
      // Get user details
      const user = await getCurrentUser();
      if (user) {
        // Show user info in navigation with default icon
        const defaultIcon = `<svg class="user-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" /></svg>`;
        navUserName.innerHTML = `${defaultIcon} ${user.name || user.email}`;
        navUserInfo.style.display = 'list-item';

        // Show Home, My Art and My Site for authenticated users
        navHome.parentElement.style.display = 'list-item';
        navArt.parentElement.style.display = 'list-item';
        navSite.parentElement.style.display = 'list-item';

        // Asynchronously load avatar initials
        loadUserAvatar(user, navUserName);

        // Show logout option
        navAuthIcon.innerHTML = '<path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />';
        navAuthText.textContent = 'Logout';
        document.getElementById('nav-auth').href = '#'; // Logout handled by JavaScript

        // Make user name clickable to go to profile
        navUserName.onclick = () => {
          navigateTo('/profile');
        };

        updateActiveNavigation();
        return;
      }
    }

    // No session - show login option
    navUserInfo.style.display = 'none';

    // Hide Home, My Art and My Site for unauthenticated users
    navHome.parentElement.style.display = 'none';
    navArt.parentElement.style.display = 'none';
    navSite.parentElement.style.display = 'none';

    navAuthIcon.innerHTML = '<path d="M11 7L9.6 8.4L12.2 11H2V13H12.2L9.6 15.6L11 17L16 12L11 7M20 19H12V21H20C21.1 21 22 20.1 22 19V5C22 3.9 21.1 3 20 3H12V5H20V19Z" />';
    navAuthText.textContent = 'Login';
    document.getElementById('nav-auth').href = '/login'; // Normal link to login page

    updateActiveNavigation();

  } catch (error) {
    console.error('Error checking auth for navigation:', error);

    // Hide user info on error
    navUserInfo.style.display = 'none';

    // Hide Home, My Art and My Site on error (treat as unauthenticated)
    navHome.parentElement.style.display = 'none';
    navArt.parentElement.style.display = 'none';
    navSite.parentElement.style.display = 'none';

    navAuthIcon.innerHTML = '<path d="M11 7L9.6 8.4L12.2 11H2V13H12.2L9.6 15.6L11 17L16 12L11 7M20 19H12V21H20C21.1 21 22 20.1 22 19V5C22 3.9 21.1 3 20 3H12V5H20V19Z" />';
    navAuthText.textContent = 'Login';
    document.getElementById('nav-auth').href = '/login'; // Normal link to login page

    updateActiveNavigation();
  }
}

// Load user avatar asynchronously
async function loadUserAvatar(user, navUserNameElement) {
  try {
    // Get user name
    const userName = user.name || user.email;
    // Use user icon like other nav buttons
    navUserNameElement.innerHTML = `<img src="${userIcon}" alt="User" class="nav-icon"> ${userName}`;
  } catch (error) {
    console.error('Error loading user avatar:', error);
    // Keep the default icon on error
  }
}

// Load dedicated login page
function loadLoginPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-container">
      <div class="admin-section">
        <div class="auth-section">
          <h2>Admin Login</h2>
          <form id="login-form">
            <div class="form-group">
              <label for="username">Email:</label>
              <input type="email" id="username" name="username" autocomplete="username" required>
            </div>
            <div class="form-group">
              <label for="password">Password:</label>
              <div class="password-input-wrapper">
                <input type="password" id="password" name="password" autocomplete="current-password" required>
                <button type="button" class="password-toggle" onclick="togglePasswordVisibility('password')">
                  <img src="${eyeIcon}" alt="Toggle password visibility" class="eye-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div id="login-error" class="error-message" style="display: none;"></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Login</button>
            </div>
          </form>
          <div class="auth-switch">
            <a href="/register">Don't have an account yet?</a>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Set up form handler
  document.getElementById('login-form').addEventListener('submit', handleLogin);
}

// Load dedicated registration page
function loadRegisterPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-container">
      <div class="admin-section">
        <div class="auth-section">
          <h2>Create Admin Account</h2>
          <form id="register-form">
            <div class="form-group">
              <label for="name">Name:</label>
              <input type="text" id="name" name="name" autocomplete="name" required>
            </div>
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" autocomplete="email" required>
            </div>
            <div class="form-group">
              <label for="new-password">Password:</label>
              <div class="password-input-wrapper">
                <input type="password" id="new-password" name="new-password" autocomplete="new-password" required minlength="8">
                <button type="button" class="password-toggle" onclick="togglePasswordVisibility('new-password')">
                  <img src="${eyeIcon}" alt="Toggle password visibility" class="eye-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="confirm-password">Confirm Password:</label>
              <div class="password-input-wrapper">
                <input type="password" id="confirm-password" name="confirm-password" autocomplete="new-password" required minlength="8">
                <button type="button" class="password-toggle" onclick="togglePasswordVisibility('confirm-password')">
                  <img src="${eyeIcon}" alt="Toggle password visibility" class="eye-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div id="register-error" class="error-message" style="display: none;"></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Create Account</button>
            </div>
          </form>
          <div class="auth-switch">
            <a href="/login">Already have an account?</a>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Set up form handler
  document.getElementById('register-form').addEventListener('submit', handleRegister);
}

// Show registration form (used by /register route)
function showRegistrationForm() {
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  if (loginSection && registerSection) {
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
  }
}

// Update active navigation highlighting
function updateActiveNavigation() {
  // Remove active class from all nav links and user info
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const navUserInfo = document.getElementById('nav-user-info');
  if (navUserInfo) {
    navUserInfo.classList.remove('active');
  }

  // Add active class based on current page
  const currentPath = window.location.pathname;

  if (currentPath === '/' || currentPath.startsWith('/@')) {
    // Home page
    document.getElementById('nav-home').classList.add('active');
  } else if (currentPath === '/art') {
    // Art management page
    document.getElementById('nav-art').classList.add('active');
  } else if (currentPath === '/site') {
    // Site settings page
    document.getElementById('nav-site').classList.add('active');
  } else if (currentPath === '/profile') {
    // Profile page - highlight user name area
    const navUserInfo = document.getElementById('nav-user-info');
    if (navUserInfo && navUserInfo.style.display !== 'none') {
      navUserInfo.classList.add('active');
    }
  }
}

// Load gallery page
async function loadGalleryPage(focusUser = '*') {
  const app = document.getElementById('app');

  // Determine gallery title based on focus user
  let galleryTitle = window.location.hostname;
  let gallerySubtitle = 'Original paintings and artwork';

  if (focusUser !== '*') {
    galleryTitle = `@${focusUser}`;
    gallerySubtitle = 'Art Portfolio';
  }

  // Show initial loading state
  app.innerHTML = `
    <div class="gallery-header">
      <h1 class="gallery-title">${galleryTitle}</h1>
      <p class="gallery-subtitle">${gallerySubtitle}</p>
    </div>

    <div class="content-container">
      <div class="loading">
        <p>Loading gallery...</p>
      </div>
    </div>
  `;

  try {
    // Fetch artworks for the focus user
    const artworks = await getArtworks({ userId: focusUser === '*' ? undefined : focusUser });

    if (artworks.length === 0) {
      // Show empty state
      app.innerHTML = `
        <div class="gallery-header">
          <h1 class="gallery-title">${galleryTitle}</h1>
          <p class="gallery-subtitle">${gallerySubtitle}</p>
        </div>

        <div class="content-container">
          <div class="empty-gallery">
            <h2>No artworks yet</h2>
            <p>The gallery is empty. Please use the admin panel to add some artwork.</p>
          </div>
        </div>
      `;
    } else {
      // Show gallery with artworks
      // Fetch profiles for artist names when displaying all artists (no focus user)
      let profileMap = {};
      if (focusUser === '*') {
        // Get unique user IDs from artworks
        const userIds = [...new Set(artworks.map(artwork => artwork.account_id))];
        const allProfiles = await getProfiles();
        const profiles = allProfiles.filter(profile => userIds.includes(profile.account_id));
        profileMap = Object.fromEntries(profiles.map(profile => [profile.account_id, profile]));
      }

      const galleryGrid = artworks.map(artwork => createArtworkCard(artwork)).join('');

      // Build artist filter dropdown for multi-artist galleries
      let artistFilter = '';
      if (focusUser === '*') {
        const artistProfiles = await getProfiles();
        if (artistProfiles.length > 1) {
          const artistOptions = artistProfiles.map(profile =>
            `<option value="${profile.account_id}">${profile.display_name}</option>`
          ).join('');

          artistFilter = `
            <div class="gallery-filter">
              <label for="artist-filter">Filter by Artist:</label>
              <select id="artist-filter" onchange="filterArtworksByArtist(this.value)">
                <option value="*">All Artists</option>
                ${artistOptions}
              </select>
            </div>
          `;
        }
      }

      app.innerHTML = `
        <div class="gallery-header">
          <h1 class="gallery-title">${galleryTitle}</h1>
          <p class="gallery-subtitle">${gallerySubtitle}</p>
          ${artistFilter}
        </div>

        <div class="content-container">
          <div class="gallery-grid">
            ${galleryGrid}
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading gallery:', error);

    // Show error state
    app.innerHTML = `
      <div class="gallery-header">
        <h1 class="gallery-title">Art Gallery</h1>
        <p class="gallery-subtitle">Original paintings and artwork</p>
      </div>

      <div class="content-container">
        <div class="empty-gallery">
          <h2>Unable to load gallery</h2>
          <p>There was an error loading the artworks. Please try again later.</p>
        </div>
      </div>
    `;
  }
}

// Load profile page
async function loadProfilePage() {
  const app = document.getElementById('app');

  try {
    // Check authentication first
    const hasSession = await hasActiveSession();
    if (!hasSession) {
      // Redirect to login if not authenticated
      navigateTo('/art');
      return;
    }

    // Show loading state
    app.innerHTML = `
      <div class="profile-container">
        <div class="page-header">
          <h1>User Profile</h1>
        </div>
        <div class="loading">
          <p>Loading profile...</p>
        </div>
      </div>
    `;

    // Get current user details and profile
    const [user, userProfile] = await Promise.all([
      getCurrentUser(),
      getCurrentUser().then(u => u ? getProfile(u.id).catch(() => null) : null)
    ]);

    if (!user) {
      app.innerHTML = `
        <div class="profile-container">
          <div class="profile-header">
            <h1>User Profile</h1>
          </div>
          <div class="profile-error">
            <h2>Unable to load profile</h2>
            <p>Please try logging in again.</p>
            <button class="btn btn-primary" onclick="navigateTo('/art')">
              <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M11 7L9.6 8.4L12.2 11H2V13H12.2L9.6 15.6L11 17L16 12L11 7M20 19H12V21H20C21.1 21 22 20.1 22 19V5C22 3.9 21.1 3 20 3H12V5H20V19Z" />
              </svg>
              Go to Login
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Generate avatar initials for display
    const avatarInitials = getUserAvatarInitials(user);

    app.innerHTML = `
      <div class="content-container">
        <div class="profile-container">
          <div class="profile-header">
            <h1>User Profile</h1>
          </div>

          <div class="profile-content">
            <div class="profile-card">
              <h3>Public</h3>
              <div class="profile-details">
                <div class="profile-avatar">
                  <div class="profile-avatar-initials">${avatarInitials}</div>
                </div>
                <div class="profile-field">
                  <label>Avatar Image:</label>
                  <div class="profile-field-checkbox">
                    <input type="checkbox" id="use-gravatar" ${userProfile && userProfile.use_gravatar !== false ? 'checked' : ''}>
                    <label for="use-gravatar">Use Gravatar</label>
                  </div>
                </div>
                <div class="profile-field">
                  <label>Display Name:</label>
                  <span>${userProfile && userProfile.display_name ? userProfile.display_name : 'Not set'}</span>
                </div>
              </div>
            </div>

            <div class="profile-card">
              <h3>Private</h3>
              <div class="profile-details">
                <div class="profile-field">
                  <label>Name:</label>
                  <span>${user.name || 'No name set'}</span>
                </div>

                <div class="profile-field">
                  <label>User ID:</label>
                  <span>${user.id}</span>
                </div>

                <div class="profile-field">
                  <label>Email:</label>
                  <span class="verification-status ${user.email ? (user.emailVerified ? 'verified' : 'unverified') : 'not-provided'}">
                    ${user.email || 'Not provided'} ${user.email ? (user.emailVerified ? '(Verified)' : '(Not Verified)') : ''}
                  </span>
                </div>

                <div class="profile-field">
                  <label>Account Created:</label>
                  <span>${new Date(user.created_at).toLocaleDateString()}</span>
                </div>

                <div class="profile-field">
                  <label>Password Updated:</label>
                  <span>${new Date(user.passwordUpdate).toLocaleDateString()}</span>
                </div>

                <div class="profile-field">
                  <label>Last Updated:</label>
                  <span>${new Date(user.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error loading profile:', error);
    app.innerHTML = `
      <div class="profile-container">
        <div class="page-header">
          <h1>User Profile</h1>
        </div>
        <div class="profile-error">
          <h2>Error loading profile</h2>
          <p>There was an error loading your profile information.</p>
          <button class="btn btn-primary" onclick="navigateTo('/')">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
            </svg>
            Back to Gallery
          </button>
        </div>
      </div>
    `;
  }
}

// Load user-specific gallery page
async function loadUserGallery(userId) {
  const app = document.getElementById('app');

  // Show initial loading state
  app.innerHTML = `
    <div class="gallery-header">
      <h1 class="gallery-title">@${userId}</h1>
      <p class="gallery-subtitle">Art Gallery</p>
    </div>
    <div class="loading">
      <p>Loading gallery...</p>
    </div>
  `;

  try {
    // Fetch artworks for the specified user
    const artworks = await getArtworks({ userId });

    if (artworks.length === 0) {
      // Show empty state
      app.innerHTML = `
        <div class="gallery-header">
          <h1 class="gallery-title">@${userId}</h1>
          <p class="gallery-subtitle">Art Gallery</p>
        </div>
        <div class="gallery-grid">
          <div class="empty-gallery">
            <p>No artworks available yet.</p>
          </div>
        </div>
      `;
    } else {
      // Show artworks grid
      const artworkCards = artworks.map(artwork => createArtworkCard(artwork)).join('');
      app.innerHTML = `
        <div class="gallery-header">
          <h1 class="gallery-title">@${userId}</h1>
          <p class="gallery-subtitle">Art Gallery</p>
        </div>
        <div class="gallery-grid">
          ${artworkCards}
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading user gallery:', error);
    app.innerHTML = `
      <div class="gallery-header">
        <h1 class="gallery-title">@${userId}</h1>
        <p class="gallery-subtitle">Art Gallery</p>
      </div>
      <div class="gallery-grid">
        <div class="empty-gallery">
          <p>Error loading gallery. Please try again later.</p>
        </div>
      </div>
    `;
  }
}

// Create artwork card HTML
function createArtworkCard(artwork) {
  // Get the thumbnail URL - using thumbnailUrl from R2 storage
  const thumbnailUrl = artwork.thumbnail_url || artwork.image_url || '/placeholder.jpg';

  return `
    <div class="artwork-item" data-id="${artwork.id}">
      <a href="/art/${artwork.id}" class="artwork-link">
        <div class="artwork-image-container">
          <img src="${thumbnailUrl}" alt="${artwork.title}" class="artwork-image" loading="lazy">
          <div class="artwork-overlay">
            <span>View Details</span>
          </div>
        </div>
        <div class="artwork-details">
          <h3 class="artwork-title">${artwork.title}</h3>
          ${artwork.medium || artwork.year_created ? `<p class="artwork-medium-year">${artwork.medium || ''}${artwork.medium && artwork.year_created ? ` (${artwork.year_created})` : artwork.year_created ? `(${artwork.year_created})` : ''}</p>` : ''}
          <!-- Artist name will be looked up from profiles cache -->
          ${artwork.price && artwork.price.trim() !== '' ? `<p class="artwork-price">${artwork.price}</p>` : ''}
          ${artwork.tags ? `<div class="artwork-tags">${artwork.tags.split(',').map(tag => `<span class="tag-pill">${tag.replace(/"/g, '').trim()}</span>`).join('')}</div>` : ''}
        </div>
      </a>
    </div>
  `;
}

// Load individual artwork page
async function loadArtworkPage(artworkId) {
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="page-container">
      <div class="loading">
        <p>Loading artwork...</p>
      </div>
    </div>
  `;

  try {
    // Get artwork details and current user
    const [artwork, currentUser] = await Promise.all([
      getArtwork(artworkId),
      getCurrentUser().catch(() => null)
    ]);
    
    if (!artwork) {
      app.innerHTML = `
        <div class="page-container">
          <div class="page-header">
            <h1>Artwork Not Found</h1>
          </div>
          <div class="page-content">
            <p>The requested artwork could not be found.</p>
            <a href="/" class="btn btn-primary">Return to Gallery</a>
          </div>
        </div>
      `;
      return;
    }

    // Get full-size image URL
    const fullImageUrl = artwork.image_url || artwork.original_url || '/placeholder.jpg';

    // Check if current user is the artwork owner
    const isOwner = currentUser && currentUser.id === artwork.artist_id;

    // Create artwork page
    app.innerHTML = `
      <div class="artwork-page-container">
        <div class="page-header">
          <div class="page-actions">
            ${isOwner ? `<button class="btn btn-secondary btn-sm" onclick="editArtwork('${artwork.id}')">
              <img src="${pencilIcon}" alt="Edit" class="icon" aria-hidden="true" />
              Edit Details
            </button>` : ''}
          </div>
        </div>
        
        <div class="artwork-page-content">
          <div class="artwork-image-section">
            <img src="${fullImageUrl}" alt="${artwork.title}" class="artwork-full-image">
          </div>
          
          <div class="artwork-details-section">
            <h1 class="artwork-title">${artwork.title}</h1>
            ${artwork.description ? `<p class="artwork-description">${artwork.description}</p>` : ''}
            
            <div class="artwork-metadata">
              <!-- Artist name will be looked up from profiles cache -->
              ${artwork.medium ? `<p><strong>Medium:</strong> ${artwork.medium}</p>` : ''}
              ${artwork.dimensions ? `<p><strong>Dimensions:</strong> ${artwork.dimensions}</p>` : ''}
              ${artwork.year_created ? `<p><strong>Year:</strong> ${artwork.year_created}</p>` : ''}
              ${artwork.price && artwork.price.trim() !== '' ? `<p><strong>Price:</strong> ${artwork.price}</p>` : ''}
              ${artwork.tags ? `<div class="artwork-tags-section"><strong>Tags:</strong> <div class="artwork-tags">${artwork.tags.split(',').map(tag => `<span class="tag-pill">${tag.replace(/"/g, '').trim()}</span>`).join('')}</div></div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Error loading artwork page:', error);
    app.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1>Error</h1>
        </div>
        <div class="page-content">
          <p>There was an error loading this artwork.</p>
          <a href="/" class="btn btn-primary">Return to Gallery</a>
        </div>
      </div>
    `;
  }
}

// Filter artworks by artist (globally accessible)
window.filterArtworksByArtist = async function(userId) {
  try {
    console.log('Filtering by artist:', userId);

    // Get current focus user from the URL or default
    const path = window.location.pathname;
    let focusUser = '*';

    if (path.startsWith('/@')) {
      focusUser = path.slice(2);
    } else {
      focusUser = await getDefaultFocusUser();
    }

    // If filtering by specific user, redirect to their gallery page
    if (userId !== '*') {
      navigateTo(`/@${userId}`);
      return;
    }

    // If showing all artists, reload the current gallery page
    if (focusUser === '*') {
      loadGalleryPage('*');
    } else {
      navigateTo('/');  // Go to home page to show all artists
    }

  } catch (error) {
    console.error('Error filtering artworks by artist:', error);
  }
};


// Load art management page
async function loadArtPage() {
  const app = document.getElementById('app');

  try {
    // First check if there's an active session (lighter call)
    const hasSession = await hasActiveSession();
    if (hasSession) {
      // Only get user details if we know there's a session
      const user = await getCurrentUser();
      if (user) {
        showAdminDashboard(user);
        return;
      }
    }

    // No session or user - redirect to login page
    navigateTo('/login');
  } catch (error) {
    console.error('Error checking authentication:', error);
    navigateTo('/login');
  }
}

// Show login form
function showLoginForm() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-container">
      <div class="admin-section">
        <div id="login-section" class="auth-section">
          <h2>Admin Login</h2>
          <form id="login-form">
            <div class="form-group">
              <label for="username">Email:</label>
              <input type="email" id="username" name="username" autocomplete="username" required>
            </div>
            <div class="form-group">
              <label for="password">Password:</label>
              <div class="password-input-wrapper">
                <input type="password" id="password" name="password" autocomplete="current-password" required>
                <button type="button" class="password-toggle" onclick="togglePasswordVisibility('password')">
                  <img src="${eyeIcon}" alt="Toggle password visibility" class="eye-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div id="login-error" class="error-message" style="display: none;"></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Login</button>
            </div>
          </form>
          <div class="auth-switch">
            <a href="#" id="show-register">Don't have an account yet?</a>
          </div>
        </div>

        <div id="register-section" class="auth-section" style="display: none;">
          <h2>Create Admin Account</h2>
          <form id="register-form">
            <div class="form-group">
              <label for="name">Name:</label>
              <input type="text" id="name" name="name" autocomplete="name" required>
            </div>
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" autocomplete="email" required>
            </div>
            <div class="form-group">
              <label for="new-password">Password:</label>
              <div class="password-input-wrapper">
                <input type="password" id="new-password" name="new-password" autocomplete="new-password" required minlength="8">
                <button type="button" class="password-toggle" onclick="togglePasswordVisibility('new-password')">
                  <img src="${eyeIcon}" alt="Toggle password visibility" class="eye-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="confirm-password">Confirm Password:</label>
              <div class="password-input-wrapper">
                <input type="password" id="confirm-password" name="confirm-password" autocomplete="new-password" required minlength="8">
                <button type="button" class="password-toggle" onclick="togglePasswordVisibility('confirm-password')">
                  <img src="${eyeIcon}" alt="Toggle password visibility" class="eye-icon" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div id="register-error" class="error-message" style="display: none;"></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Create Account</button>
            </div>
          </form>
          <div class="auth-switch">
            <a href="#" id="show-login">Already have an account?</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Set up form handlers and toggle functionality
  setupAuthForms();
}

// Set up authentication form handlers and toggle functionality
function setupAuthForms() {
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const showRegisterLink = document.getElementById('show-register');
  const showLoginLink = document.getElementById('show-login');


  // Set up form handlers
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
}

// Show admin dashboard
function showAdminDashboard(user) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1>My Art</h1>
      </div>

      <div class="page-content">
        <div class="artworks-section">
          <div class="artworks-header">
            <h3>Manage Artworks</h3>
            <a href="/art/upload" id="upload-artwork-btn" class="btn btn-success">
              <img src="${imagePlusIcon}" alt="Upload" class="icon" aria-hidden="true" />
              Upload Artwork
            </a>
          </div>
          <div id="artworks-list" class="loading">
            <p>Loading artworks...</p>
          </div>
        </div>
      </div>
    </div>
  `;


  // Load artworks list
  loadAdminArtworksList();
}

// Load artworks list for admin dashboard
async function loadAdminArtworksList() {
  const artworksListDiv = document.getElementById('artworks-list');

  try {
    artworksListDiv.innerHTML = '<div class="loading"><p>Loading artworks...</p></div>';

    // Get current user and fetch their artworks
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      artworksListDiv.innerHTML = '<div class="empty-artworks"><p>Please log in to manage artworks.</p></div>';
      return;
    }

    const artworks = await getArtworks({ userId: currentUser.id }); // Only get current user's artworks

    if (artworks.length === 0) {
      artworksListDiv.innerHTML = `
        <div class="empty-artworks">
          <p>No artworks uploaded yet. Click "Upload Artwork" to get started.</p>
        </div>
      `;
    } else {
      const artworksList = artworks.map(artwork => `
        <a href="/art/${artwork.id}" class="admin-artwork-link">
          <div class="admin-artwork-item">
            <div class="admin-artwork-preview">
              <img src="${artwork.thumbnail_url || artwork.image_url || '/placeholder.jpg'}" alt="${artwork.title}">
            </div>
            <div class="admin-artwork-details">
              <h4>${artwork.title}</h4>
              <p>${artwork.medium || 'No medium specified'} ${artwork.year_created ? '(' + artwork.year_created + ')' : ''}</p>
              <p class="artwork-created">Uploaded: ${new Date(artwork.created_at).toLocaleDateString()}</p>
            </div>
            <div class="admin-artwork-actions">
              <button class="btn btn-secondary btn-sm" onclick="event.preventDefault(); event.stopPropagation(); editArtwork('${artwork.id}')">
                <img src="${pencilIcon}" alt="Edit" class="icon" aria-hidden="true" />
                Edit
              </button>
              <button class="btn btn-danger btn-sm" onclick="event.preventDefault(); event.stopPropagation(); deleteArtworkFromUI('${artwork.id}')">
                <img src="${deleteIcon}" alt="Delete" class="icon" aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>
        </a>
      `).join('');

      artworksListDiv.innerHTML = `
        <div class="admin-artworks-grid">
          ${artworksList}
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading admin artworks:', error);
    artworksListDiv.innerHTML = `
      <div class="empty-artworks">
        <p>Error loading artworks. Please try refreshing the page.</p>
      </div>
    `;
  }
}

// Handle login form submission
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('login-error');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';
  errorDiv.style.display = 'none';

  try {
    await login(email, password);
    // Update navigation to show logged in user
    await updateNavigationAuth();
    // Navigate to art management dashboard (replace history to avoid back button issues)
    navigateTo('/art', true);
  } catch (error) {
    errorDiv.textContent = error.message || 'Login failed. Please check your credentials and try again.';
    errorDiv.style.display = 'block';
  } finally {
    // Reset form state
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}

// Handle registration form submission
async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const errorDiv = document.getElementById('register-error');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  // Clear previous errors
  errorDiv.style.display = 'none';

  // Validate password match
  if (password !== confirmPassword) {
    errorDiv.textContent = 'Passwords do not match.';
    errorDiv.style.display = 'block';
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Account...';

  try {
    // Create account
    const registerResponse = await register(email, password, name);

    // Check if registration was successful
    if (registerResponse.success === false) {
      if (registerResponse.userExists) {
        errorDiv.textContent = 'This email address is already registered. Please use a different email or login if this is your account.';
        errorDiv.style.display = 'block';
        // User can manually switch to login using the link
        return;
      } else {
        errorDiv.textContent = registerResponse.message || 'Registration failed. Please try again.';
        errorDiv.style.display = 'block';
        return;
      }
    }

    // Auto-login after successful registration
    await login(email, password);

    // Update navigation to show logged in user
    await updateNavigationAuth();

    // Navigate to art management dashboard (replace history to avoid back button issues)
    navigateTo('/art', true);

  } catch (error) {
    console.error('Registration error:', error);
    errorDiv.textContent = 'Registration failed. ' + (error.message || 'Please try again.');
    errorDiv.style.display = 'block';
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}

// Handle logout
async function handleLogout() {
  try {
    await logout();
    // Reload admin page to show login form
    loadArtPage();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Show upload form
function showUploadForm() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h2>Upload Artwork</h2>
      </div>

      <div class="page-content">
        <form id="upload-form" class="upload-form">
          <div class="form-group">
            <label for="artwork-file">Artwork Image *</label>
            <input type="file" id="artwork-file" accept="image/*" required>
            <small>Supported formats: JPG, PNG, GIF, WebP</small>
          </div>

          <div class="form-group">
            <label for="artwork-title">Title *</label>
            <input type="text" id="artwork-title" required maxlength="255">
          </div>

          <div class="form-group">
            <label for="artwork-description">Description</label>
            <textarea id="artwork-description" rows="4" maxlength="2000"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="artwork-medium">Medium</label>
              <input type="text" id="artwork-medium" maxlength="255" placeholder="Oil on canvas, Watercolor, etc.">
            </div>

            <div class="form-group">
              <label for="artwork-dimensions">Dimensions</label>
              <input type="text" id="artwork-dimensions" maxlength="255" placeholder="24&quot; x 36&quot;">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="artwork-year">Year Created</label>
              <input type="number" id="artwork-year" min="1900" max="${new Date().getFullYear()}" placeholder="${new Date().getFullYear()}">
            </div>

            <div class="form-group">
              <label for="artwork-price">Price</label>
              <input type="text" id="artwork-price" maxlength="255" placeholder="$500, Not for sale, etc.">
            </div>
          </div>

          <div class="form-group">
            <label for="artwork-tags">Tags</label>
            <input type="text" id="artwork-tags" maxlength="1000" placeholder="landscape, mountains, sunset (separated by commas)">
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="upload-submit">
              <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M18 15V18H15V20H18V23H20V20H23V18H20V15H18M13.3 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V13.3C20.4 13.1 19.7 13 19 13C17.9 13 16.8 13.3 15.9 13.9L14.5 12L11 16.5L8.5 13.5L5 18H13.1C13 18.3 13 18.7 13 19C13 19.7 13.1 20.4 13.3 21Z" />
              </svg>
              Upload Artwork
            </button>
            <a href="/art" class="btn btn-secondary" id="upload-cancel">
              <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 2C17.5 2 22 6.5 22 12S17.5 22 12 22 2 17.5 2 12 6.5 2 12 2M12 4C10.1 4 8.4 4.6 7.1 5.7L18.3 16.9C19.3 15.5 20 13.8 20 12C20 7.6 16.4 4 12 4M16.9 18.3L5.7 7.1C4.6 8.4 4 10.1 4 12C4 16.4 7.6 20 12 20C13.9 20 15.6 19.4 16.9 18.3Z" />
              </svg>
              Cancel
            </a>
          </div>
        </form>

        <div id="upload-status" class="upload-status" style="display: none;"></div>
      </div>
    </div>
  `;

  document.getElementById('upload-form').addEventListener('submit', handleUploadSubmit);
}

// Handle upload form submission
async function handleUploadSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('upload-submit');
  const statusDiv = document.getElementById('upload-status');
  const form = document.getElementById('upload-form');

  // Get form data
  const fileInput = document.getElementById('artwork-file');
  const file = fileInput.files[0];

  if (!file) {
    showUploadStatus('Please select an image file.', 'error');
    return;
  }

  const formData = {
    title: document.getElementById('artwork-title').value,
    description: document.getElementById('artwork-description').value || null,
    medium: document.getElementById('artwork-medium').value || null,
    dimensions: document.getElementById('artwork-dimensions').value || null,
    year_created: document.getElementById('artwork-year').value ? parseInt(document.getElementById('artwork-year').value) : null,
    price: document.getElementById('artwork-price').value || null,
    tags: document.getElementById('artwork-tags').value || null
  };

  // Show uploading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';
  showUploadStatus('Uploading image...', 'info');

  try {
    // Get current user for file organization
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }


    // Generate secure file path: user-ID/unique-ID.ext
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const uniqueFileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Upload file to R2 storage - new API handles path generation
    const uploadedFile = await uploadFile(file);

    showUploadStatus('Image uploaded, saving artwork details...', 'info');

    // Create artwork record with file ID and user ownership
    const artworkData = {
      ...formData,
      artist_id: currentUser.id,
      image_id: uploadedFile.$id,
      image_url: uploadedFile.url,
      thumbnail_url: uploadedFile.thumbnailUrl,
      original_url: uploadedFile.originalUrl,
      storage_path: uploadedFile.storagePath,
      original_filename: file.name
    };

    await createArtwork(artworkData);

    showUploadStatus('Artwork uploaded successfully!', 'success');

    // Reset form and redirect after delay
    form.reset();
    setTimeout(() => {
      loadArtPage();
    }, 2000);

  } catch (error) {
    console.error('Upload error:', error);
    showUploadStatus('Upload failed: ' + error.message, 'error');

    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload Artwork';
  }
}

// Show upload status message
function showUploadStatus(message, type) {
  const statusDiv = document.getElementById('upload-status');
  statusDiv.style.display = 'block';
  statusDiv.className = `upload-status message ${type}`;
  statusDiv.textContent = message;
}

// Edit artwork
async function editArtwork(artworkId) {
  try {
    const artwork = await getArtwork(artworkId);
    if (!artwork) {
      alert('Artwork not found');
      return;
    }

    // TODO: Implement edit modal/form
    console.log('Edit artwork:', artwork);
    alert('Edit functionality not yet implemented');
  } catch (error) {
    console.error('Error loading artwork for editing:', error);
    alert('Error loading artwork for editing');
  }
}

// Delete artwork
async function deleteArtworkFromUI(artworkId) {
  if (!confirm('Are you sure you want to delete this artwork? This action cannot be undone.')) {
    return;
  }

  try {
    await deleteArtwork(artworkId);
    alert('Artwork deleted successfully');

    // Reload the art management page
    loadArtPage();
  } catch (error) {
    console.error('Error deleting artwork:', error);
    alert('Error deleting artwork: ' + error.message);
  }
}

// Load site settings page
async function loadSitePage() {
  const app = document.getElementById('app');

  try {
    // Check authentication first
    const hasSession = await hasActiveSession();
    if (!hasSession) {
      // Redirect to login if not authenticated
      navigateTo('/art');
      return;
    }

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      navigateTo('/art');
      return;
    }

    app.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1>My Site Settings</h1>
        </div>

        <div class="page-content">
          <form id="settings-form">
            <div class="form-group">
              <label for="site-title-setting">Site Title (e.g. Art Gallery)</label>
              <input type="text" id="site-title-setting" name="site_title" placeholder="">
            </div>

            <div class="form-group">
              <label for="artist-name">Artist Name</label>
              <input type="text" id="artist-name" name="artist_name" placeholder="">
            </div>

            <div class="form-group">
              <label for="artist-bio">Artist Bio</label>
              <textarea id="artist-bio" name="artist_bio" rows="4" placeholder="Tell visitors about yourself and your art..."></textarea>
            </div>

            <div class="form-group">
              <label for="gallery-description">Gallery Description</label>
              <textarea id="gallery-description" name="gallery_description" rows="3" placeholder="Describe your gallery and artistic focus..."></textarea>
            </div>

            <div class="form-group">
              <div class="color-controls">
                <div class="color-input-group">
                  <label for="primary-color">Primary Color:</label>
                  <input type="color" id="primary-color" name="primary_color" value="#667eea" class="color-swatch" title="Primary theme color used for navigation and accents">
                </div>
                <div class="color-input-group">
                  <label for="secondary-color">Secondary Color:</label>
                  <input type="color" id="secondary-color" name="secondary_color" value="#764ba2" class="color-swatch" title="Secondary theme color used for gradients and highlights">
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="contact-email">Contact Email</label>
              <input type="email" id="contact-email" name="contact_email" placeholder="your.email@example.com">
            </div>

            <div class="form-group">
              <label for="contact-phone">Contact Phone</label>
              <input type="tel" id="contact-phone" name="contact_phone" placeholder="+1 (555) 123-4567">
            </div>

            <div id="settings-status" class="settings-status"></div>

            <div class="form-actions">
              <a href="/art" id="settings-cancel" class="btn btn-secondary">
                <img src="${cancelIcon}" alt="Cancel" class="icon" aria-hidden="true" />
                Cancel
              </a>
              <button type="submit" class="btn btn-primary">
                <img src="${contentSaveIcon}" alt="Save" class="icon" aria-hidden="true" />
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Set up event handlers
    document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);

    // Load current settings
    loadCurrentSettings();

  } catch (error) {
    console.error('Error loading site page:', error);
    app.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1>My Site Settings</h1>
        </div>
        <div class="profile-error">
          <h2>Error loading settings</h2>
          <p>There was an error loading the site settings page.</p>
          <button class="btn btn-primary" onclick="navigateTo('/art')">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M22,16V4A2,2 0 0,0 20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16M11,12L13.03,14.71L16,11L20,16H8M2,6V20A2,2 0 0,0 4,22H18V20H4V6" />
            </svg>
            Go to My Art
          </button>
        </div>
      </div>
    `;
  }
}

// Show settings form (deprecated - kept for compatibility)
function showSettingsForm() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="upload-container">
      <h1>Site Settings</h1>

      <div class="upload-form">
        <form id="settings-form">
          <div class="form-group">
            <label for="site-title-setting">Site Title (e.g. My Art Gallery)</label>
            <input type="text" id="site-title-setting" name="site_title" placeholder="">
          </div>

          <div class="form-group">
            <label for="artist-name">Artist Name</label>
            <input type="text" id="artist-name" name="artist_name" placeholder="">
          </div>

          <div class="form-group">
            <label for="artist-bio">Artist Bio</label>
            <textarea id="artist-bio" name="artist_bio" rows="4" placeholder="Tell visitors about yourself and your art..."></textarea>
          </div>

          <div class="form-group">
            <label for="contact-email">Contact Email</label>
            <input type="email" id="contact-email" name="contact_email" placeholder="your.email@example.com">
          </div>

          <div class="form-group">
            <label for="contact-phone">Contact Phone</label>
            <input type="tel" id="contact-phone" name="contact_phone" placeholder="+1 (555) 123-4567">
          </div>

          <div class="form-group">
            <label for="gallery-description">Gallery Description</label>
            <textarea id="gallery-description" name="gallery_description" rows="3" placeholder="Describe your gallery and artistic focus..."></textarea>
          </div>

          <div class="form-group">
            <div class="color-controls">
              <div class="color-input-group">
                <label for="primary-color">Primary Color:</label>
                <input type="color" id="primary-color" name="primary_color" value="#667eea" class="color-swatch" title="Primary theme color used for navigation and accents">
              </div>
              <div class="color-input-group">
                <label for="secondary-color">Secondary Color:</label>
                <input type="color" id="secondary-color" name="secondary_color" value="#764ba2" class="color-swatch" title="Secondary theme color used for gradients and highlights">
              </div>
            </div>
          </div>

          <div id="settings-status" class="settings-status"></div>

          <div class="form-actions">
            <a href="/art" id="settings-cancel" class="btn btn-secondary">Cancel</a>
            <button type="submit" class="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Set up event handlers
  document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);

  // Load current settings
  loadCurrentSettings();
}

// Load current settings and populate form
async function loadCurrentSettings() {
  try {
    showSettingsStatus('Loading current settings...', 'info');

    // Get current user for settings
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const settings = await getSettings();

    // Populate form fields
    const fields = ['site_title', 'artist_name', 'artist_bio', 'contact_email', 'contact_phone', 'gallery_description', 'primary_color', 'secondary_color'];
    fields.forEach(field => {
      const element = document.getElementById(field.replace('_', '-'));
      if (element && settings[field]) {
        element.value = settings[field];
      }
    });

    showSettingsStatus('Settings loaded', 'success');
    setTimeout(() => {
      document.getElementById('settings-status').innerHTML = '';
    }, 1000);

  } catch (error) {
    console.error('Error loading settings:', error);
    showSettingsStatus('Error loading settings', 'error');
  }
}

// Handle settings form submission
async function handleSettingsSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    showSettingsStatus('Saving settings...', 'info');

    // Save all settings as one JSON object
    const settings = Object.fromEntries(formData.entries());

    // Filter out empty values
    const filteredSettings = {};
    for (const [key, value] of Object.entries(settings)) {
      if (value && value.trim()) {
        filteredSettings[key] = value.trim();
      }
    }

    await updateSettings(filteredSettings);

    showSettingsStatus('Settings saved successfully!', 'success');

    // Update site title in navigation if changed (preserving the icon)
    if (settings.site_title) {
      const siteTitle = document.getElementById('site-title');
      const iconElement = siteTitle.querySelector('.site-icon');
      siteTitle.innerHTML = '';
      siteTitle.appendChild(iconElement);
      siteTitle.appendChild(document.createTextNode(settings.site_title));
    }

    // Redirect after delay
    setTimeout(() => {
      navigateTo('/art');
    }, 1500);

  } catch (error) {
    console.error('Error saving settings:', error);
    showSettingsStatus('Error saving settings. Please try again.', 'error');
  }

  // Reset button state
  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Settings';
}

// Show settings status message
function showSettingsStatus(message, type) {
  const statusDiv = document.getElementById('settings-status');
  statusDiv.className = `settings-status message ${type}`;
  statusDiv.textContent = message;
}
