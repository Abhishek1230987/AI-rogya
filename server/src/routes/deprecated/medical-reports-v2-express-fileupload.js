import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import express from "express";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const medicalReportsRouter = express.Router();

// Configuration
const UPLOAD_DIR = path.join(__dirname, "../../uploads/medical-reports");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "doc", "docx", "txt"];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("✅ Created upload directory:", UPLOAD_DIR);
}

// Helper: Verify JWT Token
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
}

// Helper: Validate file type
function isValidFileType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

// Helper: Generate safe filename
function generateFileName(originalName) {
  const ext = path.extname(originalName);
  const name = `report-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}${ext}`;
  return name;
}

// Helper: Create mock analysis
function createMockAnalysis(filename, fileSize) {
  return {
    analysis: {
      documentType: "Medical Report",
      extractedText: "Mock analysis - replace with actual OCR",
      confidence: 0.75,
      metadata: { filename, fileSize },
    },
  };
}

// Helper: Save report to database
async function saveReportToDatabase(pool, userId, fileData) {
  const query = `
    INSERT INTO medical_reports 
    (user_id, file_name, file_path, file_size, mime_type, extracted_data, document_type, uploaded_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *;
  `;

  const values = [
    userId,
    fileData.originalName,
    fileData.savedPath,
    fileData.fileSize,
    fileData.mimeType,
    JSON.stringify(fileData.analysis),
    "Medical Report",
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

// Helper: Get user reports
async function getUserReports(pool, userId) {
  const query = `
    SELECT * FROM medical_reports 
    WHERE user_id = $1 
    ORDER BY uploaded_at DESC;
  `;

  const result = await pool.query(query, [userId]);
  return result.rows.map((row) => ({
    id: row.id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    uploadedAt: row.uploaded_at,
    documentType: row.document_type,
  }));
}

// Helper: Delete report
async function deleteReport(pool, userId, reportId) {
  const query = `
    DELETE FROM medical_reports 
    WHERE id = $1 AND user_id = $2
    RETURNING file_path;
  `;

  const result = await pool.query(query, [reportId, userId]);
  return result.rows[0];
}

// ============================================
// UPLOAD HANDLER - EXPRESS-FILEUPLOAD
// ============================================

medicalReportsRouter.post("/upload", async (req, res) => {
  console.log("\n🎯 [MEDICAL REPORTS V2] ===== UPLOAD START =====");

  // Step 1: Verify token
  console.log("📝 [STEP 1] Verifying JWT...");
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ [STEP 1] No Authorization header");
    return res
      .status(401)
      .json({ success: false, message: "Authorization required" });
  }

  let userId;
  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    userId = decoded.id;
    console.log("✅ [STEP 1] JWT verified, user ID:", userId);
  } catch (error) {
    console.log("❌ [STEP 1] JWT failed:", error.message);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  // Step 2: Check if file was uploaded
  console.log("📝 [STEP 2] Checking for file...");
  if (!req.files || Object.keys(req.files).length === 0) {
    console.log("❌ [STEP 2] No file uploaded");
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const file = req.files.file;
  if (!file) {
    console.log("❌ [STEP 2] Missing 'file' field in form data");
    return res
      .status(400)
      .json({ success: false, message: "Missing 'file' field" });
  }

  console.log(`✅ [STEP 2] File received: ${file.name} (${file.size} bytes)`);

  // Step 3: Validate file
  console.log("📝 [STEP 3] Validating file...");
  if (!isValidFileType(file.name)) {
    console.log(`❌ [STEP 3] Invalid file extension: ${file.name}`);
    return res.status(400).json({
      success: false,
      message: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    console.log(`❌ [STEP 3] File too large: ${file.size} > ${MAX_FILE_SIZE}`);
    return res.status(400).json({
      success: false,
      message: `File too large. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    });
  }

  console.log(`✅ [STEP 3] File validation passed`);

  try {
    // Step 4: Save file to disk
    console.log("📝 [STEP 4] Saving file to disk...");
    const savedName = generateFileName(file.name);
    const filepath = path.join(UPLOAD_DIR, savedName);

    await file.mv(filepath);
    console.log(`✅ [STEP 4] File saved: ${filepath}`);

    // Step 5: Create analysis
    console.log("📝 [STEP 5] Creating analysis...");
    const analysis = createMockAnalysis(file.name, file.size);
    console.log(`✅ [STEP 5] Analysis created`);

    // Step 6: Save to database
    console.log("📝 [STEP 6] Saving to database...");
    const pool = req.app.get("pool");
    const dbRecord = await saveReportToDatabase(pool, userId, {
      originalName: file.name,
      savedPath: savedName,
      mimeType: file.mimetype || "application/octet-stream",
      fileSize: file.size,
      analysis: analysis.analysis,
    });
    console.log(`✅ [STEP 6] Database saved, ID: ${dbRecord.id}`);

    // Step 7: Send success response
    console.log("📝 [STEP 7] Sending success response...");
    res.status(200).json({
      success: true,
      message: "Report uploaded successfully",
      report: {
        id: dbRecord.id,
        fileName: dbRecord.file_name,
        filePath: dbRecord.file_path,
        fileSize: dbRecord.file_size,
        mimeType: dbRecord.mime_type,
        uploadedAt: dbRecord.uploaded_at,
        analysis: analysis.analysis,
      },
    });

    console.log("🎯 [MEDICAL REPORTS V2] ===== UPLOAD SUCCESS ✅ =====\n");
  } catch (error) {
    console.error(`❌ [ERROR] ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
    console.log("🎯 [MEDICAL REPORTS V2] ===== UPLOAD FAILED ❌ =====\n");
  }
});

// 2. GET USER'S REPORTS
medicalReportsRouter.get("/list", async (req, res) => {
  console.log("📄 [LIST] Fetching reports...");

  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Authorization required" });
  }

  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    const userId = decoded.id;

    const pool = req.app.get("pool");
    const reports = await getUserReports(pool, userId);
    console.log(`✅ [LIST] Found ${reports.length} reports for user ${userId}`);

    res.json({ success: true, reports });
  } catch (error) {
    console.error(`❌ [LIST ERROR] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET SPECIFIC REPORT
medicalReportsRouter.get("/:reportId", async (req, res) => {
  console.log(`📄 [GET] Report: ${req.params.reportId}`);

  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Authorization required" });
  }

  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    const userId = decoded.id;
    const reportId = req.params.reportId;

    const pool = req.app.get("pool");
    const query = `
      SELECT * FROM medical_reports 
      WHERE id = $1 AND user_id = $2;
    `;

    const result = await pool.query(query, [reportId, userId]);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      report: {
        id: row.id,
        fileName: row.file_name,
        filePath: row.file_path,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        uploadedAt: row.uploaded_at,
        analysis: row.extracted_data,
      },
    });
  } catch (error) {
    console.error(`❌ [GET ERROR] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. DELETE REPORT
medicalReportsRouter.delete("/:reportId", async (req, res) => {
  console.log(`🗑️  [DELETE] Report: ${req.params.reportId}`);

  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Authorization required" });
  }

  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    const userId = decoded.id;
    const reportId = req.params.reportId;

    const pool = req.app.get("pool");
    const deleted = await deleteReport(pool, userId, reportId);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    // Delete file from disk
    const filepath = path.join(UPLOAD_DIR, deleted.file_path);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`✅ [DELETE] File deleted: ${filepath}`);
    }

    res.json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.error(`❌ [DELETE ERROR] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. DOWNLOAD REPORT
medicalReportsRouter.get("/download/:reportId", async (req, res) => {
  console.log(`⬇️  [DOWNLOAD] Report: ${req.params.reportId}`);

  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Authorization required" });
  }

  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    const userId = decoded.id;
    const reportId = req.params.reportId;

    const pool = req.app.get("pool");
    const query = `
      SELECT * FROM medical_reports 
      WHERE id = $1 AND user_id = $2;
    `;

    const result = await pool.query(query, [reportId, userId]);
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Report not found" });
    }

    const row = result.rows[0];
    const filepath = path.join(UPLOAD_DIR, row.file_path);

    if (!fs.existsSync(filepath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    res.download(filepath, row.file_name);
  } catch (error) {
    console.error(`❌ [DOWNLOAD ERROR] ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default medicalReportsRouter;
