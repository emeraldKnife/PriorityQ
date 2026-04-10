import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Activity, LayoutDashboard, Stethoscope, Wifi, WifiOff } from 'lucide-react';
import socket from './services/socket';
import PatientIntake from './components/PatientIntake';
import DoctorDashboard from './components/DoctorDashboard';
import ConsultationRoom from './components/ConsultationRoom';

function Layout({ children }) {
  const [connected, setConnected] = useState(socket.connected);

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
          background: 'rgba(8,15,26,0.92)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
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
                MediQ
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
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'rgba(59,130,246,0.18)', color: '#93c5fd' }
                  : {}
              }
            >
              <Activity size={15} />
              Patient Intake
            </NavLink>

            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'rgba(59,130,246,0.18)', color: '#93c5fd' }
                  : {}
              }
            >
              <LayoutDashboard size={15} />
              Doctor Dashboard
            </NavLink>
          </div>

          {/* Connection status */}
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
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

export default function App() {
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
