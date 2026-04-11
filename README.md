# PriorityQ — AI-Powered OPD Intelligence Platform

> An intelligent outpatient department management system that uses **Google Gemini AI** to triage patients, prioritize queues dynamically, and generate clinical documentation in real-time.

---

## Features

### 🏥 AI-Powered Patient Triage
- Patients describe symptoms via text or voice at check-in
- Gemini Flash analyses the symptoms and assigns a **severity score (1–100)**
- AI estimates the predicted consultation duration

### 📊 Live Priority Queue
- The doctor's dashboard shows a real-time queue sorted by **Priority Score**
- **Priority Score formula:** `S + (T × 0.5)` — Severity + Waiting Time (minutes)
- Implements an **aging algorithm** to prevent low-severity patients from waiting indefinitely
- Queue updates automatically every 60 seconds and instantly via WebSocket on any new check-in

### 🎙️ Voice-to-Text (Speech-to-Text)
- Patients can dictate symptoms verbally instead of typing
- Doctors can record consultations in real-time
- Audio is captured via the browser's `MediaRecorder` API and transcribed by **Gemini AI** on the backend

### 📋 AI Clinical Documentation (SOAP Notes)
- After a consultation, the doctor pastes or records the doctor-patient dialogue
- Gemini generates structured **SOAP notes** (Subjective, Objective, Assessment, Plan)
- AI also drafts a **prescription** with medication name, dosage, frequency, and duration
- A general advice and follow-up summary is also generated

### 🔌 Real-Time Updates
- **Socket.IO** pushes queue updates to all connected doctor dashboards simultaneously
- A live connection indicator shows socket status

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Vanilla CSS, Lucide Icons, Socket.IO Client |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (via Mongoose) |
| **AI** | Google Gemini Flash (`@google/generative-ai`) |
| **Real-time** | Socket.IO |
| **Fonts** | DM Sans, DM Serif Display, JetBrains Mono |

---

## Project Structure

```
PriorityQ/
├── backend/
│   ├── controllers/
│   │   ├── triageController.js      # Patient check-in & AI triage logic
│   │   ├── queueController.js       # Priority score calculation & broadcast
│   │   └── notesController.js       # SOAP note & prescription generation
│   ├── models/
│   │   └── PatientVisit.js          # Mongoose schema (severity, notes, prescription)
│   ├── routes/
│   │   └── api.js                   # All REST API endpoints + /transcribe
│   ├── services/
│   │   └── aiService.js             # Gemini AI: triage, SOAP notes, audio transcription
│   ├── server.js                    # Express + Socket.IO + MongoDB connection
│   ├── .env                         # Environment variables (API key, DB URI)
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── PatientIntake.jsx     # Check-in form with voice input
    │   │   ├── DoctorDashboard.jsx  # Live priority queue for doctors
    │   │   └── ConsultationRoom.jsx # Dialogue input, SOAP notes, prescription
    │   ├── services/
    │   │   ├── api.js               # Axios API helpers
    │   │   └── socket.js            # Socket.IO client singleton
    │   ├── App.jsx                  # Router + layout + nav
    │   └── index.css                # Design system (glassmorphism, tokens)
    └── index.html
```

---

## Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** (running locally on `mongodb://localhost:27017`)
- A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey)

> ⚠️ **Important:** Create your API key by clicking **"Create API key in new project"** in AI Studio. Do not use an existing Google Cloud project — it may have billing restrictions that block the free tier.

---

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Create / update `backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173

MONGO_URI=mongodb://localhost:27017/opd_platform

GEMINI_API_KEY=your_api_key_here
AI_MODEL=gemini-2.0-flash
```

### 3. Start MongoDB

Make sure your local MongoDB service is running:

```powershell
# Windows (run as Administrator)
net start MongoDB
```

### 4. Run the Application

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

---

## How to Use

### Patient Check-In (Patient Intake page)
1. Enter the patient's **name** and **age**
2. Describe symptoms by **typing** or clicking **"Speak"** to use voice
3. Click **"Check In & Assess"**
4. The AI returns a **severity score (1–100)**, a label (e.g., *Moderate*), and an estimated consultation time

### Doctor's Queue (Doctor Dashboard)
1. See all waiting patients sorted by **Priority Score** (highest first)
2. The `#1` patient is highlighted as **"Next"**
3. The queue auto-refreshes every 60 seconds; new check-ins trigger an instant update via Socket.IO
4. Click **"Consult"** to open the consultation room for any patient

### Consultation Room
1. Type or **record** the doctor-patient dialogue
2. Click **"Generate Clinical Notes & Prescription"**
3. The AI produces structured **SOAP notes** and a **draft prescription**
4. Click **"Complete & Discharge"** when done — the patient's status updates to `COMPLETED`

---

## Priority Algorithm

```
Priority Score = Severity Score + (Minutes Waiting × 0.5)
```

| Term | Description |
|---|---|
| **S** | AI-assigned severity (1–100). A crushing chest pain might score 92, a mild cold ~15 |
| **T** | Minutes the patient has been waiting since check-in |
| **× 0.5** | Aging weight — ensures low-severity patients still rise over time (starvation prevention) |

**Example:** A patient with severity 25 who has waited 40 minutes has a score of `25 + 20 = 45`, outranking a new patient with severity 40 who scores `40 + 0 = 40`.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/patients/checkin` | Check in a patient + run AI triage |
| `GET` | `/api/patients` | List all patients |
| `GET` | `/api/patients/:id` | Get patient details |
| `PUT` | `/api/patients/:id/status` | Update patient status |
| `GET` | `/api/queue` | Get current sorted queue |
| `POST` | `/api/patients/:id/notes` | Generate SOAP notes + prescription |
| `PUT` | `/api/patients/:id/complete` | Mark patient as discharged |
| `POST` | `/api/transcribe` | Transcribe audio blob via Gemini |

---

## Known Limitations

- **Voice transcription** requires a working Gemini API key (free tier: ~50 req/day)
- The **Web Speech API** fallback is not used — all STT goes through Gemini on the backend
- **Browser support:** `MediaRecorder` works in Chrome, Edge, and Firefox
- MongoDB must be running locally; there is no cloud DB fallback

---

## License

MIT — feel free to use, modify, and distribute.
