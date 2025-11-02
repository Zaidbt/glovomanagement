#!/bin/bash

# Script to fetch ALL products from Glovo v2 API using chain_id endpoint
# This fetches products at the CHAIN level, not individual store level

# Configuration
CHAIN_ID="66e35ff7a15a3a1fc1a50f77"  # Your Chain ID
VENDOR_ID="588581"  # Your Vendor ID (or "store-01" for test)
OAUTH_TOKEN="8b979af6-8e38-4bdb-aa07-26408928052a"  # Your OAuth token
API_BASE_URL="https://api.glovoapp.com"  # Production API
# API_BASE_URL="https://stageapi.glovoapp.com"  # Test API

OUTPUT_DIR="./data/glovo-products"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Fetching all products from Glovo v2 API (Chain Level)"
echo "========================================================="
echo "Chain ID: $CHAIN_ID"
echo "Vendor ID: $VENDOR_ID"
echo "Output Directory: $OUTPUT_DIR"
echo ""

# Fetch first page to get total_pages
echo "📥 Fetching page 1..."
FIRST_PAGE=$(curl -s -X GET \
  "${API_BASE_URL}/v2/chains/${CHAIN_ID}/vendors/${VENDOR_ID}/catalog?page=1&page_size=500" \
  -H "Authorization: Bearer ${OAUTH_TOKEN}" \
  -H "Content-Type: application/json")

# Save first page
echo "$FIRST_PAGE" > "${OUTPUT_DIR}/page_1.json"

# Extract total_pages using jq (if available) or grep
if command -v jq &> /dev/null; then
  TOTAL_PAGES=$(echo "$FIRST_PAGE" | jq -r '.total_pages // 1')
  TOTAL_PRODUCTS=$(echo "$FIRST_PAGE" | jq -r '.products | length')
  echo "✅ Page 1: $TOTAL_PRODUCTS products"
  echo "📊 Total pages: $TOTAL_PAGES"
else
  echo "⚠️  jq not found, fetching pages 1-3 to be safe"
  TOTAL_PAGES=3
fi

echo ""

# Fetch remaining pages
if [ "$TOTAL_PAGES" -gt 1 ]; then
  for ((page=2; page<=TOTAL_PAGES; page++)); do
    echo "📥 Fetching page $page..."
    curl -s -X GET \
      "${API_BASE_URL}/v2/chains/${CHAIN_ID}/vendors/${VENDOR_ID}/catalog?page=${page}&page_size=500" \
      -H "Authorization: Bearer ${OAUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      > "${OUTPUT_DIR}/page_${page}.json"

    if command -v jq &> /dev/null; then
      PAGE_PRODUCTS=$(jq -r '.products | length' "${OUTPUT_DIR}/page_${page}.json")
      echo "✅ Page $page: $PAGE_PRODUCTS products"
    fi

    # Small delay to avoid rate limiting
    sleep 0.5
  done
fi

echo ""
echo "✅ All pages fetched!"
echo ""

# Merge all products into a single file if jq is available
if command -v jq &> /dev/null; then
  echo "🔗 Merging all products into single file..."

  # Combine all products from all pages
  jq -s '[.[].products] | add' ${OUTPUT_DIR}/page_*.json > "${OUTPUT_DIR}/all_products.json"

  TOTAL_COUNT=$(jq 'length' "${OUTPUT_DIR}/all_products.json")
  echo "✅ Merged file created: ${OUTPUT_DIR}/all_products.json"
  echo "📊 Total products: $TOTAL_COUNT"

  # Create CSV export
  echo "📄 Creating CSV export..."
  jq -r '["SKU","Name","Price","Active","Category","Image"],
         (.[] | [.sku, .title.translations[0].text, .price.amount, .is_active, .categories[0].name.translations[0].text, .images[0].image_url])
         | @csv' \
    "${OUTPUT_DIR}/all_products.json" > "${OUTPUT_DIR}/all_products.csv"

  echo "✅ CSV created: ${OUTPUT_DIR}/all_products.csv"
else
  echo "⚠️  Install jq to merge products automatically"
  echo "💡 Hint: brew install jq (macOS) or apt-get install jq (Linux)"
fi

echo ""
echo "🎉 Done! Products saved to: $OUTPUT_DIR"
echo ""
echo "📁 Files created:"
ls -lh ${OUTPUT_DIR}/
