import React, { useState } from 'react';
import {
  User, FileText, Clock, AlertTriangle, CheckCircle,
  Loader2, ChevronRight, Activity, Thermometer
} from 'lucide-react';
import { checkInPatient } from '../services/api';

const SEVERITY_META = [
  { min: 1, max: 2, label: 'Minimal', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { min: 3, max: 4, label: 'Low',     color: '#84cc16', bg: 'rgba(132,204,22,0.1)' },
  { min: 5, max: 6, label: 'Moderate',color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  { min: 7, max: 8, label: 'High',    color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { min: 9, max: 10,label: 'Critical',color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
];

function getSeverityMeta(score) {
  return SEVERITY_META.find(m => score >= m.min && score <= m.max) || SEVERITY_META[0];
}

const SAMPLE_SYMPTOMS = [
  'Severe chest pain radiating to left arm for 20 minutes',
  'High fever 103°F, severe headache, neck stiffness',
  'Persistent cough, shortness of breath, mild fever',
  'Stomach pain, nausea, vomiting since morning',
  'Mild sore throat, runny nose, routine checkup',
];

export default function PatientIntake() {
  const [form, setForm] = useState({ patientName: '', age: '', rawSymptoms: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientName.trim() || !form.rawSymptoms.trim()) {
      setError('Patient name and symptoms are required.');
      return;
    }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const data = await checkInPatient({
        patientName: form.patientName.trim(),
        age: form.age ? parseInt(form.age) : undefined,
        rawSymptoms: form.rawSymptoms.trim(),
      });
      setResult(data.patient);
      setForm({ patientName: '', age: '', rawSymptoms: '' });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to check in. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const meta = result ? getSeverityMeta(result.severityScore) : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span style={{
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '20px', padding: '3px 12px', fontSize: '0.72rem',
            color: '#93c5fd', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase'
          }}>
            Patient Portal
          </span>
        </div>
        <h1 style={{
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontSize: '2.2rem', color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '8px'
        }}>
          Patient Check-In
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Describe your symptoms below. Our AI will assess urgency and add you to the queue instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── FORM ── */}
        <div className="lg:col-span-3">
          <div className="glass-card p-6">
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
              Registration Form
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name + Age */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600,
                    color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.04em',
                    textTransform: 'uppercase' }}>
                    Full Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      className="input-base"
                      style={{ paddingLeft: '34px' }}
                      name="patientName"
                      value={form.patientName}
                      onChange={handleChange}
                      placeholder="Enter patient name"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600,
                    color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.04em',
                    textTransform: 'uppercase' }}>
                    Age
                  </label>
                  <input
                    className="input-base"
                    name="age"
                    type="number"
                    min="1" max="120"
                    value={form.age}
                    onChange={handleChange}
                    placeholder="yrs"
                  />
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600,
                  color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.04em',
                  textTransform: 'uppercase' }}>
                  Describe Your Symptoms *
                </label>
                <textarea
                  className="input-base"
                  name="rawSymptoms"
                  value={form.rawSymptoms}
                  onChange={handleChange}
                  placeholder="Be as detailed as possible — location, duration, intensity, associated symptoms..."
                  rows={5}
                  style={{ resize: 'vertical', lineHeight: 1.6 }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  The AI uses this text to determine triage severity. More detail = better assessment.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center',
                  gap: '8px', color: '#fca5a5', fontSize: '0.85rem'
                }}>
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Running AI Triage...
                  </>
                ) : (
                  <>
                    <Activity size={16} />
                    Check In & Assess
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Result Card */}
          {result ? (
            <div
              className="glass-card p-5 animate-slide-in"
              style={{ borderColor: meta.color + '44', background: meta.bg }}
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={16} style={{ color: meta.color }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: meta.color }}>
                  Triage Complete
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {result.patientName}
                </p>
                {result.age && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Age: {result.age} years
                  </p>
                )}
              </div>

              {/* Severity */}
              <div className="glass-card p-4" style={{ marginBottom: '12px', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Severity Score
                  </span>
                  <span style={{
                    background: meta.bg, border: `1px solid ${meta.color}44`,
                    borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem',
                    color: meta.color, fontWeight: 600
                  }}>
                    {meta.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{
                    fontSize: '2.5rem', fontWeight: 700, color: meta.color,
                    fontFamily: '"JetBrains Mono", monospace', lineHeight: 1
                  }}>
                    {result.severityScore}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>/10</span>
                </div>

                {/* Bar */}
                <div style={{
                  height: '6px', background: 'rgba(255,255,255,0.08)',
                  borderRadius: '3px', marginTop: '10px', overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%', width: `${result.severityScore * 10}%`,
                    background: meta.color, borderRadius: '3px',
                    transition: 'width 0.8s ease'
                  }} />
                </div>
              </div>

              {/* Est Time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px', border: '1px solid var(--border)' }}>
                <Clock size={14} style={{ color: 'var(--accent-2)' }} />
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Est. Consult Time
                  </p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    ~{result.predictedConsultTimeMins} minutes
                  </p>
                </div>
              </div>

              <p style={{
                fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px',
                textAlign: 'center', lineHeight: 1.5
              }}>
                You've been added to the queue. Please wait for your name to be called.
              </p>
            </div>
          ) : (
            <div className="glass-card p-5" style={{ flex: 1 }}>
              <div className="flex items-center gap-2 mb-4">
                <Thermometer size={15} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  AI Triage Preview
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                After submitting, the AI instantly analyses your symptoms and assigns a severity score from 1–10.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {SEVERITY_META.map(m => (
                  <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '4px', background: m.color, borderRadius: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {m.label} ({m.min}–{m.max})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Symptoms */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Try a Sample
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {SAMPLE_SYMPTOMS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setForm(prev => ({ ...prev, rawSymptoms: s }))}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                    borderRadius: '6px', padding: '7px 10px', textAlign: 'left', cursor: 'pointer',
                    color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.4,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = 'rgba(99,155,255,0.28)'; e.target.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
