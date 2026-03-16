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
        const errorMsg = error.message || "";

        // Check for quota exceeded errors (429)
        if (
          errorMsg.includes("429") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("Quota exceeded")
        ) {
          console.error(
            `⚠️ API Quota exceeded: ${error.message.substring(0, 100)}...`,
          );
          // Don't retry quota errors - throw immediately
          throw error;
        }

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
   * Generate a mock medical consultation response (fallback when API quota exceeded)
   */
  generateMockMedicalConsultation(symptoms, userContext = {}) {
    console.log("📋 Using MOCK response (API quota exceeded)");

    // Generate contextual response based on symptoms
    const mockResponse = `📋 **ASSESSMENT:** 
Based on your reported symptoms, I'm providing general health guidance. Please note this is a fallback response while the AI service is temporarily unavailable. For professional medical advice, please consult a healthcare provider.

🔍 **POSSIBLE CAUSES:** 
• Common conditions related to your symptoms
• Environmental or lifestyle factors
• Stress or fatigue
• Please consult a healthcare provider for accurate diagnosis

💊 **RECOMMENDED ACTIONS:** 
1. Rest and stay hydrated
2. Monitor your symptoms
3. Maintain healthy eating habits
4. Avoid stressful situations when possible
5. Follow any existing treatment plans

⚠️ **WARNING SIGNS:** 
• Severe or worsening symptoms
• Symptoms lasting more than a few days
• Difficulty breathing or chest pain
• Severe allergic reactions
• Loss of consciousness
** SEEK IMMEDIATE MEDICAL ATTENTION if experiencing any of these signs **

🏥 **WHEN TO SEEK HELP:** 
• If symptoms persist for more than 3-5 days
• If symptoms worsen despite self-care
• If new or concerning symptoms develop
• For professional diagnosis and treatment
• Always contact emergency services (911/112) for life-threatening situations

📝 **IMPORTANT FOR YOU:** 
This is a temporary response provided due to service limitations. The AI medical consultation service is temporarily unavailable due to high usage. We apologize for this inconvenience. 

For immediate medical concerns, please:
- Contact your healthcare provider
- Call emergency services if needed
- Visit an urgent care facility
- Use reliable medical resources like your hospital`;

    return {
      transcription: symptoms,
      detectedLanguage: "English",
      medicalResponse: mockResponse,
      sections: null,
      source: "Mock Response (API Quota Exceeded)",
      timestamp: new Date().toISOString(),
      usedMedicalHistory: false,
      isMockResponse: true,
    };
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

  /**
   * Smart context filtering - only include relevant medical data based on user query
   */
  filterRelevantContext(symptoms, userContext = {}) {
    const relevantContext = {
      medicalHistory: null,
      medicalReports: [],
      consultationHistory: [],
      situation: "general", // emergency, acute, chronic, preventive, ongoing
      relevantKeywords: [],
    };

    // Extract symptom keywords
    const symptomLower = symptoms.toLowerCase();
    const commonSymptoms = [
      "headache",
      "fever",
      "cough",
      "cold",
      "chest",
      "pain",
      "dizziness",
      "nausea",
      "vomit",
      "stomach",
      "breathing",
      "shortness",
      "weakness",
      "rash",
      "blood",
      "pressure",
      "sugar",
      "diabetes",
      "hypertension",
      "flue",
      "flu",
      "throat",
      "dizzy",
      "faint",
      "sweat",
    ];

    relevantContext.relevantKeywords = commonSymptoms.filter((keyword) =>
      symptomLower.includes(keyword),
    );

    console.log(
      `🔎 Extracted keywords from query: ${relevantContext.relevantKeywords.join(", ") || "none"}`,
    );

    // Detect situation urgency
    const emergencyKeywords = [
      "chest pain",
      "can't breathe",
      "difficulty breathing",
      "severe",
      "emergency",
      "urgent",
      "bleeding",
      "unconscious",
      "poisoning",
      "choking",
    ];
    const isEmergency = emergencyKeywords.some((kw) =>
      symptomLower.includes(kw),
    );
    if (isEmergency) {
      relevantContext.situation = "emergency";
    } else if (
      relevantContext.relevantKeywords.length > 0 &&
      symptoms.includes("chronic") &&
      symptoms.includes("ongoing")
    ) {
      relevantContext.situation = "chronic";
    } else if (
      symptomLower.includes("prevent") ||
      symptomLower.includes("prevent")
    ) {
      relevantContext.situation = "preventive";
    } else if (relevantContext.relevantKeywords.length > 0) {
      relevantContext.situation = "acute";
    }

    console.log(`📊 Detected situation: ${relevantContext.situation}`);

    // Filter medical history - only include relevant items
    if (userContext.medicalHistory) {
      const history = userContext.medicalHistory;
      const scoredHistory = {
        ...history,
        relevanceScore: 0,
        relevantItems: [],
      };

      // Score allergies by relevance
      if (history.allergies && history.allergies.length > 0) {
        const relevantAllergies = history.allergies.filter((allergy) =>
          relevantContext.relevantKeywords.some((kw) =>
            allergy.toLowerCase().includes(kw),
          ),
        );
        if (relevantAllergies.length > 0) {
          scoredHistory.relevantItems.push(
            `⚠️ ALLERGIES (Critical): ${relevantAllergies.join(", ")}`,
          );
          scoredHistory.relevanceScore += 100 * relevantAllergies.length;
        } else if (history.allergies.length > 0) {
          scoredHistory.relevantItems.push(
            `ℹ️ Allergies (for reference): ${history.allergies.join(", ")}`,
          );
          scoredHistory.relevanceScore += 10;
        }
      }

      // Score chronic conditions by relevance
      if (history.chronicConditions && history.chronicConditions.length > 0) {
        const relevantConditions = history.chronicConditions.filter((cond) =>
          relevantContext.relevantKeywords.some(
            (kw) =>
              cond.toLowerCase().includes(kw) ||
              symptomLower.includes(cond.toLowerCase()),
          ),
        );
        if (relevantConditions.length > 0) {
          scoredHistory.relevantItems.push(
            `🔴 HAS CONDITION(S): ${relevantConditions.join(", ")}`,
          );
          scoredHistory.relevanceScore += 80 * relevantConditions.length;
        } else if (history.chronicConditions.length > 0) {
          scoredHistory.relevantItems.push(
            `ℹ️ Chronic conditions: ${history.chronicConditions.join(", ")}`,
          );
          scoredHistory.relevanceScore += 5;
        }
      }

      // Score medications by relevance
      if (history.currentMedications && history.currentMedications.length > 0) {
        const relevantMeds = history.currentMedications.filter((med) =>
          relevantContext.relevantKeywords.some((kw) =>
            med.toLowerCase().includes(kw),
          ),
        );
        if (relevantMeds.length > 0) {
          scoredHistory.relevantItems.push(
            `💊 TAKING (Relevant Meds): ${relevantMeds.join(", ")}`,
          );
          scoredHistory.relevanceScore += 60 * relevantMeds.length;
        } else if (history.currentMedications.length > 0) {
          scoredHistory.relevantItems.push(
            `💊 Current medications: ${history.currentMedications.join(", ")}`,
          );
          scoredHistory.relevanceScore += 5;
        }
      }

      // Add demographic info
      if (history.bloodType)
        scoredHistory.relevantItems.push(`🩸 Blood Type: ${history.bloodType}`);
      if (history.gender)
        scoredHistory.relevantItems.push(`👤 Gender: ${history.gender}`);

      if (scoredHistory.relevantItems.length > 0) {
        relevantContext.medicalHistory = scoredHistory;
        console.log(
          `✅ Filtered medical history (score: ${scoredHistory.relevanceScore})`,
        );
      }
    }

    // Filter medical reports - only include relevant findings
    if (userContext.medicalReports && userContext.medicalReports.length > 0) {
      relevantContext.medicalReports = userContext.medicalReports
        .map((report) => {
          if (!report.extractedData) return null;

          const data = report.extractedData;
          const filtered = {
            ...report,
            relevanceScore: 0,
            relevantFindings: [],
          };

          // Score vitals relevance
          if (data.vitals && data.vitals.length > 0) {
            const vitalKeywords = [
              "blood pressure",
              "heart rate",
              "temperature",
              "bp",
              "hr",
              "fever",
            ];
            const relevantVitals = data.vitals.filter(
              (vital) =>
                vitalKeywords.some((kw) => vital.toLowerCase().includes(kw)) ||
                relevantContext.relevantKeywords.some((rk) =>
                  vital.toLowerCase().includes(rk),
                ),
            );
            if (relevantVitals.length > 0) {
              filtered.relevantFindings.push(
                ...relevantVitals.map((v) => `📊 ${v}`),
              );
              filtered.relevanceScore += 50 * relevantVitals.length;
            }
          }

          // Score lab results relevance
          if (data.labResults && data.labResults.length > 0) {
            const labKeywords = [
              "glucose",
              "hemoglobin",
              "wbc",
              "sugar",
              "diabetes",
            ];
            const relevantLabs = data.labResults.filter(
              (lab) =>
                labKeywords.some((kw) => lab.toLowerCase().includes(kw)) ||
                relevantContext.relevantKeywords.some((rk) =>
                  lab.toLowerCase().includes(rk),
                ),
            );
            if (relevantLabs.length > 0) {
              filtered.relevantFindings.push(
                ...relevantLabs.map((l) => `🧬 ${l}`),
              );
              filtered.relevanceScore += 40 * relevantLabs.length;
            }
          }

          // Score findings relevance
          if (data.keyFindings && data.keyFindings.length > 0) {
            const relevantFindings = data.keyFindings.filter((finding) =>
              relevantContext.relevantKeywords.some(
                (rk) =>
                  finding.toLowerCase().includes(rk) ||
                  symptomLower.includes(finding.toLowerCase()),
              ),
            );
            if (relevantFindings.length > 0) {
              filtered.relevantFindings.push(
                ...relevantFindings.map((f) => `🔍 ${f}`),
              );
              filtered.relevanceScore += 60 * relevantFindings.length;
            }
          }

          // Add diagnosis if relevant
          if (
            data.diagnosis &&
            (relevantContext.relevantKeywords.some((rk) =>
              data.diagnosis.toLowerCase().includes(rk),
            ) ||
              symptomLower.includes(data.diagnosis.toLowerCase()))
          ) {
            filtered.relevantFindings.push(`📋 Diagnosis: ${data.diagnosis}`);
            filtered.relevanceScore += 70;
          }

          return filtered.relevanceScore > 0 ? filtered : null;
        })
        .filter((r) => r !== null)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      if (relevantContext.medicalReports.length > 0) {
        console.log(
          `✅ Filtered medical reports (${relevantContext.medicalReports.length} relevant)`,
        );
      }
    }

    // Filter consultation history - only include recent and relevant
    if (
      userContext.consultationHistory &&
      userContext.consultationHistory.length > 0
    ) {
      relevantContext.consultationHistory = userContext.consultationHistory
        .slice(0, 3) // Most recent 3
        .filter((consultation) =>
          relevantContext.relevantKeywords.some(
            (kw) =>
              consultation.symptoms?.toLowerCase().includes(kw) ||
              consultation.diagnosis?.toLowerCase().includes(kw),
          ),
        );

      if (relevantContext.consultationHistory.length > 0) {
        console.log(
          `✅ Found ${relevantContext.consultationHistory.length} relevant past consultations`,
        );
      }
    }

    return relevantContext;
  }

  /**
   * Generate medical consultation using smart context filtering
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

      // Use smart context filtering
      console.log("\n🧠 Applying smart context filtering based on query...");
      const relevantContext = this.filterRelevantContext(symptoms, userContext);

      // Build patient context using ONLY relevant data
      let patientContext = "";

      if (relevantContext.situation === "emergency") {
        patientContext +=
          "\n⚠️ **EMERGENCY SITUATION DETECTED** - Prioritize immediate medical attention!";
      }

      if (
        relevantContext.medicalHistory &&
        relevantContext.medicalHistory.relevantItems.length > 0
      ) {
        patientContext += "\n\n**PATIENT'S RELEVANT MEDICAL CONTEXT:**";
        relevantContext.medicalHistory.relevantItems.forEach((item) => {
          patientContext += `\n${item}`;
        });
      }

      // Add relevant medical reports
      if (relevantContext.medicalReports.length > 0) {
        patientContext += `\n\n**RELEVANT MEDICAL REPORTS (${relevantContext.medicalReports.length} matching current query):**`;
        relevantContext.medicalReports.slice(0, 3).forEach((report, idx) => {
          patientContext += `\n\nReport ${idx + 1}: ${report.fileName}`;
          if (report.relevantFindings && report.relevantFindings.length > 0) {
            report.relevantFindings.forEach((finding) => {
              patientContext += `\n  ${finding}`;
            });
          }
        });
      }

      // Add relevant past consultations
      if (relevantContext.consultationHistory.length > 0) {
        patientContext += `\n\n**RELATED PAST CONSULTATIONS** (${relevantContext.consultationHistory.length} similar cases):`;
        relevantContext.consultationHistory.forEach((consultation, idx) => {
          patientContext += `\n${idx + 1}. Reported: ${consultation.symptoms?.substring(0, 50)}...`;
          if (consultation.diagnosis) {
            patientContext += ` → ${consultation.diagnosis.substring(0, 50)}...`;
          }
        });
      }

      console.log(`📊 Final context size: ${patientContext.length} chars`);
      console.log(
        `   - Medical history items: ${
          relevantContext.medicalHistory?.relevantItems?.length || 0
        }`,
      );
      console.log(
        `   - Relevant reports: ${relevantContext.medicalReports.length}`,
      );
      console.log(
        `   - Related consultations: ${relevantContext.consultationHistory.length}`,
      );

      // Situational prompt adjustments
      let situationalGuidance = "";
      switch (relevantContext.situation) {
        case "emergency":
          situationalGuidance =
            "This appears to be an EMERGENCY situation. Prioritize immediate medical attention and safety measures. Advise to seek emergency services (ambulance/hospital) immediately.";
          break;
        case "acute":
          situationalGuidance =
            "This is an acute symptom requiring prompt attention. Provide immediate care guidance and clear signs when to seek medical help.";
          break;
        case "chronic":
          situationalGuidance =
            "This relates to chronic condition management. Provide ongoing management strategies and when escalation is needed.";
          break;
        case "preventive":
          situationalGuidance =
            "This is about preventive care. Provide strategies to prevent the condition and maintain health.";
          break;
        default:
          situationalGuidance =
            "Provide general health guidance based on the current symptoms.";
      }

      // Build the Gemini prompt with situational guidance
      const prompt = `You are a highly personalized medical AI assistant providing contextual health advice.

**PATIENT'S CURRENT QUESTION/SYMPTOMS:**
"${symptoms}"

**SITUATIONAL CONTEXT:**
${situationalGuidance}

**PATIENT'S RELEVANT MEDICAL INFORMATION:**
${
  patientContext ||
  "No specific medical history on file. Provide general guidance for a patient with no known conditions."
}

**YOUR CRITICAL TASK:**
1. ANALYZE the current symptoms in context of the patient's relevant medical history
2. PROVIDE PERSONALIZED guidance that accounts for:
   - Any relevant medical conditions they have
   - Medications they're currently taking (check for interactions)
   - Any documented allergies
   - Previous consultations on similar topics
3. GIVE SPECIFIC, CONTEXTUAL recommendations (NOT generic advice)
4. STRUCTURE your response with clear sections for easy reading
5. WARN about special concerns based on THEIR medical situation

**RESPONSE STRUCTURE:**
📋 **ASSESSMENT:** [Analysis of symptoms considering their medical context]
🔍 **POSSIBLE CAUSES:** [Causes relevant to THEIR conditions]
💊 **RECOMMENDED ACTIONS:** [Specific care steps avoiding their allergies/medication conflicts]
⚠️ **WARNING SIGNS:** [Critical symptoms requiring immediate care based on THEIR profile]
🏥 **WHEN TO SEEK HELP:** [Clear urgency guidance based on THEIR situation]
📝 **IMPORTANT FOR YOU:** [Special considerations for THEIR specific case]

**LANGUAGE RULES:**
${
  requestedLanguage && requestedLanguage !== "auto"
    ? `Respond in ${requestedLanguage}. Use appropriate script and native language formatting.`
    : `Respond in the same language as the patient's input. Detect and maintain the original language/script.`
}

- Be concise and thorough (max 150 words per section)
- Use bullet points and numbered lists for clarity
- Make it scannable and easy to read
- ALWAYS maintain the section structure with emojis
- If this is an emergency situation, clearly emphasize seeking immediate medical attention

Provide your PERSONALIZED, WELL-STRUCTURED medical advice now:`;

      try {
        console.log(`🔤 Language: ${requestedLanguage}`);
        const promptPreview = prompt.substring(0, 300);
        console.log(`📝 Sending prompt to Gemini (${prompt.length} chars)...`);
      } catch (logErr) {
        // ignore
      }

      let medicalResponse;
      let sections = null;

      try {
        const result = await this.generateContentWithRetry(prompt);
        const response = await result.response;
        medicalResponse = response.text();

        // Parse the structured response into sections
        const parsedSections = this.parseStructuredResponse(medicalResponse);
        sections = parsedSections || null;
      } catch (error) {
        // Handle quota exceeded or other API errors
        const errorMsg = error.message || "";
        if (
          errorMsg.includes("429") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("Quota exceeded")
        ) {
          console.warn("⚠️ Gemini API quota exceeded - using mock response");
          return this.generateMockMedicalConsultation(symptoms, userContext);
        }
        // Re-throw other errors
        throw error;
      }

      // Compute a human-readable detected language name
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
        sections: sections,
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
   * Parse structured response with sections
   */
  parseStructuredResponse(responseText) {
    const sections = {
      assessment: "",
      possibleCauses: [],
      recommendedSelfCare: [],
      warningSigns: [],
      whenToSeeDoctor: "",
      importantForYou: "",
    };

    try {
      // Split by section headers (more flexible regex)
      const assessmentMatch = responseText.match(
        /📋\s*\*?\*?ASSESSMENT\*?\*?:?\s*([\s\S]*?)(?=🔍|\d+\.|⚠️|🏥|📝|$)/i,
      );
      if (assessmentMatch && assessmentMatch[1]) {
        sections.assessment = assessmentMatch[1]
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("•"))
          .join(" ");
      }

      // Possible Causes
      const causesMatch = responseText.match(
        /🔍\s*\*?\*?POSSIBLE CAUSES\*?\*?:?\s*([\s\S]*?)(?=💊|\d+\.|⚠️|🏥|📝|$)/i,
      );
      if (causesMatch && causesMatch[1]) {
        const items = causesMatch[1].split("\n");
        sections.possibleCauses = items
          .filter((line) => line.includes("•") || line.includes("*"))
          .map((line) =>
            line
              .replace(/^[\s•*]+/, "")
              .replace(/\*\*/g, "")
              .trim(),
          )
          .filter((line) => line.length > 0);
      }

      // Recommended Self-Care
      const careMatch = responseText.match(
        /💊\s*\*?\*?RECOMMENDED SELF-?CARE\*?\*?:?\s*([\s\S]*?)(?=⚠️|🏥|📝|$)/i,
      );
      if (careMatch && careMatch[1]) {
        const items = careMatch[1].split("\n");
        sections.recommendedSelfCare = items
          .filter((line) => /^\d+\.|•|^\*/.test(line.trim()))
          .map((line) =>
            line
              .replace(/^[\s\d+.*•*]+/, "")
              .replace(/\*\*/g, "")
              .trim(),
          )
          .filter((line) => line.length > 0);
      }

      // Warning Signs
      const warningMatch = responseText.match(
        /⚠️\s*\*?\*?WARNING SIGNS\*?\*?:?\s*([\s\S]*?)(?=🏥|📝|$)/i,
      );
      if (warningMatch && warningMatch[1]) {
        const items = warningMatch[1].split("\n");
        sections.warningSigns = items
          .filter((line) => line.includes("•") || line.includes("*"))
          .map((line) =>
            line
              .replace(/^[\s•*]+/, "")
              .replace(/\*\*/g, "")
              .trim(),
          )
          .filter((line) => line.length > 0);
      }

      // When to See Doctor
      const doctorMatch = responseText.match(
        /🏥\s*\*?\*?WHEN TO SEE[A-Z\s]*DOCTOR\*?\*?:?\s*([\s\S]*?)(?=📝|$)/i,
      );
      if (doctorMatch && doctorMatch[1]) {
        sections.whenToSeeDoctor = doctorMatch[1]
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("•"))
          .join(" ");
      }

      // Important for You
      const importantMatch = responseText.match(
        /📝\s*\*?\*?IMPORTANT FOR YOU\*?\*?:?\s*([\s\S]*?)$/i,
      );
      if (importantMatch && importantMatch[1]) {
        sections.importantForYou = importantMatch[1]
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("•"))
          .join(" ");
      }

      // If sections are mostly empty, return null to signal fallback to plain text
      const hasContent =
        sections.assessment ||
        sections.possibleCauses.length > 0 ||
        sections.recommendedSelfCare.length > 0 ||
        sections.warningSigns.length > 0 ||
        sections.whenToSeeDoctor ||
        sections.importantForYou;

      return hasContent ? sections : null;
    } catch (error) {
      console.error("Error parsing structured response:", error);
      return null;
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
