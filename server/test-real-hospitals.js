import fetch from "node-fetch";

async function testRealHospitals() {
  console.log("🏥 Testing Real Hospital Fetching from OpenStreetMap\n");
  console.log(
    "======================================================================"
  );

  // Test locations with real hospitals
  const testLocations = [
    { name: "Delhi, India", lat: 28.6139, lng: 77.209 },
    { name: "Mumbai, India", lat: 19.076, lng: 72.8776 },
    { name: "Bangalore, India", lat: 12.9716, lng: 77.5946 },
  ];

  for (const location of testLocations) {
    console.log(`\n📍 Testing ${location.name}`);
    console.log(`   Coordinates: ${location.lat}, ${location.lng}\n`);

    try {
      console.log("🔄 Fetching hospitals from OpenStreetMap Overpass API...");

      const response = await fetch(
        "http://localhost:5000/api/hospitals/nearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: location.lat,
            longitude: location.lng,
            specialty: "general",
            radius: 5000, // 5km radius
          }),
          timeout: 60000, // 60 second timeout for real API
        }
      );

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`);
        const text = await response.text();
        console.error(text.substring(0, 200));
        continue;
      }

      const result = await response.json();

      console.log(`✅ Success!`);
      console.log(`   Source: ${result.source}`);
      console.log(`   Hospital Count: ${result.hospitals?.length || 0}\n`);

      if (result.hospitals && result.hospitals.length > 0) {
        console.log("🏥 Real Hospitals Found:\n");
        result.hospitals.slice(0, 5).forEach((hospital, i) => {
          console.log(`   ${i + 1}. ${hospital.name}`);
          console.log(`      Distance: ${hospital.distance}km`);
          console.log(`      Address: ${hospital.address || "N/A"}`);
          console.log(`      Phone: ${hospital.phone || "Not available"}`);
          console.log(`      Website: ${hospital.website || "N/A"}`);
          if (hospital.specialties && hospital.specialties.length > 0) {
            console.log(
              `      Specialties: ${hospital.specialties.join(", ")}`
            );
          }
          console.log();
        });
      } else {
        console.log(
          "⚠️  No hospitals found - checking if Overpass API is responding..."
        );
        console.log(`   Message: ${result.message || "Unknown"}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.code === "ECONNREFUSED") {
        console.error("   Backend server is not running!");
        console.error("   Start with: npm run server");
      }
    }

    console.log(
      "----------------------------------------------------------------------"
    );
  }

  console.log("\n✨ Test complete!");
  console.log("\n💡 Tips:");
  console.log(
    "   • If no hospitals found: Overpass API might be slow (try again)"
  );
  console.log("   • Real hospitals from OpenStreetMap (internet data)");
  console.log("   • Results cached for 10 minutes per location");
}

testRealHospitals();
