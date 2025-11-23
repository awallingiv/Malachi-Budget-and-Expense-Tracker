# ReactBudget Testing Guide

## Prerequisites

Before running tests, ensure you have:

1. **Node.js 18+** installed
   - Download from: https://nodejs.org/
   - Verify: run `node --version` in terminal

2. **SQL Server** running with SaltAndLite database
   - Database: `SaltAndLite`
   - User: `SaltyUser`
   - Password: `saltypass`
   - All stored procedures from `../SQL/TablesAndProcs.sql` installed

## Running Tests

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Test Database Connection
```bash
# Test database connectivity and stored procedures
node test-database.js
```

**Expected Output:**
- ✅ Database connection successful
- ✅ Login stored procedure accessible
- ✅ SaltyUser login successful (if user exists in database)

### 3. Start Backend Server
```bash
# Start development server
npm run dev
```

**Expected Output:**
- ✅ Database connected successfully
- 🚀 Server running on port 3001
- 📱 Environment: development

### 4. Test API Endpoints
Open a new terminal:
```bash
# Test API endpoints (server must be running)
node test-api.js
```

**Expected Output:**
- ✅ Server is running
- ✅ Root endpoint accessible
- ✅ SaltyUser authentication successful
- ✅ Protected route access successful

## Frontend Testing

### 1. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 2. Update API Base URL
Edit `src/services/apiService.js`:
```javascript
const API_BASE_URL = 'http://localhost:3001/api';
```

### 3. Start Frontend Development
```bash
# Start Expo development server
npm start
```

### 4. Test Authentication Flow
1. Choose platform (web browser recommended for testing)
2. Try registering a new user
3. Validate with email code
4. Login with SaltyUser credentials
5. Navigate through app screens

## Troubleshooting

### Database Connection Issues
- ❌ **"Database connection failed"**
  - Verify SQL Server is running
  - Check credentials in `backend/.env`
  - Ensure SaltAndLite database exists

### Authentication Issues  
- ❌ **"Invalid username or password"**
  - Create SaltyUser in database:
    ```sql
    EXEC spbl_InsertUser 
        @Username = 'SaltyUser',
        @Pass = 'saltypass', 
        @Email = 'salty@example.com',
        @Name = 'Salty User'
    ```
  - Then validate the user:
    ```sql
    EXEC spbl_RegisterUser 
        @UsernameOrEmail = 'SaltyUser',
        @Pass = 'saltypass',
        @ValidationCode = [ValidationCode from previous step]
    ```

### API Issues
- ❌ **"Server not responding"**
  - Ensure backend server is running (`npm run dev`)
  - Check port 3001 is not blocked
  - Verify no other services using port 3001

### Frontend Issues
- ❌ **"Network error"**
  - Update API base URL in apiService.js
  - Ensure backend server is running
  - Check CORS settings if accessing from web

## Test User Setup

If SaltyUser doesn't exist in your database, you can create it:

```sql
-- Create the user
EXEC spbl_InsertUser 
    @Username = 'SaltyUser',
    @Pass = 'saltypass', 
    @Email = 'salty@example.com',
    @Name = 'Salty User';

-- The procedure will return a ValidationCode
-- Use that code to validate the user:
EXEC spbl_RegisterUser 
    @UsernameOrEmail = 'SaltyUser',
    @Pass = 'saltypass',
    @ValidationCode = 'GUID-FROM-PREVIOUS-STEP';
```

## Next Steps

After successful testing:
1. Customize the app UI and branding
2. Add real app icons to `frontend/assets/`
3. Set up production database credentials
4. Deploy to app stores and web hosting