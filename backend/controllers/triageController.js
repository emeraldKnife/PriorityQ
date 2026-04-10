const PatientVisit = require('../models/PatientVisit');
const { triagePatient } = require('../services/aiService');
const { recalculateAndBroadcastQueue } = require('./queueController');

/**
 * POST /api/patients/checkin
 * Register a new patient and run AI triage.
 */
async function checkInPatient(req, res) {
  try {
    const { patientName, age, rawSymptoms } = req.body;

    if (!patientName || !rawSymptoms) {
      return res.status(400).json({ error: 'patientName and rawSymptoms are required.' });
    }

    // Run AI triage
    let triageResult;
    try {
      triageResult = await triagePatient(rawSymptoms);
    } catch (aiErr) {
      console.error('AI triage failed, using defaults:', aiErr.message);
      triageResult = { severity_score: 3, predicted_consult_time_mins: 15 };
    }

    const { severity_score, predicted_consult_time_mins } = triageResult;

    // Create patient record
    const visit = new PatientVisit({
      patientName,
      age: age || null,
      rawSymptoms,
      severityScore: severity_score,
      predictedConsultTimeMins: predicted_consult_time_mins,
      status: 'WAITING',
      checkInTime: new Date(),
    });

    await visit.save();

    // Broadcast updated queue via WebSockets
    await recalculateAndBroadcastQueue(req.io);

    return res.status(201).json({
      message: 'Patient checked in successfully.',
      patient: visit.toJSON(),
    });
  } catch (err) {
    console.error('checkInPatient error:', err);
    return res.status(500).json({ error: 'Internal server error during check-in.' });
  }
}

/**
 * GET /api/patients
 * Fetch all non-completed patients with computed priority scores.
 */
async function getAllPatients(req, res) {
  try {
    const patients = await PatientVisit.find({ status: { $ne: 'COMPLETED' } }).sort({ checkInTime: 1 });
    const withScores = patients.map((p) => p.toJSON());
    return res.json(withScores);
  } catch (err) {
    console.error('getAllPatients error:', err);
    return res.status(500).json({ error: 'Failed to fetch patients.' });
  }
}

/**
 * GET /api/patients/:id
 * Fetch a single patient by ID.
 */
async function getPatientById(req, res) {
  try {
    const patient = await PatientVisit.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    return res.json(patient.toJSON());
  } catch (err) {
    console.error('getPatientById error:', err);
    return res.status(500).json({ error: 'Failed to fetch patient.' });
  }
}

/**
 * PUT /api/patients/:id/status
 * Update patient status (WAITING → IN_CONSULTATION → COMPLETED).
 */
async function updatePatientStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ['WAITING', 'IN_CONSULTATION', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const patient = await PatientVisit.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    await recalculateAndBroadcastQueue(req.io);
    return res.json({ message: 'Status updated.', patient: patient.toJSON() });
  } catch (err) {
    console.error('updatePatientStatus error:', err);
    return res.status(500).json({ error: 'Failed to update status.' });
  }
}

module.exports = { checkInPatient, getAllPatients, getPatientById, updatePatientStatus };
