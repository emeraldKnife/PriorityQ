import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, Clock, AlertCircle, Stethoscope,
  RefreshCw, ArrowUpRight, Activity, Timer, Zap
} from 'lucide-react';
import socket from '../services/socket';
import { getQueue } from '../services/api';

const STATUS_STYLES = {
  WAITING: { color: '#facc15', bg: 'rgba(250,204,21,0.1)', label: 'Waiting' },
  IN_CONSULTATION: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', label: 'In Consult' },
  COMPLETED: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'Completed' },
};

function severityColor(score) {
  if (score >= 85) return '#ef4444';
  if (score >= 65) return '#f97316';
  if (score >= 45) return '#eab308';
  if (score >= 25) return '#84cc16';
  return '#22c55e';
}

function SeverityBar({ score }) {
  const color = severityColor(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '60px', height: '4px', background: 'rgba(255,255,255,0.08)',
        borderRadius: '2px', overflow: 'hidden', flexShrink: 0
      }}>
        <div style={{
          height: '100%', width: `${score}%`,
          background: color, borderRadius: '2px', transition: 'width 0.6s ease'
        }} />
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color, fontFamily: '"JetBrains Mono", monospace' }}>
        {score}
      </span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="glass-card p-4" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
        background: accent + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </p>
        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function QueueRow({ patient, index, onConsult }) {
  const statusStyle = STATUS_STYLES[patient.status] || STATUS_STYLES.WAITING;
  const isTop = index === 0;

  return (
    <div
      className="glass-card glass-card-hover animate-slide-in"
      style={{
        padding: '16px 20px',
        display: 'grid',
        gridTemplateColumns: '44px 1fr auto auto auto auto',
        alignItems: 'center',
        gap: '16px',
        borderColor: isTop ? 'rgba(59,130,246,0.35)' : 'var(--border)',
        background: isTop ? 'rgba(59,130,246,0.06)' : 'var(--bg-card)',
        animationDelay: `${index * 0.05}s`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Rank Badge */}
      <div
        className="rank-badge"
        style={{
          background: isTop ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.05)',
          color: isTop ? '#93c5fd' : 'var(--text-muted)',
          border: isTop ? '1px solid rgba(59,130,246,0.4)' : '1px solid var(--border)',
        }}
      >
        #{patient.queuePosition}
      </div>

      {/* Patient Info */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {patient.patientName}
          </span>
          {patient.age && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {patient.age}y
            </span>
          )}
          {isTop && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, color: '#93c5fd',
              background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.35)',
              borderRadius: '10px', padding: '1px 8px', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Next
            </span>
          )}
        </div>
        <p style={{
          fontSize: '0.75rem', color: 'var(--text-muted)',
          marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap',
          textOverflow: 'ellipsis', maxWidth: '280px'
        }}>
          {patient.rawSymptoms}
        </p>
      </div>

      {/* Severity */}
      <div style={{ textAlign: 'center', minWidth: '80px' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Severity
        </p>
        <SeverityBar score={patient.severityScore} />
      </div>

      {/* Wait Time */}
      <div style={{ textAlign: 'center', minWidth: '64px' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '3px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Wait
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
          <Clock size={11} style={{ color: 'var(--accent-2)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: '"JetBrains Mono", monospace' }}>
            {patient.minutesWaiting}m
          </span>
        </div>
      </div>

      {/* Priority Score */}
      <div style={{ textAlign: 'center', minWidth: '80px' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '3px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Priority
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
          <Zap size={11} style={{ color: '#f59e0b' }} />
          <span style={{
            fontSize: '0.9rem', fontWeight: 700,
            color: '#fbbf24', fontFamily: '"JetBrains Mono", monospace'
          }} className="priority-glow">
            {patient.priorityScore?.toFixed(1)}
          </span>
        </div>
        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {patient.severityScore} + {patient.minutesWaiting}×0.5
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '110px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
          fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
          background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.color}40`
        }}>
          {statusStyle.label}
        </span>
        {patient.status !== 'COMPLETED' && (
          <button
            onClick={() => onConsult(patient._id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              fontSize: '0.72rem', fontWeight: 600, padding: '5px 10px', borderRadius: '6px',
              background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.35)',
              color: '#93c5fd', cursor: 'pointer', transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.18)'; }}
          >
            <Stethoscope size={11} />
            Consult
            <ArrowUpRight size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const [queue, setQueue] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const prevQueueRef = useRef([]);

  // Load initial queue via HTTP
  useEffect(() => {
    getQueue()
      .then(data => { setQueue(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Listen for real-time queue updates
  useEffect(() => {
    const onQueueUpdate = (data) => {
      prevQueueRef.current = queue;
      setQueue(data);
      setLastUpdate(new Date());
    };
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('queue:update', onQueueUpdate);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('queue:update', onQueueUpdate);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [queue]);

  const waiting = queue.filter(p => p.status === 'WAITING').length;
  const inConsultation = queue.filter(p => p.status === 'IN_CONSULTATION').length;
  const avgSeverity = queue.length
    ? (queue.reduce((s, p) => s + p.severityScore, 0) / queue.length).toFixed(1)
    : '—';
  const criticalCount = queue.filter(p => p.severityScore >= 70).length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span style={{
              background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)',
              borderRadius: '20px', padding: '3px 12px', fontSize: '0.72rem',
              color: '#67e8f9', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase'
            }}>
              Doctor Portal
            </span>
          </div>
          <h1 style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: '2.2rem', color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '6px'
          }}>
            Live Priority Queue
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Priority Score = (Severity) + (Minutes Waiting × 0.5) — updates every 60s automatically
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '8px', fontSize: '0.78rem'
          }}>
            <div className="pulse-dot" style={{
              background: isConnected ? '#22c55e' : '#ef4444',
              boxShadow: isConnected ? undefined : 'none'
            }} />
            <span style={{ color: isConnected ? '#4ade80' : '#f87171' }}>
              {isConnected ? 'Socket Connected' : 'Disconnected'}
            </span>
          </div>
          {lastUpdate && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Waiting" value={waiting} accent="#3b82f6" />
        <StatCard icon={Stethoscope} label="In Consult" value={inConsultation} accent="#06b6d4" />
        <StatCard icon={Activity} label="Avg Severity" value={avgSeverity} accent="#eab308" />
        <StatCard icon={AlertCircle} label="Critical (70+)" value={criticalCount} accent="#ef4444" />
      </div>

      {/* Algorithm Legend */}
      <div className="glass-card p-4 mb-6" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={15} style={{ color: '#fbbf24' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Aging Algorithm (Starvation Prevention):
          </span>
        </div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: '0.82rem',
          color: '#fbbf24', background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px',
          padding: '4px 12px'
        }}>
          Priority = S + (T × 0.5)
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          S = Severity (1–100) &nbsp;·&nbsp; T = Minutes Waiting — low-severity patients rise over time
        </span>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p>Loading queue...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.5 }} />
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Queue is empty
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            No patients currently waiting. New check-ins will appear here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Column Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr auto auto auto auto',
            gap: '16px', padding: '0 20px',
            fontSize: '0.68rem', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600
          }}>
            <span>Rank</span>
            <span>Patient</span>
            <span style={{ minWidth: '80px', textAlign: 'center' }}>Severity</span>
            <span style={{ minWidth: '64px', textAlign: 'center' }}>Wait (T)</span>
            <span style={{ minWidth: '80px', textAlign: 'center' }}>Priority ↓</span>
            <span style={{ minWidth: '110px', textAlign: 'center' }}>Action</span>
          </div>

          {queue.map((patient, idx) => (
            <QueueRow
              key={patient._id}
              patient={patient}
              index={idx}
              onConsult={(id) => navigate(`/consultation/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
