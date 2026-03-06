const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const User = require('../models/User');
const Organization = require('../models/Organization');

const SALT_ROUNDS = 10;

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function registerOrgAndUser(orgName, email, password, role = 'ADMIN') {
  const org = await Organization.create({ name: orgName, plan: 'enterprise' });
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    orgId: org._id,
    email,
    passwordHash,
    role,
  });
  return { org, user };
}

async function login(email, password, orgId) {
  const user = await User.findOne({ orgId, email });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  const accessToken = jwt.sign(
    { userId: user._id.toString() },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );
  const refreshToken = jwt.sign(
    { userId: user._id.toString(), type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );

  const refreshTokenHash = hashRefreshToken(refreshToken);
  await User.findByIdAndUpdate(user._id, { refreshTokenHash });

  return {
    user: { id: user._id, email: user.email, role: user.role, orgId: user.orgId },
    accessToken,
    refreshToken,
    expiresIn: config.jwt.accessExpiry,
  };
}

async function refreshTokens(refreshToken) {
  const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  if (decoded.type !== 'refresh') return null;

  const user = await User.findById(decoded.userId);
  if (!user || !user.refreshTokenHash) return null;
  const hash = hashRefreshToken(refreshToken);
  if (hash !== user.refreshTokenHash) return null;

  const newAccessToken = jwt.sign(
    { userId: user._id.toString() },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );
  const newRefreshToken = jwt.sign(
    { userId: user._id.toString(), type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );
  await User.findByIdAndUpdate(user._id, { refreshTokenHash: hashRefreshToken(newRefreshToken) });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: config.jwt.accessExpiry,
  };
}

async function logout(userId) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  return true;
}

async function requestPasswordReset(email, orgId) {
  const user = await User.findOne({ email, orgId });
  if (!user) return null;
  const token = crypto.randomBytes(32).toString('hex');
  await User.findByIdAndUpdate(user._id, {
    resetPasswordToken: token,
    resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
  });
  return { token, userId: user._id };
}

async function resetPassword(token, newPassword) {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) return null;
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await User.findByIdAndUpdate(user._id, {
    passwordHash,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });
  return true;
}

async function lookupOrgByCredentials(email, password) {
  const users = await User.find({ email: (email || '').toLowerCase().trim() }).populate('orgId', 'name');
  if (!users.length) return null;
  const matches = [];
  for (const user of users) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (ok && user.orgId) {
      matches.push({
        orgId: user.orgId._id.toString(),
        orgName: user.orgId.name || 'Organization',
      });
    }
  }
  return matches.length > 0 ? matches : null;
}

module.exports = {
  registerOrgAndUser,
  login,
  refreshTokens,
  logout,
  requestPasswordReset,
  resetPassword,
  lookupOrgByCredentials,
  hashRefreshToken,
};
