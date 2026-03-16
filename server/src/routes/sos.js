/**
 * SOS Routes
 * Handles emergency SOS functionality endpoints
 */

import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  sendSOSAlert,
  updateEmergencyContacts,
  getSOSConfig,
  getSOSHistory,
  testTelegramConnection,
} from "../controllers/sosController.js";

const router = express.Router();

/**
 * POST /api/sos/send
 * Send SOS alert to emergency contacts
 * Auth: Required
 */
router.post("/send", authenticateToken, sendSOSAlert);

/**
 * POST /api/sos/update-contacts
 * Update emergency contact Telegram IDs
 * Auth: Required
 */
router.post("/update-contacts", authenticateToken, updateEmergencyContacts);

/**
 * GET /api/sos/config
 * Get SOS configuration and emergency contacts status
 * Auth: Required
 */
router.get("/config", authenticateToken, getSOSConfig);

/**
 * GET /api/sos/history
 * Get SOS alert history
 * Auth: Required
 * Query: limit, offset
 */
router.get("/history", authenticateToken, getSOSHistory);

/**
 * POST /api/sos/test-telegram
 * Test Telegram connection with a chat ID
 * Auth: Not required (for setup purposes)
 */
router.post("/test-telegram", testTelegramConnection);

export default router;
