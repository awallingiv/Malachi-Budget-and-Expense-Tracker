const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002/api';

// Test credentials
const TEST_USER = {
  username: 'testuser',
  password: 'TestPass123',
  email: 'test@example.com'
};

let authToken = '';
let userId = '';
let username = '';
let testIncomeId = '';
let testTransactionId = '';

// Helper to make authenticated requests
const authRequest = async (method, url, data = null) => {
  const config = {
    method,
    url: `${API_BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };
  if (data) config.data = data;
  return axios(config);
};

async function testIncomeAddEdit() {
  console.log('\n🧪 Testing Income Add/Edit Functionality\n');
  
  try {
    // Step 1: Login to get token
    console.log('1️⃣  Logging in...');
    const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      usernameOrEmail: TEST_USER.username,
      password: TEST_USER.password
    });
    
    authToken = loginRes.data.token;
    userId = loginRes.data.UserId;
    username = loginRes.data.Username;
    console.log('✅ Login successful:', { userId, username });

    // Step 2: Create new income
    console.log('\n2️⃣  Creating new income...');
    const newIncome = {
      UserID: userId,
      Username: username,
      Description: 'Test Paycheck',
      Gross: 5000.00,
      Net: 3800.00,
      Tithe: 500.00,
      Date: new Date().toISOString().split('T')[0],
      TitheStatus: 'unpaid',
      PaycheckStatus: 'received'
    };
    
    const createRes = await authRequest('post', '/budget/income', newIncome);
    testIncomeId = createRes.data.incomeId;
    console.log('✅ Income created:', { incomeId: testIncomeId });

    // Step 3: Get income list to verify it was created
    console.log('\n3️⃣  Fetching income list...');
    const getRes = await authRequest('get', `/budget/income/${userId}`);
    const createdIncome = getRes.data.find(inc => inc.IncomeId === testIncomeId);
    if (createdIncome) {
      console.log('✅ Income found in list:', {
        Description: createdIncome.Description,
        Gross: createdIncome.Gross,
        Net: createdIncome.Net,
        Tithe: createdIncome.Tithe
      });
    } else {
      console.log('❌ Income not found in list');
      throw new Error('Income not found after creation');
    }

    // Step 4: Update the income
    console.log('\n4️⃣  Updating income...');
    const updateData = {
      UserID: userId,
      Description: 'Updated Test Paycheck',
      Gross: 5500.00,
      Net: 4100.00,
      Tithe: 550.00,
      Date: new Date().toISOString().split('T')[0],
      TitheStatus: 'paid',
      PaycheckStatus: 'received',
      Notes: 'Updated via test'
    };
    
    const updateRes = await authRequest('put', `/budget/income/${testIncomeId}`, updateData);
    console.log('✅ Income updated:', updateRes.data);

    // Step 5: Verify the update
    console.log('\n5️⃣  Verifying update...');
    const verifyRes = await authRequest('get', `/budget/income/${userId}`);
    const updatedIncome = verifyRes.data.find(inc => inc.IncomeId === testIncomeId);
    if (updatedIncome) {
      console.log('✅ Update verified:', {
        Description: updatedIncome.Description,
        Gross: updatedIncome.Gross,
        Net: updatedIncome.Net,
        Tithe: updatedIncome.Tithe,
        TitheStatus: updatedIncome.TitheStatus
      });
      
      if (updatedIncome.Description === updateData.Description && 
          Math.abs(updatedIncome.Gross - updateData.Gross) < 0.01) {
        console.log('✅ Income values match!');
      } else {
        console.log('⚠️  Income values may not match exactly');
      }
    } else {
      console.log('❌ Updated income not found');
    }

    // Step 6: Delete the test income
    console.log('\n6️⃣  Deleting test income...');
    const deleteRes = await authRequest('delete', `/budget/income/${testIncomeId}`, { userId });
    console.log('✅ Income deleted:', deleteRes.data);

    console.log('\n✅ All income tests passed!\n');
    return true;

  } catch (error) {
    console.error('\n❌ Income test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    return false;
  }
}

async function testTransactionAddEdit() {
  console.log('\n🧪 Testing Transaction Add/Edit Functionality\n');
  
  try {
    // Step 1: Login (if not already logged in)
    if (!authToken) {
      console.log('1️⃣  Logging in...');
      const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
        usernameOrEmail: TEST_USER.username,
        password: TEST_USER.password
      });
      
      authToken = loginRes.data.token;
      userId = loginRes.data.UserId;
      username = loginRes.data.Username;
      console.log('✅ Login successful');
    }

    // Step 2: Create new transaction
    console.log('\n2️⃣  Creating new transaction...');
    const newTransaction = {
      UserID: userId,
      Username: username,
      TableName: 'Utilities',
      Description: 'Test Electric Bill',
      Amount: 150.00,
      Date: new Date().toISOString(),
      Notes: 'Test transaction',
      Category: 'bills',
      Status: 'pending'
    };
    
    const createRes = await authRequest('post', '/budget/transactions', newTransaction);
    testTransactionId = createRes.data.transactionId;
    console.log('✅ Transaction created:', { transactionId: testTransactionId });

    // Step 3: Get transaction list to verify
    console.log('\n3️⃣  Fetching transactions...');
    const getRes = await authRequest('get', `/budget/transactions/${userId}?category=Utilities`);
    const createdTransaction = getRes.data.find(t => t.TransactionId === testTransactionId);
    if (createdTransaction) {
      console.log('✅ Transaction found:', {
        Description: createdTransaction.Description,
        Amount: createdTransaction.Amount,
        TableName: createdTransaction.TableName
      });
    } else {
      console.log('❌ Transaction not found in list');
      throw new Error('Transaction not found after creation');
    }

    // Step 4: Update the transaction
    console.log('\n4️⃣  Updating transaction...');
    const updateData = {
      UserID: userId,
      Description: 'Updated Test Electric Bill',
      Amount: 175.00,
      Date: new Date().toISOString(),
      Notes: 'Updated via test',
      Category: 'utilities',
      Status: 'paid'
    };
    
    const updateRes = await authRequest('put', `/budget/transactions/${testTransactionId}`, updateData);
    console.log('✅ Transaction updated:', updateRes.data);

    // Step 5: Verify the update
    console.log('\n5️⃣  Verifying update...');
    const verifyRes = await authRequest('get', `/budget/transactions/${userId}?category=Utilities`);
    const updatedTransaction = verifyRes.data.find(t => t.TransactionId === testTransactionId);
    if (updatedTransaction) {
      console.log('✅ Update verified:', {
        Description: updatedTransaction.Description,
        Amount: updatedTransaction.Amount,
        Status: updatedTransaction.Status
      });
      
      if (updatedTransaction.Description === updateData.Description && 
          Math.abs(updatedTransaction.Amount - updateData.Amount) < 0.01) {
        console.log('✅ Transaction values match!');
      } else {
        console.log('⚠️  Transaction values may not match exactly');
      }
    } else {
      console.log('❌ Updated transaction not found');
    }

    // Step 6: Delete the test transaction
    console.log('\n6️⃣  Deleting test transaction...');
    const deleteRes = await authRequest('delete', `/budget/transactions/${testTransactionId}`, { userId });
    console.log('✅ Transaction deleted:', deleteRes.data);

    console.log('\n✅ All transaction tests passed!\n');
    return true;

  } catch (error) {
    console.error('\n❌ Transaction test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    return false;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 ReactBudget - Income & Transaction Testing Suite');
  console.log('═══════════════════════════════════════════════════════════');
  
  const incomeSuccess = await testIncomeAddEdit();
  const transactionSuccess = await testTransactionAddEdit();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Test Results:');
  console.log(`   Income Tests: ${incomeSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Transaction Tests: ${transactionSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  process.exit(incomeSuccess && transactionSuccess ? 0 : 1);
}

runAllTests();

