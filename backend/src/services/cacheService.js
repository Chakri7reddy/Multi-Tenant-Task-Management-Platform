const { getRedis } = require('../config/redis');
const config = require('../config');

const TASK_CACHE_PREFIX = 'task:';
const TASK_LIST_PREFIX = 'tasklist:';
const TTL = config.cache.taskTtlSeconds;

async function getCachedTask(taskId) {
  try {
    const redis = getRedis();
    const key = TASK_CACHE_PREFIX + taskId;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setCachedTask(task) {
  try {
    const redis = getRedis();
    const key = TASK_CACHE_PREFIX + task._id.toString();
    await redis.setex(key, TTL, JSON.stringify(task));
  } catch {
    // ignore
  }
}

async function invalidateTask(taskId) {
  try {
    const redis = getRedis();
    await redis.del(TASK_CACHE_PREFIX + taskId);
  } catch {
    // ignore
  }
}

async function getCachedTaskList(orgId, status) {
  try {
    const redis = getRedis();
    const key = TASK_LIST_PREFIX + orgId + (status ? `:${status}` : '');
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setCachedTaskList(orgId, tasks, status) {
  try {
    const redis = getRedis();
    const key = TASK_LIST_PREFIX + orgId + (status ? `:${status}` : '');
    await redis.setex(key, TTL, JSON.stringify(tasks));
  } catch {
    // ignore
  }
}

async function invalidateTaskList(orgId) {
  try {
    const redis = getRedis();
    const pattern = TASK_LIST_PREFIX + orgId + '*';
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch {
    // ignore
  }
}

module.exports = {
  getCachedTask,
  setCachedTask,
  invalidateTask,
  getCachedTaskList,
  setCachedTaskList,
  invalidateTaskList,
};
