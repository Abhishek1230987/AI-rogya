import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import Busboy from "busboy";
import { auth } from "../middleware/auth.js";
import { medicalReportsDb } from "../helpers/userDatabase.js";
import pool from "../config/database.js";
import { MedicalDocumentAnalyzer } from "../services/medicalAnalyzer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// DEPRECATED: Old upload handler - redirects to v2
// The new /api/medical-reports/ endpoint is the recommended way to upload medical documents
router.post("/upload-report", async (req, res) => {
  console.log("\n⚠️  [DEPRECATED] Old /api/medical/upload-report endpoint called");
  console.log("🔄 Clients should use /api/medical-reports/upload instead\n");

  return res.status(410).json({
    success: false,
    message: "This endpoint is deprecated. Please use /api/medical-reports/upload",
    newEndpoint: "/api/medical-reports/upload",
    status: 410,
  });
});

// Protected routes - require authentication
router.use(auth);

// Test endpoint
router.get("/test", (req, res) => {
  res.json({ message: "Medical routes working", user: req.user });
});

// Dashboard summary endpoint
router.get("/dashboard-summary", async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("📊 Fetching dashboard summary for user:", userId);

    // Get latest medical history
    const historyQuery = `
      SELECT * FROM medical_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const historyResult = await pool.query(historyQuery, [userId]);

    // Get latest medical reports with extracted data
    const reportsQuery = `
      SELECT id, original_name, document_type, extracted_data, uploaded_at
      FROM medical_reports 
      WHERE user_id = $1 AND extracted_data IS NOT NULL
      ORDER BY uploaded_at DESC 
      LIMIT 3
    `;
    const reportsResult = await pool.query(reportsQuery, [userId]);

    // Extract key vitals and lab results from reports
    const latestVitals = [];
    const latestLabResults = [];
    const keyFindings = [];

    reportsResult.rows.forEach((report) => {
      try {
        const data = JSON.parse(report.extracted_data);

        if (data.vitals && Array.isArray(data.vitals)) {
          latestVitals.push(...data.vitals.slice(0, 3));
        }

        if (data.labResults && Array.isArray(data.labResults)) {
          latestLabResults.push(...data.labResults.slice(0, 5));
        }

        if (data.keyFindings && Array.isArray(data.keyFindings)) {
          keyFindings.push(...data.keyFindings.slice(0, 2));
        }
      } catch (e) {
        console.error("Error parsing report data:", e);
      }
    });

    res.json({
      success: true,
      summary: {
        medicalHistory: historyResult.rows[0] || null,
        latestVitals: latestVitals.slice(0, 5),
        latestLabResults: latestLabResults.slice(0, 8),
        keyFindings: keyFindings.slice(0, 3),
        reportsAnalyzed: reportsResult.rows.length,
        lastReportDate: reportsResult.rows[0]?.uploaded_at || null,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary",
    });
  }
});

// Medical History endpoints
router.get("/history", async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("📋 Fetching medical history for user:", userId);

    const { rows } = await pool.query(
      "SELECT * FROM medical_history WHERE user_id = $1",
      [userId]
    );

    console.log("📋 Medical history found:", rows);

    if (rows.length === 0) {
      return res.json({ success: true, history: null });
    }

    const history = rows[0];
    res.json({
      success: true,
      history: {
        patient: {
          dateOfBirth: history.date_of_birth,
          gender: history.gender,
          bloodType: history.blood_type,
          height: history.height_cm,
          weight: history.weight_kg,
        },
        allergies: history.allergies || [],
        medications: history.current_medications || [],
        conditions: history.chronic_conditions || [],
        emergencyContact: history.emergency_contact || {},
        familyHistory: history.family_history || {},
        smokingStatus: history.smoking_status,
        drinkingStatus: history.drinking_status,
        exerciseFrequency: history.exercise_frequency,
        additionalNotes: history.additional_notes,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching medical history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medical history",
      error: error.message,
    });
  }
});

router.post("/history", async (req, res) => {
  try {
    const userId = req.user.id;
    const { patient, allergies, medications, conditions, emergencyContact } =
      req.body;

    console.log("📝 Creating/updating medical history for user:", userId);
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    // Check if medical history already exists
    const { rows: existing } = await pool.query(
      "SELECT id FROM medical_history WHERE user_id = $1",
      [userId]
    );

    let result;
    if (existing.length > 0) {
      // Update existing record
      console.log("✏️ Updating existing medical history");
      const updateResult = await pool.query(
        `UPDATE medical_history 
         SET date_of_birth = $1, gender = $2, blood_type = $3, 
             height_cm = $4, weight_kg = $5, 
             chronic_conditions = $6, current_medications = $7, 
             allergies = $8, emergency_contact = $9,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $10
         RETURNING *`,
        [
          patient?.dateOfBirth,
          patient?.gender,
          patient?.bloodType,
          patient?.height ? parseInt(patient.height) : null,
          patient?.weight ? parseInt(patient.weight) : null,
          JSON.stringify(conditions || []),
          JSON.stringify(medications || []),
          JSON.stringify(allergies || []),
          JSON.stringify(emergencyContact || {}),
          userId,
        ]
      );
      result = updateResult.rows[0];
    } else {
      // Insert new record
      console.log("➕ Creating new medical history");
      const insertResult = await pool.query(
        `INSERT INTO medical_history 
         (user_id, date_of_birth, gender, blood_type, height_cm, weight_kg, 
          chronic_conditions, current_medications, allergies, emergency_contact)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          userId,
          patient?.dateOfBirth,
          patient?.gender,
          patient?.bloodType,
          patient?.height ? parseInt(patient.height) : null,
          patient?.weight ? parseInt(patient.weight) : null,
          JSON.stringify(conditions || []),
          JSON.stringify(medications || []),
          JSON.stringify(allergies || []),
          JSON.stringify(emergencyContact || {}),
        ]
      );
      result = insertResult.rows[0];
    }

    console.log("✅ Medical history saved successfully");

    res.status(201).json({
      success: true,
      message: "Medical history saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error saving medical history:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error saving medical history",
      error: error.message,
    });
  }
});

// Debug endpoint - get raw reports from database
router.get("/debug/reports", async (req, res) => {
  try {
    const userId = req.user.id;
    const reports = await medicalReportsDb.getByUserId(userId);
    res.json({
      userId,
      totalReports: reports.length,
      rawReports: reports,
      firstReportKeys: reports[0] ? Object.keys(reports[0]) : [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all medical reports for the authenticated user
router.get("/reports", async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("📋 Fetching reports for user:", userId);

    const reports = await medicalReportsDb.getByUserId(userId);
    console.log("📋 Raw reports from DB:", reports);
    console.log("📋 First report ID:", reports[0]?.id);

    const mappedReports = reports.map((report) => ({
      _id: report.id,
      fileName: report.original_name || report.file_name,
      filePath: report.file_path,
      fileSize: report.file_size,
      uploadDate: report.uploaded_at,
      documentType: report.document_type,
      analyzed: !!report.extracted_info,
    }));

    console.log("📋 Mapped reports:", mappedReports);
    console.log("📋 First mapped report _id:", mappedReports[0]?._id);

    res.json({
      success: true,
      reports: mappedReports,
    });
  } catch (error) {
    console.error("Error fetching medical reports:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medical reports",
    });
  }
});

// Delete a medical report
router.delete("/reports/:id", async (req, res) => {
  try {
    console.log("🗑️ DELETE request received");
    console.log("🗑️ Headers:", req.headers);
    console.log("🗑️ User from auth:", req.user);
    console.log("🗑️ Report ID:", req.params.id);

    if (!req.user || !req.user.id) {
      console.log("❌ No user in request");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user.id;
    const reportId = req.params.id;

    console.log("🗑️ Delete request received:", { userId, reportId });

    const deletedReport = await medicalReportsDb.delete(reportId, userId);

    console.log("🗑️ Delete result:", deletedReport);

    if (!deletedReport) {
      console.log("❌ Report not found or permission denied");
      return res.status(404).json({
        success: false,
        message: "Report not found or you don't have permission to delete it",
      });
    }

    // Delete the physical file
    const filePath = path.join(
      __dirname,
      "../../uploads",
      deletedReport.file_path
    );
    console.log("🗑️ Attempting to delete file:", filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("✅ Physical file deleted");
    } else {
      console.log("⚠️ Physical file not found:", filePath);
    }

    console.log("✅ Sending success response");
    return res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting medical report:", error);
    console.error("❌ Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Error deleting report",
      error: error.message,
    });
  }
});

/**
 * GET /api/medical/history/status
 * Check if user has completed medical history
 */
router.get("/history/status", auth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user has medical history
    const result = await pool.query(
      "SELECT id FROM medical_history WHERE user_id = $1",
      [userId]
    );

    const hasCompletedHistory = result.rows.length > 0;

    res.json({
      success: true,
      hasCompletedHistory,
      redirectTo: hasCompletedHistory ? null : "/medical-profile",
    });
  } catch (error) {
    console.error("Error getting medical history status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get medical history status",
    });
  }
});

export default router;
