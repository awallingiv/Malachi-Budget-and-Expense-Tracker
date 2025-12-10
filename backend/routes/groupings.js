const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { executeStoredProcedure, sql } = require('../config/database');
const { param, body, validationResult } = require('express-validator');
const cache = require('../services/cacheService');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * @route   GET /api/groupings/:userId
 * @desc    Get all groupings for a user
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

      // Check cache first
      const cacheKey = cache.generateKey('groupings', userId);
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const result = await executeStoredProcedure('spmb_GetUserGroupings', {
        UserID: { type: sql.UniqueIdentifier, value: userId }
      });

      const groupings = result.recordset || [];

      // Cache the response
      await cache.set(cacheKey, groupings, cache.TTL.GROUPINGS);

      res.json(groupings);
    } catch (error) {
      console.error('Get groupings error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * @route   POST /api/groupings
 * @desc    Create new grouping
 * @access  Private
 */
router.post('/',
  protect,
  body('userId').isUUID(),
  body('groupingName').trim().isLength({ min: 1, max: 50 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, groupingName, displayOrder, color, icon } = req.body;

      if (req.user.UserId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const result = await executeStoredProcedure('spmb_CreateGrouping', {
        UserID: { type: sql.UniqueIdentifier, value: userId },
        Username: { type: sql.VarChar(17), value: req.user.Username },
        GroupingName: { type: sql.VarChar(50), value: groupingName },
        DisplayOrder: { type: sql.Int, value: displayOrder || 0 },
        Color: { type: sql.VarChar(20), value: color || '#0066cc' },
        Icon: { type: sql.NVarChar(50), value: icon || null }
      });

      if (!result.recordset || result.recordset.length === 0) {
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create grouping - no result returned'
        });
      }

      // Invalidate groupings cache
      await cache.del(cache.generateKey('groupings', userId));

      res.json(result.recordset[0]);
    } catch (error) {
      console.error('Create grouping error:', error);
      console.error('Error message:', error.message);
      res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   PUT /api/groupings/:groupingId
 * @desc    Update grouping
 * @access  Private
 */
router.put('/:groupingId',
  protect,
  param('groupingId').isUUID(),
  body('userId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { groupingId } = req.params;
      const { userId, groupingName, displayOrder, color, icon } = req.body;

      // Debug emoji handling
      console.log('📦 Update Grouping Request:', { groupingId, groupingName, color, icon });
      console.log('🎨 Icon value:', icon, 'Type:', typeof icon, 'Length:', icon?.length);

      if (req.user.UserId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const result = await executeStoredProcedure('spmb_UpdateGrouping', {
        GroupingID: { type: sql.UniqueIdentifier, value: groupingId },
        UserID: { type: sql.UniqueIdentifier, value: userId },
        GroupingName: { type: sql.VarChar(50), value: groupingName || null },
        DisplayOrder: { type: sql.Int, value: displayOrder !== undefined ? displayOrder : null },
        Color: { type: sql.VarChar(20), value: color || null },
        Icon: { type: sql.NVarChar(50), value: icon || null }
      });

      // Invalidate groupings cache
      await cache.del(cache.generateKey('groupings', userId));

      res.json(result.recordset[0]);
    } catch (error) {
      console.error('Update grouping error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * @route   DELETE /api/groupings/:groupingId
 * @desc    Delete grouping (moves transactions to default "Expenses" grouping)
 * @access  Private
 */
router.delete('/:groupingId',
  protect,
  param('groupingId').isUUID(),
  body('userId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { groupingId } = req.params;
      const { userId } = req.body;

      if (req.user.UserId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      await executeStoredProcedure('spmb_DeleteGrouping', {
        GroupingID: { type: sql.UniqueIdentifier, value: groupingId },
        UserID: { type: sql.UniqueIdentifier, value: userId }
      });

      // Invalidate groupings cache
      await cache.del(cache.generateKey('groupings', userId));

      res.json({ success: true, message: 'Grouping deleted' });
    } catch (error) {
      console.error('Delete grouping error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * @route   GET /api/groupings/:userId/:groupingId/categories
 * @desc    Get categories within a specific grouping
 * @access  Private
 */
router.get('/:userId/:groupingId/categories',
  protect,
  param('userId').isUUID(),
  param('groupingId').isUUID(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, groupingId } = req.params;

      if (req.user.UserId !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const result = await executeStoredProcedure('spmb_GetCategoriesInGrouping', {
        UserID: { type: sql.UniqueIdentifier, value: userId },
        GroupingID: { type: sql.UniqueIdentifier, value: groupingId }
      });

      res.json(result.recordset.map(r => r.Category));
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
