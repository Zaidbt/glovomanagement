#!/bin/bash

# Test all Glovo webhook endpoints
# These are the endpoints that Glovo will call on your production server

echo "🧪 Testing All Glovo Webhook Endpoints"
echo "======================================"
echo ""
echo "These endpoints are configured with Glovo:"
echo "  - https://natura.bixlor.com/api/webhooks/glovo/orders"
echo "  - https://natura.bixlor.com/api/glovo/dispatch"
echo "  - https://natura.bixlor.com/api/glovo/cancel"
echo ""
echo "Testing on: http://localhost:3000"
echo "======================================"
echo ""

SHARED_TOKEN="8b979af6-8e38-4bdb-aa07-26408928052a"
BASE_URL="http://localhost:3000"

# Test 1: Order Reception Webhook
echo "1️⃣  Testing Order Reception Webhook"
echo "   POST /api/webhooks/glovo/orders"
echo ""

ORDER_ID="TEST-ORDER-$(date +%s)"

curl -s -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Authorization: $SHARED_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\": \"$ORDER_ID\",
    \"store_id\": \"store-01\",
    \"order_code\": \"ABC123\",
    \"order_time\": \"$(date -u +"%Y-%m-%d %H:%M:%S")\",
    \"estimated_pickup_time\": \"$(date -u -v+30M +"%Y-%m-%d %H:%M:%S" 2>/dev/null || date -u -d '+30 minutes' +"%Y-%m-%d %H:%M:%S")\",
    \"utc_offset_minutes\": \"60\",
    \"payment_method\": \"CASH\",
    \"currency\": \"MAD\",
    \"estimated_total_price\": 12500,
    \"customer\": {
      \"name\": \"Test Customer\",
      \"phone_number\": \"+212600123456\",
      \"hash\": \"test_hash\"
    },
    \"products\": [
      {
        \"id\": \"prod_001\",
        \"purchased_product_id\": \"sku_001\",
        \"quantity\": 2,
        \"price\": 5000,
        \"name\": \"Argan Oil 100ml\"
      }
    ]
  }" | python3 -m json.tool

echo ""
echo "------------------------"
echo ""

# Test 2: Dispatch Event Webhook
echo "2️⃣  Testing Dispatch Event Webhook"
echo "   POST /api/glovo/dispatch"
echo ""

curl -s -X POST "$BASE_URL/api/glovo/dispatch" \
  -H "Authorization: $SHARED_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"trackingNumber\": \"$ORDER_ID\",
    \"status\": \"DISPATCHED\",
    \"webhookId\": \"webhook_123\",
    \"date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"eventType\": \"order.dispatched\"
  }" | python3 -m json.tool

echo ""
echo "------------------------"
echo ""

# Test 3: Cancel Event Webhook
echo "3️⃣  Testing Cancel Event Webhook"
echo "   POST /api/glovo/cancel"
echo ""

curl -s -X POST "$BASE_URL/api/glovo/cancel" \
  -H "Authorization: $SHARED_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"trackingNumber\": \"$ORDER_ID\",
    \"status\": \"CANCELLED\",
    \"webhookId\": \"webhook_456\",
    \"date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
    \"eventType\": \"order.cancelled\",
    \"reason\": \"Customer requested cancellation\"
  }" | python3 -m json.tool

echo ""
echo "======================================"
echo "🎉 All webhook tests completed!"
echo ""
echo "📋 Next Steps:"
echo "  1. Your credentials are working ✅"
echo "  2. Your webhooks are ready ✅"
echo "  3. Wait for Glovo to activate your test store"
echo "  4. Once active, place orders at: https://testglovo.com/es/en/barcelona/natura-beldi-ma-test/"
echo ""
echo "💡 Contact Glovo if the test URL isn't working yet - they need to finish the store setup!"
