import express from "express";
import multer from "multer";
import { auth, optionalAuth } from "../middleware/auth.js";
import {
  getMedicalHistory,
  createMedicalHistory,
  processAudioConsultation,
  chatConsultation,
  getTextChatSessions,
  createTextChatSession,
  renameTextChatSession,
  getTextConsultationHistory,
  clearTextConsultationHistory,
  deleteTextChatSession,
} from "../controllers/consultation.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Public routes - No authentication required
// Chat consultation route with AI - uses optional auth to fetch medical history if logged in
router.post("/chat", optionalAuth, chatConsultation);

// Protected routes - Require authentication
router.use(auth);

// Text chat session routes
router.get("/sessions", getTextChatSessions);
router.post("/sessions", createTextChatSession);
router.patch("/sessions/:sessionId", renameTextChatSession);
router.delete("/sessions/:sessionId", deleteTextChatSession);

// Text consultation history routes
router.get("/history", getTextConsultationHistory);
router.delete("/history", clearTextConsultationHistory);

// Medical history routes
router.get("/medical-history", getMedicalHistory);
router.post("/medical-history", createMedicalHistory);

// Audio consultation route
router.post("/process-audio", upload.single("audio"), processAudioConsultation);

export default router;
