const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, required: true, enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    priority: { type: String, default: 'MEDIUM', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dueDate: { type: Date },
    tags: [{ type: String, trim: true }],
    subtasks: [{ title: { type: String, required: true }, done: { type: Boolean, default: false } }],
    attachments: [{ url: { type: String, required: true }, name: { type: String }, contentType: { type: String } }],
  },
  { timestamps: true }
);

taskSchema.index({ orgId: 1 });
taskSchema.index({ orgId: 1, status: 1 });
taskSchema.index({ orgId: 1, priority: 1 });
taskSchema.index({ orgId: 1, tags: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
