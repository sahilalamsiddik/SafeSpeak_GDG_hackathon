import React from 'react';
import { Shield, Phone, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="glass-panel border-b-0 border-l-0 border-r-0 rounded-none mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-accent" />
              <span className="font-bold text-xl tracking-wider text-white">Safe<span className="text-accent">Speak</span></span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              An anonymous public safety reporting platform. All reports are handled by verified government and NGO authorities.
            </p>
            <p className="text-gray-500 text-xs">
              © 2024 SafeSpeak | Built for Bharat | Not affiliated with any political organization.
            </p>
          </div>

          {/* SOS Numbers */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold text-white mb-4">Emergency Contacts</h3>
            <ul className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              <li><span className="text-danger font-bold">100</span> - Police</li>
              <li><span className="text-danger font-bold">108</span> - Ambulance</li>
              <li><span className="text-danger font-bold">101</span> - Fire</li>
              <li><span className="text-accent font-bold">1091</span> - Women Helpline</li>
              <li><span className="text-accent font-bold">1098</span> - Child Helpline</li>
              <li><span className="text-warning font-bold">1079</span> - Disaster</li>
              <li><span className="text-danger font-bold">1090</span> - Anti-Terror</li>
              <li><span className="text-success font-bold">14567</span> - Senior Citizen</li>
            </ul>
          </div>

          {/* Disclaimer & Contact */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold text-white mb-4">Disclaimer</h3>
            <p className="text-gray-400 text-xs mb-4">
              This platform does not store personal information. Information shared is used solely for public safety purposes. 
              <span className="text-danger block mt-2">
                Misuse of this platform to file false reports is punishable under Indian law (IPC Section 182/211).
              </span>
            </p>
            <div className="flex gap-4">
              <a href="mailto:support@safespeak.in" className="text-gray-400 hover:text-accent transition-colors">
                <Mail className="w-5 h-5" />
              </a>
              <a href="tel:100" className="text-gray-400 hover:text-danger transition-colors">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
