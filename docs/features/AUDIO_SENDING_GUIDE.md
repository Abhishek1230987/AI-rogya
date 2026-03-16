# Audio Sending with SOS Alerts - Complete Guide

## 🎯 Overview

The SOS (Emergency Alert) system in E-Consultancy includes the ability to send voice messages (audio files) along with emergency alerts via Telegram. This guide explains how the system works and how to troubleshoot audio sending.

## 🏗️ Architecture

### Frontend (Client) → Backend (Server) → Telegram API

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│ • User records voice message via VoiceRecorder component        │
│ • Audio is captured as Blob (WebM format)                       │
│ • Form submitted with audio file + location + message           │
│ • Multipart/form-data sent to backend                           │
└─────────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                       │
├─────────────────────────────────────────────────────────────────┤
│ Route: POST /api/sos/send (Authentication required)             │
│                                                                 │
│ 1. Receives multipart/form-data with audio file                │
│ 2. Gets emergency contact Telegram IDs from database            │
│ 3. Sends formatted text message to all contacts                │
│ 4. Sends audio file to all contacts (if provided)              │
│ 5. Logs SOS alert to database                                  │
│ 6. Returns success/failure summary                             │
└─────────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT API                             │
├─────────────────────────────────────────────────────────────────┤
│ • sendMessage endpoint (for text alerts)                        │
│ • sendAudio endpoint (for voice messages)                       │
│ • Uses form-data encoding for file uploads                      │
│ • Supports: WAV, MP3, OGG, FLAC, AAC formats                  │
│ • Max file size: 50MB                                          │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Key Files

### Backend

- **Routes**: `server/src/routes/sos.js` - SOS endpoints
- **Controller**: `server/src/controllers/sosController.js` - Business logic
- **Service**: `server/src/services/telegramService.js` - Telegram API integration
- **Middleware**: `server/src/middleware/auth.js` - Authentication

### Frontend

- **Pages**: `client/src/pages/SOSSetup.jsx` - SOS configuration page
- **Components**: `client/src/components/VoiceRecorder.jsx` - Audio recording

## 🔄 Data Flow

### Step 1: Frontend Preparation

**File**: `client/src/components/VoiceRecorder.jsx`

```
User Recording
    ⬇️
AudioContext API (Browser)
    ⬇️
MediaRecorder captures audio stream
    ⬇️
Audio Blob (WebM format by default)
    ⬇️
FormData with file + metadata
```

### Step 2: Backend Reception

**File**: `server/src/controllers/sosController.js` - `sendSOSAlert` function

```javascript
const audioFile = req.files?.audio; // Audio uploaded via express-fileupload

if (audioFile) {
  // audioFile.data contains the Buffer
  // audioFile.name contains the filename
  // audioFile.mimetype contains the content type
}
```

### Step 3: Telegram API Call

**File**: `server/src/services/telegramService.js` - `sendTelegramAudio` function

```javascript
const formDataInstance = new FormData();
formDataInstance.append("chat_id", chatId);
formDataInstance.append("audio", audioBuffer, "sos_audio.wav");
formDataInstance.append("caption", caption);
formDataInstance.append("parse_mode", "HTML");

// Sent to: https://api.telegram.org/bot{TOKEN}/sendAudio
```

## 🐛 Troubleshooting Audio Sending

### Issue 1: Audio Not Received in Telegram

#### Check 1: Is Telegram Bot Configured?

```bash
# Check .env file in server directory
cat .env | grep TELEGRAM
```

**Expected output**:

```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=987654321
```

**If missing**:

1. Get bot token from @BotFather on Telegram
2. Add to `.env` file
3. Restart server

#### Check 2: Test Telegram Connection

```bash
cd server
node test-audio-telegram.js
```

This will:

1. ✅ Verify bot token
2. ✅ Test text message sending
3. ✅ Create and send test audio file
4. ✅ Send real audio files from uploads directory

**Success indicators**:

- ✅ Text message received
- ✅ Test audio file received
- ✅ Real audio file received

**Failure indicators**:

- ❌ "Telegram bot not configured" - Check TELEGRAM_BOT_TOKEN
- ❌ "Chat ID is required" - Check TELEGRAM_CHAT_ID
- ❌ "Status 401" - Invalid or expired bot token
- ❌ "Status 403" - Chat ID doesn't have bot access
- ❌ "Timeout" - Network connectivity issue

### Issue 2: Audio File Format Problems

#### Telegram Supported Formats

- ✅ WAV (Waveform Audio)
- ✅ MP3 (MPEG-3)
- ✅ OGG (Vorbis)
- ✅ FLAC
- ✅ AAC

#### Browser Recording Format

Most browsers use WebM format by default:

```javascript
// VoiceRecorder captures audio as WebM
const mimeType = "audio/webm";
const mediaRecorder = new MediaRecorder(stream, { mimeType });
```

**Solution**: The backend should handle format conversion if needed, or browser should record in WAV format.

### Issue 3: Frontend Not Sending Audio

#### Debug Steps:

**Step 1**: Check if audio is being recorded

```javascript
// In browser console, check VoiceRecorder state
const recorder = document.querySelector("[data-recorder]");
console.log(recorder); // Check if component exists
```

**Step 2**: Verify FormData is created correctly

```javascript
// Add this to VoiceRecorder.jsx
if (audioBlob) {
  console.log("🎙️ Audio Blob:", {
    size: audioBlob.size,
    type: audioBlob.type,
    blob: audioBlob,
  });

  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.wav");

  console.log("📤 FormData contents:");
  for (let [key, value] of formData.entries()) {
    console.log(key, value);
  }
}
```

**Step 3**: Verify upload endpoint is correct

```javascript
// Should be: http://localhost:5000/api/sos/send
const response = await fetch("http://localhost:5000/api/sos/send", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    // Don't set Content-Type - browser will set it with boundary
  },
  body: formData,
});
```

**Step 4**: Check network tab in DevTools

- Look for POST request to `/api/sos/send`
- Check if audio file is in request body
- Verify response status (should be 200)

### Issue 4: Backend Not Receiving Audio

#### Debug the Route

**File**: `server/src/routes/sos.js`

```javascript
// Add detailed logging
router.post(
  "/send",
  authenticateToken,
  (req, res, next) => {
    console.log("🔍 SOS /send request received");
    console.log("📤 Files:", Object.keys(req.files || {}));
    console.log("📄 Body:", req.body);
    console.log("📊 Audio file:", req.files?.audio);
    next();
  },
  sendSOSAlert
);
```

#### Check Server Logs

```bash
# When you send SOS alert, look for:
🔍 SOS /send request received
📤 Files: ['audio']
📄 Body: {...}
📊 Audio file: {
  size: 123456,
  encoding: '7bit',
  name: 'recording.wav',
  data: <Buffer ...>,
  mimetype: 'audio/webm'
}
```

**If audio is missing**:

1. Check frontend is actually sending it
2. Verify `express-fileupload` is configured correctly
3. Check `Content-Type: multipart/form-data` header

### Issue 5: Audio File Size Issues

#### Size Limits

- **Frontend**: Check browser memory limits
- **Backend**: Check `express-fileupload` config in `server/src/index.js`
- **Telegram**: Max 50MB per file

#### Current Config

**File**: `server/src/index.js`

```javascript
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  })
);
```

#### If receiving size error:

```javascript
// In express-fileupload config
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);
```

## 🔧 Configuration Checklist

- [ ] `TELEGRAM_BOT_TOKEN` set in `.env`
- [ ] Emergency contacts have Telegram IDs set
- [ ] Telegram bot has access to chat
- [ ] Frontend audio recording working
- [ ] FormData includes audio file
- [ ] Backend receiving files correctly
- [ ] Telegram API responding (test with test script)

## 📊 Database Schema

### SOS Alerts Table

```sql
CREATE TABLE sos_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  message TEXT,
  severity VARCHAR(50),
  location JSONB,
  recipients_count INTEGER,
  successful_count INTEGER,
  failed_count INTEGER,
  status VARCHAR(20),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Testing Audio Flow

### End-to-End Test

1. **Setup Phase**:

   ```bash
   # Set environment variables
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

2. **Test Text Message**:

   ```javascript
   POST /api/sos/test-telegram
   Body: { "telegramId": "your_chat_id" }
   ```

3. **Test Audio Sending**:

   ```bash
   node server/test-audio-telegram.js
   ```

4. **Full SOS Alert with Audio**:
   - Navigate to SOS Setup page
   - Record voice message
   - Enter emergency contacts
   - Submit SOS alert
   - Check Telegram for message + audio

## 📋 Common Error Messages

| Error                         | Cause                      | Solution                           |
| ----------------------------- | -------------------------- | ---------------------------------- |
| "Telegram bot not configured" | Missing TELEGRAM_BOT_TOKEN | Set bot token in .env              |
| "Chat ID is required"         | Empty telegramId           | Configure emergency contacts       |
| "Status 401"                  | Invalid bot token          | Verify token with @BotFather       |
| "Status 403"                  | Bot not in chat            | Start bot conversation first       |
| "Timeout"                     | Network issue              | Check internet connection          |
| "Audio buffer is required"    | Frontend not sending audio | Check VoiceRecorder state          |
| "Failed to parse location"    | Invalid location format    | Ensure location is valid JSON      |
| "No emergency contacts found" | Database issue             | Configure emergency contacts first |

## 🚀 Performance Optimization

### Optimize Audio File Size

```javascript
// Reduce sample rate and bitrate during recording
const constraints = {
  audio: {
    sampleRate: 16000, // 16kHz instead of 48kHz
    echoCancellation: true,
    noiseSuppression: true,
  },
};
```

### Batch Send to Multiple Contacts

```javascript
// Using Promise.allSettled for reliability
const results = await Promise.allSettled(
  parentTelegramIds.map((chatId) =>
    sendTelegramAudio(chatId, audioBuffer, caption)
  )
);
```

## 📚 References

- [Telegram Bot API - sendAudio](https://core.telegram.org/bots/api#sendaudio)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [Express-FileUpload](https://www.npmjs.com/package/express-fileupload)
- [Telegram Bot Setup Guide](https://core.telegram.org/bots#3-how-do-i-create-a-bot)

## 🔐 Security Notes

- ✅ Audio upload requires authentication (`authenticateToken` middleware)
- ✅ File size limited to 50MB
- ✅ Emergency contacts stored encrypted in database
- ✅ Telegram IDs validated before sending
- ✅ Error messages don't leak sensitive info

## 🎯 Next Steps

1. Run the diagnostic test: `node server/test-audio-telegram.js`
2. Fix any configuration issues identified
3. Test audio sending through the SOS Setup page
4. Monitor server logs for any errors
5. Verify audio is received on Telegram
