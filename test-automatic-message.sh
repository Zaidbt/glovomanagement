#!/bin/bash

# Test script for automatic message sending
BASE_URL="https://natura.bixlor.com"

echo "📱 Test Automatic Message Sending"
echo "================================="
echo ""

echo "🧪 Testing webhook with automatic message to Zaid's number..."
echo ""

# Test with Zaid's real phone number
curl -s -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "auto-message-test-'$(date +%s)'",
    "store_id": "store-01",
    "order_code": "AUTO-'$(date +%H%M%S)'",
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
        "quantity": 2,
        "price": 75.00
      },
      {
        "name": "Tomates Bio 500g",
        "quantity": 3,
        "price": 15.00
      }
    ],
    "payment": {
      "order_total": 195.00,
      "delivery_fee": 10.00,
      "type": "PAID"
    },
    "status": "RECEIVED",
    "promised_for": "'$(date -u -v+2H +%Y-%m-%dT%H:%M:%SZ)'"
  }' | jq .

echo ""
echo "📱 Check your WhatsApp for the automatic message!"
echo "   Phone: +212642310581"
echo ""
echo "✅ If you received the message, the automatic sending is working!"
echo "❌ If no message, check Twilio credentials in admin panel"
echo ""
