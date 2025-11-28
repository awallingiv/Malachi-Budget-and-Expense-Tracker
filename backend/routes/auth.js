const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeStoredProcedure, executeQuery, sql } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

/**
 * Validation middleware helper
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', [
  body('username')
    .isLength({ min: 1, max: 17 })
    .withMessage('Username must be 1-17 characters'),
  body('password')
    .isLength({ min: 1, max: 16 })
    .withMessage('Password must be 1-16 characters'),
  body('email')
    .isEmail()
    .isLength({ max: 45 })
    .withMessage('Valid email required (max 45 characters)'),
  body('name')
    .optional()
    .isLength({ max: 25 })
    .withMessage('Name must be max 25 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { username, password, email, name } = req.body;

    const result = await executeStoredProcedure('sprb_InsertUser', {
      Username: { type: sql.VarChar(17), value: username },
      Pass: { type: sql.VarChar(16), value: password },
      Email: { type: sql.VarChar(45), value: email },
      Name: { type: sql.VarChar(25), value: name || null }
    });

    const response = result.recordset[0];
    console.log('🔎 sprb_InsertUser response:', response);

    if (response.Success) {
      // Send validation email asynchronously (don't block response)
      emailService.sendValidationEmail(email, response.ValidationCode, username)
        .then(emailSent => {
          if (emailSent) {
            console.log(`✅ Validation email sent to ${email}`);
          } else {
            console.log(`⚠️ Failed to send validation email to ${email}`);
          }
        })
        .catch(error => {
          console.error(`❌ Email service error for ${email}:`, error);
        });

      res.status(201).json({
        Success: true,
        Message: response.Message + ' A validation email has been sent to your email address.',
        UserId: response.UserId,
        ValidationCode: response.ValidationCode // Still include for testing/debugging
      });
    } else {
      // Surface detailed error information for debugging/clients
      console.warn('⚠️ User registration failed:', {
        username,
        email,
        message: response.Message
      });
      res.status(400).json({
        Success: false,
        Message: response.Message
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      Success: false,
      Message: 'Server error during registration'
    });
  }
});

/**
 * @route   POST /api/auth/validate
 * @desc    Validate user account with validation code
 * @access  Public
 */
router.post('/validate', [
  body('usernameOrEmail')
    .notEmpty()
    .withMessage('Username or email required'),
  body('password')
    .notEmpty()
    .withMessage('Password required'),
  body('validationCode')
    .isUUID()
    .withMessage('Valid validation code required')
], handleValidationErrors, async (req, res) => {
  try {
    const { usernameOrEmail, password, validationCode } = req.body;

    const result = await executeStoredProcedure('sprb_RegisterUser', {
      UsernameOrEmail: { type: sql.VarChar(50), value: usernameOrEmail },
      Pass: { type: sql.VarChar(16), value: password },
      ValidationCode: { type: sql.UniqueIdentifier, value: validationCode }
    });

    const response = result.recordset[0];

    res.json({
      Success: response.Success,
      Message: response.Message
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      Success: false,
      Message: 'Server error during validation'
    });
  }
});

/**
 * @route   GET /api/auth/validate-link
 * @desc    Validate user account via emailed link (validation code only)
 * @access  Public
 */
router.get('/validate-link', async (req, res) => {
  const { code } = req.query;
  const appUrl = (process.env.APP_BASE_URL || '').replace(/\/$/, '') || 'http://localhost:8081';

  if (!code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>ReactBudget - Invalid Link</title></head>
        <body>
          <h1>Invalid validation link</h1>
          <p>The link you used is missing a validation code.</p>
        </body>
      </html>
    `);
  }

  try {
    const result = await executeQuery(`
      DECLARE @Rows INT;

      UPDATE dbo.Users
      SET Validated = 1
      WHERE ValidationCode = @ValidationCode
        AND ValidationExpires > GETDATE();

      SET @Rows = @@ROWCOUNT;

      SELECT 
        CASE WHEN @Rows > 0 THEN 1 ELSE 0 END AS Success,
        CASE WHEN @Rows > 0 
             THEN 'Your email has been validated successfully.' 
             ELSE 'This validation link is invalid or has expired.' 
        END AS Message;
    `, {
      ValidationCode: { type: sql.UniqueIdentifier, value: code }
    });

    const response = result.recordset[0];

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>ReactBudget - Email Validation</title>
          <style>
            body { font-family: Arial, sans-serif; background: #0a0f1a; color: #f5f5f5; text-align: center; padding: 40px; }
            .card { background: #111827; border-radius: 12px; padding: 24px 32px; max-width: 480px; margin: 40px auto; border: 1px solid #1f2937; }
            h1 { color: ${response.Success ? '#22c55e' : '#f97373'}; }
            a { color: #60a5fa; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${response.Success ? 'Email Validated' : 'Validation Failed'}</h1>
            <p>${response.Message}</p>
            <p>You can now return to the ReactBudget app and sign in.</p>
            <p style="margin-top: 16px;">
              <a href="${appUrl}">Go to ReactBudget login</a>
            </p>
          </div>
        </body>
      </html>
    `;

    if (response.Success) {
      return res.status(200).send(html);
    }

    return res.status(400).send(html);
  } catch (error) {
    console.error('Validation link error:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>ReactBudget - Server Error</title></head>
        <body>
          <h1>Server error</h1>
          <p>We could not validate your account. Please try again later or use the app to validate with your code.</p>
        </body>
      </html>
    `);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
  body('usernameOrEmail')
    .notEmpty()
    .withMessage('Username or email required'),
  body('password')
    .notEmpty()
    .withMessage('Password required')
], handleValidationErrors, async (req, res) => {
  try {
    const rawUsernameOrEmail = req.body.usernameOrEmail || '';
    const usernameOrEmail = rawUsernameOrEmail.trim();
    const password = req.body.password;

    console.log('🔐 Login attempt:', { usernameOrEmail });

    // Try login with username first
    let result = await executeStoredProcedure('sprb_LoginUserWithUsername', {
      Username: { type: sql.VarChar(17), value: usernameOrEmail },
      Password: { type: sql.VarChar(16), value: password }
    });

    let response = result.recordset[0];
    console.log('🔐 Username login response:', response);

    // If username login failed and input looks like email, try email login
    if (!response.Success && usernameOrEmail.includes('@')) {
      result = await executeStoredProcedure('sprb_LoginUserWithEmail', {
        Email: { type: sql.VarChar(50), value: usernameOrEmail },
        Password: { type: sql.VarChar(16), value: password }
      });
      response = result.recordset[0];
      console.log('🔐 Email login response:', response);
    }

    if (response.Success) {
      // Generate JWT token
      const token = generateToken(response.UserId);

      res.json({
        Success: true,
        Message: response.Message,
        UserId: response.UserId,
        Username: response.Username,
        Name: response.Name,
        Email: response.Email,
        token
      });
    } else {
      res.status(401).json({
        Success: false,
        Message: response.Message
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      Success: false,
      Message: 'Server error during login'
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (updates validation code)
 * @access  Public
 */
router.post('/forgot-password', [
  body('usernameOrEmail')
    .notEmpty()
    .withMessage('Username or email required')
], handleValidationErrors, async (req, res) => {
  try {
    const rawUsernameOrEmail = req.body.usernameOrEmail || '';
    const usernameOrEmail = rawUsernameOrEmail.trim();

    const result = await executeStoredProcedure('sprb_UpdateValidationCode', {
      UsernameOrEmail: { type: sql.VarChar(50), value: usernameOrEmail }
    });

    const response = result.recordset[0];

    if (response.Success) {
      try {
        // Look up user details to send reset email
        const userResult = await executeQuery(`
          SELECT TOP 1 Username, Email
          FROM dbo.Users
          WHERE Username = @UsernameOrEmail OR Email = @UsernameOrEmail;
        `, {
          UsernameOrEmail: { type: sql.VarChar(50), value: usernameOrEmail }
        });

        const user = userResult.recordset[0];

        if (user && user.Email) {
          const emailSent = await emailService.sendPasswordResetEmail(
            user.Email,
            response.ValidationCode,
            user.Username || usernameOrEmail
          );
          console.log('📧 Password reset email send result:', emailSent);
        } else {
          console.warn('⚠️ Forgot password: user not found for email sending');
        }
      } catch (emailError) {
        console.error('❌ Error sending password reset email:', emailError);
      }

      res.json({
        Success: true,
        Message: 'If an account with that username or email exists, a password reset email has been sent.'
      });
    } else {
      res.status(404).json({
        Success: false,
        Message: response.Message
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      Success: false,
      Message: 'Server error during password reset request'
    });
  }
});

module.exports = router;