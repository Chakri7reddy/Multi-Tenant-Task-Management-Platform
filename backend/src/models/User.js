const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    email: { type: String, required: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['ADMIN', 'MANAGER', 'USER'] },
    refreshTokenHash: { type: String },
    avatarUrl: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    notificationPrefs: {
      emailOnAssign: { type: Boolean, default: true },
      emailOnDue: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.index({ orgId: 1 });
userSchema.index({ orgId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
