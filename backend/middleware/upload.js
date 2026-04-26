const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validateImageGeoTag } = require('../utils/nlp');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mp3|wav|ogg|aac/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only images, videos, and audio files are allowed.'));
  }
};

/**
 * Custom upload middleware with geotag validation
 * Validates that image files contain GPS metadata
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max per file
    files: 5 // max 5 files
  }
});

/**
 * Middleware to validate geotags after upload
 * Checks image files for GPS EXIF data
 */
const validateGeoTags = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    // No files uploaded is okay
    return next();
  }

  const imageFiles = req.files.filter(f => f.mimetype.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    // No image files, skip geotag validation
    return next();
  }

  // Validate each image has geotag
  const validationResults = [];
  const failedValidations = [];

  imageFiles.forEach((file, idx) => {
    const validation = validateImageGeoTag(file.path, true);
    validationResults.push(validation);
    
    if (!validation.valid) {
      failedValidations.push({
        file: file.originalname,
        reason: validation.message
      });
      // Delete file if validation fails
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Failed to delete invalid image ${file.filename}:`, err);
      });
    }
  });

  if (failedValidations.length > 0) {
    return res.status(400).json({
      error: `Image geotag validation failed: ${failedValidations[0].reason}`,
      details: failedValidations
    });
  }

  // Attach validation results to request for later use
  req.geoTagValidations = validationResults;
  next();
};

module.exports = { upload, validateGeoTags };
