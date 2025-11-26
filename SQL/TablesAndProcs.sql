USE [ReactBudget]
GO
/****** Object:  Table [dbo].[Income]    Script Date: 11/9/2025 9:19:38 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Income](
	[Username] [varchar](17) NOT NULL,
	[Description] [varchar](45) NULL,
	[Net] [float] NULL,
	[Gross] [float] NULL,
	[Tithe] [float] NULL,
	[TitheStatus] [varchar](45) NULL,
	[Date] [varchar](45) NULL,
	[PaycheckStatus] [varchar](45) NULL,
	[CreationTime] [datetime] NOT NULL,
	[IncomeId] [uniqueidentifier] NOT NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[LastEdit] [datetime] NULL,
	[Notes] [varchar](max) NULL,
 CONSTRAINT [PK_Income] PRIMARY KEY CLUSTERED 
(
	[IncomeId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Transactions]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Transactions](
	[Username] [varchar](17) NOT NULL,
	[TableName] [varchar](20) NOT NULL,
	[Description] [varchar](150) NULL,
	[Amount] [float] NULL,
	[Due] [datetime] NULL,
	[Date] [datetime] NULL,
	[Notes] [varchar](60) NULL,
	[Category] [varchar](20) NULL,
	[Status] [varchar](20) NULL,
	[CreationTime] [datetime] NOT NULL,
	[TransactionId] [uniqueidentifier] NOT NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[LastEdit] [datetime] NULL,
 CONSTRAINT [PK_Transactions] PRIMARY KEY CLUSTERED 
(
	[TransactionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Users]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[Username] [varchar](17) NOT NULL,
	[Pass] [varchar](128) NOT NULL,
	[Email] [varchar](45) NOT NULL,
	[Name] [varchar](25) NULL,
	[Validated] [tinyint] NULL,
	[CreationTime] [datetime] NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[ValidationCode] [uniqueidentifier] NULL,
	[ValidationExpires] [datetime] NULL,
	[LastEdit] [datetime] NULL,
 CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Income] ADD  CONSTRAINT [DF_Income_CreationTime]  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[Income] ADD  CONSTRAINT [DF_Income_IncomeId]  DEFAULT (newsequentialid()) FOR [IncomeId]
GO
ALTER TABLE [dbo].[Transactions] ADD  CONSTRAINT [DF_Transactions_CreationTime]  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[Transactions] ADD  CONSTRAINT [DF_Transactions_TransactionId]  DEFAULT (newsequentialid()) FOR [TransactionId]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_CreationTime]  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_UserId]  DEFAULT (newsequentialid()) FOR [UserId]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (newid()) FOR [ValidationCode]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_LastEdit]  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[Income]  WITH CHECK ADD  CONSTRAINT [FK_Income_Users_UserId] FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Income] CHECK CONSTRAINT [FK_Income_Users_UserId]
GO
ALTER TABLE [dbo].[Income]  WITH CHECK ADD  CONSTRAINT [FK_Income_Users_Username] FOREIGN KEY([Username])
REFERENCES [dbo].[Users] ([Username])
GO
ALTER TABLE [dbo].[Income] CHECK CONSTRAINT [FK_Income_Users_Username]
GO
ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD  CONSTRAINT [FK_Transactions_Users_UserId] FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Transactions] CHECK CONSTRAINT [FK_Transactions_Users_UserId]
GO
ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD  CONSTRAINT [FK_Transactions_Users_Username] FOREIGN KEY([Username])
REFERENCES [dbo].[Users] ([Username])
GO
ALTER TABLE [dbo].[Transactions] CHECK CONSTRAINT [FK_Transactions_Users_Username]
GO
/****** Object:  Table [dbo].[CategoryWindows]    Script Date: 11/23/2025 12:00:00 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CategoryWindows](
	[WindowID] [uniqueidentifier] NOT NULL DEFAULT NEWID(),
	[UserID] [uniqueidentifier] NOT NULL,
	[Username] [varchar](17) NOT NULL,
	[CategoryName] [varchar](50) NOT NULL,
	[DisplayName] [varchar](100) NOT NULL,
	[Description] [varchar](255) NULL,
	[ColorTheme] [varchar](20) NULL DEFAULT 'blue',
	[PositionX] [int] NOT NULL DEFAULT 100,
	[PositionY] [int] NOT NULL DEFAULT 100,
	[Width] [int] NOT NULL DEFAULT 300,
	[Height] [int] NOT NULL DEFAULT 200,
	[IsMinimized] [bit] NOT NULL DEFAULT 0,
	[ZIndex] [int] NOT NULL DEFAULT 1,
	[IsActive] [bit] NOT NULL DEFAULT 1,
	[CreationTime] [datetime] NOT NULL DEFAULT GETDATE(),
	[LastEdit] [datetime] NOT NULL DEFAULT GETDATE(),
 CONSTRAINT [PK_CategoryWindows] PRIMARY KEY CLUSTERED 
(
	[WindowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[CategoryWindows]  WITH CHECK ADD  CONSTRAINT [FK_CategoryWindows_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserId])
GO

ALTER TABLE [dbo].[CategoryWindows] CHECK CONSTRAINT [FK_CategoryWindows_Users]
GO

ALTER TABLE [dbo].[CategoryWindows]  WITH CHECK ADD  CONSTRAINT [FK_CategoryWindows_Users_Username] FOREIGN KEY([Username])
REFERENCES [dbo].[Users] ([Username])
GO

ALTER TABLE [dbo].[CategoryWindows] CHECK CONSTRAINT [FK_CategoryWindows_Users_Username]
GO

/****** Object:  StoredProcedure [dbo].[sprb_DeleteIncome]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Delete income by ID
CREATE   PROCEDURE [dbo].[sprb_DeleteIncome]
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
/****** Object:  StoredProcedure [dbo].[sprb_DeleteTransaction]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Delete transaction by ID
CREATE   PROCEDURE [dbo].[sprb_DeleteTransaction]
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
/****** Object:  StoredProcedure [dbo].[sprb_DeleteUser]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Delete user
CREATE   PROCEDURE [dbo].[sprb_DeleteUser]
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
/****** Object:  StoredProcedure [dbo].[sprb_GetIncomeById]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get a single income record
CREATE     PROCEDURE [dbo].[sprb_GetIncomeById]
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
/****** Object:  StoredProcedure [dbo].[sprb_GetIncomeByUsernameAndDate]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sprb_GetIncomeByUsernameAndDate]
    @UserId UNIQUEIDENTIFIER,
	@StartDate DATETIME = NULL,
	@EndDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

	    IF @StartDate IS NULL
        SET @StartDate = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);

		IF @EndDate IS NULL
        SET @EndDate = EOMONTH(GETDATE());

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
        CreationTime
    FROM
        dbo.Income i
    WHERE
        UserID = @UserID
	AND
		Date BETWEEN @StartDate AND @EndDate
    ORDER BY
        CreationTime DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sprb_GetTransactionById]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get a single transaction
CREATE     PROCEDURE [dbo].[sprb_GetTransactionById]
    @TransactionId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        Username,
        TableName,
        Description,
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
/****** Object:  StoredProcedure [dbo].[sprb_GetTransactionsByUserID]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sprb_GetTransactionsByUserID]    
	@UserId UNIQUEIDENTIFIER,
    @TableName NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        TransactionId,
        Username,
        TableName,
        Description,
        Amount,
        Due,
        Date,
        Notes,
        Category,
        Status,
        CreationTime
    FROM
        dbo.Transactions
    WHERE
        UserID = @UserId
        AND (@TableName IS NULL OR TableName = @TableName)
    ORDER BY
        CreationTime DESC;
END;

GO
/****** Object:  StoredProcedure [dbo].[sprb_GetUserById]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get by UserId
CREATE     PROCEDURE [dbo].[sprb_GetUserById]
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
/****** Object:  StoredProcedure [dbo].[sprb_GetUserStatsWithCategories]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[sprb_GetUserStatsWithCategories]
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
                TableName,
                ISNULL(SUM(Amount), 0) AS TotalExpenses
            FROM Transactions
            WHERE UserID = @UserID
              AND Date BETWEEN @StartDate AND @EndDate
            GROUP BY TableName
            FOR JSON PATH
        ) AS ExpenseBreakdown
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END;

GO
/****** Object:  StoredProcedure [dbo].[sprb_GetValidationInfo]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Get validation code and CreationTime (acting as TransID)
CREATE   PROCEDURE [dbo].[sprb_GetValidationInfo]
    @UserID UNIQUEIDENTIFIER
AS
BEGIN
    SELECT ValidationCode, CreationTime
    FROM dbo.Users
    WHERE UserID = @UserID;
END;

GO
/****** Object:  StoredProcedure [dbo].[sprb_GrantExecToSprbProcs]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE PROCEDURE [dbo].[sprb_GrantExecToSprbProcs]
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
/****** Object:  StoredProcedure [dbo].[sprb_InsertIncome]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Insert new income
CREATE   PROCEDURE [dbo].[sprb_InsertIncome]
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
/****** Object:  StoredProcedure [dbo].[sprb_InsertTransaction]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Insert new transaction
CREATE   PROCEDURE [dbo].[sprb_InsertTransaction]
    @UserID		 UNIQUEIDENTIFIER,
	@Username    VARCHAR(17),
    @TableName   VARCHAR(20),
    @Description VARCHAR(35) = NULL,
    @Amount      FLOAT       = NULL,
    @Due         DATETIME    = NULL,
    @Date        DATETIME    = NULL,
    @Notes       VARCHAR(60) = NULL,
    @Category    VARCHAR(20) = NULL,
    @Status      VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

	DECLARE @NewId UNIQUEIDENTIFIER = NEWID();

    INSERT INTO dbo.Transactions
        (Username, TableName, Description, Amount, Due, Date, Notes, Category, Status, CreationTime, TransactionId, UserID)
    VALUES
        (@Username, @TableName, @Description, @Amount, @Due, @Date, @Notes, @Category, @Status, GetDate(), @NewID, @UserID);

    -- Return new TransactionId
    SELECT @NewId AS NewTransactionId;
END;

GO
/****** Object:  StoredProcedure [dbo].[sprb_InsertUser]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Register new user
CREATE   PROCEDURE [dbo].[sprb_InsertUser]
    @Username       VARCHAR(17),
    @Pass           VARCHAR(16),
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
/****** Object:  StoredProcedure [dbo].[sprb_LoginUserWithEmail]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sprb_LoginUserWithEmail]
	@Email varchar(50),
    @Password VARCHAR(16)
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
/****** Object:  StoredProcedure [dbo].[sprb_LoginUserWithUsername]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sprb_LoginUserWithUsername]
    @Username VARCHAR(17),
    @Password VARCHAR(16)
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
/****** Object:  StoredProcedure [dbo].[sprb_RegisterUser]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Register new user
CREATE   PROCEDURE [dbo].[sprb_RegisterUser]
    @UsernameOrEmail VARCHAR(50),
    @Pass            VARCHAR(16),
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
/****** Object:  StoredProcedure [dbo].[sprb_UpdateIncome]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Update existing income
CREATE   PROCEDURE [dbo].[sprb_UpdateIncome]
    @IncomeId       UNIQUEIDENTIFIER,
    @Description    VARCHAR(45) = NULL,
    @Net            FLOAT       = NULL,
    @Gross          FLOAT       = NULL,
    @Tithe          FLOAT       = NULL,
    @TitheStatus    VARCHAR(45) = NULL,
    @Date           VARCHAR(45) = NULL,
    @PaycheckStatus VARCHAR(45) = NULL,
    @UserID         UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        UPDATE dbo.Income
        SET
            Description    = COALESCE(@Description, Description),
            Net            = COALESCE(@Net, Net),
            Gross          = COALESCE(@Gross, Gross),
            Tithe          = COALESCE(@Tithe, Tithe),
            TitheStatus    = COALESCE(@TitheStatus, TitheStatus),
            Date           = COALESCE(@Date, Date),
            PaycheckStatus = COALESCE(@PaycheckStatus, PaycheckStatus),
            LastEdit       = GETDATE()
        WHERE
            IncomeId = @IncomeId AND UserID = @UserID;

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 0 AS Success, 'No matching income record found or no changes made.' AS Message;
            RETURN;
        END

        SELECT 1 AS Success, 'Income updated successfully.' AS Message;
    END TRY
    BEGIN CATCH
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;


GO
/****** Object:  StoredProcedure [dbo].[sprb_UpdateTransaction]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Update transaction by ID
CREATE   PROCEDURE[dbo].[sprb_UpdateTransaction]
    @TransactionId UNIQUEIDENTIFIER,
    @Description   VARCHAR(35) = NULL,
    @Amount        FLOAT       = NULL,
    @Due           DATETIME    = NULL,
    @Date          DATETIME    = NULL,
    @Notes         VARCHAR(60) = NULL,
    @Category      VARCHAR(20) = NULL,
    @Status        VARCHAR(20) = NULL,
    @UserID        UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        UPDATE dbo.Transactions
        SET
            Description  = COALESCE(@Description, Description),
            Amount       = COALESCE(@Amount, Amount),
            Due          = COALESCE(@Due, Due),
            Date         = COALESCE(@Date, Date),
            Notes        = COALESCE(@Notes, Notes),
            Category     = COALESCE(@Category, Category),
            Status       = COALESCE(@Status, Status),
            LastEdit     = GETDATE()
        WHERE
            TransactionId = @TransactionId AND UserID = @UserID;

        IF @@ROWCOUNT = 0
        BEGIN
            SELECT 0 AS Success, 'No matching transaction found or no changes made.' AS Message;
            RETURN;
        END

        SELECT 1 AS Success, 'Transaction updated successfully.' AS Message;
    END TRY
    BEGIN CATCH
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END;



GO
/****** Object:  StoredProcedure [dbo].[sprb_UpdateUser]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Update existing user
CREATE   PROCEDURE [dbo].[sprb_UpdateUser]
    @UserId         UNIQUEIDENTIFIER,
    @Pass           VARCHAR(16)  = NULL,
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
/****** Object:  StoredProcedure [dbo].[sprb_UpdateUserPassword]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Update user password and validated status
CREATE   PROCEDURE[dbo].[sprb_UpdateUserPassword]
    @UserID        UNIQUEIDENTIFIER,
    @NewPassword   VARCHAR(16)
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


/****** Object:  StoredProcedure [dbo].[sprb_UpdateValidationCode]    Script Date: 5/21/2025 5:11:43 PM ******/
SET ANSI_NULLS ON
GO
/****** Object:  StoredProcedure [dbo].[sprb_UpdateValidationCode]    Script Date: 11/9/2025 9:19:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Update validation code and reset validated flag
CREATE PROCEDURE [dbo].[sprb_UpdateValidationCode]
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

/****** Category Windows Management Procedures ******/

-- Get all category windows for a user
CREATE PROCEDURE [dbo].[sprb_GetCategoryWindows]
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

-- Create new category window
CREATE PROCEDURE [dbo].[sprb_CreateCategoryWindow]
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

-- Update category window position and properties
CREATE PROCEDURE [dbo].[sprb_UpdateCategoryWindow]
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

-- Delete category window
CREATE PROCEDURE [dbo].[sprb_DeleteCategoryWindow]
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

-- Get transactions for a specific category window
CREATE PROCEDURE [dbo].[sprb_GetWindowTransactions]
    @UserID UNIQUEIDENTIFIER,
    @CategoryName VARCHAR(50),
    @StartDate DATE = NULL,
    @EndDate DATE = NULL,
    @Limit INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT TOP (ISNULL(@Limit, 1000))
        TransactionId,
        Description,
        Amount,
        Date,
        Due,
        Notes,
        Category,
        Status,
        CreationTime
    FROM Transactions
    WHERE UserID = @UserID 
        AND TableName = @CategoryName
        AND (@StartDate IS NULL OR Date >= @StartDate)
        AND (@EndDate IS NULL OR Date <= @EndDate)
    ORDER BY Date DESC, CreationTime DESC;
END;
GO

-- Bulk update window positions (for drag operations)
CREATE PROCEDURE [dbo].[sprb_UpdateWindowPositions]
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
