const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { executeStoredProcedure, executeQuery, sql } = require('../config/database');
const { protect, validateOwnership } = require('../middleware/auth');

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Budget API is working', timestamp: new Date().toISOString() });
});

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
// router.use(protect); // Temporarily disabled for testing

/**
 * @route   GET /api/budget/dashboard/:userId
 * @desc    Get dashboard statistics for user
 * @access  Private
 */
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('Dashboard request:', { userId, startDate, endDate });

    // Try stored procedure first, fallback to queries
    let result;
    try {
      result = await executeStoredProcedure('sprb_GetDashboardStats', {
        UserId: { type: sql.UniqueIdentifier, value: userId },
        StartDate: { type: sql.Date, value: startDate ? new Date(startDate) : null },
        EndDate: { type: sql.Date, value: endDate ? new Date(endDate) : null }
      });
    } catch (procError) {
      console.log('Stored procedure failed, using direct queries:', procError.message);
      
      // Fallback to direct queries
      const [incomeResult, categoriesResult, transactionsResult] = await Promise.all([
        executeQuery('SELECT ISNULL(SUM(Gross), 0) AS totalGross, ISNULL(SUM(Net), 0) AS totalNet, ISNULL(SUM(Tithe), 0) AS totalTithe, COUNT(*) AS incomeCount FROM Income WHERE UserId = @userId', {
          userId: { type: sql.UniqueIdentifier, value: userId }
        }),
        executeQuery('SELECT TableName, ISNULL(SUM(Amount), 0) AS totalAmount, COUNT(*) AS transactionCount FROM Transactions WHERE UserId = @userId GROUP BY TableName ORDER BY totalAmount DESC', {
          userId: { type: sql.UniqueIdentifier, value: userId }
        }),
        executeQuery('SELECT TOP 5 TransactionId, Username, TableName, Description, Amount, Date, CreationTime FROM Transactions WHERE UserId = @userId ORDER BY CreationTime DESC', {
          userId: { type: sql.UniqueIdentifier, value: userId }
        })
      ]);
      
      result = {
        recordsets: [
          incomeResult.recordset,
          categoriesResult.recordset,
          transactionsResult.recordset
        ]
      };
    }

    console.log('Dashboard result recordsets:', result.recordsets?.length);

    // Process the multiple result sets
    const income = result.recordsets[0]?.[0] || { totalGross: 0, totalNet: 0, totalTithe: 0, incomeCount: 0 };
    const categories = result.recordsets[1] || [];
    const recentTransactions = result.recordsets[2] || [];

    const stats = {
      income,
      categories,
      recentTransactions,
      expenses: {
        totalAmount: categories.reduce((sum, cat) => sum + (cat.totalAmount || 0), 0)
      }
    };

    console.log('Dashboard stats response:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics: ' + error.message
    });
  }
});

/**
 * @route   GET /api/budget/transactions/:userId
 * @desc    Get all transactions for user
 * @access  Private
 */
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const result = await executeStoredProcedure('sprb_GetTransactionsByUserID', {
      UserId: { type: sql.UniqueIdentifier, value: userId }
    });

    let transactions = result.recordset;

    // Apply limit if specified and sort by most recent
    if (limit) {
      transactions = transactions
        .sort((a, b) => new Date(b.Date || b.CreationTime) - new Date(a.Date || a.CreationTime))
        .slice(0, parseInt(limit));
    }

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

/**
 * @route   GET /api/budget/categories/:userId
 * @desc    Get all unique categories (TableNames) for user
 * @access  Private
 */
router.get('/categories/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, /* validateOwnership, */ async (req, res) => {
  try {
    const { userId } = req.params;

    // Get unique categories from user's transactions
    const result = await executeStoredProcedure('sprb_GetTransactionsByUserID', {
      UserId: { type: sql.UniqueIdentifier, value: userId }
    });

    // Extract unique TableNames
    const categories = [...new Set(
      result.recordset
        .map(t => t.TableName)
        .filter(name => name && name.trim())
    )].sort();

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
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
      UserID: { type: sql.UniqueIdentifier, value: UserID },
      Username: { type: sql.VarChar(17), value: Username },
      TableName: { type: sql.VarChar(20), value: TableName },
      Description: { type: sql.VarChar(35), value: Description || null },
      Amount: { type: sql.Float, value: Amount || null },
      Due: { type: sql.DateTime, value: Due ? new Date(Due) : null },
      Date: { type: sql.DateTime, value: Date ? new Date(Date) : null },
      Notes: { type: sql.VarChar(60), value: Notes || null },
      Category: { type: sql.VarChar(20), value: Category || null },
      Status: { type: sql.VarChar(20), value: Status || null }
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

    const result = await executeStoredProcedure('sprb_UpdateTransaction', {
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
      UserID: { type: sql.UniqueIdentifier, value: req.user.UserId }
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
router.get('/income/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('Income request:', { userId, startDate, endDate });

    // Try stored procedure first, fallback to direct query
    let result;
    try {
      result = await executeStoredProcedure('sprb_GetIncomeByUsernameAndDate', {
        UserId: { type: sql.UniqueIdentifier, value: userId },
        StartDate: { type: sql.DateTime, value: startDate ? new Date(startDate) : null },
        EndDate: { type: sql.DateTime, value: endDate ? new Date(endDate) : null }
      });
    } catch (procError) {
      console.log('Income stored procedure failed, using direct query:', procError.message);
      
      // Fallback to direct query
      let query = 'SELECT * FROM Income WHERE UserId = @userId';
      let params = { userId: { type: sql.UniqueIdentifier, value: userId } };
      
      if (startDate && endDate) {
        query += ' AND (TRY_CAST(Date AS DATE) BETWEEN @startDate AND @endDate OR CAST(CreationTime AS DATE) BETWEEN @startDate AND @endDate)';
        params.startDate = { type: sql.Date, value: new Date(startDate) };
        params.endDate = { type: sql.Date, value: new Date(endDate) };
      }
      
      query += ' ORDER BY CreationTime DESC';
      
      result = await executeQuery(query, params);
    }

    console.log('Income result count:', result.recordset?.length);
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
      Username: { type: sql.VarChar(17), value: Username },
      UserID: { type: sql.UniqueIdentifier, value: UserID },
      Description: { type: sql.VarChar(45), value: Description || null },
      Net: { type: sql.Float, value: Net || null },
      Gross: { type: sql.Float, value: Gross || null },
      Tithe: { type: sql.Float, value: Tithe || null },
      TitheStatus: { type: sql.VarChar(45), value: TitheStatus || null },
      Date: { type: sql.VarChar(45), value: Date || null },
      PaycheckStatus: { type: sql.VarChar(45), value: PaycheckStatus || null }
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

/**
 * CATEGORY WINDOWS ENDPOINTS
 */

/**
 * @route   GET /api/budget/windows/:userId
 * @desc    Get all category windows for user
 * @access  Private
 */
router.get('/windows/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await executeStoredProcedure('sprb_GetCategoryWindows', {
      UserID: { type: sql.UniqueIdentifier, value: userId }
    });

    res.json(result.recordset);
  } catch (error) {
    console.error('Get category windows error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category windows'
    });
  }
});

/**
 * @route   POST /api/budget/windows
 * @desc    Create new category window
 * @access  Private
 */
router.post('/windows', [
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Username').isLength({ min: 1, max: 17 }).withMessage('Username required (max 17 chars)'),
  body('CategoryName').isLength({ min: 1, max: 50 }).withMessage('Category name required (max 50 chars)'),
  body('DisplayName').isLength({ min: 1, max: 100 }).withMessage('Display name required (max 100 chars)'),
  body('Description').optional().isLength({ max: 255 }).withMessage('Description max 255 characters'),
  body('ColorTheme').optional().isLength({ max: 20 }).withMessage('Color theme max 20 characters'),
  body('PositionX').optional().isInt({ min: 0 }).withMessage('Valid X position required'),
  body('PositionY').optional().isInt({ min: 0 }).withMessage('Valid Y position required'),
  body('Width').optional().isInt({ min: 200, max: 1200 }).withMessage('Width must be between 200-1200px'),
  body('Height').optional().isInt({ min: 150, max: 800 }).withMessage('Height must be between 150-800px')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      UserID,
      Username,
      CategoryName,
      DisplayName,
      Description,
      ColorTheme,
      PositionX,
      PositionY,
      Width,
      Height
    } = req.body;

    // Validate ownership
    if (UserID !== req.user.UserId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create window for this user'
      });
    }

    const result = await executeStoredProcedure('sprb_CreateCategoryWindow', {
      UserID: { type: sql.UniqueIdentifier, value: UserID },
      Username: { type: sql.VarChar(17), value: Username },
      CategoryName: { type: sql.VarChar(50), value: CategoryName },
      DisplayName: { type: sql.VarChar(100), value: DisplayName },
      Description: { type: sql.VarChar(255), value: Description || null },
      ColorTheme: { type: sql.VarChar(20), value: ColorTheme || 'blue' },
      PositionX: { type: sql.Int, value: PositionX || 100 },
      PositionY: { type: sql.Int, value: PositionY || 100 },
      Width: { type: sql.Int, value: Width || 300 },
      Height: { type: sql.Int, value: Height || 200 }
    });

    const response = result.recordset[0];

    res.status(201).json({
      success: response.Success,
      message: response.Message,
      windowId: response.NewWindowID
    });
  } catch (error) {
    console.error('Create category window error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create category window'
    });
  }
});

/**
 * @route   PUT /api/budget/windows/:windowId
 * @desc    Update category window
 * @access  Private
 */
router.put('/windows/:windowId', [
  param('windowId').isUUID().withMessage('Valid window ID required'),
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('DisplayName').optional().isLength({ min: 1, max: 100 }).withMessage('Display name max 100 characters'),
  body('Description').optional().isLength({ max: 255 }).withMessage('Description max 255 characters'),
  body('ColorTheme').optional().isLength({ max: 20 }).withMessage('Color theme max 20 characters'),
  body('PositionX').optional().isInt({ min: 0 }).withMessage('Valid X position required'),
  body('PositionY').optional().isInt({ min: 0 }).withMessage('Valid Y position required'),
  body('Width').optional().isInt({ min: 200, max: 1200 }).withMessage('Width must be between 200-1200px'),
  body('Height').optional().isInt({ min: 150, max: 800 }).withMessage('Height must be between 150-800px'),
  body('IsMinimized').optional().isBoolean().withMessage('IsMinimized must be boolean'),
  body('ZIndex').optional().isInt({ min: 0 }).withMessage('Valid Z-index required')
], handleValidationErrors, async (req, res) => {
  try {
    const { windowId } = req.params;
    const {
      UserID,
      DisplayName,
      Description,
      ColorTheme,
      PositionX,
      PositionY,
      Width,
      Height,
      IsMinimized,
      ZIndex
    } = req.body;

    // Validate ownership
    if (UserID !== req.user.UserId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this window'
      });
    }

    const result = await executeStoredProcedure('sprb_UpdateCategoryWindow', {
      WindowID: { type: sql.UniqueIdentifier, value: windowId },
      UserID: { type: sql.UniqueIdentifier, value: UserID },
      DisplayName: { type: sql.VarChar(100), value: DisplayName || null },
      Description: { type: sql.VarChar(255), value: Description || null },
      ColorTheme: { type: sql.VarChar(20), value: ColorTheme || null },
      PositionX: { type: sql.Int, value: PositionX || null },
      PositionY: { type: sql.Int, value: PositionY || null },
      Width: { type: sql.Int, value: Width || null },
      Height: { type: sql.Int, value: Height || null },
      IsMinimized: { type: sql.Bit, value: IsMinimized || null },
      ZIndex: { type: sql.Int, value: ZIndex || null }
    });

    const response = result.recordset[0];

    res.json({
      success: response.Success,
      message: response.Message
    });
  } catch (error) {
    console.error('Update category window error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category window'
    });
  }
});

/**
 * @route   DELETE /api/budget/windows/:windowId
 * @desc    Delete category window
 * @access  Private
 */
router.delete('/windows/:windowId', [
  param('windowId').isUUID().withMessage('Valid window ID required'),
  body('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, async (req, res) => {
  try {
    const { windowId } = req.params;
    const { userId } = req.body;

    // Validate ownership
    if (userId !== req.user.UserId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this window'
      });
    }

    const result = await executeStoredProcedure('sprb_DeleteCategoryWindow', {
      WindowID: { type: sql.UniqueIdentifier, value: windowId },
      UserID: { type: sql.UniqueIdentifier, value: userId }
    });

    const response = result.recordset[0];

    res.json({
      success: response.Success,
      message: response.Message
    });
  } catch (error) {
    console.error('Delete category window error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category window'
    });
  }
});

/**
 * @route   GET /api/budget/windows/:userId/transactions/:categoryName
 * @desc    Get transactions for specific category window
 * @access  Private
 */
router.get('/windows/:userId/transactions/:categoryName', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  param('categoryName').isLength({ min: 1, max: 50 }).withMessage('Valid category name required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { userId, categoryName } = req.params;
    const { startDate, endDate, limit } = req.query;

    const result = await executeStoredProcedure('sprb_GetWindowTransactions', {
      UserID: { type: sql.UniqueIdentifier, value: userId },
      CategoryName: { type: sql.VarChar(50), value: categoryName },
      StartDate: { type: sql.Date, value: startDate ? new Date(startDate) : null },
      EndDate: { type: sql.Date, value: endDate ? new Date(endDate) : null },
      Limit: { type: sql.Int, value: limit ? parseInt(limit) : null }
    });

    res.json(result.recordset);
  } catch (error) {
    console.error('Get window transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch window transactions'
    });
  }
});

/**
 * @route   POST /api/budget/windows/positions
 * @desc    Bulk update window positions (for drag operations)
 * @access  Private
 */
router.post('/windows/positions', [
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('WindowUpdates').isArray().withMessage('Window updates must be an array'),
  body('WindowUpdates.*.windowId').isUUID().withMessage('Valid window ID required'),
  body('WindowUpdates.*.positionX').isInt({ min: 0 }).withMessage('Valid X position required'),
  body('WindowUpdates.*.positionY').isInt({ min: 0 }).withMessage('Valid Y position required'),
  body('WindowUpdates.*.zIndex').optional().isInt({ min: 0 }).withMessage('Valid Z-index required')
], handleValidationErrors, async (req, res) => {
  try {
    const { UserID, WindowUpdates } = req.body;

    // Validate ownership
    if (UserID !== req.user.UserId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update windows for this user'
      });
    }

    const result = await executeStoredProcedure('sprb_UpdateWindowPositions', {
      UserID: { type: sql.UniqueIdentifier, value: UserID },
      WindowUpdates: { type: sql.NVarChar(sql.MAX), value: JSON.stringify(WindowUpdates) }
    });

    const response = result.recordset[0];

    res.json({
      success: response.Success,
      message: response.Message
    });
  } catch (error) {
    console.error('Update window positions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update window positions'
    });
  }
});

/**
 * @route   PUT /api/budget/income/:incomeId
 * @desc    Update income record
 * @access  Private
 */
router.put('/income/:incomeId', [
  param('incomeId').isUUID().withMessage('Valid income ID required'),
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Paycheck').optional().isLength({ max: 35 }).withMessage('Paycheck description max 35 characters'),
  body('GrossIncome').optional().isFloat({ min: 0 }).withMessage('Valid gross income required'),
  body('NetIncome').optional().isFloat({ min: 0 }).withMessage('Valid net income required'),
  body('TitheAmount').optional().isFloat({ min: 0 }).withMessage('Valid tithe amount required'),
  body('TithePercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Valid tithe percentage required'),
  body('PaycheckDate').optional().isISO8601().withMessage('Valid paycheck date required'),
  body('PaycheckStatus').optional().isIn(['pending', 'received']).withMessage('Valid paycheck status required'),
  body('TitheStatus').optional().isIn(['unpaid', 'paid']).withMessage('Valid tithe status required'),
  body('Notes').optional().isLength({ max: 100 }).withMessage('Notes max 100 characters')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { incomeId } = req.params;
    const {
      UserID,
      Username,
      Paycheck,
      GrossIncome,
      NetIncome,
      TitheAmount,
      TithePercentage,
      PaycheckDate,
      PaycheckStatus,
      TitheStatus,
      Notes
    } = req.body;

    const result = await executeStoredProcedure('sprb_UpdateIncome', {
      IncomeId: { type: sql.UniqueIdentifier, value: incomeId },
      UserId: { type: sql.UniqueIdentifier, value: UserID },
      Username: { type: sql.VarChar(17), value: Username },
      Paycheck: { type: sql.VarChar(35), value: Paycheck },
      GrossIncome: { type: sql.Money, value: GrossIncome },
      NetIncome: { type: sql.Money, value: NetIncome },
      TitheAmount: { type: sql.Money, value: TitheAmount },
      TithePercentage: { type: sql.Float, value: TithePercentage },
      PaycheckDate: { type: sql.VarChar(45), value: PaycheckDate },
      PaycheckStatus: { type: sql.VarChar(20), value: PaycheckStatus },
      TitheStatus: { type: sql.VarChar(20), value: TitheStatus },
      Notes: { type: sql.VarChar(100), value: Notes }
    });

    const response = result.recordset[0];
    if (response.Success) {
      res.json({
        success: true,
        message: 'Income record updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.Message || 'Failed to update income record'
      });
    }
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update income record'
    });
  }
});

/**
 * @route   DELETE /api/budget/income/:incomeId
 * @desc    Delete income record
 * @access  Private
 */
router.delete('/income/:incomeId', [
  param('incomeId').isUUID().withMessage('Valid income ID required'),
  body('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, validateOwnership, async (req, res) => {
  try {
    const { incomeId } = req.params;
    const { userId } = req.body;

    const result = await executeStoredProcedure('sprb_DeleteIncome', {
      IncomeId: { type: sql.UniqueIdentifier, value: incomeId },
      UserId: { type: sql.UniqueIdentifier, value: userId }
    });

    const response = result.recordset[0];
    if (response.Success) {
      res.json({
        success: true,
        message: 'Income record deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.Message || 'Failed to delete income record'
      });
    }
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete income record'
    });
  }
});

module.exports = router;