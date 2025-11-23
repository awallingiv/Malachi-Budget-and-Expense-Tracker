# ReactBudget Backend

Node.js backend API for the ReactBudget personal finance application.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Update database credentials in `.env`:
     ```
     DB_SERVER=your_sql_server_host
     DB_USER=your_db_username
     DB_PASSWORD=your_db_password
     ```

3. **Database Requirements**
   - SQL Server instance with `SaltAndLite` database
   - All stored procedures from `../SQL/TablesAndProcs.sql` must be installed
   - Database user needs EXECUTE permissions on `spbl_*` procedures

## Development

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run tests
npm test
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /validate` - Validate user with email code
- `POST /login` - User login
- `POST /forgot-password` - Request password reset

### Budget Management (`/api/budget`)
- `GET /dashboard/:userId` - Get dashboard statistics
- `GET /transactions/:userId` - Get user transactions
- `POST /transactions` - Create transaction
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction
- `GET /income/:userId` - Get user income records
- `POST /income` - Create income record

### User Management (`/api/user`)
- `GET /:userId` - Get user profile
- `PUT /:userId` - Update user profile
- `PUT /:userId/password` - Change password
- `DELETE /:userId` - Delete account

## Database Integration

The API connects to SQL Server using stored procedures:
- All database operations use the existing `spbl_*` stored procedures
- Connection pooling for optimal performance
- Row-level security enforced via `UserID` parameters

## Security Features

- JWT authentication
- Request rate limiting
- Input validation
- SQL injection prevention via parameterized queries
- CORS protection
- Helmet security headers