/**
 * R2 Storage path utilities with environment isolation
 */

/**
 * Get environment-specific R2 path prefix
 * @param {Object} env - Environment variables
 * @returns {string} - Environment prefix ('dev/' for development, '' for production/local)
 */
export function getStoragePrefix(env) {
  // Local development uses local R2 emulation - no prefix needed
  if (env.ARTWORK_IMAGES_BASE_URL?.includes('localhost')) {
    return '';
  }
  
  // Development environment gets 'dev/' prefix for isolation
  if (env.FRONTEND_URL?.includes('dev.artsite.ca')) {
    return 'dev/';
  }
  
  // Production environment uses no prefix (root level)
  return '';
}

/**
 * Create environment-aware R2 storage path
 * @param {Object} env - Environment variables
 * @param {string} basePath - Base path (e.g., 'artworks/user-id/file-id/original.jpg')
 * @returns {string} - Full R2 path with environment prefix
 */
export function createStoragePath(env, basePath) {
  const prefix = getStoragePrefix(env);
  return prefix + basePath;
}

/**
 * Extract base path from environment-aware R2 path
 * @param {Object} env - Environment variables  
 * @param {string} fullPath - Full R2 path with potential environment prefix
 * @returns {string} - Base path without environment prefix
 */
export function extractBasePath(env, fullPath) {
  const prefix = getStoragePrefix(env);
  if (prefix && fullPath.startsWith(prefix)) {
    return fullPath.substring(prefix.length);
  }
  return fullPath;
}