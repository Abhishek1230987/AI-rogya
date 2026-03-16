#!/usr/bin/env bash

# ============================================================================
# SOS Feature - Quick Setup and Testing Script
# ============================================================================
# This script helps you quickly set up and test the SOS emergency feature
# ============================================================================

set -e

echo "🚨 AIrogya SOS Emergency Feature - Quick Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check Node.js and npm
echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js installed: $(node --version)${NC}"

# Step 2: Check if .env exists
echo ""
echo -e "${BLUE}Step 2: Checking environment configuration...${NC}"
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️ server/.env not found${NC}"
    echo "Creating .env template..."
    cat > server/.env.example << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=e_consultancy
DB_USER=consultancy_user
DB_PASSWORD=consultancy_2025

# Telegram Bot Configuration (Required for SOS)
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE

# Example:
# TELEGRAM_BOT_TOKEN=123456789:ABCDefGhIJKlmnoPQRstuvWXYZ

# API Configuration
PORT=5000
CLIENT_URL=http://localhost:5173
SOCKET_URL=http://localhost:5000

# Session
SESSION_SECRET=your-session-secret-here

# Google Cloud (Optional)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_API_KEY=your-api-key

# AWS (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
EOF
    echo -e "${YELLOW}Created server/.env.example${NC}"
    echo ""
    echo -e "${YELLOW}Please follow these steps:${NC}"
    echo "1. Open server/.env"
    echo "2. Add your Telegram bot token:"
    echo "   TELEGRAM_BOT_TOKEN=your_token_here"
    echo "3. Save the file"
    echo ""
    exit 1
else
    if grep -q "TELEGRAM_BOT_TOKEN" server/.env; then
        echo -e "${GREEN}✅ TELEGRAM_BOT_TOKEN configured${NC}"
    else
        echo -e "${RED}❌ TELEGRAM_BOT_TOKEN not found in server/.env${NC}"
        echo "Please add: TELEGRAM_BOT_TOKEN=your_bot_token_here"
        exit 1
    fi
fi

# Step 3: Install dependencies
echo ""
echo -e "${BLUE}Step 3: Installing dependencies...${NC}"
if [ -f "server/package.json" ]; then
    cd server
    if [ ! -d "node_modules" ]; then
        echo "Installing server dependencies..."
        npm install > /dev/null 2>&1
    fi
    cd ..
    echo -e "${GREEN}✅ Server dependencies ready${NC}"
fi

# Step 4: Check database connection
echo ""
echo -e "${BLUE}Step 4: Checking database...${NC}"
echo "Note: Make sure PostgreSQL is running"
echo ""

# Step 5: Create database migration
echo -e "${BLUE}Step 5: Database migration${NC}"
if [ -f "server/migrations/002_create_sos_alerts.sql" ]; then
    echo -e "${GREEN}✅ SOS migration file exists${NC}"
    echo ""
    echo "To apply migration, run:"
    echo -e "${YELLOW}psql -U consultancy_user -d e_consultancy -f server/migrations/002_create_sos_alerts.sql${NC}"
else
    echo -e "${RED}❌ SOS migration file not found${NC}"
fi

# Step 6: Verify required files
echo ""
echo -e "${BLUE}Step 6: Verifying required files...${NC}"

files=(
    "server/src/services/telegramService.js"
    "server/src/controllers/sosController.js"
    "server/src/routes/sos.js"
    "client/src/components/SOSFeature.jsx"
)

all_files_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file${NC}"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    echo ""
    echo -e "${RED}Some required files are missing!${NC}"
    exit 1
fi

# Step 7: Test information
echo ""
echo -e "${BLUE}Step 7: Next Steps${NC}"
echo ""
echo "1. Get your Telegram Chat ID:"
echo "   - Search for @userinfobot in Telegram"
echo "   - Click START and copy your ID"
echo ""
echo "2. Get your Telegram Bot Token:"
echo "   - Search for @BotFather in Telegram"
echo "   - Use /newbot command"
echo "   - Copy the token"
echo ""
echo "3. Add to server/.env:"
echo "   TELEGRAM_BOT_TOKEN=your_token_here"
echo ""
echo "4. Start the server:"
echo "   npm run server"
echo ""
echo "5. Test the connection:"
echo "   curl -X POST http://localhost:5000/api/sos/test-telegram \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"telegramId\": \"YOUR_CHAT_ID\"}'"
echo ""
echo "6. Access the SOS feature:"
echo "   http://localhost:5173/sos"
echo ""
echo -e "${GREEN}✅ Setup verification complete!${NC}"
echo ""

# Manual API test example
echo -e "${BLUE}Manual API Testing Examples:${NC}"
echo ""
echo "1. Update Emergency Contacts:"
echo "   curl -X POST http://localhost:5000/api/sos/update-contacts \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"parent1_telegram_id\": \"YOUR_CHAT_ID\"}'"
echo ""
echo "2. Get SOS Configuration:"
echo "   curl http://localhost:5000/api/sos/config \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN'"
echo ""
echo "3. Send SOS Alert:"
echo "   curl -X POST http://localhost:5000/api/sos/send \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"message\": \"Emergency help needed\", \"severity\": \"HIGH\"}'"
echo ""
echo "4. Get SOS History:"
echo "   curl http://localhost:5000/api/sos/history \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN'"
echo ""

# Information for debugging
echo ""
echo -e "${BLUE}Debugging Tips:${NC}"
echo "- Check server logs: npm run server"
echo "- Verify Telegram token: curl https://api.telegram.org/botYOUR_TOKEN/getMe"
echo "- Check database: psql -U consultancy_user -d e_consultancy -c '\\dt sos_alerts'"
echo "- Monitor API responses with Postman or similar tools"
echo ""
