const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { executeStoredProcedure, executeQuery, sql } = require('../config/database');
const { protect, validateOwnership } = require('../middleware/auth');
const cache = require('../services/cacheService');

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

/**
 * Validation Rules
 */
// Transaction validation rules
const validateTransaction = [
  body('username')
    .isLength({ min: 1, max: 17 })
    .withMessage('Username must be 1-17 characters'),
  body('tableName')
    .isLength({ min: 1, max: 20 })
    .withMessage('TableName must be 1-20 characters'),
  body('description')
    .optional()
    .isLength({ max: 150 })
    .withMessage('Description must be maximum 150 characters'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('due')
    .optional()
    .isISO8601()
    .withMessage('Due date must be valid ISO8601 date'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be valid ISO8601 date'),
  body('notes')
    .optional()
    .isLength({ max: 60 })
    .withMessage('Notes must be maximum 60 characters'),
  body('category')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Category must be maximum 20 characters'),
  body('status')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Status must be maximum 20 characters')
];

// Income validation rules
const validateIncome = [
  body('username')
    .isLength({ min: 1, max: 17 })
    .withMessage('Username must be 1-17 characters'),
  body('description')
    .optional()
    .isLength({ max: 45 })
    .withMessage('Description must be maximum 45 characters'),
  body('net')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Net amount must be a positive number'),
  body('gross')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Gross amount must be a positive number'),
  body('tithe')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tithe amount must be a positive number'),
  body('titheStatus')
    .optional()
    .isLength({ max: 45 })
    .withMessage('Tithe status must be maximum 45 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO8601 date'),
  body('paycheckStatus')
    .optional()
    .isLength({ max: 45 })
    .withMessage('Paycheck status must be maximum 45 characters'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be maximum 500 characters')
];

// ID validation rules
const validateUserId = [
  param('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID')
];

const validateTransactionId = [
  param('transactionId')
    .isUUID()
    .withMessage('Transaction ID must be a valid UUID')
];

const validateIncomeId = [
  param('incomeId')
    .isUUID()
    .withMessage('Income ID must be a valid UUID')
];

// Apply authentication to all budget routes
router.use(protect);

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

    // Check cache first
    const cacheKey = cache.generateKey('dashboard', userId, startDate || 'all', endDate || 'all');
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Try stored procedure first, fallback to queries
    let result;
    try {
      result = await executeStoredProcedure('spmb_GetDashboardStats', {
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
        executeQuery('SELECT TOP 5 TransactionId, Username, TableName, Name, Amount, Date, CreationTime FROM Transactions WHERE UserId = @userId ORDER BY CreationTime DESC', {
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

    // Cache the response
    await cache.set(cacheKey, stats, cache.TTL.DASHBOARD_STATS);

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
 * BUDGETS (PLANNED VS ACTUAL)
 */

/**
 * @route   GET /api/budget/budgets/:userId
 * @desc    Get budgets for a user for a given period (defaults to current month)
 * @access  Private
 */
router.get('/budgets/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Enforce ownership
    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view budgets for this user'
      });
    }

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : defaultEnd;

    const queryText = `
      SELECT BudgetID, UserID, Username, CategoryName, PeriodStart, PeriodEnd, Amount, Currency, CreationTime, LastEdit
      FROM Budgets
      WHERE UserID = @userId
        AND PeriodStart >= @startDate
        AND PeriodEnd <= @endDate
      ORDER BY PeriodStart, CategoryName;
    `;

    const result = await executeQuery(queryText, {
      userId: { type: sql.UniqueIdentifier, value: userId },
      startDate: { type: sql.Date, value: start },
      endDate: { type: sql.Date, value: end }
    });

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch budgets'
    });
  }
});

/**
 * RECURRING ITEMS (BILLS, SUBSCRIPTIONS, RECURRING INCOME)
 */

/**
 * @route   GET /api/budget/recurring/:userId
 * @desc    Get recurring items for a user (optionally filtered by type)
 * @access  Private
 */
router.get('/recurring/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  query('type').optional().isIn(['expense', 'income']).withMessage('Type must be expense or income')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;

    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view recurring items for this user'
      });
    }

    const queryText = `
      SELECT RecurringID, UserID, Username, ItemType, Description, TableName, Amount,
             StartDate, EndDate, Frequency, Interval, NextOccurrence, IsActive,
             CreationTime, LastEdit, Notes
      FROM RecurringItems
      WHERE UserID = @userId
        AND (@itemType IS NULL OR ItemType = @itemType)
      ORDER BY NextOccurrence, Description;
    `;

    const result = await executeQuery(queryText, {
      userId: { type: sql.UniqueIdentifier, value: userId },
      itemType: { type: sql.VarChar(10), value: type || null }
    });

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get recurring items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recurring items'
    });
  }
});

/**
 * @route   POST /api/budget/recurring
 * @desc    Create a new recurring item
 * @access  Private
 */
router.post('/recurring', [
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Username').isLength({ min: 1, max: 17 }).withMessage('Username required (max 17 chars)'),
  body('ItemType').isIn(['expense', 'income']).withMessage('ItemType must be expense or income'),
  body('Description').optional().isLength({ max: 150 }).withMessage('Description max 150 characters'),
  body('TableName').optional().isLength({ max: 50 }).withMessage('TableName max 50 characters'),
  body('Amount').isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('StartDate').isISO8601().withMessage('Valid start date required'),
  body('EndDate').optional().isISO8601().withMessage('Valid end date required'),
  body('Frequency').isLength({ min: 1, max: 20 }).withMessage('Frequency required (e.g., monthly)'),
  body('Interval').optional().isInt({ min: 1 }).withMessage('Interval must be at least 1'),
  body('NextOccurrence').optional().isISO8601().withMessage('Valid next occurrence date required'),
  body('Notes').optional().isLength({ max: 255 }).withMessage('Notes max 255 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      UserID,
      Username,
      ItemType,
      Description,
      TableName,
      Amount,
      StartDate,
      EndDate,
      Frequency,
      Interval,
      NextOccurrence,
      Notes
    } = req.body;

    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create recurring items for this user'
      });
    }

    const startDateObj = new Date(StartDate);
    const endDateObj = EndDate ? new Date(EndDate) : null;
    const nextOccurrenceDate =
      NextOccurrence ? new Date(NextOccurrence) : startDateObj;

    const queryText = `
      INSERT INTO RecurringItems (
        UserID, Username, ItemType, Description, TableName, Amount,
        StartDate, EndDate, Frequency, Interval, NextOccurrence, IsActive, Notes
      )
      OUTPUT inserted.RecurringID
      VALUES (
        @userId, @username, @itemType, @description, @tableName, @amount,
        @startDate, @endDate, @frequency, @interval, @nextOccurrence, 1, @notes
      );
    `;

    const result = await executeQuery(queryText, {
      userId: { type: sql.UniqueIdentifier, value: UserID },
      username: { type: sql.VarChar(17), value: Username },
      itemType: { type: sql.VarChar(10), value: ItemType },
      description: { type: sql.VarChar(150), value: Description || null },
      tableName: { type: sql.VarChar(50), value: TableName || null },
      amount: { type: sql.Float, value: Amount },
      startDate: { type: sql.Date, value: startDateObj },
      endDate: { type: sql.Date, value: endDateObj },
      frequency: { type: sql.VarChar(20), value: Frequency },
      interval: { type: sql.Int, value: Interval || 1 },
      nextOccurrence: { type: sql.Date, value: nextOccurrenceDate },
      notes: { type: sql.VarChar(255), value: Notes || null }
    });

    const createdId = result.recordset?.[0]?.RecurringID;

    res.status(201).json({
      success: true,
      message: 'Recurring item created successfully',
      recurringId: createdId
    });
  } catch (error) {
    console.error('Create recurring item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create recurring item'
    });
  }
});

/**
 * CATEGORY SUMMARY
 */

/**
 * @route   GET /api/budget/category-summary/:userId
 * @desc    Get per-category spending summary for a date range
 * @access  Private
 */
router.get('/category-summary/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view category summary for this user',
      });
    }

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : defaultEnd;

    const queryText = `
      SELECT
        ISNULL(TableName, 'Other') AS Category,
        ISNULL(SUM(Amount), 0) AS TotalAmount,
        COUNT(*) AS TransactionCount
      FROM Transactions
      WHERE UserID = @userId
        AND CAST(ISNULL(Date, CreationTime) AS DATE) BETWEEN @startDate AND @endDate
      GROUP BY ISNULL(TableName, 'Other')
      ORDER BY TotalAmount DESC;
    `;

    const result = await executeQuery(queryText, {
      userId: { type: sql.UniqueIdentifier, value: userId },
      startDate: { type: sql.Date, value: start },
      endDate: { type: sql.Date, value: end },
    });

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get category summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category summary',
    });
  }
});

/**
 * CATEGORY TRENDS
 */

/**
 * @route   GET /api/budget/category-trends/:userId
 * @desc    Get monthly spending trends for a category over the last N months
 * @access  Private
 */
router.get('/category-trends/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  query('category').optional().isLength({ min: 1, max: 50 }).withMessage('Category max length 50'),
  query('months').optional().isInt({ min: 1, max: 36 }).withMessage('Months must be between 1 and 36'),
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { category, months } = req.query;

    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view trends for this user',
      });
    }

    const monthsInt = months ? parseInt(months, 10) : 12;

    const queryText = `
      DECLARE @today DATE = CAST(GETDATE() AS DATE);
      DECLARE @startDate DATE = DATEADD(MONTH, -(@months - 1), DATEFROMPARTS(YEAR(@today), MONTH(@today), 1));

      WITH MonthlyData AS (
        SELECT
          YEAR(ISNULL(Date, CreationTime)) AS [Year],
          MONTH(ISNULL(Date, CreationTime)) AS [Month],
          ISNULL(TableName, 'Other') AS Category,
          SUM(Amount) AS TotalAmount
        FROM Transactions
        WHERE UserID = @userId
          AND CAST(ISNULL(Date, CreationTime) AS DATE) >= @startDate
          AND CAST(ISNULL(Date, CreationTime) AS DATE) <= @today
          AND (@category IS NULL OR ISNULL(TableName, 'Other') = @category)
        GROUP BY YEAR(ISNULL(Date, CreationTime)),
                 MONTH(ISNULL(Date, CreationTime)),
                 ISNULL(TableName, 'Other')
      )
      SELECT
        [Year],
        [Month],
        Category,
        TotalAmount
      FROM MonthlyData
      ORDER BY [Year], [Month], Category;
    `;

    const result = await executeQuery(queryText, {
      userId: { type: sql.UniqueIdentifier, value: userId },
      category: { type: sql.VarChar(50), value: category || null },
      months: { type: sql.Int, value: monthsInt },
    });

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get category trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category trends',
    });
  }
});

/**
 * BUDGET COMPARISON
 */

/**
 * @route   GET /api/budget/comparison/:userId
 * @desc    Get budget vs actual spending comparison by category
 * @access  Private
 */
router.get('/comparison/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view budget comparison for this user',
      });
    }

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const start = startDate ? new Date(startDate) : defaultStart;
    const end = endDate ? new Date(endDate) : defaultEnd;

    const result = await executeStoredProcedure('spmb_GetBudgetComparison', {
      UserID: { type: sql.UniqueIdentifier, value: userId },
      StartDate: { type: sql.Date, value: start },
      EndDate: { type: sql.Date, value: end },
    });

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get budget comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch budget comparison',
    });
  }
});

/**
 * INCOME/EXPENSE SUMMARY
 */

/**
 * @route   GET /api/budget/income-expense-summary/:userId
 * @desc    Get monthly income vs expense summary
 * @access  Private
 */
router.get('/income-expense-summary/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
  query('months').optional().isInt({ min: 1, max: 24 }).withMessage('Months must be between 1 and 24'),
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const { months } = req.query;

    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view income/expense summary for this user',
      });
    }

    const monthsInt = months ? parseInt(months, 10) : 6;

    const result = await executeStoredProcedure('spmb_GetIncomeSummaryByMonth', {
      UserID: { type: sql.UniqueIdentifier, value: userId },
      MonthsBack: { type: sql.Int, value: monthsInt },
    });

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get income/expense summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income/expense summary',
    });
  }
});

/**
 * @route   PUT /api/budget/recurring/:recurringId
 * @desc    Update a recurring item
 * @access  Private
 */
router.put('/recurring/:recurringId', [
  param('recurringId').isUUID().withMessage('Valid recurring ID required'),
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Description').optional().isLength({ max: 150 }).withMessage('Description max 150 characters'),
  body('TableName').optional().isLength({ max: 50 }).withMessage('TableName max 50 characters'),
  body('Amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('StartDate').optional().isISO8601().withMessage('Valid start date required'),
  body('EndDate').optional().isISO8601().withMessage('Valid end date required'),
  body('Frequency').optional().isLength({ min: 1, max: 20 }).withMessage('Frequency max 20 characters'),
  body('Interval').optional().isInt({ min: 1 }).withMessage('Interval must be at least 1'),
  body('NextOccurrence').optional().isISO8601().withMessage('Valid next occurrence date required'),
  body('IsActive').optional().isBoolean().withMessage('IsActive must be boolean'),
  body('Notes').optional().isLength({ max: 255 }).withMessage('Notes max 255 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { recurringId } = req.params;
    const {
      UserID,
      Description,
      TableName,
      Amount,
      StartDate,
      EndDate,
      Frequency,
      Interval,
      NextOccurrence,
      IsActive,
      Notes
    } = req.body;

    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this recurring item'
      });
    }

    const queryText = `
      SET NOCOUNT ON;

      UPDATE RecurringItems
      SET
        Description   = COALESCE(@description, Description),
        TableName     = COALESCE(@tableName, TableName),
        Amount        = COALESCE(@amount, Amount),
        StartDate     = COALESCE(@startDate, StartDate),
        EndDate       = COALESCE(@endDate, EndDate),
        Frequency     = COALESCE(@frequency, Frequency),
        Interval      = COALESCE(@interval, Interval),
        NextOccurrence= COALESCE(@nextOccurrence, NextOccurrence),
        IsActive      = COALESCE(@isActive, IsActive),
        Notes         = COALESCE(@notes, Notes),
        LastEdit      = GETDATE()
      WHERE RecurringID = @recurringId
        AND UserID = @userId;

      SELECT @@ROWCOUNT AS RowsAffected;
    `;

    const result = await executeQuery(queryText, {
      recurringId: { type: sql.UniqueIdentifier, value: recurringId },
      userId: { type: sql.UniqueIdentifier, value: UserID },
      description: { type: sql.VarChar(150), value: Description || null },
      tableName: { type: sql.VarChar(50), value: TableName || null },
      amount: {
        type: sql.Float,
        value: typeof Amount === 'number' ? Amount : Amount ? parseFloat(Amount) : null
      },
      startDate: { type: sql.Date, value: StartDate ? new Date(StartDate) : null },
      endDate: { type: sql.Date, value: EndDate ? new Date(EndDate) : null },
      frequency: { type: sql.VarChar(20), value: Frequency || null },
      interval: { type: sql.Int, value: Interval || null },
      nextOccurrence: {
        type: sql.Date,
        value: NextOccurrence ? new Date(NextOccurrence) : null
      },
      isActive: {
        type: sql.Bit,
        value:
          typeof IsActive === 'boolean'
            ? IsActive
            : IsActive === null || IsActive === undefined
            ? null
            : IsActive
      },
      notes: { type: sql.VarChar(255), value: Notes || null }
    });

    const row = result.recordset?.[0];

    if (!row || row.RowsAffected === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recurring item not found'
      });
    }

    res.json({
      success: true,
      message: 'Recurring item updated successfully'
    });
  } catch (error) {
    console.error('Update recurring item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recurring item'
    });
  }
});

/**
 * @route   DELETE /api/budget/recurring/:recurringId
 * @desc    Delete a recurring item
 * @access  Private
 */
router.delete('/recurring/:recurringId', [
  param('recurringId').isUUID().withMessage('Valid recurring ID required'),
  body('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, async (req, res) => {
  try {
    const { recurringId } = req.params;
    const { userId } = req.body;

    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this recurring item'
      });
    }

    const queryText = `
      DELETE FROM RecurringItems
      WHERE RecurringID = @recurringId
        AND UserID = @userId;

      SELECT @@ROWCOUNT AS RowsAffected;
    `;

    const result = await executeQuery(queryText, {
      recurringId: { type: sql.UniqueIdentifier, value: recurringId },
      userId: { type: sql.UniqueIdentifier, value: userId }
    });

    const row = result.recordset?.[0];

    if (!row || row.RowsAffected === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recurring item not found'
      });
    }

    res.json({
      success: true,
      message: 'Recurring item deleted successfully'
    });
  } catch (error) {
    console.error('Delete recurring item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete recurring item'
    });
  }
});

/**
 * @route   POST /api/budget/budgets
 * @desc    Create or update a budget for a user/category/period (upsert)
 * @access  Private
 */
router.post('/budgets', [
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Username').isLength({ min: 1, max: 17 }).withMessage('Username required (max 17 chars)'),
  body('CategoryName').isLength({ min: 1, max: 50 }).withMessage('Category name required (max 50 chars)'),
  body('PeriodStart').isISO8601().withMessage('Valid period start date required'),
  body('PeriodEnd').isISO8601().withMessage('Valid period end date required'),
  body('Amount').isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('Currency').optional().isLength({ min: 1, max: 10 }).withMessage('Currency max 10 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      UserID,
      Username,
      CategoryName,
      PeriodStart,
      PeriodEnd,
      Amount,
      Currency
    } = req.body;

    // Enforce ownership
    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify budgets for this user'
      });
    }

    const periodStartDate = new Date(PeriodStart);
    const periodEndDate = new Date(PeriodEnd);

    const queryText = `
      SET NOCOUNT ON;

      IF EXISTS (
        SELECT 1
        FROM Budgets
        WHERE UserID = @userId
          AND CategoryName = @categoryName
          AND PeriodStart = @periodStart
          AND PeriodEnd = @periodEnd
      )
      BEGIN
        UPDATE Budgets
        SET Amount = @amount,
            Currency = @currency,
            LastEdit = GETDATE()
        WHERE UserID = @userId
          AND CategoryName = @categoryName
          AND PeriodStart = @periodStart
          AND PeriodEnd = @periodEnd;
      END
      ELSE
      BEGIN
        INSERT INTO Budgets (UserID, Username, CategoryName, PeriodStart, PeriodEnd, Amount, Currency)
        VALUES (@userId, @username, @categoryName, @periodStart, @periodEnd, @amount, @currency);
      END

      SELECT TOP 1 BudgetID, UserID, Username, CategoryName, PeriodStart, PeriodEnd, Amount, Currency, CreationTime, LastEdit
      FROM Budgets
      WHERE UserID = @userId
        AND CategoryName = @categoryName
        AND PeriodStart = @periodStart
        AND PeriodEnd = @periodEnd;
    `;

    const result = await executeQuery(queryText, {
      userId: { type: sql.UniqueIdentifier, value: UserID },
      username: { type: sql.VarChar(17), value: Username },
      categoryName: { type: sql.VarChar(50), value: CategoryName },
      periodStart: { type: sql.Date, value: periodStartDate },
      periodEnd: { type: sql.Date, value: periodEndDate },
      amount: { type: sql.Float, value: Amount },
      currency: { type: sql.VarChar(10), value: Currency || 'USD' }
    });

    const budget = result.recordset?.[0];

    res.status(201).json({
      success: true,
      message: 'Budget saved successfully',
      budget
    });
  } catch (error) {
    console.error('Create/update budget error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save budget'
    });
  }
});

/**
 * @route   PUT /api/budget/budgets/:budgetId
 * @desc    Update a specific budget
 * @access  Private
 */
router.put('/budgets/:budgetId', [
  param('budgetId').isUUID().withMessage('Valid budget ID required'),
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('CategoryName').optional().isLength({ min: 1, max: 50 }).withMessage('Category name max 50 chars'),
  body('PeriodStart').optional().isISO8601().withMessage('Valid period start date required'),
  body('PeriodEnd').optional().isISO8601().withMessage('Valid period end date required'),
  body('Amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a non-negative number'),
  body('Currency').optional().isLength({ min: 1, max: 10 }).withMessage('Currency max 10 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { budgetId } = req.params;
    const {
      UserID,
      CategoryName,
      PeriodStart,
      PeriodEnd,
      Amount,
      Currency
    } = req.body;

    // Enforce ownership
    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this budget'
      });
    }

    const queryText = `
      SET NOCOUNT ON;

      UPDATE Budgets
      SET 
        CategoryName = COALESCE(@categoryName, CategoryName),
        PeriodStart = COALESCE(@periodStart, PeriodStart),
        PeriodEnd   = COALESCE(@periodEnd, PeriodEnd),
        Amount      = COALESCE(@amount, Amount),
        Currency    = COALESCE(@currency, Currency),
        LastEdit    = GETDATE()
      WHERE BudgetID = @budgetId
        AND UserID = @userId;

      IF @@ROWCOUNT = 0
      BEGIN
        SELECT CAST(0 AS bit) AS Success, 'Budget not found' AS Message;
        RETURN;
      END

      SELECT CAST(1 AS bit) AS Success, 'Budget updated successfully' AS Message;

      SELECT BudgetID, UserID, Username, CategoryName, PeriodStart, PeriodEnd, Amount, Currency, CreationTime, LastEdit
      FROM Budgets
      WHERE BudgetID = @budgetId
        AND UserID = @userId;
    `;

    const result = await executeQuery(queryText, {
      budgetId: { type: sql.UniqueIdentifier, value: budgetId },
      userId: { type: sql.UniqueIdentifier, value: UserID },
      categoryName: { type: sql.VarChar(50), value: CategoryName || null },
      periodStart: { type: sql.Date, value: PeriodStart ? new Date(PeriodStart) : null },
      periodEnd: { type: sql.Date, value: PeriodEnd ? new Date(PeriodEnd) : null },
      amount: { type: sql.Float, value: typeof Amount === 'number' ? Amount : null },
      currency: { type: sql.VarChar(10), value: Currency || null }
    });

    const [statusRow, budgetRow] = result.recordsets || [];
    const status = Array.isArray(statusRow) ? statusRow[0] : null;

    if (!status || !status.Success) {
      return res.status(404).json({
        success: false,
        error: status?.Message || 'Budget not found'
      });
    }

    res.json({
      success: true,
      message: status.Message,
      budget: Array.isArray(budgetRow) ? budgetRow[0] : null
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update budget'
    });
  }
});

/**
 * @route   DELETE /api/budget/budgets/:budgetId
 * @desc    Delete a specific budget
 * @access  Private
 */
router.delete('/budgets/:budgetId', [
  param('budgetId').isUUID().withMessage('Valid budget ID required'),
  body('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, async (req, res) => {
  try {
    const { budgetId } = req.params;
    const { userId } = req.body;

    // Enforce ownership
    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this budget'
      });
    }

    const queryText = `
      DELETE FROM Budgets
      WHERE BudgetID = @budgetId
        AND UserID = @userId;

      SELECT @@ROWCOUNT AS RowsAffected;
    `;

    const result = await executeQuery(queryText, {
      budgetId: { type: sql.UniqueIdentifier, value: budgetId },
      userId: { type: sql.UniqueIdentifier, value: userId }
    });

    const row = result.recordset?.[0];

    if (!row || row.RowsAffected === 0) {
      return res.status(404).json({
        success: false,
        error: 'Budget not found'
      });
    }

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete budget'
    });
  }
});

/**
 * @route   GET /api/budget/transactions/:userId
 * @desc    Get all transactions for user with optional filters and pagination
 * @access  Private
 */
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 50,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      q,
    } = req.query;

    console.log('Transactions request:', {
      userId,
      page,
      limit,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      q,
    });

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Build stored procedure parameters for data retrieval
    const params = {
      UserId: { type: sql.UniqueIdentifier, value: userId },
      Offset: { type: sql.Int, value: offset },
      Limit: { type: sql.Int, value: limitNum }
    };

    // Build count procedure parameters
    const countParams = {
      UserId: { type: sql.UniqueIdentifier, value: userId }
    };

    // Add TableName parameter if category is specified
    if (category) {
      params.TableName = { type: sql.NVarChar, value: category };
      countParams.TableName = { type: sql.NVarChar, value: category };
    }

    // Add date parameters for database-side filtering
    if (startDate) {
      params.StartDate = { type: sql.Date, value: new Date(startDate) };
      countParams.StartDate = { type: sql.Date, value: new Date(startDate) };
    }
    if (endDate) {
      params.EndDate = { type: sql.Date, value: new Date(endDate) };
      countParams.EndDate = { type: sql.Date, value: new Date(endDate) };
    }

    // Execute both procedures in parallel
    const [result, countResult] = await Promise.all([
      executeStoredProcedure('spmb_GetTransactionsByUserID', params),
      executeStoredProcedure('spmb_GetTransactionCount', countParams)
    ]);

    let transactions = result.recordset || [];
    const totalCount = countResult.recordset?.[0]?.TotalCount || 0;
    
    console.log(`Found ${transactions.length} transactions in current page (${totalCount} total) for category: ${category || 'all'}, dates: ${startDate || 'any'} to ${endDate || 'any'}`);

    // Apply additional in-memory filters (only for fields not supported by stored procedure)
    const min = minAmount !== undefined ? parseFloat(minAmount) : null;
    const max = maxAmount !== undefined ? parseFloat(maxAmount) : null;
    const queryText = (q || '').toLowerCase();

    if (min !== null || max !== null || queryText) {
      transactions = transactions.filter((t) => {
        // Amount range filter
        const amount = parseFloat(t.Amount) || 0;
        if (min !== null && amount < min) return false;
        if (max !== null && amount > max) return false;

        // Text search filter
        if (queryText) {
          const haystack = [
            t.Description,
            t.Notes,
            t.TableName,
            t.Category,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(queryText)) return false;
        }

        return true;
      });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: totalPages,
        hasMore: pageNum < totalPages
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
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
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get unique categories from user's transactions
    const result = await executeStoredProcedure('spmb_GetTransactionsByUserID', {
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
  body('Name').isLength({ min: 1, max: 150 }).withMessage('Name/Category required (max 150 chars)'),
  body('Description').optional().isLength({ max: 150 }).withMessage('Description max 150 characters'),
  body('Amount').custom((value) => {
    if (value === undefined || value === null || value === '') return true; // Allow empty, will default to 0
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Amount must be a valid positive number'),
  body('Due').optional().custom((value) => {
    if (!value) return true;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }).withMessage('Valid due date required'),
  body('Date').optional().custom((value) => {
    if (!value) return true;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }).withMessage('Valid date required'),
  body('Notes').optional().isLength({ max: 60 }).withMessage('Notes max 60 characters'),
  body('Category').optional().isLength({ max: 50 }).withMessage('Category max 50 characters'),
  body('Status').optional().isLength({ max: 20 }).withMessage('Status max 20 characters'),
  body('GroupingID').optional().isUUID().withMessage('GroupingID must be a valid UUID'),
  body('CategoryID').optional().isUUID().withMessage('CategoryID must be a valid UUID')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      UserID,
      Username,
      Name,
      Description,
      Amount,
      Due,
      Date: dateValue,
      Notes,
      Category,
      Status,
      GroupingID,
      CategoryID
    } = req.body;

    // Validate ownership (case-insensitive UUID comparison)
    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create transaction for this user'
      });
    }

    // Convert date strings to Date objects if needed
    let dueDate = null;
    if (Due) {
      dueDate = new Date(Due);
      if (isNaN(dueDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid due date format'
        });
      }
    }

    let transactionDate = null;
    if (dateValue) {
      transactionDate = new Date(dateValue);
      if (isNaN(transactionDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }
    }

    const result = await executeStoredProcedure('spmb_InsertTransaction', {
      UserID: { type: sql.UniqueIdentifier, value: UserID },
      Username: { type: sql.VarChar(17), value: Username },
      Name: { type: sql.VarChar(150), value: Name || null },
      Amount: { type: sql.Float, value: Amount || null },
      Due: { type: sql.DateTime, value: dueDate },
      Date: { type: sql.DateTime, value: transactionDate },
      Notes: { type: sql.VarChar(60), value: Notes || null },
      Category: { type: sql.VarChar(50), value: Category || null },
      Status: { type: sql.VarChar(20), value: Status || null },
      GroupingID: { type: sql.UniqueIdentifier, value: GroupingID || null },
      CategoryID: { type: sql.UniqueIdentifier, value: CategoryID || null }
    });

    const response = result.recordset[0];

    // Invalidate dashboard cache after creating transaction
    await cache.invalidatePattern(`dashboard:${UserID}:*`);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transactionId: response.NewTransactionId
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction: ' + (error.message || 'Unknown error'),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
  body('Description').optional().isLength({ max: 150 }).withMessage('Description max 150 characters'),
  body('Amount').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Amount must be a valid positive number'),
  body('Due').optional().custom((value) => {
    if (!value) return true;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }).withMessage('Valid due date required'),
  body('Date').optional().custom((value) => {
    if (!value) return true;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }).withMessage('Valid date required'),
  body('Notes').optional().isLength({ max: 60 }).withMessage('Notes max 60 characters'),
  body('Category').optional().isLength({ max: 20 }).withMessage('Category max 20 characters'),
  body('Status').optional().isLength({ max: 20 }).withMessage('Status max 20 characters'),
  body('GroupingID').optional().isUUID().withMessage('GroupingID must be a valid UUID'),
  body('CategoryID').optional().isUUID().withMessage('CategoryID must be a valid UUID')
], handleValidationErrors, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const {
      UserID,
      Description,
      Amount,
      Due,
      Date: dateValue,
      Notes,
      Category,
      Status,
      GroupingID,
      CategoryID
    } = req.body;

    // Validate ownership (case-insensitive UUID comparison)
    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this transaction'
      });
    }

    // Convert date strings to Date objects if needed
    let dueDate = null;
    if (Due) {
      dueDate = new Date(Due);
      if (isNaN(dueDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid due date format'
        });
      }
    }

    let transactionDate = null;
    if (dateValue) {
      transactionDate = new Date(dateValue);
      if (isNaN(transactionDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }
    }

    const result = await executeStoredProcedure('spmb_UpdateTransaction', {
      TransactionId: { type: sql.UniqueIdentifier, value: transactionId },
      Name: { type: sql.VarChar(150), value: Description || null },
      Amount: { type: sql.Float, value: Amount || null },
      Due: { type: sql.DateTime, value: dueDate },
      Date: { type: sql.DateTime, value: transactionDate },
      Notes: { type: sql.VarChar(60), value: Notes || null },
      Category: { type: sql.VarChar(20), value: Category || null },
      Status: { type: sql.VarChar(20), value: Status || null },
      UserID: { type: sql.UniqueIdentifier, value: UserID },
      GroupingID: { type: sql.UniqueIdentifier, value: GroupingID || null },
      CategoryID: { type: sql.UniqueIdentifier, value: CategoryID || null }
    });

    const response = result.recordset[0];

    // Invalidate dashboard cache after updating transaction
    await cache.invalidatePattern(`dashboard:${UserID}:*`);

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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction: ' + (error.message || 'Unknown error'),
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
  query('userId').optional().isUUID().withMessage('Valid user ID required')
], handleValidationErrors, async (req, res) => {
  try {
    const { transactionId } = req.params;
    // Accept userId from query params (preferred) or body (backward compatibility)
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Validate ownership (case-insensitive UUID comparison)
    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this transaction'
      });
    }

    const result = await executeStoredProcedure('spmb_DeleteTransaction', {
      TransactionId: { type: sql.UniqueIdentifier, value: transactionId },
      UserID: { type: sql.UniqueIdentifier, value: req.user.UserId }
    });

    const response = result.recordset?.[0];

    if (!response) {
      console.error('Delete transaction: No response from stored procedure');
      return res.status(500).json({
        success: false,
        error: 'No response from delete operation'
      });
    }

    if (response.Success) {
      // Invalidate dashboard cache after deleting transaction
      await cache.invalidatePattern(`dashboard:${userId}:*`);

      res.json({
        success: true,
        message: response.Message || 'Transaction deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: response.Message || 'Transaction not found or could not be deleted'
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
 * @desc    Get income records for user with optional date filters and pagination
 * @access  Private
 */
router.get('/income/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    console.log('Income request:', { userId, page, limit, startDate, endDate });

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Build stored procedure parameters
    const params = {
      UserId: { type: sql.UniqueIdentifier, value: userId },
      Offset: { type: sql.Int, value: offset },
      Limit: { type: sql.Int, value: limitNum }
    };

    const countParams = {
      UserId: { type: sql.UniqueIdentifier, value: userId }
    };

    // Add date parameters if provided
    if (startDate) {
      params.StartDate = { type: sql.DateTime, value: new Date(startDate) };
      countParams.StartDate = { type: sql.DateTime, value: new Date(startDate) };
    }
    if (endDate) {
      params.EndDate = { type: sql.DateTime, value: new Date(endDate) };
      countParams.EndDate = { type: sql.DateTime, value: new Date(endDate) };
    }

    // Try stored procedures first, fallback to direct queries
    let result, countResult;
    try {
      [result, countResult] = await Promise.all([
        executeStoredProcedure('spmb_GetIncomeByUserIDAndDate', params),
        executeStoredProcedure('spmb_GetIncomeCount', countParams)
      ]);
    } catch (procError) {
      console.log('Income stored procedures failed, using direct queries:', procError.message);
      
      // Fallback to direct query
      let query = 'SELECT * FROM Income WHERE UserId = @userId';
      let countQuery = 'SELECT COUNT(*) AS TotalCount FROM Income WHERE UserId = @userId';
      let queryParams = { userId: { type: sql.UniqueIdentifier, value: userId } };
      
      if (startDate && endDate) {
        const dateCondition = ' AND (TRY_CAST(Date AS DATE) BETWEEN @startDate AND @endDate OR CAST(CreationTime AS DATE) BETWEEN @startDate AND @endDate)';
        query += dateCondition;
        countQuery += dateCondition;
        queryParams.startDate = { type: sql.Date, value: new Date(startDate) };
        queryParams.endDate = { type: sql.Date, value: new Date(endDate) };
      }
      
      query += ' ORDER BY CreationTime DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      queryParams.offset = { type: sql.Int, value: offset };
      queryParams.limit = { type: sql.Int, value: limitNum };
      
      [result, countResult] = await Promise.all([
        executeQuery(query, queryParams),
        executeQuery(countQuery, queryParams)
      ]);
    }

    const incomeRecords = result.recordset || [];
    const totalCount = countResult.recordset?.[0]?.TotalCount || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    console.log(`Income result: ${incomeRecords.length} records in current page (${totalCount} total)`);
    
    res.json({
      data: incomeRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: totalPages,
        hasMore: pageNum < totalPages
      }
    });
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

    // Validate ownership (case-insensitive UUID comparison)
    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create income for this user'
      });
    }

    const result = await executeStoredProcedure('spmb_InsertIncome', {
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

    // Invalidate dashboard cache after creating income
    await cache.invalidatePattern(`dashboard:${UserID}:*`);

    // Auto-create tithe transaction if tithe tracking is enabled and tithe > 0
    let titheTransactionId = null;
    if (Tithe && parseFloat(Tithe) > 0) {
      try {
        // Check if user has tithe tracking enabled
        const prefsResult = await executeStoredProcedure('spmb_GetUserPreferences', {
          UserId: { type: sql.UniqueIdentifier, value: UserID }
        });
        const prefs = prefsResult.recordset?.[0];

        if (prefs?.TitheTrackingEnabled) {
          // Find the user's system Tithe grouping
          const groupingsResult = await executeQuery(
            `SELECT GroupingID FROM Groupings WHERE UserID = @UserID AND GroupingName = N'Tithe' AND IsSystem = 1 AND IsActive = 1`,
            { UserID: UserID }
          );
          const titheGrouping = groupingsResult.recordset?.[0];

          if (titheGrouping) {
            const titheResult = await executeStoredProcedure('spmb_InsertTransaction', {
              UserID: { type: sql.UniqueIdentifier, value: UserID },
              Username: { type: sql.VarChar(17), value: Username },
              Name: { type: sql.VarChar(150), value: `Tithe - ${Description || 'Income'}` },
              Amount: { type: sql.Float, value: parseFloat(Tithe) },
              Due: { type: sql.DateTime, value: null },
              Date: { type: sql.DateTime, value: Date ? new Date(Date) : new Date() },
              Notes: { type: sql.VarChar(60), value: `AUTO_TITHE:${response.NewIncomeID}` },
              Category: { type: sql.VarChar(50), value: 'Tithe' },
              Status: { type: sql.VarChar(20), value: TitheStatus || 'Pending' },
              GroupingID: { type: sql.UniqueIdentifier, value: titheGrouping.GroupingID },
              CategoryID: { type: sql.UniqueIdentifier, value: null }
            });
            titheTransactionId = titheResult.recordset?.[0]?.NewTransactionId;
            console.log(`✅ Auto-created tithe transaction ${titheTransactionId} for income ${response.NewIncomeID}`);
          }
        }
      } catch (titheError) {
        console.error('⚠️ Failed to auto-create tithe transaction:', titheError);
        // Don't fail the income creation
      }
    }

    res.status(201).json({
      success: true,
      message: 'Income record created successfully',
      incomeId: response.NewIncomeID,
      titheTransactionId
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
 * @route   POST /api/budget/income/copy-from-last-month
 * @desc    Copy all income from previous month to current month
 * @access  Private
 */
router.post('/income/copy-from-last-month', [
  body('userId').isUUID().withMessage('Valid user ID required')
], handleValidationErrors, protect, async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate ownership
    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate last month's date range
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get last month's income
    const lastMonthIncome = await executeStoredProcedure('spmb_GetIncomeByUserID', {
      UserId: { type: sql.UniqueIdentifier, value: userId }
    });

    // Filter to only last month's records
    const filtered = lastMonthIncome.recordset.filter(inc => {
      const incDate = new Date(inc.Date || inc.CreationTime);
      return incDate >= lastMonth && incDate <= lastMonthEnd;
    });

    // Copy each income to current month
    const copied = [];
    const crypto = require('crypto');

    for (const income of filtered) {
      const originalDate = new Date(income.Date || income.CreationTime);
      const dayOfMonth = originalDate.getDate();

      // Create date for same day in current month
      let newDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);

      // Handle edge case: if day doesn't exist in current month (e.g., Jan 31 -> Feb)
      if (newDate.getMonth() !== now.getMonth()) {
        newDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
      }

      const newIncomeId = crypto.randomUUID();

      await executeStoredProcedure('spmb_InsertIncome', {
        Username: { type: sql.VarChar(17), value: req.user.Username },
        UserID: { type: sql.UniqueIdentifier, value: userId },
        Description: { type: sql.VarChar(45), value: income.Description || null },
        Net: { type: sql.Float, value: income.Net || null },
        Gross: { type: sql.Float, value: income.Gross || null },
        Tithe: { type: sql.Float, value: income.Tithe || null },
        TitheStatus: { type: sql.VarChar(45), value: 'Pending' }, // Reset to Pending
        Date: { type: sql.VarChar(45), value: newDate.toISOString() },
        PaycheckStatus: { type: sql.VarChar(45), value: income.PaycheckStatus || null }
      });

      copied.push({ ...income, IncomeId: newIncomeId, Date: newDate.toISOString() });
    }

    res.json({
      success: true,
      message: `Copied ${copied.length} income records`,
      count: copied.length,
      copied
    });
  } catch (error) {
    console.error('Copy income error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await executeStoredProcedure('spmb_GetCategoryWindows', {
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

    // Validate ownership (case-insensitive UUID comparison)
    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create window for this user'
      });
    }

    const result = await executeStoredProcedure('spmb_CreateCategoryWindow', {
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

    // Validate ownership (case-insensitive UUID comparison)
    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this window'
      });
    }

    const result = await executeStoredProcedure('spmb_UpdateCategoryWindow', {
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

    // Validate ownership (case-insensitive UUID comparison)
    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this window'
      });
    }

    const result = await executeStoredProcedure('spmb_DeleteCategoryWindow', {
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
], handleValidationErrors, async (req, res) => {
  try {
    const { userId, categoryName } = req.params;
    const { startDate, endDate, limit } = req.query;

    const result = await executeStoredProcedure('spmb_GetWindowTransactions', {
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

    // Validate ownership (case-insensitive UUID comparison)
    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update windows for this user'
      });
    }

    const result = await executeStoredProcedure('spmb_UpdateWindowPositions', {
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
  body('Description').optional().isLength({ max: 45 }).withMessage('Description max 45 characters'),
  body('Gross').optional().isFloat({ min: 0 }).withMessage('Valid gross amount required'),
  body('Net').optional().isFloat({ min: 0 }).withMessage('Valid net amount required'),
  body('Tithe').optional().isFloat({ min: 0 }).withMessage('Valid tithe amount required'),
  body('Date').optional().isLength({ max: 45 }).withMessage('Date max 45 characters'),
  body('PaycheckStatus').optional().isLength({ max: 45 }).withMessage('Paycheck status max 45 characters'),
  body('TitheStatus').optional().isLength({ max: 45 }).withMessage('Tithe status max 45 characters'),
  body('Notes').optional().isLength({ max: 500 }).withMessage('Notes max 500 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { incomeId } = req.params;
    const {
      UserID,
      Description,
      Gross,
      Net,
      Tithe,
      Date,
      PaycheckStatus,
      TitheStatus,
      Notes
    } = req.body;

    // Validate ownership (case-insensitive UUID comparison)
    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this income record'
      });
    }

    const result = await executeStoredProcedure('spmb_UpdateIncome', {
      IncomeId: { type: sql.UniqueIdentifier, value: incomeId },
      UserID: { type: sql.UniqueIdentifier, value: UserID },
      Description: { type: sql.VarChar(45), value: Description || null },
      Gross: { type: sql.Float, value: Gross || null },
      Net: { type: sql.Float, value: Net || null },
      Tithe: { type: sql.Float, value: Tithe || null },
      Date: { type: sql.VarChar(45), value: Date || null },
      PaycheckStatus: { type: sql.VarChar(45), value: PaycheckStatus || null },
      TitheStatus: { type: sql.VarChar(45), value: TitheStatus || null },
      Notes: { type: sql.VarChar(sql.MAX), value: Notes || null }
    });

    const response = result.recordset[0];

    // Invalidate dashboard cache after updating income
    await cache.invalidatePattern(`dashboard:${UserID}:*`);

    if (response.Success) {
      // Auto-update or create paired tithe transaction
      try {
        const prefsResult = await executeStoredProcedure('spmb_GetUserPreferences', {
          UserId: { type: sql.UniqueIdentifier, value: UserID }
        });
        const prefs = prefsResult.recordset?.[0];

        if (prefs?.TitheTrackingEnabled) {
          // Find existing auto-tithe transaction linked to this income
          const existingTithe = await executeQuery(
            `SELECT TransactionId FROM Transactions WHERE UserID = @UserID AND Notes = @Notes`,
            { UserID: UserID, Notes: `AUTO_TITHE:${incomeId}` }
          );

          const titheAmount = Tithe != null ? parseFloat(Tithe) : null;

          if (existingTithe.recordset?.length > 0 && titheAmount != null) {
            // Update existing tithe transaction
            const txnId = existingTithe.recordset[0].TransactionId;
            if (titheAmount > 0) {
              await executeQuery(
                `UPDATE Transactions SET Name = @Name, Amount = @Amount, Date = @Date, Status = @Status, LastEdit = GETDATE() WHERE TransactionId = @TxnId AND UserID = @UserID`,
                {
                  Name: `Tithe - ${Description || 'Income'}`,
                  Amount: titheAmount,
                  Date: Date ? new Date(Date) : null,
                  Status: TitheStatus || 'Pending',
                  TxnId: txnId,
                  UserID: UserID
                }
              );
              console.log(`✅ Updated tithe transaction ${txnId} for income ${incomeId}`);
            } else {
              // Tithe set to 0 — remove the auto transaction
              await executeStoredProcedure('spmb_DeleteTransaction', {
                TransactionId: { type: sql.UniqueIdentifier, value: txnId },
                UserID: { type: sql.UniqueIdentifier, value: UserID }
              });
              console.log(`🗑️ Removed tithe transaction ${txnId} (tithe set to 0)`);
            }
          } else if (!existingTithe.recordset?.length && titheAmount > 0) {
            // No existing tithe transaction — create one
            const groupingsResult = await executeQuery(
              `SELECT GroupingID FROM Groupings WHERE UserID = @UserID AND GroupingName = N'Tithe' AND IsSystem = 1 AND IsActive = 1`,
              { UserID: UserID }
            );
            const titheGrouping = groupingsResult.recordset?.[0];

            if (titheGrouping) {
              await executeStoredProcedure('spmb_InsertTransaction', {
                UserID: { type: sql.UniqueIdentifier, value: UserID },
                Username: { type: sql.VarChar(17), value: req.user.Username },
                Name: { type: sql.VarChar(150), value: `Tithe - ${Description || 'Income'}` },
                Amount: { type: sql.Float, value: titheAmount },
                Due: { type: sql.DateTime, value: null },
                Date: { type: sql.DateTime, value: Date ? new Date(Date) : new Date() },
                Notes: { type: sql.VarChar(60), value: `AUTO_TITHE:${incomeId}` },
                Category: { type: sql.VarChar(50), value: 'Tithe' },
                Status: { type: sql.VarChar(20), value: TitheStatus || 'Pending' },
                GroupingID: { type: sql.UniqueIdentifier, value: titheGrouping.GroupingID },
                CategoryID: { type: sql.UniqueIdentifier, value: null }
              });
              console.log(`✅ Created tithe transaction for updated income ${incomeId}`);
            }
          }
        }
      } catch (titheError) {
        console.error('⚠️ Failed to sync tithe transaction on income update:', titheError);
      }

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
  query('userId').optional().isUUID().withMessage('Valid user ID required')
], handleValidationErrors, async (req, res) => {
  try {
    const { incomeId } = req.params;
    // Accept userId from query params (preferred) or body (backward compatibility)
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Validate ownership (case-insensitive UUID comparison)
    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this income record'
      });
    }

    const result = await executeStoredProcedure('spmb_DeleteIncome', {
      IncomeId: { type: sql.UniqueIdentifier, value: incomeId },
      UserID: { type: sql.UniqueIdentifier, value: userId }
    });

    const response = result.recordset?.[0];
    
    if (!response) {
      console.error('Delete income: No response from stored procedure');
      return res.status(500).json({
        success: false,
        error: 'No response from delete operation'
      });
    }
    
    if (response.Success) {
      // Invalidate dashboard cache after deleting income
      await cache.invalidatePattern(`dashboard:${userId}:*`);

      // Also delete any auto-created tithe transaction linked to this income
      try {
        const titheResult = await executeQuery(
          `SELECT TransactionId FROM Transactions WHERE UserID = @UserID AND Notes = @Notes`,
          { UserID: userId, Notes: `AUTO_TITHE:${incomeId}` }
        );
        if (titheResult.recordset?.length > 0) {
          const txnId = titheResult.recordset[0].TransactionId;
          await executeStoredProcedure('spmb_DeleteTransaction', {
            TransactionId: { type: sql.UniqueIdentifier, value: txnId },
            UserID: { type: sql.UniqueIdentifier, value: userId }
          });
          console.log(`🗑️ Deleted paired tithe transaction ${txnId} for income ${incomeId}`);
        }
      } catch (titheCleanupError) {
        console.error('⚠️ Failed to cleanup tithe transaction on income delete:', titheCleanupError);
      }

      res.json({
        success: true,
        message: response.Message || 'Income record deleted successfully'
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

/**
 * SAVED VIEWS
 */

/**
 * @route   GET /api/budget/views/:userId
 * @desc    Get all saved views for a user
 * @access  Private
 */
router.get('/views/:userId', [
  param('userId').isUUID().withMessage('Valid user ID required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view saved views for this user',
      });
    }

    const result = await executeQuery(
      'SELECT SavedViewID, UserID, Name, FilterConfig, CreationTime, LastEdit FROM SavedViews WHERE UserID = @userId ORDER BY CreationTime DESC',
      {
        userId: { type: sql.UniqueIdentifier, value: userId },
      }
    );

    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get saved views error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved views',
    });
  }
});

/**
 * @route   POST /api/budget/views
 * @desc    Create a new saved view
 * @access  Private
 */
router.post('/views', [
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Name').isLength({ min: 1, max: 100 }).withMessage('Name required (max 100 chars)'),
  body('FilterConfig').isString().withMessage('FilterConfig JSON string is required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { UserID, Name, FilterConfig } = req.body;

    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create saved views for this user',
      });
    }

    const result = await executeQuery(
      `
        INSERT INTO SavedViews (UserID, Name, FilterConfig)
        OUTPUT inserted.SavedViewID, inserted.UserID, inserted.Name, inserted.FilterConfig, inserted.CreationTime, inserted.LastEdit
        VALUES (@userId, @name, @filterConfig);
      `,
      {
        userId: { type: sql.UniqueIdentifier, value: UserID },
        name: { type: sql.VarChar(100), value: Name },
        filterConfig: { type: sql.NVarChar(sql.MAX), value: FilterConfig },
      }
    );

    const view = result.recordset?.[0];

    res.status(201).json({
      success: true,
      view,
    });
  } catch (error) {
    console.error('Create saved view error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create saved view',
    });
  }
});

/**
 * @route   PUT /api/budget/views/:viewId
 * @desc    Update a saved view (name or filter config)
 * @access  Private
 */
router.put('/views/:viewId', [
  param('viewId').isUUID().withMessage('Valid view ID required'),
  body('UserID').isUUID().withMessage('Valid user ID required'),
  body('Name').optional().isLength({ min: 1, max: 100 }).withMessage('Name max 100 chars'),
  body('FilterConfig').optional().isString().withMessage('FilterConfig must be JSON string'),
], handleValidationErrors, async (req, res) => {
  try {
    const { viewId } = req.params;
    const { UserID, Name, FilterConfig } = req.body;

    if (UserID.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this saved view',
      });
    }

    const result = await executeQuery(
      `
        UPDATE SavedViews
        SET
          Name = COALESCE(@name, Name),
          FilterConfig = COALESCE(@filterConfig, FilterConfig),
          LastEdit = GETDATE()
        WHERE SavedViewID = @viewId
          AND UserID = @userId;

        SELECT @@ROWCOUNT AS RowsAffected;
      `,
      {
        viewId: { type: sql.UniqueIdentifier, value: viewId },
        userId: { type: sql.UniqueIdentifier, value: UserID },
        name: { type: sql.VarChar(100), value: Name || null },
        filterConfig: {
          type: sql.NVarChar(sql.MAX),
          value: FilterConfig || null,
        },
      }
    );

    const row = result.recordset?.[0];

    if (!row || row.RowsAffected === 0) {
      return res.status(404).json({
        success: false,
        error: 'Saved view not found',
      });
    }

    res.json({
      success: true,
      message: 'Saved view updated successfully',
    });
  } catch (error) {
    console.error('Update saved view error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update saved view',
    });
  }
});

/**
 * @route   DELETE /api/budget/views/:viewId
 * @desc    Delete a saved view
 * @access  Private
 */
router.delete('/views/:viewId', [
  param('viewId').isUUID().withMessage('Valid view ID required'),
  body('userId').isUUID().withMessage('Valid user ID required'),
], handleValidationErrors, async (req, res) => {
  try {
    const { viewId } = req.params;
    const { userId } = req.body;

    if (userId.toUpperCase() !== req.user.UserId.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this saved view',
      });
    }

    const result = await executeQuery(
      `
        DELETE FROM SavedViews
        WHERE SavedViewID = @viewId
          AND UserID = @userId;

        SELECT @@ROWCOUNT AS RowsAffected;
      `,
      {
        viewId: { type: sql.UniqueIdentifier, value: viewId },
        userId: { type: sql.UniqueIdentifier, value: userId },
      }
    );

    const row = result.recordset?.[0];

    if (!row || row.RowsAffected === 0) {
      return res.status(404).json({
        success: false,
        error: 'Saved view not found',
      });
    }

    res.json({
      success: true,
      message: 'Saved view deleted successfully',
    });
  } catch (error) {
    console.error('Delete saved view error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete saved view',
    });
  }
});

module.exports = router;