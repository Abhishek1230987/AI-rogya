import fetch from "node-fetch";

// First, get a token by creating/logging in a test user
async function testVoiceConsultation() {
  try {
    // Step 1: Register/login a test user
    console.log("Step 1: Registering test user...");
    const authResponse = await fetch(
      "http://localhost:5000/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User" + Date.now(),
          email: "test" + Date.now() + "@example.com",
          password: "Test123!@#",
        }),
      },
    );

    const authData = await authResponse.json();
    console.log("Auth response:", authData);

    if (!authData.token) {
      console.error("No token received:", authData);
      return;
    }

    const token = authData.token;
    console.log("Token:", token);

    // Step 2: Test voice consultation endpoint
    console.log("\nStep 2: Testing voice consultation endpoint...");
    const consultResponse = await fetch(
      "http://localhost:5000/api/voice/text-consultation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: "I have a headache",
          language: "en",
        }),
      },
    );

    console.log("Response status:", consultResponse.status);
    const consultData = await consultResponse.json();
    console.log("Response data:", JSON.stringify(consultData, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Details:", error);
  }
}

testVoiceConsultation();
