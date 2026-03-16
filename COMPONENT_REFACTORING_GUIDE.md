# Component Refactoring Guide

This guide explains how to split the large React components into smaller, more manageable pieces.

## Components to Refactor

### 1. VoiceConsultation.jsx (53KB)
**Location**: `client/src/pages/VoiceConsultation.jsx`
**Target**: `client/src/components/consultations/VoiceConsultation/`

**Suggested Split**:
```
VoiceConsultation/
├── index.jsx                 (Main component - 10-15KB)
├── RecorderPanel.jsx         (Audio recording interface)
├── ChatSection.jsx           (Chat messages display)
├── TranscriptionPanel.jsx    (Transcription and text features)
└── AudioPlayer.jsx           (Audio playback component)
```

**Refactoring Steps**:
1. Read VoiceConsultation.jsx and identify logical sections
2. Create each sub-component file
3. Move relevant JSX and handlers to each sub-component
4. Update imports in index.jsx
5. Test thoroughly in browser: voice recording, playback, chat
6. Verify all WebRTC and Socket.IO connections work
7. Check mobile responsiveness
8. Update any page-level imports to point to new location

---

### 2. MedicalReportsV2.jsx (42KB)
**Location**: `client/src/pages/MedicalReportsV2.jsx`
**Target**: `client/src/components/medical/MedicalReportsV2/`

**Suggested Split**:
```
MedicalReportsV2/
├── index.jsx               (Main component - 10-15KB)
├── UploadPanel.jsx        (File upload interface)
├── AnalysisResults.jsx     (Display analysis results)
├── ExtractedData.jsx       (Show extracted patient info)
└── DocumentViewer.jsx      (Display uploaded documents)
```

**Refactoring Steps**:
1. Read MedicalReportsV2.jsx and identify sections
2. Create each sub-component
3. Move upload logic to UploadPanel.jsx
4. Move result display logic to AnalysisResults.jsx
5. Move extracted data display to ExtractedData.jsx
6. Update imports in index.jsx
7. Test file uploads (both images and PDFs)
8. Test OCR and AI analysis functionality
9. Verify data extraction works correctly
10. Check error handling and loading states
11. Update any imports in pages/ that reference this component

---

### 3. MedicalHistory.jsx (32KB+)
**Location**: `client/src/pages/MedicalHistory.jsx`
**Target**: `client/src/components/medical/MedicalHistory/`

**Suggested Split**:
```
MedicalHistory/
├── index.jsx               (Main component)
├── PatientInfo.jsx        (Personal information form)
├── MediationsList.jsx      (Medications section)
├── AllergiesSection.jsx    (Allergies section)
├── FamilyHistoryForm.jsx   (Family history form)
└── EmergencyContacts.jsx   (Emergency contacts)
```

---

### 4. MedicalReports.jsx (30KB+)
**Location**: `client/src/pages/MedicalReports.jsx`
**Target**: `client/src/components/medical/MedicalReports/`

**Suggested Split**:
```
MedicalReports/
├── index.jsx               (Main component)
├── ReportList.jsx         (List of reports)
├── ReportDetail.jsx       (Single report view)
├── ReportForm.jsx         (Add/edit report form)
└── ReportFilter.jsx       (Filter and search)
```

---

## General Refactoring Process

### 1. **Analysis Phase**
```javascript
// Read the component and identify:
// - State variables and their purpose
// - Event handlers and related logic
// - Different visual sections
// - Map these to potential sub-components
```

### 2. **Planning Phase**
- Create a breakdown document
- List which state goes where
- Identify shared state (Context? Props?)
- Plan prop drilling or state management solution

### 3. **Implementation Phase**
```javascript
// Step-by-step:
// 1. Create sub-component files
// 2. Copy relevant JSX
// 3. Copy related state and handlers
// 4. Update imports
// 5. Pass data via props
// 6. Test in isolation first
```

### 4. **Testing Phase**
```bash
# Before splitting:
npm run dev
# Test all features manually in browser

# After each sub-component:
npm run dev
# Test that sub-component in isolation
# Test communication with parent component

# After complete refactoring:
npm run dev
# Full integration testing
# Mobile responsiveness check
# Console for errors
```

### 5. **Common Issues & Solutions**

**Issue**: State not updating
```javascript
// Solution: Ensure prop changes trigger re-renders
// Use useCallback for handler functions
// Consider Context API if multiple components need same state
```

**Issue**: Handlers not working
```javascript
// Solution: Make sure handlers are passed as props
// Bind context correctly (arrow functions or .bind())
// Check that event.preventDefault() is called where needed
```

**Issue**: WebRTC/Socket.IO breaks
```javascript
// Solution: Don't move WebRTC initialization
// Keep it in parent or specific connection component
// Only move UI components around actual connection
```

---

## Example Refactoring

Here's an example of how to split a component:

### Original (Large Component)
```jsx
// VoiceConsultation.jsx (53KB)
export default function VoiceConsultation() {
  const [recording, setRecording] = useState(false)
  const [messages, setMessages] = useState([])
  const [transcription, setTranscription] = useState('')

  const startRecording = () => { /* ... */ }
  const stopRecording = () => { /* ... */ }
  const sendMessage = () => { /* ... */ }

  return (
    <div>
      {/* Recording UI */}
      <button onClick={startRecording}>Start</button>

      {/* Chat Messages */}
      <div>
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
      </div>

      {/* Transcription */}
      <div>{transcription}</div>
    </div>
  )
}
```

### After Refactoring (Smaller Components)
```jsx
// VoiceConsultation/index.jsx
export default function VoiceConsultation() {
  const [recording, setRecording] = useState(false)
  const [messages, setMessages] = useState([])
  const [transcription, setTranscription] = useState('')

  const startRecording = () => { /* ... */ }
  const stopRecording = () => { /* ... */ }
  const sendMessage = () => { /* ... */ }

  return (
    <div>
      <RecorderPanel
        recording={recording}
        onStart={startRecording}
        onStop={stopRecording}
      />
      <ChatSection messages={messages} />
      <TranscriptionPanel text={transcription} />
    </div>
  )
}

// VoiceConsultation/RecorderPanel.jsx
function RecorderPanel({ recording, onStart, onStop }) {
  return (
    <div>
      <button onClick={onStart} disabled={recording}>
        Start Recording
      </button>
      <button onClick={onStop} disabled={!recording}>
        Stop Recording
      </button>
    </div>
  )
}

// VoiceConsultation/ChatSection.jsx
function ChatSection({ messages }) {
  return (
    <div>
      {messages.map(msg => (
        <MessageBubble key={msg.id} msg={msg} />
      ))}
    </div>
  )
}
```

---

## Testing Checklist

After refactoring each component:

- [ ] Component renders without errors
- [ ] All buttons and inputs work
- [ ] Data displays correctly
- [ ] Forms submit correctly
- [ ] API calls still work
- [ ] WebRTC/Socket connections maintained
- [ ] Responsive on mobile
- [ ] No console errors
- [ ] State updates work correctly
- [ ] Event handlers fire as expected
- [ ] Page performance is acceptable

---

## Tools & Resources

**React DevTools**:
- Check component hierarchy
- Verify props are passed correctly
- Monitor state changes

**Browser DevTools**:
- Check for JavaScript errors
- Monitor network requests
- Profile component performance

**Testing Library** (when ready):
- Write unit tests for sub-components
- Test component integration

---

## Important Notes

⚠️ **Do NOT**:
- Refactor multiple components simultaneously
- Skip browser testing
- Move WebRTC/Socket.IO initialization carelessly
- Ignore console errors
- Change functionality during refactoring

✅ **DO**:
- Test after each component split
- Commit frequently: `git add . && git commit -m "refactor: split [ComponentName]"`
- Ask for help if stuck
- Keep backups (they're in git!)

---

## After Refactoring

Once components are split:
1. Run full test suite (if you add tests)
2. Perform full integration testing
3. Test on multiple browsers
4. Test on mobile devices
5. Check WebRTC video/audio quality
6. Verify all AI features (medical analysis) still work
7. Create a commit: `git commit -m "refactor: split large components"`
8. Create a PR if using git flow

---

## Questions?

Refer back to specific component sections above or check React documentation.

Remember: **Smaller components = easier to test, maintain, and modify**!

