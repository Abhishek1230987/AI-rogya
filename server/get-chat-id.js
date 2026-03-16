#!/usr/bin/env node

/**
 * Quick script to get your Telegram chat ID
 * Replace YOUR_CHAT_ID with the ID you get from steps above
 */

import https from "https";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env");
  process.exit(1);
}

console.log("\n🤖 TELEGRAM CHAT ID FINDER\n");
console.log("=".repeat(60));

// Get updates to find chat IDs
const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;

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
          const updates = response.result;

          if (updates.length === 0) {
            console.log("\n❌ No messages found from your bot yet.\n");
            console.log("Steps to get your chat ID:");
            console.log("1. Open Telegram");
            console.log("2. Send /start to your bot");
            console.log("3. Run this script again\n");
            console.log("OR use @userinfobot:\n");
            console.log("1. Search @userinfobot in Telegram");
            console.log("2. Click Start");
            console.log("3. Copy your User ID\n");
          } else {
            console.log("\n✅ Found chat IDs:\n");
            updates.forEach((update, index) => {
              const message = update.message;
              if (message) {
                console.log(`Message ${index + 1}:`);
                console.log(`  Chat ID: ${message.chat.id}`);
                console.log(`  From: ${message.from.first_name}`);
                console.log(`  Message: ${message.text}`);
                console.log("");
              }
            });
          }
        } else {
          console.log("\n❌ Error:", response.description);
        }
      } catch (error) {
        console.log("\n❌ Error parsing response:", error.message);
      }

      console.log("=".repeat(60));
    });
  })
  .on("error", (error) => {
    console.error("\n❌ Error:", error.message);
    console.log("\nMake sure:");
    console.log("1. You have internet connection");
    console.log("2. Bot token is correct");
    console.log("3. You have sent at least one message to the bot");
    console.log("\n" + "=".repeat(60));
  });
