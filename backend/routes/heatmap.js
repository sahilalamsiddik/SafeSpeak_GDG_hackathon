const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');

/**
 * GET /api/heatmap/data
 * Authority: Get heatmap data - all geolocated reports
 * Returns: array of { lat, lng, severity, reportId, title, address }
 */
router.get('/data', protect, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const reports = await Report.find({
      'location.latitude': { $exists: true, $ne: null },
      'location.longitude': { $exists: true, $ne: null },
      createdAt: { $gte: since },
      status: { $ne: 'Dismissed' }
    }).select('reportId title description location aiAnalysis status createdAt');

    const heatmapPoints = reports.map(r => ({
      reportId: r.reportId,
      title: r.title,
      description: r.description?.substring(0, 200),
      lat: r.location.latitude,
      lng: r.location.longitude,
      address: [r.location.city, r.location.district, r.location.state].filter(Boolean).join(', '),
      state: r.location.state,
      district: r.location.district,
      city: r.location.city,
      severity: r.aiAnalysis?.severity || 'Low',
      category: r.aiAnalysis?.category || 'Other',
      status: r.status,
      createdAt: r.createdAt
    }));

    res.json({ success: true, points: heatmapPoints, total: heatmapPoints.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching heatmap data.' });
  }
});

/**
 * GET /api/heatmap/critical
 * Authority: Get most critical active issues for display below map
 */
router.get('/critical', protect, async (req, res) => {
  try {
    const criticalReports = await Report.find({
      'aiAnalysis.severity': { $in: ['Critical', 'Medium'] },
      status: { $in: ['Pending', 'Under Review'] },
      'location.latitude': { $exists: true }
    })
      .select('reportId title description location aiAnalysis status createdAt')
      .sort({ 'aiAnalysis.severityScore': -1, createdAt: -1 })
      .limit(20);

    const issues = criticalReports.map(r => ({
      reportId: r.reportId,
      title: r.title,
      description: r.description?.substring(0, 300),
      fullAddress: [r.location.address, r.location.city, r.location.district, r.location.state, r.location.pincode]
        .filter(Boolean).join(', '),
      lat: r.location.latitude,
      lng: r.location.longitude,
      severity: r.aiAnalysis?.severity,
      severityScore: r.aiAnalysis?.severityScore,
      category: r.aiAnalysis?.category,
      status: r.status,
      createdAt: r.createdAt
    }));

    res.json({ success: true, issues });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/heatmap/report/:reportId
 * Authority: Get full details of a report by ID (for map popup click)
 */
router.get('/report/:reportId', protect, async (req, res) => {
  try {
    const report = await Report.findOne({ reportId: req.params.reportId })
      .populate('assignedTo', 'name role department')
      .populate('resolvedBy', 'name role');
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/heatmap/sample
 * Authority: Sample/seed data for India heatmap (demo purposes)
 */
router.get('/sample', protect, async (req, res) => {
  const sampleData = [
    { lat: 28.6139, lng: 77.2090, title: 'Communal tension in Shaheen Bagh', severity: 'Critical', address: 'Shaheen Bagh, New Delhi', category: 'Communal' },
    { lat: 19.0760, lng: 72.8777, title: 'Protest blockade on highway', severity: 'Medium', address: 'Andheri West, Mumbai, Maharashtra', category: 'Public Unrest' },
    { lat: 12.9716, lng: 77.5946, title: 'Property dispute turned violent', severity: 'Medium', address: 'Whitefield, Bengaluru, Karnataka', category: 'Criminal' },
    { lat: 22.5726, lng: 88.3639, title: 'Gang clash reported near market', severity: 'Critical', address: 'Ultadanga, Kolkata, West Bengal', category: 'Criminal' },
    { lat: 17.3850, lng: 78.4867, title: 'Religious procession dispute', severity: 'Medium', address: 'Secunderabad, Hyderabad, Telangana', category: 'Communal' },
    { lat: 26.8467, lng: 80.9462, title: 'Political rally clash', severity: 'Critical', address: 'Hazratganj, Lucknow, Uttar Pradesh', category: 'Political' },
    { lat: 23.0225, lng: 72.5714, title: 'Arson reported in textile area', severity: 'Critical', address: 'Dariyapur, Ahmedabad, Gujarat', category: 'Criminal' },
    { lat: 13.0827, lng: 80.2707, title: 'Flood related displacement', severity: 'Medium', address: 'Perambur, Chennai, Tamil Nadu', category: 'Natural Disaster' },
    { lat: 21.1458, lng: 79.0882, title: 'Land dispute armed conflict', severity: 'Critical', address: 'Itwari, Nagpur, Maharashtra', category: 'Criminal' },
    { lat: 30.7333, lng: 76.7794, title: 'Road rage incident', severity: 'Low', address: 'Sector 17, Chandigarh', category: 'Traffic' },
    { lat: 26.9124, lng: 75.7873, title: 'Communal unrest near bazaar', severity: 'Critical', address: 'Walled City, Jaipur, Rajasthan', category: 'Communal' },
    { lat: 25.3176, lng: 82.9739, title: 'Ghat area tension', severity: 'Medium', address: 'Dashashwamedh Ghat, Varanasi, UP', category: 'Communal' },
    { lat: 11.0168, lng: 76.9558, title: 'Factory worker strike', severity: 'Low', address: 'Peelamedu, Coimbatore, Tamil Nadu', category: 'Public Unrest' },
    { lat: 15.8497, lng: 74.4977, title: 'Border area tension', severity: 'Medium', address: 'Belagavi, Karnataka', category: 'Political' },
    { lat: 23.2599, lng: 77.4126, title: 'Bhopal slum eviction protest', severity: 'Medium', address: 'Bhanpur, Bhopal, Madhya Pradesh', category: 'Public Unrest' }
  ];

  res.json({ success: true, sampleData });
});

module.exports = router;
