const sql = require('mssql');

const testMethods = [
  {
    name: 'Method 1: Direct server name',
    config: {
      server: 'localhost\\SQLEXPRESSDEV01',
      database: 'SaltAndLite',
      user: 'SaltyUser',
      password: 'SaltyPass',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 15000,
        connectionTimeout: 15000
      }
    }
  },
  {
    name: 'Method 2: Connection string with np (named pipes)',
    config: {
      connectionString: 'Server=np:\\\\.\\pipe\\MSSQL$SQLEXPRESSDEV01\\sql\\query;Database=SaltAndLite;User Id=SaltyUser;Password=SaltyPass;Encrypt=false;TrustServerCertificate=true;'
    }
  },
  {
    name: 'Method 3: localhost with instance',
    config: {
      server: 'localhost',
      database: 'SaltAndLite',
      user: 'SaltyUser',
      password: 'SaltyPass',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 15000,
        connectionTimeout: 15000,
        instanceName: 'SQLEXPRESSDEV01'
      }
    }
  }
];

async function testConnection(method) {
  console.log(`\n=== Testing ${method.name} ===`);
  
  try {
    const pool = new sql.ConnectionPool(method.config);
    await pool.connect();
    console.log('✅ Connection successful!');
    
    // Try a simple query
    const result = await pool.request().query('SELECT @@VERSION as Version');
    console.log(`SQL Server Version: ${result.recordset[0].Version.substring(0, 50)}...`);
    
    await pool.close();
    return true;
  } catch (err) {
    console.log(`❌ Connection failed: ${err.message}`);
    if (err.code) console.log(`   Error code: ${err.code}`);
    return false;
  }
}

async function runTests() {
  console.log('Testing different SQL Server connection methods...\n');
  
  for (const method of testMethods) {
    const success = await testConnection(method);
    if (success) {
      console.log(`\n🎉 Found working method: ${method.name}`);
      console.log('Configuration that worked:');
      console.log(JSON.stringify(method.config, null, 2));
      break;
    }
    
    // Wait a bit between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\nTest completed.');
}

runTests().catch(console.error);