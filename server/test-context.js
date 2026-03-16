import pool from "./src/config/database.js";

(async () => {
  try {
    // Get a user with medical data
    const userRes = await pool.query("SELECT id, email FROM users LIMIT 1");
    if (userRes.rows.length === 0) {
      console.log("❌ No users in database");
      process.exit(1);
    }
    const userId = userRes.rows[0].id;
    console.log("✅ Found user:", userId);

    // Check medical history
    const histRes = await pool.query(
      "SELECT * FROM medical_history WHERE user_id = $1",
      [userId],
    );
    console.log("\n📋 Medical history records:", histRes.rows.length);
    if (histRes.rows.length > 0) {
      const h = histRes.rows[0];
      console.log("  - Allergies:", h.allergies);
      console.log("  - Chronic conditions:", h.chronic_conditions);
      console.log("  - Medications:", h.current_medications);
    }

    // Check medical reports
    const repRes = await pool.query(
      "SELECT id, original_name, document_type, extracted_data FROM medical_reports WHERE user_id = $1 LIMIT 5",
      [userId],
    );
    console.log("\n📄 Medical reports:", repRes.rows.length);
    repRes.rows.forEach((r) => {
      console.log(`  - ${r.original_name} (${r.document_type})`);
      if (r.extracted_data) {
        const data =
          typeof r.extracted_data === "string"
            ? JSON.parse(r.extracted_data)
            : r.extracted_data;
        console.log(`    Extracted data keys:`, Object.keys(data).join(", "));
      }
    });

    // Check voice consultations
    const vocRes = await pool.query(
      "SELECT * FROM voice_consultations WHERE user_id = $1 LIMIT 3",
      [userId],
    );
    console.log("\n💬 Voice consultations:", vocRes.rows.length);
    vocRes.rows.forEach((v) => {
      console.log(`  - Message: ${v.original_message?.substring(0, 50)}`);
      console.log(`    Response: ${v.medical_response?.substring(0, 50)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
