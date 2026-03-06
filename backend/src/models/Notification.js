const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // 'task_assigned', 'task_created', 'task_updated', 'comment', etc.
    read: { type: Boolean, default: false },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    title: { type: String }, // short message
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
