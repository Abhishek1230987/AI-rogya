/**
 * Telegram Service for sending SOS messages
 * Handles sending emergency messages to parents/guardians via Telegram Bot API
 */

import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Verify if Telegram bot is configured
 */
export const isTelegramConfigured = () => {
  return !!TELEGRAM_BOT_TOKEN;
};

/**
 * Send a message via Telegram Bot
 * @param {string} chatId - Telegram chat ID of recipient
 * @param {string} message - Message text to send
 * @param {Object} options - Additional options (markdown, disable_notification, etc.)
 * @returns {Promise} Response from Telegram API
 */
export const sendTelegramMessage = async (chatId, message, options = {}) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.error(
        "❌ Telegram Bot Token not configured in environment variables"
      );
      return {
        success: false,
        error: "Telegram bot not configured",
      };
    }

    if (!chatId) {
      console.error("❌ Chat ID is required");
      return {
        success: false,
        error: "Chat ID is required",
      };
    }

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: options.parse_mode || "HTML",
      disable_notification: options.disable_notification || false,
    };

    const response = await axios.post(
      `${TELEGRAM_API_URL}/sendMessage`,
      payload,
      {
        timeout: 10000, // 10 second timeout
      }
    );

    console.log(`✅ Telegram message sent to chat ${chatId}`);
    return {
      success: true,
      messageId: response.data.result.message_id,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("❌ Failed to send Telegram message:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send audio file via Telegram Bot
 * @param {string} chatId - Telegram chat ID of recipient
 * @param {Buffer|Stream} audioBuffer - Audio file buffer or stream
 * @param {string} caption - Optional caption for the audio
 * @param {Object} options - Additional options
 * @returns {Promise} Response from Telegram API
 */
export const sendTelegramAudio = async (
  chatId,
  audioBuffer,
  caption = "",
  options = {}
) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.error(
        "❌ Telegram Bot Token not configured in environment variables"
      );
      return {
        success: false,
        error: "Telegram bot not configured",
      };
    }

    if (!chatId) {
      console.error("❌ Chat ID is required");
      return {
        success: false,
        error: "Chat ID is required",
      };
    }

    if (!audioBuffer) {
      console.error("❌ Audio buffer is required");
      return {
        success: false,
        error: "Audio buffer is required",
      };
    }

    // Validate audio buffer
    if (Buffer.isBuffer(audioBuffer)) {
      console.log(
        `📊 Audio buffer size: ${(audioBuffer.length / 1024 / 1024).toFixed(
          2
        )}MB`
      );
      if (audioBuffer.length > 50 * 1024 * 1024) {
        console.error("❌ Audio file exceeds Telegram limit (50MB)");
        return {
          success: false,
          error: "Audio file exceeds maximum size (50MB)",
        };
      }
      if (audioBuffer.length === 0) {
        console.error("❌ Audio buffer is empty");
        return {
          success: false,
          error: "Audio buffer is empty",
        };
      }
    }

    const formDataInstance = new FormData();
    formDataInstance.append("chat_id", chatId);
    formDataInstance.append("audio", audioBuffer, "sos_audio.wav");
    if (caption) {
      formDataInstance.append("caption", caption);
      formDataInstance.append("parse_mode", "HTML");
    }

    console.log(
      `📤 Sending audio to Telegram (${TELEGRAM_API_URL}/sendAudio)...`
    );

    const response = await axios.post(
      `${TELEGRAM_API_URL}/sendAudio`,
      formDataInstance,
      {
        headers: formDataInstance.getHeaders(),
        timeout: 30000, // 30 second timeout for audio upload
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log(`✅ Telegram audio sent to chat ${chatId}`);
    console.log(`   Message ID: ${response.data.result.message_id}`);
    return {
      success: true,
      messageId: response.data.result.message_id,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("❌ Failed to send Telegram audio:", error.message);

    // Extract more detailed error info
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }

    return {
      success: false,
      error: error.message,
      details: error.response?.data || null,
    };
  }
};

/**
 * Send SOS message to multiple recipients
 * @param {Array} chatIds - Array of Telegram chat IDs
 * @param {string} message - Message text
 * @param {Object} options - Additional options
 * @returns {Promise} Results for each recipient
 */
export const sendSOSToMultiple = async (chatIds, message, options = {}) => {
  try {
    const results = await Promise.allSettled(
      chatIds.map((chatId) => sendTelegramMessage(chatId, message, options))
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.filter(
      (r) => r.status === "rejected" || !r.value.success
    ).length;

    console.log(
      `📊 SOS sent: ${successful} successful, ${failed} failed out of ${chatIds.length}`
    );

    return {
      total: chatIds.length,
      successful,
      failed,
      results,
    };
  } catch (error) {
    console.error(
      "❌ Error sending SOS to multiple recipients:",
      error.message
    );
    throw error;
  }
};

/**
 * Format SOS message with user and location info
 * @param {Object} userData - User data (name, age, etc.)
 * @param {Object} sosData - SOS data (message, location, severity)
 * @returns {string} Formatted HTML message
 */
export const formatSOSMessage = (userData, sosData = {}) => {
  const { name, email, age } = userData;
  const {
    message = "No custom message provided",
    location = {},
    severity = "MEDIUM",
    timestamp = new Date().toISOString(),
  } = sosData;

  // Format location data
  let locationText = "Location not available";
  let locationDetails = "";
  if (location) {
    if (typeof location === "string") {
      locationText = location;
    } else if (typeof location === "object") {
      // If location has address field, use it
      if (location.address) {
        locationText = location.address;
      }
      // If location has latitude and longitude, add Google Maps link
      else if (location.latitude && location.longitude) {
        const lat = location.latitude;
        const lng = location.longitude;
        locationText = `<a href="https://maps.google.com/?q=${lat},${lng}">View on Map</a> | Lat: ${lat.toFixed(
          4
        )}, Lng: ${lng.toFixed(4)}`;
        if (location.accuracy) {
          locationText += ` (±${Math.round(location.accuracy)}m)`;
        }
      }
    }
  }

  const formattedMessage = `<b>SOS ALERT</b>

<b>User Information:</b>
Name: ${name}
Email: ${email}
${age ? `Age: ${age}` : ""}
<b>Emergency Details:</b>
Message: ${message}
Location: ${locationText}
Time: ${new Date(timestamp).toLocaleString()}
Severity: ${severity}

<i>This is an emergency alert sent from AIrogya Health Platform</i>`;

  return formattedMessage.trim();
};

/**
 * Test Telegram connection
 * @param {string} chatId - Chat ID to test
 * @returns {Promise} Test result
 */
export const testTelegramConnection = async (chatId) => {
  try {
    const result = await sendTelegramMessage(
      chatId,
      "✅ <b>Telegram Connection Test</b>\n\nIf you see this message, your Telegram integration is working correctly!",
      { parse_mode: "HTML" }
    );
    return result;
  } catch (error) {
    console.error("❌ Telegram test failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  isTelegramConfigured,
  sendTelegramMessage,
  sendSOSToMultiple,
  formatSOSMessage,
  testTelegramConnection,
};
