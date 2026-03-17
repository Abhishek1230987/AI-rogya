import CloudVoiceService from "../services/cloudVoiceService.js";
import VoiceConsultationModel from "../models/VoiceConsultation.js";
import { geminiService } from "../services/geminiService.js";
import { audioProcessingService } from "../services/audioProcessing.js";
import pool from "../config/database.js";
import fs from "fs";

const cloudVoiceService = new CloudVoiceService();

// Initialize speech client (will work with service account or default credentials)
let speechClient = null;
try {
  speechClient = new SpeechClient();
} catch (error) {
  console.log("⚠️ Google Speech-to-Text not configured, using fallback method");
}

/**
 * Transcribe audio file to text
 * @param {string} audioFilePath - Path to the audio file
 * @param {string} language - Language code (auto for auto-detection)
 * @returns {Object} Transcription result with original message, English translation, and detected language
 */
export const transcribeAudio = async (audioFilePath, language = "auto") => {
  try {
    // Validate audio file exists and has sufficient size
    const MIN_AUDIO_SIZE = 1000; // 1KB minimum

    if (!fs.existsSync(audioFilePath)) {
      throw new Error("Audio file not found");
    }

    const stats = fs.statSync(audioFilePath);
    if (stats.size < MIN_AUDIO_SIZE) {
      console.log(
        `❌ Audio file too small (${stats.size} bytes) - likely silent or no voice detected`,
      );
      throw new Error("VOICE_NOT_DETECTED");
    }

    // Method 1: Google Speech-to-Text (Primary)
    if (speechClient) {
      return await transcribeWithGoogle(audioFilePath, language);
    }

    // Method 2: Mock transcription (Development)
    console.log("⚠️ Using mock transcription for development");

    // Simulate different languages for testing
    // Deterministic mock for development: default to English
    return {
      originalMessage:
        "I have been experiencing headache and fever for the past 3 days. The headache is severe and I feel tired.",
      transcription:
        "I have been experiencing headache and fever for the past 3 days. The headache is severe and I feel tired.",
      detectedLanguage: "en",
      confidence: 0.97,
    };
  } catch (error) {
    console.error("❌ Transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
};

/**
 * Transcribe using Google Speech-to-Text
 */
const transcribeWithGoogle = async (audioFilePath, language) => {
  try {
    const audioBytes = fs.readFileSync(audioFilePath).toString("base64");

    const audio = {
      content: audioBytes,
    };

    const config = {
      encoding: "WEBM_OPUS",
      sampleRateHertz: 48000,
      languageCode: language === "auto" ? "en-US" : language,
      alternativeLanguageCodes: [
        "es-ES",
        "fr-FR",
        "de-DE",
        "it-IT",
        "pt-BR",
        "hi-IN",
      ],
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: false,
      model: "medical_conversation", // Use medical model if available
    };

    const request = {
      audio: audio,
      config: config,
    };

    console.log("🔄 Sending to Google Speech-to-Text...");
    const [response] = await speechClient.recognize(request);

    if (response.results && response.results.length > 0) {
      const transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join(" ");

      const detectedLanguage =
        response.results[0]?.languageCode?.substring(0, 2) || "en";

      console.log("✅ Google transcription successful");

      // If the detected language is not English, we'll need translation
      if (detectedLanguage !== "en") {
        // For now, return the same text as both original and translated
        // In production, you'd use Google Translate API here
        return {
          originalMessage: transcription,
          transcription: transcription, // Would be translated to English
          detectedLanguage: detectedLanguage,
          confidence: response.results[0]?.alternatives[0]?.confidence || 0.9,
        };
      } else {
        return {
          originalMessage: transcription,
          transcription: transcription,
          detectedLanguage: "en",
          confidence: response.results[0]?.alternatives[0]?.confidence || 0.9,
        };
      }
    } else {
      throw new Error("No transcription results from Google Speech-to-Text");
    }
  } catch (error) {
    console.error("❌ Google Speech-to-Text error:", error);
    throw error;
  }
};

/**
 * Generate medical response using AI (Gemini) or mock response
 * @param {string} transcription - The transcribed medical query
 * @param {Object} userContext - Optional patient context (medicalHistory, medicalReports)
 * @param {string} language - Optional language code
 * @returns {string} AI-generated medical response
 */
export const generateMedicalResponse = async (
  transcription,
  userContext = {},
  language = "en",
) => {
  try {
    // Method 1: Google Gemini AI (Primary)
    if (geminiService.isAvailable()) {
      return await generateWithGemini(transcription, userContext, language);
    }

    // Method 2: Mock response (Development)
    console.log("⚠️ Using mock medical response for development");
    return generateMockMedicalResponse(transcription);
  } catch (error) {
    console.error("❌ Medical response generation error:", error);
    throw new Error("Failed to generate medical response");
  }
};

/**
 * Generate medical response using Google Gemini AI
 */
const generateWithGemini = async (
  transcription,
  userContext = {},
  language = "en",
) => {
  try {
    console.log("🤖 Generating response with Google Gemini AI...");
    if (userContext.medicalHistory) {
      console.log("📋 Using patient medical history for personalized response");
    }

    const result = await geminiService.generateMedicalConsultation(
      transcription,
      userContext,
      language,
    );
    console.log("✅ Gemini AI medical response generated");
    return result.medicalResponse;
  } catch (error) {
    console.error("❌ Gemini medical response error:", error);
    throw error;
  }
};

/**
 * Generate mock medical response for development
 */
const generateMockMedicalResponse = (transcription) => {
  // Development mock: always return a clear English medical response
  return `Based on your symptoms of headache and fever, this could indicate a viral infection or flu. Here are some general recommendations:

🌡️ **Immediate care:**
- Rest and stay hydrated
- Take acetaminophen or ibuprofen for fever
- Apply cold compress for headache

⚠️ **Seek medical attention if:**
- Fever exceeds 103°F (39.4°C)
- Severe headache with neck stiffness
- Symptoms worsen after 3-4 days

💡 **General advice:**
- Monitor your temperature regularly
- Get plenty of sleep
- Avoid close contact with others

**Disclaimer:** This is general information only. Please consult a healthcare professional for proper diagnosis and treatment.`;
};

/**
 * Save audio to cloud storage (AWS S3 or Google Cloud Storage)
 * @param {string} audioFilePath - Local path to audio file
 * @param {string} fileName - Desired filename in cloud storage
 * @returns {string} Cloud storage URL
 */
export const saveToCloudStorage = async (audioFilePath, fileName) => {
  try {
    // TODO: Implement cloud storage upload
    // This is a placeholder for future implementation
    console.log("📁 Cloud storage not yet implemented");
    return `/uploads/audio/${fileName}`;
  } catch (error) {
    console.error("❌ Cloud storage error:", error);
    throw error;
  }
};

/**
 * Handle text-based consultation (from speech recognition or typed input)
 * Used by voice consultation page when browser speech recognition is available
 */
export const textConsultation = async (req, res) => {
  try {
    console.log(
      "💬 Text consultation request from user:",
      req.user?.id || "anonymous",
    );

    const { message } = req.body;

    // If client provided explicit language field use it; otherwise detect from text/script
    const requestedLangFromClient = req.body?.language;
    console.log(
      "🔍 DEBUG - Received language from client:",
      requestedLangFromClient,
    );

    // Helper: detect language by script ranges (basic script detection)
    function detectLanguageFromText(text) {
      if (!text || typeof text !== "string") return "en";
      // Devanagari (Hindi, Marathi, Nepali)
      if (/[\u0900-\u097F]/.test(text)) return "hi";
      // Bengali
      if (/[\u0980-\u09FF]/.test(text)) return "bn";
      // Gurmukhi (Punjabi) - optional mapping
      if (/[\u0A00-\u0A7F]/.test(text)) return "pa";
      // Gujarati
      if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
      // Oriya
      if (/[\u0B00-\u0B7F]/.test(text)) return "or";
      // Tamil
      if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
      // Telugu
      if (/[\u0C00-\u0C7F]/.test(text)) return "te";
      // Kannada
      if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
      // Malayalam
      if (/[\u0D00-\u0D7F]/.test(text)) return "ml";
      // If only Latin script, default to English (Gemini prompt will handle Hinglish if needed)
      return "en";
    }

    let language =
      requestedLangFromClient || detectLanguageFromText(message) || "en";

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    console.log(
      `📝 Processing text consultation: "${message.substring(0, 50)}..."`,
    );
    console.log(`🔤 Final language being used: ${language}`);
    console.log(
      `🔤 Is Maithili? ${
        language === "mai" ? "✅ YES" : "❌ NO (value: " + language + ")"
      }`,
    );

    // Fetch user's medical history for context
    let medicalHistory = null;
    if (req.user?.id) {
      try {
        const pool = (await import("../config/database.js")).default;
        const historyQuery = `
          SELECT * FROM medical_history 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        const historyResult = await pool.query(historyQuery, [req.user.id]);

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
          };
          console.log("📋 Using patient's medical history for context");
        }
      } catch (historyError) {
        console.error("Error fetching medical history:", historyError);
        // Continue without medical history
      }
    }

    // Fetch user's medical reports for additional context
    let medicalReports = [];
    if (req.user?.id) {
      try {
        const pool = (await import("../config/database.js")).default;
        const reportsQuery = `
          SELECT id, original_name, document_type, extracted_data, uploaded_at
          FROM medical_reports 
          WHERE user_id = $1 
          ORDER BY uploaded_at DESC 
          LIMIT 10
        `;
        const reportsResult = await pool.query(reportsQuery, [req.user.id]);

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

          if (medicalReports.length > 0) {
            console.log(
              `📄 Using ${medicalReports.length} medical reports for context`,
            );
          }
        }
      } catch (reportsError) {
        console.error("Error fetching medical reports:", reportsError);
        // Continue without medical reports
      }
    }

    // Fetch user's past voice consultations for continuity
    let consultationHistory = [];
    if (req.user?.id) {
      try {
        const pool = (await import("../config/database.js")).default;
        const historyQuery = `
          SELECT original_message, medical_response, timestamp, detected_language
          FROM voice_consultations 
          WHERE user_id = $1 
          ORDER BY timestamp DESC 
          LIMIT 10
        `;
        const historyResult = await pool.query(historyQuery, [req.user.id]);

        if (historyResult.rows.length > 0) {
          consultationHistory = historyResult.rows.map((consultation) => ({
            userMessage: consultation.original_message,
            medicalResponse: consultation.medical_response,
            timestamp: consultation.timestamp,
            language: consultation.detected_language,
          }));
          console.log(
            `📚 Using ${consultationHistory.length} past voice consultations for context`,
          );
        }
      } catch (historyError) {
        console.error("Error fetching consultation history:", historyError);
        // Continue without consultation history
      }
    }

    // Generate AI response using Gemini
    console.log("🤖 Generating AI response with Gemini...");
    const aiResult = await geminiService.generateMedicalConsultation(
      message,
      {
        medicalHistory,
        medicalReports,
        consultationHistory,
      },
      language, // requestedLanguage forwarded to Gemini
    );

    console.log("✅ AI response generated successfully");

    // Save to voice consultation history if user is authenticated
    if (req.user?.id) {
      try {
        console.log(
          "💾 Saving consultation to database for user:",
          req.user.id,
        );

        const savedConsultation = await VoiceConsultationModel.create({
          userId: req.user.id,
          originalText: message,
          translatedText: message,
          detectedLanguage: language,
          aiResponse: aiResult.medicalResponse,
        });

        console.log(
          "✅ Consultation saved to history with ID:",
          savedConsultation.id,
        );
      } catch (saveError) {
        console.error("❌ Error saving consultation:", saveError);
        console.error("Stack trace:", saveError.stack);
        // Don't fail the request if saving fails
      }
    } else {
      console.log("⚠️ No authenticated user, skipping database save");
    }

    res.json({
      success: true,
      medicalResponse: aiResult.medicalResponse,
      sections: aiResult.sections || null,
      detectedLanguage: language || aiResult.detectedLanguage,
      usedMedicalHistory: aiResult.usedMedicalHistory,
      timestamp: aiResult.timestamp,
    });
  } catch (error) {
    console.error("❌ Error in text consultation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process consultation",
      error: error.message,
    });
  }
};

// Get consultation history
export const getConsultationHistory = async (req, res) => {
  try {
    console.log("📥 getConsultationHistory called for user:", req.user.id);

    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    console.log(
      `📊 Fetching consultations: page=${page}, limit=${limit}, offset=${offset}`,
    );

    // Get consultations from database
    const consultations = await VoiceConsultationModel.getByUserId(
      userId,
      parseInt(limit),
      offset,
    );

    console.log(`✅ Found ${consultations.length} consultations from database`);

    // Get total count for pagination
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM voice_consultations WHERE user_id = $1",
      [userId],
    );
    const total = parseInt(countResult.rows[0].count);

    console.log(`📊 Total consultations for user ${userId}: ${total}`);

    // Transform the data to match frontend expectations
    const transformedConsultations = consultations.map((consultation) => ({
      id: consultation.id,
      timestamp: consultation.created_at,
      originalMessage: consultation.original_text,
      transcription: consultation.translated_text || consultation.original_text,
      response: consultation.ai_response,
      detectedLanguage: consultation.detected_language || "en",
      audioUrl: consultation.audio_cloud_url,
    }));

    console.log("✅ Sending response with transformed consultations");

    res.json({
      success: true,
      consultations: transformedConsultations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching consultation history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch consultation history",
      error: error.message,
    });
  }
};

// Search consultations
export const searchConsultations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;

    // TODO: Implement database search
    res.json({
      success: true,
      results: [],
    });
  } catch (error) {
    console.error("❌ Error searching consultations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search consultations",
    });
  }
};

// Get consultation by ID
export const getConsultationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // TODO: Implement database query to get specific consultation
    res.json({
      success: true,
      consultation: null,
    });
  } catch (error) {
    console.error("❌ Error fetching consultation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch consultation",
    });
  }
};

// Delete a single consultation by ID (must belong to authenticated user)
export const deleteConsultation = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const deleted = await VoiceConsultationModel.deleteById(id, userId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("❌ Error deleting consultation:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete" });
  }
};

// Delete all consultations for the authenticated user
export const clearConsultations = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const deletedRows = await VoiceConsultationModel.deleteAllByUserId(userId);
    return res.json({ success: true, deletedCount: deletedRows.length });
  } catch (error) {
    console.error("❌ Error clearing consultations:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to clear consultations" });
  }
};

/**
 * Route handler: receive multipart audio upload, optional language, transcribe and generate AI response
 */
export const transcribeUploadHandler = async (req, res) => {
  try {
    console.log("📤 Received audio upload for transcription");

    const audioFile = req.file;
    if (!audioFile) {
      return res
        .status(400)
        .json({ success: false, message: "No audio file uploaded" });
    }

    const requestedLanguage = (req.body && req.body.language) || "auto";

    console.log(`🔤 Received requested language: ${requestedLanguage}`);

    // Process audio buffer with optional language hint
    const {
      transcript,
      detectedLanguage,
      englishTranslation,
      isFallback: audioProcessingFallback,
    } = await audioProcessingService.processAudio(
      audioFile.buffer,
      audioFile.mimetype,
      requestedLanguage,
    );

    // Declare isFallback flag for this handler
    let isFallback = false;
    let aiResult;

    // Fetch user's medical history for contextual responses
    let medicalHistory = null;
    let medicalReports = [];

    if (req.user?.id) {
      // Fetch medical history
      try {
        const historyQuery = `
          SELECT * FROM medical_history 
          WHERE user_id = $1 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        const historyResult = await pool.query(historyQuery, [req.user.id]);

        if (historyResult.rows.length > 0) {
          const record = historyResult.rows[0];

          // Helper function to parse JSONB fields
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
          console.log(
            "📋 Using patient's medical history for voice consultation context",
          );

          // Log what context is being used
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
            `   - Context: ${contextItems.length > 0 ? contextItems.join(", ") : "No specific data"}`,
          );
        } else {
          console.log("⚠️ No medical history found for user:", req.user.id);
        }
      } catch (historyError) {
        console.error("Error fetching medical history:", historyError.message);
        // Continue without medical history
      }

      // Fetch medical reports for additional context
      try {
        const reportsQuery = `
          SELECT id, original_name, document_type, extracted_data, uploaded_at
          FROM medical_reports 
          WHERE user_id = $1 
          ORDER BY uploaded_at DESC 
          LIMIT 5
        `;
        const reportsResult = await pool.query(reportsQuery, [req.user.id]);

        if (reportsResult.rows.length > 0) {
          medicalReports = reportsResult.rows
            .map((report) => {
              let extractedData = null;
              if (report.extracted_data) {
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
            .filter((r) => r.extractedData);

          if (medicalReports.length > 0) {
            console.log(
              `📄 Using ${medicalReports.length} medical reports for voice consultation context`,
            );
          }
        }
      } catch (reportsError) {
        console.error("Error fetching medical reports:", reportsError.message);
        // Continue without medical reports
      }
    } else {
      console.log(
        "ℹ️ No authenticated user for voice upload - responses will be generic",
      );
    }

    // Check if audio processing returned a fallback (Google Cloud not configured)
    if (audioProcessingFallback && !transcript) {
      console.log(
        "ℹ️ Audio processing fallback triggered - Google Cloud APIs not configured for server-side transcription",
      );
      isFallback = true;

      // When server-side transcription isn't available, instead of confusing server message,
      // return a marker so client can handle this gracefully
      aiResult = {
        medicalResponse: null, // Signal to client that this was a fallback
        sections: null,
        usedMedicalHistory: false,
        transcript, // Include what we got (even if null/empty)
      };
    } else if (!transcript) {
      console.warn("⚠️ No transcription available from audio processing");
      isFallback = true;

      aiResult = {
        medicalResponse:
          "We received your audio, but couldn't transcribe it at this moment. Please try using the text input option to describe your symptoms instead, and we'll provide you with a detailed analysis.",
        sections: null,
        usedMedicalHistory: false,
      };
    } else {
      // We have a transcription - process with Gemini
      const actualTranscript = englishTranslation || transcript;

      try {
        aiResult = await geminiService.generateMedicalConsultation(
          actualTranscript,
          {
            medicalHistory,
            medicalReports,
          },
          requestedLanguage === "auto"
            ? detectedLanguage || "en"
            : requestedLanguage,
        );
      } catch (geminiError) {
        console.error("❌ Gemini API error:", geminiError.message);

        // Fallback response when Gemini fails
        aiResult = {
          medicalResponse:
            "Your message was received. Based on your medical information, please consider consulting with a healthcare professional for personalized advice.",
          sections: null,
          usedMedicalHistory: !!medicalHistory,
        };
      }
    }

    // Save to DB if authenticated
    if (req.user?.id) {
      try {
        await VoiceConsultationModel.create({
          userId: req.user.id,
          originalText: transcript,
          translatedText: englishTranslation || transcript,
          detectedLanguage: detectedLanguage,
          aiResponse: aiResult.medicalResponse,
        });
      } catch (saveErr) {
        console.error("❌ Failed saving uploaded transcription:", saveErr);
      }
    }

    // Don't return a confusing fallback message - let client decide what to show
    res.json({
      success: true,
      transcript,
      detectedLanguage,
      medicalResponse: aiResult.medicalResponse,
      sections: aiResult.sections || null,
      usedMedicalHistory: aiResult.usedMedicalHistory || !!medicalHistory,
      isFallback,
      // Signal that this is a fallback so client can handle gracefully
      requiresClientTranscription: !transcript && isFallback,
    });
  } catch (error) {
    console.error("❌ Error in transcribeUploadHandler:", error);

    // Return user-friendly error response instead of 500 error
    res.json({
      success: true,
      transcript: null,
      detectedLanguage: "en",
      medicalResponse: null,
      sections: null,
      usedMedicalHistory: false,
      isFallback: true,
      requiresClientTranscription: true,
      error: "Audio processing failed",
    });
  }
};
