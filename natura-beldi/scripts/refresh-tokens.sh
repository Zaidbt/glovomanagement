#!/bin/bash

# Script de renouvellement automatique des tokens
# À exécuter toutes les 30 minutes via cron

# Configuration
API_URL="http://localhost:3000"
CRON_SECRET="natura-beldi-cron-2024"

# Log avec timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🔄 Starting automatic token refresh..."

# Appel à l'API de renouvellement
response=$(curl -s -X GET \
    -H "Authorization: Bearer $CRON_SECRET" \
    "$API_URL/api/cron/token-refresh")

# Vérifier la réponse
if echo "$response" | grep -q '"success":true'; then
    log "✅ Token refresh completed successfully"
    echo "$response" | jq '.summary // empty'
else
    log "❌ Token refresh failed"
    echo "$response"
    exit 1
fi

log "🏁 Token refresh script completed"
