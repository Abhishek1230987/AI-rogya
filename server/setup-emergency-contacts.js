#!/usr/bin/env node

/**
 * Setup emergency contacts for user
 */

import pool from "./src/config/database.js";

console.log("\n🚨 SETTING UP EMERGENCY CONTACTS\n");
console.log("=".repeat(60));

const TELEGRAM_CHAT_ID = "1831824613"; // Your chat ID

try {
  // Get first user
  const userResult = await pool.query(`SELECT id, email FROM users LIMIT 1`);

  if (userResult.rows.length === 0) {
    console.log("❌ No users found");
    process.exit(1);
  }

  const userId = userResult.rows[0].id;
  const userEmail = userResult.rows[0].email;

  console.log("User:", userEmail);
  console.log("Telegram Chat ID:", TELEGRAM_CHAT_ID);
  console.log("");

  // Check if medical history exists
  const checkResult = await pool.query(
    `SELECT id FROM medical_history WHERE user_id = $1`,
    [userId]
  );
  
  let result;
  const emergencyData = JSON.stringify({
    parent1_telegram_id: TELEGRAM_CHAT_ID,
    parent2_telegram_id: TELEGRAM_CHAT_ID
  });
  
  if (checkResult.rows.length === 0) {
    // Create new medical history
    result = await pool.query(
      `INSERT INTO medical_history (user_id, emergency_contact)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, emergencyData]
    );
  } else {
    // Update existing medical history
    result = await pool.query(
      `UPDATE medical_history 
       SET emergency_contact = $1
       WHERE user_id = $2
       RETURNING *`,
      [emergencyData, userId]
    );
  }

  console.log("✅ Emergency contacts updated!");
  console.log("Parent 1 Telegram ID:", TELEGRAM_CHAT_ID);
  console.log("Parent 2 Telegram ID:", TELEGRAM_CHAT_ID);
  console.log("");
  console.log("✅ You can now send SOS alerts!");
  console.log("📱 Click SOS button → Fill form → Send");

  console.log("\n" + "=".repeat(60));
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
