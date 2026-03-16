# 🏗️ SOS Feature - System Architecture & Data Flow

---

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PATIENT/USER DEVICE                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    React Frontend                             │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │              SOSFeature.jsx Component                  │ │ │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │ │
│  │  │  │ Emergency    │  │ Send SOS     │  │ View SOS       │ │ │
│  │  │  │ Contacts     │  │ Alert Panel  │  │ History        │ │ │
│  │  │  │ Setup        │  │              │  │                │ │ │
│  │  │  └──────────────┘  └──────────────┘  └────────────────┘ │ │
│  │  │           │                 │                │           │ │
│  │  │ ┌────────────────────────────┼────────────────┐          │ │
│  │  │ │    Geolocation API        │               │          │ │
│  │  │ │    Browser Storage        │               │          │ │
│  │  │ │    Local Validation       │               │          │ │
│  │  │ └────────────────────────────┼───────────────┘          │ │
│  │  └──────────────────────────────┼────────────────────────────┘ │
│  │                                 │                               │
│  └─────────────────────────────────┼───────────────────────────────┘
│                                    │ HTTPS
│                   ┌────────────────▼────────────────┐
│                   │  JSON Request with JWT Token   │
│                   │  {message, severity, location} │
│                   └────────────────┬────────────────┘
└─────────────────────────────────────┼────────────────────────────────┘
                                      │
         ┌────────────────────────────▼────────────────────────────┐
         │           EXPRESS SERVER (Node.js)                      │
         │                                                          │
         │  ┌──────────────────────────────────────────────────┐  │
         │  │          API Routes (/api/sos)                  │  │
         │  │  ┌──────────────────────────────────────────┐   │  │
         │  │  │  POST /send → sendSOSAlert              │   │  │
         │  │  │  POST /update-contacts                  │   │  │
         │  │  │  GET /config                            │   │  │
         │  │  │  GET /history                           │   │  │
         │  │  │  POST /test-telegram                    │   │  │
         │  │  └──────────────────────────────────────────┘   │  │
         │  └──────────────────┬───────────────────────────────┘  │
         │                     │                                   │
         │  ┌──────────────────▼──────────────────────────────┐  │
         │  │      SOS Controller (sosController.js)         │  │
         │  │  ┌──────────────────────────────────────────┐  │  │
         │  │  │  Validate request                        │  │  │
         │  │  │  Authenticate user (JWT)                 │  │  │
         │  │  │  Get emergency contacts from DB          │  │  │
         │  │  │  Format SOS message                      │  │  │
         │  │  │  Call Telegram Service                   │  │  │
         │  │  │  Log to database                         │  │  │
         │  │  │  Return response                         │  │  │
         │  │  └──────────────────────────────────────────┘  │  │
         │  └──────────────────┬───────────────────────────────┘  │
         │                     │                                   │
         │  ┌──────────────────▼──────────────────────────────┐  │
         │  │   Telegram Service (telegramService.js)        │  │
         │  │  ┌──────────────────────────────────────────┐  │  │
         │  │  │  formatSOSMessage()                      │  │  │
         │  │  │  sendTelegramMessage()                   │  │  │
         │  │  │  sendSOSToMultiple()                     │  │  │
         │  │  │  testTelegramConnection()                │  │  │
         │  │  │  Error handling & retry logic            │  │  │
         │  │  └──────────────────────────────────────────┘  │  │
         │  └──────────────────┬───────────────────────────────┘  │
         │                     │ HTTPS (10s timeout)              │
         └─────────────────────┼──────────────────────────────────┘
                               │
         ┌─────────────────────▼────────────────────────────┐
         │      PostgreSQL Database (Local)                 │
         │                                                  │
         │  ┌────────────────────────────────────────────┐ │
         │  │   SOS Alerts Table                         │ │
         │  │   - id                                     │ │
         │  │   - user_id (FK)                           │ │
         │  │   - message                                │ │
         │  │   - severity (LOW/MEDIUM/HIGH/CRITICAL)   │ │
         │  │   - location (JSONB)                       │ │
         │  │   - recipients_count                       │ │
         │  │   - successful_count                       │ │
         │  │   - failed_count                           │ │
         │  │   - status                                 │ │
         │  │   - timestamp                              │ │
         │  └────────────────────────────────────────────┘ │
         │                                                  │
         │  ┌────────────────────────────────────────────┐ │
         │  │   Medical History Table (Updated)          │ │
         │  │   - user_id (FK)                           │ │
         │  │   - emergency_contact JSONB                │ │
         │  │     {                                       │ │
         │  │       parent1_telegram_id: "...",           │ │
         │  │       parent2_telegram_id: "...",           │ │
         │  │       guardian_telegram_id: "..."           │ │
         │  │     }                                       │ │
         │  │   - ... other fields ...                    │ │
         │  └────────────────────────────────────────────┘ │
         │                                                  │
         └──────────────────────────────────────────────────┘
                               │
                               │
         ┌─────────────────────▼────────────────────────┐
         │     Telegram Bot API (Cloud Service)        │
         │     https://api.telegram.org/bot.../       │
         │                                              │
         │  ├─ sendMessage → Parent 1's Chat           │
         │  ├─ sendMessage → Parent 2's Chat           │
         │  ├─ sendMessage → Guardian's Chat           │
         │  └─ getUpdates (for incoming messages)      │
         │                                              │
         └──────────────────────────────────────────────┘
                               │
         ┌─────────────────────▼────────────────────────┐
         │     Parent/Guardian Devices (Telegram)       │
         │     ┌────────────────────────────────────┐   │
         │     │  Incoming SOS Notification         │   │
         │     │  🔔 User: John Doe                │   │
         │     │  🎯 Severity: HIGH                │   │
         │     │  📍 Location: [lat, long]         │   │
         │     │  💬 Message: "Emergency help..."  │   │
         │     │  ⏰ Time: 10:30:45 AM            │   │
         │     │                                    │   │
         │     │  [View on Map]  [Reply]            │   │
         │     └────────────────────────────────────┘   │
         │                                                │
         └────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow - Step by Step

### Scenario: User Sends SOS Alert

```
1. USER INITIATES SOS
   └─ Patient opens SOS Feature
   └─ Enters custom message (optional)
   └─ Selects severity level (MEDIUM/HIGH/CRITICAL)
   └─ Clicks "Get Location"
   └─ Browser requests geolocation
   └─ Clicks "Send SOS Alert"

2. CLIENT VALIDATION
   └─ Validates at least one contact configured
   └─ Validates message length (<500 chars)
   └─ Validates severity level (LOW/MEDIUM/HIGH/CRITICAL)
   └─ Adds location data (lat/long)
   └─ Adds timestamp
   └─ Creates JWT-authenticated request

3. NETWORK TRANSMISSION (HTTPS)
   ┌──────────────────────────────────────────────┐
   │ POST /api/sos/send HTTP/1.1                  │
   │ Authorization: Bearer {JWT_TOKEN}            │
   │ Content-Type: application/json               │
   │                                               │
   │ {                                            │
   │   "message": "I need help",                  │
   │   "severity": "HIGH",                        │
   │   "location": {                              │
   │     "latitude": 28.6139,                     │
   │     "longitude": 77.2090,                    │
   │     "address": "Delhi, India"                │
   │   }                                          │
   │ }                                            │
   └──────────────────────────────────────────────┘
                      │
4. SERVER RECEIVES REQUEST
   └─ Express middleware validates JWT token
   └─ Extracts user ID from token
   └─ Validates request body
   └─ Passes to sosController.sendSOSAlert()

5. CONTROLLER PROCESSING
   ├─ Get user info from database
   │  ├─ Name
   │  ├─ Email
   │  └─ Age (if available)
   │
   ├─ Get emergency contacts
   │  ├─ Query medical_history table
   │  └─ Extract Telegram IDs from JSONB field
   │
   ├─ Validate emergency contacts exist
   │  └─ If none: Return 400 error
   │
   └─ Prepare data for Telegram service

6. TELEGRAM SERVICE
   ├─ Format HTML message with:
   │  ├─ 🚨 SOS Alert header
   │  ├─ User information (name, email, age)
   │  ├─ Emergency details (message, severity)
   │  ├─ Location (coordinates + address)
   │  └─ Timestamp
   │
   ├─ Send to Parent 1 → Parent 1 receives in 1-2s
   ├─ Send to Parent 2 → Parent 2 receives in 1-2s
   ├─ Send to Guardian → Guardian receives in 1-2s
   │
   └─ Collect results:
      ├─ Count successful sends
      └─ Count failed sends

7. DATABASE LOGGING
   ├─ Insert record into sos_alerts table:
   │  ├─ user_id
   │  ├─ message
   │  ├─ severity
   │  ├─ location (JSON)
   │  ├─ recipients_count
   │  ├─ successful_count
   │  ├─ failed_count
   │  └─ timestamp
   │
   └─ Index by user_id and timestamp for fast queries

8. RESPONSE TO CLIENT
   ┌──────────────────────────────────────────────┐
   │ HTTP/1.1 200 OK                              │
   │ Content-Type: application/json               │
   │                                               │
   │ {                                            │
   │   "success": true,                           │
   │   "message": "SOS alert sent to 3 contact(s)",
   │   "details": {                               │
   │     "totalRecipients": 3,                    │
   │     "successfulRecipients": 3,               │
   │     "failedRecipients": 0,                   │
   │     "severity": "HIGH",                      │
   │     "timestamp": "2025-11-08T10:30:00Z"      │
   │   }                                          │
   │ }                                            │
   └──────────────────────────────────────────────┘
                      │
9. CLIENT NOTIFICATION
   ├─ Show success message
   ├─ Display sent-to count
   ├─ Refresh SOS history
   └─ Auto-hide modal after 5 seconds

10. PARENTS/GUARDIANS RECEIVE
    ├─ Telegram notification appears
    ├─ Rich HTML formatted message
    ├─ Clickable location link (if GPS included)
    ├─ Can reply to acknowledge
    └─ Can forward to emergency services
```

---

## 🗄️ Database Schema

```sql
-- SOS Alerts Table
CREATE TABLE sos_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    location JSONB,                    -- {"latitude": 28.6, "longitude": 77.2, "address": "..."}
    recipients_count INTEGER,
    successful_count INTEGER,
    failed_count INTEGER,
    status VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sos_user_id ON sos_alerts(user_id);
CREATE INDEX idx_sos_timestamp ON sos_alerts(timestamp DESC);
CREATE INDEX idx_sos_severity ON sos_alerts(severity);

-- Medical History (Updated)
ALTER TABLE medical_history
ADD COLUMN emergency_contact JSONB;

-- Example emergency_contact structure:
{
  "parent1_name": "Mother",
  "parent1_phone": "+91-98765-43210",
  "parent1_telegram_id": "1234567890",
  "parent1_email": "mother@example.com",

  "parent2_name": "Father",
  "parent2_phone": "+91-87654-32109",
  "parent2_telegram_id": "0987654321",
  "parent2_email": "father@example.com",

  "guardian_name": "Uncle",
  "guardian_phone": "+91-76543-21098",
  "guardian_telegram_id": "5555555555",
  "guardian_email": "uncle@example.com",

  "last_updated": "2025-11-08T10:00:00Z"
}
```

---

## 🔐 Authentication & Security Flow

```
USER LOGIN
    │
    ├─ POST /api/auth/login
    ├─ Email + Password
    └─ Server validates & generates JWT
            │
            ▼
    JWT Token received (expires in 24h)
            │
            ├─ Stored in localStorage
            ├─ Sent in Authorization header
            └─ Used for all SOS requests

ACCESSING SOS FEATURE
    │
    ├─ GET /api/sos/config
    │   ├─ Check Authorization header
    │   ├─ Verify JWT signature
    │   ├─ Validate token not expired
    │   ├─ Extract user ID from token
    │   └─ Return user's emergency contacts
    │
    ├─ POST /api/sos/send
    │   ├─ Verify JWT (same as above)
    │   ├─ Validate user exists
    │   ├─ Check user has emergency contacts
    │   └─ Send SOS to verified contacts only
    │
    └─ GET /api/sos/history
        ├─ Verify JWT
        └─ Return only THIS user's alerts

NO JWT = 401 Unauthorized
INVALID JWT = 403 Forbidden
EXPIRED JWT = 401 Unauthorized
```

---

## 📱 Frontend Component Hierarchy

```
App.jsx
  │
  ├─ Route: /sos
  │   └─ ProtectedRoute
  │       └─ SOSFeature Component
  │           │
  │           ├─ State Management
  │           │  ├─ sosConfig (server config)
  │           │  ├─ emergencyContacts (form data)
  │           │  ├─ sosMessage (custom message)
  │           │  ├─ severity (alert level)
  │           │  ├─ location (GPS data)
  │           │  ├─ sosHistory (past alerts)
  │           │  ├─ loading (request status)
  │           │  └─ error/success (feedback)
  │           │
  │           ├─ useEffect Hooks
  │           │  ├─ Load SOS config on mount
  │           │  └─ Load SOS history on mount
  │           │
  │           ├─ Event Handlers
  │           │  ├─ loadSOSConfig()
  │           │  ├─ loadSOSHistory()
  │           │  ├─ handleUpdateContacts()
  │           │  ├─ handleSendSOS()
  │           │  ├─ handleTestTelegram()
  │           │  └─ getCurrentLocation()
  │           │
  │           └─ JSX Render
  │              ├─ Status Card (config overview)
  │              ├─ Emergency Contacts Form
  │              │  ├─ Parent 1 Input
  │              │  ├─ Parent 2 Input (optional)
  │              │  ├─ Guardian Input (optional)
  │              │  └─ Test buttons
  │              │
  │              ├─ Send SOS Form
  │              │  ├─ Severity selector
  │              │  ├─ Message textarea
  │              │  ├─ Location display
  │              │  └─ Send button
  │              │
  │              ├─ History Display
  │              │  └─ List of past SOS alerts
  │              │
  │              ├─ Error Messages (if any)
  │              └─ Success Notifications
```

---

## 🔄 API Call Sequence

```
SEQUENCE DIAGRAM: Complete SOS Flow

Client                  Server                  Database          Telegram
  │                       │                        │                  │
  ├─ Load page            │                        │                  │
  │ (SOSFeature mounted)  │                        │                  │
  │                       │                        │                  │
  └──────────────────────→ GET /api/sos/config    │                  │
                          ├─ Auth check           │                  │
                          └────────────────────→  Query              │
                                                medical_history
                                                ←────────────────
                          ←────────────────────────────────────────
  Response received       │                        │                  │
  Display config          │                        │                  │
  │                       │                        │                  │
  │ [User enters Telegram IDs]                     │                  │
  │                       │                        │                  │
  └──────────────────────→ POST /api/sos/          │                  │
                          update-contacts         │                  │
                          ├─ Validate             │                  │
                          └────────────────────→  Update
                                                medical_history
                                                ←────────────────
                          ←────────────────────────────────────────
  Contacts saved          │                        │                  │
  │                       │                        │                  │
  │ [User tests connection]                        │                  │
  │                       │                        │                  │
  └──────────────────────→ POST /api/sos/          │                  │
                          test-telegram           │                  │
                          ├─ Format message       │                  │
                          └────────────────────────────────────────→ Send
                                                                     Message
                                                                ←─────────
                          ←────────────────────────────────────────
  Test success            │                        │                  │
  User sees notification  │                        │                  │
  │                       │                        │                  │
  │ [User sends SOS]      │                        │                  │
  │                       │                        │                  │
  └──────────────────────→ POST /api/sos/send      │                  │
                          ├─ Validate JWT         │                  │
                          ├─ Get user info        │                  │
                          └────────────────────→  Query users &
                                                medical_history
                                                ←────────────────
                          ├─ Format message       │                  │
                          ├─ Prepare batch        │                  │
                          └────────────────────────────────────────→ Send 3
                          ├─ Log alert            │                  Messages
                          └────────────────────→  Insert
                                                sos_alerts
                                                ←────────────────
                          ├─ Collect results
                          └────────────────────
                          ←────────────────────────────────────────
  Success response        │                        │                  │
  Show results            │                        │                  │
  Refresh history         │                        │                  │
  │                       │                        │                  │
  └──────────────────────→ GET /api/sos/history   │                  │
                          ├─ Validate JWT         │                  │
                          └────────────────────→  Query
                                                sos_alerts
                                                ←────────────────
                          ←────────────────────────────────────────
  Display history         │                        │                  │
```

---

## ⚡ Performance Characteristics

```
Operation                    Time         Status
──────────────────────────────────────────────────
Update Emergency Contacts    ~200ms       Fast
Get SOS Config              ~150ms       Fast
Get SOS History (10 records) ~300ms       Fast
Test Telegram Connection    ~1-2s        Acceptable
Send SOS Alert (3 contacts) ~2-3s        Acceptable
Database Insert             ~50ms        Very Fast
Telegram API Call           ~1-2s        Network dependent
JSON Serialization          <1ms         Very Fast
JWT Validation              <1ms         Very Fast
```

---

## 🎯 Error Handling Flow

```
Request comes in
    │
    ├─ JWT Validation
    │  ├─ Invalid/Missing → 401 Unauthorized
    │  └─ Valid → Continue
    │
    ├─ User Lookup
    │  ├─ Not found → 404 User Not Found
    │  └─ Found → Continue
    │
    ├─ Input Validation
    │  ├─ Invalid format → 400 Bad Request
    │  └─ Valid → Continue
    │
    ├─ Database Query
    │  ├─ Connection error → 503 Service Unavailable
    │  ├─ Query error → 500 Internal Error
    │  └─ Success → Continue
    │
    ├─ Emergency Contacts Check
    │  ├─ None configured → 400 No Contacts
    │  └─ Found → Continue
    │
    ├─ Telegram Batch Send
    │  ├─ Partial failure → 200 OK (with counts)
    │  ├─ Total failure → 500 Send Failed
    │  └─ Success → Continue
    │
    └─ Return 200 OK with details
```

---

**This architecture ensures:**
✅ Secure authentication and authorization  
✅ Real-time alert delivery  
✅ Comprehensive audit trail  
✅ High availability and redundancy  
✅ Fast response times  
✅ Clear error handling  
✅ Scalable design
