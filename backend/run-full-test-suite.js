const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

async function runTestSuite() {
    console.log('🚀 ReactBudget Backend API Test Suite');
    console.log('=' .repeat(50));
    
    // Check if server is already running
    try {
        const response = await axios.get('http://localhost:3002/health', { timeout: 2000 });
        console.log('✅ Server is already running on port 3002');
        return runTests();
    } catch (error) {
        console.log('🔄 Server not running, starting it now...');
        return startServerAndRunTests();
    }
}

async function startServerAndRunTests() {
    return new Promise((resolve, reject) => {
        console.log('Starting server...');
        
        // Start server process
        const serverProcess = spawn('node', ['server.js'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: __dirname
        });
        
        let serverStarted = false;
        
        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[SERVER]', output.trim());
            
            // Look for server started message
            if (output.includes('Server running on port') || output.includes('3002')) {
                if (!serverStarted) {
                    serverStarted = true;
                    console.log('✅ Server started successfully');
                    
                    // Wait a moment then run tests
                    setTimeout(() => {
                        runTests().then((exitCode) => {
                            serverProcess.kill();
                            resolve(exitCode);
                        }).catch((error) => {
                            serverProcess.kill();
                            reject(error);
                        });
                    }, 2000);
                }
            }
        });
        
        serverProcess.stderr.on('data', (data) => {
            console.error('[SERVER ERROR]', data.toString().trim());
        });
        
        serverProcess.on('error', (error) => {
            console.error('❌ Failed to start server:', error.message);
            reject(error);
        });
        
        // Timeout if server doesn't start
        setTimeout(() => {
            if (!serverStarted) {
                console.error('❌ Server failed to start within 10 seconds');
                serverProcess.kill();
                reject(new Error('Server startup timeout'));
            }
        }, 10000);
    });
}

async function runTests() {
    return new Promise((resolve, reject) => {
        console.log('🧪 Running comprehensive test suite...');
        console.log('-'.repeat(50));
        
        const testProcess = spawn('node', ['comprehensive-test.js'], {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        testProcess.on('close', (code) => {
            console.log(`\n🏁 Tests completed with exit code: ${code}`);
            resolve(code);
        });
        
        testProcess.on('error', (error) => {
            console.error('❌ Failed to run tests:', error.message);
            reject(error);
        });
    });
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Test execution interrupted');
    process.exit(0);
});

// Run the test suite
runTestSuite()
    .then((exitCode) => {
        process.exit(exitCode || 0);
    })
    .catch((error) => {
        console.error('💥 Test suite failed:', error.message);
        process.exit(1);
    });