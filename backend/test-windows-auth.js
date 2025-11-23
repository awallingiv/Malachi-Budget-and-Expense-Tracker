const sql = require('mssql');

async function testWindowsAuth() {
  console.log('Testing Windows Authentication...\n');
  
  const config = {
    server: 'localhost\\SQLEXPRESSDEV01',
    database: 'SaltAndLite',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      requestTimeout: 15000,
      connectionTimeout: 15000,
      trustedConnection: true // Use Windows Authentication
    }
  };
  
  try {
    console.log('Attempting Windows Authentication connection...');
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Windows Authentication successful!');
    
    // Try to query users table to see if our database is there
    const result = await pool.request().query(`
      SELECT TOP 5 TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    
    console.log('\nTables found in SaltAndLite database:');
    result.recordset.forEach(row => {
      console.log(`  - ${row.TABLE_NAME}`);
    });
    
    // Check if our specific tables exist
    const checkTables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('Users', 'Income', 'Transactions')
    `);
    
    console.log(`\nOur app tables found: ${checkTables.recordset.length} of 3`);
    
    await pool.close();
    return true;
  } catch (err) {
    console.log(`❌ Windows Authentication failed: ${err.message}`);
    if (err.code) console.log(`   Error code: ${err.code}`);
    return false;
  }
}

testWindowsAuth().catch(console.error);