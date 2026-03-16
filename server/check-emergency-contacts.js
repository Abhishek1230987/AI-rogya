#!/usr/bin/env node

/**
 * Check user's emergency contacts in database
 */

import pool from "./src/config/database.js";

console.log("\n📋 CHECKING EMERGENCY CONTACTS\n");
console.log("=".repeat(60));

try {
  // Get the current user (assuming user ID 12 from test setup, or first user)
  const userResult = await pool.query(`SELECT id, email FROM users LIMIT 1`);

  if (userResult.rows.length === 0) {
    console.log("❌ No users found in database");
    process.exit(1);
  }

  const user = userResult.rows[0];
  console.log("User:", user.email, "(ID:", user.id + ")");
  console.log("");

  // Check medical history for emergency contacts
  const medicalResult = await pool.query(
    `SELECT emergency_contact FROM medical_history WHERE user_id = $1`,
    [user.id]
  );

  if (medicalResult.rows.length === 0) {
    console.log("❌ No medical history found for this user");
    console.log("Need to create emergency contacts first");
  } else {
    const emergencyContact = medicalResult.rows[0].emergency_contact;
    console.log("Emergency Contact Data:");
    console.log(JSON.stringify(emergencyContact, null, 2));

    if (!emergencyContact) {
      console.log("⚠️  Emergency contact is NULL");
    } else if (
      !emergencyContact.parent1_telegram_id &&
      !emergencyContact.parent2_telegram_id
    ) {
      console.log("⚠️  No Telegram IDs configured");
      console.log("\n✅ SOLUTION: Use the SOS Setup page to add Telegram IDs");
      console.log("   Go to: /sos-setup");
      console.log("   Enter your Telegram chat ID: 1831824613");
    } else {
      console.log("\n✅ Emergency contacts configured!");
      if (emergencyContact.parent1_telegram_id) {
        console.log("   Parent 1:", emergencyContact.parent1_telegram_id);
      }
      if (emergencyContact.parent2_telegram_id) {
        console.log("   Parent 2:", emergencyContact.parent2_telegram_id);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
