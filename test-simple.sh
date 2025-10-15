#!/bin/bash

# Script de test simple
BASE_URL="https://natura.bixlor.com"

echo "🧪 Test simple - Commande minimale"
echo "=================================="

ORDER_ID="test-$(date +%s)"
ORDER_CODE="SIMPLE-$(date +%H%M%S)"

echo "📦 Commande: $ORDER_CODE"

curl -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'"$ORDER_ID"'",
    "store_id": "test_store",
    "order_code": "'"$ORDER_CODE"'",
    "customer": {
      "name": "Test Client",
      "phone_number": "+212600000000"
    },
    "estimated_total_price": 50.00,
    "currency": "MAD"
  }'

echo -e "\n✅ Test terminé!"
echo "Cherche: $ORDER_CODE"
