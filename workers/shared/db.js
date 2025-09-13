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
  
  const query = `
    INSERT INTO users (id, email, password_hash, name, email_verified, email_verification_token, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await executeQuery(db, query, [
    id,
    userData.email,
    userData.passwordHash,
    userData.name || null,
    userData.emailVerified || false,
    userData.verificationToken || null,
    now,
    now
  ]);
  
  return id;
}

/**
 * Get user by email
 */
export async function getUserByEmail(db, email) {
  const query = 'SELECT * FROM users WHERE email = ?';
  return await queryFirst(db, query, [email]);
}

/**
 * Get user by ID
 */
export async function getUserById(db, id) {
  const query = 'SELECT id, email, name, email_verified, created_at FROM users WHERE id = ?';
  return await queryFirst(db, query, [id]);
}

/**
 * Create artwork record
 */
export async function createArtwork(db, artworkData) {
  const id = generateId();
  const now = getCurrentTimestamp();
  
  const query = `
    INSERT INTO artworks (
      id, user_id, title, description, medium, dimensions, 
      year_created, price, tags, image_url, thumbnail_url, 
      storage_path, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await executeQuery(db, query, [
    id,
    artworkData.userId,
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
  const { userId, status = 'published', page = 1, limit = 20 } = options;
  
  let baseQuery = `
    SELECT a.*, u.name as artist_name, p.display_name as artist_display_name
    FROM artworks a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN profiles p ON a.user_id = p.user_id
  `;
  
  const filters = {};
  if (userId) filters['a.user_id'] = userId;
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
    SELECT a.*, u.name as artist_name, p.display_name as artist_display_name
    FROM artworks a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN profiles p ON a.user_id = p.user_id
    WHERE a.id = ?
  `;
  
  return await queryFirst(db, query, [id]);
}