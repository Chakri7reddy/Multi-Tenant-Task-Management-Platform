const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

function isValidObjectId(value) {
  if (typeof value !== 'string' || value.length !== 24) return false;
  return /^[0-9a-fA-F]{24}$/.test(value);
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { orgName, email, password } = req.body;
    if (!orgName || !email || !password) {
      return res.status(400).json({ error: 'orgName, email and password required' });
    }
    const { org, user } = await authService.registerOrgAndUser(orgName, email, password);
    const loginResult = await authService.login(email, password, org._id);
    return res.status(201).json({
      org: { id: org._id, name: org.name },
      ...loginResult,
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists in this org' });
    return res.status(500).json({ error: err.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, orgId } = req.body;
    if (!email || !password || !orgId) {
      return res.status(400).json({ error: 'email, password and orgId required' });
    }
    if (!isValidObjectId(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID. Use the 24-character ID from your dashboard.' });
    }
    const result = await authService.login(email, password, orgId);
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const result = await authService.refreshTokens(refreshToken);
    if (!result) return res.status(401).json({ error: 'Invalid or expired refresh token' });
    return res.json(result);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', authMiddleware, authLimiter, async (req, res) => {
  await authService.logout(req.user._id);
  return res.json({ ok: true });
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email, orgId } = req.body;
    if (!email || !orgId) return res.status(400).json({ error: 'email and orgId required' });
    if (!isValidObjectId(orgId)) return res.status(400).json({ error: 'Invalid organization ID' });
    const result = await authService.requestPasswordReset(email, orgId);
    if (!result) return res.status(404).json({ error: 'User not found' });
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${result.token}`;
    return res.json({ ok: true, resetUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const ok = await authService.resetPassword(token, newPassword);
    if (!ok) return res.status(400).json({ error: 'Invalid or expired reset token' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/lookup-org', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const orgs = await authService.lookupOrgByCredentials(email, password);
    if (!orgs) return res.status(401).json({ error: 'Invalid email or password' });
    return res.json({ orgs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
