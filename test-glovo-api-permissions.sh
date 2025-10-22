#!/bin/bash

# Test Glovo API Permissions with Shared Token
# This script tests which API endpoints work with the shared token

SHARED_TOKEN="8b979af6-8e38-4bdb-aa07-26408928052a"
STORE_ID="store-01"
ORDER_ID="100010178546"

echo "🧪 Testing Glovo API Permissions"
echo "=================================="
echo "Shared Token: $SHARED_TOKEN"
echo "Store ID: $STORE_ID"
echo ""

# Test 1: GET - Active temporary closing (read-only)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: GET /webhook/stores/{storeId}/closing"
echo "Description: Get active store temporary closure (READ-ONLY)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -w "\nHTTP Status: %{http_code}\n" \
     --request GET \
     --url "https://stageapi.glovoapp.com/webhook/stores/$STORE_ID/closing" \
     --header "Authorization: $SHARED_TOKEN"
echo -e "\n"

# Test 2: Same with Bearer prefix
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: GET /webhook/stores/{storeId}/closing (with Bearer)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -w "\nHTTP Status: %{http_code}\n" \
     --request GET \
     --url "https://stageapi.glovoapp.com/webhook/stores/$STORE_ID/closing" \
     --header "Authorization: Bearer $SHARED_TOKEN"
echo -e "\n"

# Test 3: Try with storeAddressId 226071
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: GET /webhook/stores/226071/closing"
echo "Description: Using internal storeAddressId instead"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -w "\nHTTP Status: %{http_code}\n" \
     --request GET \
     --url "https://stageapi.glovoapp.com/webhook/stores/226071/closing" \
     --header "Authorization: $SHARED_TOKEN"
echo -e "\n"

# Test 4: Try with natura-beldi-ma-test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: GET /webhook/stores/natura-beldi-ma-test/closing"
echo "Description: Using store slug from URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -w "\nHTTP Status: %{http_code}\n" \
     --request GET \
     --url "https://stageapi.glovoapp.com/webhook/stores/natura-beldi-ma-test/closing" \
     --header "Authorization: $SHARED_TOKEN"
echo -e "\n"

# Test 5: Try PUT ready_for_pickup (write operation)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: PUT /api/v0/integrations/orders/{orderId}/ready_for_pickup"
echo "Description: Mark order as ready for pickup (WRITE)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -w "\nHTTP Status: %{http_code}\n" \
     --request PUT \
     --url "https://stageapi.glovoapp.com/api/v0/integrations/orders/$ORDER_ID/ready_for_pickup" \
     --header "Authorization: $SHARED_TOKEN" \
     --header "Content-Type: application/json" \
     --header "Glovo-Store-Address-External-Id: $STORE_ID" \
     --data '{}'
echo -e "\n"

# Test 6: Try webhook status update endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: PUT /webhook/stores/{storeId}/orders/{orderId}/status"
echo "Description: Update order status to READY_FOR_PICKUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -w "\nHTTP Status: %{http_code}\n" \
     --request PUT \
     --url "https://stageapi.glovoapp.com/webhook/stores/$STORE_ID/orders/$ORDER_ID/status" \
     --header "Authorization: $SHARED_TOKEN" \
     --header "Content-Type: application/json" \
     --data '{"status": "READY_FOR_PICKUP"}'
echo -e "\n"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Tests completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary of HTTP Status Codes:"
echo "   200 = Success (endpoint works!)"
echo "   204 = Success (no content)"
echo "   401 = Unauthorized (token doesn't have permission)"
echo "   404 = Not Found (wrong endpoint or ID)"
echo "   400 = Bad Request (wrong parameters)"
echo ""
echo "💡 If you get 200/204 on any test, that endpoint is accessible!"
