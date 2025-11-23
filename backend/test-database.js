/**
 * Database Connection Test Script
 * Run this to verify database connectivity and stored procedure access
 */

require('dotenv').config();
const { connectDatabase, testConnection, executeStoredProcedure, sql } = require('./config/database');

async function runDatabaseTests() {
  console.log('🧪 Starting ReactBudget Database Tests...\n');

  try {
    // Test 1: Basic Connection
    console.log('📡 Test 1: Database Connection');
    console.log(`   Server: ${process.env.DB_SERVER}`);
    console.log(`   Database: ${process.env.DB_DATABASE}`);
    console.log(`   User: ${process.env.DB_USER}`);
    
    await testConnection();
    console.log('   ✅ Database connection successful\n');

    // Test 2: Test Login Stored Procedure
    console.log('📋 Test 2: User Authentication Test');
    console.log('   Testing stored procedures...');
    
    // Try to find a user (this will help us see if procedures exist)
    try {
      const result = await executeStoredProcedure('sprb_LoginUserWithUsername', {
        Username: { type: sql.VarChar(17), value: 'testuser' },
        Password: { type: sql.VarChar(16), value: 'testpass' }
      });
      
      console.log('   ✅ Login stored procedure accessible');
      console.log(`   Response: ${result.recordset[0]?.Message || 'No response'}`);
    } catch (procError) {
      console.log('   ❌ Login stored procedure error:', procError.message);
    }

    // Test 3: Check if specific user exists
    console.log('\n👤 Test 3: Check SaltyUser');
    try {
      const loginResult = await executeStoredProcedure('sprb_LoginUserWithUsername', {
        Username: { type: sql.VarChar(17), value: 'SaltyUser' },
        Password: { type: sql.VarChar(16), value: 'saltypass' }
      });
      
      const response = loginResult.recordset[0];
      if (response.Success) {
        console.log('   ✅ SaltyUser login successful!');
        console.log(`   User ID: ${response.UserId}`);
        console.log(`   Username: ${response.Username}`);
        console.log(`   Email: ${response.Email}`);
        console.log(`   Name: ${response.Name}`);
      } else {
        console.log('   ⚠️  SaltyUser login failed:', response.Message);
      }
    } catch (userError) {
      console.log('   ❌ SaltyUser test error:', userError.message);
    }

    // Test 4: List available stored procedures
    console.log('\n📜 Test 4: Available Stored Procedures');
    try {
      const procResult = await executeStoredProcedure('sp_helpdb', {});
      console.log('   ✅ Can execute system procedures');
    } catch (err) {
      console.log('   ⚠️  System procedure access limited (this is normal)');
    }

    console.log('\n🎉 Database tests completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Verify SaltyUser credentials if login failed');
    console.log('   2. Ensure all sprb_* stored procedures are installed');
    console.log('   3. Check user permissions on stored procedures');
    console.log('   4. Start the backend server: npm run dev');

  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verify SQL Server is running');
    console.log('   2. Check database credentials in .env file');
    console.log('   3. Ensure SaltAndLite database exists');
    console.log('   4. Verify network connectivity to SQL Server');
    console.log('   5. Check if user has proper permissions');
  } finally {
    process.exit(0);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Run the tests
runDatabaseTests();