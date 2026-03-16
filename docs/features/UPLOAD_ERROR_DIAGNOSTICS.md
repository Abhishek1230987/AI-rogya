# Upload Error Diagnostics

## Error Details

```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
Error processing Report1.jpg: Error: Upload failed for Report1.jpg
server connection lost. Polling for restart...
```

## What This Means

1. **500 Error** → Server crashed or unhandled error
2. **Connection Lost** → Backend server crashed/restarted
3. **Upload Failed** → OCR processing likely threw unhandled exception

## Root Causes (Most Likely)

### Cause 1: OCR Worker Crash ⚠️

The Tesseract.js worker is crashing when processing the image.

**Signs:**

- Server suddenly disconnects
- No error logged to console
- Works first time, fails after

**Solution:** Need to add better error handling in OCR

### Cause 2: Missing File Path ⚠️

OCR trying to process file that doesn't exist.

**Check:**

- File saved to server/uploads/?
- Path correct in analyzeDocument()?

### Cause 3: Memory Issue ⚠️

Node running out of memory during OCR.

**Check:**

- Run with more memory: `node --max-old-space-size=2048 src/index.js`

### Cause 4: Database Error ⚠️

PostgreSQL connection issue or table missing.

**Check:**

- Can connect to database?
- medical_reports table exists?

## Immediate Actions

1. **Check server console** for error messages

   - Look for stack trace
   - Find line number that failed

2. **Check if file saved**

   - Look in server/uploads/ folder
   - Should see file-TIMESTAMP.jpg

3. **Try simpler image**

   - Clear, text-only image
   - High contrast
   - Small file size

4. **Restart with more memory**
   ```bash
   cd server
   $env:NODE_OPTIONS = "--max-old-space-size=2048"
   npm run dev
   ```

## Checking Server Logs

To see what error occurred:

```bash
# Check terminal where npm run dev is running
# Look for:
# - ❌ OCR Error: ...
# - Error: ...
# - Stack trace
```

## Next Steps

1. Look at server terminal output when you see the 500 error
2. Copy the exact error message
3. I'll fix based on the error

---

**What to do now:**

1. Try uploading again
2. Watch server console for error
3. Tell me what error you see
