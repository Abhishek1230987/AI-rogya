/**
 * Centralized API Configuration
 * All API endpoints should use these constants
 */

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH_LOGIN: `${API_URL}/api/auth/login`,
  AUTH_REGISTER: `${API_URL}/api/auth/register`,
  AUTH_ME: `${API_URL}/api/auth/me`,
  AUTH_GOOGLE: `${API_URL}/api/auth/google`,

  // Medical History
  MEDICAL_HISTORY: `${API_URL}/api/medical/history`,
  MEDICAL_HISTORY_STATUS: `${API_URL}/api/medical/history/status`,

  // Medical Reports
  MEDICAL_REPORTS: `${API_URL}/api/medical/reports`,
  MEDICAL_UPLOAD_REPORT: `${API_URL}/api/medical/upload-report`,
  MEDICAL_DASHBOARD_SUMMARY: `${API_URL}/api/medical/dashboard-summary`,

  // Voice Consultation
  VOICE_HISTORY: `${API_URL}/api/voice/history`,
  VOICE_TEXT_CONSULTATION: `${API_URL}/api/voice/text-consultation`,
  VOICE_TRANSCRIBE: `${API_URL}/api/voice/transcribe`,

  // Consultation
  CONSULTATION_CHAT: `${API_URL}/api/consultation/chat`,
  CONSULTATION_HISTORY: `${API_URL}/api/consultation/history`,
  CONSULTATION_SESSIONS: `${API_URL}/api/consultation/sessions`,

  // Appointments
  HOSPITALS_NEARBY: `${API_URL}/api/hospitals/nearby`,
};

// Helper to get upload file URL
export const getUploadUrl = (filename) => `${API_URL}/uploads/${filename}`;

export default {
  API_URL,
  SOCKET_URL,
  GOOGLE_CLIENT_ID,
  API_ENDPOINTS,
  getUploadUrl,
};
