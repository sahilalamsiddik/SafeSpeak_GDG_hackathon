const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['new_report', 'critical_report', 'hotspot_detected', 'escalation', 'pattern_alert'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  relatedReport: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
  relatedReportId: String, // human-readable ID
  location: {
    state: String,
    district: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  isRead: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Authority' }],
  createdAt: { type: Date, default: Date.now }
});

alertSchema.index({ isRead: 1, createdAt: -1 });
alertSchema.index({ severity: 1 });

module.exports = mongoose.model('Alert', alertSchema);
