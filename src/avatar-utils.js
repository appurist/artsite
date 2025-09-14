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
      if (profile?.gravatar_hash) {
        // Build Gravatar URL from stored hash
        return `https://www.gravatar.com/avatar/${profile.gravatar_hash}?s=200&d=identicon`;
      }
      // Fallback to initials if no Gravatar hash
      const gravatarFallbackInitials = generateInitials(user?.name || profile?.display_name);
      return generateInitialsImageUrl(gravatarFallbackInitials);
      
    default:
      const defaultInitials = generateInitials(user?.name || profile?.display_name);
      return generateInitialsImageUrl(defaultInitials);
  }
}

/**
 * Generate avatar HTML for display at any size
 */
export function generateAvatarHtml(user, profile, size = 64) {
  const avatarType = profile?.avatar_type || 'initials';
  const iconSize = Math.round(size * 0.75); // Icon is 75% of container size
  
  switch (avatarType) {
    case 'icon':
      return `<div class="avatar-icon" style="width: ${size}px; height: ${size}px; border-radius: 50%; background-color: var(--primary-color, #ff6b6b); display: flex; align-items: center; justify-content: center;">
        <img src="${userIcon}" alt="User Icon" style="width: ${iconSize}px; height: ${iconSize}px; filter: brightness(0) invert(1);" />
      </div>`;
      
    case 'initials':
      const initials = generateInitials(user?.name || profile?.display_name);
      const initialsUrl = generateInitialsImageUrl(initials, size);
      return `<div class="avatar-initials" style="width: ${size}px; height: ${size}px; border-radius: 50%; background-image: url('${initialsUrl}'); background-size: cover;"></div>`;
      
    case 'gravatar':
      if (profile?.gravatar_hash) {
        const gravatarUrl = `https://www.gravatar.com/avatar/${profile.gravatar_hash}?s=${size}&d=identicon`;
        return `<img src="${gravatarUrl}" alt="Avatar" style="width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover;" />`;
      }
      // Fallback to initials
      const gravatarFallbackInitials = generateInitials(user?.name || profile?.display_name);
      const gravatarFallbackUrl = generateInitialsImageUrl(gravatarFallbackInitials, size);
      return `<div class="avatar-initials" style="width: ${size}px; height: ${size}px; border-radius: 50%; background-image: url('${gravatarFallbackUrl}'); background-size: cover;"></div>`;
      
    case 'uploaded':
      if (profile?.avatar_url) {
        return `<img src="${profile.avatar_url}" alt="Avatar" style="width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover;" />`;
      }
      // Fallback to initials
      const uploadFallbackInitials = generateInitials(user?.name || profile?.display_name);
      const uploadFallbackUrl = generateInitialsImageUrl(uploadFallbackInitials, size);
      return `<div class="avatar-initials" style="width: ${size}px; height: ${size}px; border-radius: 50%; background-image: url('${uploadFallbackUrl}'); background-size: cover;"></div>`;
      
    default:
      const defaultInitials = generateInitials(user?.name || profile?.display_name);
      const defaultUrl = generateInitialsImageUrl(defaultInitials, size);
      return `<div class="avatar-initials" style="width: ${size}px; height: ${size}px; border-radius: 50%; background-image: url('${defaultUrl}'); background-size: cover;"></div>`;
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