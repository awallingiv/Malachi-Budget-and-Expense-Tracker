const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Backend API Test Suite');
console.log('═'.repeat(50));

// First, check if server is running
const axios = require('axios');

async function checkServerRunning() {
    try {
        const response = await axios.get('http://localhost:3002/health');
        console.log('✅ Server is already running');
        return true;
    } catch (error) {
        console.log('❌ Server is not running, will start it...');
        return false;
    }
}

async function startServerAndRunTests() {
    const isRunning = await checkServerRunning();
    
    if (!isRunning) {
        console.log('🔄 Starting server...');
        
        // Start server in background
        const server = spawn('node', ['server.js'], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false
        });
        
        server.stdout.on('data', (data) => {
            console.log(`[SERVER] ${data.toString()}`);
        });
        
        server.stderr.on('data', (data) => {
            console.error(`[SERVER ERROR] ${data.toString()}`);
        });
        
        // Wait for server to start
        console.log('⏳ Waiting for server to start...');
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds
        
        while (attempts < maxAttempts) {
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const response = await axios.get('http://localhost:3002/health');
                console.log('✅ Server is now running');
                break;
            } catch (error) {
                attempts++;
                if (attempts >= maxAttempts) {
                    console.error('❌ Server failed to start within 30 seconds');
                    server.kill();
                    process.exit(1);
                }
            }
        }
        
        // Run tests after server is ready
        setTimeout(async () => {
            console.log('🧪 Starting comprehensive tests...');
            
            const testProcess = spawn('node', ['comprehensive-test.js'], {
                cwd: __dirname,
                stdio: 'inherit'
            });
            
            testProcess.on('close', (code) => {
                console.log(`\n🏁 Tests completed with exit code: ${code}`);
                
                // Kill server
                server.kill();
                console.log('🛑 Server stopped');
                
                process.exit(code);
            });
        }, 2000); // Give server 2 more seconds to be fully ready
        
    } else {
        // Server is already running, just run tests
        console.log('🧪 Running comprehensive tests...');
        
        const testProcess = spawn('node', ['comprehensive-test.js'], {
            cwd: __dirname,
            stdio: 'inherit'
        });
        
        testProcess.on('close', (code) => {
            console.log(`\n🏁 Tests completed with exit code: ${code}`);
            process.exit(code);
        });
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Test runner interrupted');
    process.exit(0);
});

// Start the process
startServerAndRunTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
});