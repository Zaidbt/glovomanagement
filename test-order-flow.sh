#!/bin/bash

# 🚀 COMPLETE ORDER FLOW TEST SCRIPT
# This script handles the complete order lifecycle: Create → Dispatch → Cancel/Complete

set -e

# Configuration
BASE_URL="https://natura.bixlor.com"
ORDER_ID="flow-test-$(date +%s)"
ORDER_CODE="FLOW-$(date +%H%M%S)"

echo "🚀 COMPLETE ORDER FLOW TEST"
echo "=========================="
echo ""

# Step 1: Create Order
echo "📦 Step 1: Creating order..."
echo "Order ID: $ORDER_ID"
echo "Order Code: $ORDER_CODE"
echo ""

# Create order payload
ORDER_PAYLOAD=$(cat <<EOF
{
  "accepted_for": "$(date -u -v+1H +%Y-%m-%dT%H:%M:%SZ)",
  "promised_for": "$(date -u -v+2H +%Y-%m-%dT%H:%M:%SZ)",
  "comment": "Complete flow test order",
  "external_order_id": "$ORDER_ID",
  "isPreorder": false,
  "order_code": "$ORDER_CODE",
  "order_id": "$ORDER_ID",
  "order_type": "DELIVERY",
  "client": {
    "chain_id": "79d3a074-0f4c-44ac-892c-787fdfb04ba1",
    "country_code": "ma",
    "external_partner_config_id": "natura-beldi",
    "id": "5ae6a211-ba40-4c38-96af-aa04797da3a0",
    "name": "Natura Beldi Store",
    "store_id": "store-01"
  },
  "customer": {
    "_id": "cust-flow-001",
    "delivery_address": {
      "street": "Avenue Mohammed V",
      "city": "Casablanca",
      "postal_code": "20000"
    },
    "first_name": "Zaid",
    "last_name": "Bourghit",
    "phone_number": "+212642310581"
  },
  "items": [
    {
      "id": "item-flow-001",
      "name": "Poulet Bio 1kg hihihi",
      "quantity": 2,
      "price": 75.00,
      "total": 150.00,
      "attributes": []
    },
    {
      "id": "item-flow-002",
      "name": "Tomates Bio 500g",
      "quantity": 3,
      "price": 15.00,
      "total": 45.00,
      "attributes": []
    }
  ],
  "payment": {
    "container_charge": 0,
    "delivery_fee": 10.00,
    "difference_to_minimum": 0,
    "discount": 5.00,
    "order_total": 200.00,
    "service_fee": 0,
    "sub_total": 195.00,
    "total_taxes": 0,
    "type": "PAID"
  },
  "status": "RECEIVED",
  "sys": {
    "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "created_by": "Flow Test Script",
    "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "updated_by": "System"
  },
  "transport_type": "LOGISTICS_DELIVERY"
}
EOF
)

# Send order to webhook
echo "📥 Sending order to webhook..."
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/webhooks/glovo/orders" \
  -H "Content-Type: application/json" \
  -d "$ORDER_PAYLOAD")

echo "📥 Order Response:"
echo "$ORDER_RESPONSE" | jq '.' 2>/dev/null || echo "$ORDER_RESPONSE"
echo ""

# Check if order was created successfully
if echo "$ORDER_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Order created successfully!"
  echo ""
  
  # Step 2: Ask if user wants to dispatch
  echo "🚚 Step 2: Dispatch Order"
  echo "========================"
  echo ""
  echo "Do you want to dispatch this order? (This will trigger automatic WhatsApp message)"
  echo "Type 'yes' to dispatch, anything else to skip:"
  read -r DISPATCH_CHOICE
  
  if [[ "$DISPATCH_CHOICE" == "yes" || "$DISPATCH_CHOICE" == "y" ]]; then
    echo ""
    echo "🚚 Dispatching order..."
    
    # Send dispatch event
    DISPATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/glovo/dispatch" \
      -H "Content-Type: application/json" \
      -d "{
        \"trackingNumber\": \"$ORDER_ID\",
        \"status\": \"DISPATCHED\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
      }")
    
    echo "📥 Dispatch Response:"
    echo "$DISPATCH_RESPONSE" | jq '.' 2>/dev/null || echo "$DISPATCH_RESPONSE"
    echo ""
    
    if echo "$DISPATCH_RESPONSE" | grep -q '"success":true'; then
      echo "✅ Order dispatched successfully!"
      echo "📱 Check your WhatsApp (+212642310581) for the automatic message!"
      echo ""
    else
      echo "❌ Dispatch failed!"
      echo ""
    fi
  else
    echo "⏭️ Skipping dispatch..."
    echo ""
  fi
  
  # Step 3: Ask if user wants to cancel or leave as is
  echo "🔄 Step 3: Order Management"
  echo "==========================="
  echo ""
  echo "What do you want to do with this order?"
  echo "1. Cancel the order"
  echo "2. Leave it as is"
  echo ""
  echo "Enter your choice (1 or 2):"
  read -r ORDER_CHOICE
  
  if [[ "$ORDER_CHOICE" == "1" ]]; then
    echo ""
    echo "❌ Cancelling order..."
    
    # Send cancel event
    CANCEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/glovo/cancel" \
      -H "Content-Type: application/json" \
      -d "{
        \"trackingNumber\": \"$ORDER_ID\",
        \"reason\": \"CANCELLED_BY_PARTNER\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
      }")
    
    echo "📥 Cancel Response:"
    echo "$CANCEL_RESPONSE" | jq '.' 2>/dev/null || echo "$CANCEL_RESPONSE"
    echo ""
    
    if echo "$CANCEL_RESPONSE" | grep -q '"success":true'; then
      echo "✅ Order cancelled successfully!"
    else
      echo "❌ Cancel failed!"
    fi
  else
    echo "✅ Leaving order as is..."
  fi
  
else
  echo "❌ Order creation failed!"
  echo "Please check your webhook configuration."
fi

echo ""
echo "🎯 FLOW TEST COMPLETE!"
echo "====================="
echo ""
echo "📊 Summary:"
echo "- Order ID: $ORDER_ID"
echo "- Order Code: $ORDER_CODE"
echo "- Customer: Zaid Bourghit (+212642310581)"
echo "- Total: 200.00 MAD"
echo ""
echo "🔗 Check your admin dashboard to see the order:"
echo "https://natura.bixlor.com/admin/orders"
echo ""
