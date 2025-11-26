const axios = require('axios');

// Simple endpoint checker
const BASE_URL = 'http://localhost:3002';

async function quickEndpointCheck() {
    console.log('🔍 Quick Backend Endpoint Status Check');
    console.log('═'.repeat(50));
    
    const endpoints = [
        { method: 'GET', path: '/', name: 'Root endpoint' },
        { method: 'GET', path: '/health', name: 'Health check' },
        { method: 'GET', path: '/api/budget/test', name: 'Budget test endpoint' },
        { method: 'POST', path: '/api/auth/register', name: 'Register endpoint', data: {} },
        { method: 'POST', path: '/api/auth/login', name: 'Login endpoint', data: {} }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const config = {
                method: endpoint.method,
                url: `${BASE_URL}${endpoint.path}`,
                timeout: 5000,
                validateStatus: () => true // Accept any status code
            };
            
            if (endpoint.data) {
                config.data = endpoint.data;
                config.headers = { 'Content-Type': 'application/json' };
            }
            
            const response = await axios(config);
            const statusColor = response.status < 300 ? '✅' : response.status < 500 ? '⚠️' : '❌';
            console.log(`${statusColor} ${endpoint.name}: ${response.status} ${response.statusText}`);
            
            if (response.data && typeof response.data === 'object') {
                const preview = JSON.stringify(response.data).substring(0, 100);
                console.log(`   Data: ${preview}${preview.length >= 100 ? '...' : ''}`);
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log(`❌ ${endpoint.name}: Server not running (Connection refused)`);
                return false; // Server is not running
            } else {
                console.log(`❌ ${endpoint.name}: Error - ${error.message}`);
            }
        }
    }
    
    return true; // Server is responding
}

// Run the check
quickEndpointCheck().then(serverRunning => {
    if (serverRunning) {
        console.log('\n✅ Server is responding to requests');
        console.log('💡 Run "node comprehensive-test.js" for detailed testing');
    } else {
        console.log('\n❌ Server is not running');
        console.log('💡 Start server with: node server.js');
    }
}).catch(error => {
    console.error('💥 Check failed:', error.message);
});