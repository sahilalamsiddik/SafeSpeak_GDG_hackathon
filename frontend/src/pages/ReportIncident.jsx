import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Upload, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';
import axios from 'axios';
import piexif from 'piexifjs';

const ReportIncident = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    state: '',
    district: '',
    city: '',
    pincode: '',
    latitude: '',
    longitude: '',
    detectedMethod: 'manual'
  });
  const [files, setFiles] = useState([]);
  const [fileValidation, setFileValidation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  /**
   * Extract EXIF geotag data from image file
   */
  const extractGeoTag = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const exifData = piexif.load(e.target.result);
          const gps = exifData.get('GPS');
          
          if (!gps || !gps[0] || !gps[1]) {
            resolve({ hasGeoTag: false, reason: 'No GPS data found' });
            return;
          }

          // Convert GPS coordinates
          const lat = gps[0][0][0] / gps[0][0][1] + 
                      gps[0][1][0] / gps[0][1][1] / 60 + 
                      gps[0][2][0] / gps[0][2][1] / 3600;
          const lon = gps[1][0][0] / gps[1][0][1] + 
                      gps[1][1][0] / gps[1][1][1] / 60 + 
                      gps[1][2][0] / gps[1][2][1] / 3600;

          resolve({
            hasGeoTag: true,
            latitude: lat,
            longitude: lon,
            timestamp: exifData.get('DateTime')
          });
        } catch (err) {
          resolve({ hasGeoTag: false, reason: `EXIF reading failed: ${err.message}` });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Validate selected files for geotag data
   */
  const validateFiles = async (selectedFiles) => {
    const validationResults = [];
    let hasWarning = false;

    for (const file of selectedFiles) {
      if (file.type.startsWith('image/')) {
        const geoData = await extractGeoTag(file);
        validationResults.push({
          name: file.name,
          ...geoData
        });
        if (!geoData.hasGeoTag) {
          hasWarning = true;
        }
      } else {
        // Non-image files don't need geotag validation
        validationResults.push({
          name: file.name,
          hasGeoTag: true,
          type: file.type.startsWith('video/') ? 'video' : 'audio'
        });
      }
    }

    setFileValidation(validationResults);
    
    if (hasWarning) {
      setWarning('⚠️ Some images do not have GPS geotag data. These images may not be accepted during analysis.');
    } else if (validationResults.some(v => v.hasGeoTag)) {
      setWarning('✓ All images have valid GPS geotag data - good for authenticity verification.');
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    validateFiles(selectedFiles);
  };

  const detectLocation = () => {
    setLocationLoading(true);
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = response.data;
        const address = data.address;
        
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          address: data.display_name,
          state: address.state || '',
          district: address.state_district || address.county || '',
          city: address.city || address.town || address.village || '',
          pincode: address.postcode || '',
          detectedMethod: 'auto'
        }));
      } catch (err) {
        setError('Failed to fetch address details from location.');
      } finally {
        setLocationLoading(false);
      }
    }, (err) => {
      setError('Failed to get your location. Please ensure location permissions are granted.');
      setLocationLoading(false);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      files.forEach(file => {
        submitData.append('media', file);
      });

      const response = await axios.post('/api/reports/submit', submitData);
      setSuccess(response.data);
      setFormData({
        title: '', description: '', address: '', state: '', district: '', city: '', pincode: '', latitude: '', longitude: '', detectedMethod: 'manual'
      });
      setFiles([]);
      setFileValidation([]);
      setWarning('');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while submitting the report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10 -z-10 mix-blend-overlay"></div>
      
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold text-white mb-4">Report an Incident</h1>
          <p className="text-gray-400">
            Submit details anonymously. Our AI will analyze and route this to the appropriate authorities.
          </p>
        </motion.div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-8 text-center border-success/50"
          >
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Report Submitted Successfully</h2>
            <p className="text-gray-300 mb-6">
              Your report has been logged and is being analyzed.
            </p>
            <div className="bg-darkBg/50 p-4 rounded-lg inline-block text-left mb-6">
              <p className="text-sm text-gray-400">Alert ID: <span className="text-white font-mono">{success.reportId}</span></p>
              <p className="text-sm text-gray-400">Assessed Severity: <span className="text-warning font-bold">{success.severity || 'Pending'}</span></p>
            </div>
            <br/>
            <button
              onClick={() => setSuccess(null)}
              className="px-6 py-2 bg-accent text-darkBg font-bold rounded-lg hover:bg-accent/80 transition-colors"
            >
              Submit Another Report
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6 sm:p-8"
          >
            {error && (
              <div className="mb-6 p-4 bg-danger/20 border border-danger rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            {warning && (
              <div className="mb-6 p-4 bg-warning/20 border border-warning rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-warning text-sm">{warning}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Incident Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full bg-darkBg/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  placeholder="E.g., Suspicious gathering near main square"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Detailed Description</label>
                <textarea
                  name="description"
                  required
                  rows="4"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full bg-darkBg/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
                  placeholder="Provide as much detail as possible..."
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Media Upload (Optional)</label>
                  <label className="w-full flex flex-col items-center justify-center bg-darkBg/50 border-2 border-dashed border-gray-600 rounded-lg p-6 cursor-pointer hover:border-accent transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">Click to upload images/video</span>
                    <span className="text-xs text-gray-500 mt-1">Max 5 files (Images with GPS metadata recommended)</span>
                    <input type="file" multiple onChange={handleFileChange} className="hidden" accept="image/*,video/*,audio/*" />
                  </label>
                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-accent font-medium">{files.length} file(s) selected:</p>
                      {fileValidation.map((file, idx) => (
                        <div key={idx} className="text-xs text-gray-400 bg-darkBg/50 p-2 rounded flex items-center justify-between">
                          <span>{file.name}</span>
                          {file.hasGeoTag ? (
                            <span className="text-success">✓ GPS</span>
                          ) : file.type ? (
                            <span className="text-accent">◇ {file.type.toUpperCase()}</span>
                          ) : (
                            <span className="text-warning">⚠ No GPS</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-300">Location Details</label>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={locationLoading}
                    className="w-full flex items-center justify-center gap-2 bg-secondary/20 border border-secondary text-secondary px-4 py-3 rounded-lg hover:bg-secondary hover:text-white transition-all disabled:opacity-50"
                  >
                    {locationLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                    Use Auto Location
                  </button>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Full Address"
                    className="w-full bg-darkBg/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="State"
                      className="w-full bg-darkBg/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      placeholder="District"
                      className="w-full bg-darkBg/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                      className="w-full bg-darkBg/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      placeholder="Pincode"
                      className="w-full bg-darkBg/50 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-danger text-white py-4 rounded-xl font-bold text-lg hover:bg-red-600 shadow-glow-danger transition-all disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit Anonymous Report'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ReportIncident;
