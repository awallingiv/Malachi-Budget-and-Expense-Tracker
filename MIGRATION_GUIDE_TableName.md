# TableName → Name Column Migration Guide

## 🎯 Problem
Transaction saves fail when category names exceed 20 characters (e.g., "Navy Federal Credit Card" = 26 chars) because the frontend was incorrectly using the `TableName` column (VARCHAR(20)) instead of the `Name` column (VARCHAR(150)).

## 📋 Solution
Drop the legacy `TableName` column and update all references to use the `Name` column.

## ✅ Already Completed

### Frontend Changes
- **ModernDashboard.js** (line 761): Changed `TableName: categoryInput` → `Name: categoryInput`

### Backend Changes
- **routes/budget.js**: 
  - Updated validation: `body('TableName')` → `body('Name')`
  - Updated destructuring to extract `Name` instead of `TableName`
  - Removed `TableName` parameter from `executeStoredProcedure` call
  - Changed validation limit from 20 to 150 characters

### Database Changes
- **spmb_InsertTransaction**: Removed `@TableName` parameter, removed column from INSERT statement

## 🔄 Migration Steps (TO DO)

### Step 1: Drop the TableName Column
```powershell
# Run the SQL script to drop TableName from Transactions and Categories tables
sqlcmd -S localhost -d MalachiBudget -i backend\database\FixCategoryNameLength.sql
```

### Step 2: Update Stored Procedures

**Option A (Recommended): Find & Replace in SQL Editor**
1. Open `backend/SQL/TablesAndProcs_20251128.sql` (or latest Procedures.sql)
2. Find: `TableName`
3. Replace with: `Name`
4. Review changes (should be ~20 replacements)
5. Save the file

**Option B: Manual Updates**
Update these procedures (grep found 20+ references):
- `spmb_GetTransactionsByUserID` - SELECT, GROUP BY
- `spmb_GetTransactionsByDateRange` - Parameter, WHERE clause
- `spmb_GetBudgetComparison` - SELECT, GROUP BY  
- `spmb_GetTransactionsWithPagination` - Parameter, WHERE clause
- `spmb_GetIncomeSummaryByMonth` - SELECT, GROUP BY

**Changes needed in each:**
```sql
-- SELECT clauses
OLD: SELECT TableName, ...
NEW: SELECT Name AS CategoryName, ...  -- or just Name

-- GROUP BY clauses  
OLD: GROUP BY TableName
NEW: GROUP BY Name

-- WHERE clauses
OLD: WHERE TableName = @CategoryName
NEW: WHERE Name = @CategoryName

-- Parameters (optional rename)
OLD: @TableName VARCHAR(20)
NEW: @CategoryName VARCHAR(150)  -- or keep @TableName, just different binding
```

### Step 3: Deploy Updated Procedures
```powershell
# Run the updated procedures script
sqlcmd -S localhost -d MalachiBudget -i backend\SQL\TablesAndProcs_20251128.sql
```

### Step 4: Restart Backend
```powershell
cd backend
npm start
```

### Step 5: Test Transaction Creation
1. Open the app in browser
2. Navigate to expense entry form
3. Enter a transaction with category "Navy Federal Credit Card"
4. Submit form
5. Verify 201 Created response (not 400 Bad Request)
6. Check database to confirm data saved in `Name` column

## 📊 Affected Areas

### Database
- ✅ `Transactions` table - TableName column dropped
- ✅ `Categories` table - TableName column dropped (if exists)
- 🔄 ~20 references in stored procedures

### Backend API
- ✅ POST `/api/budget/transactions` - validation updated
- ✅ `executeStoredProcedure` calls - TableName parameter removed

### Frontend
- ✅ `ModernDashboard.js` - sends Name field instead of TableName

## ⚠️ Rollback Plan
If migration fails:
1. Restore database from backup
2. Revert frontend changes:
   ```javascript
   TableName: categoryInput || 'General'  // Restore old code
   ```
3. Revert backend changes in `routes/budget.js`
4. Limit category names to 20 characters as temporary workaround

## 🧪 Validation Checklist
- [ ] FixCategoryNameLength.sql executed successfully
- [ ] TableName column no longer exists in Transactions table
- [ ] All stored procedures updated (Find/Replace or manual)
- [ ] Updated Procedures.sql deployed
- [ ] Backend server restarted
- [ ] Can create transaction with 26-char category name
- [ ] Transaction data saved correctly in Name column
- [ ] No errors in server logs
- [ ] Frontend displays categories correctly

## 📁 Files Reference
- `backend/database/FixCategoryNameLength.sql` - Drops TableName column
- `backend/database/UpdateTableNameToName.sql` - Instructions reference
- `backend/routes/budget.js` - API validation (already updated)
- `frontend/src/components/ModernDashboard.js` - Form data (already updated)
- `backend/SQL/TablesAndProcs_20251128.sql` - Procedures to update (Step 2)

## 💡 Why This Approach?
- **Eliminates Confusion**: Single source of truth (Name column)
- **Removes Limit**: 150 chars vs 20 chars
- **Simplifies Schema**: Fewer columns to maintain
- **Prevents Future Bugs**: No more field selection errors
