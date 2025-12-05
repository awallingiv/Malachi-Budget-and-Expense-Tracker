const express = require('express');
const { body, query, validationResult } = require('express-validator');
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

    const result = await executeStoredProcedure('spmb_InsertUser', {
      Username: { type: sql.VarChar(17), value: username },
      Pass: { type: sql.VarChar(16), value: password },
      Email: { type: sql.VarChar(45), value: email },
      Name: { type: sql.VarChar(25), value: name || null }
    });

    const response = result.recordset[0];

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

    const result = await executeStoredProcedure('spmb_RegisterUser', {
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
    const { usernameOrEmail, password } = req.body;

    // Try login with username first
    let result = await executeStoredProcedure('spmb_LoginUserWithUsername', {
      Username: { type: sql.VarChar(17), value: usernameOrEmail },
      Password: { type: sql.VarChar(16), value: password }
    });

    let response = result.recordset[0];

    // If username login failed and input looks like email, try email login
    if (!response.Success && usernameOrEmail.includes('@')) {
      result = await executeStoredProcedure('spmb_LoginUserWithEmail', {
        Email: { type: sql.VarChar(50), value: usernameOrEmail },
        Password: { type: sql.VarChar(16), value: password }
      });
      response = result.recordset[0];
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
    const { usernameOrEmail } = req.body;

    const result = await executeStoredProcedure('spmb_UpdateValidationCode', {
      UsernameOrEmail: { type: sql.VarChar(50), value: usernameOrEmail }
    });

    const response = result.recordset && result.recordset[0];

    if (!response || !response.Success) {
      return res.status(404).json({
        Success: false,
        Message: response?.Message || 'User not found'
      });
    }

    // Look up the user's email and username so we can send a reset link
    try {
      const userResult = await executeQuery(
        'SELECT TOP 1 Email, Username FROM Users WHERE Username = @ue OR Email = @ue',
        {
          ue: { type: sql.VarChar(50), value: usernameOrEmail }
        }
      );

      const user = userResult.recordset && userResult.recordset[0];

      if (user && user.Email) {
        emailService
          .sendPasswordResetEmail(user.Email, response.ValidationCode, user.Username || user.Email)
          .then((sent) => {
            if (sent) {
              console.log(`✅ Password reset email sent to ${user.Email}`);
            } else {
              console.warn(`⚠️ Failed to send password reset email to ${user.Email}`);
            }
          })
          .catch((err) => {
            console.error('❌ Error sending password reset email:', err);
          });
      } else {
        console.warn(
          `⚠️ Password reset requested for ${usernameOrEmail}, but no matching email/username record was found for notification`
        );
      }
    } catch (lookupError) {
      console.error('❌ Error looking up user for password reset email:', lookupError);
      // Don't fail the main request if email sending fails; keep response generic
    }

    return res.json({
      Success: true,
      Message: response.Message
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      Success: false,
      Message: 'Server error during password reset request'
    });
  }
});

/**
 * @route   GET /api/auth/verify-email-link
 * @desc    Verify email using email + validation code (used by email link)
 * @access  Public
 */
router.get(
  '/verify-email-link',
  [
    query('email').isEmail().withMessage('Valid email is required'),
    query('code').isUUID().withMessage('Valid verification code is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, code } = req.query;

      const result = await executeStoredProcedure('spmb_VerifyEmailWithCode', {
        Email: { type: sql.VarChar(45), value: email },
        ValidationCode: { type: sql.UniqueIdentifier, value: code },
      });

      const response = result.recordset && result.recordset[0];

      if (!response) {
        return res.status(500).json({
          Success: false,
          Message: 'Verification failed: no response from database',
        });
      }

      return res.json({
        Success: !!response.Success,
        Message: response.Message,
        UserId: response.UserId || null,
      });
    } catch (error) {
      console.error('Verify email (link) error:', error);
      return res.status(500).json({
        Success: false,
        Message: 'Server error during email verification',
      });
    }
  }
);

/**
 * @route   POST /api/auth/reset-password-link
 * @desc    Reset password using email + validation code (from link)
 * @access  Public
 */
router.post(
  '/reset-password-link',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('code').isUUID().withMessage('Valid reset code is required'),
    body('newPassword')
      .isLength({ min: 1, max: 16 })
      .withMessage('New password must be 1-16 characters'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;

      // First, verify the code is valid for this email and not expired
      const verifyResult = await executeStoredProcedure('spmb_VerifyEmailWithCode', {
        Email: { type: sql.VarChar(45), value: email },
        ValidationCode: { type: sql.UniqueIdentifier, value: code },
      });

      const verifyResponse = verifyResult.recordset && verifyResult.recordset[0];

      if (!verifyResponse || !verifyResponse.Success || !verifyResponse.UserId) {
        return res.status(400).json({
          Success: false,
          Message: verifyResponse?.Message || 'Invalid or expired reset link.',
        });
      }

      // Update the user's password and mark as validated
      const updateResult = await executeStoredProcedure('spmb_UpdateUserPassword', {
        UserID: { type: sql.UniqueIdentifier, value: verifyResponse.UserId },
        NewPassword: { type: sql.VarChar(16), value: newPassword },
      });

      const updateResponse = updateResult.recordset && updateResult.recordset[0];

      if (!updateResponse || !updateResponse.Success) {
        return res.status(500).json({
          Success: false,
          Message: updateResponse?.Message || 'Failed to update password.',
        });
      }

      return res.json({
        Success: true,
        Message: updateResponse.Message || 'Password updated successfully.',
      });
    } catch (error) {
      console.error('Reset password (link) error:', error);
      return res.status(500).json({
        Success: false,
        Message: 'Server error during password reset',
      });
    }
  }
);

module.exports = router;