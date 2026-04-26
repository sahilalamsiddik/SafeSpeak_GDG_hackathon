const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Alert = require('../models/Alert');
const ResolvePost = require('../models/ResolvePost');
const { protect } = require('../middleware/auth');
const { detectHotspot } = require('../utils/nlp');

/**
 * GET /api/dashboard/stats
 * Authority: Main dashboard statistics
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const last5d = new Date(now - 5 * 24 * 60 * 60 * 1000);
    const [
      totalReports,
      pendingReports,
      underReview,
      resolvedReports,
      dismissedReports,
      criticalReports,
      reportsLast24h,
      reportsLast7d,
      openReports,
      recentOpenReportsLast5Days,
      unreadAlerts,
      communityPosts
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: 'Pending' }),
      Report.countDocuments({ status: 'Under Review' }),
      Report.countDocuments({ status: 'Resolved' }),
      Report.countDocuments({ status: 'Dismissed' }),
      Report.countDocuments({ 'aiAnalysis.severity': 'Critical', status: { $ne: 'Dismissed' } }),
      Report.countDocuments({ createdAt: { $gte: last24h } }),
      Report.countDocuments({ createdAt: { $gte: last7d } }),
      Report.countDocuments({ status: { $ne: 'Resolved' } }),
      Report.countDocuments({ status: { $ne: 'Resolved' }, createdAt: { $gte: last5d } }),
      Alert.countDocuments({ isRead: false }),
      ResolvePost.countDocuments({ status: 'Active' })
    ]);

    // Severity distribution
    const severityDistribution = await Report.aggregate([
      { $group: { _id: '$aiAnalysis.severity', count: { $sum: 1 } } }
    ]);

    // Category distribution
    const categoryDistribution = await Report.aggregate([
      { $group: { _id: '$aiAnalysis.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // State-wise distribution (top 10)
    const stateDistribution = await Report.aggregate([
      { $match: { 'location.state': { $exists: true, $ne: null } } },
      { $group: { _id: '$location.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Reports trend (last 7 days)
    const dailyTrend = await Report.aggregate([
      { $match: { createdAt: { $gte: last7d } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Recent critical reports
    const recentCritical = await Report.find({
      'aiAnalysis.severity': 'Critical',
      status: { $in: ['Pending', 'Under Review'] }
    })
      .select('reportId title location aiAnalysis status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Hotspot detection
    const allRecentReports = await Report.find({ createdAt: { $gte: last30d } })
      .select('location aiAnalysis');
    const hotspots = detectHotspot(allRecentReports);

    res.json({
      success: true,
      stats: {
        totalReports,
        activeReports: pendingReports + underReview,
        pendingReports,
        underReview,
        resolvedReports,
        dismissedReports,
        criticalReports,
        reportsLast24h,
        reportsLast7d,
        openReports,
        recentOpenReportsLast5Days,
        unreadAlerts,
        communityPosts
      },
      charts: {
        severityDistribution,
        categoryDistribution,
        stateDistribution,
        dailyTrend
      },
      recentCritical,
      hotspots
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching dashboard stats.' });
  }
});

module.exports = router;
