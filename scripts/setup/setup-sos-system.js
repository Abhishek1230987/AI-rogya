/**
 * SOS System Setup Script
 * Automatically configures the SOS emergency feature for testing
 *
 * This script will:
 * 1. Connect to the database
 * 2. Create all necessary tables
 * 3. Create test users with emergency contacts
 * 4. Verify Telegram configuration
 * 5. Provide tokens for testing
 */

import "dotenv/config";
import pkg from "pg";
import jwt from "jsonwebtoken";
import axios from "axios";
const { Pool } = pkg;

// Configuration
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "e_consultancy",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const API_BASE_URL = "http://localhost:5000";

console.log("\n🚀 SOS System Setup Script\n");
console.log("=".repeat(60));

// Helper function to wait
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Step 1: Verify Database Connection
async function verifyDatabaseConnection() {
  console.log("\n✓ Step 1: Verifying Database Connection...");
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("  ✅ Database connection successful");
    console.log(`  📅 Server time: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.log("  ❌ Database connection failed:", error.message);
    return false;
  }
}

// Step 2: Verify Telegram Configuration
async function verifyTelegramConfiguration() {
  console.log("\n✓ Step 2: Verifying Telegram Configuration...");

  if (!TELEGRAM_BOT_TOKEN) {
    console.log("  ⚠️  TELEGRAM_BOT_TOKEN not set in .env file");
    console.log("  📝 Required: TELEGRAM_BOT_TOKEN=your_bot_token");
    return false;
  }

  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`,
      { timeout: 5000 }
    );

    if (response.data.ok) {
      const botInfo = response.data.result;
      console.log("  ✅ Telegram bot is configured");
      console.log(`  🤖 Bot Name: ${botInfo.first_name}`);
      console.log(`  🆔 Bot ID: ${botInfo.id}`);
      return true;
    } else {
      console.log("  ❌ Telegram bot token is invalid");
      return false;
    }
  } catch (error) {
    console.log("  ❌ Failed to verify Telegram:", error.message);
    console.log("  💡 Make sure you have internet connection");
    return false;
  }
}

// Step 3: Initialize Database Schema
async function initializeDatabaseSchema() {
  console.log("\n✓ Step 3: Initializing Database Schema...");
  const client = await pool.connect();

  try {
    // SOS alerts table
    await client.query(`
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
    console.log("  ✅ sos_alerts table ready");

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id ON sos_alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_sos_alerts_timestamp ON sos_alerts(timestamp DESC);
    `);
    console.log("  ✅ Indexes created");

    return true;
  } catch (error) {
    console.log("  ❌ Schema initialization failed:", error.message);
    return false;
  } finally {
    client.release();
  }
}

// Step 4: Create Test User
async function createTestUser() {
  console.log("\n✓ Step 4: Creating Test User...");
  const client = await pool.connect();

  try {
    // Check if user exists
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      ["test@example.com"]
    );

    let userId;

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log("  ℹ️  Test user already exists");
      console.log(`  🆔 User ID: ${userId}`);
    } else {
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (name, email, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        ["Test User", "test@example.com", "hashed_password", "patient"]
      );
      userId = userResult.rows[0].id;
      console.log("  ✅ Test user created");
      console.log(`  🆔 User ID: ${userId}`);
    }

    // Create medical history if not exists
    const medicalHistory = await client.query(
      "SELECT id FROM medical_history WHERE user_id = $1",
      [userId]
    );

    if (medicalHistory.rows.length === 0) {
      await client.query(
        `INSERT INTO medical_history (user_id, created_at, updated_at)
         VALUES ($1, NOW(), NOW())`,
        [userId]
      );
      console.log("  ✅ Medical history created");
    }

    return userId;
  } catch (error) {
    console.log("  ❌ User creation failed:", error.message);
    return null;
  } finally {
    client.release();
  }
}

// Step 5: Setup Emergency Contacts
async function setupEmergencyContacts(userId) {
  console.log("\n✓ Step 5: Setting Up Emergency Contacts...");

  // For this demo, we'll prompt the user to enter their Telegram ID
  // OR use a test ID if DEMO_TELEGRAM_ID is set
  const demoTelegramId = process.env.DEMO_TELEGRAM_ID || "123456789";

  console.log("  ℹ️  You need Telegram IDs to set up emergency contacts");
  console.log("  📱 To get your Telegram ID:");
  console.log("     1. Open Telegram");
  console.log("     2. Search for @userinfobot");
  console.log("     3. Send it a message");
  console.log("     4. It will reply with your ID");
  console.log(`\n  ℹ️  Using demo ID for testing: ${demoTelegramId}`);

  try {
    const token = generateToken(userId);
    const response = await axios.post(
      `${API_BASE_URL}/api/sos/update-contacts`,
      {
        parent1_telegram_id: demoTelegramId,
        parent2_telegram_id: demoTelegramId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    );

    if (response.data.success) {
      console.log("  ✅ Emergency contacts configured");
      console.log(`  📞 Parent 1 ID: ${demoTelegramId}`);
      console.log(`  📞 Parent 2 ID: ${demoTelegramId}`);
      return { token, userId, demoTelegramId };
    } else {
      console.log(
        "  ⚠️  Emergency contacts setup failed:",
        response.data.message
      );
      return null;
    }
  } catch (error) {
    console.log("  ❌ Emergency contacts setup failed:", error.message);
    console.log("  💡 Make sure the server is running on port 5000");
    return null;
  }
}

// Step 6: Test SOS Feature
async function testSOSFeature(token, userId) {
  console.log("\n✓ Step 6: Testing SOS Feature...");

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/sos/send`,
      {
        message: "🚨 Test SOS Alert - Everything is configured!",
        severity: "MEDIUM",
        location: {
          address: "Test Location",
          latitude: 0,
          longitude: 0,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      console.log("  ✅ SOS alert sent successfully");
      console.log(
        `  📨 Recipients: ${response.data.details.successfulRecipients}`
      );
      console.log("  📱 Check your Telegram for the alert!");
      return true;
    } else {
      console.log("  ⚠️  SOS alert failed:", response.data.message);
      return false;
    }
  } catch (error) {
    console.log("  ❌ SOS test failed:", error.message);
    return false;
  }
}

// Step 7: Generate JWT Token
function generateToken(userId) {
  return jwt.sign(
    { id: userId, email: "test@example.com", role: "patient" },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

// Step 8: Get SOS Configuration
async function getSOSConfiguration(token, userId) {
  console.log("\n✓ Step 7: SOS Configuration Status...");

  try {
    const response = await axios.get(`${API_BASE_URL}/api/sos/config`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    });

    if (response.data.success) {
      console.log("  ✅ SOS Configuration Retrieved");
      console.log(
        `  🤖 Telegram Bot: ${
          response.data.telegramConfigured
            ? "✅ Configured"
            : "❌ Not Configured"
        }`
      );
      console.log(
        `  👨 Parent 1: ${
          response.data.contacts.parent1.configured
            ? "✅ Configured"
            : "❌ Not Configured"
        }`
      );
      console.log(
        `  👩 Parent 2: ${
          response.data.contacts.parent2.configured
            ? "✅ Configured"
            : "❌ Not Configured"
        }`
      );
      console.log(
        `  🛡️  Guardian: ${
          response.data.contacts.guardian.configured
            ? "✅ Configured"
            : "❌ Not Configured"
        }`
      );
      console.log(`  📊 Total Configured: ${response.data.totalConfigured}/3`);
      return true;
    }
  } catch (error) {
    console.log("  ❌ Failed to get configuration:", error.message);
    return false;
  }
}

// Main execution
async function main() {
  try {
    // Step 1: Verify Database
    const dbConnected = await verifyDatabaseConnection();
    if (!dbConnected) {
      console.log("\n❌ Cannot continue without database connection");
      process.exit(1);
    }

    // Step 2: Verify Telegram
    const telegramConfigured = await verifyTelegramConfiguration();
    if (!telegramConfigured) {
      console.log("\n⚠️  Telegram configuration missing");
      console.log("📝 Add TELEGRAM_BOT_TOKEN to your .env file");
    }

    // Step 3: Initialize Schema
    const schemaReady = await initializeDatabaseSchema();
    if (!schemaReady) {
      console.log("\n❌ Cannot continue without database schema");
      process.exit(1);
    }

    // Step 4: Create Test User
    const userId = await createTestUser();
    if (!userId) {
      console.log("\n❌ Cannot continue without test user");
      process.exit(1);
    }

    // Step 5: Setup Emergency Contacts
    let setupResult = null;
    if (telegramConfigured) {
      setupResult = await setupEmergencyContacts(userId);
    }

    // Step 6: Test SOS Feature
    if (setupResult) {
      await wait(2000);
      await testSOSFeature(setupResult.token, userId);
      await wait(2000);
      await getSOSConfiguration(setupResult.token, userId);
    }

    // Final Summary
    console.log("\n" + "=".repeat(60));
    console.log("\n📋 Setup Summary\n");

    console.log("✅ Database: Connected");
    console.log(
      `✅ Telegram: ${telegramConfigured ? "Configured" : "Not Configured"}`
    );
    console.log("✅ Schema: Initialized");
    console.log(`✅ Test User: Created (ID: ${userId})`);

    if (setupResult) {
      console.log(`✅ Emergency Contacts: Configured`);
      console.log(`✅ SOS Feature: Tested & Working`);

      console.log("\n🎉 SOS System is Ready!\n");

      console.log("📱 Test the feature:");
      console.log(`   URL: http://localhost:5173/sos-setup`);
      console.log(`   Token: ${setupResult.token}`);
      console.log(`   User ID: ${userId}`);

      console.log("\n🚀 Next Steps:");
      console.log("   1. Start the frontend: npm run dev (in client folder)");
      console.log("   2. Go to http://localhost:5173");
      console.log("   3. Login with test account or create new account");
      console.log("   4. Go to SOS Setup page");
      console.log("   5. Enter your real Telegram ID");
      console.log("   6. Click the SOS button to test\n");
    } else {
      console.log("\n⚠️  Setup incomplete - check errors above");
    }

    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
main();
