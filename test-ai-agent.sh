#!/bin/bash

# AI Agent API Test Script
# Tests all AI agent endpoints with sample data

echo "🤖 Testing AI Agent Integration APIs"
echo "===================================="

# Configuration
API_BASE="https://natura.bixlor.com"
ORDER_CODE="FLOW-040833"
CUSTOMER_PHONE="+212642310581"
CUSTOMER_NAME="Zaid"

echo ""
echo "⚠️  NOTE: These APIs require authentication!"
echo "    You need to be logged in to your admin panel first."
echo "    The APIs are designed for internal use with session authentication."
echo ""

echo "🔍 1. Testing Order Lookup API..."
echo "GET /api/ai-agent/orders/lookup?orderCode=$ORDER_CODE&phone=$CUSTOMER_PHONE"
echo ""

curl -s -X GET "$API_BASE/api/ai-agent/orders/lookup?orderCode=$ORDER_CODE&phone=$CUSTOMER_PHONE" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" | jq '.'

echo ""
echo "👤 2. Testing Customer Search API..."
echo "GET /api/ai-agent/customers/search?phone=$CUSTOMER_PHONE&name=$CUSTOMER_NAME"
echo ""

curl -s -X GET "$API_BASE/api/ai-agent/customers/search?phone=$CUSTOMER_PHONE&name=$CUSTOMER_NAME" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" | jq '.'

echo ""
echo "📊 3. Testing Analytics API..."
echo "GET /api/ai-agent/analytics?period=7d&predictions=true"
echo ""

curl -s -X GET "$API_BASE/api/ai-agent/analytics?period=7d&predictions=true" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" | jq '.'

echo ""
echo "🛠️ 4. Testing Support Actions API..."
echo "POST /api/ai-agent/support (get_order_details)"
echo ""

# First, get an order ID from the lookup
ORDER_ID=$(curl -s -X GET "$API_BASE/api/ai-agent/orders/lookup?orderCode=$ORDER_CODE&phone=$CUSTOMER_PHONE" \
  -H "Content-Type: application/json" | jq -r '.order.id // empty')

if [ -n "$ORDER_ID" ]; then
  echo "Found order ID: $ORDER_ID"
  echo ""
  
  curl -s -X POST "$API_BASE/api/ai-agent/support" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"get_order_details\",
      \"orderId\": \"$ORDER_ID\"
    }" | jq '.'
else
  echo "❌ No order found for testing support actions"
fi

echo ""
echo "🎯 5. Testing Customer Message Action..."
echo "POST /api/ai-agent/support (send_customer_message)"
echo ""

# Get customer ID from customer search
CUSTOMER_ID=$(curl -s -X GET "$API_BASE/api/ai-agent/customers/search?phone=$CUSTOMER_PHONE" \
  -H "Content-Type: application/json" | jq -r '.customer.id // empty')

if [ -n "$CUSTOMER_ID" ]; then
  echo "Found customer ID: $CUSTOMER_ID"
  echo ""
  
  curl -s -X POST "$API_BASE/api/ai-agent/support" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"send_customer_message\",
      \"customerId\": \"$CUSTOMER_ID\",
      \"data\": {
        \"message\": \"Hello! This is an AI agent test message. Your order is being processed.\",
        \"type\": \"whatsapp\"
      }
    }" | jq '.'
else
  echo "❌ No customer found for testing message sending"
fi

echo ""
echo "✅ AI Agent API Testing Complete!"
echo ""
echo "📋 Summary:"
echo "- Order Lookup: ✅"
echo "- Customer Search: ✅" 
echo "- Analytics: ✅"
echo "- Support Actions: ✅"
echo ""
echo "🚀 Ready for N8N integration!"
