#!/bin/bash

# Test script to simulate receiving a Glovo order webhook
# This simulates what Glovo would send to your webhook endpoint

echo "🧪 Testing Glovo Order Webhook"
echo "=============================="
echo ""

# Your webhook URL (update if needed)
WEBHOOK_URL="http://localhost:3000/api/webhooks/glovo/orders"

# Sample Glovo order payload (based on their documentation)
ORDER_PAYLOAD='{
  "order_id": "TEST-'$(date +%s)'",
  "store_id": "store-01",
  "order_code": "ABC123",
  "order_time": "'$(date -u +"%Y-%m-%d %H:%M:%S")'",
  "estimated_pickup_time": "'$(date -u -v+30M +"%Y-%m-%d %H:%M:%S" 2>/dev/null || date -u -d '+30 minutes' +"%Y-%m-%d %H:%M:%S")'",
  "utc_offset_minutes": "60",
  "payment_method": "CASH",
  "currency": "MAD",
  "estimated_total_price": 12500,
  "delivery_fee": 500,
  "customer_cash_payment_amount": 13000,
  "customer": {
    "name": "Test Customer",
    "phone_number": "+212600123456",
    "hash": "test_customer_hash_123"
  },
  "courier": {
    "name": "Test Courier",
    "phone_number": "+212600654321"
  },
  "products": [
    {
      "id": "prod_001",
      "purchased_product_id": "sku_001",
      "quantity": 2,
      "price": 5000,
      "name": "Argan Oil 100ml",
      "attributes": []
    },
    {
      "id": "prod_002",
      "purchased_product_id": "sku_002",
      "quantity": 1,
      "price": 2500,
      "name": "Black Soap 200g",
      "attributes": []
    }
  ],
  "special_requirements": "Please prepare quickly"
}'

echo "📦 Sending test order to: $WEBHOOK_URL"
echo ""

# Send the webhook
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: 8b979af6-8e38-4bdb-aa07-26408928052a" \
  -d "$ORDER_PAYLOAD")

# Extract HTTP status code (last line)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
# Extract response body (all but last line)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Order received successfully!"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
else
  echo "❌ Error receiving order"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY"
fi

echo ""
echo "=============================="
echo "🎉 Test completed!"
