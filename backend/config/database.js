const sql = require('mssql');

// Database configuration
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'MalachiBudget',
  ...(process.env.DB_USER && process.env.DB_PASSWORD ? {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  } : {}),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 15000,
    useUTC: false,
    // Use Windows Authentication if no user/password specified
    ...(!(process.env.DB_USER && process.env.DB_PASSWORD) ? { trustedConnection: true } : {})
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Global connection pool
let poolPromise;

/**
 * Initialize database connection pool
 */
const connectDatabase = async () => {
  try {
    if (!poolPromise) {
      console.log('🔄 Initializing database connection pool...');
      poolPromise = new sql.ConnectionPool(dbConfig).connect();
      
      const pool = await poolPromise;
      
      pool.on('error', (err) => {
        console.error('❌ Database pool error:', err);
        poolPromise = null;
      });
      
      console.log('✅ Database connection pool initialized');
    }
    
    return await poolPromise;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    poolPromise = null;
    throw error;
  }
};

/**
 * Get database connection pool
 */
const getPool = async () => {
  if (!poolPromise) {
    await connectDatabase();
  }
  return await poolPromise;
};

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 as test');
    return result.recordset[0].test === 1;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    throw error;
  }
};

/**
 * Execute stored procedure with parameters
 */
const executeStoredProcedure = async (procedureName, parameters = {}) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Add parameters to request
    Object.keys(parameters).forEach(key => {
      const param = parameters[key];
      if (param.type && param.value !== undefined) {
        request.input(key, param.type, param.value);
      } else {
        request.input(key, param);
      }
    });
    
    console.log(`🔍 Executing stored procedure: ${procedureName}`, parameters);
    const result = await request.execute(procedureName);
    
    return {
      recordsets: result.recordsets,
      recordset: result.recordset,
      rowsAffected: result.rowsAffected,
      returnValue: result.returnValue
    };
  } catch (error) {
    console.error(`❌ Error executing stored procedure ${procedureName}:`, error);
    throw error;
  }
};

/**
 * Execute raw SQL query (use sparingly, prefer stored procedures)
 */
const executeQuery = async (query, parameters = {}) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    // Add parameters to request
    Object.keys(parameters).forEach(key => {
      const param = parameters[key];
      if (param.type && param.value !== undefined) {
        request.input(key, param.type, param.value);
      } else {
        request.input(key, param);
      }
    });
    
    console.log(`🔍 Executing query:`, query);
    const result = await request.query(query);
    
    return {
      recordsets: result.recordsets,
      recordset: result.recordset,
      rowsAffected: result.rowsAffected
    };
  } catch (error) {
    console.error(`❌ Error executing query:`, error);
    throw error;
  }
};

/**
 * Close database connection pool
 */
const closeDatabase = async () => {
  try {
    if (poolPromise) {
      const pool = await poolPromise;
      await pool.close();
      poolPromise = null;
      console.log('✅ Database connection pool closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

// Handle process termination
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);
process.on('exit', closeDatabase);

module.exports = {
  connectDatabase,
  getPool,
  testConnection,
  executeStoredProcedure,
  executeQuery,
  closeDatabase,
  sql // Export sql types for parameter definitions
};