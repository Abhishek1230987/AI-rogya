#!/usr/bin/env node
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_URL = "http://localhost:5000";
const TEST_EMAIL = "upload-test@example.com";
const TEST_PASSWORD = "Test@12345";

async function test() {
  try {
    console.log("🚀 Testing Medical Reports Upload with express-fileupload\n");

    // Step 1: Register user
    console.log("📝 Step 1: Registering test user...");
    const regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Upload Tester",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: "user",
      }),
    });
    console.log(`   Status: ${regRes.status}`);

    // Step 2: Login
    console.log("\n📝 Step 2: Logging in...");
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    const loginData = await loginRes.json();
    if (!loginData.token) {
      throw new Error("No token from login");
    }
    const token = loginData.token;
    console.log(`   Token: ${token.substring(0, 30)}...`);

    // Step 3: Create test file
    console.log("\n📝 Step 3: Creating test file...");
    const testFile = path.join(__dirname, "test-medical-report.txt");
    fs.writeFileSync(testFile, "MEDICAL REPORT\n".repeat(20));
    console.log(`   File created: ${testFile}`);

    // Step 4: Upload with express-fileupload
    console.log("\n📝 Step 4: Uploading file...");
    const form = new FormData();
    form.append("file", fs.createReadStream(testFile), "medical-report.txt");

    const uploadRes = await fetch(`${API_URL}/api/medical-reports/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    console.log(`   Status: ${uploadRes.status}`);
    const uploadData = await uploadRes.json();

    if (!uploadData.success) {
      console.log("\n❌ Upload failed!");
      console.log(JSON.stringify(uploadData, null, 2));
      process.exit(1);
    }

    console.log("\n✅ Upload successful!");
    console.log(`   Report ID: ${uploadData.report.id}`);
    console.log(`   File Name: ${uploadData.report.fileName}`);
    console.log(`   File Size: ${uploadData.report.fileSize} bytes`);

    // Step 5: List reports
    console.log("\n📝 Step 5: Listing reports...");
    const listRes = await fetch(`${API_URL}/api/medical-reports/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const listData = await listRes.json();
    console.log(`   Found ${listData.reports.length} reports`);
    if (listData.reports.length > 0) {
      console.log(`   Latest: ${listData.reports[0].fileName}`);
    }

    // Cleanup
    fs.unlinkSync(testFile);

    console.log("\n🎉 All tests passed!\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
