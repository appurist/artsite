/**
 * Database utilities for D1
 */

/**
 * Execute a query with parameters
 */
export async function executeQuery(db, query, params = []) {
  try {
    const stmt = db.prepare(query);
    const result = await stmt.bind(...params).run();
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Execute a query and return first result
 */
export async function queryFirst(db, query, params = []) {
  try {
    const stmt = db.prepare(query);
    const result = await stmt.bind(...params).first();
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Execute a query and return all results
 */
export async function queryAll(db, query, params = []) {
  try {
    const stmt = db.prepare(query);
    const result = await stmt.bind(...params).all();
    return result.results || [];
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Generate a unique ID
 */
export function generateId() {
  return crypto.randomUUID();
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Paginate results
 */
export function buildPaginationQuery(baseQuery, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  return `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
}

/**
 * Build WHERE clause from filters
 */
export function buildWhereClause(filters = {}) {
  const conditions = [];
  const params = [];
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  });
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

/**
 * Create user record
 */
export async function createUser(db, userData) {
  const id = generateId();
  const now = getCurrentTimestamp();
  
  const accountRecord = {
    password_hash: userData.passwordHash,
    name: userData.name || null,
    email_verified: userData.emailVerified || false,
    created_at: now,
    updated_at: now
  };
  
  const query = `INSERT INTO accounts (id, email, record) VALUES (?, ?, ?)`;
  
  await executeQuery(db, query, [
    id,
    userData.email,
    JSON.stringify(accountRecord)
  ]);
  
  // Create verification token if provided
  if (userData.verificationToken) {
    await createVerificationToken(db, id, 'email_verification', userData.verificationToken);
  }
  
  // Create default profile for the new user
  const defaultDisplayName = userData.name;
  
  const profileRecord = {
    display_name: defaultDisplayName,
    bio: null,
    statement: null,
    avatar_url: null,
    website: null,
    instagram: null,
    twitter: null,
    location: null,
    phone: null,
    created_at: now,
    updated_at: now
  };

  const profileQuery = `INSERT INTO profiles (id, public_profile, created_at, record) VALUES (?, ?, ?, ?)`;
  await executeQuery(db, profileQuery, [
    id,
    true, // Default to public profile
    now,
    JSON.stringify(profileRecord)
  ]);
  
  return id;
}

/**
 * Get user by email
 */
export async function getUserByEmail(db, email) {
  const query = `SELECT id, email, record FROM accounts WHERE email = ?`;
  const result = await queryFirst(db, query, [email]);
  if (result) {
    const accountData = JSON.parse(result.record);
    return {
      id: result.id,
      email: result.email,
      ...accountData
    };
  }
  return null;
}

/**
 * Get user by ID
 */
export async function getUserById(db, id) {
  const query = `SELECT id, email, record FROM accounts WHERE id = ?`;
  const result = await queryFirst(db, query, [id]);
  if (result) {
    const accountData = JSON.parse(result.record);
    return {
      id: result.id,
      email: result.email,
      name: accountData.name,
      email_verified: accountData.email_verified,
      created_at: accountData.created_at
    };
  }
  return null;
}

/**
 * Create artwork record
 */
export async function createArtwork(db, artworkData) {
  const id = generateId();
  const now = getCurrentTimestamp();
  
  const query = `
    INSERT INTO artworks (
      id, account_id, title, description, medium, dimensions, 
      year_created, price, tags, image_url, thumbnail_url, 
      storage_path, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await executeQuery(db, query, [
    id,
    artworkData.account_id,
    artworkData.title,
    artworkData.description || null,
    artworkData.medium || null,
    artworkData.dimensions || null,
    artworkData.yearCreated || null,
    artworkData.price || null,
    JSON.stringify(artworkData.tags || []),
    artworkData.imageUrl,
    artworkData.thumbnailUrl || null,
    artworkData.storagePath || null,
    artworkData.status || 'published',
    now,
    now
  ]);
  
  return id;
}

/**
 * Get artworks with pagination
 */
export async function getArtworks(db, options = {}) {
  const { account_id, status = 'published', page = 1, limit = 20 } = options;
  
  let baseQuery = `
    SELECT a.*, p.record as profile_record
    FROM artworks a
    LEFT JOIN profiles p ON a.account_id = p.id
  `;
  
  const filters = {};
  if (account_id) filters['a.account_id'] = account_id;
  if (status) filters['a.status'] = status;
  
  const { whereClause, params } = buildWhereClause(filters);
  baseQuery += ` ${whereClause} ORDER BY a.created_at DESC`;
  
  const paginatedQuery = buildPaginationQuery(baseQuery, page, limit);
  
  return await queryAll(db, paginatedQuery, params);
}

/**
 * Get single artwork by ID
 */
export async function getArtworkById(db, id) {
  const query = `
    SELECT a.*, p.record as profile_record
    FROM artworks a
    LEFT JOIN profiles p ON a.account_id = p.id
    WHERE a.id = ?
  `;
  
  return await queryFirst(db, query, [id]);
}

/**
 * Create or update verification token
 */
export async function createVerificationToken(db, accountId, tokenType, tokenValue, expiresAt = null) {
  const now = getCurrentTimestamp();
  
  const query = `
    INSERT OR REPLACE INTO verifications (account_id, token_type, token_value, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  await executeQuery(db, query, [
    accountId,
    tokenType,
    tokenValue,
    expiresAt,
    now
  ]);
}

/**
 * Get verification token
 */
export async function getVerificationToken(db, tokenValue) {
  const query = `SELECT * FROM verifications WHERE token_value = ?`;
  return await queryFirst(db, query, [tokenValue]);
}

/**
 * Delete verification token
 */
export async function deleteVerificationToken(db, accountId, tokenType) {
  const query = `DELETE FROM verifications WHERE account_id = ? AND token_type = ?`;
  await executeQuery(db, query, [accountId, tokenType]);
}

/**
 * Clean expired tokens
 */
export async function cleanExpiredTokens(db) {
  const now = getCurrentTimestamp();
  const query = `DELETE FROM verifications WHERE expires_at IS NOT NULL AND expires_at < ?`;
  await executeQuery(db, query, [now]);
}

/**
 * Get custom domain user for a hostname
 * Returns the user ID if the domain has a custom domain mapping, undefined otherwise
 */
export async function getCustomDomainUser(db, hostname) {
  if (!hostname) {
    return undefined;
  }
  
  // Clean up hostname (remove port if present)
  const cleanHostname = hostname.split(':')[0];
  
  const query = `SELECT id FROM accounts WHERE domain = ?`;
  const result = await queryFirst(db, query, [cleanHostname]);
  
  return result ? result.id : undefined;
}