const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { executeStoredProcedure } = require('../config/database');
const { protect } = require('../middleware/auth');

// Get all tables/categories for a user
router.get('/tables/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📊 Getting tables for user:', userId);

    const result = await executeStoredProcedure('sprb_GetTablesForUser', {
      UserID: { type: sql.UniqueIdentifier, value: userId }
    });

    const tables = result.recordset || [];
    console.log('📋 User tables found:', tables.length);

    res.json(tables);
  } catch (error) {
    console.error('❌ Error getting user tables:', error);
    res.status(500).json({ 
      message: 'Error retrieving user tables',
      error: error.message 
    });
  }
});

// Get category windows for a user
router.get('/windows/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🪟 Getting category windows for user:', userId);

    const result = await executeStoredProcedure('sprb_GetCategoryWindows', {
      UserID: { type: sql.UniqueIdentifier, value: userId }
    });

    const windows = result.recordset || [];
    console.log('🏠 User windows found:', windows.length);

    res.json(windows);
  } catch (error) {
    console.error('❌ Error getting category windows:', error);
    res.status(500).json({ 
      message: 'Error retrieving category windows',
      error: error.message 
    });
  }
});

// Create a new category window
router.post('/windows', protect, async (req, res) => {
  try {
    const { 
      userId, 
      username,
      categoryName, 
      displayName, 
      description,
      colorTheme = 'blue',
      positionX = 100,
      positionY = 100,
      width = 400,
      height = 300,
      tableName
    } = req.body;

    console.log('🏗️ Creating category window:', { categoryName, displayName, tableName });

    const result = await executeStoredProcedure('sprb_CreateCategoryWindow', {
      UserID: { type: sql.UniqueIdentifier, value: userId },
      Username: { type: sql.VarChar(17), value: username },
      CategoryName: { type: sql.VarChar(50), value: categoryName },
      DisplayName: { type: sql.VarChar(100), value: displayName },
      Description: { type: sql.VarChar(255), value: description },
      ColorTheme: { type: sql.VarChar(20), value: colorTheme },
      PositionX: { type: sql.Int, value: positionX },
      PositionY: { type: sql.Int, value: positionY },
      Width: { type: sql.Int, value: width },
      Height: { type: sql.Int, value: height },
      TableName: { type: sql.VarChar(20), value: tableName }
    });

    const response = result.recordset[0];
    console.log('✅ Window creation result:', response);

    if (response.Success) {
      res.status(201).json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    console.error('❌ Error creating category window:', error);
    res.status(500).json({ 
      message: 'Error creating category window',
      error: error.message 
    });
  }
});

// Update category window (position, size, etc.)
router.put('/windows/:windowId', protect, async (req, res) => {
  try {
    const { windowId } = req.params;
    const { 
      userId,
      displayName,
      description,
      colorTheme,
      positionX,
      positionY,
      width,
      height,
      isMinimized,
      zIndex,
      tableName
    } = req.body;

    console.log('🔄 Updating category window:', windowId);

    const result = await executeStoredProcedure('sprb_UpdateCategoryWindow', {
      WindowID: { type: sql.UniqueIdentifier, value: windowId },
      UserID: { type: sql.UniqueIdentifier, value: userId },
      DisplayName: displayName ? { type: sql.VarChar(100), value: displayName } : undefined,
      Description: description ? { type: sql.VarChar(255), value: description } : undefined,
      ColorTheme: colorTheme ? { type: sql.VarChar(20), value: colorTheme } : undefined,
      PositionX: positionX !== undefined ? { type: sql.Int, value: positionX } : undefined,
      PositionY: positionY !== undefined ? { type: sql.Int, value: positionY } : undefined,
      Width: width !== undefined ? { type: sql.Int, value: width } : undefined,
      Height: height !== undefined ? { type: sql.Int, value: height } : undefined,
      IsMinimized: isMinimized !== undefined ? { type: sql.Bit, value: isMinimized } : undefined,
      ZIndex: zIndex !== undefined ? { type: sql.Int, value: zIndex } : undefined,
      TableName: tableName ? { type: sql.VarChar(20), value: tableName } : undefined
    });

    const response = result.recordset[0];
    console.log('✅ Window update result:', response);

    if (response.Success) {
      res.json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    console.error('❌ Error updating category window:', error);
    res.status(500).json({ 
      message: 'Error updating category window',
      error: error.message 
    });
  }
});

// Delete category window
router.delete('/windows/:windowId', protect, async (req, res) => {
  try {
    const { windowId } = req.params;
    const { userId } = req.body;

    console.log('🗑️ Deleting category window:', windowId);

    const result = await executeStoredProcedure('sprb_DeleteCategoryWindow', {
      WindowID: { type: sql.UniqueIdentifier, value: windowId },
      UserID: { type: sql.UniqueIdentifier, value: userId }
    });

    const response = result.recordset[0];
    console.log('✅ Window deletion result:', response);

    if (response.Success) {
      res.json(response);
    } else {
      res.status(400).json(response);
    }
  } catch (error) {
    console.error('❌ Error deleting category window:', error);
    res.status(500).json({ 
      message: 'Error deleting category window',
      error: error.message 
    });
  }
});

module.exports = router;