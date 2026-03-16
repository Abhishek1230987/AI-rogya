#!/bin/bash
# SOS Feature - Validation Script

echo "🚀 SOS Feature Validation Script"
echo "=================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Verify files exist
echo "📁 Checking files..."
files=(
  "server/src/services/telegramService.js"
  "server/src/controllers/sosController.js"
  "server/src/index.js"
  "client/src/components/SOSNavbarButton.jsx"
  "client/src/components/Layout.jsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file NOT FOUND"
  fi
done

echo ""
echo "🔧 Checking imports..."

# Check 2: Verify FormData import
if grep -q "import FormData from \"form-data\"" server/src/services/telegramService.js; then
  echo -e "${GREEN}✓${NC} FormData static import found"
else
  echo -e "${RED}✗${NC} FormData static import missing"
fi

# Check 3: Verify SOSNavbarButton import in Layout
if grep -q "import SOSNavbarButton" client/src/components/Layout.jsx; then
  echo -e "${GREEN}✓${NC} SOSNavbarButton imported in Layout"
else
  echo -e "${RED}✗${NC} SOSNavbarButton import missing"
fi

# Check 4: Verify express-fileupload
if grep -q "express-fileupload" server/package.json; then
  echo -e "${GREEN}✓${NC} express-fileupload in package.json"
else
  echo -e "${RED}✗${NC} express-fileupload not in package.json"
fi

echo ""
echo "🌐 Checking environment..."

# Check 5: Telegram token
if grep -q "TELEGRAM_BOT_TOKEN=" server/.env; then
  if grep "TELEGRAM_BOT_TOKEN=" server/.env | grep -q "8510290329"; then
    echo -e "${GREEN}✓${NC} Telegram token configured"
  else
    echo -e "${YELLOW}⚠${NC} Telegram token might be placeholder"
  fi
else
  echo -e "${RED}✗${NC} TELEGRAM_BOT_TOKEN not in .env"
fi

echo ""
echo "📝 Checking error handling..."

# Check 6: Try-catch in sosController
if grep -q "catch (audioErr)" server/src/controllers/sosController.js; then
  echo -e "${GREEN}✓${NC} Audio error handling added"
else
  echo -e "${RED}✗${NC} Audio error handling missing"
fi

# Check 7: Response validation in SOSNavbarButton
if grep -q "response.ok" client/src/components/SOSNavbarButton.jsx; then
  echo -e "${GREEN}✓${NC} Response validation added"
else
  echo -e "${RED}✗${NC} Response validation missing"
fi

echo ""
echo "=================================="
echo "✅ Validation complete!"
echo ""
echo "Next steps:"
echo "1. npm install (in server directory)"
echo "2. npm start (in server directory)"
echo "3. npm run dev (in client directory)"
echo "4. Test at http://localhost:5173"
echo ""
