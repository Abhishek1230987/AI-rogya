# 🚨 SOS Emergency Contacts Setup - Step-by-Step Guide

## The Problem

You're getting this error:

```
"No Telegram IDs configured for emergency contacts. Please update your emergency contacts with Telegram IDs."
```

## Why This Happens

The SOS system needs to know **WHO to send the emergency alert to**. It looks for:

- Parent 1 Telegram ID
- Parent 2 Telegram ID
- Guardian Telegram ID

These are stored in your **Medical History**.

---

## Step 1: Get Your Telegram Chat ID

You need to get the Telegram chat IDs for your emergency contacts (parents, guardians, etc).

### For Each Emergency Contact:

1. **Open Telegram**
2. **Search for**: `@userinfobot`
3. **Send it a message**: Type anything (e.g., "hi")
4. **Bot replies with your info including Chat ID**
   - Look for: `Your user id: 123456789`
5. **Copy that number** (this is their Telegram Chat ID)

**Example:**

```
Your user id: 123456789
Is bot: False
First name: John
Last name: Doe
Username: @johndoe
...
```

The number `123456789` is the Chat ID you need.

---

## Step 2: Setup Emergency Contacts via API

Once you have the Telegram chat IDs, you need to save them to your profile.

### Using curl (Command Line)

```bash
# Get your JWT token first (from browser localStorage after login)
# Then run this command:

curl -X POST http://localhost:5000/api/sos/update-contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "parent1_telegram_id": "123456789",
    "parent2_telegram_id": "987654321",
    "guardian_telegram_id": "555555555"
  }'
```

### Using Postman

1. **Method**: POST
2. **URL**: `http://localhost:5000/api/sos/update-contacts`
3. **Headers**:
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
   - `Content-Type`: `application/json`
4. **Body** (raw JSON):

```json
{
  "parent1_telegram_id": "123456789",
  "parent2_telegram_id": "987654321",
  "guardian_telegram_id": "555555555"
}
```

5. **Click Send**

### Expected Response

```json
{
  "success": true,
  "message": "Emergency contacts updated successfully",
  "details": {
    "parent1_telegram_id": "123456789",
    "parent2_telegram_id": "987654321",
    "guardian_telegram_id": "555555555"
  }
}
```

---

## Step 3: Verify It's Set

**Check via API:**

```bash
curl -X GET http://localhost:5000/api/sos/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "config": {
    "telegramConfigured": true,
    "emergencyContactsConfigured": true,
    "contactCount": 3,
    "contacts": {
      "parent1_telegram_id": "123456789",
      "parent2_telegram_id": "987654321",
      "guardian_telegram_id": "555555555"
    }
  }
}
```

---

## Step 4: Test Connection

**Send a test message to make sure Telegram is working:**

```bash
curl -X POST http://localhost:5000/api/sos/test-telegram \
  -H "Content-Type: application/json" \
  -d '{"telegramId": "123456789"}'
```

You should get a test message in Telegram from your bot!

---

## Step 5: Now Send SOS Alert!

Once emergency contacts are configured:

1. **Open your app** at http://localhost:5173
2. **Login**
3. **Look for red 🚨 SOS button** in navbar
4. **Click it**
5. **Fill in the form**:
   - Choose severity (HIGH recommended for testing)
   - Type a message (optional)
   - Record voice (optional)
6. **Click "Send SOS"**
7. **Check Telegram** - message should arrive!

---

## 📱 How to Get JWT Token from Browser

1. **Open your app** (http://localhost:5173)
2. **Login**
3. **Open Browser Console** (F12 or Ctrl+Shift+I)
4. **Go to Console tab**
5. **Paste this**:

```javascript
console.log(localStorage.getItem("token"));
```

6. **Copy the token** (it's a long string starting with `eyJ...`)
7. **Use it in API calls**

---

## 🔍 Troubleshooting

### Issue: Can't find @userinfobot

**Solution**:

- Make sure you're on Telegram (not web version)
- Try searching for username: `userinfobot`
- Or just open: `https://t.me/userinfobot`

### Issue: No response from @userinfobot

**Solution**:

- The bot is online 24/7
- Try sending a message again
- Or try different bot: search for `@getidsbot`

### Issue: API returns 401 Unauthorized

**Solution**:

- Your JWT token expired
- Login again to get new token
- Copy new token from browser console

### Issue: API returns 404 Not Found

**Solution**:

- Make sure server is running: `npm start` in server folder
- Check server is on port 5000
- Check routes are imported in server/src/index.js

### Issue: Still getting "No Telegram IDs configured"

**Solution**:

- Run the GET `/api/sos/config` endpoint to verify
- Make sure you used correct endpoint to set contacts
- Check the response from update-contacts was successful

---

## 📋 Complete Example (Full Flow)

### 1. Get Telegram IDs

```
Open Telegram → Search @userinfobot → Send "hi"
Bot responds with: Your user id: 123456789
Save this number
```

### 2. Update Emergency Contacts

```bash
curl -X POST http://localhost:5000/api/sos/update-contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -d '{"parent1_telegram_id": "123456789"}'
```

### 3. Verify Setup

```bash
curl -X GET http://localhost:5000/api/sos/config \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

Response shows contacts are configured ✅

### 4. Test Telegram

```bash
curl -X POST http://localhost:5000/api/sos/test-telegram \
  -H "Content-Type: application/json" \
  -d '{"telegramId": "123456789"}'
```

Test message appears in Telegram ✅

### 5. Send SOS Alert

```
1. Open app http://localhost:5173
2. Click SOS button
3. Fill form
4. Click Send
```

Alert appears in Telegram ✅

---

## ✅ Checklist Before Sending SOS

- [ ] Got Telegram Chat IDs from @userinfobot
- [ ] Updated emergency contacts via API (or UI form)
- [ ] Verified contacts via `/api/sos/config`
- [ ] Tested connection via `/api/sos/test-telegram`
- [ ] Received test message in Telegram
- [ ] Server running: `npm start`
- [ ] Frontend running: `npm run dev`
- [ ] Logged in to app

---

## 🎯 Quick Reference

| Task           | Command                           |
| -------------- | --------------------------------- |
| Get Chat ID    | Search `@userinfobot` in Telegram |
| Set Contacts   | `POST /api/sos/update-contacts`   |
| Check Contacts | `GET /api/sos/config`             |
| Test Telegram  | `POST /api/sos/test-telegram`     |
| Send SOS       | Click 🚨 button in navbar         |

---

## 🆘 Need More Help?

1. Check `SOS_SETUP_GUIDE.md` for detailed setup
2. Check `SOS_TROUBLESHOOTING_FAQ.md` for common issues
3. Check server logs: `npm start` output
4. Check browser console: F12 → Console tab

---

**Status**: 🟢 Ready to setup!

Generated: November 8, 2025
