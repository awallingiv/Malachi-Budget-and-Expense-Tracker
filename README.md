# ReactBudget

A full-stack personal finance management application built with React Native, Node.js, and SQL Server.

## 🚀 Features

- **Cross-Platform Mobile & Web App** - iOS, Android, and Web from a single React Native codebase
- **Complete Budget Management** - Track income, expenses, and savings with detailed categorization  
- **Tithe Tracking** - Built-in support for tithe management and status tracking
- **Secure Authentication** - JWT-based auth with email validation and account management
- **Real-time Dashboard** - Monthly statistics, savings rate, and expense breakdowns
- **Robust Backend API** - RESTful API with SQL Server integration and stored procedures

## 🏗️ Architecture

```
ReactBudget/
├── frontend/          # React Native + Expo (iOS/Android/Web)
├── backend/           # Node.js + Express API  
├── SQL/              # SQL Server database schema
└── .github/          # AI coding instructions
```

### Tech Stack
- **Frontend**: React Native, Expo, React Navigation, React Native Paper
- **Backend**: Node.js, Express, JWT, bcrypt, express-validator
- **Database**: SQL Server with stored procedures
- **Development**: Hot reload, cross-platform development, RESTful API

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- SQL Server instance
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Emulator

### 1. Database Setup
```bash
# Create SaltAndLite database in SQL Server
# Execute SQL/TablesAndProcs.sql to create tables and stored procedures
```

### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your SQL Server credentials

# Start development server
npm run dev
```

### 3. Frontend Setup  
```bash
cd frontend
npm install

# Start Expo development
npm start

# Run on specific platforms
npm run ios     # iOS Simulator
npm run android # Android Emulator  
npm run web     # Web Browser
```

## 📱 App Screens

### Authentication Flow
- **Login**: Username/email + password authentication
- **Register**: Account creation with email validation
- **Validation**: Email code verification (15-minute expiry)

### Main Application
- **Dashboard**: Monthly overview with income, expenses, balance, and savings rate
- **Transactions**: Expense tracking with categories, due dates, and status management
- **Income**: Paycheck tracking with gross/net amounts and tithe calculations
- **Profile**: Account management, settings, and logout

## 🔐 Security Features

- JWT token-based authentication
- Row-level security (users can only access their own data)
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- Rate limiting and CORS protection
- Password constraints (16 character limit from legacy schema)

## 📊 Database Design

### Key Tables
- **Users**: Authentication with dual ID system (Username + UserId GUID)
- **Income**: Paycheck tracking with tithe workflow management
- **Transactions**: Expense tracking with categories and bill management

### Stored Procedures
All database operations use `spbl_*` stored procedures:
- `spbl_LoginUserWithUsername/Email` - Authentication
- `spbl_InsertUser` - User registration  
- `spbl_GetUserStatsWithCategories` - Dashboard statistics
- `spbl_GetTransactionsByUserID` - Transaction retrieval
- And more... (see SQL/TablesAndProcs.sql)

## 🧑‍💻 Development Workflow

### Adding New Features
1. **Database**: Add/modify stored procedures in SQL Server
2. **Backend**: Create API routes mapping to stored procedures  
3. **Frontend**: Build React Native screens consuming the API
4. **Testing**: Test across iOS, Android, and Web platforms

### Key Development Patterns
- Backend routes map 1:1 to stored procedures
- Frontend uses React Context for state management
- All financial operations require UserID validation
- Date handling varies (VARCHAR in Income, DATETIME in Transactions)

## 🚀 Deployment

### Backend API
```bash
cd backend
npm start  # Production server
```

### Mobile Apps
```bash
cd frontend
expo build:ios     # iOS App Store
expo build:android # Google Play Store
```

### Web App
```bash
cd frontend
expo build:web     # Static web deployment
```

## 📝 Documentation

- [`/frontend/README.md`](frontend/README.md) - React Native app details
- [`/backend/README.md`](backend/README.md) - API documentation  
- [`/.github/copilot-instructions.md`](.github/copilot-instructions.md) - AI coding guidelines
- [`/SQL/TablesAndProcs.sql`](SQL/TablesAndProcs.sql) - Database schema

## 🤝 Contributing

1. Review `.github/copilot-instructions.md` for project-specific patterns
2. Follow existing code structure and naming conventions
3. Test across all platforms (iOS, Android, Web) before submitting
4. Ensure all database operations use existing stored procedures

## 📄 License

MIT License - see LICENSE file for details