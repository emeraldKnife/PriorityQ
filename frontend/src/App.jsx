import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
// Add Sun and Moon to your lucide-react imports
import { Activity, LayoutDashboard, Stethoscope, Wifi, WifiOff, Sun, Moon } from 'lucide-react';
import socket from './services/socket';
import PatientIntake from './components/PatientIntake';
import DoctorDashboard from './components/DoctorDashboard';
import ConsultationRoom from './components/ConsultationRoom';

function Layout({ children }) {
  const [connected, setConnected] = useState(socket.connected);

  // Theme State Setup
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Read saved theme on load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.body.classList.add('light-mode');
    }
  }, []);

  // Toggle Function
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      if (newMode) {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
      }
      return newMode;
    });
  };

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="min-h-screen bg-grid" style={{ background: 'var(--bg-deep)' }}>
      {/* Top Nav */}
      <nav
        style={{
          background: 'var(--nav-bg)', // Updated to use CSS variable
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          transition: 'background-color 0.3s ease, border-color 0.3s ease'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            {/* ... Keep your Logo code exactly the same ... */}
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}
            >
              <Activity size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <span
                style={{
                  fontFamily: '"DM Serif Display", Georgia, serif',
                  fontSize: '1.2rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '0.01em',
                }}
              >
                PriorityQ
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginTop: '-4px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                OPD Intelligence
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-2">
            {/* ... Keep your NavLinks exactly the same ... */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                  ? 'text-accent' // Swapped text-white for var usage if needed, but your inline styles handle active state
                  : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'rgba(59,130,246,0.18)', color: '#3b82f6' }
                  : {}
              }
            >
              <Activity size={15} />
              Patient Intake
            </NavLink>

            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                  ? 'text-accent'
                  : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'rgba(59,130,246,0.18)', color: '#3b82f6' }
                  : {}
              }
            >
              <LayoutDashboard size={15} />
              Doctor Dashboard
            </NavLink>
          </div>

          {/* Connection status AND Theme Toggle */}
          <div className="flex items-center gap-6">

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors hover:bg-[color:var(--border)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <div className="pulse-dot" />
                  <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>Live</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  // ... Keep App function exactly the same
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<PatientIntake />} />
          <Route path="/dashboard" element={<DoctorDashboard />} />
          <Route path="/consultation/:id" element={<ConsultationRoom />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}