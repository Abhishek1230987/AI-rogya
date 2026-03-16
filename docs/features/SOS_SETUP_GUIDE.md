# 🚨 SOS Emergency Feature - Complete Setup Guide

**Version**: 1.0  
**Date**: November 8, 2025  
**Status**: ✅ Ready for Integration

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Telegram Bot Configuration](#telegram-bot-configuration)
5. [Database Migration](#database-migration)
6. [API Endpoints](#api-endpoints)
7. [Frontend Integration](#frontend-integration)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The SOS Emergency Feature allows patients to send emergency alerts to their parents/guardians via **Telegram** when they need urgent help. The system:

- ✅ Sends instant alerts with **location and severity level**
- ✅ Supports **multiple emergency contacts** (Parent 1, Parent 2, Guardian)
- ✅ Includes **custom messages** and **default emergency messages**
- ✅ Tracks **SOS history** for audit and emergency response
- ✅ Works as **fast failover** when WhatsApp/Twilio is unavailable
- ✅ Provides **location services** integration

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│                 ├── SOSFeature.jsx                           │
│                 ├── Emergency Contact Setup                  │
│                 ├── Location Detection                       │
│                 └── SOS Alert Sending                        │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────────────────────┐
│                  Backend (Node.js/Express)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SOS Routes (/api/sos)                               │  │
│  │  ├── POST /send ..................... Send SOS Alert │  │
│  │  ├── POST /update-contacts .... Update Emergency ID │  │
│  │  ├── GET /config ............ Get SOS Configuration │  │
│  │  ├── GET /history ............. Get SOS Alert History│  │
│  │  └── POST /test-telegram .... Test Connection      │  │
│  └──────────────────────────────────────────────────────┘  │
│                  │                                           │
│  ┌──────────────▼──────────────────────────────────────┐  │
│  │  SOS Controller (sosController.js)                  │  │
│  │  ├── Send SOS Alerts                               │  │
│  │  ├── Update Emergency Contacts                     │  │
│  │  ├── Fetch SOS History                             │  │
│  │  └── Test Telegram Connection                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                  │                                           │
│  ┌──────────────▼──────────────────────────────────────┐  │
│  │  Telegram Service (telegramService.js)             │  │
│  │  ├── Send Single Message                           │  │
│  │  ├── Send Batch Messages                           │  │
│  │  ├── Format SOS Messages                           │  │
│  │  └── Test Connection                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                  │                                           │
└──────────────────┼───────────────────────────────────────────┘
                   │ HTTPS (Telegram Bot API)
┌──────────────────▼───────────────────────────────────────────┐
│          PostgreSQL Database                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  sos_alerts Table                                      │  │
│  │  ├── id (Primary Key)                                 │  │
│  │  ├── user_id (FK to users)                            │  │
│  │  ├── message (Emergency message)                      │  │
│  │  ├── severity (LOW, MEDIUM, HIGH, CRITICAL)          │  │
│  │  ├── location (JSON with lat/long)                   │  │
│  │  ├── recipients_count                                │  │
│  │  ├── successful_count                                │  │
│  │  ├── status (sent, delivered, failed)               │  │
│  │  └── timestamp                                       │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  medical_history Table (Updated)                       │  │
│  │  ├── emergency_contact JSONB                          │  │
│  │  │   ├── parent1_telegram_id                          │  │
│  │  │   ├── parent2_telegram_id                          │  │
│  │  │   ├── guardian_telegram_id                         │  │
│  │  │   └── last_updated                                 │  │
│  │  └── ... existing fields ...                          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────┐
│            Telegram Bot API                                     │
│  Processes and delivers messages to emergency contacts         │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Setup Instructions

### Step 1: Install Required Dependencies

```bash
# Navigate to server directory
cd server

# Install axios for HTTP requests to Telegram
npm install axios
```

### Step 2: Create Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. **Send command**: `/newbot`
3. **Follow prompts** to create a new bot:
   - Bot name: "AIrogya SOS Bot" (or your choice)
   - Username: "airogya_sos_bot" (must be unique, ending with \_bot)
4. **Copy the Bot Token** - You'll need this!

**Example Bot Token**: `123456789:ABCDefGhIJKlmnoPQRstuvWXYZ`

### Step 3: Configure Environment Variables

Add to your `.env` file in the server directory:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE

# Example:
# TELEGRAM_BOT_TOKEN=123456789:ABCDefGhIJKlmnoPQRstuvWXYZ
```

### Step 4: Get Your Telegram Chat ID

1. **Send a message to your bot** (just type anything)
2. **Visit this URL** in your browser (replace token):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. **Look for your chat ID** in the response (usually a negative number for groups, positive for users)
4. **Or use the easy way**: Search for `@userinfobot` in Telegram and it will tell you your ID

### Step 5: Run Database Migration

```bash
# Navigate to server directory
cd server

# Connect to your PostgreSQL database
psql -U consultancy_user -d e_consultancy -f migrations/002_create_sos_alerts.sql

# Or run manually:
# psql -U consultancy_user -d e_consultancy
# Then paste the contents of migrations/002_create_sos_alerts.sql
```

**Or** let the app auto-initialize (it will create the table if it doesn't exist):

```bash
npm run server
```

### Step 6: Verify Installation

Check that these files exist:

- ✅ `server/src/services/telegramService.js`
- ✅ `server/src/controllers/sosController.js`
- ✅ `server/src/routes/sos.js`
- ✅ `server/migrations/002_create_sos_alerts.sql`
- ✅ `client/src/components/SOSFeature.jsx`

---

## 📱 Telegram Bot Configuration

### How to Get Your Telegram Chat ID

**Method 1: Using @userinfobot (Easiest)**

```
1. Search for @userinfobot in Telegram
2. Click "START"
3. Your User ID will be displayed instantly
```

**Method 2: Using Bot API**

```
1. Message your bot with anything
2. Visit: https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getUpdates
3. Look for "id": number in the response
```

### Bot Permissions

Your SOS Bot needs these permissions:

- ✅ Send Messages
- ✅ Send Location
- ✅ Edit Messages

**Default permissions are sufficient.**

### Testing the Bot

Send a test message to verify the bot token works:

```bash
curl -X POST \
  https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage \
  -d chat_id=YOUR_CHAT_ID \
  -d text="SOS Bot is working!"
```

---

## 💾 Database Migration

### Table: sos_alerts

```sql
CREATE TABLE sos_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    location JSONB,
    recipients_count INTEGER,
    successful_count INTEGER,
    failed_count INTEGER,
    status VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Updated: medical_history Table

The `emergency_contact` JSONB field now stores:

```json
{
  "parent1_telegram_id": "1234567890",
  "parent2_telegram_id": "0987654321",
  "guardian_telegram_id": "5555555555",
  "last_updated": "2025-11-08T10:00:00Z"
}
```

---

## 📡 API Endpoints

### 1. Send SOS Alert

**Endpoint**: `POST /api/sos/send`

**Authentication**: ✅ Required (JWT Token)

**Request Body**:

```json
{
  "message": "I'm in severe pain at the shopping mall",
  "severity": "HIGH",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "address": "New Delhi, India"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "SOS alert sent to 2 contact(s)",
  "details": {
    "totalRecipients": 2,
    "successfulRecipients": 2,
    "failedRecipients": 0,
    "severity": "HIGH",
    "timestamp": "2025-11-08T10:30:00Z"
  }
}
```

**Status Codes**:

- `200` - SOS sent successfully
- `400` - No emergency contacts configured
- `401` - Authentication required
- `500` - Server error

---

### 2. Update Emergency Contacts

**Endpoint**: `POST /api/sos/update-contacts`

**Authentication**: ✅ Required

**Request Body**:

```json
{
  "parent1_telegram_id": "1234567890",
  "parent2_telegram_id": "0987654321",
  "guardian_telegram_id": "5555555555"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Emergency contacts updated successfully",
  "contacts": {
    "parent1_configured": true,
    "parent2_configured": true,
    "guardian_configured": true
  }
}
```

---

### 3. Get SOS Configuration

**Endpoint**: `GET /api/sos/config`

**Authentication**: ✅ Required

**Response**:

```json
{
  "success": true,
  "telegramConfigured": true,
  "contacts": {
    "parent1": { "configured": true },
    "parent2": { "configured": true },
    "guardian": { "configured": false }
  },
  "totalConfigured": 2
}
```

---

### 4. Get SOS History

**Endpoint**: `GET /api/sos/history?limit=10&offset=0`

**Authentication**: ✅ Required

**Query Parameters**:

- `limit` - Number of records (default: 50, max: 100)
- `offset` - Pagination offset (default: 0)

**Response**:

```json
{
  "success": true,
  "alerts": [
    {
      "id": 1,
      "message": "I'm in severe pain",
      "severity": "HIGH",
      "location": { "latitude": 28.6139, "longitude": 77.209 },
      "recipients_count": 2,
      "successful_count": 2,
      "timestamp": "2025-11-08T10:30:00Z"
    }
  ],
  "totalAlerts": 15,
  "limit": 10,
  "offset": 0
}
```

---

### 5. Test Telegram Connection

**Endpoint**: `POST /api/sos/test-telegram`

**Authentication**: ❌ Not Required (for setup)

**Request Body**:

```json
{
  "telegramId": "1234567890"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Test message sent successfully. Check your Telegram.",
  "details": {
    "success": true,
    "messageId": 12345,
    "timestamp": "2025-11-08T10:00:00Z"
  }
}
```

---

## 🖥️ Frontend Integration

### 1. Import SOS Component

In your main app or dashboard page:

```jsx
import SOSFeature from "../components/SOSFeature";

function Dashboard() {
  return (
    <div>
      <h1>Patient Dashboard</h1>
      <SOSFeature />
    </div>
  );
}
```

### 2. Add to Navigation

```jsx
<nav>
  <Link to="/sos">Emergency SOS</Link>
  {/* other links */}
</nav>
```

### 3. Create Dedicated SOS Page

Create `client/src/pages/SOS.jsx`:

```jsx
import React from "react";
import SOSFeature from "../components/SOSFeature";
import Layout from "../components/Layout";

const SOS = () => {
  return (
    <Layout>
      <div className="py-8">
        <SOSFeature />
      </div>
    </Layout>
  );
};

export default SOS;
```

### 4. Add Route

In `client/src/App.jsx`:

```jsx
import SOS from "./pages/SOS";

<Route
  path="/sos"
  element={
    <ProtectedRoute>
      <SOS />
    </ProtectedRoute>
  }
/>;
```

---

## 🧪 Testing

### Test 1: Verify Backend Routes

```bash
# Test if Telegram is configured
curl http://localhost:5000/api/sos/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected response:
# { "success": true, "telegramConfigured": true, ... }
```

### Test 2: Test Telegram Connection

```bash
# Using curl
curl -X POST http://localhost:5000/api/sos/test-telegram \
  -H "Content-Type: application/json" \
  -d '{"telegramId": "YOUR_CHAT_ID"}'

# Check your Telegram - you should receive a test message
```

### Test 3: Full SOS Flow

**Via Frontend**:

1. Open `http://localhost:5173/sos` (or your SOS page)
2. Click "Setup Contacts"
3. Enter your Telegram ID
4. Click "Test Connection"
5. Check Telegram for test message
6. Click "Send SOS Alert"
7. Verify message received in Telegram

**Via API**:

```bash
curl -X POST http://localhost:5000/api/sos/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test SOS alert",
    "severity": "MEDIUM",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "address": "New Delhi"
    }
  }'
```

### Test 4: Check SOS History

```bash
curl http://localhost:5000/api/sos/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🐛 Troubleshooting

### Problem: "Telegram bot is not configured"

**Solution**:

1. Verify `.env` file has `TELEGRAM_BOT_TOKEN`
2. Check token format: `123456789:ABCDEF...`
3. Restart server: `npm run server`
4. Verify with: `curl http://localhost:5000/health`

### Problem: "Failed to send test message"

**Causes & Solutions**:

1. **Invalid Telegram ID**

   - Get ID from `@userinfobot`
   - ID should be a number (e.g., `1234567890`)

2. **Bot Token Incorrect**

   - Verify token with:

   ```bash
   curl https://api.telegram.org/botYOUR_TOKEN/getMe
   ```

   - Should return bot info

3. **Network Issues**
   - Check internet connection
   - Verify firewall allows outbound HTTPS
   - Check DNS resolution: `nslookup api.telegram.org`

### Problem: "No emergency contacts found"

**Solution**:

1. Run setup form in SOS feature
2. Add at least one Telegram ID
3. Click "Test Connection" first
4. Then try sending SOS

### Problem: Database table not created

**Solution**:

```bash
# Option 1: Run migration manually
psql -U consultancy_user -d e_consultancy -f migrations/002_create_sos_alerts.sql

# Option 2: Delete `migrations_applied.json` and restart server
# (if you have auto-migration enabled)
rm server/migrations_applied.json
npm run server

# Option 3: Check if table exists
psql -U consultancy_user -d e_consultancy -c "\dt sos_alerts"
```

### Problem: "Authentication required" error

**Solution**:

1. Ensure JWT token is in `Authorization` header
2. Format: `Authorization: Bearer YOUR_TOKEN`
3. Check token expiration: `jwt.io`

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] `.env` file has `TELEGRAM_BOT_TOKEN`
- [ ] Bot token verified with `@BotFather`
- [ ] Emergency contact Telegram ID obtained
- [ ] Database migration applied
- [ ] SOS routes imported in `server/src/index.js`
- [ ] Telegram service working (test message received)
- [ ] Frontend component integrated
- [ ] SOS page accessible in app
- [ ] API endpoints tested
- [ ] SOS history displays correctly
- [ ] Multiple contacts can be added
- [ ] Location services working
- [ ] Severity levels functional

---

## 📊 SOS Message Format

When a user sends an SOS, parents receive a formatted HTML message:

```
🔴 SOS ALERT 🔴

User Information:
📛 Name: John Doe
📧 Email: john@example.com
📆 Age: 18

Emergency Details:
💬 Message: I'm in severe pain at the mall
📍 Location: Coordinates: 28.6139, 77.2090
⏰ Time: 11/8/2025, 10:30:45 AM
🎯 Severity: HIGH

This is an emergency alert sent from AIrogya Health Platform
```

---

## 🚀 Production Deployment

### Recommended Configuration

```env
# Production Telegram Setup
TELEGRAM_BOT_TOKEN=your_production_bot_token_here

# Timeout settings
TELEGRAM_REQUEST_TIMEOUT=10000

# Enable detailed logging
DEBUG=sos:*

# Backup notification channel
BACKUP_NOTIFICATION_EMAIL=emergency@hospital.com
```

### Monitoring

Add these to your monitoring dashboard:

```javascript
// Track SOS alerts
{
  metric: 'sos_alerts_sent',
  dimension: 'severity',
  alert_threshold: 10 // Alert if >10 in 5 minutes
}

{
  metric: 'sos_delivery_failure_rate',
  alert_threshold: 0.1 // Alert if >10% failures
}

{
  metric: 'telegram_api_latency',
  alert_threshold: 5000 // Alert if >5 seconds
}
```

---

## 📞 Support & Resources

- **Telegram Bot API Docs**: https://core.telegram.org/bots/api
- **Get Chat ID**: https://t.me/userinfobot
- **Bot Father**: https://t.me/botfather
- **Telegram Web**: https://web.telegram.org

---

## 📝 Summary

The SOS feature is now fully integrated and ready to use!

**What's Included**:
✅ Backend SOS service with Telegram integration
✅ Database schema for SOS alert tracking
✅ React frontend component with full UI
✅ Geolocation support for emergency location
✅ Multiple emergency contacts support
✅ SOS history and audit trail
✅ Comprehensive error handling

**Next Steps**:

1. Configure Telegram bot token in `.env`
2. Run database migration
3. Add SOS page to your application
4. Test with your Telegram ID
5. Deploy to production

**Questions?** Check the troubleshooting section or review the API documentation above.

---

**Last Updated**: November 8, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready
