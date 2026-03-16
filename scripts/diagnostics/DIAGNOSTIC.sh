#!/bin/bash
# Quick diagnostic to check which endpoints are being hit

echo "===== MEDICAL REPORTS V2 DIAGNOSTIC ====="
echo ""
echo "1. CHECKING BACKEND ROUTES:"
echo ""

echo "Checking if /api/medical-reports/ endpoint exists..."
curl -H "Authorization: Bearer test" http://localhost:5000/api/medical-reports/list 2>/dev/null | head -c 100

echo ""
echo ""
echo "2. CHECKING FRONTEND ROUTE:"
echo ""

echo "Is frontend serving /medical-reports-v2?"
curl -s http://localhost:5173/medical-reports-v2 | grep -o "MedicalReportsV2\|medical-reports-v2" | head -1

echo ""
echo "3. CHECKING OLD ROUTE (should be deprecated):"
echo ""

echo "Is old /medical-reports still being served?"
curl -s http://localhost:5173/medical-reports | grep -o "MedicalReports\|medical-reports" | head -1

echo ""
echo "===== END DIAGNOSTIC ====="
