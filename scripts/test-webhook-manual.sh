#!/bin/bash

# Script pour tester le webhook manuellement
echo "🚀 Test manuel du webhook Glovo"
echo "==============================="

# Variables
NGROK_URL="https://04b77e8c43b0.ngrok-free.app"

echo "📋 Test 1: Status Update CREATED (nouvelle commande)"
curl -X POST "$NGROK_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": 32530,
    "eventType": "STATUS_UPDATE",
    "trackingNumber": "TEST1234",
    "status": "CREATED",
    "updateReason": "Nouvelle commande créée",
    "date": "2025-10-13T15:30:00.000Z",
    "courier": null,
    "estimatedTimeOfArrival": {
      "pickup": "PT15M",
      "delivery": "PT30M"
    }
  }'

echo ""
echo ""
echo "📋 Test 2: Status Update ACCEPTED"
curl -X POST "$NGROK_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": 32530,
    "eventType": "STATUS_UPDATE",
    "trackingNumber": "TEST1234",
    "status": "ACCEPTED",
    "updateReason": "Commande acceptée",
    "date": "2025-10-13T15:31:00.000Z",
    "courier": {
      "name": "Ahmed Benali",
      "phone": "+212600000001"
    },
    "estimatedTimeOfArrival": {
      "pickup": "PT10M",
      "delivery": "PT25M"
    }
  }'

echo ""
echo ""
echo "📋 Test 3: Status Update READY_FOR_PICKUP"
curl -X POST "$NGROK_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookId": 32530,
    "eventType": "STATUS_UPDATE",
    "trackingNumber": "TEST1234",
    "status": "READY_FOR_PICKUP",
    "updateReason": "Commande prête à être récupérée",
    "date": "2025-10-13T15:35:00.000Z",
    "courier": {
      "name": "Ahmed Benali",
      "phone": "+212600000001"
    },
    "estimatedTimeOfArrival": {
      "pickup": "PT5M",
      "delivery": "PT20M"
    }
  }'

echo ""
echo ""
echo "🎯 Tests terminés!"
