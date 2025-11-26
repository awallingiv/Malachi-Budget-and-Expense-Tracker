const jwt = require('jsonwebtoken');
const { executeStoredProcedure, sql } = require('../config/database');

/**
 * Middleware to protect routes that require authentication
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const result = await executeStoredProcedure('sprb_GetUserById', {
        UserId: { type: sql.UniqueIdentifier, value: decoded.userId }
      });

      if (!result.recordset || result.recordset.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized, user not found'
        });
      }

      const user = result.recordset[0];
      
      // Check if user is validated
      if (!user.Validated) {
        return res.status(401).json({
          success: false,
          error: 'Account not validated'
        });
      }

      req.user = {
        UserId: user.UserId,
        Username: user.Username,
        Email: user.Email,
        Name: user.Name
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized, no token'
    });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

/**
 * Middleware to validate user ownership of resources
 */
const validateOwnership = (req, res, next) => {
  // Check if the requested resource belongs to the authenticated user
  const requestedUserId = req.params.userId || req.body.userId || req.body.UserID;
  
  if (requestedUserId && requestedUserId !== req.user.UserId) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this resource'
    });
  }
  
  next();
};

module.exports = {
  protect,
  generateToken,
  validateOwnership
};