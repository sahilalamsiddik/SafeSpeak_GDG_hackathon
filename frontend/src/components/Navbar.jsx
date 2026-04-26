import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('safespeak_token');

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Report Incident', path: '/report' },
    { name: 'ResolveSpace', path: '/resolvespace' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('safespeak_token');
    navigate('/');
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-darkBg/70 backdrop-blur-xl border-b border-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-accent" />
              <span className="font-bold text-xl tracking-wider text-white">Safe<span className="text-accent">Speak</span></span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`${
                    location.pathname === link.path
                      ? 'text-accent border-b-2 border-accent'
                      : 'text-gray-300 hover:text-white hover:border-b-2 hover:border-gray-300'
                  } px-3 py-2 rounded-md text-sm font-medium transition-all duration-300`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {token ? (
              <>
                <Link to="/authority/dashboard" className="text-gray-300 hover:text-accent transition-colors flex items-center gap-2">
                  <User className="w-5 h-5" /> Dashboard
                </Link>
                <button onClick={handleLogout} className="text-danger hover:text-red-400 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link
                to="/authority/login"
                className="bg-accent/20 text-accent border border-accent hover:bg-accent hover:text-darkBg px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-glow"
              >
                Authority Login
              </Link>
            )}
          </div>

          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden glass-panel mt-2 mx-2 p-2 absolute w-[calc(100%-16px)] left-0 top-16">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                {link.name}
              </Link>
            ))}
            {token ? (
               <>
                 <Link
                   to="/authority/dashboard"
                   onClick={() => setIsOpen(false)}
                   className="text-gray-300 hover:text-accent block px-3 py-2 rounded-md text-base font-medium"
                 >
                   Dashboard
                 </Link>
                 <button
                   onClick={() => { handleLogout(); setIsOpen(false); }}
                   className="text-danger w-full text-left px-3 py-2 rounded-md text-base font-medium"
                 >
                   Logout
                 </button>
               </>
            ) : (
              <Link
                to="/authority/login"
                onClick={() => setIsOpen(false)}
                className="text-accent block px-3 py-2 rounded-md text-base font-medium"
              >
                Authority Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
