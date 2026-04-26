import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, FileText, Map as MapIcon, Search, AlertTriangle, CheckCircle, XCircle, Eye, Calendar, Video } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import Earth3D from '../../components/Earth3D';
import 'leaflet/dist/leaflet.css';

const AUTHORITY_CATEGORIES = [
  {
    name: 'Law & Order',
    routeTo: 'Police Department',
    color: 'bg-red-500/15 text-red-200 border-red-400/30',
    legacy: ['Communal', 'Political', 'Criminal', 'Public Unrest'],
    keywords: ['fight', 'riot', 'threat', 'harassment', 'communal', 'violence', 'weapon', 'suspicious gathering', 'murder', 'kill', 'shooting', 'stabbing', 'mob', 'lynching', 'arson', 'attack', 'gang', 'robbery', 'theft', 'kidnap', 'curfew']
  },
  {
    name: 'Municipal / Civic Issues',
    routeTo: 'Municipal Corporation',
    color: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
    keywords: ['garbage', 'dumping', 'water leakage', 'leakage', 'road damage', 'pothole', 'road broken', 'drainage', 'sewage', 'sewer', 'streetlight', 'water logging', 'civic', 'municipal']
  },
  {
    name: 'Public Safety & Emergency',
    routeTo: 'Fire Dept / Electricity Board',
    color: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
    legacy: ['Natural Disaster'],
    keywords: ['fire', 'fire hazard', 'open wire', 'electric', 'electrical', 'transformer', 'short circuit', 'gas leak', 'gass leak', 'dangerous building', 'building collapse', 'collapse risk', 'flood', 'earthquake', 'storm', 'cyclone', 'landslide']
  },
  {
    name: 'Health & Sanitation',
    routeTo: 'Health Department',
    color: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    keywords: ['disease', 'outbreak', 'hygiene', 'dead animal', 'contamination', 'contaminated', 'infection', 'mosquito', 'medical waste', 'washroom', 'toilet', 'sanitation']
  },
  {
    name: 'Community Disputes',
    routeTo: 'Local Mediators / NGOs',
    color: 'bg-violet-500/15 text-violet-200 border-violet-400/30',
    keywords: ['neighbor', 'neighbour', 'noise', 'loud noise', 'minor argument', 'argument', 'quarrel', 'community', 'local dispute']
  },
  {
    name: 'Traffic & Transport',
    routeTo: 'Traffic Police',
    color: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30',
    legacy: ['Traffic'],
    keywords: ['traffic', 'traffic jam', 'illegal parking', 'parking', 'accident', 'vehicle', 'car', 'truck', 'bike', 'highway', 'road rage', 'transport', 'bus']
  },
  {
    name: 'Cyber / Online Threats',
    routeTo: 'Cyber Crime Cell',
    color: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
    keywords: ['online harassment', 'cyber', 'fake news', 'threat message', 'social media', 'whatsapp', 'instagram', 'facebook', 'hacked', 'phishing', 'otp fraud', 'digital fraud']
  },
  {
    name: 'Women & Child Safety',
    routeTo: 'Women & Child Protection Units',
    color: 'bg-pink-500/15 text-pink-200 border-pink-400/30',
    legacy: ['Domestic'],
    keywords: ['domestic violence', 'child abuse', 'child', 'minor', 'woman', 'women', 'girl', 'eve teasing', 'molest', 'stalking', 'rape', 'dowry', 'wife']
  },
  {
    name: 'Rural / Land Issues',
    routeTo: 'Revenue / Rural Development Office',
    color: 'bg-lime-500/15 text-lime-200 border-lime-400/30',
    keywords: ['land dispute', 'land disputes', 'water sharing', 'farming', 'farm', 'farmer', 'crop', 'irrigation', 'village', 'rural', 'boundary wall']
  }
];

const getAuthorityCategory = (report) => {
  const storedCategory = report.aiAnalysis?.category || '';
  const combinedText = [
    report.title,
    report.description,
    storedCategory,
    ...(report.aiAnalysis?.keywords || [])
  ].join(' ').toLowerCase();

  const exactCategory = AUTHORITY_CATEGORIES.find((category) => category.name === storedCategory);
  if (exactCategory) return exactCategory;

  const legacyCategory = AUTHORITY_CATEGORIES.find((category) => category.legacy?.includes(storedCategory));
  if (legacyCategory) return legacyCategory;

  return AUTHORITY_CATEGORIES.find((category) =>
    category.keywords.some((keyword) => combinedText.includes(keyword))
  ) || {
    name: 'Community Disputes',
    routeTo: 'Local Mediators / NGOs',
    color: 'bg-gray-500/15 text-gray-200 border-gray-400/30'
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [criticalIssues, setCriticalIssues] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const token = localStorage.getItem('safespeak_token');

  useEffect(() => {
    if (!token) {
      navigate('/authority/login');
      return;
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchDashboardData();
  }, [token, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, heatmapRes, criticalRes, casesRes, sampleRes] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/heatmap/data'),
        axios.get('/api/heatmap/critical'),
        axios.get('/api/cases/all'),
        axios.get('/api/heatmap/sample')
      ]);

      setStats(statsRes.data.stats);
      
      // Inject sample heatmap points to ensure Red, Orange, Green are visible on the map
      const samplePoints = [
        { lat: 28.7041, lng: 77.1025, severity: 'Critical', title: 'Sample Area Delhi', address: 'Connaught Place, Delhi' },
        { lat: 19.0760, lng: 72.8777, severity: 'Medium', title: 'Sample Area Mumbai', address: 'Bandra West, Mumbai' },
        { lat: 12.9716, lng: 77.5946, severity: 'Low', title: 'Sample Area Bangalore', address: 'Indiranagar, Bangalore' },
        { lat: 17.3850, lng: 78.4867, severity: 'Medium', title: 'Sample Area Hyderabad', address: 'Jubilee Hills, Hyderabad' },
        { lat: 22.5726, lng: 88.3639, severity: 'Critical', title: 'Sample Area Kolkata', address: 'Park Street, Kolkata' },
        { lat: 13.0827, lng: 80.2707, severity: 'Low', title: 'Sample Area Chennai', address: 'T Nagar, Chennai' },
      ];
      setHeatmapData([...(heatmapRes.data?.points || []), ...(sampleRes.data?.sampleData || []), ...samplePoints]);
      setCriticalIssues(criticalRes.data?.issues || []);
      
      // Filter cases for only the last 5 days
      const allCases = casesRes.data.cases || casesRes.data;
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const recentCases = allCases.filter(c => new Date(c.createdAt) >= fiveDaysAgo);
      setCases(recentCases);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('safespeak_token');
        navigate('/authority/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId) return;
    try {
      const res = await axios.get(`/api/reports/search/${searchId}`);
      if (res.data.report) {
        setCases([res.data.report]);
      }
    } catch (err) {
      alert('Report not found');
    }
  };

  const updateCaseStatus = async (id, status) => {
    try {
      const note = prompt(`Enter resolution note to mark as ${status}:`);
      if (note === null) return;
      const endpoint = status === 'Resolved' ? 'resolve' : status === 'Dismissed' ? 'dismiss' : 'status';
      
      if (endpoint === 'status') {
         await axios.patch(`/api/reports/${id}/status`, { status });
      } else {
         await axios.patch(`/api/cases/${id}/${endpoint}`, { resolutionNote: note });
      }
      fetchDashboardData();
    } catch (err) {
      alert(`Failed to update status: ${err.response?.data?.error || err.message}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading Dashboard...</div>;
  }

  const getMarkerColor = (severity) => {
    if (severity === 'Critical') return '#EF4444'; // Red
    if (severity === 'Medium') return '#F59E0B'; // Orange
    return '#10B981'; // Green
  };

  const getSeverityBgColor = (severity) => {
    if (severity === 'Critical') return 'bg-red-100 text-red-800';
    if (severity === 'Medium') return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredCases = selectedCategory
    ? cases.filter((c) => getAuthorityCategory(c).name === selectedCategory)
    : cases;

  return (
    <div className="relative min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <Earth3D />
      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* Header & Stats Cards */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Authority Dashboard</h1>
            <p className="text-gray-400">Real-time incident monitoring and resolution</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search by Report ID..." 
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="bg-darkBg/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none"
            />
            <button type="submit" className="bg-accent text-darkBg p-2 rounded-lg hover:bg-accent/80">
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>

        <nav className="glass-panel px-4 py-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`flex min-w-max items-center rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                selectedCategory === null
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-gray-600 bg-darkBg/40 text-gray-300 hover:border-accent/60 hover:text-white'
              }`}
              title="Show all submitted problems"
            >
              All Reports
            </button>
            {AUTHORITY_CATEGORIES.map((category, idx) => (
              <button
                type="button"
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`flex min-w-max items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-transform hover:-translate-y-0.5 ${category.color} ${
                  selectedCategory === category.name ? 'ring-2 ring-accent/70' : ''
                }`}
                title={`Show ${category.name} reports. Route to: ${category.routeTo}`}
              >
                <span className="text-gray-400">{idx + 1}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 border-l-4 border-danger">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Alerts</p>
                <h3 className="text-3xl font-bold text-white mt-2">{stats?.activeReports || 0}</h3>
              </div>
              <Activity className="w-8 h-8 text-danger" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 border-l-4 border-success">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Resolved Cases</p>
                <h3 className="text-3xl font-bold text-white mt-2">{stats?.resolvedReports || 0}</h3>
              </div>
              <ShieldCheck className="w-8 h-8 text-success" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 border-l-4 border-accent">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Reports</p>
                <h3 className="text-3xl font-bold text-white mt-2">{stats?.totalReports || 0}</h3>
              </div>
              <FileText className="w-8 h-8 text-accent" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 border-l-4 border-warning">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Open Reports</p>
                <h3 className="text-3xl font-bold text-white mt-2">{stats?.openReports || 0}</h3>
              </div>
              <Search className="w-8 h-8 text-warning" />
            </div>
          </motion.div>
        </div>
        <div className="mt-4 text-sm text-gray-300">
          Reports open in the last 5 days: <span className="text-white font-bold">{stats?.recentOpenReportsLast5Days || 0}</span>
        </div>

        {/* Live Heatmap & Critical Issues List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-1 rounded-2xl overflow-hidden shadow-glow h-[500px] relative">
            <div className="absolute top-4 left-4 z-[400] bg-darkBg/80 backdrop-blur-md px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-2 pointer-events-none">
              <MapIcon className="w-5 h-5 text-accent" />
              <span className="text-white font-bold text-sm tracking-wide">LIVE HEATMAP : INDIA</span>
            </div>
            <MapContainer 
              center={[20.5937, 78.9629]} 
              zoom={5} 
              maxZoom={18}
              scrollWheelZoom={true} 
              style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              />
              {heatmapData.map((point, idx) => (
                point.lat && point.lng ? (
                  <CircleMarker
                    key={idx}
                    center={[point.lat, point.lng]}
                    radius={point.severity === 'Critical' ? 14 : point.severity === 'Medium' ? 9 : 7}
                    pathOptions={{ 
                      color: getMarkerColor(point.severity), 
                      fillColor: getMarkerColor(point.severity), 
                      fillOpacity: 0.75, 
                      weight: 1.5
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1">
                        <h4 className="font-bold text-gray-900 mb-1">{point.title}</h4>
                        <p className="text-xs text-gray-600 mb-2">{point.address || 'Location data'}</p>
                        <span className={`text-xs px-2 py-1 rounded font-bold ${getSeverityBgColor(point.severity)}`}>
                          {point.severity}
                        </span>
                      </div>
                    </Popup>
                  </CircleMarker>
                ) : null
              ))}
            </MapContainer>
            <div className="absolute bottom-5 left-5 z-20 rounded-2xl bg-black/80 border border-gray-700 p-3 text-sm text-white shadow-xl w-48">
              <div className="font-bold mb-2">Legend</div>
              <div className="flex items-center gap-2 mb-2"><span className="w-3 h-3 rounded-full bg-red-500" />Critical</div>
              <div className="flex items-center gap-2 mb-2"><span className="w-3 h-3 rounded-full bg-orange-400" />Moderate</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" />Light</div>
            </div>
          </div>

          <div className="glass-panel p-6 overflow-y-auto h-[500px]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" /> Most Critical
            </h3>
            <div className="space-y-4">
              {criticalIssues.length > 0 ? criticalIssues.map((issue, idx) => (
                <div key={idx} className="bg-darkBg/50 p-4 rounded-lg border border-danger/30 hover:border-danger/60 transition-colors">
                  <h4 className="text-white font-bold text-sm mb-1">{issue.title || 'Critical Alert'}</h4>
                  <p className="text-xs text-gray-400 mb-2">{issue.fullAddress || issue.location?.address || 'Unknown'}</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="bg-danger/20 text-danger px-2 py-1 rounded">Critical</span>
                    <span className="text-gray-500">{new Date(issue.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )) : (
                <div className="text-gray-500 text-sm text-center py-10">No critical issues detected.</div>
              )}
            </div>
          </div>
        </div>

        {/* Full Records Table */}
        <div className="glass-panel p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Recent Incident Reports</h3>
              {selectedCategory && (
                <p className="mt-1 text-sm text-gray-400">
                  Showing {filteredCases.length} submitted problem{filteredCases.length === 1 ? '' : 's'} in {selectedCategory}
                </p>
              )}
            </div>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="self-start rounded-md border border-gray-600 px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:border-accent hover:text-accent sm:self-auto"
              >
                Show All Reports
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="pb-3 px-4">Report ID</th>
                  <th className="pb-3 px-4">Title</th>
                  <th className="pb-3 px-4">Category / Route</th>
                  <th className="pb-3 px-4">Severity</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.length > 0 ? filteredCases.map((c) => {
                  const authorityCategory = getAuthorityCategory(c);

                  return (
                    <tr key={c._id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-mono text-sm text-gray-300">{c.reportId}</td>
                      <td className="py-4 px-4 text-sm text-white max-w-xs truncate" title={c.title}>{c.title}</td>
                      <td className="py-4 px-4 text-sm">
                        <div className={`inline-flex max-w-[260px] flex-col gap-1 rounded-md border px-3 py-2 ${authorityCategory.color}`}>
                          <span className="text-xs font-bold leading-tight">{authorityCategory.name}</span>
                          <span className="text-[11px] leading-tight opacity-80">Route: {authorityCategory.routeTo}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          c.aiAnalysis?.severity === 'Critical' ? 'bg-danger/20 text-danger border border-danger/30' :
                          c.aiAnalysis?.severity === 'Medium' ? 'bg-warning/20 text-warning border border-warning/30' :
                          'bg-success/20 text-success border border-success/30'
                        }`}>
                          {c.aiAnalysis?.severity || 'Low'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-300">{c.status}</td>
                      <td className="py-4 px-4 text-sm text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-4 text-right space-x-2">
                        {c.status === 'Pending' && (
                          <button 
                            onClick={() => updateCaseStatus(c._id, 'Under Review')}
                            className="p-2 bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                            title="Mark as Reviewed (Under Review)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {c.status !== 'Resolved' && c.status !== 'Dismissed' && (
                          <>
                            <button 
                              onClick={() => updateCaseStatus(c._id, 'Resolved')}
                              className="p-2 bg-success/10 text-success rounded hover:bg-success/20 transition-colors"
                              title="Mark Resolved"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => updateCaseStatus(c._id, 'Dismissed')}
                              className="p-2 bg-danger/10 text-danger rounded hover:bg-danger/20 transition-colors"
                              title="Dismiss Case"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">
                      {selectedCategory ? `No ${selectedCategory} reports found` : 'No cases found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Authority Scheduling & Connectivity Section */}
        <div className="glass-panel p-6 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-accent" /> Authority Scheduling & Connectivity
            </h3>
            <button 
              onClick={() => alert('Opening video bridge... Connected to scheduling service.')}
              className="bg-accent/20 text-accent border border-accent px-4 py-2 rounded-lg text-sm font-bold hover:bg-accent hover:text-darkBg transition-colors"
            >
              Schedule New Meeting
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Inspector R. Sharma', dept: 'Cyber Cell', status: 'Online', time: '10:00 AM - 6:00 PM' },
              { name: 'ACP M. Kumar', dept: 'Riot Control', status: 'Busy', time: 'Shift: Night' },
              { name: 'Chief Officer S. Singh', dept: 'Headquarters', status: 'Online', time: 'Available' }
            ].map((auth, idx) => (
              <div key={idx} className="bg-darkBg/50 p-4 rounded-xl border border-gray-700 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-bold">{auth.name}</h4>
                    <span className={`w-3 h-3 rounded-full ${auth.status === 'Online' ? 'bg-success shadow-glow' : 'bg-warning'}`}></span>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{auth.dept}</p>
                  <p className="text-xs text-gray-500">{auth.time}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => alert(`Connecting securely to ${auth.name}...`)}
                    className="flex-1 bg-primary/20 text-primary border border-primary/50 py-2 rounded flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors"
                  >
                    <Video className="w-4 h-4" /> Connect
                  </button>
                  <button 
                    onClick={() => {
                      const msg = prompt(`Send a secure dispatch message to ${auth.name}:`);
                      if (msg) alert('Message sent through secure channel.');
                    }}
                    className="flex-1 bg-gray-800 text-gray-300 py-2 rounded hover:bg-gray-700 transition-colors"
                  >
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
