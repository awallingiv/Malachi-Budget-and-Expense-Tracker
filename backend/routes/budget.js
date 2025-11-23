const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
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

// Apply authentication to all budget routes
router.use(protect);

/**
 * @route   GET /api/budget/dashboard/:userId
 * @desc    Get dashboard statistics for user
 * @access  Private
 */
router.get('/dashboard/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  query('startDate').isISO8601().withMessage('Valid start date required'),
  query('endDate').isISO8601().withMessage('Valid end date required')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await executeStoredProcedure('spbl_GetUserStatsWithCategories', {
      UserId: { type: sql.UniqueIdentifier, value: userId },
      StartDate: { type: sql.Date, value: new Date(startDate) },
      EndDate: { type: sql.Date, value: new Date(endDate) }
    });

    // Parse the JSON response from the stored procedure
    const statsJson = result.recordset[0];
    const stats = typeof statsJson === 'string' ? JSON.parse(statsJson) : statsJson;

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

/**
 * @route   GET /api/budget/transactions/:userId
 * @desc    Get all transactions for user
 * @access  Private
 */
router.get('/transactions/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await executeStoredProcedure('sprb_GetTransactionsByUserID', {
      UserId: { type: sql.UniqueIdentifier, value: userId }
    });

    res.json(result.recordset);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

/**
 * @route   POST /api/budget/transactions
 * @desc    Create new transaction
 * @access  Private
 */
router.post('/transactions', [
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Username').isLength({ min: 1, max: 17 }).withMessage('Username required (max 17 chars)'),
  body('TableName').isLength({ min: 1, max: 20 }).withMessage('Category required (max 20 chars)'),
  body('Description').optional().isLength({ max: 35 }).withMessage('Description max 35 characters'),
  body('Amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
  body('Due').optional().isISO8601().withMessage('Valid due date required'),
  body('Date').optional().isISO8601().withMessage('Valid date required'),
  body('Notes').optional().isLength({ max: 60 }).withMessage('Notes max 60 characters'),
  body('Category').optional().isLength({ max: 20 }).withMessage('Category max 20 characters'),
  body('Status').optional().isLength({ max: 20 }).withMessage('Status max 20 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      UserID,
      Username,
      TableName,
      Description,
      Amount,
      Due,
      Date,
      Notes,
      Category,
      Status
    } = req.body;

    // Validate ownership
    if (UserID !== req.user.UserId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create transaction for this user'
      });
    }

    const result = await executeStoredProcedure('sprb_InsertTransaction', {
      UserID: { type: sql.UniqueIdentifier, value: userId },
      Username: { type: sql.VarChar(17), value: username },
      TableName: { type: sql.VarChar(20), value: tableName },
      Description: { type: sql.VarChar(35), value: description || null },
      Amount: { type: sql.Float, value: amount || null },
      Due: { type: sql.DateTime, value: due ? new Date(due) : null },
      Date: { type: sql.DateTime, value: date ? new Date(date) : null },
      Notes: { type: sql.VarChar(60), value: notes || null },
      Category: { type: sql.VarChar(20), value: category || null },
      Status: { type: sql.VarChar(20), value: status || null }
    });

    const response = result.recordset[0];

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transactionId: response.NewTransactionId
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction'
    });
  }
});

/**
 * @route   PUT /api/budget/transactions/:transactionId
 * @desc    Update transaction
 * @access  Private
 */
router.put('/transactions/:transactionId', [
  param('transactionId').isUUID().withMessage('Valid transaction ID required'),
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Description').optional().isLength({ max: 35 }).withMessage('Description max 35 characters'),
  body('Amount').optional().isFloat({ min: 0 }).withMessage('Valid amount required'),
  body('Due').optional().isISO8601().withMessage('Valid due date required'),
  body('Date').optional().isISO8601().withMessage('Valid date required'),
  body('Notes').optional().isLength({ max: 60 }).withMessage('Notes max 60 characters'),
  body('Category').optional().isLength({ max: 20 }).withMessage('Category max 20 characters'),
  body('Status').optional().isLength({ max: 20 }).withMessage('Status max 20 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const {
      UserID,
      Description,
      Amount,
      Due,
      Date,
      Notes,
      Category,
      Status
    } = req.body;

    // Validate ownership
    if (UserID !== req.user.UserId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this transaction'
      });
    }

    const result = await executeStoredProcedure('spbl_UpdateTransaction', {
      TransactionId: { type: sql.UniqueIdentifier, value: transactionId },
      Description: { type: sql.VarChar(35), value: Description || null },
      Amount: { type: sql.Float, value: Amount || null },
      Due: { type: sql.DateTime, value: Due ? new Date(Due) : null },
      Date: { type: sql.DateTime, value: Date ? new Date(Date) : null },
      Notes: { type: sql.VarChar(60), value: Notes || null },
      Category: { type: sql.VarChar(20), value: Category || null },
      Status: { type: sql.VarChar(20), value: Status || null },
      UserID: { type: sql.UniqueIdentifier, value: UserID }
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
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction'
    });
  }
});

/**
 * @route   DELETE /api/budget/transactions/:transactionId
 * @desc    Delete transaction
 * @access  Private
 */
router.delete('/transactions/:transactionId', [
  param('transactionId').isUUID().withMessage('Valid transaction ID required'),
  body('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { userId } = req.body;

    // Validate ownership
    if (userId !== req.user.UserId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this transaction'
      });
    }

    const result = await executeStoredProcedure('sprb_DeleteTransaction', {
      TransactionId: { type: sql.UniqueIdentifier, value: transactionId },
      UserID: { type: sql.UniqueIdentifier, value: req.user.userId }
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
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete transaction'
    });
  }
});

/**
 * @route   GET /api/budget/income/:userId
 * @desc    Get income records for user
 * @access  Private
 */
router.get('/income/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await executeStoredProcedure('sprb_GetIncomeByUsernameAndDate', {
      UserId: { type: sql.UniqueIdentifier, value: userId },
      StartDate: { type: sql.DateTime, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.DateTime, value: endDate ? new Date(endDate) : null }
    });

    res.json(result.recordset);
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income records'
    });
  }
});

/**
 * @route   POST /api/budget/income
 * @desc    Create new income record
 * @access  Private
 */
router.post('/income', [
  body('Username').isLength({ min: 1, max: 17 }).withMessage('Username required (max 17 chars)'),
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Description').optional().isLength({ max: 45 }).withMessage('Description max 45 characters'),
  body('Net').optional().isFloat({ min: 0 }).withMessage('Valid net amount required'),
  body('Gross').optional().isFloat({ min: 0 }).withMessage('Valid gross amount required'),
  body('Tithe').optional().isFloat({ min: 0 }).withMessage('Valid tithe amount required'),
  body('TitheStatus').optional().isLength({ max: 45 }).withMessage('Tithe status max 45 characters'),
  body('Date').optional().isLength({ max: 45 }).withMessage('Date max 45 characters'),
  body('PaycheckStatus').optional().isLength({ max: 45 }).withMessage('Paycheck status max 45 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      Username,
      UserID,
      Description,
      Net,
      Gross,
      Tithe,
      TitheStatus,
      Date,
      PaycheckStatus
    } = req.body;

    // Validate ownership
    if (UserID !== req.user.UserId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create income for this user'
      });
    }

    const result = await executeStoredProcedure('sprb_InsertIncome', {
      Username: { type: sql.VarChar(17), value: username },
      UserID: { type: sql.UniqueIdentifier, value: userId },
      Description: { type: sql.VarChar(45), value: description || null },
      Net: { type: sql.Float, value: net || null },
      Gross: { type: sql.Float, value: gross || null },
      Tithe: { type: sql.Float, value: tithe || null },
      TitheStatus: { type: sql.VarChar(45), value: titheStatus || null },
      Date: { type: sql.VarChar(45), value: date || null },
      PaycheckStatus: { type: sql.VarChar(45), value: paycheckStatus || null }
    });

    const response = result.recordset[0];

    res.status(201).json({
      success: true,
      message: 'Income record created successfully',
      incomeId: response.NewIncomeID
    });
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create income record'
    });
  }
});

module.exports = router;