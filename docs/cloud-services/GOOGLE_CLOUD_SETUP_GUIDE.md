# 🔊 Google Cloud Voice Services Setup Guide

## What Are These Warnings?

Your system currently uses **fallback methods** for voice features. Here's what's missing:

| Service                         | Current Status    | What It Does                       | Cost                      |
| ------------------------------- | ----------------- | ---------------------------------- | ------------------------- |
| **Google Cloud Speech-to-Text** | ⚠️ Not configured | Converts audio (voice) to text     | $0.06-0.12 per hour       |
| **Google Cloud Text-to-Speech** | ⚠️ Not configured | Converts text to audio (voice)     | $0.016-0.048 per 1M chars |
| **Current Fallback**            | ✅ Working        | Uses free google-tts-api (limited) | FREE but limited quality  |

**Bottom Line:** Your system works fine with fallbacks! But if you want better quality narration and speech recognition, you can upgrade.

---

## 🎯 Should You Configure These?

### ✅ YES, configure if:

- You want high-quality text-to-speech narration
- You need accurate speech-to-text transcription
- You're deploying to production
- You have budget for Google Cloud

### ❌ NO, you can skip if:

- Your current browser-based voices are sufficient
- You're in development/testing phase
- You have budget constraints
- You're okay with limited quality fallbacks

---

## 📋 Step-by-Step Setup (If You Want To Configure)

### Step 1: Create Google Cloud Project

1. **Go to:** https://console.cloud.google.com
2. **Sign in** with your Google account
3. **Click:** "Select a Project" (top left)
4. **Click:** "New Project"
5. **Name it:** `e-consultancy` (or any name)
6. **Click:** "Create"
7. **Wait** 1-2 minutes for project creation

### Step 2: Enable Required APIs

1. **Go to:** https://console.cloud.google.com/apis/library
2. **Search for:** "Text-to-Speech"
3. **Click:** "Google Cloud Text-to-Speech API"
4. **Click:** "Enable"
5. **Go back** and search for: "Speech-to-Text"
6. **Click:** "Cloud Speech-to-Text API"
7. **Click:** "Enable"
8. **Go back** and search for: "Cloud Storage"
9. **Click:** "Cloud Storage API"
10. **Click:** "Enable"

### Step 3: Create Service Account

1. **Go to:** https://console.cloud.google.com/iam-admin/serviceaccounts
2. **Click:** "Create Service Account"
3. **Service Account Name:** `e-consultancy-voice`
4. **Click:** "Create and Continue"
5. **Grant roles:**
   - ✅ Cloud Text-to-Speech User
   - ✅ Cloud Speech Client
   - ✅ Storage Object Viewer
   - ✅ Storage Object Creator
6. **Click:** "Continue"
7. **Click:** "Create Key"
8. **Key type:** Select "JSON"
9. **Click:** "Create"
10. **A JSON file downloads** - **SAVE THIS SAFELY!**

### Step 4: Add Credentials to Your System

**Option A: Using Environment Variable (Recommended)**

1. **Save the JSON file** to: `e:\E-Consultancy\server\config\google-credentials.json`
2. **Edit** `server/.env`
3. **Add this line:**
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./config/google-credentials.json
   ```
4. **Restart server**

**Option B: Using Google Cloud Project ID**

1. **In Google Cloud Console**, go to "Project Settings"
2. **Copy** the "Project ID"
3. **Edit** `server/.env`
4. **Add these lines:**
   ```
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./config/google-credentials.json
   ```

### Step 5: Create Cloud Storage Bucket (Optional, if you want to store files)

1. **Go to:** https://console.cloud.google.com/storage/browser
2. **Click:** "Create Bucket"
3. **Name:** `e-consultancy-voice-files`
4. **Region:** Choose nearest to you
5. **Click:** "Create"

### Step 6: Update `.env` File

```env
# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=./config/google-credentials.json
GOOGLE_CLOUD_PROJECT=your-project-id-here
CLOUD_PROVIDER=google
CLOUD_BUCKET_NAME=e-consultancy-voice-files

# Voice Settings
VOICE_LANGUAGE=en-US
VOICE_NAME=en-US-Neural2-C
TTS_GENDER=NEUTRAL
```

### Step 7: Restart Server

```bash
# Kill existing server
Get-Process node | Stop-Process -Force

# Start server
cd e:\E-Consultancy\server
node src/index.js
```

---

## 🎯 Expected Output After Configuration

When properly configured, you should see:

```
✅ Google Cloud Text-to-Speech initialized
✅ Google Cloud Speech-to-Text initialized
✅ File uploaded to Google Cloud Storage: gs://e-consultancy-voice-files/...
```

Instead of the current warnings:

```
⚠️ Google Cloud TTS not configured
⚠️ Google Cloud Speech-to-Text not configured
```

---

## 💰 Pricing Reference

### Text-to-Speech

- **Free tier:** 1 million characters per month
- **After free tier:** $0.016 per 1,000 characters
- **Typical usage:** 100 consultations × 500 chars = 50K chars = $0.0008/month

### Speech-to-Text

- **Free tier:** 60 minutes per month
- **After free tier:** $0.06 per hour
- **Typical usage:** 100 consultations × 5 min = 500 min = $0.30/month

**Total estimated cost:** < $1/month for typical usage ✅

---

## 🔧 What Changes After Configuration?

| Feature                | Before                   | After                                         |
| ---------------------- | ------------------------ | --------------------------------------------- |
| **Narration Quality**  | Browser voices (limited) | Professional Google voices (many languages)   |
| **Speech Recognition** | Basic fallback           | Accurate multi-language transcription         |
| **File Storage**       | Local only               | Cloud storage available                       |
| **Indian Languages**   | Limited                  | Full support (Hindi, Gujarati, Kannada, etc.) |
| **Cost**               | $0                       | < $1/month (free tier covers most)            |

---

## 🚀 Quick Decision

### Option A: Skip Configuration (Recommended for now)

- ✅ Keep using fallback methods
- ✅ System works perfectly fine
- ✅ Zero additional setup
- ✅ Free to use
- ❌ Limited narration quality
- **Best for:** Development, testing, budget-conscious

### Option B: Configure Google Cloud

- ✅ Professional voice quality
- ✅ Accurate transcription
- ✅ Multi-language support
- ✅ Cloud storage
- ❌ Requires Google account
- ❌ Small monthly cost (~$0-1)
- **Best for:** Production, professional deployment

---

## 📞 Troubleshooting

### Error: "Cannot read credentials from file"

- ✅ Make sure JSON file path in `.env` is correct
- ✅ Verify file exists at: `e:\E-Consultancy\server\config\google-credentials.json`

### Error: "API not enabled"

- ✅ Go back to APIs library and enable Text-to-Speech and Speech-to-Text APIs

### Error: "Quota exceeded"

- ✅ You've hit the free tier limit
- ✅ Either wait until next month or enable paid tier

### Still seeing warnings?

- ✅ Restart the server completely
- ✅ Check that both `GOOGLE_APPLICATION_CREDENTIALS` AND `GOOGLE_CLOUD_PROJECT` are set

---

## ✨ Bottom Line

Your system **works perfectly as-is** with fallback methods. The warnings are just informational.

If you want professional-grade voice features, follow this guide. Otherwise, you can safely ignore these warnings! 🎉
