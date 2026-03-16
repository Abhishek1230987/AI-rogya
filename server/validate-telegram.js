/**
 * Telegram Bot Validation Test
 * Checks if bot token is valid and provides next steps
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function validateBot() {
  console.log("\n" + "=".repeat(60));
  console.log("🤖 TELEGRAM BOT VALIDATION TEST");
  console.log("=".repeat(60) + "\n");

  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN not found in .env file!");
    process.exit(1);
  }

  console.log("✅ Bot token found\n");

  try {
    // Validate bot token by getting bot info
    console.log("📡 Validating bot token with Telegram API...\n");

    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`,
      { timeout: 10000 }
    );

    if (response.data.ok) {
      const bot = response.data.result;

      console.log("✅ ✅ ✅ BOT TOKEN IS VALID! ✅ ✅ ✅\n");
      console.log("Bot Details:");
      console.log("  • ID:", bot.id);
      console.log("  • Username:", bot.username);
      console.log("  • Name:", bot.first_name);
      console.log("  • Status:", bot.is_bot ? "Bot" : "Not a bot");

      console.log("\n" + "=".repeat(60));
      console.log("📝 NEXT STEPS TO TEST TELEGRAM ALERTS");
      console.log("=".repeat(60) + "\n");

      console.log("1️⃣  GET YOUR TELEGRAM CHAT ID:");
      console.log("   • Open Telegram app");
      console.log("   • Search for: @userinfobot");
      console.log("   • Send: /start");
      console.log("   • Copy the ID number shown\n");

      console.log("2️⃣  START THE BOT:");
      console.log("   • Search for: @" + bot.username);
      console.log("   • Click START or send /start\n");

      console.log("3️⃣  SET UP EMERGENCY CONTACT:");
      console.log("   • Go to: http://localhost:5174/sos-setup");
      console.log("   • Enter your Telegram chat ID");
      console.log("   • Click TEST CONNECTION");
      console.log("   • You should receive a test message\n");

      console.log("4️⃣  SEND SOS ALERT:");
      console.log("   • Click the red SOS button");
      console.log("   • Fill the form and send");
      console.log("   • Parent will receive Telegram message\n");

      console.log("=".repeat(60) + "\n");
    } else {
      console.error("❌ Invalid bot token!");
      console.error("Response:", response.data);
      process.exit(1);
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.error("❌ INVALID BOT TOKEN - Telegram rejected it!");
      console.error("\n❌ Please check:");
      console.error("   • Token is correct in .env");
      console.error("   • No extra spaces or characters");
      console.error("   • Token hasn't been regenerated");
    } else if (error.code === "ENOTFOUND") {
      console.error("❌ Cannot reach Telegram API");
      console.error("   • Check internet connection");
      console.error("   • Check if Telegram is blocked in your region");
    } else {
      console.error("❌ Error:", error.message);
    }
    process.exit(1);
  }
}

validateBot();
