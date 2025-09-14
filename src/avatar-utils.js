/**
 * Avatar utility functions
 */

import userIcon from './assets/icons/user.svg';

/**
 * Generate initials from a name
 */
export function generateInitials(name) {
  if (!name) return '??';
  
  const words = name.trim().split(' ').filter(word => word.length > 0);
  if (words.length === 0) return '??';
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Generate SVG initials image as data URL
 */
export function generateInitialsImageUrl(initials, size = 80, bgColor = '#667eea', textColor = 'white') {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${bgColor}"/>
      <text x="${size/2}" y="${size/2 + size/8}" text-anchor="middle" fill="${textColor}" 
            font-size="${size/2.5}" font-family="Arial, sans-serif" font-weight="600">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get avatar URL based on avatar type and user data
 */
export function getAvatarUrl(user, profile) {
  const avatarType = profile?.avatar_type || 'initials';
  
  switch (avatarType) {
    case 'icon':
      return userIcon;
      
    case 'initials':
      const initials = generateInitials(user?.name || profile?.display_name);
      return generateInitialsImageUrl(initials);
      
    case 'uploaded':
      if (profile?.avatar_url) {
        return profile.avatar_url;
      }
      // Fallback to initials if no uploaded image
      const fallbackInitials = generateInitials(user?.name || profile?.display_name);
      return generateInitialsImageUrl(fallbackInitials);
      
    case 'gravatar':
      if (profile?.avatar_url) {
        return profile.avatar_url;
      }
      // Fallback to initials if no Gravatar saved
      const gravatarFallbackInitials = generateInitials(user?.name || profile?.display_name);
      return generateInitialsImageUrl(gravatarFallbackInitials);
      
    default:
      const defaultInitials = generateInitials(user?.name || profile?.display_name);
      return generateInitialsImageUrl(defaultInitials);
  }
}

/**
 * Generate MD5 hash for Gravatar (simplified implementation)
 */
async function generateMD5(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetch Gravatar image and convert to blob
 */
export async function fetchGravatarAsBlob(email, size = 200) {
  try {
    const hash = await generateMD5(email);
    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
    
    const response = await fetch(gravatarUrl);
    if (!response.ok) {
      throw new Error('No Gravatar found for this email');
    }
    
    const blob = await response.blob();
    return blob;
  } catch (error) {
    throw new Error(`Failed to fetch Gravatar: ${error.message}`);
  }
}