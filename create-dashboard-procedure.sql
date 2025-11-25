-- Create the missing stored procedure for dashboard stats
USE [ReactBudget]
GO

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sprb_GetDashboardStats')
    DROP PROCEDURE sprb_GetDashboardStats
GO

CREATE PROCEDURE sprb_GetDashboardStats
    @UserId UNIQUEIDENTIFIER,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- If no dates provided, use current month
    IF @StartDate IS NULL
        SET @StartDate = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
    IF @EndDate IS NULL
        SET @EndDate = EOMONTH(GETDATE())
    
    -- Result Set 1: Income Statistics
    SELECT 
        ISNULL(SUM(Gross), 0) AS totalGross,
        ISNULL(SUM(Net), 0) AS totalNet,
        ISNULL(SUM(Tithe), 0) AS totalTithe,
        COUNT(*) AS incomeCount
    FROM Income 
    WHERE UserId = @UserId 
        AND (TRY_CAST(Date AS DATE) BETWEEN @StartDate AND @EndDate
             OR CAST(CreationTime AS DATE) BETWEEN @StartDate AND @EndDate);
    
    -- Result Set 2: Category Statistics
    SELECT 
        TableName,
        ISNULL(SUM(Amount), 0) AS totalAmount,
        COUNT(*) AS transactionCount
    FROM Transactions 
    WHERE UserId = @UserId 
        AND CAST(CreationTime AS DATE) BETWEEN @StartDate AND @EndDate
    GROUP BY TableName
    ORDER BY totalAmount DESC;
    
    -- Result Set 3: Recent Transactions (last 5)
    SELECT TOP 5
        TransactionId,
        Username,
        TableName,
        Description,
        Amount,
        Date,
        CreationTime
    FROM Transactions
    WHERE UserId = @UserId
    ORDER BY CreationTime DESC;
END
GO