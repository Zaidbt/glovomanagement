#!/bin/bash

# Script to test Glovo store information retrieval
# This will test your Glovo API credentials and get store information

BASE_URL="https://natura.bixlor.com"

echo "🏪 Test Glovo Store Information"
echo "================================"
echo ""

echo "📋 Testing Glovo API connection and store info..."
echo ""

# Test 1: Test connection
echo "🔗 1. Testing Glovo API connection..."
CONNECTION_RESPONSE=$(curl -s -X GET "$BASE_URL/api/glovo/test-connection")

echo "📥 Connection Response:"
echo "$CONNECTION_RESPONSE" | jq . 2>/dev/null || echo "$CONNECTION_RESPONSE"
echo ""

# Test 2: Test credentials
echo "🔑 2. Testing Glovo credentials..."
CREDENTIALS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/glovo/test-credentials" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "📥 Credentials Response:"
echo "$CREDENTIALS_RESPONSE" | jq . 2>/dev/null || echo "$CREDENTIALS_RESPONSE"
echo ""

# Test 3: Get active orders (if any)
echo "📦 3. Getting active orders from Glovo..."
ORDERS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/glovo/sync")

echo "📥 Orders Response:"
echo "$ORDERS_RESPONSE" | jq . 2>/dev/null || echo "$ORDERS_RESPONSE"
echo ""

# Test 4: Test token refresh
echo "🔄 4. Testing token refresh..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/glovo/refresh" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "📥 Token Response:"
echo "$TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$TOKEN_RESPONSE"
echo ""

echo "✅ Store information test completed!"
echo ""
echo "📊 Summary:"
echo "  - Connection: Check if Glovo API is accessible"
echo "  - Credentials: Check if your API keys are valid"
echo "  - Orders: Check if you can retrieve orders from Glovo"
echo "  - Token: Check if OAuth token refresh works"
echo ""
echo "🔍 If any test fails, check:"
echo "  1. Your Glovo credentials in admin panel"
echo "  2. Your Glovo API access permissions"
echo "  3. Your webhook URLs are registered with Glovo"
echo ""
