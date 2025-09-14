/**
 * Authentication utilities for JWT and password handling
 */

import { generateId } from './db.js';

/**
 * Generate a JWT token
 */
export async function generateJWT(payload, secret, expiresIn = '7d') {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiry(expiresIn);

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: exp
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  
  const signature = await signHMAC(`${encodedHeader}.${encodedPayload}`, secret);
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token, secret) {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new Error('Invalid token format');
    }

    // Verify signature
    const expectedSignature = await signHMAC(`${encodedHeader}.${encodedPayload}`, secret);
    const expectedEncodedSignature = base64UrlEncode(expectedSignature);
    
    if (encodedSignature !== expectedEncodedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (error) {
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

/**
 * Hash a password using PBKDF2
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password, hash) {
  try {
    const [saltHex, hashHex] = hash.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );

    const hashArray = new Uint8Array(derivedBits);
    const computedHashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

    return computedHashHex === hashHex;
  } catch (error) {
    return false;
  }
}

/**
 * Extract JWT from Authorization header
 */
export function extractTokenFromHeader(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Authenticate request and return user info
 */
export async function authenticateRequest(request, secret) {
  const token = extractTokenFromHeader(request);
  if (!token) {
    throw new Error('No token provided');
  }

  const payload = await verifyJWT(token, secret);
  return {
    account_id: payload.sub,
    email: payload.email,
    name: payload.name
  };
}

/**
 * Generate email verification token
 */
export function generateVerificationToken() {
  return generateId();
}

/**
 * Generate password reset token
 */
export function generateResetToken() {
  return generateId();
}

// Helper functions

async function signHMAC(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return new Uint8Array(signature);
}

function base64UrlEncode(data) {
  if (typeof data === 'string') {
    data = new TextEncoder().encode(data);
  }
  
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(encoded) {
  // Add padding if needed
  let padded = encoded;
  while (padded.length % 4) {
    padded += '=';
  }
  
  // Replace URL-safe characters
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  
  // Decode
  const decoded = atob(base64);
  return decoded;
}

function parseExpiry(expiresIn) {
  const units = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400,
    'w': 604800
  };

  const match = expiresIn.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error('Invalid expiry format');
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}