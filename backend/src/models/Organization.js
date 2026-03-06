const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    plan: { type: String, default: 'enterprise', enum: ['starter', 'enterprise'] },
    logoUrl: { type: String },
  },
  { timestamps: true }
);

organizationSchema.index({ name: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
