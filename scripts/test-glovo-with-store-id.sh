#!/bin/bash

# Script pour tester Glovo avec le store ID trouvé dans la réponse
# Store ID: 50ac0f74-4467-4352-b2b2-6fc348ec0f3f

echo "🚀 Test Glovo avec Store ID trouvé"
echo "=================================="

# Configuration
BASE_URL="https://stageapi.glovoapp.com"
CLIENT_ID="175973780382196"
CLIENT_SECRET="695d97b554ca4ee7a199c59a7a58ec95"
STORE_ID="50ac0f74-4467-4352-b2b2-6fc348ec0f3f"  # Store ID trouvé dans la réponse

# Configuration ngrok
NGROK_URL=""
LOCAL_PORT="3000"
WEBHOOK_PATH="/api/webhooks/glovo/orders"

echo "🔗 Port local: $LOCAL_PORT"
echo "📋 Webhook path: $WEBHOOK_PATH"
echo "🏪 Store ID: $STORE_ID"
echo ""

# 1. Vérifier si ngrok est installé
if ! command -v ngrok &> /dev/null; then
  echo "❌ ngrok n'est pas installé !"
  echo "💡 Installez ngrok: https://ngrok.com/download"
  exit 1
fi

echo "✅ ngrok trouvé"
echo ""

# 2. Démarrer ngrok en arrière-plan
echo "🚀 Démarrage de ngrok..."
ngrok http $LOCAL_PORT > /dev/null 2>&1 &
NGROK_PID=$!

# Attendre que ngrok démarre
sleep 3

# 3. Récupérer l'URL ngrok
echo "🔍 Récupération de l'URL ngrok..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)

if [ -z "$NGROK_URL" ] || [ "$NGROK_URL" = "null" ]; then
  echo "❌ Impossible de récupérer l'URL ngrok"
  kill $NGROK_PID 2>/dev/null
  exit 1
fi

echo "✅ URL ngrok: $NGROK_URL"
echo ""

# 4. Construire l'URL du webhook
WEBHOOK_URL="$NGROK_URL$WEBHOOK_PATH"
echo "🔗 Webhook URL: $WEBHOOK_URL"
echo ""

# 5. Récupérer le token OAuth
echo "🔑 Récupération du token OAuth..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"grantType\": \"client_credentials\",
    \"clientId\": \"$CLIENT_ID\",
    \"clientSecret\": \"$CLIENT_SECRET\"
  }")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Impossible de récupérer le token"
  echo "📊 Réponse: $TOKEN_RESPONSE"
  kill $NGROK_PID 2>/dev/null
  exit 1
fi

echo "✅ Token récupéré: ${ACCESS_TOKEN:0:20}..."
echo ""

# 6. Tester différents endpoints avec le nouveau Store ID
echo "🔍 Test des endpoints avec le nouveau Store ID..."

# Endpoint 1: /v1/orders
echo "🔍 Test /v1/orders..."
ORDERS_RESPONSE=$(curl -s -X GET "$BASE_URL/v1/orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "📊 Réponse /v1/orders:"
echo "$ORDERS_RESPONSE" | jq . 2>/dev/null || echo "$ORDERS_RESPONSE"

echo ""

# Endpoint 2: /v1/stores/{store_id}/orders
echo "🔍 Test /v1/stores/$STORE_ID/orders..."
STORE_ORDERS_RESPONSE=$(curl -s -X GET "$BASE_URL/v1/stores/$STORE_ID/orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "📊 Réponse /v1/stores/$STORE_ID/orders:"
echo "$STORE_ORDERS_RESPONSE" | jq . 2>/dev/null || echo "$STORE_ORDERS_RESPONSE"

echo ""

# Endpoint 3: /v2/laas/parcels (GET pour récupérer les commandes)
echo "🔍 Test /v2/laas/parcels..."
PARCELS_RESPONSE=$(curl -s -X GET "$BASE_URL/v2/laas/parcels" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "📊 Réponse /v2/laas/parcels:"
echo "$PARCELS_RESPONSE" | jq . 2>/dev/null || echo "$PARCELS_RESPONSE"

echo ""

# Endpoint 4: /v2/laas/parcels/{trackingNumber} (GET pour récupérer une commande spécifique)
echo "🔍 Test /v2/laas/parcels/100010177481..."
PARCEL_RESPONSE=$(curl -s -X GET "$BASE_URL/v2/laas/parcels/100010177481" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "📊 Réponse /v2/laas/parcels/100010177481:"
echo "$PARCEL_RESPONSE" | jq . 2>/dev/null || echo "$PARCEL_RESPONSE"

echo ""

# 7. Nettoyer
echo "🧹 Nettoyage..."
kill $NGROK_PID 2>/dev/null

echo ""
echo "🎯 Test terminé !"
echo ""
echo "💡 Si un endpoint fonctionne, on peut récupérer les commandes !"
echo "💡 Le Store ID $STORE_ID semble être l'ID correct du store"
