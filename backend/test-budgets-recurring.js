require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002/api';

// Test credentials (must exist in your dev DB)
const TEST_USER = {
  username: process.env.TEST_USERNAME || 'testuser',
  password: process.env.TEST_PASSWORD || 'TestPass123',
};

let authToken = '';
let userId = '';
let username = '';

const authRequest = async (method, url, data = null) => {
  const config = {
    method,
    url: `${API_BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  };
  if (data) config.data = data;
  return axios(config);
};

async function login() {
  if (authToken) return;
  console.log('1️⃣  Logging in for budget/recurring tests...');
  const res = await axios.post(`${API_BASE_URL}/auth/login`, {
    usernameOrEmail: TEST_USER.username,
    password: TEST_USER.password,
  });
  authToken = res.data.token;
  userId = res.data.UserId;
  username = res.data.Username;
  console.log('✅ Login successful:', { userId, username });
}

async function testBudgets() {
  console.log('\n🧪 Testing Budget CRUD & aggregation\n');
  try {
    await login();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    // Create or upsert a budget
    console.log('2️⃣  Creating test budget...');
    const createRes = await authRequest('post', '/budget/budgets', {
      UserID: userId,
      Username: username,
      CategoryName: 'TestCategory',
      PeriodStart: startOfMonth,
      PeriodEnd: endOfMonth,
      Amount: 500,
      Currency: 'USD',
    });

    const createdBudget = createRes.data.budget;
    if (!createdBudget || !createdBudget.BudgetID) {
      throw new Error('Budget not returned from create response');
    }
    console.log('✅ Budget created:', {
      BudgetID: createdBudget.BudgetID,
      Amount: createdBudget.Amount,
    });

    // Read back budgets for the month
    console.log('\n3️⃣  Fetching budgets for current month...');
    const getRes = await authRequest(
      'get',
      `/budget/budgets/${userId}?startDate=${startOfMonth}&endDate=${endOfMonth}`
    );
    const found = getRes.data.find(
      (b) =>
        b.BudgetID === createdBudget.BudgetID || b.CategoryName === 'TestCategory'
    );
    if (!found) {
      throw new Error('Created budget not found in list');
    }
    console.log('✅ Budget found:', {
      BudgetID: found.BudgetID,
      CategoryName: found.CategoryName,
      Amount: found.Amount,
    });

    // Update the budget amount
    console.log('\n4️⃣  Updating budget amount...');
    const updateRes = await authRequest(
      'put',
      `/budget/budgets/${createdBudget.BudgetID}`,
      {
        UserID: userId,
        Amount: 750,
      }
    );
    console.log('✅ Budget updated:', updateRes.data.message);

    // Verify update
    const verifyRes = await authRequest(
      'get',
      `/budget/budgets/${userId}?startDate=${startOfMonth}&endDate=${endOfMonth}`
    );
    const updated = verifyRes.data.find(
      (b) => b.BudgetID === createdBudget.BudgetID
    );
    console.log('✅ Updated budget value:', updated.Amount);

    // Delete the test budget
    console.log('\n5️⃣  Deleting test budget...');
    const deleteRes = await authRequest(
      'delete',
      `/budget/budgets/${createdBudget.BudgetID}`,
      { userId }
    );
    console.log('✅ Budget deleted:', deleteRes.data.message);

    console.log('\n✅ Budget tests passed!\n');
    return true;
  } catch (err) {
    console.error('❌ Budget tests failed:', err.response?.data || err.message);
    return false;
  }
}

async function testRecurring() {
  console.log('\n🧪 Testing RecurringItems CRUD\n');
  let recurringId;
  try {
    await login();

    // Create recurring expense
    console.log('2️⃣  Creating recurring expense...');
    const today = new Date().toISOString().split('T')[0];
    const createRes = await authRequest('post', '/budget/recurring', {
      UserID: userId,
      Username: username,
      ItemType: 'expense',
      Description: 'Test Subscription',
      TableName: 'Subscriptions',
      Amount: 15.99,
      StartDate: today,
      Frequency: 'monthly',
      Interval: 1,
      NextOccurrence: today,
      Notes: 'Created via test',
    });

    recurringId = createRes.data.recurringId;
    if (!recurringId) throw new Error('No recurringId returned from create');
    console.log('✅ Recurring created:', { recurringId });

    // Fetch recurring expenses
    console.log('\n3️⃣  Fetching recurring expenses...');
    const getRes = await authRequest('get', `/budget/recurring/${userId}?type=expense`);
    const created = getRes.data.find((r) => r.RecurringID === recurringId);
    if (!created) throw new Error('Created recurring item not found');
    console.log('✅ Recurring found:', {
      Description: created.Description,
      Amount: created.Amount,
      Frequency: created.Frequency,
    });

    // Update recurring amount
    console.log('\n4️⃣  Updating recurring amount...');
    const updateRes = await authRequest(
      'put',
      `/budget/recurring/${recurringId}`,
      {
        UserID: userId,
        Amount: 19.99,
        Notes: 'Updated via test',
      }
    );
    console.log('✅ Recurring updated:', updateRes.data.message);

    // Verify update
    const verifyRes = await authRequest('get', `/budget/recurring/${userId}?type=expense`);
    const updated = verifyRes.data.find((r) => r.RecurringID === recurringId);
    console.log('✅ Updated recurring amount:', updated.Amount);

    // Delete recurring
    console.log('\n5️⃣  Deleting recurring item...');
    const deleteRes = await authRequest(
      'delete',
      `/budget/recurring/${recurringId}`,
      { userId }
    );
    console.log('✅ Recurring deleted:', deleteRes.data.message);

    console.log('\n✅ Recurring tests passed!\n');
    return true;
  } catch (err) {
    console.error('❌ Recurring tests failed:', err.response?.data || err.message);
    return false;
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 ReactBudget - Budgets & Recurring Testing Suite');
  console.log('═══════════════════════════════════════════════════════════');

  const budgetsOk = await testBudgets();
  const recurringOk = await testRecurring();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Test Results:');
  console.log(`   Budgets:   ${budgetsOk ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Recurring: ${recurringOk ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(budgetsOk && recurringOk ? 0 : 1);
}

runAllTests();


