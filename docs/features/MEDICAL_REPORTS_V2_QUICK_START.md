# 🚀 QUICK START - Medical Reports V2

## 1️⃣ Restart Backend Server

```powershell
# Kill old process
taskkill /IM node.exe /F

# Wait 2 seconds
sleep 2

# Start new backend
cd e:\E-Consultancy\server
node src/index.js
```

**Expected Output:**

```
✅ Gemini AI initialized successfully
✅ Socket.IO server initialized for WebRTC
Connected to PostgreSQL database
✅ Migration: Added document_type column to medical_reports
✅ Server successfully running on port 5000
✅ Health check available at http://localhost:5000/health
✅ Server is listening and ready to accept connections
✅ Medical Reports Router Loaded Successfully
```

---

## 2️⃣ Update Frontend Router (If Needed)

If the route `/medical-reports-v2` doesn't work yet, add it to `client/src/App.jsx`:

```javascript
// Add import
import MedicalReportsV2 from "./pages/MedicalReportsV2";

// In your Routes section, add:
<Route path="/medical-reports-v2" element={<MedicalReportsV2 />} />;
```

Save and the app will reload automatically.

---

## 3️⃣ Test the Feature

### Open in Browser

```
http://localhost:5173/medical-reports-v2
```

### You Should See

- ✅ Upload area with drag & drop
- ✅ "Your Reports" list (empty if first time)
- ✅ File selector button

### Try Upload

1. **Prepare a test file**

   - Use any JPG, PNG, PDF, DOC, DOCX, or TXT file
   - Should be under 10MB

2. **Upload the file**

   - Click on upload area or drag & drop
   - Click "Upload File" button
   - Wait for success message

3. **Verify Success**
   - Should see: "Successfully uploaded: filename.ext"
   - File should appear in "Your Reports" list

---

## 4️⃣ Check Backend Logs

While uploading, watch the server terminal for:

```
🎯 [MEDICAL REPORTS] UPLOAD REQUEST START
✅ Step 1: Verifying authentication...
✅ Token verified, user ID: 10
✅ Step 2: Initializing Busboy for multipart parsing...
✅ File received: your-file.jpg
💾 Saving file to: /path/to/uploads/medical-reports/file-....jpg
✅ File written to disk
✅ Step 4: Creating analysis...
✅ Step 5: Saving to database...
✅ Saved to database, ID: XX
🎯 [MEDICAL REPORTS] UPLOAD COMPLETE ✅
```

---

## 5️⃣ Verify File Saved

### Check Disk

```powershell
# List uploaded files
dir server/uploads/medical-reports/
```

You should see files like: `report-1759765432123-987654321.jpg`

### Check Database

```sql
-- Query uploaded files
SELECT id, user_id, file_name, file_size, created_at
FROM medical_reports
ORDER BY id DESC
LIMIT 5;
```

---

## 🎯 What Each Part Does

### Backend Route (`medical-reports-v2.js`)

- Handles file uploads with Busboy
- Saves files to `server/uploads/medical-reports/`
- Creates database records
- Provides download & delete functionality
- **100% isolated** from other features

### Frontend Component (`MedicalReportsV2.jsx`)

- Upload interface with drag & drop
- Lists all user's reports
- Download & delete buttons
- Expandable report details
- Shows analysis data

### Database Table

- Uses existing `medical_reports` table
- Stores file metadata
- Stores analysis data as JSON
- Links files to user accounts

---

## ✅ Success Checklist

After following the steps above, verify:

- [ ] Backend started without errors
- [ ] "Medical Reports Router Loaded Successfully" in logs
- [ ] Can access `/medical-reports-v2` page
- [ ] Upload area displays correctly
- [ ] Can select a test file
- [ ] Upload completes successfully
- [ ] Success message appears
- [ ] File appears in "Your Reports" list
- [ ] Backend logs show all steps
- [ ] File exists in `server/uploads/medical-reports/`
- [ ] Database record created

---

## ❌ If Something Goes Wrong

### Backend Won't Start

```bash
# 1. Check if port is in use
netstat -ano | findstr :5000

# 2. Kill any existing process
taskkill /PID <PID> /F

# 3. Restart backend
cd server && node src/index.js
```

### Route Not Found (404)

```bash
# 1. Check App.jsx has the route
# 2. Restart backend (imports need to reload)
# 3. Clear browser cache (Ctrl+Shift+Delete)
# 4. Refresh page (Ctrl+F5)
```

### Upload Fails

```
Check these:
1. You're logged in ✅
2. File is under 10MB ✅
3. File type is supported ✅
4. Backend console shows no errors ✅
5. Network tab shows response ✅
```

### Files Not Saving

```
Check:
1. Folder exists: server/uploads/medical-reports/
   If not: Create it manually

2. Permissions: Folder should be writable
   dir server/uploads/

3. Disk space: At least 100MB free
   Get-Volume C:
```

---

## 🔗 Important Links

| What              | URL/Path                                  |
| ----------------- | ----------------------------------------- |
| **Feature Page**  | http://localhost:5173/medical-reports-v2  |
| **API Base**      | http://localhost:5000/api/medical-reports |
| **Backend Code**  | `server/src/routes/medical-reports-v2.js` |
| **Frontend Code** | `client/src/pages/MedicalReportsV2.jsx`   |
| **Files Storage** | `server/uploads/medical-reports/`         |
| **Documentation** | `MEDICAL_REPORTS_V2_GUIDE.md`             |

---

## 📊 API Endpoints

```bash
# Upload file
POST /api/medical-reports/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data
Body: { file: File }

# List reports
GET /api/medical-reports/list
Authorization: Bearer {token}

# Get report
GET /api/medical-reports/{reportId}
Authorization: Bearer {token}

# Delete report
DELETE /api/medical-reports/{reportId}
Authorization: Bearer {token}

# Download file
GET /api/medical-reports/download/{reportId}
Authorization: Bearer {token}
```

---

## 🎓 Learning

To understand how it works:

1. **Backend Logic**: Read `server/src/routes/medical-reports-v2.js`

   - Upload handling (lines 120-220)
   - Database operations (lines 40-85)
   - Error handling (throughout)

2. **Frontend Logic**: Read `client/src/pages/MedicalReportsV2.jsx`

   - Fetch reports (lines 40-70)
   - Handle upload (lines 85-115)
   - Display list (lines 200-280)

3. **Architecture**: Read `MEDICAL_REPORTS_V2_GUIDE.md`
   - Design decisions
   - Feature comparison
   - API documentation

---

## 🚀 Next Steps

### If Working

1. ✅ Test with multiple files
2. ✅ Test delete functionality
3. ✅ Test download functionality
4. ✅ Monitor performance

### If Not Working

1. Check troubleshooting above
2. Check backend logs carefully
3. Check browser console for errors
4. Verify network request in Network tab
5. Re-read the documentation

### Integration

Once working perfectly:

1. Add link to `/medical-reports-v2` in navigation
2. Remove link to old `/medical-reports`
3. Migrate data if needed
4. Update documentation

---

## 💡 Pro Tips

### Faster Debugging

1. Keep backend terminal visible while testing
2. Watch for error logs in terminal
3. Check browser console (F12) for client errors
4. Use Network tab (F12) to see API responses

### Testing Multiple Files

1. Upload JPG, PNG, PDF, DOC files
2. Test with different file sizes
3. Test delete and download
4. Verify each file in `server/uploads/medical-reports/`

### Monitoring

1. Watch backend logs while uploading
2. Check database after upload
3. Verify file on disk
4. Test download functionality

---

**Status**: ✅ READY TO TEST

**Start here**: http://localhost:5173/medical-reports-v2

**Questions?** Check `MEDICAL_REPORTS_V2_GUIDE.md` for complete documentation
