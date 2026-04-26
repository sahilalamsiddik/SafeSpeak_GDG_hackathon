const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const authoritySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['police', 'ngo', 'admin', 'district_officer'],
    default: 'police'
  },
  department: String,
  badgeId: { type: String, unique: true, sparse: true },
  jurisdiction: {
    state: String,
    district: String,
    city: String
  },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

authoritySchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

authoritySchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
authoritySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Authority', authoritySchema);
