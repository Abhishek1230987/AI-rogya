import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupTelegramForUser10() {
  try {
    console.log("🔧 Setting up Telegram IDs for User 10...\n");

    // First check user 10
    const userRes = await pool.query(
      "SELECT id, email FROM users WHERE id = $1",
      [10]
    );

    if (userRes.rows.length === 0) {
      console.error("❌ User 10 not found!");
      process.exit(1);
    }

    const user = userRes.rows[0];
    console.log(`✅ User 10: ${user.email}`);

    // Use the same Telegram chat ID
    const telegramId = "1831824613";

    // Check if medical_history record exists
    const medCheck = await pool.query(
      "SELECT id FROM medical_history WHERE user_id = $1",
      [10]
    );

    let result;
    if (medCheck.rows.length === 0) {
      console.log("📝 Creating new medical_history record for user 10...");

      // Create new record with Telegram IDs
      result = await pool.query(
        `INSERT INTO medical_history (user_id, emergency_contact, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING *`,
        [
          10,
          JSON.stringify({
            parent1_telegram_id: telegramId,
            parent2_telegram_id: telegramId,
            guardian_telegram_id: telegramId,
          }),
        ]
      );

      console.log("✅ Created medical_history record");
    } else {
      console.log("📝 Updating existing medical_history record for user 10...");

      // Update existing record
      result = await pool.query(
        `UPDATE medical_history
         SET emergency_contact = $2, updated_at = NOW()
         WHERE user_id = $1
         RETURNING *`,
        [
          10,
          JSON.stringify({
            parent1_telegram_id: telegramId,
            parent2_telegram_id: telegramId,
            guardian_telegram_id: telegramId,
          }),
        ]
      );

      console.log("✅ Updated medical_history record");
    }

    const medicalHistory = result.rows[0];
    console.log("\n📱 Telegram IDs configured:");
    console.log(`   Parent 1: ${telegramId}`);
    console.log(`   Parent 2: ${telegramId}`);
    console.log(`   Guardian: ${telegramId}`);

    console.log(
      "\n======================================================================"
    );
    console.log("✅ SETUP COMPLETE!");
    console.log(
      "======================================================================"
    );
    console.log(
      "\n🎉 User 10 (${user.email}) now has Telegram emergency alerts configured!"
    );
    console.log("\n💡 Next steps:");
    console.log("   1. Refresh your browser (F5)");
    console.log("   2. Try clicking the SOS button");
    console.log("   3. The alert should now be sent to Telegram!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

setupTelegramForUser10();
