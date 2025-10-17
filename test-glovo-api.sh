#!/bin/bash

# Glovo Test Environment - API Testing Script
# Test your Glovo credentials and API endpoints

echo "🧪 Glovo API Test Script"
echo "========================"
echo ""

# Your test credentials
SHARED_TOKEN="8b979af6-8e38-4bdb-aa07-26408928052a"
STORE_ID="store-01"
BASE_URL="https://stageapi.glovoapp.com"

echo "📋 Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Store ID: $STORE_ID"
echo "  Token: ${SHARED_TOKEN:0:20}..."
echo ""
echo "========================"
echo ""

# Test 1: Check store closing status
echo "1️⃣  Testing Store Closing Endpoint"
echo "   GET /webhook/stores/$STORE_ID/closing"
echo ""
curl -i -X GET "$BASE_URL/webhook/stores/$STORE_ID/closing" \
  -H "Authorization: $SHARED_TOKEN" \
  -H "Content-Type: application/json"
echo ""
echo "------------------------"
echo ""

# Test 2: Update store closing status (try to close store temporarily)
echo "2️⃣  Testing Store Closing Update"
echo "   PUT /webhook/stores/$STORE_ID/closing"
echo ""
curl -i -X PUT "$BASE_URL/webhook/stores/$STORE_ID/closing" \
  -H "Authorization: $SHARED_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_closed": false,
    "reason": "Testing API"
  }'
echo ""
echo "------------------------"
echo ""

# Test 3: Get packaging types
echo "3️⃣  Testing Packaging Types Endpoint"
echo "   GET /webhook/stores/$STORE_ID/packagings/types"
echo ""
curl -i -X GET "$BASE_URL/webhook/stores/$STORE_ID/packagings/types" \
  -H "Authorization: $SHARED_TOKEN" \
  -H "Content-Type: application/json"
echo ""
echo "------------------------"
echo ""

# Test 4: Test with invalid token (should get 401/403)
echo "4️⃣  Testing Invalid Token (Should Fail)"
echo "   GET /webhook/stores/$STORE_ID/closing"
echo ""
curl -i -X GET "$BASE_URL/webhook/stores/$STORE_ID/closing" \
  -H "Authorization: invalid-token-123" \
  -H "Content-Type: application/json"
echo ""
echo "------------------------"
echo ""

echo "🎉 Tests completed!"
echo ""
echo "📝 Notes:"
echo "  - Status 200/204: Success"
echo "  - Status 401/403: Authentication failed"
echo "  - Status 404: Endpoint not found (but auth is valid)"
echo "  - Status 500: Server error"
