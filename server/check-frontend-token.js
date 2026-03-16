import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Sample tokens to check - these would be from your localStorage
const testTokens = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzU5MDcwNTYyLCJleHAiOjE3NTk2NzU0MzJ9.z1nL-X5K_nP8q-Y2mR3vW4xZ9aB0cD1eF2gH3jK4lM", // Example JWT
];

console.log("🔍 CHECKING JWT TOKEN");
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? "✅ SET" : "❌ NOT SET"}`);
console.log(
  `JWT_SECRET Value: ${
    process.env.JWT_SECRET
      ? process.env.JWT_SECRET.substring(0, 20) + "..."
      : "N/A"
  }`
);
console.log(
  "======================================================================"
);

// Decode the token from the frontend
// Get token from command line argument if provided
const tokenFromArg = process.argv[2];
if (tokenFromArg) {
  console.log("\n✅ Token provided via command line");
  console.log(`Token (first 50 chars): ${tokenFromArg.substring(0, 50)}...`);

  try {
    // First decode without verification to see the payload
    const decoded = jwt.decode(tokenFromArg, { complete: true });
    if (!decoded) {
      console.error("❌ Invalid JWT format");
      process.exit(1);
    }

    console.log("\n📦 Token Payload (without verification):");
    console.log(JSON.stringify(decoded.payload, null, 2));

    // Now try to verify with backend JWT_SECRET
    try {
      const verified = jwt.verify(tokenFromArg, process.env.JWT_SECRET);
      console.log("\n✅ Token VERIFIED with backend JWT_SECRET");
      console.log("User ID from token:", verified.id);
    } catch (verifyError) {
      console.error("\n❌ Token FAILED verification with backend JWT_SECRET");
      console.error("Error:", verifyError.message);
    }
  } catch (error) {
    console.error("❌ Error decoding token:", error.message);
  }
} else {
  console.log("\n⚠️  No token provided");
  console.log(
    "Usage: node check-frontend-token.js <your-jwt-token-from-localStorage>"
  );
  console.log("\n📝 Steps to get your token:");
  console.log("1. Open browser DevTools (F12)");
  console.log("2. Go to Application → Local Storage → http://localhost:5174");
  console.log("3. Copy the value of 'token'");
  console.log("4. Run: node check-frontend-token.js <paste-token-here>");
}

console.log(
  "\n======================================================================"
);
console.log("💡 To fix the issue:");
console.log("1. Open DevTools (F12)");
console.log("2. Application → Local Storage");
console.log("3. Delete all entries");
console.log("4. Refresh and login again");
console.log("5. Try SOS again");
