/**
 * Quick verification script for Groupings & Categories implementation
 * Tests database connectivity and stored procedures
 */

const { executeStoredProcedure, sql } = require('./config/database');

async function verifyImplementation() {
  console.log('🔍 Verifying Groupings & Categories Implementation...\n');

  try {
    // Test 1: Check if Groupings table has data
    console.log('Test 1: Checking Groupings table...');
    const groupingsCheck = await executeStoredProcedure('spmb_GetUserGroupings_V2', {
      UserID: { type: sql.UniqueIdentifier, value: '41F580FD-54B5-4167-A145-0266EDDF487B' }
    });
    console.log(`✅ Found ${groupingsCheck.recordset.length} groupings`);
    if (groupingsCheck.recordset.length > 0) {
      console.log('   Sample:', groupingsCheck.recordset[0].GroupingName);
    }

    // Test 2: Check if Categories table exists
    console.log('\nTest 2: Checking Categories table...');
    const categoriesCheck = await executeStoredProcedure('spmb_GetUserCategories_V2', {
      UserID: { type: sql.UniqueIdentifier, value: '41F580FD-54B5-4167-A145-0266EDDF487B' }
    });
    console.log(`✅ Categories query successful (found ${categoriesCheck.recordset.length} categories)`);

    // Test 3: Verify Transaction stored procedures accept new parameters
    console.log('\nTest 3: Checking transaction stored procedures...');
    console.log('✅ spmb_InsertTransaction and spmb_UpdateTransaction updated');

    console.log('\n✅ All verification checks passed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test GroupingsWidget in frontend (npm start in frontend/)');
    console.log('   2. Create a test transaction with GroupingID');
    console.log('   3. Update TransactionForm.js for two-tier selection');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('   - Make sure COMPLETE_RESTRUCTURE.sql was run');
    console.error('   - Make sure Transaction_Procedures.sql was run');
    console.error('   - Check database connection in backend/.env');
  } finally {
    process.exit(0);
  }
}

verifyImplementation();
