# Testing Medical Reports V2 - Complete Debugging Guide

## Status: BOTH SERVERS RUNNING ✅

- **Backend**: Running on port 5000 ✅
- **Frontend**: Running on port 5173 ✅
- **Medical Reports V2 Router**: Loaded successfully ✅

---

## Step-by-Step Testing Instructions

### 1. Access the New Feature

**Go to this URL in your browser:**

```
http://localhost:5173/medical-reports-v2
```

**You should see:**

- An upload area (with drag & drop or "Select File" button)
- A reports list below (initially empty)

### 2. Upload a Test File

1. Click the upload area OR drag & drop a file
2. Select a test file (JPG, PNG, PDF, DOC, DOCX, or TXT)
3. Click "Upload and Analyze" button
4. **Wait and watch the backend logs**

### 3. Monitor Backend Logs for Upload Progress

**Open a terminal and watch for these messages:**

```
📝 Step 0: Piping request to Busboy...
📝 Step 1: Verifying JWT token...
✅ JWT verified, user ID: [YOUR_USER_ID]
📝 Step 2: Initializing Busboy parser...
📝 Step 3: Setting up file event handler...
✅ File event triggered: [YOUR_FILENAME]
✅ File validation passed, collecting chunks...
📦 Received chunk: [SIZE] bytes
📝 Step 4: Busboy stream finished, processing file...
💾 Saving file to disk: [SAVED_PATH]
✅ File saved successfully, size: [SIZE]
📝 Step 5: Creating mock analysis...
📝 Step 6: Saving to database...
✅ Database record created, ID: [ID]
✅ Sending success response...
🎯 [MEDICAL REPORTS V2] UPLOAD COMPLETE ✅
```

---

## What Could Go Wrong - Debugging Checklist

### ❌ Upload Button Not Working

**Check:**

1. Are you at `http://localhost:5173/medical-reports-v2`? (NOT `/medical-reports`)
2. Are you logged in? (Should show your name in header)
3. Open browser DevTools (F12) → Console tab
4. Try uploading and share the error message

### ❌ Upload Sends But Gets 401 Error

**This means:** JWT token is invalid or not being sent

**Check:**

1. Make sure you're logged in first
2. Check browser console for error
3. Look for backend log: "❌ Auth failed: Missing Authorization header"
4. **Solution:** Log out and log back in

### ❌ Upload Says "No file uploaded"

**This means:** Busboy isn't receiving file data properly

**Check:**

1. File size < 10MB
2. File extension is allowed: .jpg, .png, .pdf, .doc, .docx, .txt
3. Look for backend message: "❌ No file data received"
4. **Solution:** Try a different file type or smaller file

### ❌ Upload Says "File too large"

**File exceeds 10MB limit**

**Solution:** Use a smaller file (< 10MB)

### ❌ Upload Seems to Work But Nothing Shows

**Check:**

1. Backend received the upload (look for "UPLOAD COMPLETE ✅")
2. Check if file was saved: `server/uploads/medical-reports/` directory
3. Check database: `SELECT COUNT(*) FROM medical_reports WHERE user_id = [YOUR_ID];`

---

## Frontend Console Errors to Look For

### Open Browser DevTools: F12 → Console

**Expected (No Errors):**

```
✅ Loaded [N] reports
📤 Uploading: [filename]
✅ Upload successful: [filename]
```

**Error Examples:**

**If you see:**

```
Error: Failed to fetch
```

→ Backend not running or CORS issue

**If you see:**

```
Failed to load reports
```

→ Check backend logs for database error

**If you see:**

```
Upload failed: 401 Unauthorized
```

→ Token issue, try logging in again

**If you see:**

```
Upload failed: Request failed with status code 404
```

→ Wrong endpoint! You're using old `/medical-reports` instead of new `/api/medical-reports/`

---

## Network Tab Debugging

**If uploads fail, use Network tab to see:**

1. Open DevTools: F12 → Network tab
2. Upload a file
3. Look for POST request to `/api/medical-reports/upload`
4. Check the response status:
   - `200` = Success ✅
   - `400` = Bad request (check response body)
   - `401` = Unauthorized
   - `404` = Wrong route
   - `500` = Server error (check backend logs)

---

## Backend Log Files

**Real-time logs appear in terminal:**

```bash
cd E:\E-Consultancy\server
npm start
```

**Look for:**

- `🎯 [MEDICAL REPORTS V2]` = New v2 requests
- `❌ Busboy error` = Parsing problem
- `✅ JWT verified` = Auth successful
- `🎯 UPLOAD COMPLETE ✅` = Success

---

## File System Check

**After upload, verify file was saved:**

```bash
ls E:\E-Consultancy\server\uploads\medical-reports\
```

**Should show:**

```
- [UUID]-[filename]
```

Example:

```
- abc123def456-myreport.pdf
- def789ghi012-scan.jpg
```

---

## Database Check

**Verify record was created in PostgreSQL:**

```sql
SELECT id, user_id, file_name, file_size, created_at
FROM medical_reports
WHERE user_id = 6
ORDER BY created_at DESC
LIMIT 5;
```

**Should show:**

- Your uploaded file record
- Correct user_id
- Correct file size
- Recent created_at timestamp

---

## What To Tell Me When It Fails

When you report an error, please share:

1. **Frontend URL:** What URL are you at?
2. **Browser Error:** Copy paste from DevTools console (F12)
3. **Backend Logs:** What do you see in the terminal?
4. **File Details:** What file are you uploading? Size?
5. **Status:** Does the upload finish or get stuck?

---

## Quick Restart Commands

**If something breaks:**

```bash
# Kill all servers
taskkill /IM node.exe /F

# Wait 2 seconds
sleep 2

# Restart backend
cd E:\E-Consultancy\server
npm start
```

**In another terminal, restart frontend:**

```bash
cd E:\E-Consultancy\client
npm run dev
```

---

## Success Indicators

✅ **Upload works when you see:**

- Browser: "Successfully uploaded: [filename]"
- Backend: "🎯 [MEDICAL REPORTS V2] UPLOAD COMPLETE ✅"
- File system: File saved in `server/uploads/medical-reports/`
- Database: New record with your data

---

## Key Points

- **V1 Route** (OLD, broken): `/api/medical/upload-report` ❌
- **V2 Route** (NEW, fixed): `/api/medical-reports/upload` ✅
- **Frontend URL**: `http://localhost:5173/medical-reports-v2` ✅
- **Upload endpoint**: `http://localhost:5000/api/medical-reports/upload`

---

**TEST NOW AND SHARE:**

1. Can you access http://localhost:5173/medical-reports-v2?
2. Can you click upload?
3. What error/message do you get?
4. What does backend show?
