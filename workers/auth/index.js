/**
 * Authentication API handlers
 */

import { withCors } from '../shared/cors.js';
import { 
  generateJWT, 
  verifyJWT, 
  hashPassword, 
  verifyPassword,
  authenticateRequest,
  generateVerificationToken 
} from '../shared/auth.js';
import { 
  createUser, 
  getUserByEmail, 
  getUserById,
  executeQuery,
  queryFirst 
} from '../shared/db.js';
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail 
} from '../shared/email.js';

export async function handleAuth(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // Route auth endpoints
    if (path === '/api/auth/register' && method === 'POST') {
      return await register(request, env);
    }
    
    if (path === '/api/auth/login' && method === 'POST') {
      return await login(request, env);
    }
    
    if (path === '/api/auth/user' && method === 'GET') {
      return await getCurrentUser(request, env);
    }
    
    if (path === '/api/auth/verify' && method === 'POST') {
      return await verifyEmail(request, env);
    }
    
    if (path === '/api/auth/forgot-password' && method === 'POST') {
      return await forgotPassword(request, env);
    }
    
    if (path === '/api/auth/reset-password' && method === 'POST') {
      return await resetPassword(request, env);
    }

    return withCors(new Response(JSON.stringify({ 
      error: 'Endpoint not found' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('Auth error:', error);
    return withCors(new Response(JSON.stringify({ 
      error: 'Authentication error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Register a new user
 */
async function register(request, env) {
  try {
    const { email, password, name } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return withCors(new Response(JSON.stringify({
        error: 'Email and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Check if user already exists
    const existingUser = await getUserByEmail(env.DB, email);
    if (existingUser) {
      return withCors(new Response(JSON.stringify({
        error: 'User already exists'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Generate verification token
    const verificationToken = generateVerificationToken();
    
    // Create user
    const userId = await createUser(env.DB, {
      email,
      passwordHash,
      name,
      emailVerified: false,
      verificationToken
    });
    
    // Generate JWT
    const token = await generateJWT(
      { 
        sub: userId,
        email,
        name,
        emailVerified: false
      },
      env.JWT_SECRET
    );
    
    // Send verification email
    try {
      await sendVerificationEmail(env, email, verificationToken, name);
      console.log(`Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }
    
    return withCors(new Response(JSON.stringify({
      message: 'User registered successfully',
      user: {
        id: userId,
        email,
        name,
        emailVerified: false
      },
      token
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    }));
    
  } catch (error) {
    console.error('Registration error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Registration failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Login user
 */
async function login(request, env) {
  try {
    const { email, password } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return withCors(new Response(JSON.stringify({
        error: 'Email and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Get user by email
    const user = await getUserByEmail(env.DB, email);
    if (!user) {
      return withCors(new Response(JSON.stringify({
        error: 'Invalid credentials'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return withCors(new Response(JSON.stringify({
        error: 'Invalid credentials'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Generate JWT
    const token = await generateJWT(
      { 
        sub: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified
      },
      env.JWT_SECRET
    );
    
    return withCors(new Response(JSON.stringify({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified
      },
      token
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));
    
  } catch (error) {
    console.error('Login error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Login failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Get current user from JWT
 */
async function getCurrentUser(request, env) {
  try {
    const user = await authenticateRequest(request, env.JWT_SECRET);
    const userData = await getUserById(env.DB, user.userId);
    
    if (!userData) {
      return withCors(new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    return withCors(new Response(JSON.stringify({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        emailVerified: userData.email_verified
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));
    
  } catch (error) {
    console.error('Get user error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Unauthorized',
      message: error.message
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Verify email with token
 */
async function verifyEmail(request, env) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return withCors(new Response(JSON.stringify({
        error: 'Verification token is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Find user with verification token
    const user = await queryFirst(
      env.DB,
      'SELECT * FROM users WHERE email_verification_token = ?',
      [token]
    );
    
    if (!user) {
      return withCors(new Response(JSON.stringify({
        error: 'Invalid verification token'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Update user as verified
    await executeQuery(
      env.DB,
      'UPDATE users SET email_verified = true, email_verification_token = NULL, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), user.id]
    );
    
    return withCors(new Response(JSON.stringify({
      message: 'Email verified successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));
    
  } catch (error) {
    console.error('Email verification error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Verification failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Forgot password - send reset email
 */
async function forgotPassword(request, env) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return withCors(new Response(JSON.stringify({
        error: 'Email is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    const user = await getUserByEmail(env.DB, email);
    if (!user) {
      // Return success even if user doesn't exist (security)
      return withCors(new Response(JSON.stringify({
        message: 'Password reset email sent if user exists'
      }), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Generate reset token
    const resetToken = generateVerificationToken();
    const resetExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    
    // Update user with reset token
    await executeQuery(
      env.DB,
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ?, updated_at = ? WHERE id = ?',
      [resetToken, resetExpires, new Date().toISOString(), user.id]
    );
    
    // Send password reset email
    try {
      await sendPasswordResetEmail(env, email, resetToken, user.name);
      console.log(`Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't reveal email send failure to prevent email enumeration
    }
    
    return withCors(new Response(JSON.stringify({
      message: 'Password reset email sent if user exists'
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));
    
  } catch (error) {
    console.error('Forgot password error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Password reset failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}

/**
 * Reset password with token
 */
async function resetPassword(request, env) {
  try {
    const { token, password } = await request.json();
    
    if (!token || !password) {
      return withCors(new Response(JSON.stringify({
        error: 'Token and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Find user with valid reset token
    const user = await queryFirst(
      env.DB,
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > ?',
      [token, new Date().toISOString()]
    );
    
    if (!user) {
      return withCors(new Response(JSON.stringify({
        error: 'Invalid or expired reset token'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    // Hash new password
    const passwordHash = await hashPassword(password);
    
    // Update password and clear reset token
    await executeQuery(
      env.DB,
      'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL, updated_at = ? WHERE id = ?',
      [passwordHash, new Date().toISOString(), user.id]
    );
    
    return withCors(new Response(JSON.stringify({
      message: 'Password reset successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    }));
    
  } catch (error) {
    console.error('Password reset error:', error);
    return withCors(new Response(JSON.stringify({
      error: 'Password reset failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}