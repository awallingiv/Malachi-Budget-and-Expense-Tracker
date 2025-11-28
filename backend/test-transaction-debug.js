const axios = require('axios');

const API_BASE_URL = 'http://localhost:3002/api';

async function testTransaction() {
  try {
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
      usernameOrEmail: 'testuser',
      password: 'TestPass123'
    });
    
    const token = loginRes.data.token;
    const userId = loginRes.data.UserId;
    const username = loginRes.data.Username;
    
    console.log('✅ Login successful');
    console.log('   UserId:', userId);
    console.log('   Username:', username);
    console.log('   Token:', token.substring(0, 30) + '...');

    console.log('\n2. Creating transaction...');
    const transactionData = {
      UserID: userId,
      Username: username,
      TableName: 'TestCategory',
      Description: 'Test Expense',
      Amount: 50.00,
      Date: '2025-11-28',
      Notes: 'Test note',
      Category: 'test',
      Status: 'pending'
    };
    
    console.log('   Request data:', JSON.stringify(transactionData, null, 2));
    
    try {
      const createRes = await axios.post(
        `${API_BASE_URL}/budget/transactions`,
        transactionData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Transaction created successfully!');
      console.log('   Response:', createRes.data);
      
      // Test update
      if (createRes.data.transactionId) {
        console.log('\n3. Updating transaction...');
        const updateData = {
          UserID: userId,
          Description: 'Updated Test Expense',
          Amount: 75.00,
          Date: '2025-11-29',
          Status: 'paid'
        };
        
        const updateRes = await axios.put(
          `${API_BASE_URL}/budget/transactions/${createRes.data.transactionId}`,
          updateData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('✅ Transaction updated successfully!');
        console.log('   Response:', updateRes.data);
        
        // Clean up
        console.log('\n4. Deleting test transaction...');
        await axios.delete(
          `${API_BASE_URL}/budget/transactions/${createRes.data.transactionId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            data: { userId }
          }
        );
        console.log('✅ Test transaction deleted');
      }
      
    } catch (createError) {
      console.error('❌ Create transaction failed:');
      console.error('   Status:', createError.response?.status);
      console.error('   Data:', JSON.stringify(createError.response?.data, null, 2));
      console.error('   Message:', createError.message);
      if (createError.response?.data?.details) {
        console.error('   Validation errors:', createError.response.data.details);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error('   Error message:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status text:', error.response.statusText);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      console.error('   Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error('   No response received. Request:', error.request);
      console.error('   This usually means the server is not running or not accessible.');
    } else {
      console.error('   Error setting up request:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

testTransaction();

