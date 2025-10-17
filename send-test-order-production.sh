#!/bin/bash

# Send test orders to PRODUCTION server (natura.bixlor.com)
# Usage: ./send-test-order-production.sh

SHARED_TOKEN="8b979af6-8e38-4bdb-aa07-26408928052a"
PRODUCTION_URL="https://natura.bixlor.com/api/webhooks/glovo/orders"

echo "📦 Sending test order to PRODUCTION: natura.bixlor.com"
echo "=================================================="
echo ""

# Generate unique order ID
ORDER_ID="GLOVO-TEST-$(date +%s)"

# Send order
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PRODUCTION_URL" \
  -H "Authorization: $SHARED_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
  \"order_id\": \"$ORDER_ID\",
  \"store_id\": \"store-01\",
  \"order_code\": \"ZB$(shuf -i 100-999 -n 1)\",
  \"order_time\": \"$(date -u +"%Y-%m-%d %H:%M:%S")\",
  \"estimated_pickup_time\": \"$(date -u -v+30M +"%Y-%m-%d %H:%M:%S" 2>/dev/null || date -u -d '+30 minutes' +"%Y-%m-%d %H:%M:%S")\",
  \"utc_offset_minutes\": \"60\",
  \"payment_method\": \"CASH\",
  \"currency\": \"MAD\",
  \"estimated_total_price\": 35000,
  \"delivery_fee\": 1000,
  \"customer_cash_payment_amount\": 36000,
  \"customer\": {
    \"name\": \"Zaid BOURGHIT\",
    \"phone_number\": \"+212600123456\",
    \"hash\": \"zaid-customer-hash-$(date +%s)\"
  },
  \"courier\": {
    \"name\": \"Mohammed Courier\",
    \"phone_number\": \"+212611223344\"
  },
  \"products\": [
    {
      \"id\": \"argan-oil-100ml\",
      \"purchased_product_id\": \"P001\",
      \"quantity\": 2,
      \"price\": 12000,
      \"discount\": 0,
      \"name\": \"Argan Oil 100ml\",
      \"attributes\": []
    },
    {
      \"id\": \"black-soap-200g\",
      \"purchased_product_id\": \"P002\",
      \"quantity\": 1,
      \"price\": 8000,
      \"discount\": 0,
      \"name\": \"Black Soap 200g\",
      \"attributes\": []
    },
    {
      \"id\": \"ghassoul-clay\",
      \"purchased_product_id\": \"P003\",
      \"quantity\": 1,
      \"price\": 3000,
      \"discount\": 0,
      \"name\": \"Ghassoul Clay 250g\",
      \"attributes\": []
    }
  ],
  \"special_requirements\": \"Test order - Please handle with care\"
}")

# Extract status code and body
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response Status: $HTTP_STATUS"
echo ""

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Order sent successfully!"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
  echo ""
  echo "🌐 View order at: https://natura.bixlor.com/admin/orders"
else
  echo "❌ Error sending order"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY"
fi

echo ""
echo "=================================================="
