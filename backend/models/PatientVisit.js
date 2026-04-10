const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medication: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String },
  duration: { type: String },
});

const notesSchema = new mongoose.Schema({
  subjective: { type: String, default: '' },   // Patient's complaints in their own words
  objective: { type: String, default: '' },    // Clinical observations / vitals
  assessment: { type: String, default: '' },   // Diagnosis
  plan: { type: String, default: '' },         // Treatment plan
});

const patientVisitSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
    },
    rawSymptoms: {
      type: String,
      required: true,
    },
    severityScore: {
      type: Number,
      min: 1,
      max: 100,
      default: 1,
    },
    predictedConsultTimeMins: {
      type: Number,
      default: 15,
    },
    status: {
      type: String,
      enum: ['WAITING', 'IN_CONSULTATION', 'COMPLETED'],
      default: 'WAITING',
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: notesSchema,
      default: () => ({}),
    },
    prescription: {
      type: [prescriptionItemSchema],
      default: [],
    },
    rawDialogue: {
      type: String,
      default: '',
    },
    advice: {
      type: String,
      default: '',
    },
    diagnosis: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Virtual field: minutesWaiting (not stored in DB, computed on the fly)
patientVisitSchema.virtual('minutesWaiting').get(function () {
  return Math.floor((Date.now() - this.checkInTime.getTime()) / 60000);
});

// Virtual field: priorityScore (not stored, computed dynamically)
// Formula: PriorityScore = (severityScore * 1) + (minutesWaiting * 0.5)
// severityScore is 1-100; weight of 1 keeps it proportional
patientVisitSchema.virtual('priorityScore').get(function () {
  const minutesWaiting = Math.floor((Date.now() - this.checkInTime.getTime()) / 60000);
  return parseFloat(((this.severityScore * 1) + (minutesWaiting * 0.5)).toFixed(2));
});

patientVisitSchema.set('toJSON', { virtuals: true });
patientVisitSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PatientVisit', patientVisitSchema);
