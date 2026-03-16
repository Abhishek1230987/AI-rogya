# 📊 Patient Context Data Structure

## Database Schema Used for Personalization

### 1. Medical History Table (`medical_history`)

```sql
CREATE TABLE medical_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),

  -- Main consultation data
  symptoms TEXT,
  diagnosis TEXT,
  prescription TEXT,
  doctor_notes TEXT,

  -- Demographics & background
  allergies TEXT[] (array of known allergies),
  chronic_conditions TEXT[] (array of chronic conditions),
  current_medications TEXT[] (array of current meds),
  family_history TEXT[] (array of family medical history),
  past_surgeries TEXT[] (array of past surgeries),
  blood_type VARCHAR(5),
  gender VARCHAR(20),
  date_of_birth DATE,

  -- Metadata
  language_used VARCHAR(10),
  transcription TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**What's Fetched:**

```javascript
// For personalized response
SELECT * FROM medical_history
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;

// For consultation history
SELECT symptoms, diagnosis, prescription, doctor_notes, created_at
FROM medical_history
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 5;
```

**Example Data:**

```
{
  id: 123,
  user_id: 45,
  symptoms: "Dizziness and fatigue",
  diagnosis: "Blood sugar spike",
  prescription: "Increase water intake, monitor glucose",
  doctor_notes: "Patient reported dizziness after skipping meal",

  allergies: ["Penicillin", "Aspirin", "Shellfish"],
  chronic_conditions: ["Type 2 Diabetes", "Hypertension", "Asthma"],
  current_medications: ["Metformin", "Lisinopril", "Albuterol inhaler"],
  family_history: ["Heart disease (father)", "Diabetes (mother)"],
  past_surgeries: ["Appendectomy (2015)"],

  blood_type: "O+",
  gender: "Male",
  date_of_birth: "1979-05-15",

  created_at: "2025-11-08T14:30:00Z"
}
```

---

### 2. Medical Reports Table (`medical_reports`)

```sql
CREATE TABLE medical_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),

  -- File metadata
  original_name VARCHAR(255),
  file_path VARCHAR(500),
  file_size BIGINT,
  document_type VARCHAR(50),

  -- Extracted data (stored as JSON)
  extracted_data JSONB,

  -- Metadata
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**What's Fetched:**

```javascript
SELECT id, original_name, document_type, extracted_data, uploaded_at
FROM medical_reports
WHERE user_id = $1
ORDER BY uploaded_at DESC
LIMIT 5;
```

**Example Data:**

```json
{
  "id": 789,
  "user_id": 45,
  "original_name": "Blood Test Report - Nov 2025.pdf",
  "document_type": "Lab Report",
  "extracted_data": {
    "testName": "Complete Blood Count",
    "dateOfTest": "2025-11-01",
    "vitals": [
      "Blood Pressure: 145/92 mmHg",
      "Temperature: 98.6°F",
      "Heart Rate: 78 bpm"
    ],
    "labResults": [
      {
        "testName": "Glucose",
        "value": 145,
        "unit": "mg/dL",
        "referenceRange": "70-100",
        "status": "High"
      },
      {
        "testName": "Hemoglobin A1C",
        "value": 8.2,
        "unit": "%",
        "referenceRange": "<5.7",
        "status": "High (Diabetic)"
      },
      {
        "testName": "Cholesterol",
        "value": 215,
        "unit": "mg/dL",
        "referenceRange": "<200",
        "status": "High"
      }
    ],
    "keyFindings": [
      "Elevated blood glucose indicating poor glycemic control",
      "Cholesterol slightly elevated",
      "Blood pressure in Stage 2 hypertension range"
    ],
    "recommendations": "Increase physical activity, dietary modifications, medication review"
  },
  "uploaded_at": "2025-11-01T10:00:00Z"
}
```

---

### 3. Combined Context Data Structure

**What Gets Built and Sent to Gemini:**

```javascript
userContext = {
  medicalHistory: {
    allergies: ["Penicillin", "Aspirin", "Shellfish"],
    chronicConditions: ["Type 2 Diabetes", "Hypertension", "Asthma"],
    currentMedications: ["Metformin", "Lisinopril", "Albuterol inhaler"],
    familyHistory: ["Heart disease (father)", "Diabetes (mother)"],
    pastSurgeries: ["Appendectomy (2015)"],
    bloodType: "O+",
    gender: "Male",
    dateOfBirth: "1979-05-15",
  },

  medicalReports: [
    {
      fileName: "Blood Test Report - Nov 2025.pdf",
      documentType: "Lab Report",
      uploadDate: "2025-11-01T10:00:00Z",
      extractedData: {
        vitals: ["BP: 145/92", "Temp: 98.6°F", "HR: 78 bpm"],
        labResults: [
          "Glucose: 145 mg/dL (High)",
          "Hemoglobin A1C: 8.2% (High - Diabetic)",
          "Cholesterol: 215 mg/dL (High)",
        ],
        keyFindings: [
          "Elevated blood glucose",
          "Cholesterol slightly elevated",
          "BP in Stage 2 hypertension range",
        ],
      },
    },
  ],

  consultationHistory: [
    {
      symptoms: "Dizziness and fatigue",
      diagnosis: "Blood sugar spike",
      prescription: "Increase water intake, monitor glucose",
      doctorNotes: "Patient reported dizziness after skipping meal",
      date: "2025-11-08T14:30:00Z",
    },
    {
      symptoms: "Chest tightness and wheezing",
      diagnosis: "Asthma flare-up",
      prescription: "Use rescue inhaler twice daily",
      doctorNotes: "Triggered by exposure to dust",
      date: "2025-11-05T11:00:00Z",
    },
    {
      symptoms: "Elevated blood pressure",
      diagnosis: "Hypertension management",
      prescription: "Continue Lisinopril, reduce salt intake",
      doctorNotes:
        "BP readings consistently high, lifestyle modification needed",
      date: "2025-11-01T09:00:00Z",
    },
  ],
};
```

---

## Context Building Flow

```
┌─────────────────────────────────────────────────────────┐
│ Patient Asks: "I have weakness and dizziness"           │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Identify User (userId = 45)                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Fetch Medical History                           │
├─────────────────────────────────────────────────────────┤
│ Query: SELECT * FROM medical_history                    │
│        WHERE user_id = 45 LIMIT 1                       │
├─────────────────────────────────────────────────────────┤
│ Result: Found chronic conditions, allergies, medications│
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Fetch Medical Reports (Last 5)                 │
├─────────────────────────────────────────────────────────┤
│ Query: SELECT * FROM medical_reports                    │
│        WHERE user_id = 45 ORDER BY uploaded_at DESC     │
│        LIMIT 5                                          │
├─────────────────────────────────────────────────────────┤
│ Result: Found blood test, vitals, lab results          │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: Fetch Consultation History (Last 5) ← NEW       │
├─────────────────────────────────────────────────────────┤
│ Query: SELECT symptoms, diagnosis, prescription,        │
│        doctor_notes, created_at                         │
│        FROM medical_history                             │
│        WHERE user_id = 45                               │
│        ORDER BY created_at DESC LIMIT 5                 │
├─────────────────────────────────────────────────────────┤
│ Result: Found previous consultations & treatments       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 5: Build Comprehensive Patient Context String      │
├─────────────────────────────────────────────────────────┤
│ "Patient's Comprehensive Medical Profile:              │
│                                                         │
│ **Known Allergies:** Penicillin, Aspirin, Shellfish     │
│ **Chronic Conditions:** Type 2 Diabetes, Hypertension   │
│ **Current Medications:** Metformin, Lisinopril          │
│ **Age:** 45 years                                       │
│ **Blood Type:** O+                                      │
│                                                         │
│ **Recent Medical Reports:**                             │
│ - Glucose: 145 mg/dL (High)                             │
│ - Hemoglobin A1C: 8.2% (High)                           │
│                                                         │
│ **Previous Consultations:**                             │
│ - Nov 8: Dizziness (blood sugar spike)                  │
│ - Nov 5: Chest tightness (asthma)"                      │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 6: Send to Gemini AI with Anti-Generic Rules       │
├─────────────────────────────────────────────────────────┤
│ Full Prompt:                                            │
│ - Patient query                                         │
│ - Comprehensive medical profile                         │
│ - Anti-generic rules (personalization required)         │
│ - Language preferences                                  │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 7: Gemini Generates Response                       │
├─────────────────────────────────────────────────────────┤
│ "Given your diabetes and current glucose of 145 mg/dL, │
│ weakness and dizziness often indicate blood sugar       │
│ fluctuations. AVOID aspirin/NSAIDs (you're allergic).   │
│ Check your glucose immediately. Since you're on         │
│ Metformin, ensure regular meals. If glucose < 70,      │
│ consume fast-acting carbs. Increase water intake."      │
│                                                         │
│ ✅ PERSONALIZED (references diabetes, glucose, meds)    │
│ ✅ SAFE (checks allergies)                              │
│ ✅ CONTEXTUAL (references previous dizziness)           │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Step 8: Return to User                                  │
└─────────────────────────────────────────────────────────┘
```

---

## SQL Queries Reference

### Query 1: Get Medical History

```sql
SELECT * FROM medical_history
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;
```

### Query 2: Get Medical Reports

```sql
SELECT id, original_name, document_type, extracted_data, uploaded_at
FROM medical_reports
WHERE user_id = $1
ORDER BY uploaded_at DESC
LIMIT 5;
```

### Query 3: Get Consultation History

```sql
SELECT symptoms, diagnosis, prescription, doctor_notes, created_at
FROM medical_history
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 5;
```

### Query 4: Get Full Context (Combined)

```sql
WITH medical_hist AS (
  SELECT * FROM medical_history
  WHERE user_id = $1 LIMIT 1
),
reports AS (
  SELECT id, original_name, document_type, extracted_data, uploaded_at
  FROM medical_reports
  WHERE user_id = $1
  ORDER BY uploaded_at DESC LIMIT 5
),
consultations AS (
  SELECT symptoms, diagnosis, prescription, doctor_notes, created_at
  FROM medical_history
  WHERE user_id = $1
  ORDER BY created_at DESC LIMIT 5
)
SELECT * FROM medical_hist, reports, consultations;
```

---

## Data Volume Optimization

| Query                    | Records    | Size  | Purpose             |
| ------------------------ | ---------- | ----- | ------------------- |
| Medical History          | 1 (latest) | ~2KB  | Current profile     |
| Medical Reports          | 5 (recent) | ~50KB | Medical context     |
| Consultation History     | 5 (recent) | ~10KB | Pattern recognition |
| **Total Sent to Gemini** | 11 records | ~62KB | Personalization     |

---

## Example: Complete Personalized Response

**User Query:** "I have a headache"

**Patient Context Passed to Gemini:**

```
Medical History:
- Hypertension (Chronic)
- Age: 45
- Medication: Lisinopril
- Allergy: Aspirin

Recent Report:
- BP: 155/95 mmHg (elevated)
- Date: 2025-11-08

Previous Consultation:
- Similar headache reported Nov 5
- Diagnosis: BP-related headache
- Treatment: Rest and hydration worked
```

**AI Generated Response:**

```
"Given your hypertension and recent BP reading of 155/95 mmHg,
this headache is likely BP-related (similar to your Nov 5 episode).

AVOID aspirin (you're allergic) - use acetaminophen instead.

Since you're on Lisinopril, ensure you're taking it daily.
Increase water intake and rest in a dark room. If accompanied by
vision changes or severe pain, seek urgent care immediately."
```

✅ **Personalized:** References hypertension, BP reading, medication, allergy, previous episode

---

**Status:** ✅ All data structures properly mapped and integrated
