#!/bin/bash
# Fetch complete Glovo catalog from production store

CHAIN_ID="c37f3594-6c99-4447-b947-a438d946b0e3"
VENDOR_ID="588581"
TOKEN="eyJJRCI6IiIsIk5hbWUiOiIiLCJHbG9iYWxFbnRpdHlJRCI6IkdWX01BIiwiQ2hhaW5HbG9iYWxJRCI6ImMzN2YzNTk0LTZjOTktNDQ0Ny1iOTQ3LWE0MzhkOTQ2YjBlMyIsIlRva2VuIjoib0pwYVcwbWJ0SThTVlI1WCIsIkdlbmVyYXRlZEF0IjoiMDAwMS0wMS0wMVQwMDowMDowMFoifQo="
BASE_URL="https://glovo.partner.deliveryhero.io"

OUTPUT_DIR="data"
mkdir -p "$OUTPUT_DIR"

echo "📡 Fetching categories..."
curl -s -X GET "${BASE_URL}/v2/chains/${CHAIN_ID}/vendors/${VENDOR_ID}/categories" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  > "${OUTPUT_DIR}/categories.json"

echo "✅ Categories saved to ${OUTPUT_DIR}/categories.json"

echo ""
echo "📦 Fetching all products (31 pages)..."

# Fetch first page to get total pages
FIRST_PAGE=$(curl -s -X GET "${BASE_URL}/v2/chains/${CHAIN_ID}/vendors/${VENDOR_ID}/catalog?page_number=1&page_size=20" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "$FIRST_PAGE" > "${OUTPUT_DIR}/catalog_page_1.json"

TOTAL_PAGES=$(echo "$FIRST_PAGE" | grep -o '"total_pages":[0-9]*' | cut -d':' -f2)

echo "Total pages: $TOTAL_PAGES"
echo ""

# Fetch remaining pages
for page in $(seq 2 $TOTAL_PAGES); do
  echo "Fetching page $page/$TOTAL_PAGES..."
  curl -s -X GET "${BASE_URL}/v2/chains/${CHAIN_ID}/vendors/${VENDOR_ID}/catalog?page_number=${page}&page_size=20" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    > "${OUTPUT_DIR}/catalog_page_${page}.json"

  # Small delay to avoid rate limiting
  sleep 0.5
done

echo ""
echo "✅ All catalog pages saved to ${OUTPUT_DIR}/"
echo ""
echo "📊 Summary:"
echo "  - Categories file: ${OUTPUT_DIR}/categories.json"
echo "  - Catalog pages: ${OUTPUT_DIR}/catalog_page_*.json"
echo "  - Total pages: $TOTAL_PAGES"
