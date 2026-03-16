/**
 * Simple Telegram Test - Check if bot can send messages
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = "123456789"; // Test chat ID

async function testTelegram() {
  console.log("\n🔍 Testing Telegram Bot Connection...\n");
  console.log(
    "Bot Token:",
    TELEGRAM_BOT_TOKEN ? "✅ Configured" : "❌ Missing"
  );
  console.log("Chat ID:", CHAT_ID);

  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN not configured!");
    process.exit(1);
  }

  try {
    console.log("\n📤 Sending test message...\n");

    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: "✅ Test message from AIrogya SOS System",
        parse_mode: "HTML",
      },
      {
        timeout: 10000,
      }
    );

    console.log("✅ SUCCESS! Message sent to Telegram");
    console.log("Response:", JSON.stringify(response.data, null, 2));
    console.log("\n✅ Telegram integration is working! 🎉\n");
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ Telegram API Error:",
        error.response.status,
        error.response.data
      );
    } else if (error.code === "ENOTFOUND") {
      console.error(
        "❌ Network Error: Cannot reach Telegram API (check internet connection)"
      );
    } else {
      console.error("❌ Error:", error.message);
    }

    console.log("\n📝 Possible issues:");
    console.log("1. Invalid bot token");
    console.log("2. Invalid chat ID");
    console.log("3. No internet connection");
    console.log("4. Telegram API temporarily unavailable");
    console.log("\n");
  }
}

testTelegram();
