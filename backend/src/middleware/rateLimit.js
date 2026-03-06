const rateLimit = require('express-rate-limit');
const { getRedis } = require('../config/redis');

function createRateLimiter(windowMs, max, keyPrefix = 'rl') {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    keyGenerator: (req) => {
      const userId = req.user?.id || req.ip;
      return `${keyPrefix}:${userId}`;
    },
  });
}

const authLimiter = createRateLimiter(15 * 60 * 1000, 20, 'auth');
const apiLimiter = createRateLimiter(60 * 1000, 100, 'api');

module.exports = { authLimiter, apiLimiter };
