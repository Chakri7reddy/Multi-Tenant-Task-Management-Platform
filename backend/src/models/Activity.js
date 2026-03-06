const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // 'created', 'updated', 'status_changed', 'assigned', 'comment_added'
    payload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

activitySchema.index({ taskId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
