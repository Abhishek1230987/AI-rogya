import pool from "./src/config/database.js";

(async () => {
  try {
    const userId = 3;

    // Get medical reports with extracted data
    const repRes = await pool.query(
      "SELECT id, original_name, document_type, extracted_data FROM medical_reports WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1",
      [userId],
    );

    console.log("📄 Medical Report Details for User 3:");
    if (repRes.rows.length > 0) {
      const r = repRes.rows[0];
      console.log("\nReport ID:", r.id);
      console.log("Filename:", r.original_name);
      console.log("Type:", r.document_type);
      console.log("\nExtracted Data:");

      if (r.extracted_data) {
        const data =
          typeof r.extracted_data === "string"
            ? JSON.parse(r.extracted_data)
            : r.extracted_data;
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log("No extracted data found");
      }
    } else {
      console.log("No medical reports found");
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
