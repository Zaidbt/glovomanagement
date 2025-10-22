# Quick Start - Testing Glovo Bulk Updates

## 🚀 Deploy to VPS

```bash
# SSH into your VPS
ssh your-user@natura.bixlor.com
cd /path/to/natura-beldi

# Pull latest code
git pull origin main

# Add environment variables (if not already added)
echo 'GLOVO_SHARED_TOKEN=8b979af6-8e38-4bdb-aa07-26408928052a' >> .env
echo 'GLOVO_STORE_ID=store-01' >> .env
echo 'GLOVO_API_BASE_URL=https://stageapi.glovoapp.com' >> .env

# Build and restart
npm install
npm run build
pm2 restart natura-beldi  # or your restart command
```

## 🎯 How to Test

### Option 1: Web UI (Easiest)

1. Go to: **https://natura.bixlor.com/admin/glovo-test**
2. Enter product details:
   - Product ID: `NAT001` (or your product ID)
   - Price: `25.20`
   - Check/uncheck "Available"
3. Click one of the buttons:
   - **Bulk Update**: Updates both price and availability
   - **Update Availability**: Only updates stock status
   - **Update Price**: Only updates price
4. Wait 2-3 seconds for result
5. Check https://testglovo.com/es/en/barcelona/natura-beldi-ma-test/ to verify

### Option 2: cURL Commands

```bash
# Update price
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-price \
  -H "Content-Type: application/json" \
  -d '{"productId": "NAT001", "price": 25.20}'

# Update availability (mark out of stock)
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-availability \
  -H "Content-Type: application/json" \
  -d '{"productId": "NAT001", "available": false}'

# Bulk update (price + availability)
curl -X POST https://natura.bixlor.com/api/glovo/menu/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"id": "NAT001", "price": 26.00, "available": true}
    ],
    "waitForCompletion": true
  }'
```

## ✅ Expected Results

**Success Response:**
```json
{
  "success": true,
  "transaction_id": "xxx-xxx-xxx",
  "status": "SUCCESS",
  "details": ["Products updated: [NAT001]"]
}
```

**Error Response (product doesn't exist):**
```json
{
  "success": true,
  "status": "NOT_PROCESSED",
  "details": ["No valid products and attributes found to process."]
}
```

## 🔍 Verify Changes

1. Go to: https://testglovo.com/es/en/barcelona/natura-beldi-ma-test/
2. Find your product (e.g., "Sardine: Trésor Méditerranéen des Oméga-3")
3. Check:
   - Price is updated ✅
   - Availability is correct (available/unavailable) ✅

## ⚠️ Important Notes

### What Works
- ✅ Bulk product updates (price, availability)
- ✅ Webhooks (receiving orders)
- ✅ Product IDs: NAT001, NAT002, etc. (from your Excel)

### What Doesn't Work
- ❌ GET /menu (returns 404)
- ❌ GET /products (returns 404)
- ❌ Creating new products via API (only updates existing ones)

### Your Product IDs

Based on your menu, use these IDs:
- `NAT001` - Sardine: Trésor Méditerranéen des Oméga-3
- `NAT002` - (your other products...)

## 🗑️ Files to Delete After Testing

This is a TEST implementation. For production, you'll need to refactor:

**Files to modify/delete:**
- `src/lib/glovo-partners-service.ts` - Remove hardcoded credentials
- `src/app/api/glovo/menu/*` - Update to load credentials from database
- `src/app/admin/glovo-test/page.tsx` - DELETE or refactor into proper admin page
- `test-glovo-*.sh` - DELETE test scripts
- `src/lib/glovo-test-api.ts` - DELETE test utilities

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for full details.

## 📚 Full Documentation

- **API Guide**: [GLOVO_PARTNERS_API.md](./GLOVO_PARTNERS_API.md)
- **Deployment**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

## 🆘 Troubleshooting

### "No valid products found to process"
- Product ID doesn't exist in Glovo
- Check your Excel file for correct product IDs

### "You are not authorized"
- Check GLOVO_SHARED_TOKEN in .env
- Make sure you're using Stage API URL

### Changes not showing in Glovo
- Wait 30-60 seconds and refresh
- Clear browser cache
- Check transaction status returned by API

## 🎉 You're Ready!

Once deployed, test the bulk updates and verify they work on the Glovo test store!
