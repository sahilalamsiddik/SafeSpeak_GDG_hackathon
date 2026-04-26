import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ReportIncident from './pages/ReportIncident';
import ResolveSpace from './pages/ResolveSpace';
import AuthorityLogin from './pages/AuthorityLogin';
import Dashboard from './pages/Authority/Dashboard';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/report" element={<ReportIncident />} />
            <Route path="/resolvespace" element={<ResolveSpace />} />
            <Route path="/authority/login" element={<AuthorityLogin />} />
            <Route path="/authority/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
