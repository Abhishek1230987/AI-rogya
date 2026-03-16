# 🚀 SOS SYSTEM - QUICK START COMMANDS

**Copy-paste these commands to get started!**

---

## ⚡ FASTEST WAY TO GET RUNNING (Do these in order)

### Terminal 1: Start Backend

```powershell
cd e:\E-Consultancy\server
npm install
npm start
```

### Terminal 2: Start Frontend

```powershell
cd e:\E-Consultancy\client
npm install
npm run dev
```

### Terminal 3: Run Setup Script

```powershell
cd e:\E-Consultancy
node setup-sos-system.js
```

### In Your Browser

```
http://localhost:5173
```

---

## 📋 WHAT EACH TERMINAL SHOWS

### Terminal 1 Output (Backend should show):

```
✅ Server listening on port 5000
✅ Connected to PostgreSQL database
✅ SOS service initialized
```

### Terminal 2 Output (Frontend should show):

```
✅ VITE v5.x.x  ready in xxx ms
✅ ➜  Local:   http://localhost:5173/
```

### Terminal 3 Output (Setup script should show):

```
✅ Database connection successful
✅ Telegram bot is configured
✅ SOS alerts table ready
✅ Test user created
✅ Emergency contacts configured
✅ SOS alert sent successfully
```

---

## 🔧 ENVIRONMENT SETUP (One time only)

### Windows: Create .env in server folder

**File location**: `e:\E-Consultancy\server\.env`

**Content**:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=e_consultancy

TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE

JWT_SECRET=your-secret-key-here

PORT=5000
NODE_ENV=development
```

### Get TELEGRAM_BOT_TOKEN:

1. Open Telegram
2. Search: `@BotFather`
3. Send: `/start`
4. Send: `/newbot`
5. Follow prompts (give bot name, username)
6. Copy the token it gives you
7. Paste into .env file

---

## 🧪 TESTING THE SYSTEM

### Test 1: Check Backend is Running

```powershell
curl http://localhost:5000/api/sos/config
```

Should show error (that's ok, it means server is running)

### Test 2: Check Frontend is Running

```powershell
start http://localhost:5173
```

Browser should open with app

### Test 3: Run Full Setup

```powershell
cd e:\E-Consultancy
node setup-sos-system.js
```

Should show all ✅ checks passing

### Test 4: Manual API Test

```powershell
$token = "YOUR_JWT_TOKEN_FROM_SETUP_SCRIPT"

curl -X POST http://localhost:5000/api/sos/test-telegram `
  -H "Content-Type: application/json" `
  -d '{"telegramId": "YOUR_TELEGRAM_ID"}'
```

---

## 🎮 USING THE SOS FEATURE

### Step 1: Login

- Go to `http://localhost:5173`
- Create account or login
- Go to `http://localhost:5173/sos-setup`

### Step 2: Add Emergency Contacts

1. Get your family's Telegram IDs (ask them to use @userinfobot)
2. Enter IDs in setup wizard
3. Click Test to verify
4. Save

### Step 3: Send SOS

1. Click 🚨 button (top-right)
2. Fill form:
   - Severity: Choose level
   - Message: Type message (optional)
   - Voice: Record (optional)
3. Click Send
4. Check Telegram for alert ✅

---

## 🔄 COMMON WORKFLOWS

### Fresh Installation

```powershell
# Clean install from scratch
cd e:\E-Consultancy\server
rm node_modules -Recurse
npm install
npm start

# In another terminal
cd e:\E-Consultancy\client
rm node_modules -Recurse
npm install
npm run dev

# In another terminal
cd e:\E-Consultancy
node setup-sos-system.js
```

### After Making Code Changes

```powershell
# Backend
cd server
npm start  # Auto-restarts with nodemon

# Frontend
cd client
npm run dev  # Auto-refreshes
```

### Reset Database

```powershell
# WARNING: This deletes all data!
psql -U postgres -d e_consultancy -c "DROP TABLE sos_alerts CASCADE;"

# Then run setup again
node setup-sos-system.js
```

### Check What's Running

```powershell
# Check if ports are in use
netstat -tulpn | findstr :5000
netstat -tulpn | findstr :5173

# Kill process on port 5000
taskkill /F /PID <PID>
```

---

## 📱 GET YOUR TELEGRAM ID

### Quick Method:

1. Open Telegram
2. Search: `@userinfobot`
3. Send it: `hi`
4. It replies with: `Your user id: 123456789`
5. Copy: `123456789` ← Use this!

---

## ✅ VERIFICATION CHECKLIST

- [ ] Backend running on port 5000 (no errors)
- [ ] Frontend running on localhost:5173 (no errors)
- [ ] Setup script completed with all ✅ checks
- [ ] Can access `http://localhost:5173/sos-setup`
- [ ] Can see SOS button (🚨) in navbar
- [ ] Can open SOS modal (form appears)
- [ ] Emergency contacts configured
- [ ] Test message received in Telegram
- [ ] Can send SOS alert successfully
- [ ] Alert appears in Telegram

---

## 🆘 IF SOMETHING GOES WRONG

### Backend won't start

```powershell
# Check if port is in use
netstat -tulpn | findstr :5000

# Check database
psql -U postgres -l  # Lists databases

# Check .env file
cat server\.env  # Should have all variables
```

### Frontend won't load

```powershell
# Clear cache and reinstall
cd client
rm node_modules -Recurse
npm install
npm run dev

# Check if VITE_API_URL is correct
cat client\.env
```

### Database errors

```powershell
# Start PostgreSQL
# Windows: Services > PostgreSQL
# Or via terminal: pg_ctl -D "C:\Program Files\PostgreSQL\data" start

# Check connection
psql -U postgres -d e_consultancy -c "SELECT NOW();"
```

### Telegram not receiving messages

```powershell
# Verify bot token
node -e "console.log(process.env.TELEGRAM_BOT_TOKEN)"

# Test Telegram connection
curl -X POST http://localhost:5000/api/sos/test-telegram `
  -H "Content-Type: application/json" `
  -d '{"telegramId": "YOUR_ID"}'

# Check if Telegram ID is correct
# Use @userinfobot to get it again
```

---

## 📊 SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────┐
│         Browser (localhost:5173)         │
│  ┌────────────────────────────────────┐  │
│  │   React App                        │  │
│  │  - SOS Button (🚨)                 │  │
│  │  - Setup Wizard                    │  │
│  │  - Form & Voice Recording          │  │
│  └────────────────────┬───────────────┘  │
└─────────────────────────────────────────┘
                        │
                        │ HTTP/REST
                        ▼
        ┌───────────────────────────────┐
        │   Backend (localhost:5000)     │
        │  ┌─────────────────────────┐   │
        │  │ Express.js Server       │   │
        │  │ - SOS Controller        │   │
        │  │ - JWT Auth              │   │
        │  │ - Telegram Service      │   │
        │  └──────┬──────────────────┘   │
        └─────────┼────────────────────┘
                  │
         ┌────────┴──────────┐
         │                   │
         ▼                   ▼
    ┌──────────┐      ┌─────────────┐
    │PostgreSQL│      │ Telegram API│
    │Database  │      │ Bot Service │
    │  (sos_   │      │ (sends msgs)│
    │  alerts) │      └─────────────┘
    └──────────┘           │
                           ▼
                    ┌────────────────┐
                    │  Telegram      │
                    │  (Parents get  │
                    │   alerts)      │
                    └────────────────┘
```

---

## 🎯 YOUR CHECKLIST TODAY

- [ ] Read this document (you are here ✅)
- [ ] Setup `.env` with TELEGRAM_BOT_TOKEN
- [ ] Start backend: `npm start` (server folder)
- [ ] Start frontend: `npm run dev` (client folder)
- [ ] Run setup: `node setup-sos-system.js`
- [ ] Get family Telegram IDs (via @userinfobot)
- [ ] Login to app and go to `/sos-setup`
- [ ] Enter Telegram IDs
- [ ] Test connection
- [ ] Try SOS button
- [ ] Check Telegram for alert
- [ ] ✅ DONE!

---

## 💡 PRO TIPS

1. **Get Telegram IDs right**: Ask family to use `@userinfobot` - it's the easiest
2. **Test with your own ID first**: Configure your own Telegram ID first to test
3. **Keep terminal windows open**: Keep all 3 terminals (backend, frontend, setup) open while testing
4. **Check .env file**: Most errors are due to missing or wrong `.env` values
5. **Use emoji to identify**: Telegram IDs are just numbers. Double-check them!
6. **Voice recording is optional**: Audio adds great context but text works fine too
7. **Test before deploying**: Use setup wizard to test connection before production
8. **Keep backups**: Save Telegram IDs somewhere safe (notes app, password manager)

---

## 📞 QUICK REFERENCE

| What            | How                                                    |
| --------------- | ------------------------------------------------------ |
| Get Telegram ID | Message @userinfobot in Telegram                       |
| Get Bot Token   | Message @BotFather in Telegram, send `/newbot`         |
| Start Backend   | `cd server && npm start`                               |
| Start Frontend  | `cd client && npm run dev`                             |
| Run Setup       | `node setup-sos-system.js`                             |
| Test SOS        | Click 🚨 button in app, fill form, send                |
| Check Telegram  | Open your Telegram app and look for alerts             |
| View Database   | `psql -U postgres -d e_consultancy`                    |
| Kill Port 5000  | `taskkill /F /PID <PID>`                               |
| Clear Cache     | `cd client && rm node_modules -Recurse && npm install` |

---

## 🎉 THAT'S IT!

You now have everything you need to run the complete SOS system end-to-end!

**Start with the "Fastest Way" section at the top** ☝️

Generated: November 8, 2025
