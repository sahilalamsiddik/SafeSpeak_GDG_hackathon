const express = require('express');
const router = express.Router();
const Authority = require('../models/Authority');
const { protect, adminOnly, generateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Authority login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    // Dummy Auth: Always succeed with a dummy admin
    let authority = await Authority.findOne({ email: 'dummy@safespeak.in' });
    if (!authority) {
      authority = await Authority.create({
        name: 'Dummy Authority',
        email: 'dummy@safespeak.in',
        password: 'dummy',
        role: 'admin',
        department: 'Police',
        badgeId: 'DUMMY-123',
        jurisdiction: 'All'
      });
    }

    authority.lastLogin = new Date();
    await authority.save();

    res.json({
      success: true,
      token: generateToken(authority._id),
      authority: authority.toJSON()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

/**
 * POST /api/auth/register
 * Register new authority (admin only)
 * Body: { name, email, password, role, department, badgeId, jurisdiction }
 */
router.post('/register', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, department, badgeId, jurisdiction } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });

    const existing = await Authority.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ error: 'Email already registered.' });

    const authority = await Authority.create({
      name, email, password, role, department, badgeId, jurisdiction
    });

    res.status(201).json({ success: true, authority: authority.toJSON() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

/**
 * GET /api/auth/me
 * Get current logged-in authority info
 */
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, authority: req.authority });
});

/**
 * GET /api/auth/authorities
 * List all authorities (admin only)
 */
router.get('/authorities', protect, adminOnly, async (req, res) => {
  try {
    const authorities = await Authority.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, authorities });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PATCH /api/auth/authorities/:id/deactivate
 * Deactivate an authority (admin only)
 */
router.patch('/authorities/:id/deactivate', protect, adminOnly, async (req, res) => {
  try {
    const authority = await Authority.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');
    if (!authority) return res.status(404).json({ error: 'Authority not found.' });
    res.json({ success: true, authority });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
