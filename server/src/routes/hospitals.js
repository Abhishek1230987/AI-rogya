// Hospitals route - OpenStreetMap/Overpass provider
import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();
const OVERPASS_ENDPOINTS = [
  process.env.OVERPASS_API_URL,
  "https://overpass-api.de/api/interpreter",
].filter(Boolean);
const ENABLE_WEBSITE_SCRAPE =
  (process.env.ALLOW_WEBSITE_SCRAPE || "false").toLowerCase() === "true";
const ALLOW_SIMULATED =
  (process.env.ALLOW_SIMULATED || "false").toLowerCase() === "true";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cacheKey(lat, lng, radius, specialty) {
  return `${Math.round(Number(lat) * 10000)}/${Math.round(
    Number(lng) * 10000
  )}/${radius}/${(specialty || "").toLowerCase()}`;
}

async function queryOverpass(q) {
  for (const ep of OVERPASS_ENDPOINTS) {
    try {
      const resp = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(q)}`,
      });
      if (!resp.ok) continue;
      return await resp.json();
    } catch (err) {
      await sleep(200);
    }
  }
  return null;
}

function haversine(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

async function fetchNearbyOverpass(lat, lon, radius = 5000) {
  const q = `[out:json][timeout:25];(node(around:${radius},${lat},${lon})[amenity=hospital];way(around:${radius},${lat},${lon})[amenity=hospital];relation(around:${radius},${lat},${lon})[amenity=hospital];);out center tags;`;
  const data = await queryOverpass(q);
  if (!data || !data.elements) return [];
  return data.elements
    .map((el, i) => {
      const tags = el.tags || {};
      const latVal = el.lat || (el.center && el.center.lat) || null;
      const lonVal = el.lon || (el.center && el.center.lon) || null;
      return {
        id: el.id ? `osm_${el.type}_${el.id}` : `osm_${i}`,
        name: tags.name || tags.operator || `Hospital ${i + 1}`,
        address:
          [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:place"],
            tags["addr:suburb"],
            tags["addr:city"],
          ]
            .filter(Boolean)
            .join(", ") || null,
        phone: tags.phone || tags["contact:phone"] || null,
        website: tags.website || null,
        specialties: (tags.specialty || tags.department || "")
          .split(/[;,|/]/)
          .map((s) => s && s.trim())
          .filter(Boolean),
        raw: tags,
        location:
          latVal && lonVal
            ? { lat: Number(latVal), lng: Number(lonVal) }
            : null,
      };
    })
    .filter((h) => h.location)
    .slice(0, 12)
    .map((h) => ({
      ...h,
      distance: haversine(lat, lon, h.location.lat, h.location.lng),
    }));
}

async function fetchDetailsByOsmId(id) {
  const parts = id.split("_");
  if (parts.length < 3) return null;
  const type = parts[1];
  const num = parts.slice(2).join("_");
  const q = `[out:json][timeout:15];${type}(${num});out tags center;`;
  const data = await queryOverpass(q);
  if (!data || !data.elements || !data.elements.length) return null;
  const el = data.elements[0];
  const tags = el.tags || {};
  const latVal = el.lat || (el.center && el.center.lat) || null;
  const lonVal = el.lon || (el.center && el.center.lon) || null;
  return {
    id,
    name: tags.name || tags.operator || null,
    address:
      [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:place"],
        tags["addr:suburb"],
        tags["addr:city"],
      ]
        .filter(Boolean)
        .join(", ") || null,
    phone: tags.phone || tags["contact:phone"] || null,
    website: tags.website || null,
    opening_hours: tags.opening_hours || null,
    specialties: (tags.specialty || tags.department || "")
      .split(/[;,|/]/)
      .map((s) => s && s.trim())
      .filter(Boolean),
    raw: tags,
    location:
      latVal && lonVal ? { lat: Number(latVal), lng: Number(lonVal) } : null,
    source: "OpenStreetMap",
  };
}

async function scrapeWebsiteForContact(website) {
  if (!website) return null;
  try {
    const resp = await fetch(website, { method: "GET" });
    if (!resp.ok) return null;
    const text = await resp.text();
    const telMatch = text.match(/href=["']\s*tel:([^"'<>\s]+)/i);
    if (telMatch && telMatch[1])
      return String(telMatch[1]).replace(/[^+0-9]/g, "");
  } catch (e) {}
  return null;
}

async function enrichPhoneProximity(h) {
  if (!h || h.phone) return h;
  if (!h.location) return h;
  try {
    const q = `[out:json][timeout:10];(node(around:400,${h.location.lat},${h.location.lng})[phone];way(around:400,${h.location.lat},${h.location.lng})[phone];relation(around:400,${h.location.lat},${h.location.lng})[phone];);out tags;`;
    const data = await queryOverpass(q);
    if (data && data.elements && data.elements.length) {
      for (const el of data.elements) {
        const tags = el.tags || {};
        const ph = tags.phone || tags["contact:phone"];
        if (ph) {
          h.phone = String(ph).replace(/[^+0-9]/g, "");
          return h;
        }
      }
    }
  } catch (e) {}
  return h;
}

async function enrichHospitalDetails(h) {
  const out = { ...h };
  if (!out.phone) {
    try {
      const ph = await enrichPhoneProximity(out);
      if (ph && ph.phone) out.phone = ph.phone;
    } catch (e) {}
    if (!out.phone && out.website && ENABLE_WEBSITE_SCRAPE) {
      try {
        const ph2 = await scrapeWebsiteForContact(out.website);
        if (ph2) out.phone = ph2;
      } catch (e) {}
    }
  }
  return out;
}

// Analyze medical context to suggest relevant hospital specialties
// Priority: 1. Uploaded Documents (extractedData), 2. Medical History, 3. Demographics
function analyzeMedicalContext(medicalHistory, uploadedDocuments = []) {
  const recommendations = {
    suggestedSpecialties: [],
    priorityLevel: "normal",
    allergiesNote: null,
    medicationsNote: null,
    chronicConditionsNote: null,
    diagnosisNote: null,
    documentSource: null,
  };

  // Comprehensive condition-to-specialty mapping (expanded)
  const conditionSpecialtyMap = {
    // Cardiovascular
    diabetes: ["endocrinology", "diabetes", "diabetic"],
    "type 1 diabetes": ["endocrinology", "diabetes", "diabetic"],
    "type 2 diabetes": ["endocrinology", "diabetes", "diabetic"],
    hypertension: ["cardiology", "cardiovascular", "cardiac"],
    "high blood pressure": ["cardiology", "cardiovascular"],
    "heart disease": ["cardiology", "cardiovascular", "cardiac"],
    "coronary artery": ["cardiology", "cardiac"],
    arrhythmia: ["cardiology", "cardiac"],
    "heart failure": ["cardiology", "cardiac"],
    "myocardial infarction": ["cardiology", "cardiac", "emergency"],
    "heart attack": ["cardiology", "cardiac", "emergency"],
    angina: ["cardiology", "cardiac"],

    // Respiratory
    asthma: ["pulmonology", "respiratory", "chest"],
    copd: ["pulmonology", "respiratory", "chest"],
    "chronic obstructive": ["pulmonology", "respiratory"],
    bronchitis: ["pulmonology", "respiratory"],
    pneumonia: ["pulmonology", "respiratory", "infectious"],
    tuberculosis: ["pulmonology", "respiratory", "infectious"],
    "lung disease": ["pulmonology", "respiratory"],

    // Renal/Kidney
    "kidney disease": ["nephrology", "renal", "kidney"],
    "renal failure": ["nephrology", "renal", "dialysis"],
    "chronic kidney": ["nephrology", "renal"],
    dialysis: ["nephrology", "renal", "dialysis"],
    "kidney stone": ["nephrology", "urology"],

    // Cancer/Oncology
    cancer: ["oncology", "cancer"],
    tumor: ["oncology", "cancer"],
    carcinoma: ["oncology", "cancer"],
    leukemia: ["oncology", "hematology", "cancer"],
    lymphoma: ["oncology", "hematology", "cancer"],
    malignancy: ["oncology", "cancer"],

    // Neurological
    stroke: ["neurology", "stroke", "neurological", "emergency"],
    epilepsy: ["neurology", "neurological"],
    seizure: ["neurology", "neurological"],
    parkinson: ["neurology", "neurological"],
    alzheimer: ["neurology", "neurological", "geriatric"],
    dementia: ["neurology", "neurological", "geriatric"],
    migraine: ["neurology", "neurological"],
    "multiple sclerosis": ["neurology", "neurological"],

    // Psychiatric/Mental Health
    depression: ["psychiatry", "mental health", "psychology"],
    anxiety: ["psychiatry", "mental health", "psychology"],
    bipolar: ["psychiatry", "mental health"],
    schizophrenia: ["psychiatry", "mental health"],
    ptsd: ["psychiatry", "mental health", "psychology"],

    // Orthopedic/Rheumatology
    arthritis: ["rheumatology", "orthopedic"],
    osteoarthritis: ["rheumatology", "orthopedic"],
    "rheumatoid arthritis": ["rheumatology"],
    fracture: ["orthopedic", "trauma"],
    osteoporosis: ["rheumatology", "orthopedic"],

    // Gastrointestinal
    "liver disease": ["gastroenterology", "hepatology"],
    cirrhosis: ["gastroenterology", "hepatology"],
    hepatitis: ["gastroenterology", "hepatology", "infectious"],
    crohn: ["gastroenterology"],
    colitis: ["gastroenterology"],
    ibs: ["gastroenterology"],
    "irritable bowel": ["gastroenterology"],
    pancreatitis: ["gastroenterology"],

    // Endocrine
    thyroid: ["endocrinology"],
    hypothyroid: ["endocrinology"],
    hyperthyroid: ["endocrinology"],
    adrenal: ["endocrinology"],

    // Others
    anemia: ["hematology"],
    "blood disorder": ["hematology"],
    infection: ["infectious disease"],
    sepsis: ["infectious disease", "critical care", "emergency"],
  };

  // PRIORITY 1: Extract from uploaded medical documents (HIGHEST PRIORITY)
  if (uploadedDocuments && uploadedDocuments.length > 0) {
    console.log("📄 Analyzing uploaded documents for medical context...");

    uploadedDocuments.forEach((doc) => {
      const extractedData = doc.extractedData || doc.extracted_info || {};

      // Extract diagnoses from documents
      if (extractedData.diagnosis || extractedData.diagnoses) {
        const diagnoses = Array.isArray(extractedData.diagnosis)
          ? extractedData.diagnosis
          : extractedData.diagnoses
          ? Array.isArray(extractedData.diagnoses)
            ? extractedData.diagnoses
            : [extractedData.diagnoses]
          : [extractedData.diagnosis];

        diagnoses.forEach((diagnosis) => {
          if (diagnosis) {
            const diagLower = String(diagnosis).toLowerCase();
            Object.entries(conditionSpecialtyMap).forEach(
              ([key, specialties]) => {
                if (diagLower.includes(key)) {
                  recommendations.suggestedSpecialties.push(...specialties);
                  recommendations.priorityLevel = "critical";
                }
              }
            );
          }
        });

        if (diagnoses.length > 0) {
          recommendations.diagnosisNote = `📋 Document diagnosis: ${diagnoses.join(
            ", "
          )}`;
        }
      }

      // Extract conditions from documents
      if (extractedData.conditions) {
        const docConditions = Array.isArray(extractedData.conditions)
          ? extractedData.conditions
          : [extractedData.conditions];

        docConditions.forEach((condition) => {
          if (condition) {
            const condLower = String(condition).toLowerCase();
            Object.entries(conditionSpecialtyMap).forEach(
              ([key, specialties]) => {
                if (condLower.includes(key)) {
                  recommendations.suggestedSpecialties.push(...specialties);
                  recommendations.priorityLevel = "critical";
                }
              }
            );
          }
        });
      }

      // Extract medications from documents (implies conditions)
      if (extractedData.medications && extractedData.medications.length > 0) {
        const docMeds = Array.isArray(extractedData.medications)
          ? extractedData.medications
          : [extractedData.medications];

        // Medication-to-condition inference
        const medConditionMap = {
          metformin: ["diabetes", "endocrinology"],
          insulin: ["diabetes", "endocrinology"],
          lisinopril: ["cardiology", "hypertension"],
          amlodipine: ["cardiology", "hypertension"],
          atorvastatin: ["cardiology"],
          aspirin: ["cardiology"],
          levothyroxine: ["endocrinology", "thyroid"],
          albuterol: ["pulmonology", "respiratory"],
          warfarin: ["cardiology", "hematology"],
          clopidogrel: ["cardiology"],
        };

        docMeds.forEach((med) => {
          const medLower = String(med).toLowerCase();
          Object.entries(medConditionMap).forEach(([key, specialties]) => {
            if (medLower.includes(key)) {
              recommendations.suggestedSpecialties.push(...specialties);
              if (recommendations.priorityLevel === "normal") {
                recommendations.priorityLevel = "high";
              }
            }
          });
        });

        if (!recommendations.medicationsNote) {
          recommendations.medicationsNote = `💊 Document medications: ${docMeds
            .slice(0, 5)
            .join(", ")}${docMeds.length > 5 ? "..." : ""}`;
        }
      }

      // Extract allergies from documents
      if (extractedData.allergies && extractedData.allergies.length > 0) {
        const docAllergies = Array.isArray(extractedData.allergies)
          ? extractedData.allergies
          : [extractedData.allergies];

        if (!recommendations.allergiesNote) {
          recommendations.allergiesNote = `⚠️ Document allergies: ${docAllergies.join(
            ", "
          )}`;
        }
      }
    });

    if (recommendations.suggestedSpecialties.length > 0) {
      recommendations.documentSource = `Recommendations based on ${uploadedDocuments.length} uploaded document(s)`;
    }
  }

  // PRIORITY 2: Medical History (Database/Manual Entry)
  if (medicalHistory) {
    // Analyze chronic conditions from medical history
    if (
      medicalHistory.chronicConditions &&
      medicalHistory.chronicConditions.length > 0
    ) {
      const conditions = Array.isArray(medicalHistory.chronicConditions)
        ? medicalHistory.chronicConditions
        : [medicalHistory.chronicConditions];

      conditions.forEach((condition) => {
        const condLower = String(condition).toLowerCase();
        Object.entries(conditionSpecialtyMap).forEach(([key, specialties]) => {
          if (condLower.includes(key)) {
            recommendations.suggestedSpecialties.push(...specialties);
            if (recommendations.priorityLevel === "normal") {
              recommendations.priorityLevel = "high";
            }
          }
        });
      });

      if (!recommendations.chronicConditionsNote) {
        recommendations.chronicConditionsNote = `📝 Medical history: ${conditions.join(
          ", "
        )}`;
      }
    }

    // Allergies from medical history
    if (
      medicalHistory.allergies &&
      medicalHistory.allergies.length > 0 &&
      !recommendations.allergiesNote
    ) {
      const allergies = Array.isArray(medicalHistory.allergies)
        ? medicalHistory.allergies
        : [medicalHistory.allergies];
      recommendations.allergiesNote = `⚠️ Known allergies: ${allergies.join(
        ", "
      )}`;
    }

    // Current medications from medical history
    if (
      medicalHistory.currentMedications &&
      medicalHistory.currentMedications.length > 0 &&
      !recommendations.medicationsNote
    ) {
      const meds = Array.isArray(medicalHistory.currentMedications)
        ? medicalHistory.currentMedications
        : [medicalHistory.currentMedications];
      recommendations.medicationsNote = `💊 Current medications: ${meds.join(
        ", "
      )}`;
    }
  }

  // Remove duplicates and sort by priority
  recommendations.suggestedSpecialties = [
    ...new Set(recommendations.suggestedSpecialties),
  ];

  console.log(
    `🏥 Medical context analyzed: ${recommendations.suggestedSpecialties.length} specialties suggested, priority: ${recommendations.priorityLevel}`
  );

  return recommendations;
}

// Rank hospitals based on medical context
function rankHospitalsByMedicalContext(hospitals, medicalContext) {
  if (!medicalContext || medicalContext.suggestedSpecialties.length === 0) {
    return hospitals;
  }

  return hospitals
    .map((h) => {
      let relevanceScore = 0;
      const hospitalSpecialtiesStr = (
        (h.specialties || []).join(" ") +
        " " +
        (h.name || "")
      ).toLowerCase();

      // Check if hospital has relevant specialties
      medicalContext.suggestedSpecialties.forEach((specialty) => {
        if (hospitalSpecialtiesStr.includes(specialty.toLowerCase())) {
          relevanceScore += 10;
        }
      });

      return { ...h, relevanceScore };
    })
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

function simulatedHospitals(lat, lng, specialty, radius) {
  const baseLat = Number(lat) || 0;
  const baseLng = Number(lng) || 0;
  const s = (specialty || "General").toString();
  return Array.from({ length: 6 }).map((_, i) => {
    const offset = (i + 1) * 0.005;
    return {
      id: `sim_${i}_${Math.floor(Date.now() / 1000)}`,
      name: `${s} Care Hospital ${i + 1}`,
      address: `Near landmark ${i + 1}`,
      location: { lat: baseLat + offset, lng: baseLng + offset },
      phone: null,
      website: null,
      opening_hours: null,
      specialties: [s],
      distance: haversine(baseLat, baseLng, baseLat + offset, baseLng + offset),
      source: "Simulated",
    };
  });
}

router.post("/nearby", async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      specialty,
      radius = 5000,
      onlyMatch = false,
      medicalHistory, // User's medical context
      userId, // User ID to fetch uploaded medical documents
    } = req.body || {};
    if (!latitude || !longitude)
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
        hospitals: [],
      });

    const key = cacheKey(latitude, longitude, radius, specialty);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS)
      return res.json({ ...cached.data, cached: true });

    let hospitals = [];
    try {
      hospitals = await fetchNearbyOverpass(latitude, longitude, radius);
    } catch (e) {
      console.warn("Overpass fetch error", e && (e.message || e));
    }
    if ((!hospitals || hospitals.length === 0) && ALLOW_SIMULATED) {
      hospitals = simulatedHospitals(latitude, longitude, specialty, radius);
    }

    const reqLower = (specialty || "").toLowerCase();
    const annotated = hospitals.map((h) => ({
      ...h,
      matches: reqLower
        ? (h.specialties || []).join(" ").toLowerCase().includes(reqLower) ||
          (h.name || "").toLowerCase().includes(reqLower)
        : false,
    }));
    const final = onlyMatch ? annotated.filter((x) => x.matches) : annotated;

    for (let i = 0; i < final.length; i++)
      final[i] = await enrichHospitalDetails(final[i]);

    // Fetch uploaded medical documents for the user (PRIORITY SOURCE)
    let uploadedDocuments = [];
    if (userId) {
      try {
        const { MedicalReportModel } = await import(
          "../models/DatabaseModels.js"
        );
        const reports = await MedicalReportModel.findByUserId(userId);

        // Parse extracted_info from each report
        uploadedDocuments = reports.map((report) => ({
          id: report.id,
          originalName: report.original_name,
          uploadedAt: report.uploaded_at,
          extractedData:
            typeof report.extracted_info === "string"
              ? JSON.parse(report.extracted_info)
              : report.extracted_info,
        }));

        console.log(
          `📄 Fetched ${uploadedDocuments.length} medical documents for user ${userId}`
        );
      } catch (err) {
        console.error("Error fetching medical documents:", err);
        // Continue without documents if fetch fails
      }
    }

    // Analyze medical context with BOTH uploaded documents AND medical history
    // Priority: Documents > Medical History > Demographics
    const medicalContext = analyzeMedicalContext(
      medicalHistory,
      uploadedDocuments
    );
    const rankedHospitals = rankHospitalsByMedicalContext(
      final,
      medicalContext
    );

    const payload = {
      success: true,
      hospitals: rankedHospitals,
      source:
        final.length && final[0].source === "OpenStreetMap"
          ? "OpenStreetMap"
          : "Simulated",
      count: rankedHospitals.length,
      medicalContext: {
        suggestedSpecialties: medicalContext.suggestedSpecialties,
        priorityLevel: medicalContext.priorityLevel,
        documentSource: medicalContext.documentSource, // Indicates if recommendations are from documents
        notes: [
          medicalContext.diagnosisNote, // From uploaded documents (highest priority)
          medicalContext.allergiesNote,
          medicalContext.medicationsNote,
          medicalContext.chronicConditionsNote,
        ].filter(Boolean),
      },
    };

    cache.set(key, { ts: Date.now(), data: payload });
    return res.json(payload);
  } catch (e) {
    console.error("/api/hospitals/nearby error", e);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby hospitals",
      hospitals: [],
    });
  }
});

router.post("/details", async (req, res) => {
  try {
    const { id, website, name, lat, lng } = req.body || {};
    if (id && typeof id === "string" && id.startsWith("osm_")) {
      const detail = await fetchDetailsByOsmId(id);
      if (detail) {
        const enriched = await enrichHospitalDetails(detail);
        return res.json({ success: true, details: enriched });
      }
    }
    if (website) {
      if (ENABLE_WEBSITE_SCRAPE) {
        try {
          const ph = await scrapeWebsiteForContact(website);
          if (ph)
            return res.json({
              success: true,
              details: {
                id: id || null,
                name: name || null,
                phone: ph,
                website,
              },
            });
        } catch (e) {}
      }
      return res
        .status(404)
        .json({ success: false, message: "details not found" });
    }
    return res
      .status(404)
      .json({ success: false, message: "details not found" });
  } catch (e) {
    console.error("/api/hospitals/details error", e);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch details" });
  }
});

export default router;
