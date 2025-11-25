const fetch = require('node-fetch');

async function testEndpoints() {
  const userId = '779465F2-B438-40BE-AB3A-C11FC49606D1';
  const baseURL = 'http://localhost:3002/api';
  
  console.log('Testing backend endpoints...\n');
  
  try {
    // Test 1: Dashboard endpoint
    console.log('1. Testing dashboard endpoint:');
    const dashUrl = `${baseURL}/budget/dashboard/${userId}?startDate=2025-11-01&endDate=2025-11-30`;
    console.log('URL:', dashUrl);
    
    const dashResponse = await fetch(dashUrl);
    console.log('Status:', dashResponse.status);
    console.log('Headers:', dashResponse.headers.raw());
    
    if (dashResponse.ok) {
      const dashData = await dashResponse.json();
      console.log('Dashboard data:', JSON.stringify(dashData, null, 2));
    } else {
      const error = await dashResponse.text();
      console.log('Dashboard error:', error);
    }
    
    console.log('\n2. Testing transactions endpoint:');
    const transUrl = `${baseURL}/budget/transactions/${userId}?limit=5`;
    console.log('URL:', transUrl);
    
    const transResponse = await fetch(transUrl);
    console.log('Status:', transResponse.status);
    
    if (transResponse.ok) {
      const transData = await transResponse.json();
      console.log('Transactions count:', transData.length);
      console.log('First transaction:', transData[0]);
    } else {
      const error = await transResponse.text();
      console.log('Transactions error:', error);
    }
    
    console.log('\n3. Testing income endpoint:');
    const incomeUrl = `${baseURL}/budget/income/${userId}`;
    console.log('URL:', incomeUrl);
    
    const incomeResponse = await fetch(incomeUrl);
    console.log('Status:', incomeResponse.status);
    
    if (incomeResponse.ok) {
      const incomeData = await incomeResponse.json();
      console.log('Income count:', incomeData.length);
      console.log('Income data:', incomeData);
    } else {
      const error = await incomeResponse.text();
      console.log('Income error:', error);
    }
    
  } catch (error) {
    console.error('Network error:', error.message);
  }
}

testEndpoints();