const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeStoredProcedure, sql } = require('../config/database');
const { generateToken } = require('../middleware/auth');

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

    if (response.Success) {
      res.status(201).json({
        Success: true,
        Message: response.Message,
        UserId: response.UserId,
        ValidationCode: response.ValidationCode
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
    let result = await executeStoredProcedure('sprb_LoginUserWithUsername', {
      Username: { type: sql.VarChar(17), value: usernameOrEmail },
      Password: { type: sql.VarChar(16), value: password }
    });

    let response = result.recordset[0];

    // If username login failed and input looks like email, try email login
    if (!response.Success && usernameOrEmail.includes('@')) {
      result = await executeStoredProcedure('sprb_LoginUserWithEmail', {
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

    const result = await executeStoredProcedure('sprb_UpdateValidationCode', {
      UsernameOrEmail: { type: sql.VarChar(50), value: usernameOrEmail }
    });

    const response = result.recordset[0];

    if (response.Success) {
      res.json({
        Success: true,
        Message: response.Message,
        ValidationCode: response.ValidationCode // In production, this would be sent via email
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