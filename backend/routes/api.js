const express = require('express');
const router = express.Router();

const { checkInPatient, getAllPatients, getPatientById, updatePatientStatus } = require('../controllers/triageController');
const { getQueue } = require('../controllers/queueController');
const { generateAndSaveNotes, completeConsultation } = require('../controllers/notesController');

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

module.exports = router;
