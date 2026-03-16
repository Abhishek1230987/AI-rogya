import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Gemini AI Service for Medical Analysis and Voice Consultation
 * Using Google's Gemini API (free tier available)
 *
 * Supported Models:
 * - gemini-pro: Default, balanced performance (Recommended)
 * - gemini-1.5-pro: Latest, best quality
 * - gemini-1.5-flash: Fastest, lower cost
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || "gemini-pro";
    this.genAI = null;
    this.model = null;

    if (this.apiKey && this.apiKey !== "your-gemini-api-key-here") {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });
        console.log(
          `✅ Gemini AI initialized successfully (Model: ${this.modelName})`,
        );
      } catch (error) {
        console.error("❌ Gemini AI initialization error:", error.message);
      }
    } else {
      console.log("⚠️ Gemini AI not configured - using mock responses");
      console.log(
        "   Get your free API key from: https://makersuite.google.com/app/apikey",
      );
      console.log("   Add GEMINI_API_KEY to your .env file");
    }
  }

  /**
   * Check if Gemini is available
   */
  isAvailable() {
    return this.model !== null;
  }

  /**
   * Generate content with retry logic for network resilience
   * Retries up to 3 times with exponential backoff
   */
  async generateContentWithRetry(prompt, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Gemini API call attempt ${attempt}/${maxRetries}...`);
        return await this.model.generateContent(prompt);
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Waiting ${delayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    console.error("❌ Gemini API failed after all retries");
    throw lastError || new Error("Gemini API request failed");
  }

  /**
   * Analyze medical document text using Gemini
   */
  async analyzeMedicalDocument(text, fileName) {
    if (!this.isAvailable()) {
      throw new Error("Gemini AI not configured");
    }

    try {
      const prompt = `You are a medical document analyzer. Analyze the following medical document and extract key information.

Document Name: ${fileName}
Document Content:
${text}

Please provide a JSON response with the following structure:
{
  "patientInfo": {
    "name": "patient name if found",
    "patientId": "ID if found",
    "dateOfBirth": "DOB if found"
  },
  "vitals": ["list of vital signs found"],
  "labResults": ["list of lab results found"],
  "dateOfReport": "date of report if found",
  "reportType": "type of medical report",
  "keyFindings": ["list of key medical findings"],
  "recommendations": ["any recommendations or notes from doctor"]
}

Only include fields where you found actual data. Return valid JSON only, no additional text.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      // Try to parse JSON from response
      try {
        // Remove markdown code blocks if present
        const cleanedText = textResponse
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const parsedData = JSON.parse(cleanedText);

        return {
          ...parsedData,
          source: "Google Gemini AI",
          confidence: 90,
          processingMethod: "AI_ANALYSIS",
          extractedTextLength: text.length,
          timestamp: new Date().toISOString(),
        };
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", parseError);
        // Return structured data from text response
        return {
          patientInfo: { name: "Unknown" },
          vitals: [],
          labResults: [],
          keyFindings: [textResponse.substring(0, 500)],
          source: "Google Gemini AI (text)",
          confidence: 70,
          processingMethod: "AI_ANALYSIS",
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error("Gemini medical analysis error:", error.message);
      throw error;
    }
  }

  /**
   * Generate medical consultation response based on symptoms
   */
  async generateMedicalConsultation(
    symptoms,
    userContext = {},
    requestedLanguage = "auto",
  ) {
    if (!this.isAvailable()) {
      throw new Error("Gemini AI not configured");
    }

    try {
      console.log(
        "🔍 DEBUG - GeminiService received requestedLanguage:",
        requestedLanguage,
      );

      // If caller asked for auto, detect language from symptoms text using basic script ranges
      function detectLanguageFromText(text) {
        if (!text || typeof text !== "string") return "en";
        if (/[\u0900-\u097F]/.test(text)) return "hi"; // Devanagari
        if (/[\u0980-\u09FF]/.test(text)) return "bn"; // Bengali
        if (/[\u0A00-\u0A7F]/.test(text)) return "pa"; // Gurmukhi
        if (/[\u0A80-\u0AFF]/.test(text)) return "gu"; // Gujarati
        if (/[\u0B00-\u0B7F]/.test(text)) return "or"; // Oriya
        if (/[\u0B80-\u0BFF]/.test(text)) return "ta"; // Tamil
        if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu
        if (/[\u0C80-\u0CFF]/.test(text)) return "kn"; // Kannada
        if (/[\u0D00-\u0D7F]/.test(text)) return "ml"; // Malayalam
        // Default to English for Latin script
        return "en";
      }

      if (requestedLanguage === "auto") {
        requestedLanguage = detectLanguageFromText(symptoms) || "en";
        console.log(`🔤 GeminiService detected language: ${requestedLanguage}`);
      } else {
        console.log(
          `✅ GeminiService using explicitly requested language: ${requestedLanguage}`,
        );
      }
      // Build detailed patient context
      let patientContext = "";

      if (userContext.medicalHistory) {
        const history = userContext.medicalHistory;

        // Add allergies if present
        if (history.allergies && history.allergies.length > 0) {
          patientContext += `\n**Known Allergies:** ${
            Array.isArray(history.allergies)
              ? history.allergies.join(", ")
              : history.allergies
          }`;
        }

        // Add chronic conditions
        if (history.chronicConditions && history.chronicConditions.length > 0) {
          patientContext += `\n**Chronic Conditions:** ${
            Array.isArray(history.chronicConditions)
              ? history.chronicConditions.join(", ")
              : history.chronicConditions
          }`;
        }

        // Add current medications
        if (
          history.currentMedications &&
          history.currentMedications.length > 0
        ) {
          patientContext += `\n**Current Medications:** ${
            Array.isArray(history.currentMedications)
              ? history.currentMedications.join(", ")
              : history.currentMedications
          }`;
        }

        // Add family history
        if (history.familyHistory && history.familyHistory.length > 0) {
          patientContext += `\n**Family Medical History:** ${
            Array.isArray(history.familyHistory)
              ? history.familyHistory.join(", ")
              : history.familyHistory
          }`;
        }

        // Add past surgeries
        if (history.pastSurgeries && history.pastSurgeries.length > 0) {
          patientContext += `\n**Past Surgeries:** ${
            Array.isArray(history.pastSurgeries)
              ? history.pastSurgeries.join(", ")
              : history.pastSurgeries
          }`;
        }

        // Add blood type
        if (history.bloodType) {
          patientContext += `\n**Blood Type:** ${history.bloodType}`;
        }

        // Add gender and age context
        if (history.gender) {
          patientContext += `\n**Gender:** ${history.gender}`;
        }
        if (history.dateOfBirth) {
          const age =
            new Date().getFullYear() -
            new Date(history.dateOfBirth).getFullYear();
          patientContext += `\n**Age:** ${age} years`;
        }
      }

      // Add medical reports context
      if (userContext.medicalReports && userContext.medicalReports.length > 0) {
        patientContext += `\n\n**Recent Medical Reports:**`;

        userContext.medicalReports.forEach((report, index) => {
          if (report.extractedData) {
            patientContext += `\n\nReport ${index + 1}: ${report.fileName} (${
              report.documentType
            })`;

            const data = report.extractedData;

            if (data.vitals && data.vitals.length > 0) {
              patientContext += `\n  - Vitals: ${data.vitals.join(", ")}`;
            }

            if (data.labResults && data.labResults.length > 0) {
              patientContext += `\n  - Lab Results: ${data.labResults
                .slice(0, 5)
                .join(", ")}`;
            }

            if (data.keyFindings && data.keyFindings.length > 0) {
              patientContext += `\n  - Key Findings: ${data.keyFindings
                .slice(0, 3)
                .join("; ")}`;
            }

            if (data.diagnosis) {
              patientContext += `\n  - Diagnosis: ${data.diagnosis}`;
            }
          }
        });
      }

      // Add past consultation history for continuity
      if (
        userContext.consultationHistory &&
        userContext.consultationHistory.length > 0
      ) {
        patientContext += `\n\n**Previous Consultations (for context and continuity):**`;

        userContext.consultationHistory
          .slice(0, 3)
          .forEach((consultation, index) => {
            patientContext += `\n\nPrevious Consultation ${
              index + 1
            } (${new Date(consultation.date).toLocaleDateString()}):`;

            if (consultation.symptoms) {
              patientContext += `\n  - Reported Symptoms: ${consultation.symptoms}`;
            }
            if (consultation.diagnosis) {
              patientContext += `\n  - Diagnosis: ${consultation.diagnosis}`;
            }
            if (consultation.prescription) {
              patientContext += `\n  - Treatment: ${consultation.prescription}`;
            }
          });
      }

      let languageOverrideInstruction = "";
      if (requestedLanguage && requestedLanguage !== "auto") {
        // Map common codes to human readable language names for clearer model instruction
        const langMap = {
          en: "English (Latin script)",
          hi: "Hindi (Devanagari script)",
          bn: "Bengali (Bengali script)",
          ta: "Tamil (Tamil script)",
          te: "Telugu (Telugu script)",
          gu: "Gujarati (Gujarati script)",
          kn: "Kannada (Kannada script)",
          mr: "Marathi (Devanagari script)",
          pa: "Punjabi (Gurmukhi script)",
          ml: "Malayalam (Malayalam script)",
          or: "Odia (Odia script)",
          ur: "Urdu (Nastaliq/Naskh script - Arabic-based)",
          as: "Assamese (Assamese script)",
          mai: "Maithili (Devanagari script - IMPORTANT: NOT Marathi, NOT Hindi, respond ONLY in Maithili)",
        };

        const short = requestedLanguage.split("-")[0];
        const human = langMap[short] || requestedLanguage;

        languageOverrideInstruction = `\n**REQUESTED_RESPONSE_LANGUAGE:** The user prefers responses in ${human}. Respond in that language using the appropriate native script.`;
        // Stronger explicit instruction to avoid model mixing languages
        languageOverrideInstruction += `\n**START_RESPONSE_IN_${short.toUpperCase()}_ONLY:** Begin your response ONLY in ${human}. DO NOT use any other language or script. If converting from romanized text (e.g., Hinglish), output proper native script.`;
      }

      const prompt = `You are a helpful medical AI assistant. Provide accurate, symptom-specific health advice.

**PATIENT'S CURRENT QUESTION/SYMPTOMS:**
"${symptoms}"

${patientContext ? `**PATIENT'S MEDICAL BACKGROUND (use as reference):**${patientContext}` : ""}

**YOUR TASK:**
1. ANALYZE the specific symptom or health question above
2. PROVIDE relevant medical information about THAT symptom
3. SUGGEST appropriate home remedies or when to see a doctor
4. If patient has allergies listed above, AVOID recommending medications they're allergic to
5. Only mention their chronic conditions if DIRECTLY relevant to the current symptom

**RESPONSE GUIDELINES:**
- Give a helpful, informative response about the SPECIFIC symptom mentioned
- Include: possible causes, self-care tips, warning signs to watch for
- Be concise (3-5 sentences for simple symptoms, more for complex questions)
- If the symptom could be serious, advise seeking medical attention

**LANGUAGE RULES:**
${languageOverrideInstruction || "Respond in the same language as the patient's input."}
- If input is in Hindi/regional language script, respond in that same script
- If input is in English, respond in English

Provide your medical advice now:`;

      // Debug: log the language instruction and a short preview of the prompt (avoid full PHI leakage)
      try {
        console.log(`🔤 GeminiService: requestedLanguage=${requestedLanguage}`);
        const promptPreview = prompt.replace(/\s+/g, " ").trim().slice(0, 400);
        console.log(`🧾 Gemini prompt preview: ${promptPreview}...`);
      } catch (logErr) {
        // ignore logging errors
      }

      const result = await this.generateContentWithRetry(prompt);
      const response = await result.response;
      const medicalResponse = response.text();

      // Compute a human-readable detected language name for the response
      const detectedShort = (requestedLanguage || "en").split("-")[0];
      const humanNames = {
        en: "English",
        hi: "Hindi",
        bn: "Bengali",
        ta: "Tamil",
        te: "Telugu",
        gu: "Gujarati",
        kn: "Kannada",
        mr: "Marathi",
        pa: "Punjabi",
        ml: "Malayalam",
      };

      const detectedLanguageName = humanNames[detectedShort] || detectedShort;

      return {
        transcription: symptoms,
        detectedLanguage: detectedLanguageName,
        medicalResponse: medicalResponse.trim(),
        source: "Google Gemini AI",
        timestamp: new Date().toISOString(),
        usedMedicalHistory: !!userContext.medicalHistory,
      };
    } catch (error) {
      console.error("Gemini consultation error:", error.message);
      throw error;
    }
  }

  /**
   * Analyze symptoms and provide diagnosis suggestions
   */
  async analyzeSymptoms(symptoms) {
    if (!this.isAvailable()) {
      throw new Error("Gemini AI not configured");
    }

    try {
      const prompt = `As a medical AI, analyze these symptoms and provide possible conditions:

Symptoms: ${symptoms}

Provide a JSON response with:
{
  "possibleConditions": ["condition1", "condition2"],
  "urgencyLevel": "low|medium|high|emergency",
  "recommendations": ["recommendation1", "recommendation2"],
  "redFlags": ["warning sign 1", "warning sign 2"]
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      try {
        const cleanedText = textResponse
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        return JSON.parse(cleanedText);
      } catch {
        return {
          possibleConditions: ["Unable to analyze"],
          urgencyLevel: "medium",
          recommendations: [textResponse],
          redFlags: [],
        };
      }
    } catch (error) {
      console.error("Gemini symptom analysis error:", error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
export default geminiService;
