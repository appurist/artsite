/**
 * API Client for artsite.ca Cloudflare Workers backend
 * Replaces Appwrite SDK
 */

// Auto-detect environment for API base URL
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8787/api'  // Local Workers dev server
  : '/api';  // Production/staging

// Token management
let authToken = localStorage.getItem('auth_token');

/**
 * Set authentication token
 */
export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

/**
 * Get current auth token
 */
export function getAuthToken() {
  return authToken || localStorage.getItem('auth_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    method: 'GET',
    ...options,
    headers
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    // Use console.log for authentication errors (like "User not found") to reduce noise
    if (endpoint === '/auth/user' && error.message?.includes('User not found')) {
      console.log(`API Info [${config.method} ${endpoint}]:`, error.message);
    } else {
      console.error(`API Error [${config.method} ${endpoint}]:`, error);
    }
    throw error;
  }
}

// ===== AUTHENTICATION API =====

/**
 * Register a new user
 */
export async function register(email, password, name) {
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name })
  });
  
  // Store auth token
  if (response.token) {
    setAuthToken(response.token);
  }
  
  return response;
}

/**
 * Login user
 */
export async function login(email, password) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  // Check for login failure
  if (response.success === false) {
    throw new Error(response.message || 'Login failed');
  }
  
  // Store auth token
  if (response.token) {
    setAuthToken(response.token);
  }
  
  return response;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const response = await apiRequest('/auth/user');
  return response.user;
}

/**
 * Logout user
 */
export function logout() {
  setAuthToken(null);
  return Promise.resolve();
}

/**
 * Verify email with token
 */
export async function verifyEmail(token) {
  return await apiRequest('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
}

/**
 * Request password reset
 */
export async function forgotPassword(email) {
  return await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

/**
 * Reset password with token
 */
export async function resetPassword(token, password) {
  return await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password })
  });
}

// ===== ARTWORKS API =====

/**
 * Get all artworks with optional filtering
 */
export async function getArtworks(options = {}) {
  const params = new URLSearchParams();
  
  if (options.userId) params.append('userId', options.userId);
  if (options.status) params.append('status', options.status);
  if (options.page) params.append('page', options.page.toString());
  if (options.limit) params.append('limit', options.limit.toString());
  
  const query = params.toString();
  const endpoint = query ? `/artworks?${query}` : '/artworks';
  
  const response = await apiRequest(endpoint);
  return response.artworks || [];
}

/**
 * Get single artwork by ID
 */
export async function getArtwork(id) {
  const response = await apiRequest(`/artworks/${id}`);
  return response.artwork;
}

/**
 * Create new artwork
 */
export async function createArtwork(artworkData) {
  const response = await apiRequest('/artworks', {
    method: 'POST',
    body: JSON.stringify(artworkData)
  });
  return response.artwork;
}

/**
 * Update artwork
 */
export async function updateArtwork(id, artworkData) {
  const response = await apiRequest(`/artworks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(artworkData)
  });
  return response.artwork;
}

/**
 * Delete artwork
 */
export async function deleteArtwork(id) {
  return await apiRequest(`/artworks/${id}`, {
    method: 'DELETE'
  });
}

// ===== PROFILES API =====

/**
 * Get all public profiles
 */
export async function getProfiles() {
  const response = await apiRequest('/profiles');
  return response.profiles;
}

/**
 * Get specific profile by user ID
 */
export async function getProfile(userId) {
  const response = await apiRequest(`/profiles/${userId}`);
  return response.profile;
}

/**
 * Update own profile
 */
export async function updateProfile(profileData) {
  const response = await apiRequest('/profiles', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
  return response.profile;
}

// ===== SETTINGS API =====

/**
 * Get user settings
 */
export async function getSettings() {
  const response = await apiRequest('/settings');
  return response.settings;
}

/**
 * Update user settings
 */
export async function updateSettings(settingsData) {
  const response = await apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify(settingsData)
  });
  return response.settings;
}

// ===== UPLOAD API =====

/**
 * Upload image file
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  const token = getAuthToken();
  const headers = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return {
      $id: data.fileId,
      url: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl,
      originalUrl: data.originalUrl,
      storagePath: data.storagePath,
      size: data.fileSize,
      type: data.fileType
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// ===== COMPATIBILITY HELPERS =====

/**
 * Create account (alias for register)
 */
export const createAccount = register;

/**
 * Create session (alias for login)  
 */
export const createSession = login;

/**
 * Get session (alias for getCurrentUser)
 */
export const getSession = getCurrentUser;

/**
 * Delete session (alias for logout)
 */
export const deleteSession = logout;