#!/usr/bin/env node

/**
 * Test sending a real Telegram message
 */

import https from "https";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = "1831824613"; // Your chat ID

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

console.log("\n📱 SENDING TEST MESSAGE TO TELEGRAM\n");
console.log("=".repeat(60));
console.log("Bot Token:", BOT_TOKEN.slice(0, 20) + "...");
console.log("Chat ID:", CHAT_ID);
console.log("=".repeat(60));

// Send a test message
const message = encodeURIComponent(
  "🚨 SOS TEST ALERT\n\nThis is a test message from your E-Consultancy SOS system!\n\n✅ Your Telegram integration is working properly!"
);

const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${message}&parse_mode=HTML`;

https
  .get(url, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const response = JSON.parse(data);

        if (response.ok) {
          console.log("\n✅ MESSAGE SENT SUCCESSFULLY!\n");
          console.log("Message ID:", response.result.message_id);
          console.log("Chat ID:", response.result.chat.id);
          console.log("Date:", new Date(response.result.date * 1000));
          console.log(
            "\n📱 Check your Telegram app - you should see the message!\n"
          );
        } else {
          console.log("\n❌ ERROR:", response.description);
        }
      } catch (error) {
        console.log("\n❌ Error:", error.message);
      }

      console.log("=".repeat(60) + "\n");
    });
  })
  .on("error", (error) => {
    console.error("\n❌ Connection Error:", error.message);
    console.log("=".repeat(60) + "\n");
  });
