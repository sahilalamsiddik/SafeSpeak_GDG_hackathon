const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');

/**
 * GET /api/cases/active
 * Authority: Get all active (Pending + Under Review) cases
 */
router.get('/active', protect, async (req, res) => {
  try {
    const cases = await Report.find({ status: { $in: ['Pending', 'Under Review'] } })
      .select('reportId title location aiAnalysis status assignedTo createdAt updatedAt')
      .populate('assignedTo', 'name role')
      .sort({ 'aiAnalysis.severityScore': -1, createdAt: -1 });
    res.json({ success: true, cases, total: cases.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/cases/resolved
 * Authority: Get all resolved cases
 */
router.get('/resolved', protect, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [cases, total] = await Promise.all([
      Report.find({ status: 'Resolved' })
        .select('reportId title location aiAnalysis status resolvedBy resolvedAt resolutionNote createdAt')
        .populate('resolvedBy', 'name role')
        .sort({ resolvedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments({ status: 'Resolved' })
    ]);
    res.json({ success: true, cases, total });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/cases/all
 * Authority: Get all records (all statuses)
 */
router.get('/all', protect, async (req, res) => {
  try {
    const { page = 1, limit = 30, status, severity } = req.query;
    const query = {};
    if (status) query.status = status;
    if (severity) query['aiAnalysis.severity'] = severity;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [cases, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedTo', 'name role')
        .populate('resolvedBy', 'name role'),
      Report.countDocuments(query)
    ]);
    res.json({ success: true, cases, total, pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PATCH /api/cases/:id/resolve
 * Mark a case as resolved
 * Body: { resolutionNote }
 */
router.patch('/:id/resolve', protect, async (req, res) => {
  try {
    const { resolutionNote } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Resolved',
        resolvedBy: req.authority._id,
        resolvedAt: new Date(),
        resolutionNote: resolutionNote || 'Resolved by authority.',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('resolvedBy', 'name role');

    if (!report) return res.status(404).json({ error: 'Case not found.' });
    res.json({ success: true, message: 'Case marked as resolved.', report });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PATCH /api/cases/:id/dismiss
 * Dismiss a case
 * Body: { resolutionNote }
 */
router.patch('/:id/dismiss', protect, async (req, res) => {
  try {
    const { resolutionNote } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status: 'Dismissed', resolutionNote: resolutionNote || '', updatedAt: new Date() },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: 'Case not found.' });
    res.json({ success: true, message: 'Case dismissed.', report });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
