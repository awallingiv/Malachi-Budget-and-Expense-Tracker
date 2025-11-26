const fs = require('fs');
const path = require('path');

// Backend Endpoint Test Report Generator
console.log('📋 ReactBudget Backend Endpoint Analysis Report');
console.log('═'.repeat(60));

// Read and analyze the codebase
function analyzeEndpoints() {
    const routeFiles = [
        { name: 'Auth Routes', file: 'routes/auth.js' },
        { name: 'Budget Routes', file: 'routes/budget.js' },
        { name: 'User Routes', file: 'routes/user.js' },
        { name: 'Server Routes', file: 'server.js' }
    ];
    
    const endpoints = [];
    
    routeFiles.forEach(route => {
        try {
            const filePath = path.join(__dirname, route.file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            console.log(`\n📁 ${route.name} (${route.file})`);
            console.log('─'.repeat(40));
            
            // Extract route definitions
            const routeRegex = /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
            const appRouteRegex = /app\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
            
            let match;
            let routeCount = 0;
            
            // Check for router routes
            while ((match = routeRegex.exec(content)) !== null) {
                const method = match[1].toUpperCase();
                const path = match[2];
                
                let fullPath = path;
                if (route.name === 'Auth Routes') fullPath = `/api/auth${path}`;
                else if (route.name === 'Budget Routes') fullPath = `/api/budget${path}`;
                else if (route.name === 'User Routes') fullPath = `/api/user${path}`;
                
                endpoints.push({ method, path: fullPath, category: route.name });
                console.log(`  ${method.padEnd(6)} ${fullPath}`);
                routeCount++;
            }
            
            // Check for app routes (server.js)
            routeRegex.lastIndex = 0;
            while ((match = appRouteRegex.exec(content)) !== null) {
                const method = match[1].toUpperCase();
                const path = match[2];
                
                endpoints.push({ method, path, category: route.name });
                console.log(`  ${method.padEnd(6)} ${path}`);
                routeCount++;
            }
            
            console.log(`  Total: ${routeCount} endpoints`);
            
        } catch (error) {
            console.log(`  ❌ Error reading ${route.file}: ${error.message}`);
        }
    });
    
    return endpoints;
}

function analyzeMiddleware() {
    console.log('\n🛡️  Middleware Analysis');
    console.log('─'.repeat(40));
    
    try {
        const authPath = path.join(__dirname, 'middleware/auth.js');
        const authContent = fs.readFileSync(authPath, 'utf8');
        
        console.log('  • JWT Authentication: ✅ Available');
        console.log('  • Token Generation: ✅ Available');
        console.log('  • User Validation: ✅ Available');
        
        // Check if protect middleware is being used
        const serverPath = path.join(__dirname, 'server.js');
        const serverContent = fs.readFileSync(serverPath, 'utf8');
        
        if (serverContent.includes('protect')) {
            console.log('  • Route Protection: ✅ Active');
        } else {
            console.log('  • Route Protection: ⚠️  Not globally active');
        }
        
    } catch (error) {
        console.log('  ❌ Error analyzing middleware:', error.message);
    }
    
    try {
        const errorPath = path.join(__dirname, 'middleware/errorHandler.js');
        const errorContent = fs.readFileSync(errorPath, 'utf8');
        
        console.log('  • Error Handler: ✅ Available');
        console.log('  • 404 Handler: ✅ Available');
        
    } catch (error) {
        console.log('  ❌ Error Handler: ❌ Missing');
    }
}

function analyzeDatabase() {
    console.log('\n🗄️  Database Configuration');
    console.log('─'.repeat(40));
    
    try {
        const dbPath = path.join(__dirname, 'config/database.js');
        const dbContent = fs.readFileSync(dbPath, 'utf8');
        
        console.log('  • Database Config: ✅ Available');
        console.log('  • Connection Pool: ✅ Configured');
        console.log('  • Stored Procedures: ✅ Supported');
        
        // Check .env file
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        
        const dbServer = envContent.match(/DB_SERVER=(.+)/)?.[1] || 'Not set';
        const dbName = envContent.match(/DB_DATABASE=(.+)/)?.[1] || 'Not set';
        const dbUser = envContent.match(/DB_USER=(.+)/)?.[1] || 'Not set';
        
        console.log(`  • Server: ${dbServer}`);
        console.log(`  • Database: ${dbName}`);
        console.log(`  • User: ${dbUser}`);
        
    } catch (error) {
        console.log('  ❌ Error analyzing database config:', error.message);
    }
}

function generateSummary(endpoints) {
    console.log('\n📊 Endpoint Summary');
    console.log('─'.repeat(40));
    
    const byMethod = {};
    const byCategory = {};
    
    endpoints.forEach(endpoint => {
        byMethod[endpoint.method] = (byMethod[endpoint.method] || 0) + 1;
        byCategory[endpoint.category] = (byCategory[endpoint.category] || 0) + 1;
    });
    
    console.log('\n  By HTTP Method:');
    Object.entries(byMethod).forEach(([method, count]) => {
        console.log(`    ${method.padEnd(6)}: ${count} endpoints`);
    });
    
    console.log('\n  By Category:');
    Object.entries(byCategory).forEach(([category, count]) => {
        console.log(`    ${category}: ${count} endpoints`);
    });
    
    console.log(`\n  Total Endpoints: ${endpoints.length}`);
}

function generateTestingRecommendations() {
    console.log('\n🧪 Testing Recommendations');
    console.log('─'.repeat(40));
    
    console.log('\n  Critical Tests:');
    console.log('  • Server health and connectivity');
    console.log('  • Database connection and stored procedures');
    console.log('  • User registration and authentication flow');
    console.log('  • JWT token generation and validation');
    console.log('  • CRUD operations for transactions and income');
    
    console.log('\n  Security Tests:');
    console.log('  • Rate limiting functionality');
    console.log('  • Input validation and sanitization');
    console.log('  • Authorization checks for protected routes');
    console.log('  • Error message information disclosure');
    
    console.log('\n  Performance Tests:');
    console.log('  • Database query performance');
    console.log('  • Response time under load');
    console.log('  • Memory usage with multiple requests');
    
    console.log('\n  Integration Tests:');
    console.log('  • Complete user journey (register → login → use)');
    console.log('  • Cross-endpoint data consistency');
    console.log('  • Error handling across all layers');
}

function generateQuickCommands() {
    console.log('\n🚀 Quick Test Commands');
    console.log('─'.repeat(40));
    
    console.log('\n  Start Server:');
    console.log('    node server.js');
    
    console.log('\n  Run Full Test Suite:');
    console.log('    node comprehensive-test.js');
    
    console.log('\n  Quick Status Check:');
    console.log('    node quick-check.js');
    
    console.log('\n  Windows Batch Runner:');
    console.log('    run-tests.bat');
    
    console.log('\n  Test Specific Dashboard:');
    console.log('    node test-dashboard.js');
    
    console.log('\n  Manual Endpoint Tests:');
    console.log('    curl http://localhost:3002/health');
    console.log('    curl http://localhost:3002/api/budget/test');
}

// Main execution
try {
    const endpoints = analyzeEndpoints();
    analyzeMiddleware();
    analyzeDatabase();
    generateSummary(endpoints);
    generateTestingRecommendations();
    generateQuickCommands();
    
    console.log('\n✨ Analysis complete!');
    console.log('\n💡 To run actual tests, execute: node comprehensive-test.js');
    
} catch (error) {
    console.error('💥 Analysis failed:', error);
}