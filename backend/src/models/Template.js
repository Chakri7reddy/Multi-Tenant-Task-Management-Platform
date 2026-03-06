const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, default: 'MEDIUM', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    tags: [{ type: String }],
    subtasks: [{ title: { type: String, required: true } }],
  },
  { timestamps: true }
);

templateSchema.index({ orgId: 1 });

module.exports = mongoose.model('Template', templateSchema);
