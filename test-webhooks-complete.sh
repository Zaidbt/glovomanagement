#!/bin/bash

# Script de test complet des webhooks Glovo avec création de commande
# Usage: ./test-webhooks-complete.sh

BASE_URL="https://natura.bixlor.com"

echo "🧪 Test complet des webhooks Glovo"
echo "===================================="
echo ""

# Étape 1: Créer une commande via simulation
echo "📝 Étape 1: Créer une commande de test via l'API"
echo "------------------------------------------------"
TRACKING_NUMBER="TEST-$(date +%s)"
echo "📦 Tracking Number: $TRACKING_NUMBER"
echo ""

# Créer la commande directement en base via l'API orders
curl -X POST "$BASE_URL/api/orders/simulate-glovo" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "'"$TRACKING_NUMBER"'",
    "customerName": "Test Customer",
    "customerPhone": "+212600000000",
    "products": [
      {"name": "Test Product 1", "quantity": 2, "price": 50},
      {"name": "Test Product 2", "quantity": 1, "price": 100}
    ],
    "totalAmount": 200
  }'
echo -e "\n\n"

# Attendre 2 secondes pour que la commande soit créée
echo "⏳ Attente de 2 secondes..."
sleep 2
echo ""

# Étape 2: Tester le dispatch
echo "🚚 Étape 2: Dispatcher la commande"
echo "-----------------------------------"
curl -X POST "$BASE_URL/api/glovo/dispatch" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "DISPATCH",
    "webhookId": "test-dispatch-001",
    "trackingNumber": "'"$TRACKING_NUMBER"'",
    "status": "DISPATCHED",
    "date": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }'
echo -e "\n\n"

# Attendre 1 seconde
sleep 1

# Étape 3: Tester le cancel (sur une autre commande)
echo "❌ Étape 3: Annuler une autre commande"
echo "---------------------------------------"
TRACKING_NUMBER_2="TEST-$(date +%s)-CANCEL"
curl -X POST "$BASE_URL/api/glovo/cancel" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "CANCEL",
    "webhookId": "test-cancel-001",
    "trackingNumber": "'"$TRACKING_NUMBER_2"'",
    "status": "CANCELLED",
    "reason": "Test cancellation",
    "date": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }'
echo -e "\n\n"

echo "✅ Tests terminés!"
echo ""
echo "📊 Vérifie maintenant dans ton admin:"
echo "  1. Page Orders: Tu devrais voir la commande $TRACKING_NUMBER"
echo "  2. Status devrait être DISPATCHED"
echo "  3. Page Activités: Tu devrais voir les events ORDER_DISPATCHED"
echo ""
echo "🔗 https://natura.bixlor.com/admin/orders"
echo "🔗 https://natura.bixlor.com/admin"
