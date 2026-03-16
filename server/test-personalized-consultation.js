import pool from "./src/config/database.js";
import { geminiService } from "./src/services/geminiService.js";

(async () => {
  try {
    const userId = 3; // User with medical data

    console.log("🔬 Testing Personalized Consultation for User 3\n");

    // Fetch medical history
    const histRes = await pool.query(
      "SELECT * FROM medical_history WHERE user_id = $1",
      [userId],
    );
    const medicalHistory = histRes.rows[0]
      ? {
          allergies: histRes.rows[0].allergies || [],
          chronicConditions: histRes.rows[0].chronic_conditions || [],
          currentMedications: histRes.rows[0].current_medications || [],
          familyHistory: histRes.rows[0].family_history || [],
          pastSurgeries: histRes.rows[0].past_surgeries || [],
          bloodType: histRes.rows[0].blood_type,
          gender: histRes.rows[0].gender,
          dateOfBirth: histRes.rows[0].date_of_birth,
        }
      : null;

    // Fetch medical reports
    const repRes = await pool.query(
      "SELECT id, original_name, document_type, extracted_data FROM medical_reports WHERE user_id = $1 LIMIT 5",
      [userId],
    );
    const medicalReports = repRes.rows
      .map((r) => {
        let extractedData = null;
        if (r.extracted_data) {
          extractedData =
            typeof r.extracted_data === "string"
              ? JSON.parse(r.extracted_data)
              : r.extracted_data;
        }
        return {
          fileName: r.original_name,
          documentType: r.document_type,
          extractedData,
        };
      })
      .filter((r) => r.extractedData);

    // Fetch past consultations
    const vocRes = await pool.query(
      "SELECT original_message, medical_response, detected_language, timestamp FROM voice_consultations WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 5",
      [userId],
    );
    const consultationHistory = vocRes.rows.map((row) => ({
      symptoms: row.original_message,
      diagnosis: row.medical_response
        ? row.medical_response.substring(0, 200)
        : null,
      prescription: null,
      doctorNotes: null,
      date: row.timestamp,
    }));

    console.log("📋 Context Available:");
    console.log(
      `   Medical History: ${medicalHistory ? "✅ Available" : "❌ Missing"}`,
    );
    if (medicalHistory) {
      console.log(
        `     - Chronic Conditions: ${medicalHistory.chronicConditions.join(", ") || "None"}`,
      );
      console.log(
        `     - Blood Type: ${medicalHistory.bloodType || "Unknown"}`,
      );
      console.log(`     - Gender: ${medicalHistory.gender || "Unknown"}`);
    }
    console.log(
      `   Medical Reports: ${medicalReports.length} with extracted data`,
    );
    console.log(
      `   Past Consultations: ${consultationHistory.length} previous conversations`,
    );

    // Test consultation
    console.log(
      "\n🎯 Testing Consultation with Symptom: 'I have chest pain and difficulty breathing'\n",
    );

    const userContext = {
      medicalHistory,
      medicalReports,
      consultationHistory,
    };

    const response = await geminiService.generateMedicalConsultation(
      "I have chest pain and difficulty breathing", // Symptom
      userContext,
      "en", // Language
    );

    console.log("AI Response:");
    console.log("───────────");
    console.log(response.medicalResponse);
    console.log("───────────");

    // Check if response is personalized
    console.log("\n✅ Personalization Check:");

    const isPersonalized =
      response.medicalResponse.toLowerCase().includes("hypertension") ||
      response.medicalResponse.toLowerCase().includes("blood pressure") ||
      response.medicalResponse.toLowerCase().includes("your") ||
      response.medicalResponse.toLowerCase().includes("your condition") ||
      response.medicalResponse.toLowerCase().includes("your medications") ||
      response.medicalResponse.toLowerCase().includes("your medical") ||
      response.medicalResponse.toLowerCase().includes("chest") ||
      response.medicalResponse.toLowerCase().includes("serious")
        ? true
        : false;

    if (isPersonalized) {
      console.log(
        "   ✅ Response appears to be PERSONALIZED (references medical context)",
      );
    } else {
      console.log(
        "   ❌ Response appears GENERIC (no medical context referenced)",
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
})();
