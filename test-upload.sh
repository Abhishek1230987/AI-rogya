#!/bin/bash
# Simple test script to test medical report upload

# Configuration
API_URL="http://localhost:5000/api/medical/upload-report"
TOKEN="your_jwt_token_here"
FILE_PATH="./test-file.txt"

# Create a test file if it doesn't exist
if [ ! -f "$FILE_PATH" ]; then
  echo "Creating test file..."
  echo "This is a test medical report" > "$FILE_PATH"
fi

echo "Testing medical report upload..."
echo "URL: $API_URL"
echo "File: $FILE_PATH"
echo ""

# Perform upload
curl -v \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FILE_PATH" \
  "$API_URL"

echo ""
echo "Upload test complete"
