import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import FormData from "form-data";

const API_URL = "http://localhost:5000";
const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "Test@1234";

async function testUploadFlow() {
  try {
    console.log("\n🚀 [TEST] Starting upload flow test...\n");

    // Step 1: Register
    console.log("📝 [STEP 1] Registering test user...");
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: "user",
      }),
    });

    if (!registerRes.ok && registerRes.status !== 409) {
      throw new Error(`Register failed: ${registerRes.status}`);
    }
    console.log("✅ [STEP 1] User registered/exists\n");

    // Step 2: Login
    console.log("📝 [STEP 2] Logging in...");
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    const loginData = await loginRes.json();
    if (!loginData.token) {
      throw new Error("No token received");
    }
    const token = loginData.token;
    console.log(`✅ [STEP 2] Logged in, token: ${token.substring(0, 20)}...\n`);

    // Step 3: Create test file
    console.log("📝 [STEP 3] Creating test file...");
    const testFilePath = path.join(process.cwd(), "test-document.txt");
    fs.writeFileSync(
      testFilePath,
      "This is a test medical report document.\n".repeat(10)
    );
    console.log(`✅ [STEP 3] Test file created: ${testFilePath}\n`);

    // Step 4: Upload with express-fileupload compatible FormData
    console.log("📝 [STEP 4] Uploading file...");
    const form = new FormData();
    form.append("file", fs.createReadStream(testFilePath), "test-document.txt");

    const uploadRes = await fetch(`${API_URL}/api/medical-reports/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    console.log(`📊 Upload response status: ${uploadRes.status}`);
    const uploadData = await uploadRes.json();
    console.log("📄 Response:", JSON.stringify(uploadData, null, 2));

    if (!uploadData.success) {
      throw new Error(`Upload failed: ${uploadData.message}`);
    }

    console.log("\n✅ [SUCCESS] File uploaded successfully!");
    console.log(`   Report ID: ${uploadData.report.id}`);
    console.log(`   File Name: ${uploadData.report.fileName}`);
    console.log(`   File Size: ${uploadData.report.fileSize} bytes\n`);

    // Step 5: Verify upload by listing reports
    console.log("📝 [STEP 5] Verifying upload by listing reports...");
    const listRes = await fetch(`${API_URL}/api/medical-reports/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const listData = await listRes.json();
    console.log(`✅ [STEP 5] Found ${listData.reports.length} reports\n`);
    console.log(
      "📋 Latest report:",
      JSON.stringify(listData.reports[0], null, 2)
    );

    // Cleanup
    fs.unlinkSync(testFilePath);

    console.log("\n🎉 [TEST COMPLETE] All tests passed!\n");
  } catch (error) {
    console.error(`\n❌ [ERROR] ${error.message}\n`);
    process.exit(1);
  }
}

testUploadFlow();
