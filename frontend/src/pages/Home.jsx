import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, Activity } from 'lucide-react';
import Earth3D from '../components/Earth3D';

const Home = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Earth3D />
      
      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-16">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent via-white to-secondary mb-6">
            Empowering Voices,<br />Securing Tomorrow
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            AI-driven, anonymous conflict reporting platform. Help us identify and resolve issues before they escalate. Your identity is fully protected.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/report">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 bg-danger text-white rounded-xl font-bold text-lg shadow-glow-danger hover:bg-red-600 transition-all"
              >
                Report Incident Anonymously
              </motion.button>
            </Link>
            <Link to="/resolvespace">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 glass-panel text-accent border-accent hover:bg-accent/20 rounded-xl font-bold text-lg transition-all"
              >
                View ResolveSpace
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto pb-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-8 rounded-2xl text-center group hover:border-accent/50 transition-all"
          >
            <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">100% Anonymous</h3>
            <p className="text-gray-400">
              Your identity is never required. Advanced encryption ensures complete privacy while reporting sensitive issues.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="glass-panel p-8 rounded-2xl text-center group hover:border-secondary/50 transition-all"
          >
            <div className="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Activity className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">AI-Powered Analysis</h3>
            <p className="text-gray-400">
              Natural Language Processing automatically detects severity, classifies conflict types, and filters spam.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="glass-panel p-8 rounded-2xl text-center group hover:border-primary/50 transition-all"
          >
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Community Resolve</h3>
            <p className="text-gray-400">
              Collaborate in ResolveSpace. Critical issues are automatically escalated to authorities after reaching thresholds.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Home;
