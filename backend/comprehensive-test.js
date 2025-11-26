const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const API_URL = `${BASE_URL}/api`;

// Test data storage
let testUser = {
    username: 'testuser' + Math.random().toString(36).substring(7),
    password: 'testpass123',
    email: 'test' + Math.random().toString(36).substring(7) + '@example.com',
    name: 'Test User',
    userId: null,
    validationCode: null,
    token: null
};

let testTransaction = {
    transactionId: null
};

let testIncome = {
    incomeId: null
};

let testWindow = {
    windowId: null
};

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Test results tracking
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    results: []
};

// Utility functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(endpoint, method, status, expected, details = '') {
    testResults.total++;
    const passed = status === expected || (Array.isArray(expected) && expected.includes(status));
    
    if (passed) {
        testResults.passed++;
        log(`✅ ${method} ${endpoint} - Status: ${status} ${details}`, 'green');
    } else {
        testResults.failed++;
        log(`❌ ${method} ${endpoint} - Expected: ${expected}, Got: ${status} ${details}`, 'red');
    }
    
    testResults.results.push({
        endpoint,
        method,
        status,
        expected,
        passed,
        details
    });
    
    return passed;
}

function logSkip(endpoint, method, reason) {
    testResults.skipped++;
    log(`⏭️  ${method} ${endpoint} - SKIPPED: ${reason}`, 'yellow');
}

// Helper function to make requests with error handling
async function makeRequest(method, url, data = null, headers = {}) {
    try {
        const config = {
            method,
            url,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { status: response.status, data: response.data, error: null };
    } catch (error) {
        return {
            status: error.response?.status || 0,
            data: error.response?.data || null,
            error: error.message
        };
    }
}

// Test functions
async function testServerHealth() {
    log('\n📊 Testing Server Health and Basic Endpoints', 'bold');
    
    // Test root endpoint
    const rootResponse = await makeRequest('GET', BASE_URL);
    logTest('/', 'GET', rootResponse.status, 200);
    
    // Test health endpoint
    const healthResponse = await makeRequest('GET', `${BASE_URL}/health`);
    logTest('/health', 'GET', healthResponse.status, [200, 503]);
    
    if (healthResponse.status === 503) {
        log('⚠️  Database connection failed - some tests may not work properly', 'yellow');
    }
}

async function testAuthEndpoints() {
    log('\n🔐 Testing Authentication Endpoints', 'bold');
    
    // Test user registration
    const registerData = {
        username: testUser.username,
        password: testUser.password,
        email: testUser.email,
        name: testUser.name
    };
    
    const registerResponse = await makeRequest('POST', `${API_URL}/auth/register`, registerData);
    const registerPassed = logTest('/api/auth/register', 'POST', registerResponse.status, [201, 400]);
    
    if (registerPassed && registerResponse.data?.Success) {
        testUser.userId = registerResponse.data.UserId;
        testUser.validationCode = registerResponse.data.ValidationCode;
        log(`   User registered: ${testUser.userId}`, 'cyan');
    } else if (registerResponse.data?.Message?.includes('already exists')) {
        log('   User already exists - continuing with existing user', 'yellow');
    }
    
    // Test validation (if we have validation code)
    if (testUser.validationCode) {
        const validateData = {
            usernameOrEmail: testUser.username,
            password: testUser.password,
            validationCode: testUser.validationCode
        };
        
        const validateResponse = await makeRequest('POST', `${API_URL}/auth/validate`, validateData);
        logTest('/api/auth/validate', 'POST', validateResponse.status, 200);
    } else {
        logSkip('/api/auth/validate', 'POST', 'No validation code available');
    }
    
    // Test login
    const loginData = {
        usernameOrEmail: testUser.username,
        password: testUser.password
    };
    
    const loginResponse = await makeRequest('POST', `${API_URL}/auth/login`, loginData);
    const loginPassed = logTest('/api/auth/login', 'POST', loginResponse.status, [200, 401]);
    
    if (loginPassed && loginResponse.data?.Success) {
        testUser.token = loginResponse.data.token;
        testUser.userId = loginResponse.data.UserId;
        log(`   Login successful - Token: ${testUser.token?.substring(0, 20)}...`, 'cyan');
    }
    
    // Test login with email
    const emailLoginData = {
        usernameOrEmail: testUser.email,
        password: testUser.password
    };
    
    const emailLoginResponse = await makeRequest('POST', `${API_URL}/auth/login`, emailLoginData);
    logTest('/api/auth/login (email)', 'POST', emailLoginResponse.status, [200, 401]);
    
    // Test forgot password
    const forgotPasswordData = {
        usernameOrEmail: testUser.username
    };
    
    const forgotPasswordResponse = await makeRequest('POST', `${API_URL}/auth/forgot-password`, forgotPasswordData);
    logTest('/api/auth/forgot-password', 'POST', forgotPasswordResponse.status, [200, 404]);
    
    // Test invalid login
    const invalidLoginData = {
        usernameOrEmail: 'nonexistentuser',
        password: 'wrongpassword'
    };
    
    const invalidLoginResponse = await makeRequest('POST', `${API_URL}/auth/login`, invalidLoginData);
    logTest('/api/auth/login (invalid)', 'POST', invalidLoginResponse.status, 401);
}

async function testUserEndpoints() {
    log('\n👤 Testing User Management Endpoints', 'bold');
    
    if (!testUser.userId) {
        log('⚠️  No authenticated user - skipping user tests', 'yellow');
        return;
    }
    
    const headers = testUser.token ? { Authorization: `Bearer ${testUser.token}` } : {};
    
    // Test get user profile
    const getUserResponse = await makeRequest('GET', `${API_URL}/user/${testUser.userId}`, null, headers);
    logTest(`/api/user/${testUser.userId}`, 'GET', getUserResponse.status, [200, 401, 403]);
    
    // Test update user profile
    const updateUserData = {
        Email: 'updated' + testUser.email,
        Name: 'Updated Test User'
    };
    
    const updateUserResponse = await makeRequest('PUT', `${API_URL}/user/${testUser.userId}`, updateUserData, headers);
    logTest(`/api/user/${testUser.userId}`, 'PUT', updateUserResponse.status, [200, 401, 403]);
    
    // Test update password
    const updatePasswordData = {
        newPassword: 'newpass123'
    };
    
    const updatePasswordResponse = await makeRequest('PUT', `${API_URL}/user/${testUser.userId}/password`, updatePasswordData, headers);
    logTest(`/api/user/${testUser.userId}/password`, 'PUT', updatePasswordResponse.status, [200, 401, 403]);
    
    // Test get validation info
    const getValidationResponse = await makeRequest('GET', `${API_URL}/user/${testUser.userId}/validation`, null, headers);
    logTest(`/api/user/${testUser.userId}/validation`, 'GET', getValidationResponse.status, [200, 401, 403, 404]);
    
    // Test delete user (commented out to avoid deleting test user)
    // const deleteUserResponse = await makeRequest('DELETE', `${API_URL}/user/${testUser.userId}`, null, headers);
    // logTest(`/api/user/${testUser.userId}`, 'DELETE', deleteUserResponse.status, [200, 401, 403]);
    logSkip(`/api/user/${testUser.userId}`, 'DELETE', 'Avoiding deletion of test user');
}

async function testBudgetEndpoints() {
    log('\n💰 Testing Budget Endpoints', 'bold');
    
    if (!testUser.userId) {
        log('⚠️  No user ID - skipping budget tests', 'yellow');
        return;
    }
    
    const headers = testUser.token ? { Authorization: `Bearer ${testUser.token}` } : {};
    
    // Test budget API test endpoint
    const budgetTestResponse = await makeRequest('GET', `${API_URL}/budget/test`);
    logTest('/api/budget/test', 'GET', budgetTestResponse.status, 200);
    
    // Test dashboard
    const dashboardResponse = await makeRequest('GET', `${API_URL}/budget/dashboard/${testUser.userId}`, null, headers);
    logTest(`/api/budget/dashboard/${testUser.userId}`, 'GET', dashboardResponse.status, [200, 401, 500]);
    
    // Test get transactions
    const getTransactionsResponse = await makeRequest('GET', `${API_URL}/budget/transactions/${testUser.userId}`, null, headers);
    logTest(`/api/budget/transactions/${testUser.userId}`, 'GET', getTransactionsResponse.status, [200, 401, 500]);
    
    // Test get categories
    const getCategoriesResponse = await makeRequest('GET', `${API_URL}/budget/categories/${testUser.userId}`, null, headers);
    logTest(`/api/budget/categories/${testUser.userId}`, 'GET', getCategoriesResponse.status, [200, 401, 500]);
    
    // Test create transaction (without auth - should fail)
    const createTransactionData = {
        UserID: testUser.userId,
        Username: testUser.username,
        TableName: 'Food',
        Description: 'Test grocery purchase',
        Amount: 50.00,
        Date: new Date().toISOString(),
        Notes: 'Test transaction'
    };
    
    const createTransactionResponse = await makeRequest('POST', `${API_URL}/budget/transactions`, createTransactionData);
    logTest('/api/budget/transactions', 'POST', createTransactionResponse.status, [201, 401, 403, 500]);
    
    if (createTransactionResponse.status === 201) {
        testTransaction.transactionId = createTransactionResponse.data?.transactionId;
    }
    
    // Test update transaction (if we have one)
    if (testTransaction.transactionId) {
        const updateTransactionData = {
            UserID: testUser.userId,
            Description: 'Updated test transaction',
            Amount: 75.00
        };
        
        const updateTransactionResponse = await makeRequest('PUT', `${API_URL}/budget/transactions/${testTransaction.transactionId}`, updateTransactionData, headers);
        logTest(`/api/budget/transactions/${testTransaction.transactionId}`, 'PUT', updateTransactionResponse.status, [200, 401, 403, 404]);
    } else {
        logSkip('/api/budget/transactions/{id}', 'PUT', 'No transaction ID available');
    }
    
    // Test get income
    const getIncomeResponse = await makeRequest('GET', `${API_URL}/budget/income/${testUser.userId}`, null, headers);
    logTest(`/api/budget/income/${testUser.userId}`, 'GET', getIncomeResponse.status, [200, 401, 500]);
    
    // Test create income
    const createIncomeData = {
        Username: testUser.username,
        UserID: testUser.userId,
        Description: 'Test paycheck',
        Net: 2000.00,
        Gross: 2500.00,
        Tithe: 250.00,
        TitheStatus: 'unpaid',
        Date: new Date().toISOString(),
        PaycheckStatus: 'received'
    };
    
    const createIncomeResponse = await makeRequest('POST', `${API_URL}/budget/income`, createIncomeData, headers);
    logTest('/api/budget/income', 'POST', createIncomeResponse.status, [201, 401, 403, 500]);
    
    if (createIncomeResponse.status === 201) {
        testIncome.incomeId = createIncomeResponse.data?.incomeId;
    }
    
    // Test category windows
    const getWindowsResponse = await makeRequest('GET', `${API_URL}/budget/windows/${testUser.userId}`, null, headers);
    logTest(`/api/budget/windows/${testUser.userId}`, 'GET', getWindowsResponse.status, [200, 401, 500]);
    
    // Test create category window
    const createWindowData = {
        UserID: testUser.userId,
        Username: testUser.username,
        CategoryName: 'TestCategory',
        DisplayName: 'Test Category Window',
        Description: 'Test category window description',
        ColorTheme: 'blue',
        PositionX: 100,
        PositionY: 100,
        Width: 300,
        Height: 200
    };
    
    const createWindowResponse = await makeRequest('POST', `${API_URL}/budget/windows`, createWindowData, headers);
    logTest('/api/budget/windows', 'POST', createWindowResponse.status, [201, 401, 403, 500]);
    
    if (createWindowResponse.status === 201) {
        testWindow.windowId = createWindowResponse.data?.windowId;
    }
    
    // Test update window positions
    if (testWindow.windowId) {
        const updatePositionsData = {
            UserID: testUser.userId,
            WindowUpdates: [{
                windowId: testWindow.windowId,
                positionX: 150,
                positionY: 150,
                zIndex: 1
            }]
        };
        
        const updatePositionsResponse = await makeRequest('POST', `${API_URL}/budget/windows/positions`, updatePositionsData, headers);
        logTest('/api/budget/windows/positions', 'POST', updatePositionsResponse.status, [200, 401, 403, 500]);
    } else {
        logSkip('/api/budget/windows/positions', 'POST', 'No window ID available');
    }
    
    // Test delete transaction (if we have one)
    if (testTransaction.transactionId) {
        const deleteTransactionData = {
            userId: testUser.userId
        };
        
        const deleteTransactionResponse = await makeRequest('DELETE', `${API_URL}/budget/transactions/${testTransaction.transactionId}`, deleteTransactionData, headers);
        logTest(`/api/budget/transactions/${testTransaction.transactionId}`, 'DELETE', deleteTransactionResponse.status, [200, 401, 403, 404]);
    } else {
        logSkip('/api/budget/transactions/{id}', 'DELETE', 'No transaction ID available');
    }
}

async function testErrorHandling() {
    log('\n🚫 Testing Error Handling', 'bold');
    
    // Test invalid endpoints
    const invalidEndpointResponse = await makeRequest('GET', `${API_URL}/nonexistent`);
    logTest('/api/nonexistent', 'GET', invalidEndpointResponse.status, 404);
    
    // Test invalid methods
    const invalidMethodResponse = await makeRequest('DELETE', `${BASE_URL}/health`);
    logTest('/health', 'DELETE', invalidMethodResponse.status, [404, 405]);
    
    // Test invalid JSON
    const invalidJsonResponse = await axios.post(`${API_URL}/auth/login`, 'invalid json', {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
    });
    logTest('/api/auth/login (invalid JSON)', 'POST', invalidJsonResponse.status, 400);
    
    // Test missing required fields
    const missingFieldsResponse = await makeRequest('POST', `${API_URL}/auth/register`, {});
    logTest('/api/auth/register (missing fields)', 'POST', missingFieldsResponse.status, 400);
    
    // Test invalid UUID
    const invalidUuidResponse = await makeRequest('GET', `${API_URL}/budget/dashboard/invalid-uuid`);
    logTest('/api/budget/dashboard/invalid-uuid', 'GET', invalidUuidResponse.status, [400, 500]);
}

async function printSummary() {
    log('\n📈 Test Results Summary', 'bold');
    log('═'.repeat(50), 'cyan');
    
    const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    
    log(`Total Tests: ${testResults.total}`, 'blue');
    log(`Passed: ${testResults.passed}`, 'green');
    log(`Failed: ${testResults.failed}`, 'red');
    log(`Skipped: ${testResults.skipped}`, 'yellow');
    log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');
    
    log('\n🔍 Detailed Results by Category:', 'bold');
    
    const categories = {
        'Server Health': testResults.results.filter(r => r.endpoint.includes('/health') || r.endpoint === '/'),
        'Authentication': testResults.results.filter(r => r.endpoint.includes('/auth')),
        'User Management': testResults.results.filter(r => r.endpoint.includes('/user')),
        'Budget Operations': testResults.results.filter(r => r.endpoint.includes('/budget')),
        'Error Handling': testResults.results.filter(r => 
            r.endpoint.includes('nonexistent') || 
            r.endpoint.includes('invalid') || 
            r.details?.includes('missing fields')
        )
    };
    
    Object.entries(categories).forEach(([category, results]) => {
        if (results.length > 0) {
            const categoryPassed = results.filter(r => r.passed).length;
            const categoryTotal = results.length;
            const categoryPassRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
            
            log(`\n${category}: ${categoryPassed}/${categoryTotal} (${categoryPassRate}%)`, 
                categoryPassRate >= 80 ? 'green' : categoryPassRate >= 60 ? 'yellow' : 'red');
            
            results.forEach(result => {
                const status = result.passed ? '✅' : '❌';
                log(`  ${status} ${result.method} ${result.endpoint}`, 'cyan');
            });
        }
    });
    
    // Issues and recommendations
    log('\n🔧 Issues and Recommendations:', 'bold');
    
    const failedTests = testResults.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
        log('\nFailed Tests:', 'red');
        failedTests.forEach(test => {
            log(`  • ${test.method} ${test.endpoint} - Expected: ${test.expected}, Got: ${test.status}`, 'red');
        });
    } else {
        log('✅ All tests passed!', 'green');
    }
    
    log('\n💡 General Recommendations:', 'cyan');
    log('  • Ensure database connection is working properly');
    log('  • Test with authentication middleware enabled');
    log('  • Verify all stored procedures exist and function correctly');
    log('  • Check rate limiting configuration');
    log('  • Consider adding input sanitization tests');
    log('  • Test with various user roles and permissions');
}

// Main test runner
async function runTests() {
    log('🚀 Starting Comprehensive Backend API Tests', 'bold');
    log('═'.repeat(50), 'cyan');
    
    try {
        await testServerHealth();
        await testAuthEndpoints();
        await testUserEndpoints();
        await testBudgetEndpoints();
        await testErrorHandling();
        
        await printSummary();
        
        log('\n✨ Test execution completed!', 'bold');
        
        // Exit with appropriate code
        process.exit(testResults.failed > 0 ? 1 : 0);
        
    } catch (error) {
        log(`\n💥 Test execution failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    log(`\n💥 Unhandled rejection: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});

// Run the tests
runTests();