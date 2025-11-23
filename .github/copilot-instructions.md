# ReactBudget AI Coding Instructions

## Project Overview
ReactBudget is a full-stack personal finance management application with React Native frontend (iOS/Android/Web), Node.js Express backend, and SQL Server database. Built for cross-platform budget tracking with tithe management.

## Architecture & Data Model

### Database: SaltAndLite (SQL Server)
- **Users**: Authentication with email validation system
  - Uses both `Username` and `UserId` (GUID) for dual referencing
  - Email validation with expiring codes (15-minute window)
  - Passwords stored as VARCHAR(16) - consider security implications
  
- **Income**: Paycheck tracking with tithe calculations
  - Supports gross/net amounts with tithe percentage tracking
  - Date stored as VARCHAR(45) - inconsistent with Transactions datetime
  
- **Transactions**: Expense/spending tracking
  - Uses `TableName` field for categorization (likely budget categories)
  - Due dates vs actual dates for bill management
  - Amount field for transaction values

### Key Relationships
- All financial records link to Users via both `Username` (VARCHAR) and `UserId` (GUID)
- Foreign key constraints enforce data integrity on both fields

## Database Patterns & Conventions

### Stored Procedure Naming
- Prefix: `spbl_` (likely "SaltAndLite Budget")
- Pattern: `spbl_[Action][Entity]` (e.g., `spbl_InsertIncome`, `spbl_GetUserById`)
- All procedures include error handling with try/catch blocks
- Standard return format: `Success` (bit), `Message` (varchar)

### Data Access Patterns
- **User Operations**: Login supports both username and email
- **Security**: All financial operations require `UserID` parameter for row-level security
- **Validation**: New users require email validation within 15 minutes
- **Audit Trail**: `CreationTime`, `LastEdit` fields on all tables

### Important Quirks
- Income dates stored as VARCHAR(45), Transaction dates as DATETIME
- Dual user identification (Username + UserId) throughout schema
- `TableName` field in Transactions serves as category identifier
- `TitheStatus` and `PaycheckStatus` for workflow management

## Full-Stack Architecture

### Frontend: React Native + Expo (`/frontend/`)
- **Cross-platform**: iOS, Android, and Web from single codebase
- **Navigation**: Bottom tabs with Stack navigation for auth flow
- **State Management**: React Context for authentication, AsyncStorage for persistence
- **UI Library**: React Native Paper for Material Design components
- **API Integration**: Axios with automatic token management and error handling

### Backend: Node.js + Express (`/backend/`)
- **RESTful API**: Routes map directly to stored procedures for database operations
- **Authentication**: JWT tokens with middleware protection on all budget routes
- **Database**: mssql package with connection pooling for SQL Server integration
- **Security**: Helmet, CORS, rate limiting, input validation, row-level security
- **Error Handling**: Centralized error middleware with SQL Server-specific error mapping

### Development Patterns

#### Frontend Development:
- **Screens**: Located in `src/screens/`, use React Native Paper components
- **Navigation**: AuthNavigator for login flow, Tab Navigator for main app
- **API Calls**: Use `budgetService` or `authService` from `src/services/apiService.js`
- **Authentication**: Check `user` state from AuthContext, auto-redirect if not logged in
- **Data Flow**: API calls → AsyncStorage caching → Context state → Screen rendering

#### Backend Development:
- **Routes**: Map 1:1 to stored procedures, include input validation with express-validator
- **Authentication**: Use `protect` middleware, `validateOwnership` for user resource access
- **Database**: Call `executeStoredProcedure()` with proper parameter types (sql.UniqueIdentifier, sql.VarChar, etc.)
- **Error Handling**: Let errors bubble up to centralized errorHandler middleware
- **Security**: All financial operations require UserID validation against JWT token

#### Database Integration:
- **Stored Procedures**: All data access through existing `spbl_*` procedures
- **Parameter Types**: Use `sql.UniqueIdentifier` for GUIDs, respect VARCHAR length limits
- **Row Security**: UserID parameter enforced in all financial data procedures
- **Date Handling**: Income uses VARCHAR(45) dates, Transactions use DATETIME - handle conversion in API

### Critical Implementation Notes:
- **Dual User IDs**: Both Username (VARCHAR) and UserId (GUID) required for database operations
- **Password Limits**: 16 character maximum due to database schema
- **Validation Flow**: 15-minute expiry on email validation codes
- **Budget Categories**: `TableName` field in Transactions serves as primary categorization
- **Tithe Tracking**: Built into Income table with separate workflow status fields

### Security Considerations:
- JWT tokens in Authorization headers: `Bearer <token>`
- All budget routes protected with authentication middleware
- User resource access validated via `validateOwnership` middleware
- SQL injection prevented via parameterized stored procedure calls
- Rate limiting on all API endpoints

## Key Files & Structure
```
├── SQL/TablesAndProcs.sql          # Database schema & stored procedures
├── backend/
│   ├── server.js                   # Express server setup
│   ├── config/database.js          # SQL Server connection & SP execution
│   ├── routes/                     # API endpoints mapping to stored procedures
│   ├── middleware/                 # Authentication & error handling
│   └── .env                        # Database credentials & JWT secrets
└── frontend/
    ├── App.js                      # Root component with navigation
    ├── src/context/AuthContext.js  # Authentication state management
    ├── src/services/apiService.js  # Backend API integration
    ├── src/screens/                # App screens for auth & budget management
    └── src/navigation/             # Navigation configuration
```