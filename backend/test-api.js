/**
 * Quick Backend API Test Script
 * Run this after starting the server to test API endpoints
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testBackendAPI() {
  console.log('🧪 Testing ReactBudget Backend API...\n');

  try {
    // Test 1: Health Check
    console.log('🏥 Test 1: Health Check');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/health`);
      console.log('   ✅ Server is running');
      console.log(`   Status: ${healthResponse.data.status}`);
      console.log(`   Database: ${healthResponse.data.database}`);
    } catch (err) {
      console.log('   ❌ Server not responding:', err.message);
      return;
    }

    // Test 2: Basic API Structure
    console.log('\n📋 Test 2: API Structure');
    try {
      const rootResponse = await axios.get(`${API_BASE_URL}/`);
      console.log('   ✅ Root endpoint accessible');
      console.log(`   Message: ${rootResponse.data.message}`);
    } catch (err) {
      console.log('   ⚠️  Root endpoint error:', err.response?.data?.error || err.message);
    }

    // Test 3: Authentication - Login Test
    console.log('\n🔐 Test 3: Authentication Test');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        usernameOrEmail: 'SaltyUser',
        password: 'saltypass'
      });

      if (loginResponse.data.Success) {
        console.log('   ✅ SaltyUser authentication successful!');
        console.log(`   User ID: ${loginResponse.data.UserId}`);
        console.log(`   Token received: ${loginResponse.data.token ? 'Yes' : 'No'}`);
        
        // Test 4: Protected Route with Token
        console.log('\n🛡️  Test 4: Protected Route Access');
        const token = loginResponse.data.token;
        const userId = loginResponse.data.UserId;
        
        try {
          const userResponse = await axios.get(`${API_BASE_URL}/api/user/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('   ✅ Protected route access successful');
          console.log(`   User data retrieved: ${userResponse.data.success ? 'Yes' : 'No'}`);
        } catch (protectedErr) {
          console.log('   ❌ Protected route error:', protectedErr.response?.data?.error || protectedErr.message);
        }
        
      } else {
        console.log('   ❌ Authentication failed:', loginResponse.data.Message);
      }
    } catch (authErr) {
      console.log('   ❌ Authentication error:', authErr.response?.data?.error || authErr.message);
    }

    console.log('\n🎉 API tests completed!');

  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
  }
}

// Run the tests
testBackendAPI();