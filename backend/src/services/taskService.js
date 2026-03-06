const Task = require('../models/Task');
const cache = require('./cacheService');
const { getRedis } = require('../config/redis');

const CHANNEL_TASK = 'task:updates';

function publishTaskUpdate(orgId, payload) {
  try {
    const redis = getRedis();
    redis.publish(CHANNEL_TASK, JSON.stringify({ orgId, ...payload }));
  } catch {
    // ignore
  }
}

async function getTasksByOrg(orgId, options = {}) {
  const { status, assignedTo, priority, tags, sort = '-createdAt' } = options;
  const cacheKey = !assignedTo && !priority && !tags?.length ? [orgId, status].join(':') : null;
  if (cacheKey) {
    const cached = await cache.getCachedTaskList(orgId, status);
    if (cached) return cached;
  }

  const filter = { orgId };
  if (status) filter.status = status;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (priority) filter.priority = priority;
  if (tags && tags.length) filter.tags = { $in: tags };

  const sortObj = sort === 'dueDate' ? { dueDate: 1, createdAt: -1 } : sort === '-dueDate' ? { dueDate: -1, createdAt: -1 } : { createdAt: -1 };
  const tasks = await Task.find(filter)
    .populate('assignedTo', 'email')
    .sort(sortObj)
    .lean();

  if (cacheKey) await cache.setCachedTaskList(orgId, tasks, status);
  return tasks;
}

async function getTaskById(taskId, orgId) {
  const cached = await cache.getCachedTask(taskId);
  if (cached && cached.orgId?.toString() === orgId) return cached;

  const task = await Task.findOne({ _id: taskId, orgId })
    .populate('assignedTo', 'email')
    .lean();
  if (task) await cache.setCachedTask(task);
  return task;
}

async function createTask(orgId, data) {
  const payload = { ...data };
  if (payload.dueDate && !(payload.dueDate instanceof Date)) payload.dueDate = new Date(payload.dueDate);
  const task = await Task.create({ orgId, ...payload });
  await cache.invalidateTaskList(orgId);
  publishTaskUpdate(orgId, { event: 'created', task });
  return task;
}

async function updateTask(taskId, orgId, data) {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, orgId },
    { $set: data },
    { new: true }
  )
    .populate('assignedTo', 'email')
    .lean();
  if (!task) return null;
  await cache.invalidateTask(taskId);
  await cache.invalidateTaskList(orgId);
  publishTaskUpdate(orgId, { event: 'updated', task });
  return task;
}

async function deleteTask(taskId, orgId) {
  const deleted = await Task.findOneAndDelete({ _id: taskId, orgId });
  if (!deleted) return false;
  await cache.invalidateTask(taskId);
  await cache.invalidateTaskList(orgId);
  publishTaskUpdate(orgId, { event: 'deleted', taskId });
  return true;
}

module.exports = {
  getTasksByOrg,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  publishTaskUpdate,
  CHANNEL_TASK,
};
