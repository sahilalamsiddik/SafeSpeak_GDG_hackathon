const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

/**
 * GET /api/alerts
 * Authority: Get all alerts
 * Query: isRead, severity, page, limit
 */
router.get('/', protect, async (req, res) => {
  try {
    const { isRead, severity, page = 1, limit = 30 } = req.query;
    const query = {};
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (severity) query.severity = severity;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [alerts, total, unreadCount] = await Promise.all([
      Alert.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Alert.countDocuments(query),
      Alert.countDocuments({ isRead: false })
    ]);

    res.json({ success: true, alerts, total, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PATCH /api/alerts/:id/read
 * Mark a single alert as read
 */
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true, $addToSet: { readBy: req.authority._id } },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PATCH /api/alerts/mark-all-read
 * Mark all alerts as read
 */
router.patch('/mark-all-read', protect, async (req, res) => {
  try {
    await Alert.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All alerts marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
