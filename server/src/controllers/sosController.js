/**
 * SOS Controller
 * Handles emergency SOS functionality and alerts to parents/guardians
 */

import pool from "../config/database.js";
import {
  sendTelegramMessage,
  sendSOSToMultiple,
  sendTelegramAudio,
  formatSOSMessage,
  isTelegramConfigured,
} from "../services/telegramService.js";

/**
 * Send SOS alert to parents/guardians
 * POST /api/sos/send
 * @body {Object} sosData - SOS information
 * @body {string} sosData.message - Custom SOS message
 * @body {string} sosData.severity - Alert severity (LOW, MEDIUM, HIGH, CRITICAL)
 * @body {Object} sosData.location - Location data (latitude, longitude, address)
 * @body {File} audio - Optional audio file
 * @returns {Object} SOS send result
 */
export const sendSOSAlert = async (req, res) => {
  // Prevent multiple calls with request timeout
  const startTime = Date.now();
  const REQUEST_TIMEOUT = 60000; // 60 seconds

  try {
    const userId = req.user?.id;

    console.log("▶️  SOS Alert Request Started at", new Date().toISOString());

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { message, severity = "MEDIUM", location } = req.body;
    const audioFile = req.files?.audio;

    // Parse location if it's a JSON string
    let parsedLocation = {};
    if (location) {
      try {
        parsedLocation =
          typeof location === "string" ? JSON.parse(location) : location;
      } catch (err) {
        console.warn("Failed to parse location:", err.message);
        parsedLocation = {};
      }
    }

    // Get user and emergency contacts
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    // Get medical history with emergency contacts
    const medicalResult = await pool.query(
      `SELECT emergency_contact FROM medical_history 
       WHERE user_id = $1 
       ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );

    if (medicalResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No emergency contacts found. Please update your medical profile.",
      });
    }

    const emergencyContact = medicalResult.rows[0].emergency_contact || {};
    const parentTelegramIdsSet = new Set(); // Use Set to prevent duplicates

    // Extract Telegram chat IDs from emergency contacts
    if (emergencyContact.parent1_telegram_id) {
      const id = String(emergencyContact.parent1_telegram_id).trim();
      if (id && id !== "null" && id !== "undefined" && id.length > 0) {
        parentTelegramIdsSet.add(id);
      }
    }
    if (emergencyContact.parent2_telegram_id) {
      const id = String(emergencyContact.parent2_telegram_id).trim();
      if (id && id !== "null" && id !== "undefined" && id.length > 0) {
        parentTelegramIdsSet.add(id);
      }
    }
    if (emergencyContact.guardian_telegram_id) {
      const id = String(emergencyContact.guardian_telegram_id).trim();
      if (id && id !== "null" && id !== "undefined" && id.length > 0) {
        parentTelegramIdsSet.add(id);
      }
    }

    // Convert Set back to Array (Set automatically removes duplicates)
    const parentTelegramIds = Array.from(parentTelegramIdsSet).filter(
      (id) => id && id.length > 0
    );

    console.log("🔍 Emergency contacts analysis:", {
      emergencyContactObj: emergencyContact,
      extractedUniqueIds: parentTelegramIds,
      totalUnique: parentTelegramIds.length,
    });

    if (parentTelegramIds.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No Telegram IDs configured for emergency contacts. Please update your emergency contacts with Telegram IDs.",
      });
    }

    // Prepare SOS data
    const sosData = {
      message: message || "Emergency assistance needed",
      location: {
        address: parsedLocation.address || "Location not available",
        latitude: parsedLocation.latitude,
        longitude: parsedLocation.longitude,
      },
      severity: severity.toUpperCase(),
      timestamp: new Date().toISOString(),
    };

    // Format the message
    const formattedMessage = formatSOSMessage(
      {
        name: user.name,
        email: user.email,
      },
      sosData
    );

    // Initialize results object
    let results = {
      total: parentTelegramIds.length,
      successful: 0,
      failed: 0,
      duplicatesRemoved: 0,
    };

    // Log what we're about to send
    console.log("📋 SOS Alert Summary:", {
      userId,
      hasAudio: !!audioFile,
      audioName: audioFile?.name,
      totalContacts: parentTelegramIds.length,
      contacts: parentTelegramIds,
    });

    // Send audio if provided, otherwise send text message
    if (audioFile) {
      console.log("🎙️ Audio file detected:", {
        name: audioFile.name,
        size: audioFile.size,
        mimetype: audioFile.mimetype,
        dataLength: audioFile.data?.length || 0,
      });

      if (!audioFile.data || audioFile.data.length === 0) {
        console.warn(
          "⚠️ Audio file data is empty! Falling back to text message."
        );
        // Fallback to text message if audio is empty
        results = await sendSOSToMultiple(parentTelegramIds, formattedMessage);
      } else {
        // Send ONLY audio with caption (no separate text message)
        const audioCaption = `🔊 <b>Voice SOS Message</b>\n\n${formattedMessage}`;
        console.log(
          `📤 Sending audio to ${parentTelegramIds.length} contact(s)...`
        );

        for (const chatId of parentTelegramIds) {
          try {
            const audioResult = await sendTelegramAudio(
              chatId,
              audioFile.data,
              audioCaption
            );
            if (audioResult.success) {
              console.log(`✅ Audio sent successfully to ${chatId}`);
              results.successful++;
            } else {
              console.error(
                `❌ Audio send failed for ${chatId}:`,
                audioResult.error
              );
              results.failed++;
            }
          } catch (audioErr) {
            console.error(
              `❌ Exception sending audio to ${chatId}:`,
              audioErr.message
            );
            results.failed++;
          }
        }
      }
    } else {
      console.log("ℹ️ No audio file attached. Sending text message only.");
      // Send text message to all emergency contacts
      results = await sendSOSToMultiple(parentTelegramIds, formattedMessage);
    }

    // Log detailed results
    console.log("📊 SOS Alert Final Results:", {
      totalContacts: results.total,
      successfulMessages: results.successful,
      failedMessages: results.failed,
      hasAudio: !!audioFile,
      elapsedMs: Date.now() - startTime,
    });

    // Log SOS alert to database
    try {
      await pool.query(
        `INSERT INTO sos_alerts (user_id, message, severity, location, recipients_count, successful_count, failed_count, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          sosData.message,
          sosData.severity,
          JSON.stringify(sosData.location),
          results.total,
          results.successful,
          results.failed,
          "sent",
        ]
      );
      console.log("✅ SOS alert logged to database");
    } catch (dbErr) {
      console.error("⚠️ Failed to log SOS to database:", dbErr.message);
      // Don't throw, continue with response - location was still sent
    }

    // Log detailed results if needed
    const failedCount = results.failed;
    if (failedCount > 0) {
      console.warn(`⚠️ SOS alert sent but ${failedCount} recipients failed`);
    }

    console.log("✅ SOS Alert Request Completed Successfully\n");

    return res.status(200).json({
      success: true,
      message: `SOS alert sent to ${results.successful} contact(s)${
        audioFile ? " with voice message" : ""
      }`,
      details: {
        totalRecipients: results.total,
        successfulRecipients: results.successful,
        failedRecipients: results.failed,
        severity: sosData.severity,
        hasAudio: !!audioFile,
        timestamp: sosData.timestamp,
      },
    });
  } catch (error) {
    console.error("❌ Error sending SOS alert:", error.message);
    console.error("Full error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send SOS alert",
      error: error.message,
    });
  }
};

/**
 * Update emergency contact Telegram IDs
 * POST /api/sos/update-contacts
 * @body {Object} contacts - Emergency contact Telegram IDs
 * @body {string} contacts.parent1_telegram_id - Parent 1 Telegram ID
 * @body {string} contacts.parent2_telegram_id - Parent 2 Telegram ID
 * @body {string} contacts.guardian_telegram_id - Guardian Telegram ID
 * @returns {Object} Update result
 */
export const updateEmergencyContacts = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { parent1_telegram_id, parent2_telegram_id, guardian_telegram_id } =
      req.body;

    // Validate that at least one contact is provided
    if (!parent1_telegram_id && !parent2_telegram_id && !guardian_telegram_id) {
      return res.status(400).json({
        success: false,
        message:
          "At least one Telegram ID must be provided for emergency contacts",
      });
    }

    // Get existing emergency contact data
    const existingResult = await pool.query(
      "SELECT emergency_contact FROM medical_history WHERE user_id = $1",
      [userId]
    );

    let emergencyContact =
      existingResult.rows.length > 0
        ? existingResult.rows[0].emergency_contact || {}
        : {};

    // Update with new Telegram IDs
    emergencyContact = {
      ...emergencyContact,
      parent1_telegram_id:
        parent1_telegram_id || emergencyContact.parent1_telegram_id,
      parent2_telegram_id:
        parent2_telegram_id || emergencyContact.parent2_telegram_id,
      guardian_telegram_id:
        guardian_telegram_id || emergencyContact.guardian_telegram_id,
      last_updated: new Date().toISOString(),
    };

    // Update or insert
    if (existingResult.rows.length > 0) {
      await pool.query(
        "UPDATE medical_history SET emergency_contact = $1, updated_at = NOW() WHERE user_id = $2",
        [JSON.stringify(emergencyContact), userId]
      );
    } else {
      await pool.query(
        `INSERT INTO medical_history (user_id, emergency_contact, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [userId, JSON.stringify(emergencyContact)]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Emergency contacts updated successfully",
      contacts: {
        parent1_configured: !!emergencyContact.parent1_telegram_id,
        parent2_configured: !!emergencyContact.parent2_telegram_id,
        guardian_configured: !!emergencyContact.guardian_telegram_id,
      },
    });
  } catch (error) {
    console.error(" Error updating emergency contacts:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update emergency contacts",
      error: error.message,
    });
  }
};

/**
 * Get emergency contacts and SOS configuration
 * GET /api/sos/config
 * @returns {Object} SOS configuration
 */
export const getSOSConfig = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = await pool.query(
      "SELECT emergency_contact FROM medical_history WHERE user_id = $1",
      [userId]
    );

    const emergencyContact =
      result.rows.length > 0 ? result.rows[0].emergency_contact || {} : {};

    return res.status(200).json({
      success: true,
      telegramConfigured: isTelegramConfigured(),
      contacts: {
        parent1: emergencyContact.parent1_telegram_id
          ? { configured: true }
          : { configured: false },
        parent2: emergencyContact.parent2_telegram_id
          ? { configured: true }
          : { configured: false },
        guardian: emergencyContact.guardian_telegram_id
          ? { configured: true }
          : { configured: false },
      },
      totalConfigured:
        (emergencyContact.parent1_telegram_id ? 1 : 0) +
        (emergencyContact.parent2_telegram_id ? 1 : 0) +
        (emergencyContact.guardian_telegram_id ? 1 : 0),
    });
  } catch (error) {
    console.error(" Error fetching SOS config:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch SOS configuration",
      error: error.message,
    });
  }
};

/**
 * Get SOS alert history
 * GET /api/sos/history
 * @query {number} limit - Number of alerts to retrieve (default: 50)
 * @query {number} offset - Pagination offset (default: 0)
 * @returns {Array} SOS alert history
 */
export const getSOSHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT id, message, severity, location, recipients_count, successful_count, timestamp
       FROM sos_alerts
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM sos_alerts WHERE user_id = $1",
      [userId]
    );

    return res.status(200).json({
      success: true,
      alerts: result.rows,
      totalAlerts: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (error) {
    console.error(" Error fetching SOS history:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch SOS history",
      error: error.message,
    });
  }
};

/**
 * Test Telegram connection
 * POST /api/sos/test-telegram
 * @body {string} telegramId - Telegram chat ID to test
 * @returns {Object} Test result
 */
export const testTelegramConnection = async (req, res) => {
  try {
    const { telegramId } = req.body;

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        message: "Telegram ID is required",
      });
    }

    if (!isTelegramConfigured()) {
      return res.status(400).json({
        success: false,
        message: "Telegram bot is not configured on the server",
      });
    }

    const result = await sendTelegramMessage(
      telegramId,
      " <b>Telegram Connection Test</b>\n\nIf you see this message, your SOS feature setup is complete!",
      { parse_mode: "HTML" }
    );

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? "Test message sent successfully. Check your Telegram."
        : "Failed to send test message",
      details: result,
    });
  } catch (error) {
    console.error(" Error testing Telegram:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to test Telegram connection",
      error: error.message,
    });
  }
};
