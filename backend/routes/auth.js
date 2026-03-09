const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { executeStoredProcedure, executeQuery, sql } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const bcrypt = require('bcryptjs');

const router = express.Router();

/**
 * Validation middleware helper
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      Success: false,
      Message: 'Validation failed',
      Errors: errors.array()
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
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('email')
    .isEmail()
    .isLength({ max: 45 })
    .withMessage('Valid email required (max 45 characters)'),
  body('name')
    .optional()
    .isLength({ max: 25 })
    .withMessage('Name must be max 25 characters'),
  body('enableTitheTracking')
    .optional()
    .isBoolean()
    .withMessage('enableTitheTracking must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { username, password, email, name, enableTitheTracking } = req.body;

    // Hash password with bcrypt (salt rounds = 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await executeStoredProcedure('spmb_InsertUser', {
      Username: { type: sql.VarChar(17), value: username },
      Pass: { type: sql.VarChar(255), value: hashedPassword },
      Email: { type: sql.VarChar(45), value: email },
      Name: { type: sql.VarChar(25), value: name || null }
    });

    const response = result.recordset[0];

    if (response.Success) {
      // Initialize default expense groupings for new user
      try {
        await executeStoredProcedure('spmb_InitializeDefaultGroupings', {
          UserID: { type: sql.UniqueIdentifier, value: response.UserId },
          Username: { type: sql.VarChar(17), value: username },
          EnableTithe: { type: sql.Bit, value: enableTitheTracking ? 1 : 0 }
        });
        console.log(`✅ Default groupings initialized for user: ${username} (tithe: ${!!enableTitheTracking})`);
      } catch (groupingError) {
        console.error(`⚠️ Failed to initialize groupings for ${username}:`, groupingError);
        // Don't block registration if groupings fail
      }

      // If tithe tracking enabled, set the preference
      if (enableTitheTracking) {
        try {
          await executeStoredProcedure('spmb_UpdateUserPreferences', {
            UserId: { type: sql.UniqueIdentifier, value: response.UserId },
            TitheTrackingEnabled: { type: sql.Bit, value: 1 }
          });
          console.log(`✅ Tithe tracking enabled for user: ${username}`);
        } catch (prefError) {
          console.error(`⚠️ Failed to set tithe preference for ${username}:`, prefError);
        }
      }

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

    // Hash password with bcrypt (salt rounds = 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await executeStoredProcedure('spmb_RegisterUser', {
      UsernameOrEmail: { type: sql.VarChar(50), value: usernameOrEmail },
      Pass: { type: sql.VarChar(255), value: hashedPassword },
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
    const isEmail = usernameOrEmail.includes('@');
    
    // Retrieve user by email or username to get stored password hash
    const userQuery = isEmail 
      ? 'SELECT UserId, Username, Name, Email, Pass, Validated FROM Users WHERE Email = @identifier'
      : 'SELECT UserId, Username, Name, Email, Pass, Validated FROM Users WHERE Username = @identifier';
    
    const userResult = await executeQuery(userQuery, {
      identifier: { type: sql.VarChar(50), value: usernameOrEmail }
    });

    const user = userResult.recordset && userResult.recordset[0];

    if (!user) {
      return res.status(401).json({
        Success: false,
        Message: 'Invalid username or password.'
      });
    }

    // Check if user is validated
    if (!user.Validated) {
      return res.status(401).json({
        Success: false,
        Message: 'User has not been validated.'
      });
    }

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.Pass);

    if (!isPasswordValid) {
      return res.status(401).json({
        Success: false,
        Message: 'Invalid username or password.'
      });
    }

    // Login successful
    // Generate JWT token
    const token = generateToken(user.UserId);

    res.json({
      Success: true,
      Message: 'Login successful.',
      UserId: user.UserId,
      Username: user.Username,
      Name: user.Name,
      Email: user.Email,
      token
    });
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
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('🔍 Reset password request body:', req.body);
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

      // Hash new password with bcrypt (salt rounds = 10)
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password and mark as validated
      const updateResult = await executeStoredProcedure('spmb_UpdateUserPassword', {
        UserID: { type: sql.UniqueIdentifier, value: verifyResponse.UserId },
        NewPassword: { type: sql.VarChar(255), value: hashedPassword },
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