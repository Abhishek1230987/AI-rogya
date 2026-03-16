import jwt from "jsonwebtoken";

// Test using Node.js 18+ native FormData
const testToken = jwt.sign(
  { id: 17, email: "test@example.com" },
  "your-secret-key"
);

async function testUpload() {
  console.log("Testing upload with native FormData...\n");

  // Create a simple test file content
  const fileContent = new Blob(["This is a test PDF file content."], {
    type: "application/pdf",
  });

  // Create FormData
  const form = new FormData();
  form.append("file", fileContent, "test-report.pdf");

  try {
    const response = await fetch(
      "http://localhost:5000/api/medical-reports/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
        body: form,
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
