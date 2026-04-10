const express = require('express');
const router = express.Router();

const { checkInPatient, getAllPatients, getPatientById, updatePatientStatus } = require('../controllers/triageController');
const { getQueue } = require('../controllers/queueController');
const { generateAndSaveNotes, completeConsultation } = require('../controllers/notesController');
const { transcribeAudio } = require('../services/aiService');

// ── Health check ──────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// ── Queue ─────────────────────────────────────────────────────────
router.get('/queue', getQueue);

// ── Patient routes ────────────────────────────────────────────────
router.post('/patients/checkin', checkInPatient);
router.get('/patients', getAllPatients);
router.get('/patients/:id', getPatientById);
router.put('/patients/:id/status', updatePatientStatus);

// ── Clinical documentation ────────────────────────────────────────
router.post('/patients/:id/notes', generateAndSaveNotes);
router.put('/patients/:id/complete', completeConsultation);

// ── Audio transcription ───────────────────────────────────────────
router.post('/transcribe', async (req, res) => {
  try {
    const { audio, mimeType } = req.body;
    if (!audio) return res.status(400).json({ error: 'audio (base64) is required.' });
    const transcript = await transcribeAudio(audio, mimeType);
    return res.json({ transcript });
  } catch (err) {
    console.error('Transcription error:', err.message);
    return res.status(502).json({ error: err.message || 'Transcription failed.' });
  }
});

module.exports = router;
