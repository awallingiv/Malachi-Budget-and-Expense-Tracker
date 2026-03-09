-- ============================================================
-- Tithe Auto-Expense Feature Migration
-- Adds TitheTrackingEnabled to UserPreferences
-- Adds IsSystem flag to Groupings table
-- Creates spmb_EnsureTitheGrouping procedure
-- Updates spmb_InitializeDefaultGroupings with @EnableTithe
-- Updates spmb_GetUserPreferences to include TitheTrackingEnabled
-- Updates spmb_UpdateUserPreferences to accept TitheTrackingEnabled
-- ============================================================

USE [MalachiBudget]
GO

-- 1. Add TitheTrackingEnabled column to UserPreferences
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('UserPreferences') AND name = 'TitheTrackingEnabled'
)
BEGIN
    ALTER TABLE [dbo].[UserPreferences]
    ADD [TitheTrackingEnabled] [bit] NOT NULL DEFAULT 0;
    PRINT '✅ Added TitheTrackingEnabled to UserPreferences';
END
ELSE
    PRINT '⏭️ TitheTrackingEnabled already exists on UserPreferences';
GO

-- 2. Add IsSystem column to Groupings
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Groupings') AND name = 'IsSystem'
)
BEGIN
    ALTER TABLE [dbo].[Groupings]
    ADD [IsSystem] [bit] NOT NULL DEFAULT 0;
    PRINT '✅ Added IsSystem to Groupings';
END
ELSE
    PRINT '⏭️ IsSystem already exists on Groupings';
GO

-- 3. Create/update spmb_EnsureTitheGrouping
CREATE OR ALTER PROCEDURE [dbo].[spmb_EnsureTitheGrouping]
    @UserID UNIQUEIDENTIFIER,
    @Username VARCHAR(17)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @GroupingID UNIQUEIDENTIFIER;

    -- Check if a Tithe system grouping already exists for this user
    SELECT @GroupingID = GroupingID
    FROM Groupings
    WHERE UserID = @UserID AND GroupingName = N'Tithe' AND IsSystem = 1;

    IF @GroupingID IS NOT NULL
    BEGIN
        -- Reactivate if it was soft-deleted
        UPDATE Groupings
        SET IsActive = 1, LastEdit = GETDATE()
        WHERE GroupingID = @GroupingID AND IsActive = 0;

        SELECT @GroupingID AS GroupingID, 'Tithe grouping ensured.' AS Message;
        RETURN;
    END

    -- Check if user has a non-system grouping named 'Tithe'
    SELECT @GroupingID = GroupingID
    FROM Groupings
    WHERE UserID = @UserID AND GroupingName = N'Tithe' AND IsSystem = 0;

    IF @GroupingID IS NOT NULL
    BEGIN
        -- Upgrade existing grouping to system
        UPDATE Groupings
        SET IsSystem = 1, IsActive = 1, Icon = N'⛪', Color = '#667EEA', DisplayOrder = 0, LastEdit = GETDATE()
        WHERE GroupingID = @GroupingID;

        SELECT @GroupingID AS GroupingID, 'Existing Tithe grouping upgraded to system.' AS Message;
        RETURN;
    END

    -- Create new system Tithe grouping
    SET @GroupingID = NEWID();

    INSERT INTO Groupings (GroupingID, UserID, Username, GroupingName, DisplayOrder, Color, Icon, IsActive, IsSystem, CreationTime, LastEdit)
    VALUES (@GroupingID, @UserID, @Username, N'Tithe', 0, '#667EEA', N'⛪', 1, 1, GETDATE(), GETDATE());

    SELECT @GroupingID AS GroupingID, 'Tithe grouping created.' AS Message;
END
GO
PRINT '✅ Created spmb_EnsureTitheGrouping';
GO

-- 4. Update spmb_InitializeDefaultGroupings to support @EnableTithe
CREATE OR ALTER PROCEDURE [dbo].[spmb_InitializeDefaultGroupings]
    @UserID UNIQUEIDENTIFIER,
    @Username VARCHAR(17),
    @EnableTithe BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    -- Create 3 default groupings
    INSERT INTO Groupings (UserID, Username, GroupingName, DisplayOrder, Color, Icon)
    VALUES
        (@UserID, @Username, 'Expenses', 1, '#95E1D3', N'🛒'),
        (@UserID, @Username, 'Subscriptions', 2, '#FFDEE9', N'📺'),
        (@UserID, @Username, 'Rent/Utilities', 3, '#A8E6CF', N'🏠');

    -- If tithe tracking enabled, also create the system Tithe grouping
    IF @EnableTithe = 1
    BEGIN
        EXEC spmb_EnsureTitheGrouping @UserID, @Username;
    END

    SELECT @@ROWCOUNT AS GroupingsCreated;
END
GO
PRINT '✅ Updated spmb_InitializeDefaultGroupings with @EnableTithe';
GO

-- 5. Update spmb_GetUserPreferences to include TitheTrackingEnabled
CREATE OR ALTER PROCEDURE [dbo].[spmb_GetUserPreferences]
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
        TitheTrackingEnabled,
        MerchantDefaults,
        Theme,
        DefaultCurrency,
        ThemePreset,
        BackgroundPreset,
        WidgetVisibility,
        CreationTime,
        LastEdit
    FROM UserPreferences
    WHERE UserId = @UserId;
END
GO
PRINT '✅ Updated spmb_GetUserPreferences with TitheTrackingEnabled';
GO

-- 6. Update spmb_UpdateUserPreferences to accept TitheTrackingEnabled
CREATE OR ALTER PROCEDURE [dbo].[spmb_UpdateUserPreferences]
    @UserId UNIQUEIDENTIFIER,
    @LastExpenseCategory VARCHAR(50) = NULL,
    @LastIncomeTemplate NVARCHAR(MAX) = NULL,
    @CustomTithePercentage FLOAT = NULL,
    @TitheTrackingEnabled BIT = NULL,
    @MerchantDefaults NVARCHAR(MAX) = NULL,
    @Theme VARCHAR(20) = NULL,
    @DefaultCurrency VARCHAR(10) = NULL,
    @ThemePreset VARCHAR(30) = NULL,
    @BackgroundPreset VARCHAR(30) = NULL,
    @WidgetVisibility NVARCHAR(MAX) = NULL
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
        TitheTrackingEnabled = ISNULL(@TitheTrackingEnabled, TitheTrackingEnabled),
        MerchantDefaults = ISNULL(@MerchantDefaults, MerchantDefaults),
        Theme = ISNULL(@Theme, Theme),
        DefaultCurrency = ISNULL(@DefaultCurrency, DefaultCurrency),
        ThemePreset = ISNULL(@ThemePreset, ThemePreset),
        BackgroundPreset = ISNULL(@BackgroundPreset, BackgroundPreset),
        WidgetVisibility = ISNULL(@WidgetVisibility, WidgetVisibility),
        LastEdit = GETDATE()
    WHERE UserId = @UserId;

    -- Return updated preferences
    EXEC spmb_GetUserPreferences @UserId;
END
GO
PRINT '✅ Updated spmb_UpdateUserPreferences with TitheTrackingEnabled';
GO

-- 7. Update spmb_GetUserGroupings to include IsSystem
CREATE OR ALTER PROCEDURE [dbo].[spmb_GetUserGroupings]
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
        IsSystem,
        CreationTime,
        LastEdit
    FROM Groupings
    WHERE UserID = @UserID AND IsActive = 1
    ORDER BY DisplayOrder, GroupingName;
END
GO
PRINT '✅ Updated spmb_GetUserGroupings with IsSystem';
GO

PRINT '🎉 Tithe Auto-Expense migration complete!';
GO
