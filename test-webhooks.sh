#!/bin/bash

# Script de test des webhooks Glovo
# Usage: ./test-webhooks.sh

BASE_URL="https://natura.bixlor.com"

echo "🧪 Test des webhooks Glovo sur $BASE_URL"
echo "=========================================="
echo ""

# Test 1: Webhook Orders (nouvelle commande)
echo "📦 Test 1: Nouvelle commande (Orders webhook)"
echo "----------------------------------------------"
curl -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "STATUS_UPDATE",
    "webhookId": "test-webhook-001",
    "trackingNumber": "TEST-ORDER-001",
    "status": "CREATED",
    "date": "2025-10-15T00:00:00Z"
  }'
echo -e "\n"

# Test 2: Webhook Dispatch (commande expédiée)
echo "🚚 Test 2: Commande expédiée (Dispatch webhook)"
echo "------------------------------------------------"
curl -X POST "$BASE_URL/api/glovo/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "DISPATCH",
    "webhookId": "test-webhook-002",
    "trackingNumber": "TEST-ORDER-001",
    "status": "DISPATCHED",
    "date": "2025-10-15T00:15:00Z"
  }'
echo -e "\n"

# Test 3: Webhook Cancel (commande annulée)
echo "❌ Test 3: Commande annulée (Cancel webhook)"
echo "---------------------------------------------"
curl -X POST "$BASE_URL/api/glovo/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "CANCEL",
    "webhookId": "test-webhook-003",
    "trackingNumber": "TEST-ORDER-002",
    "status": "CANCELLED",
    "reason": "Client unavailable",
    "date": "2025-10-15T00:30:00Z"
  }'
echo -e "\n"

echo "✅ Tests terminés!"
echo ""
echo "📊 Vérifie dans ton admin:"
echo "  - Les logs de Coolify pour voir les requêtes"
echo "  - La page Orders pour voir si la commande TEST-ORDER-001 apparaît"
echo "  - La page Activités pour voir les events"
