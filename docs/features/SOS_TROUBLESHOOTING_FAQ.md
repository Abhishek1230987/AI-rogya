# 🆘 SOS Feature - Troubleshooting & FAQ

**Last Updated**: November 8, 2025  
**Status**: Comprehensive Guide

---

## ❓ Frequently Asked Questions

### Q1: What if Telegram is blocked in my country?

**A**: The SOS feature is designed to work with alternative messaging services. You can:

1. Use VPN to access Telegram
2. Configure alternative Telegram client
3. This serves as a backup when primary (WhatsApp/SMS) fails
4. Consider regional messaging services as fallback

---

### Q2: Do I need to buy Telegram Premium?

**A**: No, Telegram is completely free! The SOS bot also uses the free tier of Telegram Bot API with no cost.

---

### Q3: Can I use WhatsApp instead of Telegram?

**A**: Currently, this implementation uses Telegram. To add WhatsApp:

1. You would need WhatsApp Business API credentials
2. Requires Twilio or Meta's WhatsApp Cloud API
3. This is a future enhancement option
4. For now, Telegram is the recommended solution

---

### Q4: What happens if one parent doesn't have Telegram?

**A**: The system supports multiple contacts. If one fails:

1. The alert still sends to other configured contacts
2. You get a report of who received it
3. Setup at least 2-3 contacts for redundancy
4. Consider email as additional fallback

---

### Q5: Is my location data secure?

**A**: Yes! Location security features:

- ✅ Only sent to authorized emergency contacts
- ✅ Deleted after 30 days (configurable)
- ✅ Not visible to hospitals or other services
- ✅ Encrypted in transit (HTTPS)
- ✅ Users control when location is shared

---

### Q6: Can I test without actually sending alerts?

**A**: Yes! Use the test features:

1. **Test Telegram Connection**: Tests if bot works without sending full SOS
2. **Staging Environment**: Set up test accounts
3. **Mock Location**: Don't enable real geolocation in tests
4. **Test Messages**: Send a "MEDIUM" severity to test

---

### Q7: How often can I send SOS alerts?

**A**: There are no built-in rate limits, but:

- ⏳ Telegram API allows ~100+ messages/second per bot
- ⏳ Each alert takes ~1-2 seconds
- ⏳ Practical limit: Send as many as needed in emergency
- 🔄 Rate limiting can be added per user if needed
- 💡 Design assumes genuine emergencies only

---

### Q8: What if the internet is down?

**A**: The SOS feature requires internet because:

- It uses Telegram (cloud service)
- Without internet, no alerts can be sent
- **Fallback**: Use phone call or SMS to emergency contacts
- 💡 Future: Local offline messaging could be added

---

### Q9: Can multiple devices trigger SOS?

**A**: Yes! Each user can:

- Log in from multiple devices
- Send SOS from any device
- Each sends to same emergency contacts
- Recommended: Only enable on main device

---

### Q10: Is there a time limit before sending?

**A**: No!

- Send immediately in emergencies
- Takes <1 second to send
- No delays or waiting periods
- Notifications appear immediately in Telegram

---

## 🐛 Common Issues & Solutions

### Issue 1: "Telegram bot is not configured"

**Symptoms**: Error when trying to test connection

**Causes**:

- ❌ `TELEGRAM_BOT_TOKEN` not in `.env`
- ❌ Server not restarted after adding token
- ❌ Token copied incorrectly
- ❌ Wrong environment file

**Solutions**:

```bash
# 1. Check if token is set
grep TELEGRAM_BOT_TOKEN server/.env

# 2. Verify token format (should start with numbers)
# Correct: 123456789:ABCDefGhIJ...
# Wrong: your_token_here

# 3. If missing, add it
echo "TELEGRAM_BOT_TOKEN=YOUR_TOKEN" >> server/.env

# 4. Restart server
npm run server

# 5. Test again
curl -X POST http://localhost:5000/api/sos/test-telegram \
  -H 'Content-Type: application/json' \
  -d '{"telegramId": "YOUR_CHAT_ID"}'
```

---

### Issue 2: "Failed to send test message"

**Symptoms**: Test message doesn't arrive in Telegram

**Possible Causes**:

#### Cause A: Invalid Chat ID

```bash
# Solution: Get correct ID
# 1. Go to @userinfobot in Telegram
# 2. Click START
# 3. Your ID appears immediately
# 4. Copy exact number (may be negative, e.g., -123456789)
```

#### Cause B: Invalid Bot Token

```bash
# Solution: Verify token
curl https://api.telegram.org/botYOUR_TOKEN/getMe

# Should return bot info like:
# {"ok":true,"result":{"id":123456789,"is_bot":true,...}}

# If error, get new token from @BotFather
```

#### Cause C: Network/Firewall Issues

```bash
# Solution: Check connectivity
# Test connection to Telegram API
curl https://api.telegram.org/

# Should return some response (not error)
```

#### Cause D: Rate Limiting

```bash
# Solution: Wait a few seconds and retry
# Telegram rate limit: ~30 messages/second max
sleep 5
# Then retry test
```

---

### Issue 3: "No emergency contacts found"

**Symptoms**: Can't send SOS alert, says no contacts

**Causes**:

- ❌ Haven't configured any Telegram IDs yet
- ❌ All IDs are invalid/empty
- ❌ Medical history record not created

**Solutions**:

```bash
# 1. Setup contacts via API
curl -X POST http://localhost:5000/api/sos/update-contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "parent1_telegram_id": "1234567890"
  }'

# 2. Verify they're saved
curl http://localhost:5000/api/sos/config \
  -H 'Authorization: Bearer YOUR_TOKEN'

# 3. Then send SOS
curl -X POST http://localhost:5000/api/sos/send \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Test alert",
    "severity": "MEDIUM"
  }'
```

---

### Issue 4: "Database table not found"

**Symptoms**: 500 error mentioning "sos_alerts table"

**Causes**:

- ❌ Migration not applied
- ❌ Database doesn't exist
- ❌ Wrong database user permissions

**Solutions**:

```bash
# 1. Check if table exists
psql -U consultancy_user -d e_consultancy \
  -c "SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'sos_alerts'
  )"

# Should return: exists
# t (if true)
# f (if false)

# 2. If false, apply migration
psql -U consultancy_user -d e_consultancy \
  -f server/migrations/002_create_sos_alerts.sql

# 3. Verify creation
psql -U consultancy_user -d e_consultancy -c "\dt sos_alerts"
```

---

### Issue 5: "Authentication required" or 401 error

**Symptoms**: Getting 401 when trying to use SOS endpoints

**Causes**:

- ❌ JWT token missing from header
- ❌ JWT token expired
- ❌ JWT token format wrong
- ❌ Not logged in

**Solutions**:

```bash
# 1. Get valid JWT token
# Login via API:
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# 2. Use token in Authorization header
curl http://localhost:5000/api/sos/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Token format must be: Bearer {token}
# Not: JWT {token} or {token}
```

---

### Issue 6: "SOS sent but some recipients failed"

**Symptoms**: Not all emergency contacts received the alert

**Causes**:

- ⚠️ One contact Telegram ID might be invalid
- ⚠️ That contact's Telegram might be down
- ⚠️ Network issues for specific recipient

**Solutions**:

```bash
# 1. Check which failed
curl http://localhost:5000/api/sos/history \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Look for alerts with failed_count > 0

# 2. Test individual contact
curl -X POST http://localhost:5000/api/sos/test-telegram \
  -H 'Content-Type: application/json' \
  -d '{"telegramId": "CONTACT_ID_TO_TEST"}'

# 3. If failed, get new ID from @userinfobot

# 4. Update contacts
curl -X POST http://localhost:5000/api/sos/update-contacts \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "parent1_telegram_id": "NEW_VALID_ID"
  }'

# 5. Try sending again
```

---

### Issue 7: Frontend component not showing

**Symptoms**: SOSFeature component doesn't render

**Causes**:

- ❌ Component not imported correctly
- ❌ Route not configured
- ❌ Authentication required but not logged in
- ❌ Component file not found

**Solutions**:

```jsx
// 1. Verify import in App.jsx
import SOSFeature from "./components/SOSFeature";

// 2. Add to route
<Route
  path="/sos"
  element={
    <ProtectedRoute>
      <SOSFeature />
    </ProtectedRoute>
  }
/>;

// 3. Or add as widget
import SOSFeature from "./components/SOSFeature";

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <SOSFeature />
    </div>
  );
}

// 4. Ensure user is logged in (check console for auth errors)
```

---

### Issue 8: Location not working

**Symptoms**: "Unable to get location" error

**Causes**:

- ❌ Browser permission denied
- ❌ HTTPS required (location API needs secure context)
- ❌ Device location services disabled
- ❌ Browser is private/incognito mode

**Solutions**:

```bash
# 1. Grant browser permission
# Browser → Settings → Site settings → Location → Allow

# 2. Ensure HTTPS in production
# Location API only works on:
# - localhost
# - https:// URLs

# 3. Enable device location
# Phone/Computer → Settings → Location → ON

# 4. Try non-incognito browser
# Privacy mode often disables location

# 5. Test browser support
# Try this in console:
navigator.geolocation.getCurrentPosition(
  pos => console.log(pos),
  err => console.log(err)
)
```

---

### Issue 9: Slow SOS sending

**Symptoms**: Takes >5 seconds to send alert

**Causes**:

- ⚠️ Telegram API is slow
- ⚠️ Network latency
- ⚠️ Server processing

**Solutions**:

```bash
# 1. Check network speed
# Use speedtest or similar tools

# 2. Monitor server logs
npm run server
# Look for timestamps before/after send

# 3. Check Telegram API status
# Visit status.core.telegram.org

# 4. Reduce contact count
# Fewer contacts = faster send
# But reduces redundancy

# 5. Use multiple regions
# Could add regional Telegram endpoints
```

---

### Issue 10: Can't find Telegram Bot Token

**Symptoms**: Don't remember where bot token is

**Solutions**:

```bash
# 1. Ask @BotFather again
# Message: /start (in Telegram)
# Message: /mybots
# Select your bot
# Message: API Token
# BotFather will show it again

# 2. Create new bot if needed
# Message: /newbot
# Follow prompts
# Get new token

# 3. Check your records
# Look for bot creation email (if configured)
```

---

## 🔧 Advanced Troubleshooting

### Enable Debug Logging

```bash
# Start server with debug
DEBUG=sos:* npm run server

# More verbose
DEBUG=sos:*,telegram:* npm run server

# All details
DEBUG=* npm run server
```

### Check Database Directly

```bash
# Connect to database
psql -U consultancy_user -d e_consultancy

# Check if table exists
\dt sos_alerts

# View recent alerts
SELECT id, user_id, message, severity,
       successful_count, failed_count, timestamp
FROM sos_alerts
ORDER BY timestamp DESC
LIMIT 10;

# Check emergency contacts
SELECT user_id, emergency_contact
FROM medical_history
WHERE emergency_contact IS NOT NULL;
```

### Test API Directly

```bash
# Using Postman or similar:
# 1. POST http://localhost:5000/api/sos/test-telegram
# 2. Headers: Content-Type: application/json
# 3. Body: {"telegramId": "YOUR_ID"}

# Or using curl:
curl -X POST http://localhost:5000/api/sos/test-telegram \
  -H 'Content-Type: application/json' \
  -d '{"telegramId": "1234567890"}' \
  -v  # verbose to see all details
```

---

## 📊 Performance Troubleshooting

### High Latency Issue

```bash
# Check Telegram API response time
time curl https://api.telegram.org/bot123456789:TOKEN/getMe

# Should complete in <1 second

# If slow:
# 1. Check internet speed: speedtest.net
# 2. Check Telegram status: status.core.telegram.org
# 3. Try from different network
# 4. Check CPU/Memory on server
```

### Database Slow

```bash
# Check query performance
EXPLAIN ANALYZE SELECT * FROM sos_alerts WHERE user_id = 1;

# Check indexes exist
SELECT * FROM pg_indexes WHERE tablename = 'sos_alerts';

# Add missing indexes if needed
CREATE INDEX idx_sos_user_timestamp
ON sos_alerts(user_id, timestamp DESC);
```

---

## ✅ Pre-Deployment Checklist

- [ ] Telegram bot token tested and working
- [ ] All emergency contacts verified
- [ ] Test message successfully sent
- [ ] Database migration applied
- [ ] No console errors
- [ ] All API endpoints respond correctly
- [ ] Frontend component renders
- [ ] Location services working
- [ ] Multiple severity levels tested
- [ ] SOS history displays
- [ ] Error messages are clear

---

## 📞 When to Call Support

You should seek external help if:

1. **Can't create Telegram bot** → Contact @BotFather
2. **Telegram API down** → Check status.core.telegram.org
3. **Database connection errors** → PostgreSQL logs
4. **Permission denied** → Check Linux file permissions
5. **Port already in use** → Check if other process using port
6. **Certificate errors** → HTTPS configuration issue
7. **Memory errors** → Server resource issue

---

## 🚀 Quick Recovery Steps

If something breaks:

```bash
# 1. Restart server
npm run server

# 2. Check logs
npm run server 2>&1 | tail -100

# 3. Verify environment
cat server/.env | grep TELEGRAM

# 4. Test token
curl https://api.telegram.org/botYOUR_TOKEN/getMe

# 5. Test database
psql -U consultancy_user -d e_consultancy -c "SELECT 1"

# 6. Clear cache (if needed)
npm cache clean --force

# 7. Reinstall dependencies
npm install

# 8. Restart everything
npm run server
```

---

## 📝 Reporting Issues

If you encounter a new issue:

1. **Describe what happened**

   - What were you trying to do?
   - What error appeared?

2. **Show the error**

   - Full error message
   - Screenshot if visual

3. **Provide context**

   - Browser type/version
   - Server OS
   - Database type
   - Network type (wifi/mobile)

4. **Share logs**
   - Server console output
   - Browser developer console (F12)
   - Database logs

---

## 🎓 Learning Resources

- **Telegram Bot API**: https://core.telegram.org/bots/api
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Express.js Guide**: https://expressjs.com/
- **React Documentation**: https://react.dev/

---

**Need Help?** Review the SOS_SETUP_GUIDE.md for step-by-step instructions!
