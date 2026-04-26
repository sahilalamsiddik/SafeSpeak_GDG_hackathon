import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const AuthorityLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/login', formData);
      if (res.data.success && res.data.token) {
        localStorage.setItem('safespeak_token', res.data.token);
        navigate('/authority/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] -z-10"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-md p-8 rounded-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-secondary"></div>
        
        <div className="text-center mb-8">
          <div className="mx-auto bg-darkBg/50 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-gray-700">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authority Command Center</h2>
          <p className="text-sm text-gray-400">Secure access for verified personnel</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-danger/20 border border-danger/50 rounded-lg flex items-center gap-2 text-danger text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Official Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-darkBg border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="officer@safespeak.in"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-darkBg border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-darkBg font-bold py-3 rounded-lg hover:bg-accent/90 shadow-glow transition-all flex justify-center items-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Login'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-500">
          Unauthorised access is strictly prohibited and logged.
        </div>
      </motion.div>
    </div>
  );
};

export default AuthorityLogin;
