import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkInPatient = async (patientData) => {
  const response = await api.post('/patients/checkin', patientData);
  return response.data;
};

export const getQueue = async () => {
  const response = await api.get('/queue');
  return response.data;
};

export const getPatientById = async (id) => {
  const response = await api.get(`/patients/${id}`);
  return response.data;
};

export const generateNotes = async (id, dialogue) => {
  const response = await api.post(`/patients/${id}/notes`, { dialogue });
  return response.data;
};

export const completeConsultation = async (id) => {
  const response = await api.put(`/patients/${id}/complete`);
  return response.data;
};

export default api;
