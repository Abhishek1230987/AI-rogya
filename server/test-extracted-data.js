import pool from "./src/config/database.js";

(async () => {
  try {
    const res = await pool.query(
      "SELECT COUNT(*) as total, COUNT(CASE WHEN extracted_data IS NOT NULL THEN 1 END) as with_data FROM medical_reports",
    );
    console.log("📊 Medical Reports Status:");
    console.log(`  Total reports: ${res.rows[0].total}`);
    console.log(`  With extracted data: ${res.rows[0].with_data}`);
    console.log(
      `  Without extracted data: ${res.rows[0].total - res.rows[0].with_data}`,
    );

    // Show a sample
    const sample = await pool.query(
      "SELECT original_name, extracted_data FROM medical_reports WHERE extracted_data IS NOT NULL LIMIT 1",
    );
    if (sample.rows.length > 0) {
      console.log(`\n📋 Sample Report: ${sample.rows[0].original_name}`);
      if (sample.rows[0].extracted_data) {
        const data =
          typeof sample.rows[0].extracted_data === "string"
            ? JSON.parse(sample.rows[0].extracted_data)
            : sample.rows[0].extracted_data;
        console.log(`   Keys: ${Object.keys(data).join(", ")}`);
        if (data.medications)
          console.log(`   Medications: ${data.medications}`);
        if (data.conditions) console.log(`   Conditions: ${data.conditions}`);
      }
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
