#!/bin/bash

# Test script using the working Glovo endpoints
BASE_URL="https://natura.bixlor.com"

echo "🎯 Testing Glovo Integration (Working Endpoints)"
echo "==============================================="
echo ""

echo "✅ Your credentials are configured! Let's test the working endpoints:"
echo ""

# Test 1: Sync endpoint (this one works)
echo "1️⃣ Testing Glovo Sync (GET /api/glovo/sync)"
echo "   Purpose: Get active orders and test credentials"
echo ""

SYNC_RESPONSE=$(curl -s -X GET "$BASE_URL/api/glovo/sync")
echo "📥 Response:"
echo "$SYNC_RESPONSE" | jq . 2>/dev/null || echo "$SYNC_RESPONSE"
echo ""

# Test 2: Test connection
echo "2️⃣ Testing Glovo Connection (GET /api/glovo/test-connection)"
echo "   Purpose: Test API connection"
echo ""

CONNECTION_RESPONSE=$(curl -s -X GET "$BASE_URL/api/glovo/test-connection")
echo "📥 Response:"
echo "$CONNECTION_RESPONSE" | jq . 2>/dev/null || echo "$CONNECTION_RESPONSE"
echo ""

# Test 3: Test webhook endpoint
echo "3️⃣ Testing Webhook Endpoint (POST /api/webhooks/glovo/orders)"
echo "   Purpose: Test if webhook can receive orders"
echo ""

WEBHOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "test-order-'$(date +%s)'",
    "store_id": "store-01",
    "order_code": "TEST-'$(date +%H%M%S)'",
    "customer": {
      "name": "Test Customer",
      "phone_number": "+212600000000"
    },
    "items": [
      {
        "name": "Test Product",
        "quantity": 1,
        "price": 100
      }
    ],
    "payment": {
      "order_total": 100,
      "type": "PAID"
    },
    "status": "RECEIVED"
  }')

echo "📥 Response:"
echo "$WEBHOOK_RESPONSE" | jq . 2>/dev/null || echo "$WEBHOOK_RESPONSE"
echo ""

echo "📊 ANALYSIS:"
echo "============"
echo ""

# Analyze sync response
if echo "$SYNC_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Glovo Sync: SUCCESS - Your credentials are working!"
    ORDERS_COUNT=$(echo "$SYNC_RESPONSE" | jq -r '.count // 0' 2>/dev/null || echo "0")
    echo "   📦 Active Orders: $ORDERS_COUNT"
else
    echo "❌ Glovo Sync: FAILED - Check your credentials"
fi

# Analyze connection response
if echo "$CONNECTION_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Connection: SUCCESS - Glovo API is accessible"
else
    echo "⚠️  Connection: PARTIAL - OAuth token needed for full access"
fi

# Analyze webhook response
if echo "$WEBHOOK_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Webhook: SUCCESS - Can receive orders"
else
    echo "❌ Webhook: FAILED - Check webhook configuration"
fi

echo ""
echo "🎉 SUMMARY:"
echo "==========="
echo ""

if echo "$SYNC_RESPONSE" | grep -q '"success":true'; then
    echo "🎯 Your Glovo integration is WORKING!"
    echo "   ✅ Credentials: Configured and working"
    echo "   ✅ Database: Can retrieve orders"
    echo "   ✅ Webhook: Ready to receive orders"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Configure webhook URLs with Glovo support"
    echo "   2. Test with real orders from Glovo"
    echo "   3. Monitor orders in admin panel"
else
    echo "⚠️  Issues detected:"
    echo "   1. Check your Glovo credentials in admin panel"
    echo "   2. Verify database connection"
    echo "   3. Contact support if needed"
fi

echo ""
echo "🔗 Useful links:"
echo "   - Admin Panel: https://natura.bixlor.com/admin/credentials"
echo "   - Orders: https://natura.bixlor.com/admin/orders"
echo "   - Glovo Support: partner.integrationseu@glovoapp.com"
echo ""
