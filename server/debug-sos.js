#!/usr/bin/env node

/**
 * Debug SOS endpoint - check what's happening
 * This will help us see the exact issue
 */

import pool from "./src/config/database.js";

console.log("\n🔍 DEBUGGING SOS ENDPOINT\n");
console.log("=".repeat(70));

try {
  // Get all users
  console.log("\n1️⃣ CHECKING ALL USERS:\n");
  const usersResult = await pool.query("SELECT id, email FROM users");

  usersResult.rows.forEach((user) => {
    console.log(`  - User ID: ${user.id}, Email: ${user.email}`);
  });

  // For each user, check their medical history and emergency contacts
  console.log("\n2️⃣ CHECKING EMERGENCY CONTACTS FOR EACH USER:\n");

  for (const user of usersResult.rows) {
    console.log(`\n  📋 User: ${user.email} (ID: ${user.id})`);

    const medicalResult = await pool.query(
      "SELECT emergency_contact FROM medical_history WHERE user_id = $1",
      [user.id]
    );

    if (medicalResult.rows.length === 0) {
      console.log(`     ❌ NO medical history record`);
    } else {
      const contact = medicalResult.rows[0].emergency_contact;
      console.log(
        `     Emergency Contact: ${JSON.stringify(contact, null, 2)}`
      );

      if (!contact) {
        console.log(`     ⚠️  Contact is NULL`);
      } else if (
        !contact.parent1_telegram_id &&
        !contact.parent2_telegram_id &&
        !contact.guardian_telegram_id
      ) {
        console.log(`     ⚠️  NO Telegram IDs configured`);
      } else {
        console.log(`     ✅ Telegram IDs found:`);
        if (contact.parent1_telegram_id)
          console.log(`        - Parent 1: ${contact.parent1_telegram_id}`);
        if (contact.parent2_telegram_id)
          console.log(`        - Parent 2: ${contact.parent2_telegram_id}`);
        if (contact.guardian_telegram_id)
          console.log(`        - Guardian: ${contact.guardian_telegram_id}`);
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n📝 SUMMARY:\n");
  console.log(
    "If you see NO Telegram IDs, run: node setup-emergency-contacts.js"
  );
  console.log(
    "If you see Telegram IDs, the issue is with token/authentication"
  );
  console.log("\n" + "=".repeat(70));

  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
