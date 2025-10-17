#!/bin/bash

# Test script for automatic message sending when order is dispatched
BASE_URL="https://natura.bixlor.com"

echo "📱 Test Automatic Message on Dispatch"
echo "====================================="
echo ""

echo "🧪 Step 1: Creating order with Zaid's phone number..."
echo ""

ORDER_ID="dispatch-test-$(date +%s)"
ORDER_CODE="DISPATCH-$(date +%H%M%S)"

# Step 1: Create order
echo "📦 Creating order: $ORDER_CODE"
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'"$ORDER_ID"'",
    "store_id": "store-01",
    "order_code": "'"$ORDER_CODE"'",
    "client": {
      "store_id": "store-01",
      "name": "Natura Beldi Staged Store"
    },
    "customer": {
      "first_name": "Zaid",
      "last_name": "Bourghit",
      "phone_number": "+212642310581"
    },
    "items": [
      {
        "name": "Poulet Bio 1kg",
        "quantity": 1,
        "price": 75.00
      }
    ],
    "payment": {
      "order_total": 75.00,
      "type": "PAID"
    },
    "status": "RECEIVED"
  }')

echo "📥 Order Response:"
echo "$ORDER_RESPONSE" | jq . 2>/dev/null || echo "$ORDER_RESPONSE"
echo ""

echo "⏳ Waiting 2 seconds before dispatching..."
sleep 2

echo ""
echo "🚚 Step 2: Dispatching order (this should trigger automatic message)..."
echo ""

# Step 2: Dispatch order (this should trigger automatic message)
DISPATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/glovo/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "'"$ORDER_ID"'",
    "status": "DISPATCHED",
    "webhookId": "webhook-dispatch-'$(date +%s)'",
    "date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "eventType": "STATUS_UPDATE"
  }')

echo "📥 Dispatch Response:"
echo "$DISPATCH_RESPONSE" | jq . 2>/dev/null || echo "$DISPATCH_RESPONSE"
echo ""

echo "📱 Check your WhatsApp for the automatic message!"
echo "   Phone: +212642310581"
echo "   Order: $ORDER_CODE"
echo ""
echo "✅ If you received the message, the automatic sending on dispatch is working!"
echo "❌ If no message, check Twilio credentials in admin panel"
echo ""
