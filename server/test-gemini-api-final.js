import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function testGeminiAPI() {
  console.log("🔍 Testing Gemini API directly...\n");

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  console.log(`📋 Configuration:`);
  console.log(`   API Key: ${apiKey ? "✅ Present" : "❌ Missing"}`);
  console.log(`   Model: ${model}`);
  console.log(
    `   First 20 chars of key: ${apiKey ? apiKey.substring(0, 20) : "N/A"}`,
  );

  if (!apiKey) {
    console.log("\n❌ No API key found!");
    process.exit(1);
  }

  try {
    console.log("\n🚀 Initializing GoogleGenerativeAI...");
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("✅ GoogleGenerativeAI initialized");

    console.log(`\n📡 Getting model: ${model}`);
    const generativeModel = genAI.getGenerativeModel({ model });
    console.log("✅ Model obtained");

    console.log("\n💬 Sending test prompt...");
    const prompt = "What is 2 + 2?";

    const result = await generativeModel.generateContent(prompt);

    console.log("✅ API Response received!");
    console.log(`\n📝 Response: ${result.response.text()}`);
    console.log("\n✅✅✅ SUCCESS! API is working correctly!");
  } catch (error) {
    console.log("\n❌ ERROR:");
    console.log(`   Type: ${error.constructor.name}`);
    console.log(`   Message: ${error.message}`);

    // Check for specific error types
    if (error.message && error.message.includes("429")) {
      console.log(
        '\n⚠️  This is a 429 "Too Many Requests" (quota exceeded) error',
      );
    } else if (error.message && error.message.includes("401")) {
      console.log(
        '\n⚠️  This is a 401 "Unauthorized" error - API key may be invalid',
      );
    } else if (error.message && error.message.includes("403")) {
      console.log(
        '\n⚠️  This is a 403 "Forbidden" error - API key may not have access',
      );
    } else if (error.message && error.message.includes("API key")) {
      console.log("\n⚠️  Error related to API key");
    }

    console.log("\n📚 Full Error:");
    console.log(error);
  }
}

testGeminiAPI();
