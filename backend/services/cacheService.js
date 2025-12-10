/**
 * Redis Cache Service
 * Provides caching functionality with graceful degradation when Redis is unavailable
 */

const Redis = require('ioredis');

// Cache TTL constants (in seconds)
const TTL = {
  DASHBOARD_STATS: 300,      // 5 minutes
  GROUPINGS: 600,            // 10 minutes
  CATEGORIES: 1800,          // 30 minutes
  PREFERENCES: 1800,         // 30 minutes
  RECENT_TRANSACTIONS: 60    // 60 seconds
};

// Redis client instance
let redis = null;
let isConnected = false;
let errorLogged = false; // Track if we've already logged connection errors

/**
 * Initialize Redis connection
 */
const initializeRedis = () => {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisEnabled = process.env.REDIS_ENABLED !== 'false';

  if (!redisEnabled) {
    if (!errorLogged) {
      console.log('⚠️ Redis caching disabled via REDIS_ENABLED=false');
      errorLogged = true;
    }
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected');
      isConnected = true;
      errorLogged = false; // Reset error flag on successful connection
    });

    redis.on('error', (err) => {
      if (!errorLogged) {
        console.error('❌ Redis error:', err.message);
        console.log('⚠️ Redis caching disabled - app will continue without cache');
        errorLogged = true;
      }
      isConnected = false;
    });

    redis.on('close', () => {
      if (!errorLogged) {
        console.log('⚠️ Redis connection closed - caching disabled');
        errorLogged = true;
      }
      isConnected = false;
    });

    // Attempt connection
    redis.connect().catch((err) => {
      if (!errorLogged) {
        console.error('❌ Redis connection failed:', err.message);
        console.log('⚠️ Continuing without Redis cache - all features will work normally');
        errorLogged = true;
      }
      isConnected = false;
    });

    return redis;
  } catch (error) {
    if (!errorLogged) {
      console.error('❌ Redis initialization failed:', error.message);
      errorLogged = true;
    }
    return null;
  }
};

/**
 * Generate a consistent cache key
 * @param {string} prefix - Key prefix (e.g., 'dashboard', 'groupings')
 * @param {string} userId - User ID
 * @param {...string} parts - Additional key parts
 * @returns {string} Cache key
 */
const generateKey = (prefix, userId, ...parts) => {
  const keyParts = [prefix, userId, ...parts].filter(Boolean);
  return keyParts.join(':');
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Parsed value or null if not found/error
 */
const get = async (key) => {
  if (!redis || !isConnected) return null;

  try {
    const value = await redis.get(key);
    if (value) {
      console.log(`📦 Cache HIT: ${key}`);
      return JSON.parse(value);
    }
    console.log(`📭 Cache MISS: ${key}`);
    return null;
  } catch (error) {
    console.error(`❌ Cache get error for ${key}:`, error.message);
    return null;
  }
};

/**
 * Set value in cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
const set = async (key, value, ttlSeconds) => {
  if (!redis || !isConnected) return false;

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    console.log(`💾 Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
    return true;
  } catch (error) {
    console.error(`❌ Cache set error for ${key}:`, error.message);
    return false;
  }
};

/**
 * Delete a single cache key
 * @param {string} key - Cache key to delete
 * @returns {Promise<boolean>} Success status
 */
const del = async (key) => {
  if (!redis || !isConnected) return false;

  try {
    const result = await redis.del(key);
    console.log(`🗑️ Cache DEL: ${key} (deleted: ${result})`);
    return result > 0;
  } catch (error) {
    console.error(`❌ Cache del error for ${key}:`, error.message);
    return false;
  }
};

/**
 * Delete all cache keys matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'dashboard:*:userId')
 * @returns {Promise<number>} Number of keys deleted
 */
const invalidatePattern = async (pattern) => {
  if (!redis || !isConnected) return 0;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) {
      console.log(`🔍 No keys found for pattern: ${pattern}`);
      return 0;
    }

    const result = await redis.del(...keys);
    console.log(`🗑️ Cache INVALIDATE pattern: ${pattern} (deleted: ${result} keys)`);
    return result;
  } catch (error) {
    console.error(`❌ Cache invalidatePattern error for ${pattern}:`, error.message);
    return 0;
  }
};

/**
 * Invalidate all cache for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of keys deleted
 */
const invalidateUserCache = async (userId) => {
  return invalidatePattern(`*:${userId}:*`);
};

/**
 * Check if Redis is connected and available
 * @returns {boolean} Connection status
 */
const isAvailable = () => {
  return redis !== null && isConnected;
};

/**
 * Close Redis connection
 */
const close = async () => {
  if (redis) {
    await redis.quit();
    redis = null;
    isConnected = false;
    console.log('🔌 Redis connection closed');
  }
};

// Initialize Redis on module load
initializeRedis();

module.exports = {
  TTL,
  generateKey,
  get,
  set,
  del,
  invalidatePattern,
  invalidateUserCache,
  isAvailable,
  close
};
