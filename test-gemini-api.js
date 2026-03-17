import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: "./server/.env" });

async function testGeminiAPI() {
  console.log("🧪 Testing Gemini API...\n");

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-pro";

  console.log("📋 Configuration:");
  console.log(
    `  API Key: ${apiKey ? apiKey.substring(0, 20) + "..." : "NOT SET"}`,
  );
  console.log(`  Model: ${modelName}\n`);

  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in .env file");
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    console.log("✅ Gemini AI Client initialized\n");

    console.log("🔄 Sending test prompt...");
    const prompt = "What are 3 tips for staying healthy?";

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log("\n✅ SUCCESS! Gemini API is working!\n");
      console.log("📝 Response:");
      console.log(text.substring(0, 300) + "...\n");
    } catch (apiError) {
      console.error("\n❌ Gemini API Error:");
      console.error(`Message: ${apiError.message}`);
      console.error(`\nFull Error:`, apiError);

      // Analyze the error
      const errorMsg = apiError.message || "";
      if (errorMsg.includes("429")) {
        console.error(
          "\n⚠️ ISSUE: It looks like you've hit a rate limit or quota!",
        );
        console.error("Possible solutions:");
        console.error("1. Upgrade your Gemini API plan");
        console.error("2. Wait for quota to reset (daily)");
        console.error("3. Check if API key is correctly set");
      } else if (errorMsg.includes("INVALID_ARGUMENT")) {
        console.error("\n⚠️ ISSUE: Invalid API key or bad configuration");
      } else if (errorMsg.includes("UNAUTHENTICATED")) {
        console.error("\n⚠️ ISSUE: API key is invalid or not authorized");
      }
    }
  } catch (initError) {
    console.error("❌ Failed to initialize Gemini:", initError.message);
    process.exit(1);
  }
}

testGeminiAPI();
