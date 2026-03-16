import fetch from "node-fetch";

async function testHospitals() {
  console.log("🏥 Testing Hospital API endpoint...\n");

  // Test with a specific location (Delhi, India)
  const testData = {
    latitude: 28.6139,
    longitude: 77.209,
    specialty: "general",
    radius: 5000,
  };

  console.log("📍 Test Location:");
  console.log(`   Latitude: ${testData.latitude}`);
  console.log(`   Longitude: ${testData.longitude}`);
  console.log(`   Specialty: ${testData.specialty}`);
  console.log(`   Radius: ${testData.radius}m\n`);

  try {
    console.log("🔄 Fetching nearby hospitals...");
    const response = await fetch("http://localhost:5000/api/hospitals/nearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
      timeout: 30000,
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status}`);
      const text = await response.text();
      console.error(text);
      process.exit(1);
    }

    const result = await response.json();

    console.log(`\n✅ Response received!`);
    console.log(`Success: ${result.success}`);
    console.log(`Source: ${result.source}`);
    console.log(`Hospital Count: ${result.hospitals?.length || 0}`);

    if (result.hospitals && result.hospitals.length > 0) {
      console.log("\n🏥 Hospitals Found:\n");
      result.hospitals.slice(0, 5).forEach((hospital, i) => {
        console.log(`${i + 1}. ${hospital.name}`);
        console.log(`   Distance: ${hospital.distance}km`);
        console.log(`   Address: ${hospital.address || "N/A"}`);
        console.log(`   Phone: ${hospital.phone || "N/A"}`);
        if (hospital.specialties && hospital.specialties.length > 0) {
          console.log(`   Specialties: ${hospital.specialties.join(", ")}`);
        }
        console.log();
      });
    } else {
      console.log("\n⚠️  No hospitals found!");
      console.log(`Message: ${result.message || "Unknown"}`);
    }
  } catch (error) {
    console.error("❌ Error testing hospital API:", error.message);
    process.exit(1);
  }
}

testHospitals();
