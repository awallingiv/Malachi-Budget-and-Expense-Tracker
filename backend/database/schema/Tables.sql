USE [MalachiBudget]
GO
/****** Object:  Table [dbo].[Budgets]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Budgets](
	[BudgetID] [uniqueidentifier] NOT NULL,
	[UserID] [uniqueidentifier] NOT NULL,
	[Username] [varchar](17) NOT NULL,
	[CategoryName] [varchar](50) NOT NULL,
	[PeriodStart] [date] NOT NULL,
	[PeriodEnd] [date] NOT NULL,
	[Amount] [float] NOT NULL,
	[Currency] [varchar](10) NOT NULL,
	[CreationTime] [datetime] NOT NULL,
	[LastEdit] [datetime] NOT NULL,
 CONSTRAINT [PK_Budgets] PRIMARY KEY CLUSTERED 
(
	[BudgetID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Budgets_UserCategoryPeriod] UNIQUE NONCLUSTERED 
(
	[UserID] ASC,
	[CategoryName] ASC,
	[PeriodStart] ASC,
	[PeriodEnd] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Categories]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Categories](
	[CategoryID] [uniqueidentifier] NOT NULL,
	[GroupingID] [uniqueidentifier] NOT NULL,
	[UserID] [uniqueidentifier] NOT NULL,
	[Username] [varchar](17) NOT NULL,
	[CategoryName] [nvarchar](50) NOT NULL,
	[DisplayOrder] [int] NOT NULL,
	[Color] [varchar](20) NULL,
	[Icon] [nvarchar](50) NULL,
	[IsActive] [bit] NOT NULL,
	[CreationTime] [datetime] NOT NULL,
	[LastEdit] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[CategoryID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Categories_GroupingCategory] UNIQUE NONCLUSTERED 
(
	[GroupingID] ASC,
	[CategoryName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CategoryWindows]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CategoryWindows](
	[WindowID] [uniqueidentifier] NOT NULL,
	[UserID] [uniqueidentifier] NOT NULL,
	[Username] [varchar](17) NOT NULL,
	[CategoryName] [varchar](50) NOT NULL,
	[DisplayName] [varchar](100) NOT NULL,
	[Description] [varchar](255) NULL,
	[ColorTheme] [varchar](20) NULL,
	[PositionX] [int] NOT NULL,
	[PositionY] [int] NOT NULL,
	[Width] [int] NOT NULL,
	[Height] [int] NOT NULL,
	[IsMinimized] [bit] NOT NULL,
	[ZIndex] [int] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreationTime] [datetime] NOT NULL,
	[LastEdit] [datetime] NOT NULL,
	[TableName] [varchar](20) NULL,
 CONSTRAINT [PK_CategoryWindows] PRIMARY KEY CLUSTERED 
(
	[WindowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ExpenseGroupings]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ExpenseGroupings](
	[GroupingID] [uniqueidentifier] NOT NULL,
	[UserID] [uniqueidentifier] NOT NULL,
	[Username] [varchar](17) NOT NULL,
	[GroupingName] [varchar](50) NOT NULL,
	[DisplayOrder] [int] NULL,
	[Color] [varchar](20) NULL,
	[Icon] [varchar](20) NULL,
	[CreationTime] [datetime] NOT NULL,
	[LastEdit] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[GroupingID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_ExpenseGroupings_UserGrouping] UNIQUE NONCLUSTERED 
(
	[UserID] ASC,
	[GroupingName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Groupings]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Groupings](
	[GroupingID] [uniqueidentifier] NOT NULL,
	[UserID] [uniqueidentifier] NOT NULL,
	[Username] [varchar](17) NOT NULL,
	[GroupingName] [nvarchar](50) NOT NULL,
	[DisplayOrder] [int] NOT NULL,
	[Color] [varchar](20) NULL,
	[Icon] [nvarchar](50) NULL,
	[IsActive] [bit] NOT NULL,
	[CreationTime] [datetime] NOT NULL,
	[LastEdit] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[GroupingID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Groupings_UserGrouping] UNIQUE NONCLUSTERED 
(
	[UserID] ASC,
	[GroupingName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Income]    Script Date: 12/7/2025 6:59:45 PM ******/
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
/****** Object:  Table [dbo].[RecurringItems]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RecurringItems](
	[RecurringID] [uniqueidentifier] NOT NULL,
	[UserID] [uniqueidentifier] NOT NULL,
	[Username] [varchar](17) NOT NULL,
	[ItemType] [varchar](10) NOT NULL,
	[Description] [varchar](150) NULL,
	[TableName] [varchar](50) NULL,
	[Amount] [float] NOT NULL,
	[StartDate] [date] NOT NULL,
	[EndDate] [date] NULL,
	[Frequency] [varchar](20) NOT NULL,
	[Interval] [int] NOT NULL,
	[NextOccurrence] [date] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreationTime] [datetime] NOT NULL,
	[LastEdit] [datetime] NOT NULL,
	[Notes] [varchar](255) NULL,
 CONSTRAINT [PK_RecurringItems] PRIMARY KEY CLUSTERED 
(
	[RecurringID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SavedViews]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SavedViews](
	[SavedViewID] [uniqueidentifier] NOT NULL,
	[UserID] [uniqueidentifier] NOT NULL,
	[Name] [varchar](100) NOT NULL,
	[FilterConfig] [nvarchar](max) NOT NULL,
	[CreationTime] [datetime] NOT NULL,
	[LastEdit] [datetime] NOT NULL,
 CONSTRAINT [PK_SavedViews] PRIMARY KEY CLUSTERED 
(
	[SavedViewID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Transactions]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Transactions](
	[Username] [varchar](17) NOT NULL,
	[Name] [varchar](150) NULL,
	[Amount] [float] NULL,
	[Due] [datetime] NULL,
	[Date] [datetime] NULL,
	[Notes] [varchar](60) NULL,
	[Category] [varchar](50) NULL,
	[Status] [varchar](20) NULL,
	[CreationTime] [datetime] NOT NULL,
	[TransactionId] [uniqueidentifier] NOT NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[LastEdit] [datetime] NULL,
	[GroupingID] [uniqueidentifier] NULL,
	[CategoryID] [uniqueidentifier] NULL,
 CONSTRAINT [PK_Transactions] PRIMARY KEY CLUSTERED 
(
	[TransactionId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[UserPreferences]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UserPreferences](
	[PreferenceId] [uniqueidentifier] NOT NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[Username] [varchar](17) NOT NULL,
	[LastExpenseCategory] [varchar](50) NULL,
	[LastIncomeTemplate] [nvarchar](max) NULL,
	[CustomTithePercentage] [float] NULL,
	[MerchantDefaults] [nvarchar](max) NULL,
	[Theme] [varchar](20) NULL,
	[DefaultCurrency] [varchar](10) NULL,
	[CreationTime] [datetime] NOT NULL,
	[LastEdit] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[PreferenceId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_UserPreferences_UserId] UNIQUE NONCLUSTERED 
(
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Users]    Script Date: 12/7/2025 6:59:45 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[Username] [varchar](17) NOT NULL,
	[Pass] [varchar](255) NULL,
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
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Users_Username] UNIQUE NONCLUSTERED 
(
	[Username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Budgets] ADD  DEFAULT (newsequentialid()) FOR [BudgetID]
GO
ALTER TABLE [dbo].[Budgets] ADD  DEFAULT ('USD') FOR [Currency]
GO
ALTER TABLE [dbo].[Budgets] ADD  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[Budgets] ADD  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[Categories] ADD  DEFAULT (newid()) FOR [CategoryID]
GO
ALTER TABLE [dbo].[Categories] ADD  DEFAULT ((0)) FOR [DisplayOrder]
GO
ALTER TABLE [dbo].[Categories] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Categories] ADD  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[Categories] ADD  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT (newid()) FOR [WindowID]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT ('blue') FOR [ColorTheme]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT ((100)) FOR [PositionX]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT ((100)) FOR [PositionY]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT ((300)) FOR [Width]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT ((200)) FOR [Height]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT ((0)) FOR [IsMinimized]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT ((1)) FOR [ZIndex]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[CategoryWindows] ADD  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[ExpenseGroupings] ADD  DEFAULT (newid()) FOR [GroupingID]
GO
ALTER TABLE [dbo].[ExpenseGroupings] ADD  DEFAULT ((0)) FOR [DisplayOrder]
GO
ALTER TABLE [dbo].[ExpenseGroupings] ADD  DEFAULT ('#0066cc') FOR [Color]
GO
ALTER TABLE [dbo].[ExpenseGroupings] ADD  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[ExpenseGroupings] ADD  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[Groupings] ADD  DEFAULT (newid()) FOR [GroupingID]
GO
ALTER TABLE [dbo].[Groupings] ADD  DEFAULT ((0)) FOR [DisplayOrder]
GO
ALTER TABLE [dbo].[Groupings] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Groupings] ADD  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[Groupings] ADD  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[Income] ADD  CONSTRAINT [DF_Income_CreationTime]  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[Income] ADD  CONSTRAINT [DF_Income_IncomeId]  DEFAULT (newsequentialid()) FOR [IncomeId]
GO
ALTER TABLE [dbo].[RecurringItems] ADD  DEFAULT (newsequentialid()) FOR [RecurringID]
GO
ALTER TABLE [dbo].[RecurringItems] ADD  DEFAULT ((1)) FOR [Interval]
GO
ALTER TABLE [dbo].[RecurringItems] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[RecurringItems] ADD  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[RecurringItems] ADD  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[SavedViews] ADD  DEFAULT (newsequentialid()) FOR [SavedViewID]
GO
ALTER TABLE [dbo].[SavedViews] ADD  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[SavedViews] ADD  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[Transactions] ADD  CONSTRAINT [DF_Transactions_CreationTime]  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[Transactions] ADD  CONSTRAINT [DF_Transactions_TransactionId]  DEFAULT (newsequentialid()) FOR [TransactionId]
GO
ALTER TABLE [dbo].[UserPreferences] ADD  DEFAULT (newid()) FOR [PreferenceId]
GO
ALTER TABLE [dbo].[UserPreferences] ADD  DEFAULT ((10.0)) FOR [CustomTithePercentage]
GO
ALTER TABLE [dbo].[UserPreferences] ADD  DEFAULT ('light') FOR [Theme]
GO
ALTER TABLE [dbo].[UserPreferences] ADD  DEFAULT ('USD') FOR [DefaultCurrency]
GO
ALTER TABLE [dbo].[UserPreferences] ADD  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[UserPreferences] ADD  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_CreationTime]  DEFAULT (getdate()) FOR [CreationTime]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_UserId]  DEFAULT (newsequentialid()) FOR [UserId]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (newid()) FOR [ValidationCode]
GO
ALTER TABLE [dbo].[Users] ADD  CONSTRAINT [DF_Users_LastEdit]  DEFAULT (getdate()) FOR [LastEdit]
GO
ALTER TABLE [dbo].[Budgets]  WITH CHECK ADD  CONSTRAINT [FK_Budgets_Users_UserId] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Budgets] CHECK CONSTRAINT [FK_Budgets_Users_UserId]
GO
ALTER TABLE [dbo].[Budgets]  WITH CHECK ADD  CONSTRAINT [FK_Budgets_Users_Username] FOREIGN KEY([Username])
REFERENCES [dbo].[Users] ([Username])
GO
ALTER TABLE [dbo].[Budgets] CHECK CONSTRAINT [FK_Budgets_Users_Username]
GO
ALTER TABLE [dbo].[Categories]  WITH CHECK ADD  CONSTRAINT [FK_Categories_Groupings] FOREIGN KEY([GroupingID])
REFERENCES [dbo].[Groupings] ([GroupingID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Categories] CHECK CONSTRAINT [FK_Categories_Groupings]
GO
ALTER TABLE [dbo].[Categories]  WITH CHECK ADD  CONSTRAINT [FK_Categories_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[Categories] CHECK CONSTRAINT [FK_Categories_Users]
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
ALTER TABLE [dbo].[ExpenseGroupings]  WITH CHECK ADD  CONSTRAINT [FK_ExpenseGroupings_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ExpenseGroupings] CHECK CONSTRAINT [FK_ExpenseGroupings_Users]
GO
ALTER TABLE [dbo].[Groupings]  WITH CHECK ADD  CONSTRAINT [FK_Groupings_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Groupings] CHECK CONSTRAINT [FK_Groupings_Users]
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
ALTER TABLE [dbo].[RecurringItems]  WITH CHECK ADD  CONSTRAINT [FK_RecurringItems_Users_UserId] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[RecurringItems] CHECK CONSTRAINT [FK_RecurringItems_Users_UserId]
GO
ALTER TABLE [dbo].[RecurringItems]  WITH CHECK ADD  CONSTRAINT [FK_RecurringItems_Users_Username] FOREIGN KEY([Username])
REFERENCES [dbo].[Users] ([Username])
GO
ALTER TABLE [dbo].[RecurringItems] CHECK CONSTRAINT [FK_RecurringItems_Users_Username]
GO
ALTER TABLE [dbo].[SavedViews]  WITH CHECK ADD  CONSTRAINT [FK_SavedViews_Users_UserId] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserId])
GO
ALTER TABLE [dbo].[SavedViews] CHECK CONSTRAINT [FK_SavedViews_Users_UserId]
GO
ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD  CONSTRAINT [FK_Transactions_Groupings] FOREIGN KEY([GroupingID])
REFERENCES [dbo].[Groupings] ([GroupingID])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[Transactions] CHECK CONSTRAINT [FK_Transactions_Groupings]
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
ALTER TABLE [dbo].[UserPreferences]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([UserId])
ON DELETE CASCADE
GO
