/**
 * Budget Operations API Tests
 * 
 * Tests CRUD operations for transactions, income, pagination, date filtering, and authorization
 */

// Mock email service BEFORE importing server
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn(() => Promise.resolve(true)),
  sendValidationEmail: jest.fn(() => Promise.resolve(true)),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve(true)),
}));

const request = require('supertest');
const app = require('../server');

describe('Budget Operations API', () => {
  let authToken;
  let testUser;

  // Create and authenticate a user before all tests
  beforeAll(async () => {
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

    authToken = loginResponse.body.token;
    testUser = {
      ...userData,
      userId: loginResponse.body.UserId,
      username: loginResponse.body.Username
    };
  });

  describe('POST /api/budget/transactions', () => {
    test('should create transaction with valid data', async () => {
      const transactionData = {
        UserID: testUser.userId,
        Username: testUser.username,
        TableName: 'Groceries',
        Name: 'Weekly Grocery Shopping',
        Amount: 125.50,
        Date: new Date().toISOString(),
        Notes: 'Test transaction',
        Category: 'Food',
        Status: 'completed'
      };

      const response = await request(app)
        .post('/api/budget/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transactionId');
    });

    test('should reject transaction with invalid UserID (not matching token)', async () => {
      const transactionData = {
        UserID: '00000000-0000-0000-0000-000000000000', // Wrong user ID
        Username: 'wronguser',
        TableName: 'Groceries',
        Name: 'Unauthorized Transaction',
        Amount: 100.00
      };

      const response = await request(app)
        .post('/api/budget/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Not authorized');
    });

    test('should reject transaction with negative amount', async () => {
      const transactionData = {
        UserID: testUser.userId,
        Username: testUser.username,
        TableName: 'Groceries',
        Name: 'Invalid Amount',
        Amount: -50.00 // Negative amount
      };

      const response = await request(app)
        .post('/api/budget/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should reject transaction without authorization', async () => {
      const transactionData = {
        UserID: testUser.userId,
        Username: testUser.username,
        TableName: 'Groceries',
        Name: 'Unauthorized',
        Amount: 50.00
      };

      const response = await request(app)
        .post('/api/budget/transactions')
        .send(transactionData)
        .expect(401);

      expect(response.body.error).toContain('token');
    });
  });

  describe('GET /api/budget/transactions/:userId', () => {
    let createdTransactionIds = [];

    beforeAll(async () => {
      // Create multiple transactions for pagination tests
      const transactions = [
        { Name: 'Transaction 1', Amount: 10.00, TableName: 'Food', Date: new Date('2024-01-01') },
        { Name: 'Transaction 2', Amount: 20.00, TableName: 'Food', Date: new Date('2024-01-02') },
        { Name: 'Transaction 3', Amount: 30.00, TableName: 'Transport', Date: new Date('2024-01-03') },
        { Name: 'Transaction 4', Amount: 40.00, TableName: 'Food', Date: new Date('2024-01-04') },
        { Name: 'Transaction 5', Amount: 50.00, TableName: 'Entertainment', Date: new Date('2024-01-05') }
      ];

      for (const txn of transactions) {
        const response = await request(app)
          .post('/api/budget/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            UserID: testUser.userId,
            Username: testUser.username,
            ...txn
          });

        createdTransactionIds.push(response.body.transactionId);
      }

      await testUtils.sleep(500); // Wait for DB writes
    });

    test('should get transactions for user with pagination', async () => {
      const response = await request(app)
        .get(`/api/budget/transactions/${testUser.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 3 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 3);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.data.length).toBeLessThanOrEqual(3);
    });

    test('should get page 2 of transactions', async () => {
      const response = await request(app)
        .get(`/api/budget/transactions/${testUser.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 2, limit: 3 })
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page', 2);
      expect(response.body.data).toBeDefined();
    });

    test('should filter transactions by category', async () => {
      const response = await request(app)
        .get(`/api/budget/transactions/${testUser.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'Food' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach(txn => {
        expect(txn.TableName).toBe('Food');
      });
    });

    test('should filter transactions by date range', async () => {
      const response = await request(app)
        .get(`/api/budget/transactions/${testUser.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-03'
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should reject access to other user transactions', async () => {
      const otherUserId = '00000000-0000-0000-0000-111111111111';

      const response = await request(app)
        .get(`/api/budget/transactions/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/budget/transactions/:id', () => {
    let transactionId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/budget/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          UserID: testUser.userId,
          Username: testUser.username,
          TableName: 'Test',
          Name: 'To Be Updated',
          Amount: 100.00
        });

      transactionId = response.body.transactionId;
    });

    test('should update transaction owned by user', async () => {
      const updateData = {
        Name: 'Updated Transaction Name',
        Amount: 150.00,
        Notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/budget/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should reject update without authorization', async () => {
      const response = await request(app)
        .put(`/api/budget/transactions/${transactionId}`)
        .send({ Name: 'Unauthorized Update' })
        .expect(401);

      expect(response.body.error).toContain('token');
    });
  });

  describe('DELETE /api/budget/transactions/:id', () => {
    let transactionId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/budget/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          UserID: testUser.userId,
          Username: testUser.username,
          TableName: 'Test',
          Name: 'To Be Deleted',
          Amount: 75.00
        });

      transactionId = response.body.transactionId;
    });

    test('should delete transaction', async () => {
      const response = await request(app)
        .delete(`/api/budget/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ userId: testUser.userId })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should reject delete without authorization', async () => {
      const response = await request(app)
        .delete(`/api/budget/transactions/${transactionId}`)
        .query({ userId: testUser.userId })
        .expect(401);

      expect(response.body.error).toContain('token');
    });
  });

  describe('Income Operations', () => {
    describe('POST /api/budget/income', () => {
      test('should create income record with valid data', async () => {
        const incomeData = {
          UserID: testUser.userId,
          Username: testUser.username,
          Description: 'Monthly Salary',
          Gross: 5000.00,
          Net: 4000.00,
          Tithe: 500.00,
          Date: new Date().toISOString(),
          PaycheckStatus: 'received'
        };

        const response = await request(app)
          .post('/api/budget/income')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incomeData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('incomeId');
      });

      test('should reject income with negative amounts', async () => {
        const incomeData = {
          UserID: testUser.userId,
          Username: testUser.username,
          Description: 'Invalid Income',
          Gross: -1000.00, // Negative
          Net: 900.00
        };

        const response = await request(app)
          .post('/api/budget/income')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incomeData)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/budget/income/:userId', () => {
      beforeAll(async () => {
        // Create test income records
        const incomeRecords = [
          { Description: 'Income 1', Net: 1000, Date: new Date('2024-01-01') },
          { Description: 'Income 2', Net: 2000, Date: new Date('2024-02-01') },
          { Description: 'Income 3', Net: 3000, Date: new Date('2024-03-01') }
        ];

        for (const income of incomeRecords) {
          await request(app)
            .post('/api/budget/income')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              UserID: testUser.userId,
              Username: testUser.username,
              ...income
            });
        }

        await testUtils.sleep(500);
      });

      test('should get income records with pagination', async () => {
        const response = await request(app)
          .get(`/api/budget/income/${testUser.userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 2 })
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page', 1);
        expect(response.body.pagination).toHaveProperty('limit', 2);
      });

      test('should filter income by date range', async () => {
        const response = await request(app)
          .get(`/api/budget/income/${testUser.userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            startDate: '2024-01-01',
            endDate: '2024-02-28'
          })
          .expect(200);

        expect(response.body.data).toBeDefined();
      });
    });

    describe('PUT /api/budget/income/:id', () => {
      let incomeId;

      beforeAll(async () => {
        const response = await request(app)
          .post('/api/budget/income')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            UserID: testUser.userId,
            Username: testUser.username,
            Description: 'To Be Updated',
            Net: 1500.00
          });

        incomeId = response.body.incomeId;
      });

      test('should update income record', async () => {
        const response = await request(app)
          .put(`/api/budget/income/${incomeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            Description: 'Updated Income',
            Net: 1800.00
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });

    describe('DELETE /api/budget/income/:id', () => {
      let incomeId;

      beforeEach(async () => {
        const response = await request(app)
          .post('/api/budget/income')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            UserID: testUser.userId,
            Username: testUser.username,
            Description: 'To Be Deleted',
            Net: 1000.00
          });

        incomeId = response.body.incomeId;
      });

      test('should delete income record', async () => {
        const response = await request(app)
          .delete(`/api/budget/income/${incomeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ userId: testUser.userId })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  describe('GET /api/budget/dashboard/:userId', () => {
    test('should get dashboard statistics', async () => {
      const response = await request(app)
        .get(`/api/budget/dashboard/${testUser.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('income');
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('recentTransactions');
    });

    test('should get dashboard with date range', async () => {
      const response = await request(app)
        .get(`/api/budget/dashboard/${testUser.userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
