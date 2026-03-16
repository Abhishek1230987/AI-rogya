# 🧪 Testing Guide - Multiple Messages Fix

## Quick Test (2 minutes)

### Setup

1. Make sure server is running: `npm run dev`
2. Check `.env` has `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
3. Navigate to SOS setup page in app

### Test Case 1: SOS with Audio (Main Test)

**Steps:**

1. Open app and login
2. Go to SOS Setup page
3. Click "Record Audio" button
4. Speak for 2-3 seconds
5. Stop recording
6. Enter test message: "Test SOS with audio"
7. Click "Send SOS Alert"

**Expected Result:**

- ✅ Single message in Telegram with:
  - 🔊 Voice SOS Message header
  - Full SOS details
  - Audio file (playable)

**Check Server Logs:**

```
🎙️ Audio file detected: {...}
📤 Sending audio to 1 contact(s)...
✅ Audio sent successfully to <chatId>
```

**❌ If you see 2 messages:**

- Old code is still running
- Make sure you restarted server
- Check code changes were applied

---

### Test Case 2: SOS without Audio (Verification)

**Steps:**

1. Go to SOS Setup page
2. DON'T record audio (leave blank)
3. Enter message: "Test SOS without audio"
4. Click "Send SOS Alert"

**Expected Result:**

- ✅ Single text message in Telegram with:
  - SOS ALERT header
  - Full details
  - No audio

**Check Server Logs:**

```
ℹ️ No audio file attached. Sending text message only.
📊 SOS sent: 1 successful, 0 failed out of 1
```

---

### Test Case 3: Multiple Recipients (Advanced)

**Prerequisite:**

- Configure 2+ emergency contacts with different Telegram IDs

**Steps:**

1. Record audio (or skip for text-only)
2. Send SOS alert

**Expected Result:**

- ✅ Each contact receives 1 message
- ✅ Same message with audio/text
- ✅ No duplicates

**Verify:**

- Contact 1: 1 message (or audio)
- Contact 2: 1 message (or audio)
- Contact 3: 1 message (or audio)

❌ If seeing 2 messages each:

```
Contact 1: 2 messages
Contact 2: 2 messages
Contact 3: 2 messages
```

→ Old code still running

---

## Detailed Testing Procedure

### Test Environment Setup

```bash
# 1. Ensure latest code
git pull

# 2. Check .env configured
cat server/.env | grep TELEGRAM

# Expected:
# TELEGRAM_BOT_TOKEN=123...
# TELEGRAM_CHAT_ID=456...

# 3. Start server
cd server
npm run dev

# Should see:
# ✅ Listening on port 5000
# ✅ Database connected
```

### Test Execution

#### Phase 1: Telegram Connectivity (30 seconds)

```bash
# In another terminal, test bot
curl -X POST https://api.telegram.org/bot<TOKEN>/getMe

# Should return bot info:
# {"ok":true,"result":{"id":123...,"is_bot":true}}
```

#### Phase 2: Audio Sending (1 minute)

**Via Test Script:**

```bash
cd server
node test-audio-telegram.js

# Should show:
# ✅ Text message sent
# ✅ Audio sent successfully
# ✅ Real audio file sent
```

#### Phase 3: Full Flow (1 minute)

**Via Web App:**

1. Login to app
2. Record 3-second audio
3. Send SOS alert
4. Check Telegram immediately

**In Telegram:**

- [ ] Single message received
- [ ] Message has audio file
- [ ] Can click play
- [ ] All details visible

**In Server Console:**

- [ ] No "SOS sent: 2 successful"
- [ ] Single "✅ Audio sent successfully" per contact
- [ ] Results show successful_count = 1

---

## Expected Behavior Summary

### With Audio Recording

| Step | Action            | Expected                    | Status |
| ---- | ----------------- | --------------------------- | ------ |
| 1    | Record audio      | Audio blob created          | ✅     |
| 2    | Send SOS          | Request includes audio file | ✅     |
| 3    | Backend receives  | Detects audio file          | ✅     |
| 4    | Sends to Telegram | 1 audio message             | ✅     |
| 5    | Contact receives  | 1 message with audio        | ✅     |

### Without Audio

| Step | Action            | Expected                | Status |
| ---- | ----------------- | ----------------------- | ------ |
| 1    | No recording      | Audio blob = null/empty | ✅     |
| 2    | Send SOS          | Request has no audio    | ✅     |
| 3    | Backend receives  | No audio detected       | ✅     |
| 4    | Sends to Telegram | 1 text message          | ✅     |
| 5    | Contact receives  | 1 text message          | ✅     |

---

## Regression Testing

### Scenarios to Check

1. **Audio Quality**

   - [ ] Audio plays without distortion
   - [ ] Audio volume is normal
   - [ ] Duration preserved

2. **Message Content**

   - [ ] User name displayed
   - [ ] Location correct
   - [ ] Timestamp accurate
   - [ ] Severity level shown

3. **Multiple Recipients**

   - [ ] Mom gets message
   - [ ] Dad gets message
   - [ ] Guardian gets message
   - [ ] Each gets exactly 1 message

4. **Error Handling**

   - [ ] Large audio file (>50MB) rejected
   - [ ] Empty audio file → text fallback
   - [ ] Network error → shows error
   - [ ] Invalid token → shows error

5. **Performance**
   - [ ] Response time < 5 seconds
   - [ ] No memory leaks
   - [ ] Server logs clean
   - [ ] Database operations completed

---

## Browser DevTools Inspection

### Network Tab

**Request to /api/sos/send:**

```
POST /api/sos/send HTTP/1.1

Request Headers:
Content-Type: multipart/form-data; boundary=...
Authorization: Bearer <token>

Request Body:
--boundary
Content-Disposition: form-data; name="message"

Test SOS with audio
--boundary
Content-Disposition: form-data; name="audio"; filename="recording.wav"
Content-Type: audio/webm

[Binary data...]
--boundary--
```

**Response:**

```json
{
  "success": true,
  "message": "SOS alert sent to 1 contact(s) with voice message",
  "details": {
    "totalRecipients": 1,
    "successfulRecipients": 1,
    "failedRecipients": 0,
    "hasAudio": true,
    "timestamp": "2024-11-09T..."
  }
}
```

### Console Logs

**Frontend:**

```javascript
// Should see in console:
✅ SOS sent successfully
Response: {success: true, ...}
```

**Backend (server terminal):**

```
🎙️ Audio file detected: {
  name: "recording.wav",
  size: 28342,
  mimetype: "audio/webm",
  dataLength: 28342
}
📤 Sending audio to 1 contact(s)...
✅ Audio sent successfully to 123456789
```

---

## Troubleshooting During Testing

### Issue: Seeing 2 Messages Still

**Cause:** Old code still running

**Fix:**

```bash
# 1. Stop server (Ctrl+C)
# 2. Check code was updated
grep -A5 "Send audio if provided" server/src/controllers/sosController.js

# Should show:
# if (audioFile) {
#   console.log("🎙️ Audio file detected"...

# 3. Restart server
npm run dev
```

### Issue: Only Text, No Audio

**Cause:** Audio not recording or uploading

**Fix:**

```bash
# 1. Check browser permissions
# - DevTools → Application → Permissions
# - Microphone should be allowed

# 2. Test recording
# - Run: AudioDebugger.diagnose() in console
# - Should show: ✓ Audio recorded

# 3. Check upload
# - DevTools → Network tab
# - Look for POST /api/sos/send
# - Check "audio" field in request body
```

### Issue: Message Sent but No Audio File

**Cause:** Audio file corrupted or format issue

**Fix:**

```javascript
// Check audio buffer in server logs:
console.log(audioFile.data);

// Should see:
// Buffer(28342) [0x52, 0x49, 0x46, 0x46, ...]

// If 0 length:
// Buffer(0) []
// → Need to fix recording
```

### Issue: Error "Chat ID is required"

**Cause:** Emergency contact not configured

**Fix:**

```bash
# 1. Go to SOS Setup page
# 2. Step 1: Get Telegram ID
#    - Search @userinfobot in Telegram
#    - Send a message
#    - Copy the chat ID
# 3. Step 2: Enter ID
# 4. Step 3: Test connection
# 5. Retry SOS
```

---

## Automated Testing Script

```bash
#!/bin/bash
# save as test-audio-fix.sh

echo "🧪 Testing Audio Sending Fix..."

# Test 1: Check code changes
echo -e "\n✅ Test 1: Code changes"
if grep -q "Send ONLY audio with caption" server/src/controllers/sosController.js; then
  echo "✓ Code updated correctly"
else
  echo "✗ Code not updated"
  exit 1
fi

# Test 2: Check server running
echo -e "\n✅ Test 2: Server connectivity"
if curl -s http://localhost:5000/ > /dev/null; then
  echo "✓ Server is running"
else
  echo "✗ Server not running (npm run dev)"
  exit 1
fi

# Test 3: Check telegram config
echo -e "\n✅ Test 3: Telegram configuration"
if grep -q "TELEGRAM_BOT_TOKEN" server/.env; then
  echo "✓ Bot token configured"
else
  echo "✗ Bot token missing"
  exit 1
fi

echo -e "\n✨ All checks passed! Ready for testing."
```

---

## Sign-Off Checklist

After completing all tests:

- [ ] Single message received per contact
- [ ] Audio message includes full details
- [ ] Text-only SOS still works
- [ ] Multiple recipients work
- [ ] Server logs are clean
- [ ] No error messages
- [ ] Response time acceptable
- [ ] Can replay audio in Telegram
- [ ] Details are accurate
- [ ] System is production-ready

---

**Testing Status**: Ready ✅
**Estimated Time**: 5 minutes
**Difficulty**: Easy ⭐
