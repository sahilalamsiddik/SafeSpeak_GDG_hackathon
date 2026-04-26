const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  content: { type: String, required: true, maxlength: 1000 },
  ipHash: String,
  createdAt: { type: Date, default: Date.now }
});

const reportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    default: () => 'RPT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase()
  },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },

  // Media attachments
  media: [{
    type: { type: String, enum: ['image', 'video', 'audio'] },
    filename: String,
    originalname: String,
    mimetype: String,
    size: Number,
    url: String
  }],

  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    state: String,
    district: String,
    city: String,
    pincode: String,
    detectedMethod: { type: String, enum: ['auto', 'manual'], default: 'manual' }
  },

  // Community Engagement
  likes: [String],
  likeCount: { type: Number, default: 0 },
  replies: [replySchema],

  // AI Analysis
  aiAnalysis: {
    severity: { type: String, enum: ['Low', 'Medium', 'Critical'], default: 'Medium' },
    severityScore: { type: Number, min: 0, max: 100, default: 50 },
    isSpam: { type: Boolean, default: false },
    spamScore: { type: Number, min: 0, max: 1, default: 0 },
    isFake: { type: Boolean, default: false },
    fakeScore: { type: Number, min: 0, max: 1, default: 0 },
    keywords: [String],
    category: {
      type: String,
      enum: [
        'Law & Order',
        'Municipal / Civic Issues',
        'Public Safety & Emergency',
        'Health & Sanitation',
        'Community Disputes',
        'Traffic & Transport',
        'Cyber / Online Threats',
        'Women & Child Safety',
        'Rural / Land Issues',
        'Communal',
        'Political',
        'Criminal',
        'Domestic',
        'Traffic',
        'Natural Disaster',
        'Public Unrest',
        'Other'
      ],
      default: 'Other'
    },
    analysisNote: String
  },

  // Status & case management
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Resolved', 'Dismissed'],
    default: 'Pending'
  },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },

  // Authority handling
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Authority' },
  resolvedAt: Date,
  resolutionNote: String,

  // Escalation tracking
  toleranceCount: { type: Number, default: 0 }, // for ResolveSpace duplicate tracking
  escalatedToHigherAuthority: { type: Boolean, default: false },
  escalatedAt: Date,

  // Metadata
  ipHash: String, // hashed for privacy
  userAgent: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

reportSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Index for geospatial queries
reportSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ 'aiAnalysis.severity': 1 });

module.exports = mongoose.model('Report', reportSchema);
