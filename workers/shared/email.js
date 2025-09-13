/**
 * MailerSend email utility for artsite.ca
 */

const MAILERSEND_API_URL = 'https://api.mailersend.com/v1';

/**
 * Send email via MailerSend API
 */
export async function sendEmail(env, emailData) {
  try {
    const response = await fetch(`${MAILERSEND_API_URL}/email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        from: {
          email: emailData.from || 'noreply@artsite.ca',
          name: emailData.fromName || 'artsite.ca'
        },
        to: [
          {
            email: emailData.to,
            name: emailData.toName || ''
          }
        ],
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || stripHtml(emailData.html)
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`MailerSend API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

/**
 * Send email verification
 */
export async function sendVerificationEmail(env, email, token, userName = '') {
  const verificationUrl = `${env.FRONTEND_URL || 'https://artsite.ca'}/verify?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your artsite.ca Account</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #667eea; margin-bottom: 10px;">artsite.ca</h1>
            <p style="color: #666; font-size: 18px;">Welcome to your art gallery</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            
            ${userName ? `<p>Hi ${userName},</p>` : '<p>Hello,</p>'}
            
            <p>Thank you for creating an account with artsite.ca! To complete your registration and start showcasing your artwork, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          text-decoration: none; 
                          padding: 15px 30px; 
                          border-radius: 5px; 
                          display: inline-block; 
                          font-weight: bold;">
                    Verify Email Address
                </a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                This verification link will expire in 24 hours. If you didn't create an account with artsite.ca, you can safely ignore this email.
            </p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 12px;">
            <p>© 2025 artsite.ca. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </body>
    </html>
  `;

  return await sendEmail(env, {
    to: email,
    toName: userName,
    subject: 'Verify your artsite.ca account',
    html
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(env, email, token, userName = '') {
  const resetUrl = `${env.FRONTEND_URL || 'https://artsite.ca'}/reset-password?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your artsite.ca Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #667eea; margin-bottom: 10px;">artsite.ca</h1>
            <p style="color: #666; font-size: 18px;">Password Reset Request</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            
            ${userName ? `<p>Hi ${userName},</p>` : '<p>Hello,</p>'}
            
            <p>We received a request to reset the password for your artsite.ca account. If you made this request, click the button below to set a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          text-decoration: none; 
                          padding: 15px 30px; 
                          border-radius: 5px; 
                          display: inline-block; 
                          font-weight: bold;">
                    Reset Password
                </a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password will remain unchanged.
            </p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 12px;">
            <p>© 2025 artsite.ca. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </body>
    </html>
  `;

  return await sendEmail(env, {
    to: email,
    toName: userName,
    subject: 'Reset your artsite.ca password',
    html
  });
}

/**
 * Simple HTML to text converter
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}