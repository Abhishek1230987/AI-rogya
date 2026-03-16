import jwt from "jsonwebtoken";

// Create a test token for user 6
const testToken = jwt.sign(
  { id: 6, email: "test@example.com" },
  "your-secret-key"
);

console.log("Test Token:", testToken);
console.log("");

// Create a test file
const testFileContent = Buffer.from("This is a test medical report PDF file.");

async function testUpload() {
  console.log("📤 Testing upload...\n");

  // Create multipart form data body manually
  const boundary =
    "----WebKitFormBoundary" + Math.random().toString(36).substr(2, 16);
  const filename = "test-report.pdf";
  const mimeType = "application/pdf";

  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    testFileContent.toString() +
    `\r\n--${boundary}--\r\n`;

  try {
    const response = await fetch(
      "http://localhost:5000/api/medical-reports/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${testToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
      }
    );

    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testUpload();
