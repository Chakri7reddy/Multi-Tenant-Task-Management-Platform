require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

function getFrontendOrigins() {
  const url = process.env.FRONTEND_URL || 'http://localhost:5173';
  return url.split(',').map((u) => u.trim()).filter(Boolean);
}

function validateProduction() {
  if (!isProd) return;
  const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'FRONTEND_URL'];
  const missing = required.filter((k) => !process.env[k] || process.env[k].includes('change-me'));
  if (missing.length) {
    console.error('Production requires:', missing.join(', '));
    process.exit(1);
  }
}

validateProduction();

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/taskplatform',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  frontendOrigins: getFrontendOrigins(),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret-min-32-chars',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret-min-32-chars',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  cache: {
    taskTtlSeconds: 300, // 5 minutes
  },
};
