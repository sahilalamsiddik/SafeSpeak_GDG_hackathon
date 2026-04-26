const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Alert = require('../models/Alert');
const { analyzeReport, hashIP } = require('../utils/nlp');

/**
 * POST /api/resolve-space/posts
 * Anonymous user creates a community post (Saved as a Report)
 * Body: { title, description, address, state, district, city }
 */
router.post('/posts', async (req, res) => {
  try {
    const { title, description, address, state, district, city } = req.body;
    if (!title || !description)
      return res.status(400).json({ error: 'Title and description are required.' });

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const ipHash = hashIP(ip);

    // NLP analysis
    const aiAnalysis = analyzeReport(title, description);
    if (aiAnalysis.isSpam) {
      return res.json({ success: true, message: 'Post submitted.', postId: 'POST-FILTERED' });
    }

    // Check for similar posts (duplicate detection for tolerance system)
    const similarPost = await Report.findOne({
      'location.district': district,
      status: { $in: ['Pending', 'Under Review'] },
      title: new RegExp(title.substring(0, 30), 'i')
    });

    if (similarPost) {
      // Increment tolerance count on similar post
      similarPost.toleranceCount += 1;

      // If tolerance >= 4, escalate to higher authority
      if (similarPost.toleranceCount >= 4 && !similarPost.escalatedToHigherAuthority) {
        similarPost.escalatedToHigherAuthority = true;
        similarPost.escalatedAt = new Date();

        // Create alert for higher authority
        await Alert.create({
          type: 'escalation',
          title: `Repeated Issue Escalated: ${title.substring(0, 60)}`,
          message: `Issue "${title}" has been reported 4+ times in ${city || district}. Higher authority notified.`,
          severity: 'High',
          location: { state, district, city }
        });
      }

      await similarPost.save();
      return res.json({
        success: true,
        message: 'Similar issue noted. Your concern has been counted.',
        postId: similarPost.reportId,
        toleranceCount: similarPost.toleranceCount,
        escalated: similarPost.escalatedToHigherAuthority
      });
    }

    const post = await Report.create({
      title, description,
      location: { address, state, district, city },
      aiAnalysis,
      priority: aiAnalysis.severity,
      ipHash,
      status: 'Pending'
    });

    res.status(201).json({ success: true, post: sanitizePost(post) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/resolve-space/posts
 * Get all active community posts (public)
 * Query: state, district, page, limit
 */
router.get('/posts', async (req, res) => {
  try {
    const { state, district, page = 1, limit = 20 } = req.query;
    const query = { status: { $ne: 'Dismissed' }, 'aiAnalysis.isSpam': false };
    if (state) query['location.state'] = new RegExp(state, 'i');
    if (district) query['location.district'] = new RegExp(district, 'i');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [posts, total] = await Promise.all([
      Report.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      posts: posts.map(p => sanitizePost(p)),
      pagination: { total, page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/resolve-space/posts/:postId
 * Get single post with replies
 */
router.get('/posts/:postId', async (req, res) => {
  try {
    const post = await Report.findOne({ reportId: req.params.postId });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json({ success: true, post: sanitizePost(post, true) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/resolve-space/posts/:postId/like
 * Toggle like on a post (anonymous, deduplicated by IP hash)
 */
router.post('/posts/:postId/like', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const ipHash = hashIP(ip);

    const post = await Report.findOne({ reportId: req.params.postId });
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const alreadyLiked = post.likes && post.likes.includes(ipHash);
    if (alreadyLiked) {
      post.likes = post.likes.filter(h => h !== ipHash);
      post.likeCount = Math.max(0, (post.likeCount || 1) - 1);
    } else {
      if (!post.likes) post.likes = [];
      post.likes.push(ipHash);
      post.likeCount = (post.likeCount || 0) + 1;
    }

    await post.save();
    res.json({ success: true, liked: !alreadyLiked, likeCount: post.likeCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/resolve-space/posts/:postId/reply
 * Add anonymous reply to a post
 * Body: { content }
 */
router.post('/posts/:postId/reply', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || content.trim().length < 2)
      return res.status(400).json({ error: 'Reply content is required.' });

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const ipHash = hashIP(ip);

    const post = await Report.findOne({ reportId: req.params.postId, status: { $ne: 'Dismissed' } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const reply = { content: content.trim().substring(0, 1000), ipHash };
    if (!post.replies) post.replies = [];
    post.replies.push(reply);
    await post.save();

    // Return sanitized reply (no IP hash)
    const savedReply = post.replies[post.replies.length - 1];
    res.status(201).json({
      success: true,
      reply: { _id: savedReply._id, content: savedReply.content, createdAt: savedReply.createdAt }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/resolve-space/history
 * Public history of all posts (active + resolved)
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const posts = await Report.find()
      .select('-ipHash -likes -replies.ipHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Report.countDocuments();
    res.json({ success: true, posts, total });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Remove private fields from post for public display
function sanitizePost(post, includeReplies = false) {
  const obj = post.toObject ? post.toObject() : post;
  obj.postId = obj.reportId; // Map reportId to postId for frontend compatibility
  obj.escalated = obj.escalatedToHigherAuthority; // Map to frontend expected key
  delete obj.ipHash;
  delete obj.likes; // don't expose like IP hashes
  if (includeReplies && obj.replies) {
    obj.replies = obj.replies.map(r => ({
      _id: r._id,
      content: r.content,
      createdAt: r.createdAt
    }));
  } else {
    delete obj.replies;
    obj.replyCount = post.replies?.length || 0;
  }
  return obj;
}

module.exports = router;
