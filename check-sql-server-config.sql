-- SQL Server Express Configuration Check
-- Run this in SQL Server Management Studio to check connection settings

PRINT '=== SQL Server Express Configuration Check ==='
PRINT ''

-- Check SQL Server version and edition
SELECT 
    SERVERPROPERTY('ProductVersion') AS Version,
    SERVERPROPERTY('ProductLevel') AS ServicePack,
    SERVERPROPERTY('Edition') AS Edition,
    SERVERPROPERTY('ServerName') AS ServerName,
    SERVERPROPERTY('InstanceName') AS InstanceName
PRINT '✓ Server Information Retrieved'
PRINT ''

-- Check if TCP/IP is enabled (this query works in newer versions)
PRINT '=== Network Protocol Status ==='
EXEC xp_readerrorlog 0, 1, N'Server is listening on'
PRINT ''

-- Check current connections
PRINT '=== Current Connections ==='
SELECT 
    session_id,
    login_name,
    host_name,
    program_name,
    client_interface_name,
    connect_time
FROM sys.dm_exec_sessions 
WHERE is_user_process = 1
PRINT ''

-- Check SQL Server authentication mode
PRINT '=== Authentication Mode ==='
SELECT 
    CASE SERVERPROPERTY('IsIntegratedSecurityOnly')
        WHEN 1 THEN 'Windows Authentication Only'
        WHEN 0 THEN 'Mixed Mode (SQL Server and Windows Authentication)'
    END AS AuthenticationMode
PRINT ''

-- Check if SaltAndLite database exists
PRINT '=== Database Check ==='
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'SaltAndLite')
    PRINT '✓ SaltAndLite database exists'
ELSE
    PRINT '✗ SaltAndLite database not found'
PRINT ''

-- Show all available databases
PRINT '=== Available Databases ==='
SELECT name, database_id, create_date 
FROM sys.databases 
WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
PRINT ''

PRINT '=== Recommendations ==='
PRINT '1. Ensure SQL Server Browser service is running'
PRINT '2. Enable TCP/IP protocol in SQL Server Configuration Manager'
PRINT '3. Restart SQL Server service after enabling TCP/IP'
PRINT '4. Check Windows Firewall for port 1433 or dynamic ports'
PRINT '5. Try connecting with (local)\SQLEXPRESSDEV01 instead of localhost\SQLEXPRESSDEV01'