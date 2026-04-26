const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');
const { upload, validateGeoTags } = require('../middleware/upload');
const { analyzeReport, hashIP, analyzeMediaAuthenticity } = require('../utils/nlp');

/**
 * POST /api/reports/submit
 * Anonymous user submits a report with media
 * Media files must be images with GPS geotag data to reduce fake reports
 * Form-data: title, description, latitude, longitude, address, state, district, city, pincode, detectedMethod + media files
 */
router.post('/submit', upload.array('media', 5), validateGeoTags, async (req, res) => {
  try {
    const { title, description, latitude, longitude, address, state, district, city, pincode, detectedMethod } = req.body;

    if (!title || !description)
      return res.status(400).json({ error: 'Title and description are required.' });

    // Run NLP analysis on text content
    const aiAnalysis = analyzeReport(title, description);

    // Analyze media files for authenticity
    let mediaAnalysis = null;
    if (req.files && req.files.length > 0) {
      mediaAnalysis = analyzeMediaAuthenticity(req.files);
      
      // Merge media analysis into AI analysis
      aiAnalysis.mediaAnalysis = mediaAnalysis;
      
      // Reduce severity if images lack geotags (potential fake reports)
      if (mediaAnalysis.imagesWithoutGeoTags > 0 && mediaAnalysis.imagesWithGeoTags === 0) {
        aiAnalysis.authenticityWarning = 'Images provided without GPS metadata - elevated fake report risk';
        // Don't reject, but flag it
      }
    }

    // If spam or fake, reject silently
    if (aiAnalysis.isSpam || aiAnalysis.isFake) {
      return res.status(200).json({
        success: true,
        message: 'Report submitted.',
        reportId: 'FILTERED-' + Date.now() // fake ID so user doesn't know it's filtered
      });
    }

    // Process uploaded files
    const media = (req.files || []).map(file => ({
      type: file.mimetype.startsWith('image/') ? 'image'
        : file.mimetype.startsWith('video/') ? 'video' : 'audio',
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`
    }));

    // Hash IP for privacy
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const ipHash = hashIP(ip);

    const report = await Report.create({
      title,
      description,
      media,
      location: {
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        address, state, district, city, pincode,
        detectedMethod: detectedMethod || 'manual'
      },
      aiAnalysis,
      priority: aiAnalysis.severity,
      ipHash,
      userAgent: req.get('User-Agent')
    });

    // Create alert for authorities if Medium or Critical
    if (aiAnalysis.severity !== 'Low') {
      await Alert.create({
        type: aiAnalysis.severity === 'Critical' ? 'critical_report' : 'new_report',
        title: `${aiAnalysis.severity} Report: ${title.substring(0, 60)}`,
        message: `New ${aiAnalysis.severity.toLowerCase()} severity report from ${city || district || state || 'Unknown location'}.`,
        severity: aiAnalysis.severity === 'Critical' ? 'Critical' : 'Medium',
        relatedReport: report._id,
        relatedReportId: report.reportId,
        location: { state, district, city, latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully.',
      reportId: report.reportId,
      severity: aiAnalysis.severity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error submitting report.' });
  }
});

/**
 * GET /api/reports
 * Authority: get all reports with filters
 * Query: status, severity, state, district, from, to, page, limit
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, severity, state, district, from, to, page = 1, limit = 20, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (severity) query['aiAnalysis.severity'] = severity;
    if (state) query['location.state'] = new RegExp(state, 'i');
    if (district) query['location.district'] = new RegExp(district, 'i');
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reports, total] = await Promise.all([
      Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('assignedTo', 'name role'),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      reports,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching reports.' });
  }
});

/**
 * GET /api/reports/search/:reportId
 * Search report by reportId (human-readable ID)
 */
router.get('/search/:reportId', protect, async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId.toUpperCase() })
      .populate('assignedTo', 'name role department')
      .populate('resolvedBy', 'name role');
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/reports/:id
 * Get single report by MongoDB ID
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('assignedTo', 'name role department')
      .populate('resolvedBy', 'name role');
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PATCH /api/reports/:id/status
 * Authority: update report status
 * Body: { status, resolutionNote }
 * status: 'Under Review' | 'Resolved' | 'Dismissed'
 */
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    const validStatuses = ['Under Review', 'Resolved', 'Dismissed'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: 'Invalid status.' });

    const update = { status, updatedAt: new Date() };
    if (status === 'Resolved') {
      update.resolvedBy = req.authority._id;
      update.resolvedAt = new Date();
      update.resolutionNote = resolutionNote || '';
    }

    const report = await Report.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    res.json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating status.' });
  }
});

/**
 * PATCH /api/reports/:id/assign
 * Authority: assign report to self
 */
router.patch('/:id/assign', protect, async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { assignedTo: req.authority._id, status: 'Under Review', updatedAt: new Date() },
      { new: true }
    ).populate('assignedTo', 'name role');
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/reports/public/history
 * Public: show resolved reports (no sensitive info)
 */
router.get('/public/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reports = await Report.find({ status: 'Resolved' })
      .select('reportId title location.state location.district location.city aiAnalysis.severity aiAnalysis.category createdAt resolvedAt status')
      .sort({ resolvedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Report.countDocuments({ status: 'Resolved' });
    res.json({ success: true, reports, total });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
