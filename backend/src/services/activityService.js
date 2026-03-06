const Activity = require('../models/Activity');

async function log(taskId, userId, action, payload = null) {
  const doc = await Activity.create({
    taskId,
    userId,
    action,
    payload: payload || undefined,
  });
  return doc;
}

async function getByTaskId(taskId, orgId, limit = 20) {
  const Task = require('../models/Task');
  const task = await Task.findOne({ _id: taskId, orgId }).lean();
  if (!task) return null;
  const list = await Activity.find({ taskId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'email')
    .lean();
  return list;
}

module.exports = { log, getByTaskId };
