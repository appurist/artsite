import './style.css'
import { getCurrentUser, login, logout, getArtworks, getFilePreview, createArtwork, uploadFile, getArtwork, getFileView } from './appwrite.js'

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  // Set current year in footer
  document.getElementById('current-year').textContent = new Date().getFullYear();
  
  // Check authentication status
  try {
    const user = await getCurrentUser();
    if (user) {
      console.log('User logged in:', user.email);
    }
  } catch (error) {
    console.log('No user logged in');
  }
  
  // Load initial page
  loadGalleryPage();
  
  // Set up navigation
  setupNavigation();
});

// Navigation setup
function setupNavigation() {
  document.getElementById('nav-gallery').addEventListener('click', (e) => {
    e.preventDefault();
    loadGalleryPage();
  });
  
  document.getElementById('nav-admin').addEventListener('click', (e) => {
    e.preventDefault();
    loadAdminPage();
  });
}

// Load gallery page
async function loadGalleryPage() {
  const app = document.getElementById('app');
  
  // Show initial loading state
  app.innerHTML = `
    <div class="gallery-header">
      <h1 class="gallery-title">Art Gallery</h1>
      <p class="gallery-subtitle">Original paintings and artwork</p>
    </div>
    
    <div class="loading">
      <p>Loading gallery...</p>
    </div>
  `;
  
  try {
    // Fetch artworks from Appwrite
    const artworks = await getArtworks();
    
    if (artworks.length === 0) {
      // Show empty state
      app.innerHTML = `
        <div class="gallery-header">
          <h1 class="gallery-title">Art Gallery</h1>
          <p class="gallery-subtitle">Original paintings and artwork</p>
        </div>
        
        <div class="empty-gallery">
          <h2>No artworks yet</h2>
          <p>The gallery is empty. Please use the admin panel to add some artwork.</p>
        </div>
      `;
    } else {
      // Show gallery with artworks
      const galleryGrid = artworks.map(artwork => createArtworkCard(artwork)).join('');
      
      app.innerHTML = `
        <div class="gallery-header">
          <h1 class="gallery-title">Art Gallery</h1>
          <p class="gallery-subtitle">Original paintings and artwork</p>
        </div>
        
        <div class="gallery-grid">
          ${galleryGrid}
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
      
      <div class="empty-gallery">
        <h2>Unable to load gallery</h2>
        <p>There was an error loading the artworks. Please try again later.</p>
      </div>
    `;
  }
}

// Create artwork card HTML
function createArtworkCard(artwork) {
  // Get the thumbnail URL
  const thumbnailUrl = artwork.image_id ? getFilePreview(artwork.image_id, 400, 300) : '/placeholder.jpg';
  
  // Format the year
  const yearDisplay = artwork.year_created ? ` (${artwork.year_created})` : '';
  
  return `
    <div class="artwork-item" data-id="${artwork.$id}">
      <a href="#" class="artwork-link" onclick="showArtworkModal('${artwork.$id}'); return false;">
        <div class="artwork-image-container">
          <img src="${thumbnailUrl}" alt="${artwork.title}" class="artwork-image" loading="lazy">
          <div class="artwork-overlay">
            <span>View Details</span>
          </div>
        </div>
        <div class="artwork-details">
          <h3 class="artwork-title">${artwork.title}</h3>
          ${artwork.medium ? `<p class="artwork-medium">${artwork.medium}</p>` : ''}
          ${artwork.year_created ? `<p class="artwork-year">${artwork.year_created}</p>` : ''}
          ${artwork.price ? `<p class="artwork-price">${artwork.price}</p>` : ''}
        </div>
      </a>
    </div>
  `;
}

// Show artwork modal (globally accessible)
window.showArtworkModal = async function(artworkId) {
  try {
    // Get artwork details
    const artwork = await getArtwork(artworkId);
    if (!artwork) {
      console.error('Artwork not found');
      return;
    }

    // Get full-size image URL
    const fullImageUrl = getFileView(artwork.image_id);
    
    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'artwork-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="closeArtworkModal()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <button class="modal-close" onclick="closeArtworkModal()">&times;</button>
          
          <div class="modal-spacer"></div>
          
          <div class="modal-image-container">
            <img src="${fullImageUrl}" alt="${artwork.title}" class="modal-image">
          </div>
          
          <div class="modal-details">
            <h2>${artwork.title}</h2>
            ${artwork.description ? `<p class="modal-description">${artwork.description}</p>` : ''}
            
            <div class="modal-metadata">
              ${artwork.medium ? `<p><strong>Medium:</strong> ${artwork.medium}</p>` : ''}
              ${artwork.dimensions ? `<p><strong>Dimensions:</strong> ${artwork.dimensions}</p>` : ''}
              ${artwork.year_created ? `<p><strong>Year:</strong> ${artwork.year_created}</p>` : ''}
              ${artwork.price ? `<p><strong>Price:</strong> ${artwork.price}</p>` : ''}
              ${artwork.tags ? `<p><strong>Tags:</strong> ${artwork.tags}</p>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add to page and show
    document.body.appendChild(modal);
    
    // Add escape key listener
    document.addEventListener('keydown', handleModalKeydown);
    
  } catch (error) {
    console.error('Error showing artwork modal:', error);
  }
}

// Close artwork modal (globally accessible)
window.closeArtworkModal = function() {
  const modal = document.querySelector('.artwork-modal');
  if (modal) {
    modal.remove();
    document.removeEventListener('keydown', handleModalKeydown);
  }
}

// Handle escape key for modal
function handleModalKeydown(e) {
  if (e.key === 'Escape') {
    closeArtworkModal();
  }
}

// Load admin page
async function loadAdminPage() {
  const app = document.getElementById('app');
  
  try {
    const user = await getCurrentUser();
    if (user) {
      // User is logged in - show admin dashboard
      showAdminDashboard(user);
    } else {
      // User is not logged in - show login form
      showLoginForm();
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    showLoginForm();
  }
}

// Show login form
function showLoginForm() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-container">
      <div class="admin-section">
        <h2>Admin Login</h2>
        <form id="login-form">
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" required>
          </div>
          <button type="submit" class="btn btn-primary">Login</button>
        </form>
        <div id="login-error" class="error-message" style="display: none;"></div>
      </div>
    </div>
  `;
  
  // Set up login form handler
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', handleLogin);
}

// Show admin dashboard
function showAdminDashboard(user) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-container">
      <div class="admin-header">
        <h2>Admin Dashboard</h2>
        <div class="admin-user-info">
          <span>Welcome, ${user.email}</span>
          <button id="logout-btn" class="btn btn-secondary">Logout</button>
        </div>
      </div>
      
      <div class="admin-content">
        <div class="admin-actions">
          <button id="upload-btn" class="btn btn-primary">Upload Artwork</button>
          <button id="settings-btn" class="btn btn-secondary">Site Settings</button>
        </div>
        
        <div class="artworks-section">
          <h3>Manage Artworks</h3>
          <div id="artworks-list" class="loading">
            <p>Loading artworks...</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Set up dashboard event handlers
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('upload-btn').addEventListener('click', showUploadForm);
  document.getElementById('settings-btn').addEventListener('click', showSettingsForm);
  
  // Load artworks list
  loadAdminArtworksList();
}

// Load artworks list for admin dashboard
async function loadAdminArtworksList() {
  const artworksListDiv = document.getElementById('artworks-list');
  
  try {
    artworksListDiv.innerHTML = '<div class="loading"><p>Loading artworks...</p></div>';
    
    const artworks = await getArtworks(true); // Only get current user's artworks
    
    if (artworks.length === 0) {
      artworksListDiv.innerHTML = `
        <div class="empty-artworks">
          <p>No artworks uploaded yet. Click "Upload Artwork" to get started.</p>
        </div>
      `;
    } else {
      const artworksList = artworks.map(artwork => `
        <div class="admin-artwork-item">
          <div class="admin-artwork-preview">
            <img src="${getFilePreview(artwork.image_id, 100, 100)}" alt="${artwork.title}">
          </div>
          <div class="admin-artwork-details">
            <h4>${artwork.title}</h4>
            <p>${artwork.medium || 'No medium specified'} ${artwork.year_created ? '(' + artwork.year_created + ')' : ''}</p>
            <p class="artwork-created">Uploaded: ${new Date(artwork.$createdAt).toLocaleDateString()}</p>
          </div>
          <div class="admin-artwork-actions">
            <button class="btn btn-secondary btn-sm" onclick="editArtwork('${artwork.$id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteArtwork('${artwork.$id}')">Delete</button>
          </div>
        </div>
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
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('login-error');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  // Show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';
  errorDiv.style.display = 'none';
  
  try {
    await login(email, password);
    // Reload admin page to show dashboard
    loadAdminPage();
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = 'Login failed. Please check your credentials and try again.';
    errorDiv.style.display = 'block';
  } finally {
    // Reset form state
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}

// Handle logout
async function handleLogout() {
  try {
    await logout();
    // Reload admin page to show login form
    loadAdminPage();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Show upload form
function showUploadForm() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-container">
      <div class="admin-header">
        <h2>Upload Artwork</h2>
        <button id="back-to-dashboard" class="btn btn-secondary">← Back to Dashboard</button>
      </div>
      
      <div class="admin-content">
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
            <button type="submit" class="btn btn-primary" id="upload-submit">Upload Artwork</button>
            <button type="button" class="btn btn-secondary" id="upload-cancel">Cancel</button>
          </div>
        </form>
        
        <div id="upload-status" class="upload-status" style="display: none;"></div>
      </div>
    </div>
  `;
  
  // Set up form event handlers
  document.getElementById('back-to-dashboard').addEventListener('click', loadAdminPage);
  document.getElementById('upload-cancel').addEventListener('click', loadAdminPage);
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
    const secureFilePath = `${currentUser.$id}/${uniqueFileId}.${fileExtension}`;
    
    // Create a new file with secure path as filename
    const secureFile = new File([file], secureFilePath, { type: file.type });
    
    // Upload file to storage
    const uploadedFile = await uploadFile(secureFile);
    
    showUploadStatus('Image uploaded, saving artwork details...', 'info');
    
    // Create artwork record with file ID and user ownership
    const artworkData = {
      ...formData,
      image_id: uploadedFile.$id,
      user_id: currentUser.$id,
      storage_path: secureFilePath,
      original_filename: file.name
    };
    
    await createArtwork(artworkData);
    
    showUploadStatus('Artwork uploaded successfully!', 'success');
    
    // Reset form and redirect after delay
    form.reset();
    setTimeout(() => {
      loadAdminPage();
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

// Edit artwork (placeholder)
function editArtwork(artworkId) {
  console.log('Edit artwork:', artworkId);
  // TODO: Implement edit functionality
}

// Delete artwork (placeholder)  
function deleteArtwork(artworkId) {
  console.log('Delete artwork:', artworkId);
  // TODO: Implement delete functionality
}

// Show settings form
function showSettingsForm() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="upload-container">
      <h1>Site Settings</h1>
      
      <div class="upload-form">
        <form id="settings-form">
          <div class="form-group">
            <label for="site-title-setting">Site Title</label>
            <input type="text" id="site-title-setting" name="site_title" placeholder="Art Gallery">
          </div>
          
          <div class="form-group">
            <label for="artist-name">Artist Name</label>
            <input type="text" id="artist-name" name="artist_name" placeholder="Your Name">
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
          
          <div id="settings-status" class="settings-status"></div>
          
          <div class="form-actions">
            <button type="button" id="settings-cancel" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Set up event handlers
  document.getElementById('settings-cancel').addEventListener('click', loadAdminPage);
  document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);
  
  // Load current settings
  loadCurrentSettings();
}

// Load current settings and populate form
async function loadCurrentSettings() {
  try {
    showSettingsStatus('Loading current settings...', 'info');
    
    const settings = await getSettings();
    
    // Populate form fields
    const fields = ['site_title', 'artist_name', 'artist_bio', 'contact_email', 'contact_phone', 'gallery_description'];
    fields.forEach(field => {
      const element = document.getElementById(field.replace('_', '-'));
      if (element && settings[field]) {
        element.value = settings[field];
      }
    });
    
    showSettingsStatus('Settings loaded', 'success');
    setTimeout(() => {
      document.getElementById('settings-status').innerHTML = '';
    }, 2000);
    
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
    
    // Save each setting
    const settings = Object.fromEntries(formData.entries());
    
    for (const [key, value] of Object.entries(settings)) {
      if (value.trim()) { // Only save non-empty values
        await setSetting(key, value);
      }
    }
    
    showSettingsStatus('Settings saved successfully!', 'success');
    
    // Update site title in navigation if changed
    if (settings.site_title) {
      document.getElementById('site-title').textContent = settings.site_title;
    }
    
    // Redirect after delay
    setTimeout(() => {
      loadAdminPage();
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
