# MediQ — AI-Powered OPD Intelligence Platform

A full-stack healthcare application featuring **smart AI triage**, a **dynamic priority queue with starvation prevention**, and **AI-powered clinical documentation**.

---

## 🏗️ Architecture Overview

```
/opd-platform
├── /backend          → Node.js + Express + Socket.io + MongoDB
│   ├── server.js
│   ├── /models       → Mongoose schemas
│   ├── /controllers  → Business logic
│   ├── /routes       → Express routes
│   └── /services     → AI (OpenAI) abstraction layer
└── /frontend         → React + Vite + Tailwind CSS
    └── /src
        ├── App.jsx
        ├── /components
        │   ├── PatientIntake.jsx      → Patient check-in + AI triage
        │   ├── DoctorDashboard.jsx   → Live priority queue (WebSocket)
        │   └── ConsultationRoom.jsx  → SOAP notes + prescription AI
        └── /services
            ├── socket.js             → Socket.io client
            └── api.js                → Axios API calls
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- MongoDB running locally (`mongod`) OR a MongoDB Atlas URI
- (Optional) OpenAI API key — the app runs in **Demo Mode** without one

---

### 1. Backend Setup

```bash
cd backend
npm install
```

Edit `.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/opd_platform
OPENAI_API_KEY=your_openai_api_key_here   # Leave as-is for Demo Mode
AI_MODEL=gpt-4o-mini
```

Start the server:
```bash
npm run dev    # with nodemon (auto-reload)
# OR
npm start      # production
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 🤖 AI Modes

### Demo Mode (no API key required)
If `OPENAI_API_KEY` is not set, the app uses smart keyword-based mock responses:
- Triage AI: Detects severity from keywords (chest pain → 9/10, cold → 3/10)
- Clinical AI: Returns realistic SOAP notes and a sample prescription

### Live Mode (with OpenAI key)
Set `OPENAI_API_KEY` in `.env` and the AI uses `gpt-4o-mini` for real responses.

---

## 🧮 Priority Queue Algorithm

```
PriorityScore = (Severity × Ws) + (MinutesWaiting × Wt)

Where:
  Severity       = AI-assigned score (1–10)
  MinutesWaiting = Time since check-in
  Ws = 10        (severity weight)
  Wt = 0.5       (time weight)
```

**Starvation Prevention**: A patient with severity 2 who has waited 60 minutes gets:
`Priority = (2×10) + (60×0.5) = 50` — outranking a new severity 4 patient at `(4×10) + (0×0.5) = 40`

The queue recalculates and **broadcasts via WebSocket every 60 seconds** automatically.

---

## 📡 API Endpoints

| Method | Endpoint                       | Description                    |
|--------|--------------------------------|--------------------------------|
| GET    | `/api/health`                  | Health check                   |
| GET    | `/api/queue`                   | Get live priority queue        |
| POST   | `/api/patients/checkin`        | Check in patient + AI triage   |
| GET    | `/api/patients`                | Get all active patients        |
| GET    | `/api/patients/:id`            | Get patient by ID              |
| PUT    | `/api/patients/:id/status`     | Update status                  |
| POST   | `/api/patients/:id/notes`      | Generate AI clinical notes     |
| PUT    | `/api/patients/:id/complete`   | Complete consultation          |

---

## 🔌 WebSocket Events

| Event          | Direction         | Payload                         |
|----------------|-------------------|---------------------------------|
| `queue:update` | Server → Clients  | Sorted array of patient objects |

---

## 🎯 Features

- **Patient Intake**: Form with AI severity scoring (1–10) and consult time estimate
- **Live Queue**: Real-time WebSocket dashboard — priority scores visibly change as wait time increases
- **Consultation Room**: Paste or speak dialogue → AI generates SOAP notes + prescription
- **Speech-to-Text**: Web Speech API integration (Chrome recommended)
- **Demo Mode**: Works offline/without API key using smart mock AI
- **Dark UI**: Professional medical interface with DM Serif Display + DM Sans fonts

---

## 🗂️ MongoDB Schema (PatientVisit)

```js
{
  patientName:            String (required)
  age:                    Number
  rawSymptoms:            String (required)
  severityScore:          Number (1–10)
  predictedConsultTimeMins: Number
  status:                 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED'
  checkInTime:            Date
  notes: {
    subjective, objective, assessment, plan  // SOAP
  }
  prescription:           [{ medication, dosage, frequency, duration }]
  rawDialogue:            String
  diagnosis:              String
  advice:                 String
  // Virtuals (computed):
  minutesWaiting:         Number
  priorityScore:          Number
}
```
