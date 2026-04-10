const PatientVisit = require('../models/PatientVisit');
const { generateClinicalNotes } = require('../services/aiService');
const { recalculateAndBroadcastQueue } = require('./queueController');

/**
 * POST /api/patients/:id/notes
 * Accepts raw doctor-patient dialogue, runs AI clinical documentation,
 * saves structured SOAP notes + prescription to the patient record.
 */
async function generateAndSaveNotes(req, res) {
  try {
    const { dialogue } = req.body;
    if (!dialogue || dialogue.trim().length < 10) {
      return res.status(400).json({ error: 'Dialogue text is required and must be meaningful.' });
    }

    const patient = await PatientVisit.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    // Run AI clinical documentation
    let clinicalData;
    try {
      clinicalData = await generateClinicalNotes(dialogue);
    } catch (aiErr) {
      console.error('AI notes generation failed:', aiErr.message);
      return res.status(502).json({ error: 'AI service unavailable. Please try again.' });
    }

    const { symptoms, objective, diagnosis, prescription, advice } = clinicalData;

    // Map to SOAP format
    patient.rawDialogue = dialogue;
    patient.diagnosis = diagnosis || '';
    patient.advice = advice || '';
    patient.notes = {
      subjective: symptoms || '',
      objective: objective || 'Vitals stable. Clinical examination in progress.',
      assessment: diagnosis || '',
      plan: advice || '',
    };
    patient.prescription = Array.isArray(prescription)
      ? prescription.map((item) => ({
          medication: item.medication || item.name || 'Unknown',
          dosage: item.dosage || '',
          frequency: item.frequency || '',
          duration: item.duration || '',
        }))
      : [];

    // Mark as IN_CONSULTATION if still WAITING
    if (patient.status === 'WAITING') {
      patient.status = 'IN_CONSULTATION';
    }

    await patient.save();
    await recalculateAndBroadcastQueue(req.io);

    return res.json({
      message: 'Clinical notes generated and saved.',
      patient: patient.toJSON(),
    });
  } catch (err) {
    console.error('generateAndSaveNotes error:', err);
    return res.status(500).json({ error: 'Internal server error during note generation.' });
  }
}

/**
 * PUT /api/patients/:id/complete
 * Mark consultation as complete.
 */
async function completeConsultation(req, res) {
  try {
    const patient = await PatientVisit.findByIdAndUpdate(
      req.params.id,
      { status: 'COMPLETED' },
      { new: true }
    );
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    await recalculateAndBroadcastQueue(req.io);
    return res.json({ message: 'Consultation completed.', patient: patient.toJSON() });
  } catch (err) {
    console.error('completeConsultation error:', err);
    return res.status(500).json({ error: 'Failed to complete consultation.' });
  }
}

module.exports = { generateAndSaveNotes, completeConsultation };
