require('dotenv').config(); // Load environment variables first
const { executeStoredProcedure } = require('./config/database');
const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');

async function createTestUser() {
  console.log('Creating test user...\n');
  
  try {
    // Generate a validation code
    const validationCode = uuidv4();
    
    // Register the user
    console.log('Step 1: Registering user...');
    const registerResult = await executeStoredProcedure('spbl_RegisterUser', {
      UsernameOrEmail: { type: sql.VarChar(50), value: 'testuser@example.com' },
      Pass: { type: sql.VarChar(16), value: 'testpass123' },
      ValidationCode: { type: sql.UniqueIdentifier, value: validationCode }
    });
    
    console.log('Register result:', registerResult);
    
    // Also create a user record directly for testing
    console.log('\nStep 2: Creating direct user record...');
    const insertResult = await executeStoredProcedure('spbl_InsertUser', {
      Username: { type: sql.VarChar(50), value: 'testuser' },
      Pass: { type: sql.VarChar(16), value: 'testpass123' },
      Email: { type: sql.VarChar(50), value: 'testuser@example.com' }
    });
    
    console.log('Insert result:', insertResult);
    
    // Test login
    console.log('\nStep 3: Testing login...');
    const loginResult = await executeStoredProcedure('spbl_LoginUserWithUsername', {
      Username: { type: sql.VarChar(50), value: 'testuser' },
      Password: { type: sql.VarChar(16), value: 'testpass123' }
    });
    
    console.log('Login result:', loginResult);
    
    console.log('\n✅ Test user creation completed!');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  }
}

createTestUser();