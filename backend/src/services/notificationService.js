const Notification = require('../models/Notification');

async function createNotification(userId, type, options = {}) {
  const { taskId, title, meta } = options;
  const doc = await Notification.create({
    userId,
    type,
    taskId: taskId || null,
    title: title || type,
    meta: meta || null,
  });
  return doc;
}

async function getForUser(userId, { limit = 30, unreadOnly = false } = {}) {
  const q = { userId };
  if (unreadOnly) q.read = false;
  const list = await Notification.find(q)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return list;
}

async function markRead(notificationId, userId) {
  const n = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
  return n;
}

async function markAllRead(userId) {
  await Notification.updateMany({ userId }, { read: true });
  return true;
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

module.exports = {
  createNotification,
  getForUser,
  markRead,
  markAllRead,
  getUnreadCount,
};
