const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  content: { type: String, required: true, maxlength: 1000 },
  ipHash: String,
  createdAt: { type: Date, default: Date.now }
});

const resolvePostSchema = new mongoose.Schema({
  postId: {
    type: String,
    unique: true,
    default: () => 'POST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase()
  },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 3000 },

  location: {
    address: String,
    state: String,
    district: String,
    city: String
  },

  // Like tracking (by hashed IPs to prevent duplicates)
  likes: [String], // array of hashed IPs
  likeCount: { type: Number, default: 0 },

  // Replies
  replies: [replySchema],

  // Tolerance / escalation
  toleranceCount: { type: Number, default: 0 }, // how many times same issue reported
  escalated: { type: Boolean, default: false },
  escalatedAt: Date,
  linkedReportId: { type: String }, // linked to official Report if escalated

  // AI Analysis
  aiAnalysis: {
    isSpam: { type: Boolean, default: false },
    severity: { type: String, enum: ['Low', 'Medium', 'Critical'], default: 'Low' }
  },

  status: { type: String, enum: ['Active', 'Resolved', 'Removed'], default: 'Active' },
  ipHash: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

resolvePostSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ResolvePost', resolvePostSchema);
