require('dotenv').config();
const { executeStoredProcedure, executeQuery, sql } = require('./backend/config/database');

async function testDatabase() {
  try {
    const userId = '779465F2-B438-40BE-AB3A-C11FC49606D1';
    
    console.log('Testing database directly...\n');
    
    // 1. Check if user exists
    console.log('1. Checking user exists:');
    const userCheck = await executeQuery(
      'SELECT UserId, Username FROM Users WHERE UserId = @userId',
      { userId: { type: sql.UniqueIdentifier, value: userId } }
    );
    console.log('User found:', userCheck.recordset);
    
    // 2. Check transactions for this user
    console.log('\n2. Checking transactions:');
    const transCheck = await executeQuery(
      'SELECT COUNT(*) as count FROM Transactions WHERE UserId = @userId',
      { userId: { type: sql.UniqueIdentifier, value: userId } }
    );
    console.log('Transaction count:', transCheck.recordset[0]);
    
    // 3. Check recent transactions
    console.log('\n3. Recent transactions:');
    const recentTrans = await executeQuery(
      'SELECT TOP 3 TransactionId, Description, Amount, TableName, CreationTime FROM Transactions WHERE UserId = @userId ORDER BY CreationTime DESC',
      { userId: { type: sql.UniqueIdentifier, value: userId } }
    );
    console.log('Recent transactions:', recentTrans.recordset);
    
    // 4. Check income
    console.log('\n4. Checking income:');
    const incomeCheck = await executeQuery(
      'SELECT COUNT(*) as count FROM Income WHERE UserId = @userId',
      { userId: { type: sql.UniqueIdentifier, value: userId } }
    );
    console.log('Income count:', incomeCheck.recordset[0]);
    
    // 5. Test stored procedure exists
    console.log('\n5. Checking stored procedure:');
    const procCheck = await executeQuery(
      "SELECT name FROM sys.procedures WHERE name = 'sprb_GetDashboardStats'"
    );
    console.log('Procedure exists:', procCheck.recordset.length > 0);
    
    if (procCheck.recordset.length === 0) {
      console.log('\n6. Creating stored procedure...');
      await executeQuery(`
        CREATE PROCEDURE sprb_GetDashboardStats
          @UserId UNIQUEIDENTIFIER,
          @StartDate DATE = NULL,
          @EndDate DATE = NULL
        AS
        BEGIN
          SET NOCOUNT ON;
          
          IF @StartDate IS NULL SET @StartDate = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
          IF @EndDate IS NULL SET @EndDate = EOMONTH(GETDATE())
          
          -- Income Statistics
          SELECT 
            ISNULL(SUM(Gross), 0) AS totalGross,
            ISNULL(SUM(Net), 0) AS totalNet,
            ISNULL(SUM(Tithe), 0) AS totalTithe,
            COUNT(*) AS incomeCount
          FROM Income 
          WHERE UserId = @UserId;
          
          -- Category Statistics  
          SELECT 
            TableName,
            ISNULL(SUM(Amount), 0) AS totalAmount,
            COUNT(*) AS transactionCount
          FROM Transactions 
          WHERE UserId = @UserId 
          GROUP BY TableName
          ORDER BY totalAmount DESC;
          
          -- Recent Transactions
          SELECT TOP 5
            TransactionId, Username, TableName, Description, Amount, Date, CreationTime
          FROM Transactions
          WHERE UserId = @UserId
          ORDER BY CreationTime DESC;
        END
      `);
      console.log('Procedure created successfully');
    }
    
    // 6. Test the stored procedure
    console.log('\n7. Testing stored procedure:');
    const procResult = await executeStoredProcedure('sprb_GetDashboardStats', {
      UserId: { type: sql.UniqueIdentifier, value: userId },
      StartDate: { type: sql.Date, value: null },
      EndDate: { type: sql.Date, value: null }
    });
    
    console.log('Procedure result sets:', procResult.recordsets?.length);
    console.log('Income stats:', procResult.recordsets?.[0]?.[0]);
    console.log('Categories count:', procResult.recordsets?.[1]?.length);
    console.log('Transactions count:', procResult.recordsets?.[2]?.length);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    process.exit();
  }
}

testDatabase();