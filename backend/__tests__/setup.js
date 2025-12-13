/**
 * Test Setup and Global Configuration
 * Runs before all tests
 */

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Set test timeout
jest.setTimeout(10000);

// Suppress console output during tests (optional)
// Uncomment to reduce noise in test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test utilities
global.testUtils = {
  // Generate unique test username
  generateUsername: () => `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  // Generate unique test email
  generateEmail: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
  
  // Wait utility
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Clean up test data (implement as needed)
  cleanupTestData: async (userId) => {
    // Delete test user and related data
    // This would call stored procedures or direct SQL
    console.log(`Cleanup for user: ${userId}`);
  }
};

// Global test users for consistent testing
global.testUsers = {
  validUser: {
    username: 'testuser123',
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    name: 'Test User'
  },
  unvalidatedUser: {
    username: 'unvalidated123',
    email: 'unvalidated@example.com',
    password: 'TestPassword123!',
    name: 'Unvalidated User'
  }
};

// Cleanup function to run after all tests
afterAll(async () => {
  // Close database connections
  // Clean up test data
  // Add any global cleanup here
});

console.log('Test environment initialized');
