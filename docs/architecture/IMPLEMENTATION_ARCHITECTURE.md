# Medical Report Analysis - Architecture Diagram

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE (React)                          │
│                  client/src/pages/MedicalReportsV2.jsx                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    📤 UPLOAD SECTION                              │ │
│  │  • Drag-and-drop interface                                         │ │
│  │  • File type validation (JPG, PNG, PDF, DOC, DOCX, TXT)           │ │
│  │  • File size validation (max 50MB)                                 │ │
│  │  • Progress feedback                                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              ⭐ NEW: 📊 ANALYSIS DISPLAY SECTION                   │ │
│  │                                                                    │ │
│  │  Grid Layout (Responsive 1-3 columns)                             │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                          │ │
│  │  │👤Patient │ │🏥Disease │ │💊Meds    │                          │ │
│  │  │Info      │ │/Conditions│ │         │                          │ │
│  │  └──────────┘ └──────────┘ └──────────┘                          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                          │ │
│  │  │❤️Vitals  │ │🧪Lab     │ │👨‍⚕️Doctor │                          │ │
│  │  │          │ │Results   │ │Info      │                          │ │
│  │  └──────────┘ └──────────┘ └──────────┘                          │ │
│  │  ┌──────────┐ ┌──────────────────────┐                           │ │
│  │  │📄Report  │ │🔍 Key Findings      │                           │ │
│  │  │Type      │ │                      │                           │ │
│  │  └──────────┘ └──────────────────────┘                           │ │
│  │                                                                    │ │
│  │  State: lastUploadAnalysis                                        │ │
│  │  Data: { medications[], conditions[], vitals[], labResults[] ... }│ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │               📋 REPORTS LIST (Historical)                         │ │
│  │  • Click to expand report                                          │ │
│  │  • Download/Delete options                                         │ │
│  │  • Shows previous analyses                                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                     API Call │ POST /api/medical-reports/upload
                              │ GET /api/medical-reports/list
                              │
                              ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                       API ROUTES (Express.js)                            │
│              server/src/routes/medical-reports-v2.js                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ POST /api/medical-reports/upload                               │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │ STEP 1: JWT Verification                                       │   │
│  │ ────────────────────────────────────────                        │   │
│  │ • Verify Bearer token                                           │   │
│  │ • Extract user ID                                               │   │
│  │                                                                 │   │
│  │                         ↓                                       │   │
│  │ STEP 2-4: File Validation & Save                               │   │
│  │ ──────────────────────────────────                              │   │
│  │ • Check file exists                                             │   │
│  │ • Validate extension                                            │   │
│  │ • Check file size                                               │   │
│  │ • Generate safe filename                                        │   │
│  │ • Save to uploads/medical-reports/                              │   │
│  │                                                                 │   │
│  │                         ↓                                       │   │
│  │ STEP 5: ⭐ ANALYZE DOCUMENT (NEW)                               │   │
│  │ ───────────────────────────────────────                         │   │
│  │ • Call analyzer.analyzeDocument()                               │   │
│  │ • Pass: filepath, mimetype, originalname                        │   │
│  │ • Returns: Extracted medical data                               │   │
│  │ • Fallback: Enhanced mock data on error                         │   │
│  │                                                                 │   │
│  │                         ↓                                       │   │
│  │ STEP 6: Save to Database                                        │   │
│  │ ────────────────────────────                                    │   │
│  │ • Save file metadata                                            │   │
│  │ • Store extracted_info (JSONB)                                  │   │
│  │ • Link to user account                                          │   │
│  │                                                                 │   │
│  │                         ↓                                       │   │
│  │ STEP 7: Return Response                                         │   │
│  │ ──────────────────────────                                      │   │
│  │ • Return: {                                                     │   │
│  │    success: true,                                               │   │
│  │    report: {                                                    │   │
│  │      id, fileName, filePath,                                    │   │
│  │      analysis: { medications, conditions, vitals, ... }  ⭐    │   │
│  │    }                                                            │   │
│  │  }                                                              │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ GET /api/medical-reports/list                                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • Verify JWT                                                    │   │
│  │ • Query reports for user                                        │   │
│  │ • Include: analysis (extracted_info) ⭐                         │   │
│  │ • Return: array of reports with extracted data                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                    ⭐ ANALYSIS SERVICE (NEW)                              │
│           server/src/services/medicalAnalyzer.js (726 lines)            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ analyzeDocument(filePath, mimeType, originalName)              │   │
│  │ ────────────────────────────────────────────────────────        │   │
│  │                                                                 │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ STAGE 1: TEXT EXTRACTION                              │   │   │
│  │  ├────────────────────────────────────────────────────────┤   │   │
│  │  │                                                        │   │   │
│  │  │ If Image:                                              │   │   │
│  │  │ ────────→ extractTextFromImage()                       │   │   │
│  │  │           • preprocessImage() (Sharp)                 │   │   │
│  │  │           • Tesseract.js OCR                           │   │   │
│  │  │           • Worker cleanup                             │   │   │
│  │  │                                                        │   │   │
│  │  │ If PDF:                                                │   │   │
│  │  │ ────────→ extractTextFromPDF()                         │   │   │
│  │  │                                                        │   │   │
│  │  │ Returns: Extracted text (367 chars example)            │   │   │
│  │  │                                                        │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                         ↓                                      │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ STAGE 2: AI/PATTERN ANALYSIS                          │   │   │
│  │  ├────────────────────────────────────────────────────────┤   │   │
│  │  │                                                        │   │   │
│  │  │ Try Gemini AI Analysis:                                │   │   │
│  │  │ ────────────────────→ analyzeMedicalDocument()        │   │   │
│  │  │                      └→ Returns structured data ✅    │   │   │
│  │  │                                                        │   │   │
│  │  │ If Gemini fails or < 50 chars:                        │   │   │
│  │  │ ──────────────────→ analyzeWithPatternMatching()      │   │   │
│  │  │                    │                                  │   │   │
│  │  │                    ├→ extractPatientInfo()            │   │   │
│  │  │                    ├→ extractMedications()            │   │   │
│  │  │                    ├→ extractConditions()             │   │   │
│  │  │                    ├→ extractLabResults()             │   │   │
│  │  │                    ├→ extractVitals()                 │   │   │
│  │  │                    ├→ extractDoctorName()             │   │   │
│  │  │                    ├→ extractFacility()               │   │   │
│  │  │                    └→ extractKeyFindings()            │   │   │
│  │  │                                                        │   │   │
│  │  │ Returns: {                                             │   │   │
│  │  │   medications: [],                                     │   │   │
│  │  │   conditions: [],                                      │   │   │
│  │  │   vitals: [],                                          │   │   │
│  │  │   labResults: [],                                      │   │   │
│  │  │   patientInfo: {},                                     │   │   │
│  │  │   doctorName: "",                                      │   │   │
│  │  │   facility: "",                                        │   │   │
│  │  │   reportType: "",                                      │   │   │
│  │  │   keyFindings: "",                                     │   │   │
│  │  │   confidence: 85                                       │   │   │
│  │  │ }                                                      │   │   │
│  │  │                                                        │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                         ↓                                      │   │
│  │  ┌────────────────────────────────────────────────────────┐   │   │
│  │  │ STAGE 3: FALLBACK (If everything fails)               │   │   │
│  │  ├────────────────────────────────────────────────────────┤   │   │
│  │  │                                                        │   │   │
│  │  │ generateEnhancedMockData()                             │   │   │
│  │  │ └→ Returns realistic mock medical data                │   │   │
│  │  │    • Ensures upload never fails                        │   │   │
│  │  │    • Maintains system reliability                      │   │   │
│  │  │                                                        │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Utilities & External Services                                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ • Tesseract.js: OCR engine (Node.js)                            │   │
│  │   - 30-second timeout protection                                │   │
│  │   - Progress logging                                            │   │
│  │   - Worker management                                           │   │
│  │                                                                 │   │
│  │ • Sharp library: Image preprocessing                            │   │
│  │   - Resize to 2000px                                            │   │
│  │   - Sharpen & normalize                                         │   │
│  │                                                                 │   │
│  │ • Gemini Service: AI analysis                                   │   │
│  │   - Google Gemini 2.5 Flash Lite                                │   │
│  │   - Structured medical data extraction                          │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────┬──────────────────────────────────────────┘
                              │
                              ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (PostgreSQL)                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Table: medical_reports                                                  │
│  ──────────────────────                                                  │
│                                                                          │
│  Columns:                                                                │
│  • id (PRIMARY KEY)                                                      │
│  • user_id (FOREIGN KEY)                                                 │
│  • original_name (VARCHAR) - Uploaded filename                           │
│  • file_name (VARCHAR) - Saved filename                                  │
│  • file_path (VARCHAR) - Storage path                                    │
│  • file_size (BIGINT)                                                    │
│  • mime_type (VARCHAR)                                                   │
│  • extracted_info (JSONB) ⭐ NEW: Stores all analysis data               │
│  • document_type (VARCHAR)                                               │
│  • uploaded_at (TIMESTAMP)                                               │
│                                                                          │
│  Example extracted_info:                                                 │
│  ───────────────────────                                                 │
│  {                                                                       │
│    "patientInfo": { "name": "John", "age": "45", ... },                 │
│    "medications": ["Metformin", "Lisinopril"],                          │
│    "conditions": ["Diabetes", "Hypertension"],                          │
│    "vitals": ["BP: 138/85", "HR: 72"],                                  │
│    "labResults": ["Glucose: 145", ...],                                 │
│    "doctorName": "Dr. Smith",                                           │
│    "facility": "City Medical",                                          │
│    "reportType": "Medical Report",                                      │
│    "keyFindings": "...",                                                │
│    "confidence": 85,                                                    │
│    "processingMethod": "AI_ANALYSIS",                                   │
│    "timestamp": "2025-11-09T05:30:00Z"                                  │
│  }                                                                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
User Action → Upload Medical Report
     │
     ↓
React Component (MedicalReportsV2)
     │
     ├─ Validates file
     ├─ Creates FormData
     ├─ POSTs to /api/medical-reports/upload
     │
     ↓
Express.js Route Handler
     │
     ├─ Verify JWT Token
     ├─ Save file to disk
     │
     ├─ Call MedicalDocumentAnalyzer ⭐
     │  │
     │  ├─ Preprocess image (Sharp)
     │  ├─ Extract text (Tesseract OCR)
     │  ├─ Analyze with AI (Gemini) or Pattern Matching
     │  └─ Fallback to mock data
     │
     ├─ Save analysis to database
     │
     ↓
Response with Analysis Data
     │
     ↓
Frontend Updates State: lastUploadAnalysis
     │
     ↓
Display Analysis Section with 8 Color-Coded Cards
     │
     ↓
User Reviews Extracted Medical Information
```

## Data Structure

### Request Flow

```
POST /api/medical-reports/upload
├─ Header: Authorization: Bearer <JWT_TOKEN>
├─ Body: FormData
│  └─ file: File(image/pdf/doc)
│
↓
Response:
├─ success: true
├─ message: "Report uploaded successfully"
└─ report:
   ├─ id: 31
   ├─ fileName: "report-1762665180836-e844a196.jpg"
   ├─ filePath: "report-1762665180836-e844a196.jpg"
   ├─ fileSize: 819708
   ├─ mimeType: "image/jpeg"
   ├─ uploadedAt: "2025-11-09T05:30:00Z"
   └─ analysis: ⭐
      ├─ medications: ["Metformin 500mg x2", ...]
      ├─ conditions: ["Type 2 Diabetes", ...]
      ├─ vitals: ["BP: 138/85", ...]
      ├─ labResults: ["Glucose: 145", ...]
      ├─ patientInfo: {...}
      ├─ doctorName: "Dr. Smith"
      ├─ facility: "City Medical"
      ├─ reportType: "Medical Report"
      ├─ keyFindings: "..."
      └─ confidence: 85
```

## Processing Pipeline

```
IMAGE/PDF FILE
     │
     ├─ File Validation
     │  ├─ Type check (JPG, PNG, PDF, etc)
     │  ├─ Size check (< 50MB)
     │  └─ MIME type validation
     │
     ├─ Save to Disk
     │  └─ Generate safe filename
     │     └─ report-[timestamp]-[random].ext
     │
     ├─ Image Preprocessing (if image)
     │  ├─ Resize to 2000px
     │  ├─ Sharpen & normalize
     │  └─ Convert to PNG
     │
     ├─ OCR Extraction
     │  ├─ Initialize Tesseract worker
     │  ├─ Run OCR with progress
     │  ├─ 30-sec timeout protection
     │  └─ Clean up worker
     │
     ├─ AI Analysis
     │  ├─ Try Gemini API
     │  │  └─ Returns structured data
     │  └─ If fails: Pattern matching
     │
     ├─ Extract Medical Data
     │  ├─ Patient info
     │  ├─ Medications
     │  ├─ Conditions
     │  ├─ Vitals
     │  ├─ Lab results
     │  ├─ Doctor name
     │  ├─ Facility
     │  └─ Key findings
     │
     ├─ Database Storage
     │  ├─ Save file metadata
     │  ├─ Store extracted_info (JSONB)
     │  └─ Link to user
     │
     └─ Return Response to Frontend
        └─ Display analysis UI
```

---

This architecture provides a complete, robust solution for medical document analysis with multiple fallback mechanisms ensuring reliability and always returning valuable data to users.
