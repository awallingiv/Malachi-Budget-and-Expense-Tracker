-- ReactBudget Theme Persistence & Preferences Update
-- Run this file to add new columns and update stored procedures for theme persistence

-- 1. Add new columns to UserPreferences table (only if they don't exist)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('UserPreferences') AND name = 'ThemePreset')
BEGIN
    ALTER TABLE UserPreferences
    ADD ThemePreset VARCHAR(30) DEFAULT 'default';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('UserPreferences') AND name = 'BackgroundPreset')
BEGIN
    ALTER TABLE UserPreferences
    ADD BackgroundPreset VARCHAR(30) DEFAULT 'default';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('UserPreferences') AND name = 'WidgetVisibility')
BEGIN
    ALTER TABLE UserPreferences
    ADD WidgetVisibility NVARCHAR(MAX) DEFAULT NULL;
END
GO

-- 2. Update spmb_GetUserPreferences procedure
IF OBJECT_ID('spmb_GetUserPreferences', 'P') IS NOT NULL
    DROP PROCEDURE spmb_GetUserPreferences;
GO
CREATE PROCEDURE spmb_GetUserPreferences
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        UserId,
        Username,
        ThemePreset,
        BackgroundPreset,
        WidgetVisibility,
        -- ...existing columns...
        CreationTime,
        LastEdit
    FROM UserPreferences
    WHERE UserId = @UserId;
END
GO

-- 3. Update spmb_UpdateUserPreferences procedure
IF OBJECT_ID('spmb_UpdateUserPreferences', 'P') IS NOT NULL
    DROP PROCEDURE spmb_UpdateUserPreferences;
GO
CREATE PROCEDURE spmb_UpdateUserPreferences
    @UserId UNIQUEIDENTIFIER,
    @ThemePreset VARCHAR(30),
    @BackgroundPreset VARCHAR(30),
    @WidgetVisibility NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE UserPreferences
    SET ThemePreset = @ThemePreset,
        BackgroundPreset = @BackgroundPreset,
        WidgetVisibility = @WidgetVisibility,
        LastEdit = GETDATE()
    WHERE UserId = @UserId;
END
GO
