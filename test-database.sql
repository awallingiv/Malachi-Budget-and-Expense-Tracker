-- ReactBudget Database Test Script
-- Run this in SQL Server Management Studio to test database setup

USE [SaltAndLite]
GO

PRINT '=== ReactBudget Database Tests ==='
PRINT ''

-- Test 1: Check if database exists and we can connect
PRINT '1. Database Connection Test:'
SELECT DB_NAME() as CurrentDatabase, GETDATE() as CurrentTime
PRINT '   ✓ Connected to database successfully'
PRINT ''

-- Test 2: Check if tables exist
PRINT '2. Table Structure Test:'
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
    PRINT '   ✓ Users table exists'
ELSE
    PRINT '   ✗ Users table missing'

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Income')
    PRINT '   ✓ Income table exists'
ELSE
    PRINT '   ✗ Income table missing'

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Transactions')
    PRINT '   ✓ Transactions table exists'
ELSE
    PRINT '   ✗ Transactions table missing'
PRINT ''

-- Test 3: Check if stored procedures exist
PRINT '3. Stored Procedures Test:'
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'spbl_LoginUserWithUsername')
    PRINT '   ✓ spbl_LoginUserWithUsername exists'
ELSE
    PRINT '   ✗ spbl_LoginUserWithUsername missing'

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'spbl_InsertUser')
    PRINT '   ✓ spbl_InsertUser exists'
ELSE
    PRINT '   ✗ spbl_InsertUser missing'

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'spbl_GetUserStatsWithCategories')
    PRINT '   ✓ spbl_GetUserStatsWithCategories exists'
ELSE
    PRINT '   ✗ spbl_GetUserStatsWithCategories missing'
PRINT ''

-- Test 4: Check if SaltyUser exists
PRINT '4. SaltyUser Test:'
IF EXISTS (SELECT * FROM Users WHERE Username = 'SaltyUser')
BEGIN
    PRINT '   ✓ SaltyUser exists in database'
    SELECT Username, Email, Name, Validated, CreationTime 
    FROM Users 
    WHERE Username = 'SaltyUser'
END
ELSE
BEGIN
    PRINT '   ✗ SaltyUser does not exist'
    PRINT '   → Creating SaltyUser...'
    
    -- Create SaltyUser
    EXEC spbl_InsertUser 
        @Username = 'SaltyUser',
        @Pass = 'saltypass',
        @Email = 'salty@example.com',
        @Name = 'Salty User'
    
    PRINT '   → SaltyUser created (needs validation)'
END
PRINT ''

-- Test 5: Test login functionality
PRINT '5. Authentication Test:'
DECLARE @TestResult TABLE (
    Success BIT,
    Message VARCHAR(255),
    UserId UNIQUEIDENTIFIER,
    Username VARCHAR(17),
    Name VARCHAR(25),
    Email VARCHAR(45)
)

INSERT INTO @TestResult
EXEC spbl_LoginUserWithUsername 
    @Username = 'SaltyUser',
    @Password = 'saltypass'

IF EXISTS (SELECT * FROM @TestResult WHERE Success = 1)
BEGIN
    PRINT '   ✓ SaltyUser login successful'
    SELECT Success, Message, Username, Email, Name FROM @TestResult
END
ELSE
BEGIN
    PRINT '   ⚠ SaltyUser login failed (may need validation)'
    SELECT Success, Message FROM @TestResult
    
    -- Check if user needs validation
    IF EXISTS (SELECT * FROM Users WHERE Username = 'SaltyUser' AND Validated = 0)
    BEGIN
        PRINT '   → User exists but not validated'
        PRINT '   → Get validation code:'
        SELECT ValidationCode, ValidationExpires 
        FROM Users 
        WHERE Username = 'SaltyUser'
    END
END
PRINT ''

-- Test 6: Count existing data
PRINT '6. Data Summary:'
SELECT 
    (SELECT COUNT(*) FROM Users) as TotalUsers,
    (SELECT COUNT(*) FROM Income) as TotalIncomeRecords,
    (SELECT COUNT(*) FROM Transactions) as TotalTransactions

PRINT ''
PRINT '=== Test Complete ==='
PRINT 'If any tests failed, review the SQL/TablesAndProcs.sql file'
PRINT 'and ensure all objects are created properly.'