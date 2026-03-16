import crypto from "crypto";

// Test full flow: register -> login -> upload

const BASE_URL = "http://localhost:5000";
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = "TestPassword123!";

async function register() {
  console.log("\n1️⃣ Registering user:", testEmail);
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email: testEmail,
      password: testPassword,
    }),
  });

  const data = await response.json();
  console.log("Response:", data);

  if (!response.ok) {
    console.error("Registration failed!");
    return null;
  }

  return data;
}

async function login() {
  console.log("\n2️⃣ Logging in:", testEmail);
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));

  if (!response.ok || !data.token) {
    console.error("Login failed!");
    return null;
  }

  return data.token;
}

async function upload(token) {
  console.log(
    "\n3️⃣ Uploading file with token:",
    token.substring(0, 30) + "..."
  );

  // Create multipart form data body properly with Buffer
  const boundary =
    "----WebKitFormBoundary" + Math.random().toString(36).substr(2, 16);
  const filename = "test-report.pdf";
  const mimeType = "application/pdf";
  const fileContent = Buffer.from("This is a test medical report PDF file.");

  // Build the body as Buffer parts
  const parts = [];

  // Add boundary and file metadata
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
  );

  // Add file content
  parts.push(fileContent);

  // Add closing boundary
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const response = await fetch(`${BASE_URL}/api/medical-reports/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": body.length.toString(),
    },
    body: body,
  });

  console.log("Status:", response.status);
  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));

  return response.ok;
}

async function testFlow() {
  try {
    // Register
    const regResult = await register();
    if (!regResult) return;

    // Wait a moment
    await new Promise((r) => setTimeout(r, 500));

    // Login
    const token = await login();
    if (!token) return;

    // Wait a moment
    await new Promise((r) => setTimeout(r, 500));

    // Upload
    const uploadOk = await upload(token);

    if (uploadOk) {
      console.log("\n✅ FULL FLOW SUCCESS!");
    } else {
      console.log("\n❌ Upload failed");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testFlow();
