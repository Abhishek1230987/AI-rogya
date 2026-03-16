#!/usr/bin/env node

/**
 * SOS System Initialization Script
 * This will set up everything for you
 */

const { Pool } = require("pg");
require("dotenv").config({ path: "./server/.env" });

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "e_consultancy",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function initializeSOS() {
  console.log("\n🚀 SOS System Initialization\n");
  console.log("=".repeat(60));

  try {
    // Test connection
    console.log("\n✓ Testing database connection...");
    await pool.query("SELECT NOW()");
    console.log("  ✅ Database connected");

    // Create sos_alerts table
    console.log("\n✓ Creating sos_alerts table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sos_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'MEDIUM',
        location JSONB DEFAULT '{}'::jsonb,
        has_audio BOOLEAN DEFAULT FALSE,
        audio_file_path TEXT,
        recipients JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'sent',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("  ✅ sos_alerts table created");

    // Create indexes
    console.log("\n✓ Creating indexes...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id ON sos_alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_sos_alerts_timestamp ON sos_alerts(timestamp DESC);
    `);
    console.log("  ✅ Indexes created");

    // Update medical_history with emergency contact JSONB column if needed
    console.log("\n✓ Checking medical_history table...");
    const colCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'medical_history' AND column_name = 'emergency_contact'
    `);

    if (colCheck.rows.length === 0) {
      console.log("  Adding emergency_contact column...");
      await pool.query(`
        ALTER TABLE medical_history 
        ADD COLUMN emergency_contact JSONB DEFAULT '{}'::jsonb
      `);
      console.log("  ✅ emergency_contact column added");
    } else {
      console.log("  ✅ emergency_contact column already exists");
    }

    // Get or create test user
    console.log("\n✓ Setting up test user...");
    let userId;

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      ["test@example.com"]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log(`  ℹ️  Test user already exists (ID: ${userId})`);
    } else {
      const newUser = await pool.query(
        `INSERT INTO users (name, email, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        ["Test User", "test@example.com", "hashed", "patient"]
      );
      userId = newUser.rows[0].id;
      console.log(`  ✅ Test user created (ID: ${userId})`);
    }

    // Ensure medical history exists
    const medicalCheck = await pool.query(
      "SELECT id FROM medical_history WHERE user_id = $1",
      [userId]
    );

    if (medicalCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO medical_history (user_id, created_at, updated_at)
         VALUES ($1, NOW(), NOW())`,
        [userId]
      );
      console.log("  ✅ Medical history created");
    }

    // Setup emergency contacts
    console.log("\n✓ Setting up emergency contacts...");
    const demoTelegramId = process.env.DEMO_TELEGRAM_ID || "123456789";

    await pool.query(
      `UPDATE medical_history 
       SET emergency_contact = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [
        JSON.stringify({
          parent1_telegram_id: demoTelegramId,
          parent2_telegram_id: demoTelegramId,
          last_updated: new Date().toISOString(),
        }),
        userId,
      ]
    );
    console.log(`  ✅ Emergency contacts configured`);
    console.log(`     Parent 1: ${demoTelegramId}`);
    console.log(`     Parent 2: ${demoTelegramId}`);

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("\n✅ SOS SYSTEM INITIALIZED SUCCESSFULLY!\n");

    console.log("System Status:");
    console.log("  ✅ Database: Connected");
    console.log("  ✅ Tables: Created");
    console.log("  ✅ Test User: Ready (ID: " + userId + ")");
    console.log("  ✅ Emergency Contacts: Configured");
    console.log(
      "  ✅ Telegram Bot: " +
        (process.env.TELEGRAM_BOT_TOKEN ? "Configured" : "Not configured")
    );

    console.log("\n🚀 Next Steps:");
    console.log("  1. Frontend: cd client && npm run dev");
    console.log("  2. Backend: cd server && npm start");
    console.log("  3. App: http://localhost:5173");
    console.log("  4. Login with test@example.com");
    console.log("  5. Click 🚨 SOS button to test\n");

    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeSOS();
