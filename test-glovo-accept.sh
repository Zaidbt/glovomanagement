#!/bin/bash

# Test script to accept Glovo orders
# Usage: ./test-glovo-accept.sh <order_id>

ORDER_ID=${1:-"100010178546"}
SHARED_TOKEN="8b979af6-8e38-4bdb-aa07-26408928052a"
STORE_ID="store-01"

echo "🧪 Testing Glovo Order Acceptance"
echo "================================="
echo "Order ID: $ORDER_ID"
echo ""

# Test 1: Try the integrations API endpoint with accept
echo "Test 1: /api/v0/integrations/orders/{orderId}/accept"
echo "-----------------------------------------------------"
curl -v --request PUT \
     --url "https://stageapi.glovoapp.com/api/v0/integrations/orders/$ORDER_ID/accept" \
     --header "Authorization: $SHARED_TOKEN" \
     --header "Content-Type: application/json" \
     --header "Glovo-Store-Address-External-Id: $STORE_ID" \
     --data '{}'
echo -e "\n\n"

# Test 2: Try the integrations API endpoint for ready_for_pickup
echo "Test 2: /api/v0/integrations/orders/{orderId}/ready_for_pickup"
echo "---------------------------------------------------------------"
curl -v --request PUT \
     --url "https://stageapi.glovoapp.com/api/v0/integrations/orders/$ORDER_ID/ready_for_pickup" \
     --header "Authorization: $SHARED_TOKEN" \
     --header "Content-Type: application/json" \
     --header "Glovo-Store-Address-External-Id: $STORE_ID" \
     --data '{}'
echo -e "\n\n"

# Test 3: Try webhook API with status endpoint
echo "Test 3: /webhook/stores/{storeId}/orders/{orderId}/status"
echo "----------------------------------------------------------"
curl -v --request PUT \
     --url "https://stageapi.glovoapp.com/webhook/stores/$STORE_ID/orders/$ORDER_ID/status" \
     --header "Authorization: $SHARED_TOKEN" \
     --header "Content-Type: application/json" \
     --data '{"status": "ACCEPTED"}'
echo -e "\n\n"

# Test 4: Try without Glovo-Store-Address-External-Id header
echo "Test 4: Without Glovo-Store-Address-External-Id header"
echo "--------------------------------------------------------"
curl -v --request PUT \
     --url "https://stageapi.glovoapp.com/api/v0/integrations/orders/$ORDER_ID/accept" \
     --header "Authorization: $SHARED_TOKEN" \
     --header "Content-Type: application/json" \
     --data '{}'
echo -e "\n\n"

echo "✅ Tests completed!"
echo ""
echo "📝 Note: Look for HTTP status codes:"
echo "   - 200/202/204 = Success"
echo "   - 400 = Bad request (check parameters)"
echo "   - 401 = Unauthorized (token issue)"
echo "   - 404 = Not found (wrong endpoint or order doesn't exist)"
echo "   - 500 = Server error"
