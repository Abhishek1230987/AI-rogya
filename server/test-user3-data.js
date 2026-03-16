import pool from "./src/config/database.js";

(async () => {
  try {
    const userId = 3; // User with good medical data

    // Get medical history
    const histRes = await pool.query(
      "SELECT * FROM medical_history WHERE user_id = $1",
      [userId],
    );
    console.log("\n📋 Medical History for User 3:");
    if (histRes.rows.length > 0) {
      const h = histRes.rows[0];
      console.log("  - Allergies:", h.allergies);
      console.log("  - Chronic conditions:", h.chronic_conditions);
      console.log("  - Current medications:", h.current_medications);
      console.log("  - Family history:", h.family_history);
      console.log("  - Past surgeries:", h.past_surgeries);
      console.log("  - Blood type:", h.blood_type);
      console.log("  - Gender:", h.gender);
      console.log("  - DOB:", h.date_of_birth);
    }

    // Get medical reports
    const repRes = await pool.query(
      "SELECT id, original_name, document_type, extracted_data FROM medical_reports WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 2",
      [userId],
    );
    console.log("\n📄 Medical Reports:");
    for (const r of repRes.rows) {
      console.log(`\n  Report: ${r.original_name} (${r.document_type})`);
      if (r.extracted_data) {
        const data =
          typeof r.extracted_data === "string"
            ? JSON.parse(r.extracted_data)
            : r.extracted_data;
        console.log(`    Keys: ${Object.keys(data).join(", ")}`);
        if (data.vitals) console.log(`    Vitals: ${data.vitals}`);
        if (data.diagnosis) console.log(`    Diagnosis: ${data.diagnosis}`);
        if (data.key_findings)
          console.log(`    Findings: ${data.key_findings}`);
      }
    }

    // Get last few voice consultations
    const vocRes = await pool.query(
      "SELECT original_message, medical_response FROM voice_consultations WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 2",
      [userId],
    );
    console.log(`\n💬 Recent Consultations (${vocRes.rows.length}):`);
    for (let i = 0; i < vocRes.rows.length; i++) {
      const v = vocRes.rows[i];
      console.log(`\n  Consultation ${i + 1}:`);
      console.log(`    User asked: ${v.original_message?.substring(0, 80)}`);
      console.log(`    AI response: ${v.medical_response?.substring(0, 80)}`);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
