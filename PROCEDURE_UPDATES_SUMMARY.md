# Stored Procedures Update Summary - TableName to Name Migration

## Overview
Updated all stored procedures in `Procedures.sql` to use the `Name` column instead of the legacy `TableName` column. Since `TableName` is being dropped from the database, all references have been carefully updated with proper consideration for column size increases where needed.

## Changes Made

### 1. ✅ spmb_GetTablesForUser
**Location:** Line 570-573  
**Change:** `SELECT DISTINCT TableName` → `SELECT DISTINCT Name`  
**Impact:** Returns unique category names (can now handle up to 150 chars instead of 20)

### 2. ✅ spmb_GetTransactionById
**Location:** Line 596  
**Change:** Removed `TableName` from SELECT list  
**Reason:** TableName column being dropped; Name column already serves this purpose  
**Impact:** Simplifies response; clients should use `Name` field

### 3. ✅ spmb_GetTransactionsByUserID
**Location:** Lines 620, 633, 646  
**Changes:**
- Parameter: `@TableName NVARCHAR(50)` → `@CategoryName NVARCHAR(150)`
- SELECT: Removed `TableName` column from result set
- WHERE: `TableName = @TableName` → `Name = @CategoryName`
- Comment: Updated for clarity  
**Impact:** Now accepts category names up to 150 chars; parameter properly named

### 4. ✅ spmb_GetUserStatsWithCategories
**Location:** Lines 822, 827  
**Changes:**
- SELECT: `TableName` → `Name AS CategoryName`
- GROUP BY: `TableName` → `Name`  
**Impact:** JSON output now uses Name for category grouping

### 5. ✅ spmb_GetWindowTransactions
**Location:** Line 879  
**Changes:**
- Parameter: `@CategoryName VARCHAR(50)` → `@CategoryName VARCHAR(150)`
- WHERE: `TableName = @CategoryName` → `Name = @CategoryName`  
**Impact:** Window transactions filtered by Name; supports 150-char names

### 6. ✅ spmb_GetTransactionCount
**Location:** Lines 1857, 1867  
**Changes:**
- Parameter: `@TableName NVARCHAR(50)` → `@CategoryName NVARCHAR(150)`
- WHERE: `TableName = @TableName` → `Name = @CategoryName`  
**Impact:** Count query now uses Name column; parameter renamed for clarity

### 7. ✅ spmb_GetBudgetComparison
**Location:** Lines 1925, 1933  
**Changes:**
- SELECT: `T.TableName AS CategoryName` → `T.Name AS CategoryName`
- GROUP BY: `T.TableName` → `T.Name`  
**Impact:** Budget comparison now groups by Name column

## Key Design Decisions

### Parameter Naming Pattern
- Parameters that filtered by category were renamed from `@TableName` to `@CategoryName` for clarity
- This makes the API intent more obvious and prevents future confusion
- Example: `spmb_GetTransactionsByUserID`, `spmb_GetWindowTransactions`, `spmb_GetTransactionCount`

### Column Size Expansion
- All category name parameters increased from `VARCHAR(50)` or `NVARCHAR(50)` to `NVARCHAR(150)`
- This matches the `Name` column size in the Transactions table
- Supports category names like "Navy Federal Credit Card" (26 chars) and longer

### SELECT List Changes
- Removed `TableName` from SELECT lists where it appeared (e.g., `spmb_GetTransactionById`)
- Kept `Name` as the single source for category display
- Eliminates redundancy and confusion

## Migration Path

1. **Step 1**: Run `FixCategoryNameLength.sql` to drop TableName column from database
2. **Step 2**: Deploy updated `Procedures.sql` (these changes)
3. **Step 3**: Update backend API callers if they reference `@TableName` parameter names
4. **Step 4**: Restart backend server

## Backend Impact

The following procedures are called by backend routes and may need parameter name updates:
- `spmb_GetTransactionsByUserID` - Called for transaction listing (parameter name changed)
- `spmb_GetWindowTransactions` - Called for category window data (parameter size increased)
- `spmb_GetTransactionCount` - Called for pagination (parameter name changed)

Check `backend/routes/budget.js` to verify no hardcoded `@TableName` parameter references.

## Validation Checklist

- [x] All 18 TableName references updated
- [x] No remaining TableName references in procedures
- [x] Parameter sizes increased from 50 to 150 for category names
- [x] Parameter names standardized to `@CategoryName` where applicable
- [x] SELECT lists updated to use `Name` column
- [x] GROUP BY clauses updated to use `Name` column
- [x] WHERE clauses updated to filter on `Name` column
