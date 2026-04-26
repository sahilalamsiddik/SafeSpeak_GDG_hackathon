/**
 * NLP Utility - SafeSpeak AI Analysis Module
 * Performs severity detection, spam filtering, fake report detection,
 * and category classification using keyword-based + heuristic analysis.
 * Includes EXIF geotag validation for uploaded media.
 */

const fs = require('fs');
const path = require('path');

// Try to import exif parser, with graceful fallback
let ExifParser;
try {
  ExifParser = require('exif-parser');
} catch (e) {
  console.warn('ExifParser not installed - geotag validation disabled. Install with: npm install exif-parser');
  ExifParser = null;
}

// Severity keyword banks
const CRITICAL_KEYWORDS = [
  'riot', 'violence', 'attack', 'murder', 'kill', 'bomb', 'explosion', 'fire',
  'shooting', 'stabbing', 'mob', 'lynching', 'arson', 'rape', 'terrorist',
  'communal', 'curfew', 'dead', 'death', 'blood', 'weapon', 'gunshot',
  'हिंसा', 'दंगा', 'हत्या', 'आग', 'बम', // Hindi keywords
  'kalabala', 'danga', // regional
];

const MEDIUM_KEYWORDS = [
  'fight', 'dispute', 'threat', 'harassment', 'assault', 'conflict', 'tension',
  'argument', 'abuse', 'intimidation', 'vandalism', 'protest', 'blockade',
  'discrimination', 'quarrel', 'gang', 'robbery', 'theft', 'damage',
  'धमकी', 'विवाद', 'झगड़ा',
];

const CATEGORY_KEYWORDS = {
  'Women & Child Safety': [
    'domestic violence', 'child abuse', 'child', 'minor', 'woman', 'women', 'girl',
    'eve teasing', 'molest', 'stalking', 'rape', 'dowry', 'wife'
  ],
  'Cyber / Online Threats': [
    'online harassment', 'cyber', 'fake news', 'threat message', 'threat messages',
    'social media', 'whatsapp', 'instagram', 'facebook', 'account hacked', 'hacked',
    'phishing', 'otp fraud', 'digital fraud'
  ],
  'Law & Order': [
    'fight', 'riot', 'riots', 'threat', 'harassment', 'communal', 'violence',
    'weapon', 'weapons', 'suspicious gathering', 'suspicious gatherings', 'murder',
    'kill', 'shooting', 'stabbing', 'mob', 'lynching', 'arson', 'attack', 'gang',
    'robbery', 'theft', 'kidnap', 'extortion', 'drug', 'dacoity', 'curfew'
  ],
  'Public Safety & Emergency': [
    'fire', 'fire hazard', 'open wire', 'open wires', 'electric', 'electrical',
    'transformer', 'electricity', 'short circuit', 'gas leak', 'gass leak',
    'dangerous building', 'building collapse', 'collapse risk', 'flood',
    'earthquake', 'storm', 'cyclone', 'landslide'
  ],
  'Health & Sanitation': [
    'disease', 'outbreak', 'hygiene', 'poor hygiene', 'dead animal', 'dead animals',
    'contamination', 'contaminated', 'infection', 'mosquito', 'medical waste',
    'washroom', 'toilet', 'sanitation'
  ],
  'Municipal / Civic Issues': [
    'garbage', 'dumping', 'water leakage', 'leakage', 'road damage', 'pothole',
    'road broken', 'drainage', 'sewage', 'sewer', 'streetlight', 'water logging',
    'civic', 'municipal'
  ],
  'Traffic & Transport': [
    'traffic', 'traffic jam', 'illegal parking', 'parking', 'accident', 'vehicle',
    'car', 'truck', 'bike', 'highway', 'road rage', 'transport', 'bus'
  ],
  'Rural / Land Issues': [
    'land dispute', 'land disputes', 'water sharing', 'farming', 'farm', 'farmer',
    'crop', 'irrigation', 'village', 'rural', 'boundary wall'
  ],
  'Community Disputes': [
    'neighbor', 'neighbour', 'noise', 'loud noise', 'minor argument', 'minor arguments',
    'argument', 'quarrel', 'community', 'local dispute'
  ],
};

// Spam indicators
const SPAM_PATTERNS = [
  /(.)\1{5,}/,           // repeated characters: "aaaaaaa"
  /test|testing|dummy|fake report|abcd|xyz123/i,
  /lorem ipsum/i,
  /^.{0,10}$/,           // too short
];

// Fake report indicators
const FAKE_INDICATORS = [
  /not real|imaginary|made up|just checking|fake|hoax/i,
  /april fool|prank|joke/i,
];

/**
 * Hash an IP address for anonymous storage
 */
const crypto = require('crypto');
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'safespeak_salt').digest('hex').substring(0, 32);
}

/**
 * Analyze text for severity
 */
function detectSeverity(text) {
  const lower = text.toLowerCase();
  let score = 30; // baseline
  let matchedCritical = 0;
  let matchedMedium = 0;

  CRITICAL_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      matchedCritical++;
      score += 15;
    }
  });

  MEDIUM_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) {
      matchedMedium++;
      score += 5;
    }
  });

  // Caps lock usage as urgency signal
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.4) score += 10;

  // Exclamation marks as urgency signal
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 2) score += 5;

  score = Math.min(score, 100);

  let severity;
  if (score >= 70 || matchedCritical >= 2) severity = 'Critical';
  else if (score >= 45 || matchedCritical >= 1 || matchedMedium >= 3) severity = 'Medium';
  else severity = 'Low';

  return { severity, severityScore: score };
}

/**
 * Detect spam
 */
function detectSpam(title, description) {
  const combined = `${title} ${description}`;
  let spamScore = 0;

  SPAM_PATTERNS.forEach(pattern => {
    if (pattern.test(combined)) spamScore += 0.3;
  });

  // Very short description
  if (description.trim().length < 20) spamScore += 0.4;

  // Title and description nearly identical
  const similarity = combined.length > 0
    ? (description.trim() === title.trim() ? 1 : 0)
    : 0;
  spamScore += similarity * 0.3;

  spamScore = Math.min(spamScore, 1);
  return { isSpam: spamScore > 0.5, spamScore: parseFloat(spamScore.toFixed(2)) };
}

/**
 * Detect fake reports
 */
function detectFake(title, description) {
  const combined = `${title} ${description}`;
  let fakeScore = 0;

  FAKE_INDICATORS.forEach(pattern => {
    if (pattern.test(combined)) fakeScore += 0.5;
  });

  fakeScore = Math.min(fakeScore, 1);
  return { isFake: fakeScore > 0.4, fakeScore: parseFloat(fakeScore.toFixed(2)) };
}

/**
 * Detect category of report
 */
function detectCategory(text) {
  const lower = text.toLowerCase();
  const scores = {};

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    let score = 0;
    keywords.forEach(kw => {
      if (lower.includes(kw)) score++;
    });
    scores[category] = score;
  });

  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top[1] > 0 ? top[0] : 'Other';
}

/**
 * Extract keywords from text
 */
function extractKeywords(text) {
  const allKeywords = [...CRITICAL_KEYWORDS, ...MEDIUM_KEYWORDS];
  const lower = text.toLowerCase();
  return allKeywords.filter(kw => lower.includes(kw)).slice(0, 10);
}

/**
 * Main analysis function - run full NLP pipeline on a report
 */
function analyzeReport(title, description) {
  const combined = `${title} ${description}`;

  const { severity, severityScore } = detectSeverity(combined);
  const { isSpam, spamScore } = detectSpam(title, description);
  const { isFake, fakeScore } = detectFake(title, description);
  const category = detectCategory(combined);
  const keywords = extractKeywords(combined);

  let analysisNote = '';
  if (isSpam) analysisNote += 'Potential spam detected. ';
  if (isFake) analysisNote += 'Possible fake/test report. ';
  if (severity === 'Critical') analysisNote += 'CRITICAL: Immediate attention required. ';

  return {
    severity,
    severityScore,
    isSpam,
    spamScore,
    isFake,
    fakeScore,
    category,
    keywords,
    analysisNote: analysisNote.trim()
  };
}

/**
 * Extract geolocation data from image EXIF metadata
 * Returns { hasGeoTag, latitude, longitude, timestamp } or { hasGeoTag: false }
 */
function extractGeoTag(filePath) {
  if (!ExifParser || !fs.existsSync(filePath)) {
    return { hasGeoTag: false, reason: 'EXIF parser unavailable or file not found' };
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();

    if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
      return {
        hasGeoTag: true,
        latitude: result.tags.GPSLatitude,
        longitude: result.tags.GPSLongitude,
        timestamp: result.tags.DateTime || result.tags.DateTimeOriginal,
        gpsAltitude: result.tags.GPSAltitude || null
      };
    }

    return { hasGeoTag: false, reason: 'No GPS data found in EXIF' };
  } catch (err) {
    return { hasGeoTag: false, reason: `EXIF parsing failed: ${err.message}` };
  }
}

/**
 * Validate image file has geotag and authentic location data
 * Returns { valid: boolean, message: string, geoData?: object }
 */
function validateImageGeoTag(filePath, requiredForImages = true) {
  // Check if file is image
  const ext = path.extname(filePath).toLowerCase();
  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);

  if (!isImage) {
    return { valid: true, message: 'Not an image file, geotag validation skipped' };
  }

  if (!requiredForImages) {
    return { valid: true, message: 'Geotag validation disabled for this submission' };
  }

  const geoData = extractGeoTag(filePath);

  if (!geoData.hasGeoTag) {
    return {
      valid: false,
      message: 'Image must contain GPS geotag (location) metadata. Please upload an image taken with location enabled.',
      reason: geoData.reason
    };
  }

  // Validate coordinates are within realistic bounds
  const lat = geoData.latitude;
  const lon = geoData.longitude;

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      valid: false,
      message: 'Invalid GPS coordinates in image metadata.'
    };
  }

  return { valid: true, message: 'Geotag validation passed', geoData };
}

/**
 * Analyze media files for authenticity and threats
 * Checks for fake/threat indicators based on metadata
 */
function analyzeMediaAuthenticity(mediaFiles) {
  let analysis = {
    totalFiles: mediaFiles.length,
    imagesWithGeoTags: 0,
    imagesWithoutGeoTags: 0,
    authenticityScore: 100,
    mediaFlags: [],
    geoDataCollected: []
  };

  mediaFiles.forEach((file, idx) => {
    if (file.mimetype.startsWith('image/')) {
      const geoData = extractGeoTag(file.path);
      if (geoData.hasGeoTag) {
        analysis.imagesWithGeoTags++;
        analysis.geoDataCollected.push({
          file: file.filename,
          lat: geoData.latitude,
          lon: geoData.longitude,
          timestamp: geoData.timestamp
        });
      } else {
        analysis.imagesWithoutGeoTags++;
        analysis.authenticityScore -= 25; // Deduct points for missing geotag
        analysis.mediaFlags.push(`Image ${idx + 1}: Missing geolocation metadata`);
      }
    }
  });

  return analysis;
}

/**
 * Pattern recognition - detect hotspots from multiple reports in an area
 */
function detectHotspot(reports) {
  // Group by district
  const byDistrict = {};
  reports.forEach(r => {
    const key = `${r.location?.state || 'Unknown'}_${r.location?.district || 'Unknown'}`;
    if (!byDistrict[key]) byDistrict[key] = [];
    byDistrict[key].push(r);
  });

  const hotspots = [];
  Object.entries(byDistrict).forEach(([key, rpts]) => {
    if (rpts.length >= 3) { // 3+ reports in same district = hotspot
      const criticalCount = rpts.filter(r => r.aiAnalysis?.severity === 'Critical').length;
      hotspots.push({
        location: key,
        reportCount: rpts.length,
        criticalCount,
        riskLevel: criticalCount >= 2 ? 'Critical' : rpts.length >= 5 ? 'High' : 'Medium'
      });
    }
  });

  return hotspots;
}

module.exports = { analyzeReport, detectHotspot, hashIP, extractGeoTag, validateImageGeoTag, analyzeMediaAuthenticity };
