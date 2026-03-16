/**
 * Enhanced SOS Audio Debugging Tool
 * Tests all aspects of the audio sending pipeline
 */

import fs from "fs";
import path from "path";
import FormData from "form-data";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TEST_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

class AudioDebugger {
  constructor() {
    this.results = {
      configuration: {},
      tests: [],
      summary: {},
    };
  }

  log(message, type = "info") {
    const icons = {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warning: "⚠️",
      debug: "🔍",
    };
    console.log(`${icons[type]} ${message}`);
  }

  logSection(title) {
    console.log("\n" + "=".repeat(70));
    console.log(`📋 ${title}`);
    console.log("=".repeat(70));
  }

  async checkConfiguration() {
    this.logSection("Configuration Check");

    this.results.configuration = {
      telegramBotToken: TELEGRAM_BOT_TOKEN ? "✅ Set" : "❌ Missing",
      testChatId: TEST_CHAT_ID ? "✅ Set" : "❌ Missing",
      serverUrl: SERVER_URL,
    };

    if (!TELEGRAM_BOT_TOKEN) {
      this.log("TELEGRAM_BOT_TOKEN not found in .env", "error");
      return false;
    }
    this.log("TELEGRAM_BOT_TOKEN: " + TELEGRAM_BOT_TOKEN.substring(0, 20) + "...", "success");

    if (!TEST_CHAT_ID) {
      this.log("TELEGRAM_CHAT_ID not found in .env", "error");
      return false;
    }
    this.log("TELEGRAM_CHAT_ID: " + TEST_CHAT_ID, "success");

    this.log("Server URL: " + SERVER_URL, "info");
    return true;
  }

  async testBotToken() {
    this.logSection("Bot Token Validation");

    try {
      const response = await axios.post(
        `${TELEGRAM_API_URL}/getMe`,
        {},
        { timeout: 10000 }
      );

      if (response.data.ok) {
        const bot = response.data.result;
        this.log(
          `Bot verified: @${bot.username} (ID: ${bot.id})`,
          "success"
        );
        this.results.tests.push({
          test: "Bot Token Validation",
          status: "PASS",
          details: bot,
        });
        return true;
      }
    } catch (error) {
      this.log(
        `Failed to validate bot token: ${error.message}`,
        "error"
      );
      this.results.tests.push({
        test: "Bot Token Validation",
        status: "FAIL",
        error: error.message,
      });
      return false;
    }
  }

  async testTextMessage() {
    this.logSection("Text Message Test");

    try {
      const response = await axios.post(
        `${TELEGRAM_API_URL}/sendMessage`,
        {
          chat_id: TEST_CHAT_ID,
          text: "🧪 <b>Audio Debug Test</b>\n\nText message test - proceeding to audio...",
          parse_mode: "HTML",
        },
        { timeout: 10000 }
      );

      this.log(`Text message sent (ID: ${response.data.result.message_id})`, "success");
      this.results.tests.push({
        test: "Text Message",
        status: "PASS",
        messageId: response.data.result.message_id,
      });
      return true;
    } catch (error) {
      this.log(
        `Failed to send text message: ${error.response?.data?.description || error.message}`,
        "error"
      );
      this.results.tests.push({
        test: "Text Message",
        status: "FAIL",
        error: error.message,
      });
      return false;
    }
  }

  async testAudioBuffer(audioBuffer, filename) {
    this.log(`\nTesting audio buffer: ${filename}`, "debug");
    this.log(`  Size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`, "debug");
    this.log(`  First bytes: ${audioBuffer.slice(0, 8).toString("hex")}`, "debug");

    if (audioBuffer.length === 0) {
      this.log("  ❌ Audio buffer is empty!", "error");
      return false;
    }

    if (audioBuffer.length > 50 * 1024 * 1024) {
      this.log("  ❌ Audio exceeds Telegram limit (50MB)", "error");
      return false;
    }

    return true;
  }

  async testAudioSending(audioBuffer, filename, description) {
    this.logSection(`Audio Send Test: ${description}`);

    const isValid = await this.testAudioBuffer(audioBuffer, filename);
    if (!isValid) {
      this.results.tests.push({
        test: `Audio Send (${description})`,
        status: "FAIL",
        error: "Invalid audio buffer",
      });
      return false;
    }

    try {
      const formData = new FormData();
      formData.append("chat_id", TEST_CHAT_ID);
      formData.append("audio", audioBuffer, filename);
      formData.append("caption", `🎙️ <b>Audio Test: ${description}</b>`);
      formData.append("parse_mode", "HTML");

      this.log(`Sending audio to Telegram (${filename})...`, "debug");

      const response = await axios.post(
        `${TELEGRAM_API_URL}/sendAudio`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      this.log(`Audio sent successfully (ID: ${response.data.result.message_id})`, "success");
      this.results.tests.push({
        test: `Audio Send (${description})`,
        status: "PASS",
        messageId: response.data.result.message_id,
        fileSize: audioBuffer.length,
      });
      return true;
    } catch (error) {
      const errorMsg =
        error.response?.data?.description ||
        error.response?.data?.error_description ||
        error.message;
      this.log(`Failed to send audio: ${errorMsg}`, "error");

      if (error.response?.data) {
        this.log(`  Error Code: ${error.response.data.error_code}`, "debug");
        this.log(`  Full Response: ${JSON.stringify(error.response.data)}`, "debug");
      }

      this.results.tests.push({
        test: `Audio Send (${description})`,
        status: "FAIL",
        error: errorMsg,
        details: error.response?.data,
      });
      return false;
    }
  }

  async testSOSEndpoint(audioBuffer) {
    this.logSection("SOS Endpoint Test (E2E)");

    try {
      // Create FormData for multipart request
      const formData = new FormData();
      formData.append("message", "Test SOS Alert with Audio");
      formData.append("severity", "HIGH");
      formData.append(
        "location",
        JSON.stringify({
          address: "Test Location",
          latitude: 40.7128,
          longitude: -74.006,
        })
      );
      formData.append("audio", audioBuffer, "sos_test.wav");

      this.log(`Sending SOS alert to ${SERVER_URL}/api/sos/send...`, "debug");

      // Note: This will fail without authentication token
      const response = await axios.post(
        `${SERVER_URL}/api/sos/send`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            // Would need actual auth token
          },
          timeout: 30000,
        }
      );

      this.log("SOS endpoint test successful", "success");
      this.results.tests.push({
        test: "SOS Endpoint (E2E)",
        status: "PASS",
        response: response.data,
      });
      return true;
    } catch (error) {
      // Expected to fail without auth token
      if (error.response?.status === 401) {
        this.log("SOS endpoint requires authentication (expected)", "warning");
        this.results.tests.push({
          test: "SOS Endpoint (E2E)",
          status: "SKIP",
          reason: "Authentication required",
        });
        return null;
      }

      this.log(`SOS endpoint test failed: ${error.message}`, "error");
      this.results.tests.push({
        test: "SOS Endpoint (E2E)",
        status: "FAIL",
        error: error.message,
      });
      return false;
    }
  }

  async runAllTests() {
    console.clear();
    console.log("╔════════════════════════════════════════════════════════════════════╗");
    console.log("║          🎙️ E-Consultancy Audio Debugging Tool                    ║");
    console.log("║                 SOS Alert Audio Sending Debug                      ║");
    console.log("╚════════════════════════════════════════════════════════════════════╝\n");

    // Step 1: Configuration
    const configOk = await this.checkConfiguration();
    if (!configOk) {
      this.logSection("Configuration Error");
      this.log("Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env", "error");
      return;
    }

    // Step 2: Validate Bot Token
    const botOk = await this.testBotToken();
    if (!botOk) {
      this.logSection("Bot Token Error");
      this.log(
        "Bot token is invalid. Get a new one from @BotFather",
        "error"
      );
      return;
    }

    // Step 3: Test Text Message
    const textOk = await this.testTextMessage();
    if (!textOk) {
      this.log(
        "Failed to send text message. Check chat ID and bot access.",
        "warning"
      );
    }

    // Step 4: Test with Simple WAV
    const simpleWav = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // File size
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6d, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00,
      0x44, 0xac, 0x00, 0x00,
      0x88, 0x58, 0x00, 0x00,
      0x02, 0x00, 0x10, 0x00,
      0x64, 0x61, 0x74, 0x61,
      0x00, 0x00, 0x00, 0x00,
    ]);

    await this.testAudioSending(simpleWav, "simple_test.wav", "Simple WAV Header");

    // Step 5: Test with Real Audio Files
    const uploadsDir = "./uploads";
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const audioFiles = files.filter(
        (f) => f.endsWith(".wav") || f.endsWith(".mp3") || f.endsWith(".ogg")
      );

      if (audioFiles.length > 0) {
        for (let i = 0; i < Math.min(audioFiles.length, 1); i++) {
          const audioFile = audioFiles[i];
          const filePath = path.join(uploadsDir, audioFile);

          try {
            const audioBuffer = fs.readFileSync(filePath);
            await this.testAudioSending(
              audioBuffer,
              audioFile,
              `Real File: ${audioFile}`
            );
          } catch (err) {
            this.log(`Failed to read file ${audioFile}: ${err.message}`, "error");
          }
        }
      }
    }

    // Step 6: Summary
    this.printSummary();
  }

  printSummary() {
    this.logSection("Test Summary");

    const passed = this.results.tests.filter((t) => t.status === "PASS").length;
    const failed = this.results.tests.filter((t) => t.status === "FAIL").length;
    const skipped = this.results.tests.filter((t) => t.status === "SKIP").length;
    const total = this.results.tests.length;

    console.log(`\n📊 Results: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped\n`);

    this.results.tests.forEach((test) => {
      const icon =
        test.status === "PASS"
          ? "✅"
          : test.status === "FAIL"
            ? "❌"
            : "⏭️";
      console.log(`${icon} ${test.test}: ${test.status}`);

      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
      if (test.reason) {
        console.log(`   Reason: ${test.reason}`);
      }
    });

    console.log("\n" + "=".repeat(70));
    if (failed === 0 && passed > 0) {
      console.log("✨ All tests passed! Audio sending should work correctly.");
    } else if (failed > 0) {
      console.log("🔧 Some tests failed. Check the errors above and fix configuration.");
    }
    console.log("=".repeat(70) + "\n");
  }
}

// Run the debugger
const debugger = new AudioDebugger();
debugger.runAllTests().catch(console.error);
