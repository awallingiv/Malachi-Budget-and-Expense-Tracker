const http = require('http');

// Test 1: Check if server is running
const testServer = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3002/api/budget/transactions/779465F2-B438-40BE-AB3A-C11FC49606D1', (res) => {
      console.log('Server response status:', res.statusCode);
      console.log('Server response headers:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Response body:', data);
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (err) => {
      console.error('Server connection error:', err.message);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });
  });
};

async function quickTest() {
  console.log('Testing server connectivity...\n');
  
  try {
    await testServer();
  } catch (error) {
    console.error('Server test failed:', error.message);
  }
}

quickTest();