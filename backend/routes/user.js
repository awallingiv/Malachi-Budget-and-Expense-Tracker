const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { executeStoredProcedure, sql } = require('../config/database');
const { protect, validateOwnership } = require('../middleware/auth');

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

// Apply authentication to all user routes
router.use(protect);

/**
 * @route   GET /api/user/:userId
 * @desc    Get user profile
 * @access  Private
 */
router.get('/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await executeStoredProcedure('sprb_GetUserById', {
      UserId: { type: sql.UniqueIdentifier, value: userId }
    });

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.recordset[0];
    
    // Remove sensitive information
    delete user.Pass;
    delete user.ValidationCode;

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

/**
 * @route   PUT /api/user/:userId
 * @desc    Update user profile
 * @access  Private
 */
router.put('/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  body('Email').optional().isEmail().isLength({ max: 45 }).withMessage('Valid email required (max 45 chars)'),
  body('Name').optional().isLength({ max: 25 }).withMessage('Name max 25 characters')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId } = req.params;
    const { Email, Name } = req.body;

    const result = await executeStoredProcedure('sprb_UpdateUser', {
      UserId: { type: sql.UniqueIdentifier, value: userId },
      Pass: { type: sql.VarChar(16), value: null }, // Don't update password here
      Email: { type: sql.VarChar(45), value: Email || null },
      Name: { type: sql.VarChar(25), value: Name || null },
      Validated: { type: sql.TinyInt, value: null }, // Don't change validation status
      ValidationCode: { type: sql.UniqueIdentifier, value: null } // Don't change validation code
    });

    const response = result.recordset[0];

    if (response.Success) {
      res.json({
        success: true,
        message: response.Message
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.Message
      });
    }
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

/**
 * @route   PUT /api/user/:userId/password
 * @desc    Update user password
 * @access  Private
 */
router.put('/:userId/password', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  body('newPassword').isLength({ min: 1, max: 16 }).withMessage('Password required (max 16 chars)')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const result = await executeStoredProcedure('sprb_UpdateUserPassword', {
      UserID: { type: sql.UniqueIdentifier, value: userId },
      NewPassword: { type: sql.VarChar(16), value: newPassword }
    });

    const response = result.recordset[0];

    if (response.Success) {
      res.json({
        success: true,
        message: response.Message
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.Message
      });
    }
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update password'
    });
  }
});

/**
 * @route   DELETE /api/user/:userId
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await executeStoredProcedure('sprb_DeleteUser', {
      UserId: { type: sql.UniqueIdentifier, value: userId }
    });

    const response = result.recordset[0];

    if (response.Success) {
      res.json({
        success: true,
        message: response.Message
      });
    } else {
      res.status(404).json({
        success: false,
        error: response.Message
      });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user account'
    });
  }
});

/**
 * @route   GET /api/user/:userId/validation
 * @desc    Get validation info for user
 * @access  Private
 */
router.get('/:userId/validation', [
  param('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await executeStoredProcedure('sprb_GetValidationInfo', {
      UserID: { type: sql.UniqueIdentifier, value: userId }
    });

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User validation info not found'
      });
    }

    const validationInfo = result.recordset[0];

    res.json({
      success: true,
      validationCode: validationInfo.ValidationCode,
      creationTime: validationInfo.CreationTime
    });
  } catch (error) {
    console.error('Get validation info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch validation information'
    });
  }
});

module.exports = router;