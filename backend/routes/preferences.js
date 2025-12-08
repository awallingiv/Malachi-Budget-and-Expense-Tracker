const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/preferences/:userId
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/:userId',
  protect,
  param('userId').isUUID(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;

      // Verify user owns this resource
      if (req.user.UserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const result = await executeQuery(
        'EXEC spmb_GetUserPreferences @UserId',
        { UserId: userId }
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'User preferences not found' });
      }

      const preferences = result.recordset[0];

      // Parse JSON fields
      const response = {
        ...preferences,
        LastIncomeTemplate: preferences.LastIncomeTemplate
          ? JSON.parse(preferences.LastIncomeTemplate)
          : null,
        MerchantDefaults: preferences.MerchantDefaults
          ? JSON.parse(preferences.MerchantDefaults)
          : {}
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   PUT /api/preferences/:userId
 * @desc    Update user preferences (full update)
 * @access  Private
 */
router.put('/:userId',
  protect,
  param('userId').isUUID(),
  body('LastExpenseCategory').optional().isString().isLength({ max: 50 }),
  body('LastIncomeTemplate').optional().isObject(),
  body('CustomTithePercentage').optional().isFloat({ min: 0, max: 100 }),
  body('MerchantDefaults').optional().isObject(),
  body('Theme').optional().isString().isLength({ max: 20 }),
  body('DefaultCurrency').optional().isString().isLength({ max: 10 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;

      // Verify user owns this resource
      if (req.user.UserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const {
        LastExpenseCategory,
        LastIncomeTemplate,
        CustomTithePercentage,
        MerchantDefaults,
        Theme,
        DefaultCurrency
      } = req.body;

      const result = await executeQuery(
        `EXEC spmb_UpdateUserPreferences
          @UserId,
          @LastExpenseCategory,
          @LastIncomeTemplate,
          @CustomTithePercentage,
          @MerchantDefaults,
          @Theme,
          @DefaultCurrency`,
        {
          UserId: userId,
          LastExpenseCategory: LastExpenseCategory || null,
          LastIncomeTemplate: LastIncomeTemplate ? JSON.stringify(LastIncomeTemplate) : null,
          CustomTithePercentage: CustomTithePercentage || null,
          MerchantDefaults: MerchantDefaults ? JSON.stringify(MerchantDefaults) : null,
          Theme: Theme || null,
          DefaultCurrency: DefaultCurrency || null
        }
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'Failed to update preferences' });
      }

      const preferences = result.recordset[0];

      // Parse JSON fields
      const response = {
        ...preferences,
        LastIncomeTemplate: preferences.LastIncomeTemplate
          ? JSON.parse(preferences.LastIncomeTemplate)
          : null,
        MerchantDefaults: preferences.MerchantDefaults
          ? JSON.parse(preferences.MerchantDefaults)
          : {}
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   PUT /api/preferences/:userId/last-expense-category
 * @desc    Update last used expense category
 * @access  Private
 */
router.put('/:userId/last-expense-category',
  protect,
  param('userId').isUUID(),
  body('category').isString().notEmpty().isLength({ max: 50 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { category } = req.body;

      // Verify user owns this resource
      if (req.user.UserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const result = await executeQuery(
        'EXEC spmb_UpdateLastExpenseCategory @UserId, @CategoryName',
        { UserId: userId, CategoryName: category }
      );

      const preferences = result.recordset[0];
      const response = {
        ...preferences,
        LastIncomeTemplate: preferences.LastIncomeTemplate
          ? JSON.parse(preferences.LastIncomeTemplate)
          : null,
        MerchantDefaults: preferences.MerchantDefaults
          ? JSON.parse(preferences.MerchantDefaults)
          : {}
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating last expense category:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   PUT /api/preferences/:userId/last-income-template
 * @desc    Update last used income template
 * @access  Private
 */
router.put('/:userId/last-income-template',
  protect,
  param('userId').isUUID(),
  body('template').isObject(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { template } = req.body;

      // Verify user owns this resource
      if (req.user.UserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const result = await executeQuery(
        'EXEC spmb_UpdateLastIncomeTemplate @UserId, @TemplateJson',
        { UserId: userId, TemplateJson: JSON.stringify(template) }
      );

      const preferences = result.recordset[0];
      const response = {
        ...preferences,
        LastIncomeTemplate: preferences.LastIncomeTemplate
          ? JSON.parse(preferences.LastIncomeTemplate)
          : null,
        MerchantDefaults: preferences.MerchantDefaults
          ? JSON.parse(preferences.MerchantDefaults)
          : {}
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating last income template:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   PUT /api/preferences/:userId/merchant-defaults
 * @desc    Update merchant defaults mapping
 * @access  Private
 */
router.put('/:userId/merchant-defaults',
  protect,
  param('userId').isUUID(),
  body('merchantDefaults').isObject(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { merchantDefaults } = req.body;

      // Verify user owns this resource
      if (req.user.UserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const result = await executeQuery(
        'EXEC spmb_UpdateMerchantDefaults @UserId, @MerchantDefaultsJson',
        { UserId: userId, MerchantDefaultsJson: JSON.stringify(merchantDefaults) }
      );

      const preferences = result.recordset[0];
      const response = {
        ...preferences,
        LastIncomeTemplate: preferences.LastIncomeTemplate
          ? JSON.parse(preferences.LastIncomeTemplate)
          : null,
        MerchantDefaults: preferences.MerchantDefaults
          ? JSON.parse(preferences.MerchantDefaults)
          : {}
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating merchant defaults:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   POST /api/preferences/:userId/reset
 * @desc    Reset user preferences to default
 * @access  Private
 */
router.post('/:userId/reset',
  protect,
  param('userId').isUUID(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;

      // Verify user owns this resource
      if (req.user.UserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const result = await executeQuery(
        'EXEC spmb_ResetUserPreferences @UserId',
        { UserId: userId }
      );

      const preferences = result.recordset[0];
      const response = {
        ...preferences,
        LastIncomeTemplate: preferences.LastIncomeTemplate
          ? JSON.parse(preferences.LastIncomeTemplate)
          : null,
        MerchantDefaults: preferences.MerchantDefaults
          ? JSON.parse(preferences.MerchantDefaults)
          : {}
      };

      res.json(response);
    } catch (error) {
      console.error('Error resetting preferences:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

module.exports = router;
