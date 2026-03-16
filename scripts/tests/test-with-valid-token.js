// Get the token from the test output and use it for upload

const validToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcsImlhdCI6MTc2MjY2Mjc0MSwiZXhwIjoxNzYzMjY3NTQxfQ.ePntb7IIUt2iuWbKXpUq2s5WVTZlpM4fpKGj1N7McoY";

async function testUpload() {
  console.log("Testing upload with native FormData and valid token...\n");

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
          Authorization: `Bearer ${validToken}`,
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
