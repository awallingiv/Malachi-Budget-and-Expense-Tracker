/**
 * Authentication API Tests
 * 
 * Tests user registration, login, email validation, password reset, and JWT authentication
 */

// Mock email service BEFORE importing server
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn(() => Promise.resolve(true)),
  sendValidationEmail: jest.fn(() => Promise.resolve(true)),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve(true)),
}));

const request = require('supertest');
const app = require('../server');

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    test('should register a new user with valid data', async () => {
      const userData = {
        username: testUtils.generateUsername(),
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('UserId');
      expect(response.body).toHaveProperty('ValidationCode');
      expect(response.body.Message).toContain('registered successfully');
    });

    test('should reject registration with duplicate username', async () => {
      const username = testUtils.generateUsername();
      const userData1 = {
        username,
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'User One'
      };

      // Register first user
      await request(app).post('/api/auth/register').send(userData1).expect(201);

      // Try to register with same username
      const userData2 = {
        username, // Same username
        email: testUtils.generateEmail(), // Different email
        password: 'TestPassword123!',
        name: 'User Two'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body.Message).toContain('already exists');
    });

    test('should reject registration with duplicate email', async () => {
      const email = testUtils.generateEmail();
      const userData1 = {
        username: testUtils.generateUsername(),
        email,
        password: 'TestPassword123!',
        name: 'User One'
      };

      // Register first user
      await request(app).post('/api/auth/register').send(userData1).expect(201);

      // Try to register with same email
      const userData2 = {
        username: testUtils.generateUsername(), // Different username
        email, // Same email
        password: 'TestPassword123!',
        name: 'User Two'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body.Message).toContain('already registered');
    });

    test('should reject registration with invalid email format', async () => {
      const userData = {
        username: testUtils.generateUsername(),
        email: 'invalid-email-format',
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body.Message).toBeDefined();
    });

    test('should reject registration with short username', async () => {
      const userData = {
        username: 'ab', // Too short
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
    });

    test('should reject registration with username longer than 17 chars', async () => {
      const userData = {
        username: 'thisusernameiswaytoolong', // 25 chars
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;
    let validationCode;

    beforeAll(async () => {
      // Create and validate a test user
      const userData = {
        username: testUtils.generateUsername(),
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      validationCode = registerResponse.body.validationCode;
      testUser = { ...userData, userId: registerResponse.body.userId };

      // Validate the user
      await request(app)
        .post('/api/auth/validate')
        .send({
          usernameOrEmail: testUser.username,
          password: testUser.password,
          validationCode
        });
    });

    test('should login with valid username and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('UserId');
      expect(response.body.user).toHaveProperty('Username', testUser.username);
    });

    test('should login with valid email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('Email', testUser.email);
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: testUser.username,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body.Message).toContain('Invalid');
    });

    test('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: 'nonexistentuser999',
          password: 'TestPassword123!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('Success', false);
    });

    test('should reject login for unvalidated account', async () => {
      // Create user but don't validate
      const unvalidatedUser = {
        username: testUtils.generateUsername(),
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Unvalidated User'
      };

      await request(app).post('/api/auth/register').send(unvalidatedUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: unvalidatedUser.username,
          password: unvalidatedUser.password
        })
        .expect(403);

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body.Message).toContain('not been validated');
    });

    test('should return JWT token that can be decoded', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: testUser.username,
          password: testUser.password
        })
        .expect(200);

      const token = response.body.token;
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Test using the token in protected route
      const protectedResponse = await request(app)
        .get(`/api/budget/transactions/${testUser.userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(protectedResponse.body).toBeDefined();
    });
  });

  describe('POST /api/auth/validate', () => {
    test('should validate user with correct code', async () => {
      const userData = {
        username: testUtils.generateUsername(),
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const validationCode = registerResponse.body.validationCode;

      const response = await request(app)
        .post('/api/auth/validate')
        .send({
          usernameOrEmail: userData.username,
          password: userData.password,
          validationCode
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body.Message).toContain('validated successfully');
    });

    test('should reject validation with invalid code', async () => {
      const userData = {
        username: testUtils.generateUsername(),
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Test User'
      };

      await request(app).post('/api/auth/register').send(userData);

      const response = await request(app)
        .post('/api/auth/validate')
        .send({
          usernameOrEmail: userData.username,
          password: userData.password,
          validationCode: '00000000-0000-0000-0000-000000000000' // Invalid GUID
        })
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
    });

    test('should reject validation with wrong password', async () => {
      const userData = {
        username: testUtils.generateUsername(),
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const response = await request(app)
        .post('/api/auth/validate')
        .send({
          usernameOrEmail: userData.username,
          password: 'WrongPassword!',
          validationCode: registerResponse.body.validationCode
        })
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    test('should send password reset code for existing user', async () => {
      const userData = {
        username: testUtils.generateUsername(),
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Test User'
      };

      await request(app).post('/api/auth/register').send(userData);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ usernameOrEmail: userData.email })
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);
      expect(response.body).toHaveProperty('validationCode');
      expect(response.body.Message).toContain('reset code');
    });

    test('should reject forgot password for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ usernameOrEmail: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body).toHaveProperty('Success', false);
      expect(response.body.Message).toContain('not found');
    });
  });

  describe('POST /api/auth/reset-password-link', () => {
    test('should reset password with valid code', async () => {
      const userData = {
        username: testUtils.generateUsername(),
        email: testUtils.generateEmail(),
        password: 'OldPassword123!',
        name: 'Test User'
      };

      await request(app).post('/api/auth/register').send(userData);

      const forgotResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ usernameOrEmail: userData.email });

      const validationCode = forgotResponse.body.validationCode;
      const newPassword = 'NewPassword123!';

      const response = await request(app)
        .post('/api/auth/reset-password-link')
        .send({
          email: userData.email,
          code: validationCode,
          newPassword
        })
        .expect(200);

      expect(response.body).toHaveProperty('Success', true);

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: userData.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
    });

    test('should reject password reset with invalid code', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password-link')
        .send({
          email: 'test@example.com',
          code: '00000000-0000-0000-0000-000000000000',
          newPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('Success', false);
    });
  });

  describe('Protected Routes', () => {
    test('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/budget/transactions/00000000-0000-0000-0000-000000000000')
        .expect(401);

      expect(response.body.Message).toContain('token');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/budget/transactions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer invalid_token_here')
        .expect(401);

      expect(response.body.Message).toBeDefined();
    });

    test('should accept requests with valid token', async () => {
      // Create and login user
      const userData = {
        username: testUtils.generateUsername(),
        email: testUtils.generateEmail(),
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      await request(app)
        .post('/api/auth/validate')
        .send({
          usernameOrEmail: userData.username,
          password: userData.password,
          validationCode: registerResponse.body.validationCode
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          usernameOrEmail: userData.username,
          password: userData.password
        });

      const token = loginResponse.body.token;
      const userId = loginResponse.body.UserId;

      // Use token to access protected route
      const response = await request(app)
        .get(`/api/budget/transactions/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
