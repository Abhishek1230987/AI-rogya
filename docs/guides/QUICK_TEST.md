# Quick Test Guide - Medical Report Upload Fix

## ⚡ Quick Start (5 Minutes)

### Step 1: Verify Server is Running ✅

```
✅ Backend: Running on http://localhost:5000
✅ Frontend: Running on http://localhost:5173
✅ Database: Connected
```

### Step 2: Test Guest Access (1 Minute)

1. Open http://localhost:5173 in browser
2. You should see home page WITHOUT needing to login
3. Click "Try Consultation" button
4. Start chatting as a guest

**Expected**: ✅ Can chat without login

---

## 📤 Test Medical Report Upload (3 Minutes)

### Step 1: Prepare Test File

- Pick any small image or PDF (under 10MB)
- Examples: JPG, PNG, PDF files
- Recommended size: 1-5MB for fast testing

### Step 2: Login to Application

1. Go to http://localhost:5173
2. Click Login (or use guest account if available)
3. Enter credentials

### Step 3: Navigate to Medical Reports

1. Click your profile menu
2. Select "Medical Reports"
3. Click "Upload New Report" button

### Step 4: Upload File

1. Select your test file
2. Click "Upload"
3. **WATCH BACKEND CONSOLE** for logs

### Step 5: Check Success

Look for this in backend console:

```
🎯 ========== UPLOAD REQUEST START (BUSBOY) ==========
📨 Headers: { 'content-type': 'multipart/form-data;...
🔐 Verifying JWT token...
✅ JWT verified, user ID: XX
📂 Parsing multipart data with Busboy...
📄 File received: your-file.jpg
💾 Saving to: file-TIMESTAMP.jpg
✅ File piped to disk successfully
✅ Busboy stream closed
🔬 Analyzing document...
✅ Analysis complete: MOCK_FALLBACK
💾 Saving report to database...
✅ Saved to DB, ID: XX
✅ Response sent successfully
🎯 ========== UPLOAD COMPLETE ==========
```

### Expected Results

#### ✅ Frontend Shows:

- Success message: "File uploaded successfully"
- File appears in Medical Reports list
- Can see analysis results

#### ✅ Backend Console Shows:

- All logs above (no errors)
- File size logged
- Analysis complete message

#### ✅ File System:

- File saved at: `server/uploads/file-{timestamp}.{ext}`
- Example: `server/uploads/file-1759765432123-987654321.jpg`

#### ✅ Database:

- New record in `medical_reports` table
- Correct user ID
- File path saved

---

## 🔍 Verify in File System

### Check Uploaded Files

```powershell
dir server/uploads/
# Should see: file-TIMESTAMP.jpg, file-TIMESTAMP.pdf, etc.
```

### Check Database Records

```sql
SELECT * FROM medical_reports ORDER BY id DESC LIMIT 1;
-- Should see your uploaded file
```

---

## ⚠️ If Something Goes Wrong

### Upload Returns Error (HTTP 400/500)

**Check 1**: Backend Logs

```
Look for: ❌ Error in backend console
Note: Exact error message
```

**Check 2**: Browser Network Tab

```
Right-click → Inspect → Network tab
Watch: POST /api/medical/upload-report
Check: Response body for error details
```

**Check 3**: File Size

```
Is file < 10MB? ✅
Is file empty? ❌
Is file readable? ✅
```

**Check 4**: Authorization

```
Are you logged in? ✅
Is token valid? ✅ (expires after ~24 hours)
```

### File Not Saved Despite Success Response

**Check**: Backend Error Handler

- May be issue with disk permissions
- Check `server/uploads/` directory permissions
- Try creating test file in that directory

### No Backend Logs Appearing

**Check**: Terminal Not Active

1. Open new terminal
2. Navigate to `server` directory
3. Run: `node src/index.js`
4. Try upload again

---

## 📊 Expected Performance

| Operation        | Time   | Status     |
| ---------------- | ------ | ---------- |
| Upload 1MB file  | 0.5-1s | ✅ Fast    |
| Upload 5MB file  | 2-3s   | ✅ Normal  |
| Upload 10MB file | 4-5s   | ✅ OK      |
| Analysis (mock)  | <100ms | ✅ Instant |
| Database save    | <100ms | ✅ Instant |

---

## 🎯 Success Checklist

Before considering upload fixed, verify ALL:

- [ ] Upload completes without error
- [ ] Backend logs show all steps
- [ ] File appears in `server/uploads/`
- [ ] Database record created
- [ ] Frontend shows success message
- [ ] File can be downloaded (if feature exists)
- [ ] Multiple files can be uploaded
- [ ] Large files (5-10MB) work
- [ ] Guest access works
- [ ] Error messages are helpful

---

## 🚨 Critical Files for Debugging

| File                                     | Purpose         | Check For                    |
| ---------------------------------------- | --------------- | ---------------------------- |
| `server/src/routes/medical.js`           | Upload handler  | Lines 103-285 (Busboy code)  |
| `server/src/services/medicalAnalyzer.js` | Analysis engine | Lines 1-150 (mock data)      |
| `server/src/config/database.js`          | Schema          | document_type column present |
| `server/uploads/`                        | Saved files     | Files with `file-*` names    |
| Backend console                          | Logs            | Upload flow messages         |

---

## 📞 Support Info

### If Upload Still Fails After Testing:

1. **Take Screenshot** of:

   - Backend error log
   - Frontend error message
   - Browser network response

2. **Check These**:

   - Is server running? (`✅ Server successfully running on port 5000`)
   - Is database connected? (`Connected to PostgreSQL database`)
   - Are migrations done? (`✅ Migration: Added document_type column`)

3. **Common Fixes**:
   - Restart server: Kill node.exe, run `node src/index.js` again
   - Clear browser cache: Ctrl+Shift+Delete → Clear all
   - Check disk space: At least 100MB free
   - Verify permissions: Can write to `server/uploads/`

---

## 🎉 Success Indicators

### Level 1: Basic Upload Works ✅

- File uploads without error
- Response received by frontend

### Level 2: File Saved ✅

- File exists in `server/uploads/`
- Correct size and name

### Level 3: Database Works ✅

- Record created in `medical_reports`
- Correct user ID and file path

### Level 4: Full Success ✅

- All above + analysis returned + frontend shows results

---

## Next Steps After Success

1. ✅ **Test Multiple Uploads**

   - Upload 5-10 different files
   - Verify all save correctly

2. ✅ **Test Large Files**

   - Upload 5-10MB file
   - Verify it completes

3. ✅ **Test Error Cases**

   - Wrong file type (should reject)
   - File > 10MB (should reject)
   - No authorization (should return 401)

4. ✅ **Monitor Stability**
   - Leave server running for 1 hour
   - Perform uploads regularly
   - Watch for any errors in logs

---

## Backend Console Commands (For Advanced Users)

### Monitor Real-Time Logs

```powershell
# Terminal 1: Run server
cd server
node src/index.js

# Terminal 2: Watch uploads directory
dir server/uploads/ -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 10
```

### Check Database Records

```powershell
# Using psql (if installed)
psql -U your_user -d your_db
SELECT id, user_id, file_name, file_size, uploaded_at FROM medical_reports ORDER BY id DESC LIMIT 5;
```

---

**Quick Test Duration**: ~5 minutes  
**Success Rate**: Should be 100% with new Busboy code ✅  
**Ready to Test**: YES! 🚀
