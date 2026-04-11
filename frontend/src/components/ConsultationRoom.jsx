import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mic, MicOff, Loader2, CheckCircle, ClipboardList,
  Pill, FileText, AlertTriangle, Stethoscope, User, Clock,
  ChevronRight, RefreshCw, Activity
} from 'lucide-react';
import { getPatientById, generateNotes, completeConsultation, transcribeAudio } from '../services/api';


function SOAPSection({ label, content, color }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.2)', border: `1px solid ${color}22`,
      borderLeft: `3px solid ${color}`, borderRadius: '8px', padding: '14px 16px'
    }}>
      <p style={{
        fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: '8px'
      }}>
        {label}
      </p>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>
        {content || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not documented</span>}
      </p>
    </div>
  );
}

function PrescriptionCard({ item, index }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '14px',
      padding: '14px 16px', background: 'rgba(0,0,0,0.2)',
      border: '1px solid var(--border)', borderRadius: '8px'
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
        background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 700, color: '#93c5fd'
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {item.medication}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {item.dosage && (
            <span style={{
              fontSize: '0.73rem', padding: '2px 8px', borderRadius: '4px',
              background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)'
            }}>
              {item.dosage}
            </span>
          )}
          {item.frequency && (
            <span style={{
              fontSize: '0.73rem', padding: '2px 8px', borderRadius: '4px',
              background: 'rgba(6,182,212,0.1)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.2)'
            }}>
              {item.frequency}
            </span>
          )}
          {item.duration && (
            <span style={{
              fontSize: '0.73rem', padding: '2px 8px', borderRadius: '4px',
              background: 'rgba(168,85,247,0.1)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.2)'
            }}>
              {item.duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConsultationRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [dialogue, setDialogue] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [notesGenerated, setNotesGenerated] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    getPatientById(id)
      .then(data => {
        setPatient(data);
        if (data.rawDialogue) setDialogue(data.rawDialogue);
        if (data.notes?.subjective) setNotesGenerated(true);
        setLoading(false);
      })
      .catch(() => {
        setError('Patient not found.');
        setLoading(false);
      });
  }, [id]);

  // MediaRecorder-based recording (sends to Gemini via backend)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sttError, setSttError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const toggleRecording = async () => {
    setSttError('');
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          setIsTranscribing(true);
          try {
            const { transcript } = await transcribeAudio(base64, 'audio/webm');
            if (transcript) {
              setDialogue((prev) =>
                prev ? prev.trimEnd() + '\n' + transcript : transcript
              );
            }
          } catch (err) {
            setSttError(err?.response?.data?.error || 'Transcription failed. Please try again.');
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setSttError('Microphone access denied. Click the 🔒 icon in the address bar, allow microphone, then try again.');
      } else {
        setSttError(`Could not access microphone: ${err.message}`);
      }
    }
  };

  const handleGenerateNotes = async () => {
    if (!dialogue.trim() || dialogue.trim().length < 20) {
      setError('Please enter the doctor-patient dialogue (at least a few sentences).');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const data = await generateNotes(id, dialogue);
      setPatient(data.patient);
      setNotesGenerated(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'AI generation failed. Check backend connection.');
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeConsultation(id);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to complete consultation.');
      setCompleting(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
      <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
      <p>Loading patient record...</p>
    </div>
  );

  if (error && !patient) return (
    <div style={{ textAlign: 'center', padding: '80px' }}>
      <AlertTriangle size={40} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
      <p style={{ color: '#fca5a5', marginBottom: '16px' }}>{error}</p>
      <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </button>
    </div>
  );

  const notes = patient?.notes || {};
  const prescription = patient?.prescription || [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
        >
          <ArrowLeft size={14} />
          Dashboard
        </button>
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{
              background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: '20px', padding: '3px 12px', fontSize: '0.72rem',
              color: '#d8b4fe', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase'
            }}>
              Consultation Room
            </span>
          </div>
          <h1 style={{
            fontFamily: '"DM Serif Display", Georgia, serif',
            fontSize: '1.8rem', color: 'var(--text-primary)', lineHeight: 1.2
          }}>
            {patient?.patientName}
          </h1>
        </div>
        <button
          onClick={handleComplete}
          disabled={completing}
          className="btn-success"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {completing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
          Complete & Discharge
        </button>
      </div>

      {/* Patient Summary Banner */}
      <div className="glass-card p-4 mb-6" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px'
      }}>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Patient</p>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            {patient?.patientName} {patient?.age ? `(${patient.age}y)` : ''}
          </p>
        </div>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Severity</p>
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: patient?.severityScore >= 70 ? '#ef4444' : patient?.severityScore >= 50 ? '#eab308' : '#22c55e', marginTop: '2px', fontFamily: '"JetBrains Mono", monospace' }}>
            {patient?.severityScore}/100
          </p>
        </div>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Time</p>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            ~{patient?.predictedConsultTimeMins} min
          </p>
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chief Complaint</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
            {patient?.rawSymptoms?.slice(0, 120)}{patient?.rawSymptoms?.length > 120 ? '...' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Dialogue Input ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card p-6" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="flex items-center gap-2">
                <Stethoscope size={16} style={{ color: 'var(--accent-2)' }} />
                <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Doctor–Patient Dialogue
                </h2>
              </div>
              <button
                onClick={toggleRecording}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '20px',
                  cursor: isTranscribing ? 'default' : 'pointer',
                  border: isRecording
                    ? '1px solid rgba(239,68,68,0.4)'
                    : isTranscribing
                      ? '1px solid rgba(251,191,36,0.4)'
                      : '1px solid var(--border)',
                  background: isRecording
                    ? 'rgba(239,68,68,0.12)'
                    : isTranscribing
                      ? 'rgba(251,191,36,0.1)'
                      : 'rgba(255,255,255,0.04)',
                  color: isRecording ? '#fca5a5' : isTranscribing ? '#fbbf24' : 'var(--text-secondary)',
                  fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s', opacity: isTranscribing ? 0.8 : 1
                }}
              >
                {isTranscribing
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Transcribing…</>
                  : isRecording
                    ? <><MicOff size={13} /> Stop Recording <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite', display: 'inline-block' }} /></>
                    : <><Mic size={13} /> Use Microphone</>
                }
              </button>
            </div>

            <textarea
              ref={textareaRef}
              className="input-base"
              value={dialogue}
              onChange={e => { setDialogue(e.target.value); setError(''); }}
              placeholder={`Paste or type the consultation dialogue here.\n\nOr use the microphone to record in real-time.`}
              rows={12}
              style={{ resize: 'none', lineHeight: 1.7, fontSize: '0.85rem' }}
            />

            {/* Recording / transcribing status */}
            {(isRecording || isTranscribing) && (
              <div style={{
                marginTop: '8px', padding: '8px 12px', borderRadius: '6px',
                background: isTranscribing ? 'rgba(251,191,36,0.08)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${isTranscribing ? 'rgba(251,191,36,0.25)' : 'rgba(239,68,68,0.2)'}`,
                fontSize: '0.8rem', color: isTranscribing ? '#fbbf24' : '#fca5a5', lineHeight: 1.5,
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {isTranscribing
                  ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Transcribing audio with Gemini AI…</>
                  : <><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite', display: 'inline-block', flexShrink: 0 }} /> 🎙️ Recording… click Stop when done.</>
                }
              </div>
            )}

            {/* STT error message */}
            {sttError && (
              <div style={{
                marginTop: '8px', padding: '8px 12px', borderRadius: '6px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                fontSize: '0.78rem', color: '#fca5a5', lineHeight: 1.5,
                display: 'flex', alignItems: 'flex-start', gap: '8px'
              }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                {sttError}
              </div>
            )}

            {error && (
              <div style={{
                marginTop: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '8px', padding: '10px 14px', display: 'flex',
                alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '0.83rem'
              }}>
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateNotes}
              disabled={generating || !dialogue.trim()}
              className="btn-primary"
              style={{
                width: '100%', marginTop: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {generating ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  AI is generating SOAP notes...
                </>
              ) : (
                <>
                  <Activity size={16} />
                  Generate Clinical Notes & Prescription
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT: SOAP Notes + Prescription ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* SOAP Notes */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={16} style={{ color: '#a78bfa' }} />
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                SOAP Clinical Notes
              </h2>
              {notesGenerated && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.68rem', fontWeight: 600,
                  color: '#4ade80', background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '2px 8px'
                }}>
                  AI Generated
                </span>
              )}
            </div>

            {notesGenerated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SOAPSection label="S — Subjective" content={notes.subjective} color="#3b82f6" />
                <SOAPSection label="O — Objective" content={notes.objective} color="#06b6d4" />
                <SOAPSection label="A — Assessment" content={notes.assessment} color="#a78bfa" />
                <SOAPSection label="P — Plan" content={notes.plan} color="#22c55e" />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <FileText size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  SOAP notes will appear here after you input the consultation dialogue and click Generate.
                </p>
              </div>
            )}
          </div>

          {/* Prescription */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Pill size={16} style={{ color: '#4ade80' }} />
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Draft Prescription
              </h2>
              {prescription.length > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)',
                  fontFamily: '"JetBrains Mono", monospace'
                }}>
                  {prescription.length} item{prescription.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {prescription.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {prescription.map((item, i) => (
                  <PrescriptionCard key={i} item={item} index={i} />
                ))}
                {patient?.advice && (
                  <div style={{
                    marginTop: '4px', padding: '12px 14px', borderRadius: '8px',
                    background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)'
                  }}>
                    <p style={{
                      fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px'
                    }}>
                      Advice & Follow-up
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {patient.advice}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <Pill size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                  Prescription items will appear after AI generates notes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
