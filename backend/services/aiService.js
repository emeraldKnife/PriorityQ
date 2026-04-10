require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

/**
 * Core helper: sends a prompt to the LLM and returns the raw text response.
 */
async function callLLM(systemPrompt, userContent) {
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/**
 * Safely parse JSON from LLM response.
 * Strips markdown code fences if present.
 */
function safeParseJSON(text) {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────────────────────────
// TRIAGE AI
// Input: raw symptom text
// Output: { severity_score: int (1-10), predicted_consult_time_mins: int }
// ─────────────────────────────────────────────────────────────────
async function triagePatient(symptoms) {
  // DEMO MODE: If no API key, return a deterministic mock based on keyword matching
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    return getMockTriageResult(symptoms);
  }

  const systemPrompt = `You are a medical triage AI assistant working in an OPD (Outpatient Department).
Analyze the patient's symptoms and return ONLY a raw JSON object — no explanations, no markdown.
The JSON must have exactly two keys:
- "severity_score": an integer from 1 to 10 (1 = very mild, 10 = life-threatening emergency)
- "predicted_consult_time_mins": an integer (estimated consultation time in minutes)`;

  const userContent = `Patient symptoms: ${symptoms}`;

  const raw = await callLLM(systemPrompt, userContent);
  return safeParseJSON(raw);
}

function getMockTriageResult(symptoms) {
  const lower = symptoms.toLowerCase();
  let severity = 3;
  let time = 10;

  if (/chest pain|heart attack|stroke|unconscious|seizure|severe bleed/i.test(lower)) {
    severity = 9; time = 30;
  } else if (/breathing|difficulty breath|shortness|fracture|broken bone|high fever/i.test(lower)) {
    severity = 7; time = 20;
  } else if (/fever|vomit|diarrhea|abdominal pain|headache|infection/i.test(lower)) {
    severity = 5; time = 15;
  } else if (/cold|cough|sore throat|mild pain|rash|allergy/i.test(lower)) {
    severity = 3; time = 10;
  } else if (/checkup|routine|prescription refill|follow.?up/i.test(lower)) {
    severity = 2; time = 8;
  }

  // Add slight randomness for demo purposes
  severity = Math.min(10, Math.max(1, severity + Math.floor(Math.random() * 2 - 1)));
  return { severity_score: severity, predicted_consult_time_mins: time };
}

// ─────────────────────────────────────────────────────────────────
// CLINICAL DOCUMENTATION AI
// Input: raw doctor-patient dialogue text
// Output: { symptoms, diagnosis, prescription: [{medication, dosage, frequency, duration}], advice }
// ─────────────────────────────────────────────────────────────────
async function generateClinicalNotes(dialogue) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    return getMockClinicalNotes(dialogue);
  }

  const systemPrompt = `You are an expert medical scribe AI working in an OPD.
Convert the following doctor-patient dialogue into a structured clinical note.
Return ONLY a raw JSON object with exactly these keys:
- "symptoms": string (patient's chief complaints in SOAP Subjective style)
- "objective": string (any clinical observations or vitals mentioned)  
- "diagnosis": string (the doctor's assessment / diagnosis)
- "prescription": array of objects, each with: { "medication": string, "dosage": string, "frequency": string, "duration": string }
- "advice": string (any lifestyle advice, follow-up instructions, or precautions)
If any section is not mentioned in the dialogue, provide a clinically reasonable placeholder based on context.
Do NOT include markdown, code fences, or any explanatory text.`;

  const userContent = `Doctor-Patient Dialogue:\n${dialogue}`;

  const raw = await callLLM(systemPrompt, userContent);
  return safeParseJSON(raw);
}

function getMockClinicalNotes(dialogue) {
  return {
    symptoms: 'Patient reports persistent headache for the past 3 days, associated with mild fever and body ache. No vomiting or neck stiffness reported.',
    objective: 'Temperature: 99.8°F. Blood pressure: 118/76 mmHg. Throat mildly congested. No lymphadenopathy.',
    diagnosis: 'Viral Upper Respiratory Tract Infection (URTI) with tension headache.',
    prescription: [
      { medication: 'Paracetamol 500mg', dosage: '500mg', frequency: 'Twice daily after meals', duration: '5 days' },
      { medication: 'Cetirizine', dosage: '10mg', frequency: 'Once daily at bedtime', duration: '5 days' },
      { medication: 'Vitamin C', dosage: '500mg', frequency: 'Once daily', duration: '7 days' },
    ],
    advice: 'Rest adequately. Maintain good hydration (2-3 litres of fluids daily). Avoid cold beverages and exposure to dust. Return immediately if fever exceeds 103°F or symptoms worsen. Follow-up after 5 days.',
  };
}

module.exports = { triagePatient, generateClinicalNotes };
