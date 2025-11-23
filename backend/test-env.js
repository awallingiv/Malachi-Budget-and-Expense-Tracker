require('dotenv').config();

console.log('Environment variables:');
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[HIDDEN]' : 'MISSING');
console.log('DB_ENCRYPT:', process.env.DB_ENCRYPT);
console.log('DB_TRUST_SERVER_CERTIFICATE:', process.env.DB_TRUST_SERVER_CERTIFICATE);

const { getPool } = require('./config/database');

async function testBasicConnection() {
  try {
    console.log('\nTesting basic connection...');
    const pool = await getPool();
    const result = await pool.request().query('SELECT @@VERSION as SqlVersion');
    console.log('✅ Connection successful!');
    console.log('SQL Server Version:', result.recordset[0].SqlVersion.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testBasicConnection();