/**
 * Profile API handlers
 */

import { withCors } from '../shared/cors.js';
import { authenticateRequestSafe } from '../shared/auth.js';
import { 
  executeQuery,
  queryFirst,
  getCurrentTimestamp,
  generateId
} from '../shared/db.js';

export async function handleProfile(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Route profile endpoints
    if (path === '/api/profile/avatar' && method === 'PUT') {
      return await updateAvatarType(request, env);
    }
    
    if (path === '/api/profile/avatar/upload' && method === 'POST') {
      return await uploadAvatar(request, env);
    }
    
    if (path === '/api/profile/avatar/gravatar' && method === 'POST') {
      return await importGravatar(request, env);
    }

    return withCors(new Response(JSON.stringify({ 
      error: 'Endpoint not found' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Profile error:', error);
    return withCors(new Response(JSON.stringify({ 
      error: 'Profile error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Update avatar type (icon or initials)
 */
async function updateAvatarType(request, env) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequestSafe(request, env.JWT_SECRET);
    if (!authResult.success) {
      return withCors(new Response(JSON.stringify({
        error: authResult.error
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const userId = authResult.user.id;
    const { avatar_type } = await request.json();

    // Validate avatar_type
    if (!['icon', 'initials'].includes(avatar_type)) {
      return withCors(new Response(JSON.stringify({
        error: 'Invalid avatar type. Must be "icon" or "initials"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Get current profile
    const profile = await queryFirst(env.DB, 'SELECT record FROM profiles WHERE id = ?', [userId]);
    
    if (!profile) {
      return withCors(new Response(JSON.stringify({
        error: 'Profile not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Update profile record
    const profileData = JSON.parse(profile.record);
    profileData.avatar_type = avatar_type;
    
    // Clear avatar_url for non-uploaded types to prevent old images from showing
    if (avatar_type !== 'uploaded') {
      delete profileData.avatar_url;
    }
    
    profileData.updated_at = getCurrentTimestamp();
    
    console.log('updateAvatarType - updating profile:', {
      userId,
      avatar_type,
      profileData
    });

    await executeQuery(
      env.DB,
      'UPDATE profiles SET record = ? WHERE id = ?',
      [JSON.stringify(profileData), userId]
    );

    return withCors(new Response(JSON.stringify({
      message: 'Avatar type updated successfully',
      avatar_type: avatar_type
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Update avatar type error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to update avatar type',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Upload avatar image
 */
async function uploadAvatar(request, env) {
  try {
    console.log('uploadAvatar function called');
    // Authenticate the request
    const authResult = await authenticateRequestSafe(request, env.JWT_SECRET);
    if (!authResult.success) {
      return withCors(new Response(JSON.stringify({
        error: authResult.error
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const userId = authResult.user.id;
    
    // Parse multipart form data
    const formData = await request.formData();
    const avatarFile = formData.get('avatar');
    
    if (!avatarFile) {
      return withCors(new Response(JSON.stringify({
        error: 'No avatar file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Validate file type
    if (!avatarFile.type.startsWith('image/')) {
      return withCors(new Response(JSON.stringify({
        error: 'File must be an image'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Validate file size (5MB max)
    if (avatarFile.size > 5 * 1024 * 1024) {
      return withCors(new Response(JSON.stringify({
        error: 'File size must be less than 5MB'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Get current profile to check for existing avatar
    const currentProfile = await queryFirst(env.DB, 'SELECT record FROM profiles WHERE id = ?', [userId]);
    let oldAvatarPath = null;
    
    if (currentProfile) {
      const currentProfileData = JSON.parse(currentProfile.record);
      if (currentProfileData.avatar_url && currentProfileData.avatar_type === 'uploaded') {
        // Extract filename from URL for local development or production
        const url = new URL(currentProfileData.avatar_url);
        oldAvatarPath = url.pathname.replace('/api/images/', '').replace('/', '');
      }
    }

    // Generate filename based on file type with timestamp to avoid caching issues
    const fileExtension = avatarFile.type === 'image/png' ? 'png' : 'jpg';
    const timestamp = Date.now();
    const fileName = `avatars/${userId}-${timestamp}.${fileExtension}`;

    // Delete old avatar if it exists
    if (oldAvatarPath) {
      try {
        await env.ARTWORK_IMAGES.delete(oldAvatarPath);
        console.log('Deleted old avatar:', oldAvatarPath);
      } catch (error) {
        console.warn('Failed to delete old avatar:', oldAvatarPath, error);
        // Continue with upload even if deletion fails
      }
    }

    // Upload to R2
    await env.ARTWORK_IMAGES.put(fileName, avatarFile.stream(), {
      httpMetadata: {
        contentType: avatarFile.type
      }
    });

    // Generate the avatar URL (use local development server in dev mode)
    const requestUrl = new URL(request.url);
    const isLocal = requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost';
    const avatarUrl = isLocal 
      ? `http://${requestUrl.host}/api/images/${fileName}`  // Local development endpoint
      : `https://${env.ARTWORK_IMAGES_DOMAIN || 'r2.artsite.ca'}/${fileName}`;

    // Update the existing profile data (already queried above)
    const profileData = JSON.parse(currentProfile.record);
    profileData.avatar_type = 'uploaded';
    profileData.avatar_url = avatarUrl;
    profileData.updated_at = getCurrentTimestamp();

    await executeQuery(
      env.DB,
      'UPDATE profiles SET record = ? WHERE id = ?',
      [JSON.stringify(profileData), userId]
    );

    return withCors(new Response(JSON.stringify({
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl,
      avatar_type: 'uploaded'
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Upload avatar error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to upload avatar',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Import Gravatar - store hash instead of downloading image
 */
async function importGravatar(request, env) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequestSafe(request, env.JWT_SECRET);
    if (!authResult.success) {
      return withCors(new Response(JSON.stringify({
        error: authResult.error
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const userId = authResult.user.id;
    const { email } = await request.json();

    if (!email) {
      return withCors(new Response(JSON.stringify({
        error: 'Email address is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Generate MD5 hash of email for Gravatar  
    const cleanEmail = email.toLowerCase().trim();
    const emailHash = await generateGravatarHash(cleanEmail);
    
    console.log('Gravatar details:', { 
      originalEmail: email, 
      cleanEmail, 
      hash: emailHash,
      hashLength: emailHash.length
    });

    // Test if Gravatar exists by fetching with d=404
    const testGravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404`;
    const gravatarResponse = await fetch(testGravatarUrl);
    if (!gravatarResponse.ok) {
      return withCors(new Response(JSON.stringify({
        error: 'No Gravatar found for this email address'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Get current profile and update it
    const profile = await queryFirst(env.DB, 'SELECT record FROM profiles WHERE id = ?', [userId]);
    
    if (!profile) {
      return withCors(new Response(JSON.stringify({
        error: 'Profile not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const profileData = JSON.parse(profile.record);
    profileData.avatar_type = 'gravatar';
    profileData.gravatar_hash = emailHash; // Store the hash instead of URL
    profileData.updated_at = getCurrentTimestamp();
    
    console.log('Gravatar import - updating profile:', {
      userId,
      avatar_type: profileData.avatar_type,
      gravatar_hash: profileData.gravatar_hash
    });

    await executeQuery(
      env.DB,
      'UPDATE profiles SET record = ? WHERE id = ?',
      [JSON.stringify(profileData), userId]
    );

    return withCors(new Response(JSON.stringify({
      message: 'Gravatar imported successfully',
      gravatar_hash: emailHash,
      avatar_type: 'gravatar'
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Import Gravatar error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Failed to import Gravatar',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Generate MD5 hash (for Gravatar)
 * Web Crypto API doesn't support MD5, so we implement it manually
 */
function generateGravatarHash(text) {
  // Simple MD5 implementation for Gravatar
  // Based on the MD5 algorithm specification
  function md5(string) {
    function rotateLeft(lValue, lAmount) {
      return (lValue << lAmount) | (lValue >>> (32 - lAmount));
    }
    
    function addUnsigned(lX, lY) {
      const lX8 = (lX & 0x80000000);
      const lY8 = (lY & 0x80000000);
      const lX4 = (lX & 0x40000000);
      const lY4 = (lY & 0x40000000);
      const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
      if (lX4 & lY4) {
        return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
      }
      if (lX4 | lY4) {
        if (lResult & 0x40000000) {
          return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
        } else {
          return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
        }
      } else {
        return (lResult ^ lX8 ^ lY8);
      }
    }
    
    function f(x, y, z) { return (x & y) | ((~x) & z); }
    function g(x, y, z) { return (x & z) | (y & (~z)); }
    function h(x, y, z) { return (x ^ y ^ z); }
    function i(x, y, z) { return (y ^ (x | (~z))); }
    
    function ff(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    
    function gg(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    
    function hh(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    
    function ii(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    
    function convertToWordArray(string) {
      let lWordCount;
      const lMessageLength = string.length;
      const lNumberOfWords_temp1 = lMessageLength + 8;
      const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
      const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
      const lWordArray = new Array(lNumberOfWords - 1);
      let lBytePosition = 0;
      let lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    }
    
    function wordToHex(lValue) {
      let wordToHexValue = "", wordToHexValue_temp = "", lByte, lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        wordToHexValue_temp = "0" + lByte.toString(16);
        wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
      }
      return wordToHexValue;
    }
    
    const x = convertToWordArray(string);
    let a = 0x67452301;
    let b = 0xEFCDAB89;
    let c = 0x98BADCFE;
    let d = 0x10325476;
    
    for (let k = 0; k < x.length; k += 16) {
      const aa = a;
      const bb = b;
      const cc = c;
      const dd = d;
      
      a = ff(a, b, c, d, x[k + 0], 7, 0xD76AA478);
      d = ff(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
      c = ff(c, d, a, b, x[k + 2], 17, 0x242070DB);
      b = ff(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
      a = ff(a, b, c, d, x[k + 4], 7, 0xF57C0FAF);
      d = ff(d, a, b, c, x[k + 5], 12, 0x4787C62A);
      c = ff(c, d, a, b, x[k + 6], 17, 0xA8304613);
      b = ff(b, c, d, a, x[k + 7], 22, 0xFD469501);
      a = ff(a, b, c, d, x[k + 8], 7, 0x698098D8);
      d = ff(d, a, b, c, x[k + 9], 12, 0x8B44F7AF);
      c = ff(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1);
      b = ff(b, c, d, a, x[k + 11], 22, 0x895CD7BE);
      a = ff(a, b, c, d, x[k + 12], 7, 0x6B901122);
      d = ff(d, a, b, c, x[k + 13], 12, 0xFD987193);
      c = ff(c, d, a, b, x[k + 14], 17, 0xA679438E);
      b = ff(b, c, d, a, x[k + 15], 22, 0x49B40821);
      
      a = gg(a, b, c, d, x[k + 1], 5, 0xF61E2562);
      d = gg(d, a, b, c, x[k + 6], 9, 0xC040B340);
      c = gg(c, d, a, b, x[k + 11], 14, 0x265E5A51);
      b = gg(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA);
      a = gg(a, b, c, d, x[k + 5], 5, 0xD62F105D);
      d = gg(d, a, b, c, x[k + 10], 9, 0x2441453);
      c = gg(c, d, a, b, x[k + 15], 14, 0xD8A1E681);
      b = gg(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8);
      a = gg(a, b, c, d, x[k + 9], 5, 0x21E1CDE6);
      d = gg(d, a, b, c, x[k + 14], 9, 0xC33707D6);
      c = gg(c, d, a, b, x[k + 3], 14, 0xF4D50D87);
      b = gg(b, c, d, a, x[k + 8], 20, 0x455A14ED);
      a = gg(a, b, c, d, x[k + 13], 5, 0xA9E3E905);
      d = gg(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8);
      c = gg(c, d, a, b, x[k + 7], 14, 0x676F02D9);
      b = gg(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A);
      
      a = hh(a, b, c, d, x[k + 5], 4, 0xFFFA3942);
      d = hh(d, a, b, c, x[k + 8], 11, 0x8771F681);
      c = hh(c, d, a, b, x[k + 11], 16, 0x6D9D6122);
      b = hh(b, c, d, a, x[k + 14], 23, 0xFDE5380C);
      a = hh(a, b, c, d, x[k + 1], 4, 0xA4BEEA44);
      d = hh(d, a, b, c, x[k + 4], 11, 0x4BDECFA9);
      c = hh(c, d, a, b, x[k + 7], 16, 0xF6BB4B60);
      b = hh(b, c, d, a, x[k + 10], 23, 0xBEBFBC70);
      a = hh(a, b, c, d, x[k + 13], 4, 0x289B7EC6);
      d = hh(d, a, b, c, x[k + 0], 11, 0xEAA127FA);
      c = hh(c, d, a, b, x[k + 3], 16, 0xD4EF3085);
      b = hh(b, c, d, a, x[k + 6], 23, 0x4881D05);
      a = hh(a, b, c, d, x[k + 9], 4, 0xD9D4D039);
      d = hh(d, a, b, c, x[k + 12], 11, 0xE6DB99E5);
      c = hh(c, d, a, b, x[k + 15], 16, 0x1FA27CF8);
      b = hh(b, c, d, a, x[k + 2], 23, 0xC4AC5665);
      
      a = ii(a, b, c, d, x[k + 0], 6, 0xF4292244);
      d = ii(d, a, b, c, x[k + 7], 10, 0x432AFF97);
      c = ii(c, d, a, b, x[k + 14], 15, 0xAB9423A7);
      b = ii(b, c, d, a, x[k + 5], 21, 0xFC93A039);
      a = ii(a, b, c, d, x[k + 12], 6, 0x655B59C3);
      d = ii(d, a, b, c, x[k + 3], 10, 0x8F0CCC92);
      c = ii(c, d, a, b, x[k + 10], 15, 0xFFEFF47D);
      b = ii(b, c, d, a, x[k + 1], 21, 0x85845DD1);
      a = ii(a, b, c, d, x[k + 8], 6, 0x6FA87E4F);
      d = ii(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0);
      c = ii(c, d, a, b, x[k + 6], 15, 0xA3014314);
      b = ii(b, c, d, a, x[k + 13], 21, 0x4E0811A1);
      a = ii(a, b, c, d, x[k + 4], 6, 0xF7537E82);
      d = ii(d, a, b, c, x[k + 11], 10, 0xBD3AF235);
      c = ii(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB);
      b = ii(b, c, d, a, x[k + 9], 21, 0xEB86D391);
      
      a = addUnsigned(a, aa);
      b = addUnsigned(b, bb);
      c = addUnsigned(c, cc);
      d = addUnsigned(d, dd);
    }
    
    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
  }
  
  return md5(text.toLowerCase().trim());
}