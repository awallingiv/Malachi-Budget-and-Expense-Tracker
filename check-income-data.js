require('dotenv').config();
const { executeQuery, sql } = require('./backend/config/database');

async function checkIncomeData() {
  try {
    const userId = '41F580FD-54B5-4167-A145-0266EDDF487B';
    
    console.log('Checking income data for user:', userId);
    
    // 1. Check raw income data
    const incomeQuery = await executeQuery(
      'SELECT * FROM Income WHERE UserId = @userId',
      { userId: { type: sql.UniqueIdentifier, value: userId } }
    );
    
    console.log('\n1. Raw income records:');
    console.log('Count:', incomeQuery.recordset.length);
    incomeQuery.recordset.forEach((record, i) => {
      console.log(`${i+1}:`, {
        IncomeId: record.IncomeId,
        Description: record.Description,
        Gross: record.Gross,
        Net: record.Net,
        Tithe: record.Tithe,
        Date: record.Date,
        CreationTime: record.CreationTime
      });
    });
    
    // 2. Test the income statistics query from stored procedure
    const statsQuery = await executeQuery(
      `SELECT 
        ISNULL(SUM(Gross), 0) AS totalGross,
        ISNULL(SUM(Net), 0) AS totalNet,
        ISNULL(SUM(Tithe), 0) AS totalTithe,
        COUNT(*) AS incomeCount
      FROM Income 
      WHERE UserId = @userId`,
      { userId: { type: sql.UniqueIdentifier, value: userId } }
    );
    
    console.log('\n2. Income statistics:');
    console.log(statsQuery.recordset[0]);
    
    // 3. Test with date filtering (current month)
    const currentMonth = new Date();
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthQuery = await executeQuery(
      `SELECT 
        ISNULL(SUM(Gross), 0) AS totalGross,
        ISNULL(SUM(Net), 0) AS totalNet,
        ISNULL(SUM(Tithe), 0) AS totalTithe,
        COUNT(*) AS incomeCount
      FROM Income 
      WHERE UserId = @userId 
        AND (TRY_CAST(Date AS DATE) BETWEEN @startDate AND @endDate
             OR CAST(CreationTime AS DATE) BETWEEN @startDate AND @endDate)`,
      { 
        userId: { type: sql.UniqueIdentifier, value: userId },
        startDate: { type: sql.Date, value: startDate },
        endDate: { type: sql.Date, value: endDate }
      }
    );
    
    console.log('\n3. Current month income (Nov 2025):');
    console.log('Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
    console.log(monthQuery.recordset[0]);
    
  } catch (error) {
    console.error('Error checking income data:', error);
  } finally {
    process.exit();
  }
}

checkIncomeData();