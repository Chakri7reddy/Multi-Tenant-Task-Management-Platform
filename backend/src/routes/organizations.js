const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Organization = require('../models/Organization');
const { apiLimiter } = require('../middleware/rateLimit');

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/me', async (req, res) => {
  try {
    const org = await Organization.findById(req.orgId).lean();
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    return res.json(org);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
