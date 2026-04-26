/**
 * SafeSpeak Database Seeder
 * Run: node utils/seed.js
 * Creates default admin account + sample reports for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Authority = require('../models/Authority');
const Report = require('../models/Report');
const Alert = require('../models/Alert');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/safespeak';

const sampleReports = [
  {
    reportId: 'RPT-SAMPLE-001',
    title: 'Communal tension near mosque in Shaheen Bagh',
    description: 'Large groups gathering with heated arguments. Stones thrown at passing vehicles. Police intervention needed immediately.',
    location: { latitude: 28.6139, longitude: 77.2090, address: 'Shaheen Bagh, New Delhi', state: 'Delhi', district: 'South East Delhi', city: 'New Delhi', pincode: '110025' },
    aiAnalysis: { severity: 'Critical', severityScore: 88, isSpam: false, isFake: false, category: 'Communal', keywords: ['communal', 'tension'], analysisNote: 'CRITICAL: Immediate attention required.' },
    status: 'Pending',
    priority: 'Critical'
  },
  {
    reportId: 'RPT-SAMPLE-002',
    title: 'Property dispute turning violent in Whitefield',
    description: 'Neighbours fighting over boundary wall. One person reportedly injured. Verbal threats being made.',
    location: { latitude: 12.9716, longitude: 77.7480, address: 'Whitefield, Bengaluru', state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru', pincode: '560066' },
    aiAnalysis: { severity: 'Medium', severityScore: 55, isSpam: false, isFake: false, category: 'Criminal', keywords: ['dispute', 'threat'], analysisNote: '' },
    status: 'Under Review',
    priority: 'Medium'
  },
  {
    reportId: 'RPT-SAMPLE-003',
    title: 'Political rally clash in Hazratganj',
    description: 'Two political groups clashing near Hazratganj crossing. Traffic blocked. Police deployed but situation tense.',
    location: { latitude: 26.8467, longitude: 80.9462, address: 'Hazratganj, Lucknow', state: 'Uttar Pradesh', district: 'Lucknow', city: 'Lucknow', pincode: '226001' },
    aiAnalysis: { severity: 'Critical', severityScore: 82, isSpam: false, isFake: false, category: 'Political', keywords: ['riot', 'violence', 'attack'], analysisNote: 'CRITICAL: Immediate attention required.' },
    status: 'Pending',
    priority: 'Critical'
  },
  {
    reportId: 'RPT-SAMPLE-004',
    title: 'Flood situation in Chennai suburb',
    description: 'Heavy rains causing flooding in residential areas. People stuck on rooftops. Need rescue teams.',
    location: { latitude: 13.0827, longitude: 80.2707, address: 'Perambur, Chennai', state: 'Tamil Nadu', district: 'Chennai', city: 'Chennai', pincode: '600011' },
    aiAnalysis: { severity: 'Critical', severityScore: 79, isSpam: false, isFake: false, category: 'Natural Disaster', keywords: ['flood', 'dead'], analysisNote: 'CRITICAL: Immediate attention required.' },
    status: 'Resolved',
    priority: 'Critical',
    resolutionNote: 'NDRF team deployed. All residents evacuated safely.',
    resolvedAt: new Date(Date.now() - 86400000)
  },
  {
    reportId: 'RPT-SAMPLE-005',
    title: 'Suspicious gathering near industrial area',
    description: 'Unknown group of 50+ people assembled near old factory at midnight. Carrying equipment.',
    location: { latitude: 19.0760, longitude: 72.8777, address: 'Andheri East, Mumbai', state: 'Maharashtra', district: 'Mumbai Suburban', city: 'Mumbai', pincode: '400069' },
    aiAnalysis: { severity: 'Low', severityScore: 35, isSpam: false, isFake: false, category: 'Other', keywords: [], analysisNote: '' },
    status: 'Dismissed',
    priority: 'Low',
    resolutionNote: 'Verified as film shooting crew. No action required.'
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create admin authority
    const existingAdmin = await Authority.findOne({ email: 'admin@safespeak.in' });
    if (!existingAdmin) {
      await Authority.create({
        name: 'SafeSpeak Admin',
        email: 'admin@safespeak.in',
        password: 'Admin@1234',
        role: 'admin',
        department: 'SafeSpeak Operations',
        badgeId: 'ADMIN-001',
        jurisdiction: { state: 'All India', district: 'All', city: 'All' }
      });
      console.log('✅ Admin created: admin@safespeak.in / Admin@1234');
    } else {
      console.log('ℹ️  Admin already exists.');
    }

    // Create demo police account
    const existingPolice = await Authority.findOne({ email: 'police@safespeak.in' });
    if (!existingPolice) {
      await Authority.create({
        name: 'Inspector Kumar',
        email: 'police@safespeak.in',
        password: 'Police@1234',
        role: 'police',
        department: 'Delhi Police',
        badgeId: 'DL-POLICE-042',
        jurisdiction: { state: 'Delhi', district: 'South East Delhi', city: 'New Delhi' }
      });
      console.log('✅ Police demo created: police@safespeak.in / Police@1234');
    }

    // Seed sample reports
    const existingCount = await Report.countDocuments({ reportId: { $regex: /^RPT-SAMPLE/ } });
    if (existingCount === 0) {
      await Report.insertMany(sampleReports);
      console.log(`✅ ${sampleReports.length} sample reports created.`);

      // Create sample alerts
      await Alert.insertMany([
        {
          type: 'critical_report',
          title: 'Critical Report: Communal tension near mosque',
          message: 'New critical severity report from New Delhi.',
          severity: 'Critical',
          relatedReportId: 'RPT-SAMPLE-001',
          location: { state: 'Delhi', district: 'South East Delhi', city: 'New Delhi', latitude: 28.6139, longitude: 77.2090 }
        },
        {
          type: 'critical_report',
          title: 'Critical Report: Political rally clash',
          message: 'New critical severity report from Lucknow.',
          severity: 'Critical',
          relatedReportId: 'RPT-SAMPLE-003',
          location: { state: 'Uttar Pradesh', district: 'Lucknow', city: 'Lucknow' }
        },
        {
          type: 'new_report',
          title: 'Medium Report: Property dispute - Bengaluru',
          message: 'New medium severity report from Bengaluru.',
          severity: 'Medium',
          relatedReportId: 'RPT-SAMPLE-002',
          location: { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru' }
        }
      ]);
      console.log('✅ Sample alerts created.');
    } else {
      console.log('ℹ️  Sample reports already exist.');
    }

    console.log('\n🚀 Seeding complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Login:  admin@safespeak.in  / Admin@1234');
    console.log('Police Login: police@safespeak.in / Police@1234');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
