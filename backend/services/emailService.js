const nodemailer = require('nodemailer');

/**
 * Resolve the public app base URL for links in emails.
 * Prefer explicit env var, fall back to production domain.
 */
const getAppBaseUrl = () => {
  const base =
    process.env.APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.FRONTEND_BASE_URL ||
    // Fallback to known production host
    'https://budget.austinwalling.dev';

  return base.replace(/\/$/, '');
};

/**
 * Email Service for ReactBudget
 * Handles sending validation and password reset emails.
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize the SMTP transporter with environment variables
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true',
        tls: {
          ciphers: 'SSLv3'
        }
      });

      console.log('✅ Email transporter initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
    }
  }

  /**
   * Send validation email with a clickable link and fallback code.
   * @param {string} email - User's email address
   * @param {string} validationCode - UUID validation code
   * @param {string} username - User's username
   * @returns {Promise<boolean>} Success status
   */
  async sendValidationEmail(email, validationCode, username) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const appBaseUrl = getAppBaseUrl();
      const verificationUrl = `${appBaseUrl}/verify-email?email=${encodeURIComponent(
        email
      )}&code=${validationCode}`;

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'ReactBudget - Account Validation Required',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2196F3;">Welcome to ReactBudget!</h2>
            
            <p>Hi ${username},</p>
            
            <p>Thank you for registering with ReactBudget. To complete your account setup, please verify your email address using the button below:</p>
            
            <p style="text-align: center; margin: 24px 0;">
              <a 
                href="${verificationUrl}"
                style="
                  display: inline-block;
                  padding: 12px 24px;
                  background-color: #2196F3;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 4px;
                  font-weight: 600;
                "
              >
                Verify Email
              </a>
            </p>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">
              <a href="${verificationUrl}">${verificationUrl}</a>
            </p>
            
            <p>If you didn't create this account, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: #666;">
              This email was sent from ReactBudget - Your Personal Finance Management App<br />
              If you have any issues, please contact support.
            </p>
          </div>
        `,
        text: `
Welcome to ReactBudget!

Hi ${username},

Thank you for registering with ReactBudget.

To complete your account setup, click the link below to verify your email address:

${verificationUrl}

If the link does not open, you can also copy and paste this code into the ReactBudget app on the "Validate Account" screen:

Validation Code: ${validationCode}

This code will expire in 15 minutes for security purposes.

If you didn't create this account, please ignore this email.

---
ReactBudget - Your Personal Finance Management App
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Validation email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send validation email:', error);
      return false;
    }
  }

  /**
   * Send password reset email with a clickable link and fallback code.
   * @param {string} email - User's email address
   * @param {string} resetToken - Password reset token
   * @param {string} username - User's username
   * @returns {Promise<boolean>} Success status
   */
  async sendPasswordResetEmail(email, resetToken, username) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const appBaseUrl = getAppBaseUrl();
      const resetUrl = `${appBaseUrl}/reset-password?email=${encodeURIComponent(
        email
      )}&code=${resetToken}`;

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'ReactBudget - Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f44336;">Password Reset Request</h2>
            
            <p>Hi ${username},</p>
            
            <p>We received a request to reset your ReactBudget account password. If you made this request, please reset your password using the button below:</p>
            
            <p style="text-align: center; margin: 24px 0;">
              <a 
                href="${resetUrl}"
                style="
                  display: inline-block;
                  padding: 12px 24px;
                  background-color: #f44336;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 4px;
                  font-weight: 600;
                "
              >
                Reset Password
              </a>
            </p>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">
              <a href="${resetUrl}">${resetUrl}</a>
            </p>
            
            <p>If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            
            <p style="font-size: 12px; color: #666;">
              This email was sent from ReactBudget - Your Personal Finance Management App<br />
              If you have any issues, please contact support.
            </p>
          </div>
        `,
        text: `
Password Reset Request

Hi ${username},

We received a request to reset your ReactBudget account password. If you made this request, you can reset your password using the link below:

${resetUrl}


If you didn't request this password reset, please ignore this email. Your account remains secure.

---
ReactBudget - Your Personal Finance Management App
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Password reset email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} Success status
   */
  async testConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      console.log('✅ SMTP connection test successful');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();