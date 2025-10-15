#!/bin/bash

# Script de test avec debug
BASE_URL="https://natura.bixlor.com"

echo "🧪 Test debug - Commande avec logs"
echo "==================================="

ORDER_ID="debug-$(date +%s)"
ORDER_CODE="DEBUG-$(date +%H%M%S)"

echo "📦 Commande: $ORDER_CODE"
echo "📦 Order ID: $ORDER_ID"

echo ""
echo "🚀 Envoi de la requête..."

RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'"$ORDER_ID"'",
    "store_id": "debug_store_123",
    "order_code": "'"$ORDER_CODE"'",
    "customer": {
      "name": "Debug Client",
      "phone_number": "+212600000000"
    },
    "estimated_total_price": 75.00,
    "currency": "MAD"
  }')

echo "📥 Réponse reçue:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Test terminé!"
echo "Cherche: $ORDER_CODE"
