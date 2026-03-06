const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const { apiLimiter } = require('../middleware/rateLimit');

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const unreadOnly = req.query.unread === 'true';
    const list = await notificationService.getForUser(req.user._id, { limit, unreadOnly });
    const unreadCount = await notificationService.getUnreadCount(req.user._id);
    return res.json({ list, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const n = await notificationService.markRead(req.params.id, req.user._id);
    if (!n) return res.status(404).json({ error: 'Notification not found' });
    return res.json(n);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/read-all', async (req, res) => {
  try {
    await notificationService.markAllRead(req.user._id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
