#!/usr/bin/env node

/**
 * Debug SOS endpoint - simulate exact API call with token
 */

import jwt from "jsonwebtoken";
import http from "http";
import pool from "./src/config/database.js";

console.log("\n🔍 SIMULATING SOS ENDPOINT CALL\n");
console.log("=".repeat(70));

try {
  const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

  // Create token for user 2 (demo1@gmail.com)
  const token = jwt.sign({ id: 2 }, JWT_SECRET, { expiresIn: "7d" });

  console.log("User ID: 2 (demo1@gmail.com)");
  console.log("Token:", token.substring(0, 50) + "...");
  console.log("");

  // First, check database directly
  console.log("📋 Checking database directly:\n");

  const userResult = await pool.query(
    "SELECT id, email FROM users WHERE id = 2"
  );
  console.log("User from DB:", userResult.rows[0]);

  const medicalResult = await pool.query(
    "SELECT emergency_contact FROM medical_history WHERE user_id = 2"
  );

  if (medicalResult.rows.length === 0) {
    console.log("❌ NO medical history record in database!");
    console.log("\n⚠️  Need to run: node setup-emergency-contacts.js");
  } else {
    console.log(
      "Emergency Contact from DB:",
      medicalResult.rows[0].emergency_contact
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log("Now testing API endpoint...\n");

  // Now test the actual API
  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/sos/send",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  const req = http.request(options, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("API Response Status:", res.statusCode);
      console.log("API Response:", data);

      if (res.statusCode === 400) {
        console.log("\n❌ API Error: No Telegram IDs found");
        console.log("\n🔍 LIKELY CAUSES:");
        console.log("1. Wrong user ID in token");
        console.log("2. Medical history not created for this user");
        console.log("3. Telegram IDs not saved in database");
        console.log("\n✅ SOLUTION: Run setup-emergency-contacts.js");
      }

      console.log("\n" + "=".repeat(70));
      process.exit(0);
    });
  });

  req.on("error", (error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });

  const payload = {
    message: "Test SOS",
    severity: "HIGH",
    location: { address: "Test", latitude: 0, longitude: 0 },
  };

  req.write(JSON.stringify(payload));
  req.end();
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
