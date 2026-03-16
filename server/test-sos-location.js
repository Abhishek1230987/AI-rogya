import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

async function testSOSWithLocation() {
  console.log("🧪 Testing SOS with Location Data\n");
  console.log(
    "======================================================================"
  );

  // Create a valid JWT token for user 10
  const token = jwt.sign({ id: 10 }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  console.log("✅ JWT Token generated for user 10");

  // Prepare location data (simulating browser geolocation)
  const location = {
    latitude: 28.6139, // Delhi coordinates as example
    longitude: 77.209,
    accuracy: 50,
    address: "Lat: 28.6139, Lng: 77.2090",
  };

  console.log(`\n📍 Location data: ${JSON.stringify(location, null, 2)}`);

  // Create FormData
  const form = new FormData();
  form.append("message", "Test SOS with location");
  form.append("severity", "HIGH");
  form.append("location", JSON.stringify(location));

  console.log("\n📤 Sending SOS request with location...");
  console.log(`   Endpoint: http://localhost:5000/api/sos/send`);
  console.log(`   User: 10`);

  try {
    const response = await fetch("http://localhost:5000/api/sos/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const data = await response.json();

    console.log(`\n📥 Response Status: ${response.status}`);
    console.log("Response Data:");
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("\n✅ SOS sent successfully!");
      console.log("💡 Location was included in the alert");
    } else {
      console.error("\n❌ SOS failed!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  console.log(
    "\n======================================================================"
  );
  console.log("🧪 Test complete!");
}

testSOSWithLocation();
