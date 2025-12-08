const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { executeStoredProcedure, sql } = require('../config/database');
const { param, body, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * @route   GET /api/categories/:userId
 * @desc    Get all categories for a user
 * @access  Private
 */
router.get('/:userId',
  protect,
  param('userId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Verify ownership
      if (req.user.UserId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const result = await executeStoredProcedure('spmb_GetUserCategories', {
        UserID: { type: sql.UniqueIdentifier, value: userId }
      });

      res.json(result.recordset || []);
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * @route   GET /api/categories/grouping/:groupingId
 * @desc    Get categories in a specific grouping
 * @access  Private
 */
router.get('/grouping/:groupingId',
  protect,
  param('groupingId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { groupingId } = req.params;
      const userId = req.user.UserId;

      const result = await executeStoredProcedure('spmb_GetCategoriesInGrouping', {
        GroupingID: { type: sql.UniqueIdentifier, value: groupingId },
        UserID: { type: sql.UniqueIdentifier, value: userId }
      });

      res.json(result.recordset || []);
    } catch (error) {
      console.error('Get categories in grouping error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private
 */
router.post('/',
  protect,
  body('userId').isUUID(),
  body('groupingId').isUUID(),
  body('categoryName').trim().isLength({ min: 1, max: 50 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, groupingId, categoryName, displayOrder, color, icon } = req.body;

      if (req.user.UserId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const result = await executeStoredProcedure('spmb_CreateCategory', {
        GroupingID: { type: sql.UniqueIdentifier, value: groupingId },
        UserID: { type: sql.UniqueIdentifier, value: userId },
        Username: { type: sql.VarChar(17), value: req.user.Username },
        CategoryName: { type: sql.NVarChar(50), value: categoryName },
        DisplayOrder: { type: sql.Int, value: displayOrder || 999 },
        Color: { type: sql.VarChar(20), value: color || null },
        Icon: { type: sql.VarChar(50), value: icon || null }
      });

      res.json(result.recordset[0]);
    } catch (error) {
      console.error('Create category error:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        return res.status(409).json({
          success: false,
          message: 'Category name already exists in this grouping'
        });
      }
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * @route   PUT /api/categories/:categoryId
 * @desc    Update category
 * @access  Private
 */
router.put('/:categoryId',
  protect,
  param('categoryId').isUUID(),
  body('userId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { userId, categoryName, groupingId, displayOrder, color, icon } = req.body;

      if (req.user.UserId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const result = await executeStoredProcedure('spmb_UpdateCategory', {
        CategoryID: { type: sql.UniqueIdentifier, value: categoryId },
        UserID: { type: sql.UniqueIdentifier, value: userId },
        CategoryName: { type: sql.NVarChar(50), value: categoryName || null },
        GroupingID: { type: sql.UniqueIdentifier, value: groupingId || null },
        DisplayOrder: { type: sql.Int, value: displayOrder || null },
        Color: { type: sql.VarChar(20), value: color || null },
        Icon: { type: sql.VarChar(50), value: icon || null }
      });

      if (result.recordset.length === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json(result.recordset[0]);
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * @route   DELETE /api/categories/:categoryId
 * @desc    Delete category (soft delete)
 * @access  Private
 */
router.delete('/:categoryId',
  protect,
  param('categoryId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { userId } = req.body;

      if (req.user.UserId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const result = await executeStoredProcedure('spmb_DeleteCategory', {
        CategoryID: { type: sql.UniqueIdentifier, value: categoryId },
        UserID: { type: sql.UniqueIdentifier, value: userId }
      });

      if (result.recordset[0].RowsAffected === 0) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      res.json({
        success: true,
        message: 'Category deleted successfully',
        rowsAffected: result.recordset[0].RowsAffected
      });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
