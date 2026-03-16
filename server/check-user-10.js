import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool();

async function checkUser() {
  try {
    // Check user 10
    const userRes = await pool.query(
      "SELECT id, email, name FROM users WHERE id = $1",
      [10]
    );

    if (userRes.rows.length === 0) {
      console.log("❌ User 10 not found");
      process.exit(1);
    }

    const user = userRes.rows[0];
    console.log(`\n✅ User 10 found: ${user.email} (${user.name})`);

    // Check medical history for user 10
    const medRes = await pool.query(
      "SELECT * FROM medical_history WHERE user_id = $1",
      [10]
    );

    if (medRes.rows.length === 0) {
      console.log("❌ User 10 has NO medical history record");
      console.log(
        "\n💡 Solution: Set up emergency contacts with Telegram IDs for user 10"
      );
    } else {
      const med = medRes.rows[0];
      console.log("\n✅ User 10 has medical history record");
      console.log("\nEmergency Contact Data:");
      console.log(JSON.stringify(med.emergency_contact, null, 2));

      if (
        med.emergency_contact?.parent1_telegram_id ||
        med.emergency_contact?.parent2_telegram_id ||
        med.emergency_contact?.guardian_telegram_id
      ) {
        console.log("\n✅ Telegram IDs are configured!");
      } else {
        console.log("\n❌ NO Telegram IDs configured!");
        console.log(
          "\n💡 Solution: Update emergency contacts with Telegram IDs"
        );
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Database error:", error);
    process.exit(1);
  }
}

checkUser();
