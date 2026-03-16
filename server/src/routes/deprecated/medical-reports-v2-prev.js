import Busboy from "busboy";
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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
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
function isValidFileType(mimeType, filename) {
  if (!ALLOWED_TYPES.includes(mimeType)) return false;
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
function createMockAnalysis(filename, mimeType, fileSize) {
  return {
    analysis: {
      documentType: "Medical Report",
      extractedText: "Mock analysis - replace with actual OCR",
      confidence: 0.75,
      metadata: { filename, mimeType, fileSize },
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
// MAIN UPLOAD HANDLER - SIMPLIFIED
// ============================================

medicalReportsRouter.post("/upload", (req, res) => {
  console.log("\n🎯 [MEDICAL REPORTS V2] UPLOAD REQUEST START");

  // Step 1: Verify token FIRST, before ANY async operations
  console.log("📝 Step 1: Verifying JWT token...");
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ Auth failed");
    return res
      .status(401)
      .json({ success: false, message: "Authorization required" });
  }

  let userId;
  try {
    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    userId = decoded.id;
    console.log("✅ JWT verified, user ID:", userId);
  } catch (error) {
    console.log("❌ JWT verification failed:", error.message);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  // Step 2: Initialize Busboy IMMEDIATELY
  console.log("📝 Step 2: Initializing Busboy...");
  console.log("📋 Content-Type:", req.headers["content-type"]);

  const bb = Busboy({ headers: req.headers });

  // State variables
  let fileBuffer = null;
  let fileName = null;
  let mimeType = null;
  let fileSize = 0;
  let parseError = null;
  let resolved = false;
  const chunks = [];

  // Step 3: Setup file handler
  console.log("📝 Step 3: Setting up file event...");

  bb.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(
      "✅ FILE EVENT FIRED!  filename:",
      filename,
      "field:",
      fieldname,
      "type:",
      mimetype
    );

    if (!isValidFileType(mimetype, filename)) {
      console.log("❌ Invalid file type");
      file.resume();
      return;
    }

    fileName = filename;
    mimeType = mimetype;

    file.on("data", (chunk) => {
      console.log("📦 File chunk:", chunk.length, "bytes");
      chunks.push(chunk);
      fileSize += chunk.length;
    });

    file.on("end", () => {
      console.log("✅ File stream ended");
      fileBuffer = Buffer.concat(chunks);
    });

    file.on("error", (err) => {
      console.error("❌ File error:", err.message);
      parseError = err;
    });
  });

  bb.on("error", (err) => {
    console.error("❌ Busboy error:", err.message);
    parseError = err;
    if (!resolved) {
      resolved = true;
      res.status(400).json({ success: false, message: err.message });
    }
  });

  bb.on("finish", async () => {
    console.log("📝 Step 4: Busboy FINISH event fired");
    if (resolved) {
      console.log("⚠️ Already resolved, skipping");
      return;
    }
    resolved = true;

    console.log("📝 Step 4: Processing...");

    if (parseError) {
      console.error("❌ Parse error");
      return res
        .status(400)
        .json({ success: false, message: parseError.message });
    }

    if (!fileBuffer) {
      console.log("❌ No file received");
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    try {
      const savedName = generateFileName(fileName);
      const filepath = path.join(UPLOAD_DIR, savedName);

      console.log("💾 Saving file...");
      fs.writeFileSync(filepath, fileBuffer);
      console.log("✅ File saved");

      const analysis = createMockAnalysis(fileName, mimeType, fileSize);

      console.log("📝 Step 5: Saving to database...");
      const pool = req.app.get("pool");
      const dbRecord = await saveReportToDatabase(pool, userId, {
        originalName: fileName,
        savedPath: savedName,
        mimeType: mimeType,
        fileSize: fileSize,
        analysis: analysis.analysis,
      });

      console.log("✅ DB saved, ID:", dbRecord.id);
      console.log("🎯 [MEDICAL REPORTS V2] UPLOAD COMPLETE ✅\n");

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
    } catch (error) {
      console.error("❌ Error:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Step 0: PIPE IMMEDIATELY (before all handlers are registered, inside sync context)
  console.log("📝 Step 0: Piping request...");

  // Add debugging
  req.on("data", (chunk) => {
    console.log("📨 Request data received:", chunk.length, "bytes");
  });

  req.pipe(bb);
});

// 2. GET USER'S REPORTS
medicalReportsRouter.get("/list", async (req, res) => {
  console.log("📄 [MEDICAL REPORTS] LIST REQUEST");

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

    console.log("✅ Fetching reports for user:", userId);
    const pool = req.app.get("pool");
    const reports = await getUserReports(pool, userId);
    console.log("✅ Found", reports.length, "reports");

    res.json({
      success: true,
      reports: reports,
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET SPECIFIC REPORT
medicalReportsRouter.get("/:reportId", async (req, res) => {
  console.log("📄 GET REPORT:", req.params.reportId);

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
    console.error("❌ Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. DELETE REPORT
medicalReportsRouter.delete("/:reportId", async (req, res) => {
  console.log("🗑️  DELETE REPORT:", req.params.reportId);

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
      console.log("✅ File deleted");
    }

    res.json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. DOWNLOAD REPORT
medicalReportsRouter.get("/download/:reportId", async (req, res) => {
  console.log("⬇️  DOWNLOAD REPORT:", req.params.reportId);

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
    console.error("❌ Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default medicalReportsRouter;
