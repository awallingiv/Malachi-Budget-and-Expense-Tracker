const nodemailer = require('nodemailer');

/**
 * Email Service for ReactBudget
 * Handles sending validation codes and other notifications
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
   * Send validation code email to user
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

      const baseUrl =
        process.env.APP_BASE_URL || 'http://localhost:3002';
      const normalizedBase = baseUrl.replace(/\/$/, '');
      const validationLink = `${normalizedBase}/api/auth/validate-link?code=${encodeURIComponent(
        validationCode
      )}`;

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'ReactBudget - Confirm Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2196F3;">Welcome to ReactBudget!</h2>
            
            <p>Hi ${username},</p>
            
            <p>Thank you for registering with ReactBudget. To complete your account setup, please confirm your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${validationLink}" style="background-color: #2196F3; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; font-weight: bold;">
                Confirm Email
              </a>
            </div>
            
            <p>If the button above does not work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #555;"><a href="${validationLink}">${validationLink}</a></p>
            
            <p><strong>Important:</strong> This link will expire in 15 minutes for security purposes.</p>
            
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

Thank you for registering with ReactBudget. To complete your account setup, please confirm your email address.

You can confirm your email by clicking this link:
${validationLink}

Important: This link will expire in 15 minutes for security purposes.

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
   * Send password reset email (for future use)
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

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'ReactBudget - Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f44336;">Password Reset Request</h2>
            
            <p>Hi ${username},</p>
            
            <p>We received a request to reset your ReactBudget account password. If you made this request, please use the reset code below:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #333; font-family: monospace; letter-spacing: 2px;">${resetToken}</h3>
            </div>
            
            <p><strong>Important:</strong> This reset code will expire in 30 minutes for security purposes.</p>
            
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

We received a request to reset your ReactBudget account password. If you made this request, please use the reset code below:

Reset Code: ${resetToken}

Important: This reset code will expire in 30 minutes for security purposes.

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