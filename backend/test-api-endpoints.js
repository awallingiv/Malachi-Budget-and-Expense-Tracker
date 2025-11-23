const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

async function testAPI() {
  console.log('🧪 Testing ReactBudget API...\n');

  try {
    // Test 1: Health check
    console.log('📡 Test 1: Health Check');
    const healthResponse = await axios.get('http://localhost:3002/health');
    console.log(`✅ Health check: ${healthResponse.data.message}`);
    
    // Test 2: API Root
    console.log('\n📡 Test 2: API Root');
    const apiResponse = await axios.get(`${API_BASE}`);
    console.log(`✅ API Root: ${apiResponse.data.message}`);
    
    // Test 3: Register a new user
    console.log('\n📡 Test 3: User Registration');
    const testUser = {
      username: 'testuser' + Date.now(),
      email: `testuser${Date.now()}@example.com`,
      password: 'TestPass123'
    };
    
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
    console.log(`✅ Registration successful: ${registerResponse.data.message}`);
    console.log(`   User ID: ${registerResponse.data.data?.userId || 'N/A'}`);
    
    // Test 4: Try to login (should fail due to email validation requirement)
    console.log('\n📡 Test 4: Login Test (should fail - email not validated)');
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        login: testUser.username,
        password: testUser.password
      });
      console.log(`⚠️ Login succeeded unexpectedly: ${loginResponse.data.message}`);
    } catch (loginError) {
      if (loginError.response?.status === 401) {
        console.log(`✅ Login correctly failed: ${loginError.response.data.message}`);
      } else {
        console.log(`❌ Login failed with unexpected error: ${loginError.response?.data?.message || loginError.message}`);
      }
    }
    
    console.log('\n🎉 All API tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ API test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPI();