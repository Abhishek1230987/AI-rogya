# 🚨 SOS Setup - What To Do Now

**Your Issue**: "No Telegram IDs configured for emergency contacts"

**Solution**: You need to tell the system WHO to send alerts to (parents/guardians Telegram IDs)

---

## ✅ Quick Fix (3 Steps)

### Step 1: Get Telegram Chat IDs 📱

For EACH person you want to receive alerts (parents, guardians, etc):

1. They open Telegram
2. Search for: **@userinfobot**
3. Send it a message (e.g., "hi")
4. Bot replies with: **Your user id: 123456789**
5. Copy that number

**Example Output:**

```
Your user id: 123456789
Is bot: False
First name: John
Last name: Doe
```

👆 That number is what you need!

---

### Step 2: Add Emergency Contacts

**Option A: Using the Setup Page (EASIEST)**

```
1. Open app: http://localhost:5173
2. Login
3. Go to: http://localhost:5173/sos-setup
4. Follow the wizard
5. Enter the Telegram IDs you collected
6. Click Save
```

**Option B: Using API**

```bash
curl -X POST http://localhost:5000/api/sos/update-contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "parent1_telegram_id": "123456789",
    "parent2_telegram_id": "987654321",
    "guardian_telegram_id": "555555555"
  }'
```

---

### Step 3: Test & Send SOS ✅

1. **Test Connection**:

   - Open app → Click 🚨 SOS button
   - Should work now!

2. **Send Real Alert**:
   - Click 🚨 SOS button
   - Fill form
   - Click Send
   - Parents get Telegram message!

---

## 🎯 The Problem Explained

**Error Message:**

```
"No Telegram IDs configured for emergency contacts.
Please update your emergency contacts with Telegram IDs."
```

**What it means:**

- You have Telegram bot token ✅ (already done)
- BUT system doesn't know WHO to send messages to ❌
- It needs Telegram IDs for people to receive alerts

**How it works:**

```
You send SOS → System checks "who should get this?"
→ Looks for Telegram IDs in database → Sends messages
```

---

## 📋 Setup Checklist

- [ ] Get Telegram ID for Parent 1 (from @userinfobot)
- [ ] Get Telegram ID for Parent 2 (optional)
- [ ] Get Telegram ID for Guardian (optional)
- [ ] Add them to system (via setup page or API)
- [ ] Test by sending test message
- [ ] Verify message appears in Telegram
- [ ] Now send actual SOS alert!

---

## 🔗 Three Ways to Setup

### Method 1: Web UI (RECOMMENDED - Easiest)

```
→ Go to: http://localhost:5173/sos-setup
→ Follow step-by-step wizard
→ Done!
```

### Method 2: API with curl

```bash
curl -X POST http://localhost:5000/api/sos/update-contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"parent1_telegram_id": "123456789"}'
```

### Method 3: Postman

- Method: POST
- URL: http://localhost:5000/api/sos/update-contacts
- Headers: Authorization: Bearer TOKEN
- Body: {"parent1_telegram_id": "123456789"}

---

## 🧪 Verify It Works

**Check configuration:**

```bash
curl -X GET http://localhost:5000/api/sos/config \
  -H "Authorization: Bearer TOKEN"
```

**Expected:**

```json
{
  "success": true,
  "config": {
    "telegramConfigured": true,
    "emergencyContactsConfigured": true,
    "contactCount": 1
  }
}
```

---

## 🚀 After Setup

Once you've added emergency contacts:

1. **Click 🚨 SOS button** in navbar
2. **Fill in form**:
   - Severity: HIGH (default)
   - Message: "Help me!" (optional)
   - Voice: Record message (optional)
3. **Click Send**
4. **Check Telegram** - message arrives instantly!

---

## 💡 Pro Tips

✅ Get at least 1 Telegram ID (required)  
✅ Can add up to 3 contacts  
✅ All 3 get message simultaneously  
✅ Location included automatically  
✅ Voice message optional but helpful  
✅ Use HIGH severity for important tests

---

## 🆘 Troubleshooting

**Q: Still getting 400 error?**  
A: Double-check the Telegram ID is correct (all digits, no spaces)

**Q: No message in Telegram?**  
A: Make sure emergency contacts are saved (check /api/sos/config)

**Q: Can't find @userinfobot?**  
A: Try different bot: @getidsbot or @userid

**Q: Server says "invalid token"?**  
A: Login again to get fresh token

---

## 📞 Quick Commands

| Task            | Command                         |
| --------------- | ------------------------------- |
| Get Chat ID     | Search @userinfobot in Telegram |
| Setup Page      | http://localhost:5173/sos-setup |
| Check Config    | GET /api/sos/config             |
| Update Contacts | POST /api/sos/update-contacts   |
| Send SOS        | Click 🚨 button                 |

---

## ✨ Status After Setup

```
🟢 Server running
🟢 Telegram token configured
🟢 Emergency contacts saved ← YOU ARE HERE
🟢 Ready to send SOS!
```

---

**You're almost there! Just add the Telegram IDs and you're done.** 🎉

Generated: November 8, 2025
