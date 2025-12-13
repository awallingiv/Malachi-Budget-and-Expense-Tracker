require('dotenv').config();
const { executeStoredProcedure, executeQuery, sql } = require('./config/database');

async function testDashboard() {
  try {
    const userId = '779465F2-B438-40BE-AB3A-C11FC49606D1';
    const startDate = '2025-11-01';
    const endDate = '2025-11-30';
    
    console.log('Testing stored procedure...');
    
    // First check if procedure exists
    const procCheck = await executeQuery(
      "SELECT name FROM sys.procedures WHERE name = 'spmb_GetDashboardStats'"
    );
    console.log('Procedure exists:', procCheck.recordset.length > 0);
    
    if (procCheck.recordset.length === 0) {
      console.log('Creating procedure...');
      // Execute the procedure creation script
      await executeQuery(`
        IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'spmb_GetDashboardStats')
            DROP PROCEDURE spmb_GetDashboardStats
        
        EXEC('
        CREATE PROCEDURE spmb_GetDashboardStats
            @UserId UNIQUEIDENTIFIER,
            @StartDate DATE,
            @EndDate DATE
        AS
        BEGIN
            SET NOCOUNT ON;
            
            -- Result Set 1: Income Statistics
            SELECT 
                ISNULL(SUM(Gross), 0) AS totalGross,
                ISNULL(SUM(Net), 0) AS totalNet,
                ISNULL(SUM(Tithe), 0) AS totalTithe,
                COUNT(*) AS incomeCount
            FROM Income 
            WHERE UserId = @UserId 
                AND TRY_CAST(Date AS DATE) BETWEEN @StartDate AND @EndDate;
            
            -- Result Set 2: Category Statistics
            SELECT 
                TableName,
                ISNULL(SUM(Amount), 0) AS totalAmount,
                COUNT(*) AS transactionCount
            FROM Transactions 
            WHERE UserId = @UserId 
                AND CAST(CreationTime AS DATE) BETWEEN @StartDate AND @EndDate
            GROUP BY TableName
            ORDER BY totalAmount DESC;
            
            -- Result Set 3: Recent Transactions (last 5)
            SELECT TOP 5
                TransactionId,
                Username,
                TableName,
                Description,
                Amount,
                Date,
                CreationTime
            FROM Transactions
            WHERE UserId = @UserId
            ORDER BY CreationTime DESC;
        END')
      `);
    }
    
    // Test the procedure
    const result = await executeStoredProcedure('spmb_GetDashboardStats', {
      UserId: { type: sql.UniqueIdentifier, value: userId },
      StartDate: { type: sql.Date, value: new Date(startDate) },
      EndDate: { type: sql.Date, value: new Date(endDate) }
    });
    
    console.log('Result recordsets length:', result.recordsets?.length);
    console.log('Income stats:', result.recordsets?.[0]?.[0]);
    console.log('Categories count:', result.recordsets?.[1]?.length);
    console.log('Recent transactions count:', result.recordsets?.[2]?.length);
    
    // Also test transactions endpoint directly
    const transResult = await executeStoredProcedure('spmb_GetTransactionsByUserID', {
      UserId: { type: sql.UniqueIdentifier, value: userId }
    });
    console.log('Direct transactions count:', transResult.recordset?.length);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

testDashboard();