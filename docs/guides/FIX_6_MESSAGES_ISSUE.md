# 🔴 CRITICAL FIX - 6 Messages Issue

## Problem: Receiving 6 Messages Instead of 1

You're getting **6 messages** when clicking SOS button once. This is a critical issue.

## Root Causes (Most Likely)

### Cause #1: Duplicate Records in Database (Most Common)

Your `medical_history` table might have **2 records** for the same user, each with 3 contacts:

```
medical_history row 1: parent1, parent2, guardian = 3 messages
medical_history row 2: parent1, parent2, guardian = 3 messages
Total = 6 messages ❌
```

**Fix Applied**: Now querying with `LIMIT 1` and `ORDER BY updated_at DESC`

- Only gets the LATEST medical record per user
- No duplicates possible

### Cause #2: Duplicate Telegram IDs

Emergency contact stored with same ID multiple times:

```
parent1_telegram_id: 123456
parent2_telegram_id: 123456
guardian_telegram_id: 123456
```

**Fix Applied**: Using JavaScript `Set` to remove duplicates

- Automatically removes duplicate IDs
- Validates each ID before adding

### Cause #3: Both Audio and Text Being Sent

Previously, code was sending text AND audio separately.

**Fix Applied**: Mutually exclusive logic

- Send ONLY audio if exists
- Send ONLY text if no audio
- No dual sending

## Fixes Implemented

### 1. Database Query Fix

```javascript
// BEFORE - Could get multiple records per user
const medicalResult = await pool.query(
  "SELECT emergency_contact FROM medical_history WHERE user_id = $1",
  [userId]
);

// AFTER - Gets only the latest record
const medicalResult = await pool.query(
  `SELECT emergency_contact FROM medical_history 
   WHERE user_id = $1 
   ORDER BY updated_at DESC LIMIT 1`,
  [userId]
);
```

### 2. Duplicate ID Removal

```javascript
// Uses Set to automatically remove duplicates
const parentTelegramIdsSet = new Set();
parentTelegramIdsSet.add(id1);
parentTelegramIdsSet.add(id2);
parentTelegramIdsSet.add(id2); // Duplicate ignored
const uniqueIds = Array.from(parentTelegramIdsSet); // Only unique IDs
```

### 3. ID Validation

```javascript
// Checks for null, undefined, "null", "undefined" strings
if (id && id !== "null" && id !== "undefined" && id.length > 0) {
  parentTelegramIdsSet.add(id);
}
```

### 4. Enhanced Logging

```javascript
console.log("📊 SOS Alert Final Results:", {
  totalContacts: results.total,
  successfulMessages: results.successful,
  failedMessages: results.failed,
  hasAudio: !!audioFile,
  elapsedMs: Date.now() - startTime,
});
```

Now you can see EXACTLY how many messages were sent!

## How to Deploy This Fix

```bash
# 1. Pull latest code
git pull

# 2. Restart server (CRITICAL!)
cd server
npm run dev

# 3. Clear server cache
npm run dev  # First run will rebuild

# 4. Test
# Go to SOS page
# Send 1 SOS alert
# Check Telegram - should see 1 message (not 6)
```

## Testing

### Before Fix

- Click SOS button once → Receive 6 messages
- Server logs show: `SOS sent: 6 successful`

### After Fix

- Click SOS button once → Receive 1 message
- Server logs show: `totalContacts: 1, successfulMessages: 1`

## Server Logs - What to Look For

### GOOD (After Fix)

```
▶️  SOS Alert Request Started at 2024-11-09T10:30:00Z

🔍 Emergency contacts analysis: {
  emergencyContactObj: {parent1_telegram_id: "123456"},
  extractedUniqueIds: ["123456"],
  totalUnique: 1
}

📋 SOS Alert Summary: {
  userId: 5,
  hasAudio: true,
  totalContacts: 1,
  contacts: ["123456"]
}

📤 Sending audio to 1 contact(s)...
✅ Audio sent successfully to 123456

📊 SOS Alert Final Results: {
  totalContacts: 1,
  successfulMessages: 1,
  failedMessages: 0,
  hasAudio: true,
  elapsedMs: 1245
}

✅ SOS Alert Request Completed Successfully
```

### BAD (Before Fix)

```
📊 SOS sent: 6 successful, 0 failed out of 6

(This means 6 messages were sent - ERROR!)
```

## Files Modified

| File                 | Changes                                     |
| -------------------- | ------------------------------------------- |
| `sosController.js`   | Database query LIMIT 1, validation, logging |
| `telegramService.js` | Better error handling                       |

## Checklist After Deploy

- [ ] Server restarted
- [ ] Send test SOS alert
- [ ] Check Telegram: 1 message (not 6)
- [ ] Check server logs for "totalContacts: 1"
- [ ] Try with audio and without audio
- [ ] Try with multiple different users
- [ ] Verify logs show correct counts

## If Still Getting 6 Messages

### Check 1: Server Restarted?

```bash
# Make sure you restarted
npm run dev
```

### Check 2: Check Database Records

```bash
# Run this SQL query:
SELECT user_id, COUNT(*) as record_count
FROM medical_history
GROUP BY user_id
HAVING COUNT(*) > 1;

# If results show > 1 records per user, that's the problem!
```

### Check 3: Check Emergency Contact Values

```bash
# Run this SQL query:
SELECT user_id, emergency_contact
FROM medical_history
WHERE user_id = <YOUR_USER_ID>;

# Look for duplicate IDs or multiple records
```

### Check 4: Clean Database (If Needed)

```sql
-- Delete duplicate records, keeping only the latest
DELETE FROM medical_history
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM medical_history
  WHERE emergency_contact IS NOT NULL
  ORDER BY user_id, updated_at DESC
);
```

## Prevention for Future

1. **Always use LIMIT 1** when querying single user records
2. **Use Set for deduplication** when collecting IDs
3. **Validate data** before sending
4. **Log message counts** for debugging

## Support

If still having issues:

1. Check server logs (paste the output)
2. Run SQL queries from "Check Database Records" section
3. Verify .env has correct TELEGRAM credentials
4. Verify emergency contacts are set correctly

## Expected Results

✅ **1 SOS button click = 1 message per contact** (not 6)

If you have 1 emergency contact configured:

- 1 click → 1 message ✅

If you have 2 emergency contacts configured:

- 1 click → 2 messages ✅ (one per contact)

If you have 3 emergency contacts configured:

- 1 click → 3 messages ✅ (one per contact)

But NOT 6 messages from a single contact! ✅

---

**Status**: ✅ Fixed - Multiple safety checks added
**Tested**: 🔄 Your turn to test
**Critical**: Yes - This prevents message spam
