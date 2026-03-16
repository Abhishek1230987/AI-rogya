# 🎙️ Audio Sending - Quick Troubleshooting Guide

## 🚀 Quick Start - Test Audio Sending

### 1️⃣ Basic Test (30 seconds)

```bash
cd server
node test-audio-telegram.js
```

### 2️⃣ Comprehensive Debug (2 minutes)

```bash
cd server
node debug-audio-comprehensive.js
```

---

## ✅ Checklist - Before Testing

- [ ] `.env` file has `TELEGRAM_BOT_TOKEN`
- [ ] `.env` file has `TELEGRAM_CHAT_ID`
- [ ] Telegram bot created via @BotFather
- [ ] Bot has been started in Telegram (send `/start`)
- [ ] Emergency contacts configured in app with Telegram IDs
- [ ] Server is running (`npm run dev`)

---

## 🔍 Common Issues & Fixes

### Issue: "Telegram bot not configured"

**Fix:**

```bash
# 1. Check .env file exists
ls .env

# 2. Add to .env:
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# 3. Restart server
npm run dev
```

### Issue: "Chat ID is required" / Audio not received

**Fix:**

```bash
# 1. Get your Telegram Chat ID:
# - Open Telegram
# - Search for @userinfobot
# - Send any message
# - Copy the number from "Your user id: XXX"

# 2. Update .env with correct TELEGRAM_CHAT_ID

# 3. Test with:
node test-audio-telegram.js
```

### Issue: "Status 401" or "Unauthorized"

**Fix:** Bot token is invalid

```bash
# 1. Go to https://t.me/BotFather
# 2. Send /mybots
# 3. Select your bot
# 4. Check token is correct in .env
# 5. Restart server
```

### Issue: Audio file too large

**Fix:**

```bash
# Telegram max: 50MB
# Browser should record at lower bitrate:
# - Reduce sample rate to 16000Hz
# - Use WAV format (uncompressed but smaller with lower sample rate)
# - Limit recording time
```

---

## 📊 Audio Flow Diagram

```
┌─ Frontend Recording ──┐
│  - Browser captures │
│  - Creates Blob    │
└──────────┬──────────┘
           ↓
┌─ Form Submission ─────┐
│  - Multipart/form-data│
│  - With audio file    │
└──────────┬──────────┘
           ↓
┌─ Backend Processing ──┐
│  - Receives file      │
│  - Gets emergency IDs │
│  - Sends to Telegram  │
└──────────┬──────────┘
           ↓
┌─ Telegram Bot API ────┐
│  - sendAudio endpoint │
│  - Delivers to chat   │
└──────────┬──────────┘
           ↓
┌─ Emergency Contact ───┐
│  - Receives in Telegram│
│  - Can play audio      │
└──────────────────────┘
```

---

## 🧪 Manual Testing Steps

### Step 1: Test Telegram Connection

```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/getMe
# Should return bot info
```

### Step 2: Send Test Message

```bash
curl -X POST \
  https://api.telegram.org/bot<TOKEN>/sendMessage \
  -d chat_id=<CHAT_ID> \
  -d text="Test message"
```

### Step 3: Send Test Audio

```bash
# Create dummy audio file
dd if=/dev/urandom of=test.wav bs=1024 count=10

# Send to Telegram
curl -X POST \
  -F "chat_id=<CHAT_ID>" \
  -F "audio=@test.wav" \
  https://api.telegram.org/bot<TOKEN>/sendAudio
```

---

## 📝 Debug Logging

### Enable Detailed Logs

**Frontend** (`client/src/components/VoiceRecorder.jsx`):

```javascript
console.log("🎙️ Audio recorded:", audioBlob);
console.log("📤 Sending to:", BACKEND_URL);
console.log("📊 FormData:", formData);
```

**Backend** (`server/src/controllers/sosController.js`):

```javascript
console.log("🎙️ Audio file detected:", {
  name: audioFile.name,
  size: audioFile.size,
  mimetype: audioFile.mimetype,
  dataLength: audioFile.data?.length || 0,
});
```

### Check Server Logs

```bash
# Terminal where server is running
# Look for:
# ✅ Text message sent
# 📤 Audio file detected
# 📤 Sending audio to Telegram
# ✅ Audio sent successfully
```

---

## 🔧 Configuration Files

### `.env` (Server Root)

```env
# Required for audio sending
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=987654321

# Optional
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
```

### `server/src/index.js` (File Upload Config)

```javascript
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  })
);
```

---

## 📱 Getting Telegram Chat ID

### Method 1: Using @userinfobot (Easiest)

1. Open Telegram app
2. Search for `@userinfobot`
3. Send any message (e.g., "hi")
4. Bot replies with your info
5. Look for: "Your user id: **123456789**"
6. That's your chat ID

### Method 2: Using Telegram Web

1. Go to https://web.telegram.org/
2. Open browser DevTools (F12)
3. Look in Network tab
4. Find chat_id in any API response

### Method 3: Using Bot

1. Create a bot in @BotFather
2. Send `/start` to the bot
3. Check bot logs (if available)

---

## 🎯 Expected Behavior

### ✅ Success Flow

1. User records voice message
2. Clicks "Send SOS"
3. Backend receives audio file
4. Server sends to Telegram
5. Emergency contact receives:
   - ✅ Text message with details
   - ✅ Audio file (playable in Telegram)
6. Server logs show all `✅` messages

### ❌ Failure Flow

1. Backend logs show error
2. Check error type
3. Use guide above to fix
4. Retest with debug script

---

## 📚 Key Files Reference

| File                                      | Purpose            |
| ----------------------------------------- | ------------------ |
| `server/src/routes/sos.js`                | SOS endpoints      |
| `server/src/controllers/sosController.js` | SOS business logic |
| `server/src/services/telegramService.js`  | Telegram API calls |
| `server/test-audio-telegram.js`           | Basic testing      |
| `server/debug-audio-comprehensive.js`     | Advanced debugging |
| `client/src/components/VoiceRecorder.jsx` | Audio recording    |
| `.env`                                    | Configuration      |

---

## 🆘 Getting Help

### Check Logs

```bash
# Server logs show what's happening
# Look for: 🎙️, 📤, ✅, ❌ emojis
```

### Run Debug Script

```bash
node server/debug-audio-comprehensive.js
# Shows step-by-step test results
```

### Verify Configuration

```bash
# Check these are set in .env
cat .env | grep TELEGRAM
```

### Test Each Component

1. Test bot token: `curl` request to `getMe`
2. Test text message: `curl` request to `sendMessage`
3. Test audio: `curl` request to `sendAudio`
4. Test full flow: UI submission

---

## 🎓 Learning Resources

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram sendAudio](https://core.telegram.org/bots/api#sendaudio)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

---

## ⏱️ Estimated Fix Times

- Configuration issue: **1-2 minutes** ⚡
- Invalid bot token: **2-3 minutes** ⚡
- Chat ID issue: **3-5 minutes** ⚡
- Audio format issue: **5-10 minutes** ⚙️
- Network/connectivity: **10-15 minutes** 🌐
- Complex issue: **Run debug script** 🔧

---

## 🎯 Success Checklist

- [ ] Bot token validated ✅
- [ ] Chat ID correct ✅
- [ ] Text message sends ✅
- [ ] Audio file sends ✅
- [ ] Audio received in Telegram ✅
- [ ] Can play audio ✅
- [ ] Emergency contacts receive alerts ✅

**If all checked:** 🎉 Audio sending is working!
