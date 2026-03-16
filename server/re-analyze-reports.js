import pool from "./src/config/database.js";
import { MedicalDocumentAnalyzer } from "./src/services/medicalAnalyzer.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "../uploads/medical-reports");

const analyzer = new MedicalDocumentAnalyzer();

(async () => {
  try {
    console.log(
      "🔄 Re-analyzing all medical reports without extracted_data...\n",
    );

    // Find all reports with NULL extracted_data
    const result = await pool.query(`
      SELECT id, file_path, original_name, mime_type 
      FROM medical_reports 
      WHERE extracted_data IS NULL
      ORDER BY uploaded_at DESC
    `);

    const reportsToAnalyze = result.rows;
    console.log(
      `📊 Found ${reportsToAnalyze.length} reports needing analysis\n`,
    );

    if (reportsToAnalyze.length === 0) {
      console.log("✅ All reports already have extracted data!");
      process.exit(0);
    }

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < reportsToAnalyze.length; i++) {
      const report = reportsToAnalyze[i];
      console.log(
        `\n[${i + 1}/${reportsToAnalyze.length}] Analyzing: ${report.original_name}`,
      );

      try {
        const filePath = path.join(UPLOAD_DIR, report.file_path);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.log(`  ⚠️ File not found at: ${filePath}`);
          failureCount++;
          continue;
        }

        // Analyze the document
        const extractedData = await analyzer.analyzeDocument(
          filePath,
          report.mime_type || "application/octet-stream",
          report.original_name,
        );

        // Update database with extracted data
        await pool.query(
          "UPDATE medical_reports SET extracted_data = $1 WHERE id = $2",
          [JSON.stringify(extractedData), report.id],
        );

        console.log(`  ✅ Successfully analyzed and saved`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        failureCount++;
      }
    }

    console.log(`\n\n📈 Analysis Complete:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📊 Total: ${reportsToAnalyze.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
})();
