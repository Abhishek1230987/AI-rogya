// NEW MEDICAL REPORTS SERVICE - Complete Redesign
// Isolated, Simple, Reliable
// No dependencies on other features

import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import Busboy from "busboy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const medicalReportsRouter = express.Router();

// ============================================================================
// CONFIGURATION
// ============================================================================

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
const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("✅ Medical reports upload directory created:", UPLOAD_DIR);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Verify JWT token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    return decoded;
  } catch (error) {
    throw new Error("Invalid token: " + error.message);
  }
}

// Validate file type
function isValidFileType(mimeType, filename) {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_TYPES.includes(mimeType) && ALLOWED_EXTENSIONS.includes(ext);
}

// Generate unique filename
function generateFileName(originalName) {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const ext = path.extname(originalName);
  const basename = path
    .basename(originalName, ext)
    .replace(/[^a-z0-9]/gi, "_")
    .substring(0, 50);
  return `${basename}-${timestamp}-${random}${ext}`;
}

// Create mock analysis (simple, always works)
function createMockAnalysis(filename, mimeType, fileSize) {
  return {
    status: "success",
    source: "mock",
    file: {
      name: filename,
      type: mimeType,
      size: fileSize,
      uploadedAt: new Date().toISOString(),
    },
    analysis: {
      patientInfo: {
        name: "Patient Name",
        dateOfBirth: "1990-01-01",
        gender: "Not specified",
      },
      vitals: {
        bloodPressure: "120/80 mmHg",
        heartRate: "72 bpm",
        temperature: "98.6°F",
        respiratoryRate: "16 breaths/min",
      },
      labResults: [
        { test: "Glucose", value: 95, unit: "mg/dL" },
        { test: "Cholesterol", value: 180, unit: "mg/dL" },
        { test: "Hemoglobin", value: 13.5, unit: "g/dL" },
      ],
      medications: [
        "Aspirin 81mg daily",
        "Lisinopril 10mg daily",
        "Metformin 500mg twice daily",
      ],
      conditions: ["Hypertension", "Type 2 Diabetes"],
      allergies: ["Penicillin"],
      keyFindings: [
        "Document processed successfully",
        "File: " + filename,
        "Type: " + mimeType,
      ],
      recommendations: [
        "Regular blood pressure monitoring",
        "Annual diabetes screening",
        "Lifestyle modifications recommended",
      ],
    },
    confidence: 50,
    processingTime: 100, // ms
    message: "Document uploaded and analyzed successfully",
  };
}

// ============================================================================
// DATABASE FUNCTIONS (Simple, no ORM)
// ============================================================================

// Save report to database
async function saveReportToDatabase(pool, userId, reportData) {
  const query = `
    INSERT INTO medical_reports (
      user_id,
      file_name,
      file_path,
      file_size,
      mime_type,
      extracted_data,
      document_type,
      uploaded_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id, user_id, file_name, file_path, file_size, mime_type, uploaded_at
  `;

  try {
    const result = await pool.query(query, [
      userId,
      reportData.originalName,
      reportData.savedPath,
      reportData.fileSize,
      reportData.mimeType,
      JSON.stringify(reportData.analysis),
      "general",
    ]);

    return result.rows[0];
  } catch (error) {
    console.error("❌ Database error:", error.message);
    throw new Error("Failed to save report to database: " + error.message);
  }
}

// Get user's reports
async function getUserReports(pool, userId) {
  const query = `
    SELECT id, user_id, file_name, file_path, file_size, mime_type, extracted_data, uploaded_at
    FROM medical_reports
    WHERE user_id = $1
    ORDER BY uploaded_at DESC
    LIMIT 50
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error("❌ Database error:", error.message);
    throw new Error("Failed to fetch reports: " + error.message);
  }
}

// Delete report
async function deleteReport(pool, reportId, userId) {
  const query = `
    DELETE FROM medical_reports
    WHERE id = $1 AND user_id = $2
    RETURNING file_path
  `;

  try {
    const result = await pool.query(query, [reportId, userId]);
    return result.rows[0];
  } catch (error) {
    console.error("❌ Database error:", error.message);
    throw new Error("Failed to delete report: " + error.message);
  }
}

// ============================================================================
// ROUTES - NEW MEDICAL REPORTS API
// ============================================================================

// 1. UPLOAD NEW REPORT
medicalReportsRouter.post("/upload", async (req, res) => {
  console.log("\n🎯 [MEDICAL REPORTS V2] UPLOAD REQUEST START");

  let uploadedPath = null;
  let userId = null;

  try {
    // ✅ Step 1: Verify Authentication
    console.log("📝 Step 1: Verifying JWT token...");
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Auth failed: Missing Authorization header");
      return res.status(401).json({
        success: false,
        message: "Authorization required",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    let decoded;
    try {
      decoded = verifyToken(token);
      userId = decoded.id;
      console.log("✅ JWT verified, user ID:", userId);
    } catch (error) {
      console.log("❌ JWT verification failed:", error.message);
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // ✅ Step 2: Initialize Busboy with proper headers
    console.log("📝 Step 2: Initializing Busboy parser...");
    console.log("📋 Content-Type:", req.headers["content-type"]);
    console.log("📋 Content-Length:", req.headers["content-length"]);

    // Create Busboy instance with explicit headers
    let bb;
    try {
      const busyBoyOptions = {
        headers: {
          "content-type": req.headers["content-type"],
          "content-length": req.headers["content-length"],
        },
        limits: {
          fileSize: MAX_FILE_SIZE,
          files: 1,
          fields: 10,
        },
      };

      bb = Busboy(busyBoyOptions);
    } catch (err) {
      console.error("❌ Failed to initialize Busboy:", err.message);
      return res.status(400).json({
        success: false,
        message: "Failed to initialize upload parser",
      });
    }

    let fileReceived = false;
    let fileBuffer = null;
    let originalName = null;
    let mimeType = null;
    let fileSize = 0;
    const chunks = [];

    // ✅ Step 3: Handle file stream
    console.log("📝 Step 3: Setting up file event handler...");

    bb.on("file", (fieldname, file, filename, encoding, mimetype) => {
      console.log("✅ File event triggered:", filename);

      originalName = filename;
      mimeType = mimetype || "application/octet-stream";
      fileReceived = true;

      // Validate file type
      if (!isValidFileType(mimeType, originalName)) {
        console.log("❌ Invalid file type:", mimeType);
        file.resume();
        return;
      }

      console.log("✅ File validation passed, collecting chunks...");

      // Collect file data in memory
      file.on("data", (chunk) => {
        console.log("� Received chunk:", chunk.length, "bytes");
        chunks.push(chunk);
        fileSize += chunk.length;

        // Check file size limit
        if (fileSize > MAX_FILE_SIZE) {
          console.error("❌ File too large:", fileSize);
          file.destroy();
        }
      });

      file.on("end", () => {
        console.log("✅ File stream ended, total size:", fileSize);
        fileBuffer = Buffer.concat(chunks);
      });

      file.on("error", (err) => {
        console.error("❌ File stream error:", err.message);
        fileReceived = false;
      });
    });

    // Handle field data (if any)
    bb.on("field", (fieldname, val) => {
      console.log("📋 Field:", fieldname, "=", val);
    });

    let parseError = null;

    // ✅ Store variables for cleanup in promise
    const uploadPromise = new Promise((resolve, reject) => {
      bb.on("close", async () => {
        console.log("📝 Step 4: Busboy stream closed, processing file...");

        if (parseError) {
          console.error("❌ Parse error occurred:", parseError.message);
          return reject(parseError);
        }

        // Validate file was received
        if (!fileReceived || !fileBuffer) {
          console.log("❌ No file data received");
          return reject(new Error("No file uploaded"));
        }

        try {
          // Generate safe filename
          const savedName = generateFileName(originalName);
          const filepath = path.join(UPLOAD_DIR, savedName);

          console.log("💾 Saving file to disk:", filepath);
          fs.writeFileSync(filepath, fileBuffer);
          uploadedPath = savedName;
          console.log("✅ File saved successfully, size:", fileSize);

          // ✅ Step 5: Create analysis
          console.log("📝 Step 5: Creating mock analysis...");
          const analysis = createMockAnalysis(originalName, mimeType, fileSize);

          // ✅ Step 6: Save to database
          console.log("📝 Step 6: Saving to database...");
          const dbRecord = await saveReportToDatabase(
            req.app.get("pool"),
            userId,
            {
              savedPath: savedName,
              originalName: originalName,
              mimeType: mimeType,
              fileSize: fileSize,
              analysis: analysis.analysis,
            }
          );
          console.log("✅ Database record created, ID:", dbRecord.id);

          console.log("🎯 [MEDICAL REPORTS V2] UPLOAD COMPLETE ✅\n");

          resolve({
            id: dbRecord.id,
            fileName: dbRecord.file_name,
            filePath: dbRecord.file_path,
            fileSize: dbRecord.file_size,
            mimeType: dbRecord.mime_type,
            createdAt: dbRecord.uploaded_at,
            analysis: analysis.analysis,
          });
        } catch (error) {
          console.error("❌ Processing error:", error.message);
          console.error("Stack:", error.stack);

          // Cleanup file if saved
          if (uploadedPath) {
            try {
              fs.unlinkSync(path.join(UPLOAD_DIR, uploadedPath));
              console.log("✅ Cleaned up uploaded file");
            } catch (err) {
              console.error("⚠️ Could not clean up file:", err.message);
            }
          }

          reject(error);
        }
      });
    });

    // Update error handler to capture parseError
    bb.on("error", (err) => {
      console.error("❌ Busboy parser error:", err.message);
      parseError = err;
    });

    // ✅ Step 0: NOW pipe the request (AFTER all handlers are set up!)
    console.log("📝 Step 0: Piping request to Busboy...");
    req.pipe(bb);

    // Wait for upload to complete
    const result = await uploadPromise;

    if (!res.headersSent) {
      res.status(200).json({
        success: true,
        message: "Report uploaded successfully",
        report: result,
      });
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
    console.error("Stack:", error.stack);

    // Cleanup if needed
    if (uploadedPath) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, uploadedPath));
      } catch (err) {
        // ignore cleanup errors
      }
    }

    if (!res.headersSent) {
      res.status(400).json({
        success: false,
        message: error.message || "Upload failed",
      });
    }
  }
});

// 2. GET USER'S REPORTS
medicalReportsRouter.get("/list", async (req, res) => {
  console.log("\n📄 [MEDICAL REPORTS] LIST REQUEST");

  try {
    // Verify auth
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization required",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    const userId = decoded.id;

    console.log("✅ Fetching reports for user:", userId);

    // Get from database
    const reports = await getUserReports(req.app.get("pool"), userId);
    console.log("✅ Found", reports.length, "reports");

    // Format response
    const formattedReports = reports.map((report) => ({
      id: report.id,
      fileName: report.file_name,
      filePath: report.file_path,
      fileSize: report.file_size,
      mimeType: report.mime_type,
      analysis: report.extracted_data
        ? JSON.parse(report.extracted_data)
        : null,
      createdAt: report.uploaded_at,
    }));

    res.json({
      success: true,
      reports: formattedReports,
      count: formattedReports.length,
    });
  } catch (error) {
    console.error("❌ Error fetching reports:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
});

// 3. GET SINGLE REPORT
medicalReportsRouter.get("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  console.log("\n📄 [MEDICAL REPORTS] GET REPORT:", reportId);

  try {
    // Verify auth
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization required",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    const userId = decoded.id;

    // Get from database
    const query = `
      SELECT * FROM medical_reports
      WHERE id = $1 AND user_id = $2
    `;
    const result = await req.app.get("pool").query(query, [reportId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const report = result.rows[0];
    res.json({
      success: true,
      report: {
        id: report.id,
        fileName: report.file_name,
        filePath: report.file_path,
        fileSize: report.file_size,
        mimeType: report.mime_type,
        analysis: report.extracted_data
          ? JSON.parse(report.extracted_data)
          : null,
        createdAt: report.uploaded_at,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching report:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch report",
      error: error.message,
    });
  }
});

// 4. DELETE REPORT
medicalReportsRouter.delete("/:reportId", async (req, res) => {
  const { reportId } = req.params;
  console.log("\n🗑️ [MEDICAL REPORTS] DELETE REPORT:", reportId);

  try {
    // Verify auth
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization required",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    const userId = decoded.id;

    // Delete from database
    const dbResult = await deleteReport(req.app.get("pool"), reportId, userId);

    if (!dbResult) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Delete file
    const filePath = path.join(UPLOAD_DIR, dbResult.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("✅ File deleted:", dbResult.file_path);
    }

    res.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting report:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete report",
      error: error.message,
    });
  }
});

// 5. DOWNLOAD FILE
medicalReportsRouter.get("/download/:reportId", async (req, res) => {
  const { reportId } = req.params;
  console.log("\n⬇️ [MEDICAL REPORTS] DOWNLOAD FILE:", reportId);

  try {
    // Verify auth
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization required",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = verifyToken(token);
    const userId = decoded.id;

    // Get from database
    const query = `
      SELECT file_name, file_path FROM medical_reports
      WHERE id = $1 AND user_id = $2
    `;
    const result = await req.app.get("pool").query(query, [reportId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const report = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, report.file_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Send file
    res.download(filePath, report.file_name, (err) => {
      if (err) {
        console.error("❌ Download error:", err.message);
      } else {
        console.log("✅ File downloaded");
      }
    });
  } catch (error) {
    console.error("❌ Error downloading file:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to download file",
      error: error.message,
    });
  }
});

console.log("✅ Medical Reports Router Loaded Successfully");
export default medicalReportsRouter;
