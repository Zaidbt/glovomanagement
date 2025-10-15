#!/bin/bash

# Script de test direct - crée une commande sans passer par l'API Glovo
# Usage: ./test-glovo-direct.sh

BASE_URL="https://natura.bixlor.com"

echo "🧪 Test direct - Création commande Glovo"
echo "========================================"
echo ""

# Générer un order_id unique
ORDER_ID="order-$(date +%s)"
ORDER_CODE="TEST-$(date +%H%M%S)"

echo "📦 Création commande test:"
echo "  - Order ID: $ORDER_ID"
echo "  - Order Code: $ORDER_CODE"
echo ""

# Envoyer directement les données de commande au webhook
curl -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'"$ORDER_ID"'",
    "store_id": "store_12345",
    "order_time": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "estimated_pickup_time": "'"$(date -u -v+1H +%Y-%m-%dT%H:%M:%SZ)"'",
    "utc_offset_minutes": "0",
    "payment_method": "CASH",
    "currency": "MAD",
    "order_code": "'"$ORDER_CODE"'",
    "allergy_info": "Test order",
    "special_requirements": "Test webhook",
    "estimated_total_price": 150.00,
    "delivery_fee": 10.00,
    "minimum_basket_surcharge": 0,
    "customer_cash_payment_amount": 150.00,
    "courier": {
      "name": "Test Courier",
      "phone_number": "+212600000000"
    },
    "customer": {
      "name": "Ahmed Test",
      "phone_number": "+212600123456",
      "hash": "test-hash-123"
    },
    "products": [
      {
        "id": "prod-001",
        "purchased_product_id": "purchased-001",
        "quantity": 2,
        "price": 75.00,
        "discount": 0,
        "name": "Poulet Bio 1kg",
        "attributes": []
      }
    ],
    "bundled_orders": [],
    "is_picked_up_by_customer": false,
    "partner_discounts_products": [],
    "partner_discounted_products_total": 0,
    "service_fee": 0
  }'

echo -e "\n\n"
echo "✅ Test terminé!"
echo ""
echo "📊 Vérifie maintenant:"
echo "  1. Page Orders: https://natura.bixlor.com/admin/orders"
echo "  2. Cherche la commande: $ORDER_CODE"
echo "  3. Dashboard: https://natura.bixlor.com/admin"
echo ""
