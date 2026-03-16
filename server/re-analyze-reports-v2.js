import pool from "./src/config/database.js";
import { MedicalDocumentAnalyzer } from "./src/services/medicalAnalyzer.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "../server/uploads");

const analyzer = new MedicalDocumentAnalyzer();

// Helper to find the actual file
function findActualFile(filename, mimeType) {
  const uploadDirs = [
    path.join(UPLOAD_DIR), // Try root uploads first
    path.join(UPLOAD_DIR, "medical-reports"), // Try medical-reports subdir
  ];

  for (const dir of uploadDirs) {
    // Try exact filename
    let testPath = path.join(dir, filename);
    if (fs.existsSync(testPath)) {
      return testPath;
    }

    // Try without path separators
    const basename = path.basename(filename);
    testPath = path.join(dir, basename);
    if (fs.existsSync(testPath)) {
      return testPath;
    }

    // Search for files containing original filename
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (
          filename.includes(file) ||
          file.includes(path.basename(filename).split(".")[0])
        ) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            return fullPath;
          }
        }
      }
    } catch (e) {
      // Continue searching
    }
  }

  return null;
}

(async () => {
  try {
    console.log(
      "🔄 Re-analyzing all medical reports without extracted_data...\n",
    );

    // Find all reports with NULL extracted_data
    const result = await pool.query(`
      SELECT id, file_path, file_name, original_name, mime_type 
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
        // Try to find the actual file
        let filePath =
          findActualFile(
            report.file_path || report.file_name,
            report.mime_type,
          ) ||
          findActualFile(report.file_name, report.mime_type) ||
          findActualFile(report.original_name, report.mime_type);

        if (!filePath) {
          console.log(
            `  ⚠️ File not found. Tried: ${report.file_path}, ${report.file_name}, ${report.original_name}`,
          );
          failureCount++;
          continue;
        }

        console.log(`  📂 Found file at: ${filePath}`);

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
