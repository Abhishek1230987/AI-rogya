#!/usr/bin/env node

// Quick test script to upload a file
import fetch from "node-fetch";
import fs from "fs";
import FormData from "form-data";

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzA4MDA0ODAwLCJleHAiOjE3MDgwOTE2MDB9.fake_token_replace_with_real";

async function testUpload() {
  try {
    // Create a small test file
    const testContent = Buffer.from("This is a test PDF file content");

    const form = new FormData();
    form.append("file", testContent, "test-report.pdf");

    const response = await fetch(
      "http://localhost:5000/api/medical-reports/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          ...form.getHeaders(),
        },
        body: form,
      }
    );

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testUpload();
