# Medical Reports V2 UI Guide

## Page Location

**URL**: `http://localhost:5173/medical-reports-v2`

## Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         📋 Medical Reports                      │
│                 Upload and manage your medical documents         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ⚠️ Alert Messages (if any)                  │
│                  ✅ Success Messages (if any)                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    📤 Upload New Report                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Drag and drop your file here                              │ │
│  │              OR                                             │ │
│  │          [Select File Button]                              │ │
│  │  Supported: JPG, PNG, PDF, DOC, DOCX, TXT (Max 50MB)      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Selected Files Count]                                         │
│  File 1: report.jpg (2.50 MB)                                  │
│                                                                 │
│              [Upload File Button]                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────── ⭐ NEW ──────────────────────────┐
│          📊 Extracted Medical Information                        │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ 👤 Patient     │  │ 🏥 Conditions  │  │ 💊 Medications │  │
│  │ Information    │  │                │  │                │  │
│  │                │  │ • Type 2       │  │ • Metformin    │  │
│  │ Name: John     │  │   Diabetes     │  │   500mg x2     │  │
│  │ ID: P12345     │  │ • Hypertension │  │ • Lisinopril   │  │
│  │ Age: 45        │  │                │  │   10mg daily   │  │
│  │ DOB: 06/15/79  │  │                │  │                │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ ❤️ Vital Signs │  │ 🧪 Lab Results │  │ 👨‍⚕️ Doctor     │  │
│  │                │  │                │  │ Information    │  │
│  │ BP: 138/85     │  │ • Glucose:     │  │                │  │
│  │ HR: 72 bpm     │  │   145 mg/dL    │  │ Name:          │  │
│  │                │  │ • Cholesterol: │  │ Dr. Smith      │  │
│  │                │  │   220 mg/dL    │  │ Facility:      │  │
│  │                │  │                │  │ City Medical   │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  │
│                                                                 │
│  ┌────────────────┐  ┌──────────────────────────────────────┐ │
│  │ 📄 Report Type │  │ 🔍 Key Findings                      │ │
│  │                │  │                                      │ │
│  │ [Medical       │  │ Patient shows controlled diabetes    │ │
│  │  Report]       │  │ with stable hypertension management.│ │
│  │                │  │                                      │ │
│  └────────────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Your Reports (2)                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📄 report.jpg                              [⬇️] [🗑️]      │ │
│  │ 2.50 MB • 11/9/2025                                         │ │
│  │                                                              │ │
│  │ Click to expand and view analysis                           │ │
│  │ ┌──────────────────────────────────────────────────────┐  │ │
│  │ │ Patient Info: John Doe                               │  │ │
│  │ │ Conditions: Type 2 Diabetes, Hypertension            │  │ │
│  │ │ Medications: Metformin 500mg...                       │  │ │
│  │ │ Status: ✅ Analyzed                                   │  │ │
│  │ └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📄 old_report.jpg                         [⬇️] [🗑️]      │ │
│  │ 1.80 MB • 11/8/2025                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## New Analysis Section Details

### Card Colors & Icons

| Section      | Icon | Color  | Information           |
| ------------ | ---- | ------ | --------------------- |
| Patient Info | 👤   | Blue   | Name, ID, Age, DOB    |
| Conditions   | 🏥   | Red    | Medical diagnoses     |
| Medications  | 💊   | Green  | Drug names & dosages  |
| Vital Signs  | ❤️   | Yellow | BP, HR, Temp, etc     |
| Lab Results  | 🧪   | Purple | Test results & values |
| Doctor Info  | 👨‍⚕️   | Indigo | Physician & facility  |
| Report Type  | 📄   | Orange | Classification        |
| Key Findings | 🔍   | Cyan   | Clinical notes        |

### Interactive Features

1. **Upload Section**

   - Drag-and-drop enabled
   - File validation in real-time
   - Progress indication during upload

2. **Analysis Display**

   - Appears immediately after upload
   - Auto-scrolls into view
   - Smooth animation effect
   - Fully responsive grid layout

3. **Report Cards**
   - Click to expand/collapse
   - Shows previous uploads
   - Download & Delete options
   - Analysis preview on click

## Components Used

### Frontend (Client)

- **File**: `client/src/pages/MedicalReportsV2.jsx`
- **Libraries**: React, Framer Motion, Heroicons
- **State Management**: React hooks

### Backend (Server)

- **File**: `server/src/routes/medical-reports-v2.js`
- **Service**: `server/src/services/medicalAnalyzer.js`
- **OCR**: Tesseract.js
- **AI**: Google Gemini API

## Responsive Design

### Desktop (1024px+)

- 3-column grid for analysis cards
- Full width analysis section
- Side-by-side comparison possible

### Tablet (768px - 1023px)

- 2-column grid for analysis cards
- Adjusted padding and spacing
- Touch-friendly buttons

### Mobile (< 768px)

- 1-column grid for analysis cards
- Full-width cards
- Larger touch targets
- Optimized spacing

## States & Feedback

### Loading State

- Show loading spinner during upload
- "Uploading..." button text
- Disabled upload button

### Success State

- Green success message appears
- Analysis displays below upload
- Report added to list

### Error State

- Red error message appears
- Error details displayed
- Can retry upload

### Empty State

- "No reports yet" message when no uploads
- Encourages first upload
- Icon showing document

## Keyboard Navigation

- Tab: Navigate through buttons and inputs
- Enter: Submit form or trigger actions
- Escape: Close expanded report details
- Space: Toggle report expansion

## Accessibility Features

- ✅ ARIA labels on all buttons
- ✅ Semantic HTML structure
- ✅ Color contrast compliance
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ Alt text on all icons

## Performance Optimization

- Lazy load report list
- Virtual scrolling for many reports
- Memoized components
- Optimized re-renders
- Efficient state management

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers

---

**Component File**: `client/src/pages/MedicalReportsV2.jsx`  
**Last Updated**: November 9, 2025  
**Version**: 2.0 (With Analysis Display)
