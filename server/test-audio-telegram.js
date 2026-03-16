import fs from "fs";
import path from "path";
import FormData from "form-data";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function testAudioSending() {
  console.log("🎙️  Testing Audio Sending to Telegram\n");
  console.log(
    "======================================================================"
  );

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TEST_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN not configured in .env");
    process.exit(1);
  }

  if (!TEST_CHAT_ID) {
    console.error("❌ TELEGRAM_CHAT_ID not configured in .env");
    process.exit(1);
  }

  console.log(`✅ Bot Token: ${TELEGRAM_BOT_TOKEN.substring(0, 20)}...`);
  console.log(`✅ Chat ID: ${TEST_CHAT_ID}\n`);

  // Test 1: Send text message first
  console.log("📝 Test 1: Sending text message...");
  try {
    const textResponse = await axios.post(
      `${TELEGRAM_API_URL}/sendMessage`,
      {
        chat_id: TEST_CHAT_ID,
        text: "🎙️ Audio test - Text message received. Audio to follow...",
        parse_mode: "HTML",
      },
      { timeout: 10000 }
    );
    console.log("✅ Text message sent successfully\n");
  } catch (error) {
    console.error("❌ Failed to send text message:", error.message);
    process.exit(1);
  }

  // Test 2: Create a test audio file (WAV format)
  console.log("🎵 Test 2: Creating test audio file...");
  const audioBuffer = Buffer.from([
    0x52,
    0x49,
    0x46,
    0x46, // "RIFF"
    0x24,
    0x00,
    0x00,
    0x00, // File size (36 bytes for simple WAV)
    0x57,
    0x41,
    0x56,
    0x45, // "WAVE"
    0x66,
    0x6d,
    0x74,
    0x20, // "fmt "
    0x10,
    0x00,
    0x00,
    0x00, // Subchunk1Size
    0x01,
    0x00, // AudioFormat (PCM)
    0x01,
    0x00, // NumChannels (1 = mono)
    0x44,
    0xac, // SampleRate (44100 Hz)
    0x00,
    0x00,
    0x88,
    0x58, // ByteRate
    0x00,
    0x00,
    0x02,
    0x00, // BlockAlign
    0x10,
    0x00, // BitsPerSample (16)
    0x64,
    0x61,
    0x74,
    0x61, // "data"
    0x00,
    0x00,
    0x00,
    0x00, // Subchunk2Size
  ]);

  console.log(`✅ Test audio created (${audioBuffer.length} bytes)\n`);

  // Test 3: Send audio using FormData
  console.log("🎙️  Test 3: Sending audio file via FormData...");
  try {
    const formData = new FormData();
    formData.append("chat_id", TEST_CHAT_ID);
    formData.append("audio", audioBuffer, {
      filename: "sos_test_audio.wav",
      contentType: "audio/wav",
    });
    formData.append("caption", "🎙️ <b>Test Audio from SOS System</b>");
    formData.append("parse_mode", "HTML");

    const audioResponse = await axios.post(
      `${TELEGRAM_API_URL}/sendAudio`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log("✅ Audio sent successfully!");
    console.log(`   Message ID: ${audioResponse.data.result.message_id}`);
    console.log(`   File ID: ${audioResponse.data.result.audio.file_id}\n`);
  } catch (error) {
    console.error("❌ Failed to send audio:");
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.message}`);
    if (error.response?.data) {
      console.error(
        `   Error: ${JSON.stringify(error.response.data, null, 2)}`
      );
    }
    process.exit(1);
  }

  // Test 4: Send audio using file stream (if file exists)
  console.log("📁 Test 4: Checking for real audio files...");
  const audioDir = "./uploads";
  if (fs.existsSync(audioDir)) {
    const files = fs.readdirSync(audioDir);
    const audioFiles = files.filter(
      (f) => f.endsWith(".wav") || f.endsWith(".mp3") || f.endsWith(".ogg")
    );

    if (audioFiles.length > 0) {
      console.log(`✅ Found ${audioFiles.length} audio file(s)`);

      const firstAudio = audioFiles[0];
      const filePath = path.join(audioDir, firstAudio);
      const fileSize = fs.statSync(filePath).size;

      console.log(`\n📤 Test 5: Sending real audio file: ${firstAudio}`);
      console.log(`   File size: ${(fileSize / 1024).toFixed(2)}KB\n`);

      try {
        const formData = new FormData();
        formData.append("chat_id", TEST_CHAT_ID);
        formData.append("audio", fs.createReadStream(filePath));
        formData.append(
          "caption",
          `🎙️ <b>Real SOS Audio</b>\nFile: ${firstAudio}`
        );
        formData.append("parse_mode", "HTML");

        const audioResponse = await axios.post(
          `${TELEGRAM_API_URL}/sendAudio`,
          formData,
          {
            headers: formData.getHeaders(),
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }
        );

        console.log("✅ Real audio file sent successfully!");
        console.log(`   Message ID: ${audioResponse.data.result.message_id}`);
      } catch (error) {
        console.error("❌ Failed to send real audio file:");
        console.error(`   Message: ${error.message}`);
      }
    } else {
      console.log("⚠️  No audio files found in uploads directory");
    }
  } else {
    console.log("⚠️  Uploads directory not found");
  }

  console.log(
    "\n======================================================================"
  );
  console.log("✨ Audio test complete!");
  console.log("\n💡 If audio sending failed:");
  console.log("   1. Check TELEGRAM_BOT_TOKEN in .env");
  console.log("   2. Check TELEGRAM_CHAT_ID in .env");
  console.log("   3. Verify bot token is valid");
  console.log("   4. Check audio file format (WAV, MP3, OGG)");
  console.log("   5. Check file size (Telegram limit: 50MB)");
}

testAudioSending();
