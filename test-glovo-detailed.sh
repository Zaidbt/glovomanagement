#!/bin/bash

# Detailed Glovo API test script
# Shows exactly what information is needed and retrieved

BASE_URL="https://natura.bixlor.com"

echo "🔍 Detailed Glovo Store Information Test"
echo "========================================"
echo ""

echo "📋 REQUIRED CREDENTIALS:"
echo "  - Client ID (API Key)"
echo "  - Client Secret (API Secret)"
echo "  - Webhook URL (registered with Glovo)"
echo ""

echo "🧪 TESTING GLOVO API ENDPOINTS..."
echo ""

# Test 1: Connection test
echo "1️⃣ Testing API Connection..."
echo "   Endpoint: GET /api/glovo/test-connection"
echo "   Purpose: Test if Glovo API is accessible"
echo ""

CONNECTION_RESPONSE=$(curl -s -X GET "$BASE_URL/api/glovo/test-connection")
echo "📥 Response:"
echo "$CONNECTION_RESPONSE" | jq . 2>/dev/null || echo "$CONNECTION_RESPONSE"
echo ""

# Test 2: Credentials validation
echo "2️⃣ Testing Credentials..."
echo "   Endpoint: POST /api/glovo/test-credentials"
echo "   Purpose: Validate your Glovo API credentials"
echo ""

CREDENTIALS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/glovo/test-credentials" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "📥 Response:"
echo "$CREDENTIALS_RESPONSE" | jq . 2>/dev/null || echo "$CREDENTIALS_RESPONSE"
echo ""

# Test 3: Store information
echo "3️⃣ Getting Store Information..."
echo "   Endpoint: GET /api/glovo/sync"
echo "   Purpose: Get active orders and store data"
echo ""

STORE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/glovo/sync")
echo "📥 Response:"
echo "$STORE_RESPONSE" | jq . 2>/dev/null || echo "$STORE_RESPONSE"
echo ""

# Test 4: Token management
echo "4️⃣ Testing Token Management..."
echo "   Endpoint: POST /api/glovo/refresh"
echo "   Purpose: Test OAuth token refresh"
echo ""

TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/glovo/refresh" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "📥 Response:"
echo "$TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$TOKEN_RESPONSE"
echo ""

echo "📊 ANALYSIS:"
echo "============"
echo ""

# Analyze connection response
if echo "$CONNECTION_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Connection: SUCCESS - Glovo API is accessible"
else
    echo "❌ Connection: FAILED - Check your Glovo API access"
fi

# Analyze credentials response
if echo "$CREDENTIALS_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Credentials: SUCCESS - Your API keys are valid"
else
    echo "❌ Credentials: FAILED - Check your Client ID and Secret"
fi

# Analyze store response
if echo "$STORE_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Store Info: SUCCESS - Store data retrieved"
    ORDERS_COUNT=$(echo "$STORE_RESPONSE" | jq -r '.count // 0' 2>/dev/null || echo "0")
    echo "   📦 Active Orders: $ORDERS_COUNT"
else
    echo "❌ Store Info: FAILED - Cannot retrieve store data"
fi

# Analyze token response
if echo "$TOKEN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Token: SUCCESS - OAuth token refresh works"
else
    echo "❌ Token: FAILED - OAuth authentication issues"
fi

echo ""
echo "🔧 NEXT STEPS:"
echo "=============="
echo ""

if echo "$CONNECTION_RESPONSE" | grep -q '"success":true' && \
   echo "$CREDENTIALS_RESPONSE" | grep -q '"success":true'; then
    echo "🎉 Your Glovo integration is working!"
    echo "   - API connection: ✅"
    echo "   - Credentials: ✅"
    echo "   - Ready to receive orders via webhooks"
    echo ""
    echo "📋 To receive orders, make sure:"
    echo "   1. Your webhook URL is registered with Glovo"
    echo "   2. Glovo has your store ID configured"
    echo "   3. Test orders are enabled in Glovo dashboard"
else
    echo "⚠️  Issues detected:"
    echo "   1. Check your Glovo credentials in admin panel"
    echo "   2. Verify your Glovo API access permissions"
    echo "   3. Contact Glovo support if needed"
fi

echo ""
echo "📞 For help:"
echo "   - Glovo Support: partner.integrationseu@glovoapp.com"
echo "   - Admin Panel: https://natura.bixlor.com/admin/credentials"
echo ""
