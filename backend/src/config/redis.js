const Redis = require('ioredis');
const config = require('./index');

let redis = null;
let redisSub = null;
let redisSubReady = false;
let redisErrorLogged = false;
let redisSubErrorLogged = false;

function getRedis() {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
    redis.on('error', (err) => {
      if (!redisErrorLogged) {
        redisErrorLogged = true;
        console.warn('Redis unavailable:', err.message || 'Connection failed. Real-time updates disabled.');
      }
    });
    redis.on('connect', () => {
      redisErrorLogged = false;
      console.log('Redis connected');
    });
  }
  return redis;
}

/** Separate client for subscribe only (subscriber mode cannot run publish). */
function getRedisSubscriber() {
  if (!redisSub) {
    redisSub = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
    redisSub.on('error', (err) => {
      redisSubReady = false;
      if (!redisSubErrorLogged) {
        redisSubErrorLogged = true;
        console.warn('Redis subscriber unavailable. Real-time updates disabled.');
      }
    });
    redisSub.on('ready', () => {
      redisSubReady = true;
    });
  }
  return redisSub;
}

async function redisHealth() {
  try {
    const r = getRedis();
    await r.ping();
    return true;
  } catch {
    return false;
  }
}

module.exports = { getRedis, getRedisSubscriber, redisHealth };
