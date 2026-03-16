#!/usr/bin/env node

/**
 * Test full SOS alert flow with your user
 */

import http from "http";
import pool from "./src/config/database.js";

console.log("\n🚨 TESTING FULL SOS ALERT FLOW\n");
console.log("=".repeat(60));

try {
  // Get user ID
  const userResult = await pool.query("SELECT id FROM users LIMIT 1");
  const userId = userResult.rows[0].id;

  console.log("User ID:", userId);

  // Verify emergency contacts exist
  const medicalResult = await pool.query(
    "SELECT emergency_contact FROM medical_history WHERE user_id = $1",
    [userId]
  );

  if (medicalResult.rows.length === 0) {
    console.log("❌ No medical history for this user");
    process.exit(1);
  }

  const contact = medicalResult.rows[0].emergency_contact;
  console.log("Emergency Contacts:", contact);
  console.log("");

  // Simulate SOS alert API call (with JWT token in Authorization header)
  const testPayload = {
    message: "🆘 This is a test emergency alert",
    severity: "HIGH",
    location: {
      address: "Test School",
      latitude: 40.7128,
      longitude: -74.006,
    },
  };

  console.log("Sending test SOS alert...");
  console.log("Payload:", JSON.stringify(testPayload, null, 2));
  console.log("");

  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/sos/send",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Using a test JWT token for user ID 2
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mn0.test",
    },
  };

  const req = http.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("Status:", res.statusCode);
      console.log("Response:", data);
      console.log("");

      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        if (response.success) {
          console.log("✅ SOS ALERT SENT SUCCESSFULLY!");
          console.log("📱 Check your Telegram for the alert");
        } else {
          console.log("❌ Error:", response.message);
        }
      } else if (res.statusCode === 401) {
        console.log("⚠️  Authentication error - need valid JWT token");
      } else {
        console.log("❌ Error status:", res.statusCode);
      }
      console.log("=".repeat(60));
      process.exit(0);
    });
  });

  req.on("error", (error) => {
    console.error("❌ Error:", error.message);
    console.log("Possible causes:");
    console.log("1. Backend not running on port 5000");
    console.log("2. Database not connected");
    console.log("3. Telegram bot not configured");
    console.log("=".repeat(60));
    process.exit(1);
  });

  req.write(JSON.stringify(testPayload));
  req.end();
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
