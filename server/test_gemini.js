import { geminiService } from "./src/services/geminiService.js";

async function runTests() {
  console.log("Gemini available:", geminiService.isAvailable());

  try {
    console.log('\nTest 1: English input, requestedLanguage="en"');
    const res1 = await geminiService.generateMedicalConsultation(
      "I have a severe headache and fever for 2 days.",
      {},
      "en"
    );
    console.log("Result 1 detectedLanguage:", res1.detectedLanguage || "(n/a)");
    console.log(
      "Result 1 medicalResponse (truncated):",
      res1.medicalResponse?.slice(0, 400)
    );
  } catch (e) {
    console.error("Test 1 error:", e.message || e);
  }

  try {
    console.log(
      '\nTest 2: English input, requestedLanguage="auto" (no override)'
    );
    const res2 = await geminiService.generateMedicalConsultation(
      "I have a severe headache and fever for 2 days.",
      {},
      "auto"
    );
    console.log("Result 2 detectedLanguage:", res2.detectedLanguage || "(n/a)");
    console.log(
      "Result 2 medicalResponse (truncated):",
      res2.medicalResponse?.slice(0, 400)
    );
  } catch (e) {
    console.error("Test 2 error:", e.message || e);
  }

  try {
    console.log('\nTest 3: Hindi input (Devanagari), requestedLanguage="hi"');
    const hindi = "मुझे तीन दिन से तेज सिरदर्द और बुखार है।";
    const res3 = await geminiService.generateMedicalConsultation(
      hindi,
      {},
      "hi"
    );
    console.log("Result 3 detectedLanguage:", res3.detectedLanguage || "(n/a)");
    console.log(
      "Result 3 medicalResponse (truncated):",
      res3.medicalResponse?.slice(0, 400)
    );
  } catch (e) {
    console.error("Test 3 error:", e.message || e);
  }

  try {
    console.log(
      '\nTest 4: English input but requestedLanguage="hi" (force Hindi)'
    );
    const res4 = await geminiService.generateMedicalConsultation(
      "I have a severe headache and fever for 2 days.",
      {},
      "hi"
    );
    console.log("Result 4 detectedLanguage:", res4.detectedLanguage || "(n/a)");
    console.log(
      "Result 4 medicalResponse (truncated):",
      res4.medicalResponse?.slice(0, 400)
    );
  } catch (e) {
    console.error("Test 4 error:", e.message || e);
  }
}

runTests()
  .then(() => console.log("\nAll tests finished"))
  .catch((err) => console.error("Test runner error:", err));
