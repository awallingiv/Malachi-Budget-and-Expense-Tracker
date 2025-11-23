-- Create Database User for SaltyUser Login
-- Run this in SQL Server Management Studio

USE [SaltAndLite]
GO

-- Step 1: Create database user from the existing SQL login
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'SaltyUser')
BEGIN
    CREATE USER [SaltyUser] FOR LOGIN [SaltyUser]
    PRINT '✓ Database user SaltyUser created'
END
ELSE
BEGIN
    PRINT '✓ Database user SaltyUser already exists'
END

-- Step 2: Grant necessary permissions for the stored procedures
-- Add user to db_datareader and db_datawriter roles
ALTER ROLE [db_datareader] ADD MEMBER [SaltyUser]
ALTER ROLE [db_datawriter] ADD MEMBER [SaltyUser]
PRINT '✓ Added SaltyUser to db_datareader and db_datawriter roles'

-- Step 3: Grant EXECUTE permissions on all spbl_* stored procedures
DECLARE @sql NVARCHAR(MAX) = ''
SELECT @sql = @sql + 'GRANT EXECUTE ON [dbo].[' + name + '] TO [SaltyUser];' + CHAR(13)
FROM sys.procedures 
WHERE name LIKE 'spbl_%'

IF LEN(@sql) > 0
BEGIN
    EXEC sp_executesql @sql
    PRINT '✓ Granted EXECUTE permissions on all spbl_* stored procedures'
END
ELSE
BEGIN
    PRINT '⚠ No spbl_* stored procedures found - make sure TablesAndProcs.sql has been executed'
END

-- Step 4: Verify the setup
PRINT ''
PRINT '=== Verification ==='

-- Check user exists
IF EXISTS (SELECT * FROM sys.database_principals WHERE name = 'SaltyUser')
    PRINT '✓ Database user exists'
ELSE
    PRINT '✗ Database user missing'

-- Check role memberships
SELECT 
    dp.name AS principal_name,
    dp.type_desc AS principal_type,
    r.name AS role_name
FROM sys.database_role_members rm
    JOIN sys.database_principals dp ON rm.member_principal_id = dp.principal_id
    JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
WHERE dp.name = 'SaltyUser'

-- Check stored procedure permissions
SELECT 
    p.permission_name,
    p.state_desc,
    pr.name AS procedure_name
FROM sys.database_permissions p
    JOIN sys.procedures pr ON p.major_id = pr.object_id
    JOIN sys.database_principals dp ON p.grantee_principal_id = dp.principal_id
WHERE dp.name = 'SaltyUser' AND pr.name LIKE 'spbl_%'

PRINT ''
PRINT '=== Setup Complete ==='
PRINT 'SaltyUser should now be able to connect to the SaltAndLite database'
PRINT 'and execute all required stored procedures.'