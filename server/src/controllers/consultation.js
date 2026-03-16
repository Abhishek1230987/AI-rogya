import { MedicalHistory } from "../models/MedicalHistory.js";
import { audioProcessingService } from "../services/audioProcessing.js";
import { geminiService } from "../services/geminiService.js";
import pool from "../config/database.js";

async function getOrCreateDefaultSession(userId) {
  const existing = await pool.query(
    `
      SELECT id, session_name
      FROM text_chat_sessions
      WHERE user_id = $1
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `,
    [userId],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const created = await pool.query(
    `
      INSERT INTO text_chat_sessions (user_id, session_name)
      VALUES ($1, $2)
      RETURNING id, session_name
    `,
    [userId, "General Chat"],
  );

  return created.rows[0];
}

async function resolveSessionForUser(userId, requestedSessionId) {
  if (requestedSessionId) {
    const sessionResult = await pool.query(
      `
        SELECT id, session_name
        FROM text_chat_sessions
        WHERE id = $1 AND user_id = $2
        LIMIT 1
      `,
      [requestedSessionId, userId],
    );

    if (sessionResult.rows.length > 0) {
      return sessionResult.rows[0];
    }
  }

  return getOrCreateDefaultSession(userId);
}

/**
 * Build a fallback response when Gemini API fails
 * Provides helpful medical guidance without external AI
 */
function buildFallbackResponse(symptoms, medicalHistory, language = "en") {
  const lowerSymptoms = symptoms.toLowerCase();

  let response = "";

  // Check for specific symptoms and provide appropriate guidance
  if (lowerSymptoms.includes("fever")) {
    response =
      "I see you have a fever. High fever (>101°F/38.3°C) requires medical attention. " +
      "In the meantime, drink water, rest, and use paracetamol if safe for you. " +
      "Seek immediate care if accompanied by severe headache, chest pain, or difficulty breathing.";
  } else if (
    lowerSymptoms.includes("cough") ||
    lowerSymptoms.includes("cold")
  ) {
    response =
      "For cough/cold: Rest, stay hydrated, use honey and warm fluids. " +
      "Seek care if cough persists >2 weeks or is severe. " +
      "If you have breathing difficulty, seek emergency care.";
  } else if (lowerSymptoms.includes("headache")) {
    response =
      "For headache: Rest in a quiet, dark room, drink water, avoid screens. " +
      "Use paracetamol if appropriate. Seek care if severe, accompanied by fever, or unusual.";
  } else if (
    lowerSymptoms.includes("stomach") ||
    lowerSymptoms.includes("nausea") ||
    lowerSymptoms.includes("vomit")
  ) {
    response =
      "For stomach issues: Rest, avoid solid food, drink clear fluids slowly. " +
      "Seek care if vomiting continues >4 hours, has blood, or with severe pain.";
  } else if (lowerSymptoms.includes("chest")) {
    response =
      "⚠️ SEEK EMERGENCY CARE if chest pain is severe or sudden! " +
      "If mild: Rest and monitor. If accompanied by shortness of breath, pain radiating to arm/jaw, " +
      "or sweating, call emergency services immediately.";
  } else {
    response =
      "Thank you for sharing your symptoms. " +
      "Rest and monitor your condition. " +
      "Seek medical attention if symptoms worsen, persist, or are accompanied by fever, " +
      "severe pain, or difficulty breathing.";
  }

  // Add personalized notes if medical history exists
  if (medicalHistory) {
    if (medicalHistory.allergies && medicalHistory.allergies.length > 0) {
      const allergies = Array.isArray(medicalHistory.allergies)
        ? medicalHistory.allergies.join(", ")
        : medicalHistory.allergies;
      response += ` Remember: You're allergic to ${allergies} - avoid these in any treatment.`;
    }

    if (
      medicalHistory.chronicConditions &&
      medicalHistory.chronicConditions.length > 0
    ) {
      const conditions = Array.isArray(medicalHistory.chronicConditions)
        ? medicalHistory.chronicConditions.join(", ")
        : medicalHistory.chronicConditions;
      response += ` Given your ${conditions}, ensure your condition management isn't affected.`;
    }
  }

  response +=
    " This is general guidance - consult a doctor for accurate diagnosis.";

  return response;
}

// Get medical history for a user
export const getMedicalHistory = async (req, res) => {
  try {
    const medicalHistory = await MedicalHistory.findByUserId(req.user.id);
    res.json(medicalHistory.map((record) => record.toJSON()));
  } catch (error) {
    console.error("Error fetching medical history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create new medical history entry
export const createMedicalHistory = async (req, res) => {
  try {
    const { symptoms, diagnosis, prescription, doctorNotes, languageUsed } =
      req.body;

    const medicalHistory = await MedicalHistory.create({
      userId: req.user.id,
      symptoms,
      diagnosis,
      prescription,
      doctorNotes,
      languageUsed,
    });

    res.status(201).json(medicalHistory.toJSON());
  } catch (error) {
    console.error("Error creating medical history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Process audio consultation
export const processAudioConsultation = async (req, res) => {
  try {
    // Get audio file from request
    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    // Read optional language parameter from the multipart form
    const requestedLanguage = (req.body && req.body.language) || "auto";

    // Process audio using our service, pass requested language
    const { transcript, detectedLanguage, englishTranslation } =
      await audioProcessingService.processAudio(
        audioFile.buffer,
        audioFile.mimetype,
        requestedLanguage,
      );

    // Save medical history with the processed information
    const medicalHistory = await MedicalHistory.create({
      userId: req.user.id,
      symptoms: transcript,
      diagnosis: "Pending analysis", // This would be generated by AI
      prescription: "To be determined by doctor",
      doctorNotes: englishTranslation,
      languageUsed: detectedLanguage,
      transcription: transcript,
    });

    // Return processed data
    res.json({
      transcript,
      detectedLanguage,
      englishTranslation,
      medicalHistoryId: medicalHistory.id,
    });
  } catch (error) {
    console.error("Error processing audio consultation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getTextChatSessions = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    await getOrCreateDefaultSession(userId);

    const sessionsResult = await pool.query(
      `
        SELECT
          s.id,
          s.session_name,
          s.created_at,
          s.updated_at,
          COUNT(tc.id)::int AS message_count,
          MAX(tc.created_at) AS last_message_at
        FROM text_chat_sessions s
        LEFT JOIN text_consultations tc ON tc.session_id = s.id
        WHERE s.user_id = $1
        GROUP BY s.id, s.session_name, s.created_at, s.updated_at
        ORDER BY COALESCE(MAX(tc.created_at), s.created_at) DESC, s.id DESC
      `,
      [userId],
    );

    res.json({
      success: true,
      sessions: sessionsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching text chat sessions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat sessions",
    });
  }
};

export const createTextChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const requestedName = (req.body?.sessionName || "").trim();
    const sessionName =
      requestedName || `Chat ${new Date().toLocaleDateString()}`;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const sessionResult = await pool.query(
      `
        INSERT INTO text_chat_sessions (user_id, session_name)
        VALUES ($1, $2)
        RETURNING id, session_name, created_at, updated_at
      `,
      [userId, sessionName],
    );

    res.status(201).json({
      success: true,
      session: sessionResult.rows[0],
    });
  } catch (error) {
    console.error("Error creating text chat session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create chat session",
    });
  }
};

export const renameTextChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = Number.parseInt(req.params.sessionId, 10);
    const sessionName = (req.body?.sessionName || "").trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session id",
      });
    }

    if (!sessionName) {
      return res.status(400).json({
        success: false,
        message: "Session name is required",
      });
    }

    const updateResult = await pool.query(
      `
        UPDATE text_chat_sessions
        SET session_name = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
        RETURNING id, session_name, created_at, updated_at
      `,
      [sessionName, sessionId, userId],
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    res.json({
      success: true,
      session: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Error renaming text chat session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to rename chat session",
    });
  }
};

// Get text consultation history for the authenticated user
export const getTextConsultationHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const parsedOffset = Number.parseInt(req.query.offset, 10);
    const requestedSessionId = Number.parseInt(req.query.sessionId, 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 20;
    const offset = Number.isFinite(parsedOffset)
      ? Math.max(parsedOffset, 0)
      : 0;
    const activeSession = await resolveSessionForUser(
      userId,
      Number.isFinite(requestedSessionId) ? requestedSessionId : null,
    );

    const historyQuery = `
      SELECT id, user_message, ai_response, language_used, created_at
      FROM text_consultations
      WHERE user_id = $1 AND session_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const [historyResult, totalResult] = await Promise.all([
      pool.query(historyQuery, [userId, activeSession.id, limit, offset]),
      pool.query(
        "SELECT COUNT(*)::int AS total FROM text_consultations WHERE user_id = $1 AND session_id = $2",
        [userId, activeSession.id],
      ),
    ]);

    const rows = [...historyResult.rows].reverse();
    const messages = rows.flatMap((row) => [
      {
        id: `u-${row.id}`,
        type: "user",
        content: row.user_message,
        timestamp: row.created_at,
      },
      {
        id: `a-${row.id}`,
        type: "ai",
        content: row.ai_response,
        timestamp: row.created_at,
      },
    ]);

    const total = totalResult.rows[0]?.total || 0;
    const loaded = offset + historyResult.rows.length;

    res.json({
      success: true,
      session: activeSession,
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: loaded < total,
      },
    });
  } catch (error) {
    console.error("Error fetching text consultation history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch consultation history",
    });
  }
};

// Clear text consultation history for the authenticated user
export const clearTextConsultationHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const requestedSessionId = Number.parseInt(req.query.sessionId, 10);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (Number.isFinite(requestedSessionId)) {
      const sessionCheck = await pool.query(
        "SELECT id FROM text_chat_sessions WHERE id = $1 AND user_id = $2 LIMIT 1",
        [requestedSessionId, userId],
      );

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Chat session not found",
        });
      }

      await pool.query(
        "DELETE FROM text_consultations WHERE user_id = $1 AND session_id = $2",
        [userId, requestedSessionId],
      );
    } else {
      await pool.query("DELETE FROM text_consultations WHERE user_id = $1", [
        userId,
      ]);
    }

    res.json({
      success: true,
      message: "Consultation history cleared",
    });
  } catch (error) {
    console.error("Error clearing text consultation history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear consultation history",
    });
  }
};

export const deleteTextChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = Number.parseInt(req.params.sessionId, 10);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session id",
      });
    }

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM text_chat_sessions WHERE user_id = $1",
      [userId],
    );

    if ((countResult.rows[0]?.count || 0) <= 1) {
      return res.status(400).json({
        success: false,
        message: "At least one chat session must remain",
      });
    }

    const deleteResult = await pool.query(
      "DELETE FROM text_chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id",
      [sessionId, userId],
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    res.json({
      success: true,
      message: "Chat session deleted",
    });
  } catch (error) {
    console.error("Error deleting text chat session:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete chat session",
    });
  }
};

// Chat consultation with AI
export const chatConsultation = async (req, res) => {
  try {
    // User ID is optional - chat can work for both authenticated and guest users
    const userId = req.user?.id || null;
    console.log("💬 Chat consultation request from user:", userId || "guest");

    const { message, language, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // Extract language preference (default to "auto" for auto-detection)
    const requestedLanguage = language || "auto";
    console.log(`🔤 Requested language for chat: ${requestedLanguage}`);

    let activeSession = null;
    if (userId) {
      const parsedSessionId = Number.parseInt(sessionId, 10);
      activeSession = await resolveSessionForUser(
        userId,
        Number.isFinite(parsedSessionId) ? parsedSessionId : null,
      );
    }

    // Fetch user's medical history for context (only if user is authenticated)
    let medicalHistory = null;
    try {
      if (userId) {
        // Query medical history - use COALESCE for ordering to handle missing columns
        const historyQuery = `
          SELECT * FROM medical_history 
          WHERE user_id = $1 
          LIMIT 1
        `;
        const historyResult = await pool.query(historyQuery, [userId]);

        if (historyResult.rows.length > 0) {
          const record = historyResult.rows[0];

          // Helper function to parse JSONB fields that might be strings or already parsed
          const parseJsonField = (field, defaultValue = []) => {
            if (!field) return defaultValue;
            if (Array.isArray(field)) return field;
            if (typeof field === "string") {
              try {
                const parsed = JSON.parse(field);
                return Array.isArray(parsed) ? parsed : defaultValue;
              } catch {
                return defaultValue;
              }
            }
            if (typeof field === "object") return Object.values(field);
            return defaultValue;
          };

          medicalHistory = {
            allergies: parseJsonField(record.allergies, []),
            chronicConditions: parseJsonField(record.chronic_conditions, []),
            currentMedications: parseJsonField(record.current_medications, []),
            familyHistory: parseJsonField(record.family_history, []),
            pastSurgeries: parseJsonField(record.past_surgeries, []),
            bloodType: record.blood_type || null,
            gender: record.gender || null,
            dateOfBirth: record.date_of_birth || null,
            height: record.height_cm || null,
            weight: record.weight_kg || null,
          };

          // Log what medical history data was found for debugging
          const hasAllergies = medicalHistory.allergies.length > 0;
          const hasConditions = medicalHistory.chronicConditions.length > 0;
          const hasMedications = medicalHistory.currentMedications.length > 0;

          console.log("📋 Medical history found for context:");
          console.log(
            `   - Allergies: ${hasAllergies ? medicalHistory.allergies.join(", ") : "None"}`,
          );
          console.log(
            `   - Chronic conditions: ${hasConditions ? medicalHistory.chronicConditions.join(", ") : "None"}`,
          );
          console.log(
            `   - Current medications: ${hasMedications ? medicalHistory.currentMedications.join(", ") : "None"}`,
          );
          console.log(
            `   - Blood type: ${medicalHistory.bloodType || "Not specified"}`,
          );
          console.log(
            `   - Gender: ${medicalHistory.gender || "Not specified"}`,
          );

          if (
            !hasAllergies &&
            !hasConditions &&
            !hasMedications &&
            !medicalHistory.bloodType
          ) {
            console.log(
              "⚠️ Medical history record exists but has no relevant data filled in",
            );
          }
        } else {
          console.log("⚠️ No medical history found for user:", userId);
        }
      } else {
        console.log("ℹ️ Guest consultation - no medical history available");
      }
    } catch (historyError) {
      console.error("❌ Error fetching medical history:", historyError.message);
      console.error("   Full error:", historyError);
      // Continue without medical history
    }

    // Fetch user's medical reports for additional context (only if user is authenticated)
    let medicalReports = [];
    try {
      if (userId) {
        console.log(`📥 Fetching medical reports for user ${userId}...`);
        const reportsQuery = `
          SELECT id, original_name, document_type, extracted_data, uploaded_at
          FROM medical_reports 
          WHERE user_id = $1 
          ORDER BY uploaded_at DESC 
          LIMIT 10
        `;
        const reportsResult = await pool.query(reportsQuery, [userId]);
        console.log(
          `   📄 Found ${reportsResult.rows.length} total reports in database`,
        );

        if (reportsResult.rows.length > 0) {
          medicalReports = reportsResult.rows
            .map((report) => {
              let extractedData = null;
              if (report.extracted_data) {
                // Handle both string and object types
                if (typeof report.extracted_data === "string") {
                  try {
                    extractedData = JSON.parse(report.extracted_data);
                  } catch (e) {
                    console.log(
                      `⚠️ Failed to parse extracted_data for report ${report.id}`,
                    );
                  }
                } else if (typeof report.extracted_data === "object") {
                  extractedData = report.extracted_data;
                }
              }
              return {
                fileName: report.original_name,
                documentType: report.document_type,
                uploadDate: report.uploaded_at,
                extractedData,
              };
            })
            .filter((r) => r.extractedData); // Only include reports with extracted data

          console.log(
            `   ✅ Using ${medicalReports.length} medical reports with extracted data for context`,
          );
          if (medicalReports.length === 0 && reportsResult.rows.length > 0) {
            console.log(
              `   ⚠️ WARNING: Found ${reportsResult.rows.length} reports but none have extracted data!`,
            );
          }
        }
      } else {
        console.log("ℹ️ Guest consultation - no medical reports available");
      }
    } catch (reportsError) {
      console.error("❌ Error fetching medical reports:", reportsError.message);
      // Continue without medical reports
    }

    // Fetch user's past consultation history for continuity (only if user is authenticated)
    // Note: This queries the voice_consultations table for past conversations
    let consultationHistory = [];
    try {
      if (userId) {
        // Try to get past voice consultations for context
        const consultHistoryQuery = `
          SELECT original_message, medical_response, detected_language, timestamp
          FROM voice_consultations 
          WHERE user_id = $1 
          ORDER BY timestamp DESC 
          LIMIT 10
        `;
        const historyResult = await pool.query(consultHistoryQuery, [userId]);

        if (historyResult.rows.length > 0) {
          consultationHistory = historyResult.rows.map((row) => ({
            symptoms: row.original_message,
            diagnosis: row.medical_response
              ? row.medical_response.substring(0, 200)
              : null,
            prescription: null,
            doctorNotes: null,
            date: row.timestamp,
          }));
          console.log(
            `📝 Found ${consultationHistory.length} past consultations for context`,
          );
        }
      }
    } catch (historyError) {
      // Consultation history is optional - silently continue if table doesn't exist
      console.log("ℹ️ No past consultation history available");
    }

    // Generate AI response using Gemini with full patient context
    // Log summary of context being used
    console.log("🔍 Context Summary for AI:");
    console.log(
      `   - Medical history: ${medicalHistory ? "Available" : "Not available"}`,
    );
    if (medicalHistory) {
      const contextItems = [];
      if (medicalHistory.allergies?.length > 0)
        contextItems.push(`${medicalHistory.allergies.length} allergies`);
      if (medicalHistory.chronicConditions?.length > 0)
        contextItems.push(
          `${medicalHistory.chronicConditions.length} conditions`,
        );
      if (medicalHistory.currentMedications?.length > 0)
        contextItems.push(
          `${medicalHistory.currentMedications.length} medications`,
        );
      if (medicalHistory.bloodType)
        contextItems.push(`blood type: ${medicalHistory.bloodType}`);
      if (medicalHistory.gender)
        contextItems.push(`gender: ${medicalHistory.gender}`);
      console.log(
        `   - Details: ${contextItems.length > 0 ? contextItems.join(", ") : "No specific data"}`,
      );
    }
    console.log(
      `   - Medical reports: ${medicalReports.length} reports with extracted data`,
    );
    console.log(
      `   - Past consultations: ${consultationHistory.length} prior conversations`,
    );
    console.log("🤖 Generating personalized AI response with Gemini...");
    let aiResult;

    try {
      aiResult = await geminiService.generateMedicalConsultation(
        message,
        {
          medicalHistory,
          medicalReports,
          consultationHistory, // Add past consultations for continuity
        },
        requestedLanguage,
      );
      console.log(" AI response generated successfully");
    } catch (geminiError) {
      console.error(
        "⚠️ Gemini API failed, using fallback response:",
        geminiError.message,
      );
      console.error("   Full error details:", {
        message: geminiError.message,
        status: geminiError.status,
        code: geminiError.code,
        stack: geminiError.stack?.split("\n").slice(0, 3).join("\n"),
      });

      // Provide a helpful fallback response
      const fallbackResponse = buildFallbackResponse(
        message,
        medicalHistory,
        requestedLanguage,
      );

      // Enhance fallback with medical report insights if available
      let enhancedResponse = fallbackResponse;
      if (medicalReports.length > 0) {
        enhancedResponse += "\n\nBased on your medical reports:";
        medicalReports.forEach((report) => {
          enhancedResponse += `\n- ${report.fileName}: `;
          if (report.extractedData) {
            const data = report.extractedData;
            if (data.vitals?.length > 0) {
              enhancedResponse += `Vitals: ${data.vitals.slice(0, 2).join(", ")}. `;
            }
            if (data.diagnosis) {
              enhancedResponse += `Diagnosis: ${data.diagnosis}. `;
            }
          }
        });
      }

      aiResult = {
        medicalResponse: enhancedResponse,
        detectedLanguage: requestedLanguage || "en",
        sections: null, // Fallback doesn't generate sections
        usedMedicalHistory: !!medicalHistory,
        source: "Fallback (Gemini unavailable)",
        timestamp: new Date().toISOString(),
      };

      console.log(" Fallback response generated successfully");
    }

    if (userId) {
      try {
        await pool.query(
          `
            INSERT INTO text_consultations (session_id, user_id, user_message, ai_response, language_used)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            activeSession?.id || null,
            userId,
            message.trim(),
            aiResult.medicalResponse || "",
            aiResult.detectedLanguage || requestedLanguage || "en",
          ],
        );
      } catch (saveError) {
        console.error("⚠️ Failed to store text consultation:", saveError);
      }
    }

    res.json({
      success: true,
      response: aiResult.medicalResponse,
      sections: aiResult.sections || null,
      sessionId: activeSession?.id || null,
      detectedLanguage: aiResult.detectedLanguage,
      usedMedicalHistory: aiResult.usedMedicalHistory,
      timestamp: aiResult.timestamp,
    });
  } catch (error) {
    console.error(" Error in chat consultation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate consultation response",
      error: error.message,
    });
  }
};
