#!/bin/bash

# Script to call the store cleanup endpoint on production
# You need to be logged in as admin on https://natura.bixlor.com

echo "🧹 Calling Store Cleanup on Production"
echo "======================================="
echo ""
echo "⚠️  This requires admin authentication!"
echo ""
echo "Option 1: Get your session cookie from browser"
echo "  1. Open https://natura.bixlor.com in your browser"
echo "  2. Login as admin"
echo "  3. Open DevTools (F12) > Application/Storage > Cookies"
echo "  4. Copy the value of 'next-auth.session-token' or similar"
echo "  5. Run: SESSION_COOKIE='your-cookie-value' ./call-cleanup-production.sh"
echo ""
echo "Option 2: Call from browser console (easier!)"
echo "  1. Open https://natura.bixlor.com/admin"
echo "  2. Login as admin"
echo "  3. Open DevTools Console (F12)"
echo "  4. Paste and run:"
echo ""
echo "     fetch('/api/admin/cleanup-stores', {"
echo "       method: 'POST',"
echo "     }).then(r => r.json()).then(console.log)"
echo ""
echo "======================================="
echo ""

# Check if session cookie is provided
if [ -z "$SESSION_COOKIE" ]; then
  echo "❌ No SESSION_COOKIE provided."
  echo ""
  echo "Please use Option 2 (browser console) or set SESSION_COOKIE environment variable."
  exit 1
fi

echo "📡 Calling cleanup endpoint..."
echo ""

RESPONSE=$(curl -s -X POST "https://natura.bixlor.com/api/admin/cleanup-stores" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  -H "Content-Type: application/json")

echo "📊 Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""
echo "======================================="
