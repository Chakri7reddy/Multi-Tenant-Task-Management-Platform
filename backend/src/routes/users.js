const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const User = require('../models/User');
const { apiLimiter } = require('../middleware/rateLimit');
const { uploadAvatar } = require('../middleware/upload');

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash -refreshTokenHash -resetPasswordToken -resetPasswordExpires').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/me', async (req, res) => {
  try {
    const { notificationPrefs } = req.body;
    const update = {};
    if (notificationPrefs && typeof notificationPrefs === 'object') {
      if (typeof notificationPrefs.emailOnAssign === 'boolean') update['notificationPrefs.emailOnAssign'] = notificationPrefs.emailOnAssign;
      if (typeof notificationPrefs.emailOnDue === 'boolean') update['notificationPrefs.emailOnDue'] = notificationPrefs.emailOnDue;
    }
    if (Object.keys(update).length === 0) return res.json(await User.findById(req.user._id).select('-passwordHash -refreshTokenHash').lean());
    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true })
      .select('-passwordHash -refreshTokenHash -resetPasswordToken -resetPasswordExpires')
      .lean();
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/me/avatar', uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { avatarUrl });
    return res.json({ avatarUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/me/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const users = await User.find({ orgId: req.orgId })
      .select('-passwordHash -refreshTokenHash')
      .lean();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      orgId: req.orgId,
      email,
      passwordHash,
      role: role || 'USER',
    });
    return res.status(201).json({
      id: user._id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
