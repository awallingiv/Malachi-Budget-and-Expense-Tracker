USE [MalachiBudget]
GO
/****** Object:  StoredProcedure [dbo].[spmb_CreateCategory]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


-- 8. CREATE OR ALTER Category
CREATE   PROCEDURE [dbo].[spmb_CreateCategory]
    @GroupingID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER,
    @Username VARCHAR(17),
    @CategoryName NVARCHAR(50),
    @DisplayOrder INT = 999,
    @Color VARCHAR(20) = NULL,
    @Icon VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CategoryID UNIQUEIDENTIFIER = NEWID();

    INSERT INTO Categories (CategoryID, GroupingID, UserID, Username, CategoryName, DisplayOrder, Color, Icon)
    VALUES (@CategoryID, @GroupingID, @UserID, @Username, @CategoryName, @DisplayOrder, @Color, @Icon);

    SELECT
        CategoryID,
        GroupingID,
        UserID,
        Username,
        CategoryName,
        DisplayOrder,
        Color,
        Icon,
        IsActive,
        CreationTime,
        LastEdit
    FROM Categories
    WHERE CategoryID = @CategoryID;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_CreateCategoryWindow]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Create new category window
CREATE   PROCEDURE [dbo].[spmb_CreateCategoryWindow]
    @UserID UNIQUEIDENTIFIER,
    @Username VARCHAR(17),
    @CategoryName VARCHAR(50),
    @DisplayName VARCHAR(100),
    @Description VARCHAR(255) = NULL,
    @ColorTheme VARCHAR(20) = 'blue',
    @PositionX INT = 100,
    @PositionY INT = 100,
    @Width INT = 300,
    @Height INT = 200
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @WindowID UNIQUEIDENTIFIER = NEWID();
    DECLARE @MaxZIndex INT;
    
    -- Get the highest Z-index for this user
    SELECT @MaxZIndex = ISNULL(MAX(ZIndex), 0) + 1
    FROM CategoryWindows 
    WHERE UserID = @UserID;
    
    INSERT INTO CategoryWindows (
        WindowID, UserID, Username, CategoryName, DisplayName, 
        Description, ColorTheme, PositionX, PositionY, 
        Width, Height, ZIndex
    )
    VALUES (
        @WindowID, @UserID, @Username, @CategoryName, @DisplayName,
        @Description, @ColorTheme, @PositionX, @PositionY,
        @Width, @Height, @MaxZIndex
    );
    
    SELECT 
        CAST(1 AS BIT) AS Success,
        'Category window created successfully.' AS Message,
        @WindowID AS NewWindowID;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_CreateGrouping]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 2. Create Grouping
CREATE   PROCEDURE [dbo].[spmb_CreateGrouping]
    @UserID UNIQUEIDENTIFIER,
    @Username VARCHAR(17),
    @GroupingName NVARCHAR(50),
    @DisplayOrder INT = 999,
    @Color VARCHAR(20) = NULL,
    @Icon NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if grouping with this name already exists for this user
    DECLARE @ExistingGroupingID UNIQUEIDENTIFIER;
    SELECT @ExistingGroupingID = GroupingID FROM Groupings 
    WHERE UserID = @UserID AND GroupingName = @GroupingName;

    IF @ExistingGroupingID IS NOT NULL
    BEGIN
        -- Grouping exists - reactivate it if it was deleted
        UPDATE Groupings
        SET 
            DisplayOrder = @DisplayOrder,
            Color = COALESCE(@Color, Color),
            Icon = COALESCE(@Icon, Icon),
            IsActive = 1,
            LastEdit = GETDATE()
        WHERE GroupingID = @ExistingGroupingID;

        SELECT
            GroupingID,
            UserID,
            Username,
            GroupingName,
            DisplayOrder,
            Color,
            Icon,
            IsActive,
            CreationTime,
            LastEdit
        FROM Groupings
        WHERE GroupingID = @ExistingGroupingID;
    END
    ELSE
    BEGIN
        -- Create new grouping
        DECLARE @NewGroupingID UNIQUEIDENTIFIER = NEWID();

        INSERT INTO Groupings (GroupingID, UserID, Username, GroupingName, DisplayOrder, Color, Icon)
        VALUES (@NewGroupingID, @UserID, @Username, @GroupingName, @DisplayOrder, @Color, @Icon);

        SELECT
            GroupingID,
            UserID,
            Username,
            GroupingName,
            DisplayOrder,
            Color,
            Icon,
            IsActive,
            CreationTime,
            LastEdit
        FROM Groupings
        WHERE GroupingID = @NewGroupingID;
    END
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_DeleteCategory]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 10. Delete Category
CREATE   PROCEDURE [dbo].[spmb_DeleteCategory]
    @CategoryID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Soft delete - set IsActive = 0
    UPDATE Categories
    SET IsActive = 0, LastEdit = GETDATE()
    WHERE CategoryID = @CategoryID AND UserID = @UserID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_DeleteCategoryWindow]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Delete category window
CREATE   PROCEDURE [dbo].[spmb_DeleteCategoryWindow]
    @WindowID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if window exists and belongs to user
    IF NOT EXISTS (SELECT 1 FROM CategoryWindows WHERE WindowID = @WindowID AND UserID = @UserID)
    BEGIN
        SELECT 
            CAST(0 AS BIT) AS Success,
            'Category window not found or access denied.' AS Message;
        RETURN;
    END
    
    -- Soft delete by setting IsActive to 0
    UPDATE CategoryWindows
    SET 
        IsActive = 0,
        LastEdit = GETDATE()
    WHERE WindowID = @WindowID;
    
    SELECT 
        CAST(1 AS BIT) AS Success,
        'Category window deleted successfully.' AS Message;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_DeleteGrouping]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 4. Delete Grouping
CREATE   PROCEDURE [dbo].[spmb_DeleteGrouping]
    @GroupingID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Soft delete - set IsActive = 0
    UPDATE Groupings
    SET IsActive = 0, LastEdit = GETDATE()
    WHERE GroupingID = @GroupingID AND UserID = @UserID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_DeleteIncome]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Delete income by ID
CREATE   PROCEDURE [dbo].[spmb_DeleteIncome]
    @IncomeId UNIQUEIDENTIFIER,
    @UserID   UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
	
    BEGIN TRY
        DELETE FROM dbo.Income
        WHERE IncomeId = @IncomeId AND UserID = @UserID;

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 0 AS Success, 'No matching income record found.' AS Message;
            RETURN;
        END

        SELECT 1 AS Success, 'Income deleted successfully.' AS Message;
    END TRY
    BEGIN CATCH
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;


GO
/****** Object:  StoredProcedure [dbo].[spmb_DeleteTransaction]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Delete transaction by ID
CREATE   PROCEDURE [dbo].[spmb_DeleteTransaction]
    @TransactionId UNIQUEIDENTIFIER,
    @UserID        UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        DELETE FROM dbo.Transactions
        WHERE TransactionId = @TransactionId AND UserID = @UserID;

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 0 AS Success, 'No matching transaction found.' AS Message;
            RETURN;
        END

        SELECT 1 AS Success, 'Transaction deleted successfully.' AS Message;
    END TRY
    BEGIN CATCH
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;


GO
/****** Object:  StoredProcedure [dbo].[spmb_DeleteUser]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Delete user
CREATE   PROCEDURE [dbo].[spmb_DeleteUser]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        DELETE FROM dbo.Users WHERE UserId = @UserId;

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 0 AS Success, 'User not found.' AS Message;
            RETURN;
        END

        SELECT 1 AS Success, 'User deleted successfully.' AS Message;
    END TRY
    BEGIN CATCH
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;

GO
/****** Object:  StoredProcedure [dbo].[spmb_GetBudgetComparison]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get budget vs actual comparison for a user within a date range
CREATE   PROCEDURE [dbo].[spmb_GetBudgetComparison]
    @UserID UNIQUEIDENTIFIER,
    @StartDate DATE,
    @EndDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Get budgeted amounts by category
    WITH BudgetedAmounts AS (
        SELECT 
            B.CategoryName,
            SUM(B.Amount) AS BudgetedAmount
        FROM Budgets B
        WHERE B.UserID = @UserID
            AND B.PeriodStart <= @EndDate
            AND B.PeriodEnd >= @StartDate
        GROUP BY B.CategoryName
    ),
    -- Get actual spending by category
    ActualAmounts AS (
        SELECT 
            T.Category AS CategoryName,
            SUM(T.Amount) AS ActualAmount,
            COUNT(*) AS TransactionCount
        FROM Transactions T
        WHERE T.UserId = @UserID
            AND T.Date >= @StartDate
            AND T.Date <= @EndDate
            AND T.Amount IS NOT NULL
        GROUP BY T.Category
    )
    -- Combine budgeted and actual amounts
    SELECT 
        COALESCE(B.CategoryName, A.CategoryName) AS Category,
        ISNULL(B.BudgetedAmount, 0) AS BudgetedAmount,
        ISNULL(A.ActualAmount, 0) AS ActualAmount,
        ISNULL(A.TransactionCount, 0) AS TransactionCount,
        CASE 
            WHEN B.BudgetedAmount IS NULL THEN NULL
            WHEN B.BudgetedAmount = 0 THEN 0
            ELSE (ISNULL(A.ActualAmount, 0) / B.BudgetedAmount) * 100
        END AS PercentageUsed,
        ISNULL(A.ActualAmount, 0) - ISNULL(B.BudgetedAmount, 0) AS Difference
    FROM BudgetedAmounts B
    FULL OUTER JOIN ActualAmounts A ON B.CategoryName = A.CategoryName
    WHERE B.CategoryName IS NOT NULL OR A.CategoryName IS NOT NULL
    ORDER BY Difference DESC, ActualAmount DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetCategoriesInGrouping]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 7. Get Categories in Grouping
CREATE   PROCEDURE [dbo].[spmb_GetCategoriesInGrouping]
    @GroupingID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CategoryID,
        c.GroupingID,
        c.UserID,
        c.Username,
        c.CategoryName,
        c.DisplayOrder,
        c.Color,
        c.Icon,
        c.IsActive,
        c.CreationTime,
        c.LastEdit
    FROM Categories c
    WHERE c.GroupingID = @GroupingID
        AND c.UserID = @UserID
        AND c.IsActive = 1
    ORDER BY c.DisplayOrder, c.CategoryName;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetCategoryWindows]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get all category windows for a user
CREATE   PROCEDURE [dbo].[spmb_GetCategoryWindows]
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        WindowID,
        CategoryName,
        DisplayName,
        Description,
        ColorTheme,
        PositionX,
        PositionY,
        Width,
        Height,
        IsMinimized,
        ZIndex,
        IsActive,
        CreationTime,
        LastEdit
    FROM CategoryWindows
    WHERE UserID = @UserID AND IsActive = 1
    ORDER BY ZIndex DESC, CreationTime ASC;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetDashboardStats]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_GetDashboardStats]
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
        Category AS CategoryName,
        ISNULL(SUM(Amount), 0) AS totalAmount,
        COUNT(*) AS transactionCount
    FROM Transactions 
    WHERE UserId = @UserId 
        AND CAST(CreationTime AS DATE) BETWEEN @StartDate AND @EndDate
    GROUP BY Category
    ORDER BY totalAmount DESC;
    
    -- Result Set 3: Recent Transactions (last 5)
    SELECT TOP 5
        TransactionId,
        Username,
        Category AS CategoryName,
        Name,
        Amount,
        Date,
        CreationTime
    FROM Transactions
    WHERE UserId = @UserId
    ORDER BY CreationTime DESC;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetIncomeById]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get a single income record
CREATE   PROCEDURE [dbo].[spmb_GetIncomeById]
    @IncomeID UNIQUEIDENTIFIER,
	@UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        Username,
        Description,
        Net,
        Gross,
        Tithe,
        TitheStatus,
        Date AS [RecordedDate],
        PaycheckStatus,
        CreationTime,
        IncomeId
    FROM dbo.Income
    WHERE IncomeId = @IncomeId
	AND UserID = @UserID;
END;

GO
/****** Object:  StoredProcedure [dbo].[spmb_GetIncomeByUserIDAndDate]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_GetIncomeByUserIDAndDate]
    @UserId UNIQUEIDENTIFIER,
	@StartDate DATETIME = NULL,
	@EndDate DATETIME = NULL,
    @Offset INT = 0,
    @Limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    -- If no date range specified, return ALL income (don't default to current month)
    IF @StartDate IS NULL OR @EndDate IS NULL
    BEGIN
        SELECT
            IncomeId,
            Username,
            Description,
            Net,
            Gross,
            Tithe,
            TitheStatus,
            Date,
            PaycheckStatus,
            CreationTime,
            UserID
        FROM
            dbo.Income
        WHERE
            UserID = @UserID
        ORDER BY
            CreationTime DESC
        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY;
    END
    ELSE
    BEGIN
        SELECT
            IncomeId,
            Username,
            Description,
            Net,
            Gross,
            Tithe,
            TitheStatus,
            Date,
            PaycheckStatus,
            CreationTime,
            UserID
        FROM
            dbo.Income
        WHERE
            UserID = @UserID
            AND Date BETWEEN @StartDate AND @EndDate
        ORDER BY
            CreationTime DESC
        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY;
    END
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetIncomeCount]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get total count of income records for pagination
CREATE   PROCEDURE [dbo].[spmb_GetIncomeCount]
    @UserId UNIQUEIDENTIFIER,
    @StartDate DATETIME = NULL,
    @EndDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @StartDate IS NULL OR @EndDate IS NULL
        SELECT COUNT(*) AS TotalCount FROM Income WHERE UserID = @UserId;
    ELSE
        SELECT COUNT(*) AS TotalCount FROM Income 
        WHERE UserID = @UserId AND Date BETWEEN @StartDate AND @EndDate;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetIncomeSummaryByMonth]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get monthly income and expense summary for a user
CREATE   PROCEDURE [dbo].[spmb_GetIncomeSummaryByMonth]
    @UserID UNIQUEIDENTIFIER,
    @MonthsBack INT = 6
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @StartDate DATE = DATEADD(MONTH, -@MonthsBack, GETDATE());
    DECLARE @EndDate DATE = GETDATE();

    -- Generate month series
    WITH MonthSeries AS (
        SELECT TOP (@MonthsBack)
            DATEADD(MONTH, -ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) + 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)) AS MonthStart
        FROM sys.all_objects
    ),
    MonthDates AS (
        SELECT 
            MonthStart,
            EOMONTH(MonthStart) AS MonthEnd,
            YEAR(MonthStart) AS Year,
            MONTH(MonthStart) AS Month
        FROM MonthSeries
    ),
    -- Get income by month
    MonthlyIncome AS (
        SELECT 
            YEAR(CAST(I.Date AS DATE)) AS Year,
            MONTH(CAST(I.Date AS DATE)) AS Month,
            SUM(ISNULL(I.Net, 0)) AS TotalIncome
        FROM Income I
        WHERE I.UserId = @UserID
            AND TRY_CAST(I.Date AS DATE) IS NOT NULL
            AND TRY_CAST(I.Date AS DATE) >= @StartDate
            AND TRY_CAST(I.Date AS DATE) <= @EndDate
        GROUP BY YEAR(CAST(I.Date AS DATE)), MONTH(CAST(I.Date AS DATE))
    ),
    -- Get expenses by month
    MonthlyExpenses AS (
        SELECT 
            YEAR(T.Date) AS Year,
            MONTH(T.Date) AS Month,
            SUM(ISNULL(T.Amount, 0)) AS TotalExpenses,
            COUNT(*) AS TransactionCount
        FROM Transactions T
        WHERE T.UserId = @UserID
            AND T.Date >= @StartDate
            AND T.Date <= @EndDate
            AND T.Amount IS NOT NULL
        GROUP BY YEAR(T.Date), MONTH(T.Date)
    )
    -- Combine income and expenses by month
    SELECT 
        M.MonthStart AS Month,
        M.Year,
        M.Month AS MonthNumber,
        ISNULL(I.TotalIncome, 0) AS Income,
        ISNULL(E.TotalExpenses, 0) AS Expenses,
        ISNULL(I.TotalIncome, 0) - ISNULL(E.TotalExpenses, 0) AS NetSavings,
        CASE 
            WHEN ISNULL(I.TotalIncome, 0) = 0 THEN 0
            ELSE ((ISNULL(I.TotalIncome, 0) - ISNULL(E.TotalExpenses, 0)) / I.TotalIncome) * 100
        END AS SavingsRate,
        ISNULL(E.TransactionCount, 0) AS TransactionCount
    FROM MonthDates M
    LEFT JOIN MonthlyIncome I ON M.Year = I.Year AND M.Month = I.Month
    LEFT JOIN MonthlyExpenses E ON M.Year = E.Year AND M.Month = E.Month
    ORDER BY M.MonthStart ASC;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetTablesForUser]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE   PROCEDURE [dbo].[spmb_GetTablesForUser]
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT Category
    FROM Transactions
    WHERE UserID = @UserID
    ORDER BY Category;
END;






GO
/****** Object:  StoredProcedure [dbo].[spmb_GetTransactionById]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get a single transaction
CREATE   PROCEDURE [dbo].[spmb_GetTransactionById]
    @TransactionId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        Username,
        Name,
        Amount,
        Due,
        Date AS [RecordedDate],
        Notes,
        Category,
        Status,
        CreationTime,
        TransactionId
    FROM dbo.Transactions
    WHERE TransactionId = @TransactionId;
END;

GO
/****** Object:  StoredProcedure [dbo].[spmb_GetTransactionCount]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get total count of transactions for pagination
CREATE   PROCEDURE [dbo].[spmb_GetTransactionCount]
    @UserId UNIQUEIDENTIFIER,
    @CategoryName NVARCHAR(150) = NULL,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) AS TotalCount
    FROM Transactions
    WHERE UserID = @UserId
        AND (@CategoryName IS NULL OR Category = @CategoryName)
        AND (@StartDate IS NULL OR CAST(Date AS DATE) >= @StartDate)
        AND (@EndDate IS NULL OR CAST(Date AS DATE) <= @EndDate);
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetTransactionsByUserID]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Create updated procedure with date parameters and pagination
CREATE   PROCEDURE [dbo].[spmb_GetTransactionsByUserID]
    @UserId UNIQUEIDENTIFIER,
    @CategoryName NVARCHAR(150) = NULL,
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @Offset INT = 0,
    @Limit INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        TransactionId,
        UserID,
        Username,
        Name,
        Amount,
        Date,
        CreationTime,
        LastEdit,
        Notes,
        Category,
        Status,
        GroupingID
    FROM Transactions
    WHERE UserID = @UserId
        -- Filter by Name if provided
        AND (@CategoryName IS NULL OR Category = @CategoryName)
        -- Filter by date range if provided
        AND (@StartDate IS NULL OR CAST(Date AS DATE) >= @StartDate)
        AND (@EndDate IS NULL OR CAST(Date AS DATE) <= @EndDate)
    ORDER BY Date DESC, CreationTime DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetUserById]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get by UserId
CREATE   PROCEDURE [dbo].[spmb_GetUserById]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        Username,
        Pass,
        Email,
        Name,
        Validated,
        ValidationCode,
        CreationTime,
        UserId
    FROM dbo.Users
    WHERE UserId = @UserId;
END;

GO
/****** Object:  StoredProcedure [dbo].[spmb_GetUserCategories]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 6. Get User Categories
CREATE   PROCEDURE [dbo].[spmb_GetUserCategories]
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CategoryID,
        c.GroupingID,
        c.UserID,
        c.Username,
        c.CategoryName,
        c.DisplayOrder,
        c.Color,
        c.Icon,
        c.IsActive,
        c.CreationTime,
        c.LastEdit,
        g.GroupingName
    FROM Categories c
    INNER JOIN Groupings g ON c.GroupingID = g.GroupingID
    WHERE c.UserID = @UserID AND c.IsActive = 1 AND g.IsActive = 1
    ORDER BY g.DisplayOrder, c.DisplayOrder, c.CategoryName;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetUserGroupings]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 1. Get User Groupings
CREATE   PROCEDURE [dbo].[spmb_GetUserGroupings]
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        GroupingID,
        UserID,
        Username,
        GroupingName,
        DisplayOrder,
        Color,
        Icon,
        IsActive,
        CreationTime,
        LastEdit
    FROM Groupings
    WHERE UserID = @UserID AND IsActive = 1
    ORDER BY DisplayOrder, GroupingName;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetUserPreferences]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_GetUserPreferences]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- If preferences don't exist, create default record
    IF NOT EXISTS (SELECT 1 FROM UserPreferences WHERE UserId = @UserId)
    BEGIN
        INSERT INTO UserPreferences (UserId, Username)
        SELECT UserId, Username FROM Users WHERE UserId = @UserId;
    END

    -- Return user preferences
    SELECT
        PreferenceId,
        UserId,
        Username,
        LastExpenseCategory,
        LastIncomeTemplate,
        CustomTithePercentage,
        MerchantDefaults,
        Theme,
        DefaultCurrency,
        CreationTime,
        LastEdit
    FROM UserPreferences
    WHERE UserId = @UserId;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetUserStatsWithCategories]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE   PROCEDURE [dbo].[spmb_GetUserStatsWithCategories]
    @UserId UNIQUEIDENTIFIER,
    @StartDate DATE,
    @EndDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TotalIncome DECIMAL(18,2) = (
        SELECT ISNULL(SUM(Net), 0)
        FROM Income
        WHERE UserID = @UserId
          AND Date BETWEEN @StartDate AND @EndDate
    );

    DECLARE @TotalExpenses DECIMAL(18,2) = (
        SELECT ISNULL(SUM(Amount), 0)
        FROM Transactions
        WHERE UserID = @UserId
          AND Date BETWEEN @StartDate AND @EndDate
    );

    DECLARE @SavingsRate DECIMAL(5,2) =
        CASE
            WHEN @TotalIncome = 0 THEN 0
            ELSE ROUND((@TotalIncome - @TotalExpenses) / NULLIF(@TotalIncome, 0) * 100, 2)
        END;

    DECLARE @Balance DECIMAL(18,2) = @TotalIncome - @TotalExpenses;

    SELECT
        @TotalIncome AS TotalIncome,
        @TotalExpenses AS TotalExpenses,
        @SavingsRate AS SavingsRate,
        @Balance AS Balance,
        (
            SELECT
                Category AS CategoryName,
                ISNULL(SUM(Amount), 0) AS TotalExpenses
            FROM Transactions
            WHERE UserID = @UserID
              AND Date BETWEEN @StartDate AND @EndDate
            GROUP BY Category
            FOR JSON PATH
        ) AS ExpenseBreakdown
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_GetValidationInfo]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get validation code and CreationTime (acting as TransID)
CREATE   PROCEDURE [dbo].[spmb_GetValidationInfo]
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SELECT ValidationCode, CreationTime
    FROM dbo.Users
    WHERE UserID = @UserID;
END;

GO
/****** Object:  StoredProcedure [dbo].[spmb_GetWindowTransactions]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get transactions for a specific category window
CREATE   PROCEDURE [dbo].[spmb_GetWindowTransactions]
    @UserID UNIQUEIDENTIFIER,
    @CategoryName VARCHAR(150),
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @Limit INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (ISNULL(@Limit, 1000))
        TransactionId,
        Name,
        Amount,
        Date,
        Due,
        Notes,
        Category,
        Status,
        CreationTime
    FROM Transactions
    WHERE UserID = @UserID 
        AND Category = @CategoryName
        AND (@StartDate IS NULL OR Date >= @StartDate)
        AND (@EndDate IS NULL OR Date <= @EndDate)
    ORDER BY Date DESC, CreationTime DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_GrantExecToSprbProcs]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE   PROCEDURE [dbo].[spmb_GrantExecToSprbProcs]
    @LoginName SYSNAME
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ProcName SYSNAME;
    DECLARE @Sql NVARCHAR(MAX);

    DECLARE cur CURSOR FOR
        SELECT name
        FROM sys.procedures
        WHERE schema_id = SCHEMA_ID('dbo')
          AND name LIKE 'sprb%';

    OPEN cur;
    FETCH NEXT FROM cur INTO @ProcName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @Sql = 'GRANT EXECUTE ON dbo.[' + @ProcName + '] TO [' + @LoginName + '];';
        EXEC sp_executesql @Sql;

        FETCH NEXT FROM cur INTO @ProcName;
    END

    CLOSE cur;
    DEALLOCATE cur;
END;

GO
/****** Object:  StoredProcedure [dbo].[spmb_InitializeDefaultGroupings]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 5. Initialize Default Groupings (for new users)
CREATE   PROCEDURE [dbo].[spmb_InitializeDefaultGroupings]
    @UserID UNIQUEIDENTIFIER,
    @Username VARCHAR(17)
AS
BEGIN
    SET NOCOUNT ON;

    -- Create 3 default groupings
    INSERT INTO Groupings (UserID, Username, GroupingName, DisplayOrder, Color, Icon)
    VALUES
        (@UserID, @Username, 'Expenses', 1, '#95E1D3', '🛒'),
        (@UserID, @Username, 'Subscriptions', 2, '#FFDEE9', '📺'),
        (@UserID, @Username, 'Rent/Utilities', 3, '#A8E6CF', '🏠');

    SELECT @@ROWCOUNT AS GroupingsCreated;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_InsertIncome]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Insert new income
CREATE   PROCEDURE [dbo].[spmb_InsertIncome]
    @Username       VARCHAR(17),
	@UserID			UNIQUEIDENTIFIER,
    @Description    VARCHAR(45) = NULL,
    @Net            FLOAT       = NULL,
    @Gross          FLOAT       = NULL,
    @Tithe          FLOAT       = NULL,
    @TitheStatus    VARCHAR(45) = NULL,
    @Date           VARCHAR(45) = NULL,
    @PaycheckStatus VARCHAR(45) = NULL
AS
BEGIN
    SET NOCOUNT ON;

	DECLARE @NewId UNIQUEIDENTIFIER = NEWID();

    INSERT INTO dbo.Income
        (Username, Description, Net, Gross, Tithe, TitheStatus, Date, PaycheckStatus, CreationTime, IncomeID, UserID)
    VALUES
        (@Username, @Description, @Net, @Gross, @Tithe, @TitheStatus, @Date, @PaycheckStatus, GetDate(), @NewID, @UserID);

    -- Return new IncomeId
	
    SELECT @NewID as NewIncomeID
END;

GO
/****** Object:  StoredProcedure [dbo].[spmb_InsertTransaction]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_InsertTransaction]
    @UserID UNIQUEIDENTIFIER,
    @Username VARCHAR(17),
    @Name VARCHAR(150) = NULL,
    @Amount FLOAT = NULL,
    @Due DATETIME = NULL,
    @Date DATETIME = NULL,
    @Notes VARCHAR(60) = NULL,
    @Category VARCHAR(50) = NULL,
    @Status VARCHAR(20) = NULL,
    @GroupingID UNIQUEIDENTIFIER = NULL,
    @CategoryID UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NewTransactionId UNIQUEIDENTIFIER = NEWID();

    INSERT INTO Transactions (
        TransactionId, UserID, Username, Name,
        Amount, Due, Date, Notes, Category, Status,
        GroupingID, CategoryID
    )
    VALUES (
        @NewTransactionId, @UserID, @Username, @Name,
        @Amount, @Due, @Date, @Notes, @Category, @Status,
        @GroupingID, @CategoryID
    );

    SELECT @NewTransactionId AS NewTransactionId;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_InsertUser]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Register new user
CREATE   PROCEDURE [dbo].[spmb_InsertUser]
    @Username       VARCHAR(17),
    @Pass           VARCHAR(255),
    @Email          VARCHAR(45),
    @Name           VARCHAR(25)  = NULL
AS
BEGIN
    SET NOCOUNT ON;

	Declare 
			@DoesUserExist	INT = 0,
			@Success		INT = 0,
			@DoesEmailExist INT = 0,
			@Message		VARCHAR(MAX),
			@NewUserId		UNIQUEIDENTIFIER,
			@NewValidationCode UNIQUEIDENTIFIER
	   
	SET @DoesUserExist = (
		SELECT COUNT(*) FROM dbo.Users WHERE Username = @Username
	);
	SET @DoesEmailExist = (
		SELECT COUNT(*) FROM dbo.Users WHERE Email = @Email
	);

	-- Abort if user or email exists
    IF @DoesUserExist > 0
    BEGIN
        SELECT 0 AS Success, 'Username already exists.' AS Message, NULL AS UserId;
        RETURN;
    END

    IF @DoesEmailExist > 0
    BEGIN
        SELECT 0 AS Success, 'Email already registered.' AS Message, NULL AS UserId;
        RETURN;
    END

	SET @NewUserId = NEWID();
	SET @NewValidationCode = NEWID();

	BEGIN TRY
		INSERT INTO dbo.Users
			(Username, Pass, Email, Name, Validated, ValidationCode, ValidationExpires, CreationTime, UserID)
		VALUES
			(@Username, @Pass, @Email, @Name, 0, @NewValidationCode, DATEADD(MINUTE, 15, GETDATE()), GETDATE(), @NewUserId);
	END TRY
	BEGIN CATCH
	    SELECT 0 AS Success, 
           ERROR_MESSAGE() AS Message, 
           NULL AS UserId, 
           NULL AS ValidationCode;
		RETURN;
	END CATCH
    -- Optionally return the new UserId
    SELECT 1 AS Success, 
	'User created successfully.' AS Message, 
	@NewUserId AS UserId,
	@NewValidationCode as ValidationCode;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_LoginUserWithEmail]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_LoginUserWithEmail]
	@Email varchar(50),
    @Password VARCHAR(255)
AS
BEGIN
	
	SET NOCOUNT ON;

	DECLARE 
    @UserId UNIQUEIDENTIFIER,
    @Validated INT;

    SELECT 
        @UserId = UserId,
        @Validated = Validated
    FROM dbo.Users
    WHERE Email = @Email AND Pass = @Password;

	IF @UserId IS NULL
    BEGIN
        SELECT 
            0 AS Success,
            'Invalid username or password.' AS Message,
            NULL AS UserId,
            NULL AS Username,
            NULL AS Name,
            NULL AS Email;
        RETURN;
    END

	IF ISNULL(@Validated, 0) = 0
    BEGIN
        SELECT 
            0 AS Success,
            'User has not been validated.' AS Message,
            NULL AS UserId,
            NULL AS Username,
            NULL AS Name,
            NULL AS Email;
        RETURN;
    END

    SELECT 
        CAST(1 AS BIT) AS Success,
        'Login successful.' AS Message,
        UserId,
        Username,
        Name,
        Email
    FROM dbo.Users
    WHERE UserId = @UserId;
END;

GO
/****** Object:  StoredProcedure [dbo].[spmb_LoginUserWithUsername]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_LoginUserWithUsername]
    @Username VARCHAR(17),
    @Password VARCHAR(255)
AS
BEGIN
	
	SET NOCOUNT ON;

	DECLARE 
    @UserId UNIQUEIDENTIFIER,
    @Validated INT;

    SELECT 
        @UserId = UserId,
        @Validated = Validated
    FROM dbo.Users
    WHERE Username = @Username AND Pass = @Password;

	IF @UserId IS NULL
    BEGIN
        SELECT 
            0 AS Success,
            'Invalid username or password.' AS Message,
            NULL AS UserId,
            NULL AS Username,
            NULL AS Name,
            NULL AS Email;
        RETURN;
    END

	IF ISNULL(@Validated, 0) = 0
    BEGIN
        SELECT 
            0 AS Success,
            'User has not been validated.' AS Message,
            NULL AS UserId,
            NULL AS Username,
            NULL AS Name,
            NULL AS Email;
        RETURN;
    END

    SELECT 
        1 AS Success,
        'Login successful.' AS Message,
        UserId,
        Username,
        Name,
        Email
    FROM dbo.Users
    WHERE UserId = @UserId;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_RegisterUser]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Register new user
CREATE   PROCEDURE [dbo].[spmb_RegisterUser]
    @UsernameOrEmail VARCHAR(50),
    @Pass            VARCHAR(255),
    @ValidationCode  UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE 
        @UserId		UNIQUEIDENTIFIER,
        @Validated	INT,
		@ExpireDate		DATETIME;

    -- Try to find the user by username or email
    SELECT 
        @UserId		= UserId,
        @Validated	= Validated,
		@ExpireDate		= ValidationExpires
    FROM dbo.Users
    WHERE (Username = @UsernameOrEmail OR Email = @UsernameOrEmail)
      AND Pass = @Pass
      AND ValidationCode = @ValidationCode;

    IF @UserId IS NULL
    BEGIN
        SELECT 
            0 AS Success,
            'Invalid registration credentials or code.' AS Message;
        RETURN;
    END

    IF ISNULL(@Validated, 0) = 1
    BEGIN
        SELECT 
            0 AS Success,
            'User is already validated.' AS Message;
        RETURN;
    END
		
    IF @ExpireDate IS NOT NULL AND @ExpireDate < GETDATE()
    BEGIN
        SELECT 
            0 AS Success,
            'Validation code has expired.' AS Message;
        RETURN;
    END

    -- Validate the user
    UPDATE dbo.Users
    SET Validated = 1
    WHERE UserId = @UserId;

    SELECT 
        1 AS Success,
        'User validated successfully.' AS Message;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_ResetUserPreferences]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_ResetUserPreferences]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM UserPreferences WHERE UserId = @UserId;

    -- Create fresh default preferences
    INSERT INTO UserPreferences (UserId, Username)
    SELECT UserId, Username FROM Users WHERE UserId = @UserId;

    -- Return new preferences
    EXEC spmb_GetUserPreferences @UserId;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateCategory]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 9. Update Category
CREATE   PROCEDURE [dbo].[spmb_UpdateCategory]
    @CategoryID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER,
    @CategoryName NVARCHAR(50) = NULL,
    @GroupingID UNIQUEIDENTIFIER = NULL,
    @DisplayOrder INT = NULL,
    @Color VARCHAR(20) = NULL,
    @Icon VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Categories
    SET
        CategoryName = COALESCE(@CategoryName, CategoryName),
        GroupingID = COALESCE(@GroupingID, GroupingID),
        DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
        Color = COALESCE(@Color, Color),
        Icon = COALESCE(@Icon, Icon),
        LastEdit = GETDATE()
    WHERE CategoryID = @CategoryID AND UserID = @UserID;

    SELECT
        CategoryID,
        GroupingID,
        UserID,
        Username,
        CategoryName,
        DisplayOrder,
        Color,
        Icon,
        IsActive,
        CreationTime,
        LastEdit
    FROM Categories
    WHERE CategoryID = @CategoryID;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateCategoryWindow]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Update category window position and properties
CREATE   PROCEDURE [dbo].[spmb_UpdateCategoryWindow]
    @WindowID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER,
    @DisplayName VARCHAR(100) = NULL,
    @Description VARCHAR(255) = NULL,
    @ColorTheme VARCHAR(20) = NULL,
    @PositionX INT = NULL,
    @PositionY INT = NULL,
    @Width INT = NULL,
    @Height INT = NULL,
    @IsMinimized BIT = NULL,
    @ZIndex INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if window exists and belongs to user
    IF NOT EXISTS (SELECT 1 FROM CategoryWindows WHERE WindowID = @WindowID AND UserID = @UserID)
    BEGIN
        SELECT 
            CAST(0 AS BIT) AS Success,
            'Category window not found or access denied.' AS Message;
        RETURN;
    END
    
    UPDATE CategoryWindows
    SET 
        DisplayName = ISNULL(@DisplayName, DisplayName),
        Description = ISNULL(@Description, Description),
        ColorTheme = ISNULL(@ColorTheme, ColorTheme),
        PositionX = ISNULL(@PositionX, PositionX),
        PositionY = ISNULL(@PositionY, PositionY),
        Width = ISNULL(@Width, Width),
        Height = ISNULL(@Height, Height),
        IsMinimized = ISNULL(@IsMinimized, IsMinimized),
        ZIndex = ISNULL(@ZIndex, ZIndex),
        LastEdit = GETDATE()
    WHERE WindowID = @WindowID;
    
    SELECT 
        CAST(1 AS BIT) AS Success,
        'Category window updated successfully.' AS Message;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateGrouping]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


-- 3. Update Grouping
CREATE   PROCEDURE [dbo].[spmb_UpdateGrouping]
    @GroupingID UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER,
    @GroupingName NVARCHAR(50) = NULL,
    @DisplayOrder INT = NULL,
    @Color VARCHAR(20) = NULL,
    @Icon NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Groupings
    SET
        GroupingName = COALESCE(@GroupingName, GroupingName),
        DisplayOrder = COALESCE(@DisplayOrder, DisplayOrder),
        Color = COALESCE(@Color, Color),
        Icon = COALESCE(@Icon, Icon),
        LastEdit = GETDATE()
    WHERE GroupingID = @GroupingID AND UserID = @UserID;

    SELECT
        GroupingID,
        UserID,
        Username,
        GroupingName,
        DisplayOrder,
        Color,
        Icon,
        IsActive,
        CreationTime,
        LastEdit
    FROM Groupings
    WHERE GroupingID = @GroupingID;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateIncome]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE   PROCEDURE [dbo].[spmb_UpdateIncome]
    @IncomeId UNIQUEIDENTIFIER,
    @UserID UNIQUEIDENTIFIER,
    @Description VARCHAR(45) = NULL,
    @Net FLOAT = NULL,
    @Gross FLOAT = NULL,
    @Tithe FLOAT = NULL,
    @TitheStatus VARCHAR(45) = NULL,
    @Date VARCHAR(45) = NULL,
    @PaycheckStatus VARCHAR(45) = NULL,
    @Notes VARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Income WHERE IncomeId = @IncomeId AND UserId = @UserID)
    BEGIN
        SELECT 0 AS Success, 'Income record not found or access denied.' AS Message;
        RETURN;
    END

    UPDATE Income
    SET 
        Description = ISNULL(@Description, Description),
        Net = ISNULL(@Net, Net),
        Gross = ISNULL(@Gross, Gross),
        Tithe = ISNULL(@Tithe, Tithe),
        TitheStatus = ISNULL(@TitheStatus, TitheStatus),
        Date = ISNULL(@Date, Date),
        PaycheckStatus = ISNULL(@PaycheckStatus, PaycheckStatus),
        Notes = ISNULL(@Notes, Notes),
        LastEdit = GETDATE()
    WHERE IncomeId = @IncomeId;

    SELECT 1 AS Success, 'Income record updated successfully.' AS Message;
END;






GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateLastExpenseCategory]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_UpdateLastExpenseCategory]
    @UserId UNIQUEIDENTIFIER,
    @CategoryName VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    EXEC spmb_UpdateUserPreferences
        @UserId = @UserId,
        @LastExpenseCategory = @CategoryName;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateLastIncomeTemplate]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_UpdateLastIncomeTemplate]
    @UserId UNIQUEIDENTIFIER,
    @TemplateJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    EXEC spmb_UpdateUserPreferences
        @UserId = @UserId,
        @LastIncomeTemplate = @TemplateJson;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateMerchantDefaults]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_UpdateMerchantDefaults]
    @UserId UNIQUEIDENTIFIER,
    @MerchantDefaultsJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    EXEC spmb_UpdateUserPreferences
        @UserId = @UserId,
        @MerchantDefaults = @MerchantDefaultsJson;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateTransaction]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_UpdateTransaction]
    @TransactionId UNIQUEIDENTIFIER,
    @Name VARCHAR(150) = NULL,
    @Amount FLOAT = NULL,
    @Due DATETIME = NULL,
    @Date DATETIME = NULL,
    @Notes VARCHAR(60) = NULL,
    @Category VARCHAR(20) = NULL,
    @Status VARCHAR(20) = NULL,
    @UserID UNIQUEIDENTIFIER,
    @GroupingID UNIQUEIDENTIFIER = NULL,  -- NEW
    @CategoryID UNIQUEIDENTIFIER = NULL   -- NEW
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Transactions
    SET
        Name = COALESCE(@Name, Name),
        Amount = COALESCE(@Amount, Amount),
        Due = COALESCE(@Due, Due),
        Date = COALESCE(@Date, Date),
        Notes = COALESCE(@Notes, Notes),
        Category = COALESCE(@Category, Category),
        Status = COALESCE(@Status, Status),
        GroupingID = COALESCE(@GroupingID, GroupingID),  -- NEW
        CategoryID = COALESCE(@CategoryID, CategoryID),  -- NEW
        LastEdit = GETDATE()
    WHERE TransactionId = @TransactionId
        AND UserID = @UserID;

    IF @@ROWCOUNT = 0
    BEGIN
        SELECT CAST(0 AS BIT) AS Success, 'Transaction not found or unauthorized' AS Message;
        RETURN;
    END

    SELECT CAST(1 AS BIT) AS Success, 'Transaction updated successfully' AS Message;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateUser]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Update existing user
CREATE   PROCEDURE [dbo].[spmb_UpdateUser]
    @UserId         UNIQUEIDENTIFIER,
    @Pass           VARCHAR(255)  = NULL,
    @Email          VARCHAR(45)  = NULL,
    @Name           VARCHAR(25)  = NULL,
    @Validated      TINYINT      = NULL,
    @ValidationCode UNIQUEIDENTIFIER = NULL  -- Updated to match rest of schema
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        UPDATE dbo.Users
        SET
            Pass           = COALESCE(@Pass, Pass),
            Email          = COALESCE(@Email, Email),
            Name           = COALESCE(@Name, Name),
            Validated      = COALESCE(@Validated, Validated),
            ValidationCode = COALESCE(@ValidationCode, ValidationCode),
            LastEdit       = GETDATE()
        WHERE UserId = @UserId;

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 0 AS Success, 'User not found or no changes made.' AS Message;
            RETURN;
        END

        SELECT 1 AS Success, 'User updated successfully.' AS Message;
    END TRY
    BEGIN CATCH
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;


GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateUserPassword]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Update user password and validated status
CREATE   PROCEDURE [dbo].[spmb_UpdateUserPassword]
    @UserID        UNIQUEIDENTIFIER,
    @NewPassword   VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        UPDATE dbo.Users
        SET 
            Pass = @NewPassword,
            Validated = 1,
            LastEdit = GETDATE()
        WHERE UserID = @UserID;

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 0 AS Success, 'User not found or password not updated.' AS Message;
            RETURN;
        END

        SELECT 1 AS Success, 'Password updated successfully.' AS Message;
    END TRY
    BEGIN CATCH
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateUserPreferences]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_UpdateUserPreferences]
    @UserId UNIQUEIDENTIFIER,
    @LastExpenseCategory VARCHAR(50) = NULL,
    @LastIncomeTemplate NVARCHAR(MAX) = NULL,
    @CustomTithePercentage FLOAT = NULL,
    @MerchantDefaults NVARCHAR(MAX) = NULL,
    @Theme VARCHAR(20) = NULL,
    @DefaultCurrency VARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Ensure preferences record exists
    IF NOT EXISTS (SELECT 1 FROM UserPreferences WHERE UserId = @UserId)
    BEGIN
        INSERT INTO UserPreferences (UserId, Username)
        SELECT UserId, Username FROM Users WHERE UserId = @UserId;
    END

    -- Update only non-null fields
    UPDATE UserPreferences
    SET
        LastExpenseCategory = ISNULL(@LastExpenseCategory, LastExpenseCategory),
        LastIncomeTemplate = ISNULL(@LastIncomeTemplate, LastIncomeTemplate),
        CustomTithePercentage = ISNULL(@CustomTithePercentage, CustomTithePercentage),
        MerchantDefaults = ISNULL(@MerchantDefaults, MerchantDefaults),
        Theme = ISNULL(@Theme, Theme),
        DefaultCurrency = ISNULL(@DefaultCurrency, DefaultCurrency),
        LastEdit = GETDATE()
    WHERE UserId = @UserId;

    -- Return updated preferences
    EXEC spmb_GetUserPreferences @UserId;
END
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateValidationCode]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Update validation code and reset validated flag
CREATE   PROCEDURE [dbo].[spmb_UpdateValidationCode]
    @UsernameOrEmail VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @NewCode UNIQUEIDENTIFIER = NEWID();

    UPDATE dbo.Users
    SET 
        ValidationCode     = @NewCode,
        Validated          = 0,
        ValidationExpires  = DATEADD(MINUTE, 10, GETDATE()),
        LastEdit           = GETDATE()
    WHERE Username = @UsernameOrEmail OR Email = @UsernameOrEmail;

    IF @@ROWCOUNT = 0
    BEGIN
        SELECT 
            CAST(0 AS INT) AS Success, 
            CAST('Username or email not found.' AS VARCHAR(100)) AS Message;
        RETURN;
    END

    SELECT 
        CAST(1 AS INT) AS Success, 
        CAST('Validation code updated successfully.' AS VARCHAR(100)) AS Message, 
        @NewCode AS ValidationCode;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_UpdateWindowPositions]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Bulk update window positions (for drag operations)
CREATE   PROCEDURE [dbo].[spmb_UpdateWindowPositions]
    @UserID UNIQUEIDENTIFIER,
    @WindowUpdates NVARCHAR(MAX) -- JSON array of window updates
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Parse JSON and update multiple windows at once
    UPDATE cw
    SET 
        PositionX = CAST(JSON_VALUE(wu.value, '$.positionX') AS INT),
        PositionY = CAST(JSON_VALUE(wu.value, '$.positionY') AS INT),
        ZIndex = CAST(JSON_VALUE(wu.value, '$.zIndex') AS INT),
        LastEdit = GETDATE()
    FROM CategoryWindows cw
    CROSS APPLY OPENJSON(@WindowUpdates) wu
    WHERE cw.WindowID = CAST(JSON_VALUE(wu.value, '$.windowId') AS UNIQUEIDENTIFIER)
        AND cw.UserID = @UserID;
    
    SELECT 
        CAST(1 AS BIT) AS Success,
        'Window positions updated successfully.' AS Message;
END;
GO
/****** Object:  StoredProcedure [dbo].[spmb_VerifyEmailWithCode]    Script Date: 12/7/2025 7:00:25 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[spmb_VerifyEmailWithCode]
    @Email VARCHAR(45),
    @ValidationCode UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE 
        @UserId UNIQUEIDENTIFIER,
        @Validated INT,
        @ExpireDate DATETIME,
        @StoredCode UNIQUEIDENTIFIER;

    -- Find the user by email
    SELECT 
        @UserId = UserId,
        @Validated = Validated,
        @ExpireDate = ValidationExpires,
        @StoredCode = ValidationCode
    FROM dbo.Users
    WHERE Email = @Email;

    -- Check if user exists
    IF @UserId IS NULL
    BEGIN
        SELECT 
            0 AS Success,
            'Email not found.' AS Message;
        RETURN;
    END

    -- Check if already validated
    IF ISNULL(@Validated, 0) = 1
    BEGIN
        SELECT 
            0 AS Success,
            'Email is already verified.' AS Message;
        RETURN;
    END

    -- Check if validation code matches
    IF @StoredCode IS NULL OR @StoredCode != @ValidationCode
    BEGIN
        SELECT 
            0 AS Success,
            'Invalid verification code.' AS Message;
        RETURN;
    END

    -- Check if code has expired
    IF @ExpireDate IS NOT NULL AND @ExpireDate < GETDATE()
    BEGIN
        SELECT 
            0 AS Success,
            'Verification code has expired. Please request a new one.' AS Message;
        RETURN;
    END

    -- Validate the user
    UPDATE dbo.Users
    SET 
        Validated = 1,
        LastEdit = GETDATE()
    WHERE UserId = @UserId;

    SELECT 
        1 AS Success,
        'Email verified successfully. You can now log in.' AS Message,
        @UserId AS UserId;
END;
GO
