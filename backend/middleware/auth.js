const jwt = require('jsonwebtoken');
const Authority = require('../models/Authority');

const JWT_SECRET = process.env.JWT_SECRET || 'safespeak_secret_key_change_in_production';

/**
 * Protect authority routes - verify JWT
 */
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const authority = await Authority.findById(decoded.id).select('-password');
    if (!authority || !authority.isActive) {
      return res.status(401).json({ error: 'Authority account not found or deactivated.' });
    }
    req.authority = authority;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * Restrict to admin only
 */
const adminOnly = (req, res, next) => {
  if (req.authority.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

/**
 * Generate JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { protect, adminOnly, generateToken };
