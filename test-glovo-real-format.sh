#!/bin/bash

# Script de test avec le format réel Glovo
BASE_URL="https://natura.bixlor.com"

echo "🧪 Test webhook Glovo - Format réel"
echo "===================================="

ORDER_ID="order-$(date +%s)"
ORDER_CODE="GLOVO-$(date +%H%M%S)"

echo "📦 Commande: $ORDER_CODE"
echo "📦 Order ID: $ORDER_ID"

echo ""
echo "🚀 Envoi de la requête avec format Glovo réel..."

RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "accepted_for": "'"$(date -u -v+1H +%Y-%m-%dT%H:%M:%SZ)"'",
    "promised_for": "'"$(date -u -v+2H +%Y-%m-%dT%H:%M:%SZ)"'",
    "comment": "Test order via webhook - Format réel Glovo",
    "external_order_id": "'"$ORDER_ID"'",
    "isPreorder": false,
    "order_code": "'"$ORDER_CODE"'",
    "order_id": "9d4a63b5-3e07-4440-96af-aa04797da3a0",
    "order_type": "DELIVERY",
    "client": {
      "chain_id": "79d3a074-0f4c-44ac-892c-787fdfb04ba1",
      "country_code": "ma",
      "external_partner_config_id": "natura-beldi",
      "id": "5ae6a211-ba40-4c38-9fa2-74a1abec229c",
      "name": "Natura Beldi Store",
      "store_id": "nbet"
    },
    "customer": {
      "_id": "cust-test-001",
      "delivery_address": {
        "street": "Avenue Mohammed V",
        "city": "Casablanca",
        "postal_code": "20000"
      },
      "first_name": "Ahmed",
      "last_name": "Benali",
      "phone_number": "+212600123456",
      "loyalty_card": "1231-avcd-as33-br23"
    },
    "items": [
      {
        "id": "item-001",
        "name": "Poulet Bio 1kg",
        "quantity": 2,
        "price": 75.00,
        "total": 150.00,
        "attributes": []
      },
      {
        "id": "item-002",
        "name": "Tomates Bio 500g",
        "quantity": 3,
        "price": 15.00,
        "total": 45.00,
        "attributes": []
      }
    ],
    "payment": {
      "container_charge": 1,
      "delivery_fee": 10.00,
      "difference_to_minimum": 0,
      "discount": 5.00,
      "order_total": 200.00,
      "service_fee": 0,
      "sub_total": 195.00,
      "total_taxes": 1,
      "type": "PAID",
      "vouchers": []
    },
    "status": "RECEIVED",
    "sys": {
      "created_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
      "created_by": "Glovo Webhook Test",
      "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
      "updated_by": "System"
    },
    "transport_type": "LOGISTICS_DELIVERY"
  }')

echo "📥 Réponse reçue:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Test terminé!"
echo "📊 Vérifie maintenant:"
echo "  1. Page Orders: https://natura.bixlor.com/admin/orders"
echo "  2. Cherche la commande: $ORDER_CODE"
echo "  3. Dashboard: https://natura.bixlor.com/admin"
echo ""
