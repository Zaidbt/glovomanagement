# Deployment Checklist - Glovo Partners API Integration

## ⚠️ IMPORTANT: THIS IS A TEST IMPLEMENTATION

**This implementation is for TESTING ONLY with Glovo Stage environment.**

### What Was Discovered During Testing

✅ **Working Endpoints**:
- `POST /webhook/stores/{storeId}/menu/updates` - Bulk product updates (WORKING!)
- Webhooks for receiving orders (WORKING!)

❌ **Not Working Endpoints**:
- `GET /webhook/stores/{storeId}/menu` - Returns 404
- `GET /webhook/stores/{storeId}/products` - Returns 404
- Most other GET endpoints return 404

### Key Findings

1. **Store ID**: Using `store-01` (this is YOUR external ID that you gave to Glovo)
2. **Product IDs**: Can only UPDATE existing products (e.g., NAT001, NAT002), cannot create new ones via API
3. **Token**: Using shared token `8b979af6-8e38-4bdb-aa07-26408928052a` (Stage environment only)
4. **Bulk Updates**: Use this instead of PATCH endpoints (as recommended by Glovo)

### Files Created (TEST IMPLEMENTATION - DELETE LATER)

**Core Service**:
- `src/lib/glovo-partners-service.ts` - Glovo Partners API client with hardcoded token/storeId

**API Endpoints**:
- `src/app/api/glovo/menu/bulk-update/route.ts` - Bulk update endpoint
- `src/app/api/glovo/menu/update-availability/route.ts` - Update stock status
- `src/app/api/glovo/menu/update-price/route.ts` - Update prices
- `src/app/api/glovo/products/route.ts` - Extract products from orders (workaround since GET /products doesn't work)
- `src/app/api/glovo/accept-order/route.ts` - Test order acceptance
- `src/app/api/glovo/test-api/route.ts` - API testing endpoint

**UI Pages**:
- `src/app/admin/glovo-test/page.tsx` - Simple test interface for bulk updates (access at `/admin/glovo-test`)

**Support Files**:
- `src/lib/glovo-test-api.ts` - Test utilities
- `test-glovo-accept.sh` - Shell script for testing
- `test-glovo-api-permissions.sh` - Permission testing script

**Documentation**:
- `GLOVO_PARTNERS_API.md` - Complete API documentation
- `DEPLOYMENT_CHECKLIST.md` - This file
- `CLAUDE.md` - Session notes

### What to Change for Production

When implementing the real product management system:

1. **Remove hardcoded credentials** from `glovo-partners-service.ts`:
   - Replace `GLOVO_SHARED_TOKEN` with dynamic credential loading from database
   - Replace `GLOVO_STORE_ID` with dynamic store ID from database
   - Add credential selection in constructor

2. **Update environment handling**:
   - Move from `.env` to database-stored credentials
   - Use the existing Credential model in Prisma
   - Link to Store model for multi-store support

3. **Add UI in Admin Dashboard**:
   - Create `/admin/glovo-products` page for bulk updates
   - Add product management interface
   - Show transaction history and status

4. **Production API URL**:
   - Change from `https://stageapi.glovoapp.com` to `https://api.glovoapp.com`
   - Get production credentials from Glovo

## ✅ Pre-Deployment (Completed)

- [x] Build successful (no TypeScript errors)
- [x] Code committed to git
- [x] Code pushed to GitHub
- [x] Documentation created (GLOVO_PARTNERS_API.md)

## 📋 VPS Deployment Steps

### 1. Pull Latest Code on VPS

SSH into your VPS and pull the latest changes:

```bash
ssh your-vps-user@natura.bixlor.com
cd /path/to/natura-beldi
git pull origin main
```

### 2. Update Environment Variables

Add these to your production `.env` file:

```bash
# Glovo Partners API Configuration
GLOVO_SHARED_TOKEN=8b979af6-8e38-4bdb-aa07-26408928052a
GLOVO_STORE_ID=store-01
GLOVO_API_BASE_URL=https://stageapi.glovoapp.com
```

**Note**: When moving to production, Glovo will provide:
- New production token
- Production API URL: `https://api.glovoapp.com`

### 3. Install Dependencies & Build

```bash
npm install
npm run build
```

### 4. Restart Application

Depending on your deployment setup:

**PM2**:
```bash
pm2 restart natura-beldi
pm2 logs natura-beldi --lines 50
```

**Docker**:
```bash
docker-compose down
docker-compose up -d --build
docker-compose logs -f --tail 50
```

**Systemd**:
```bash
sudo systemctl restart natura-beldi
sudo systemctl status natura-beldi
journalctl -u natura-beldi -f
```

## 🎯 How to Use the Bulk Update API

### Option 1: Using cURL (Terminal/SSH)

You can run these commands from your VPS terminal or locally (just change the URL).

### Option 2: Using Postman or Similar

Import the curl commands into Postman/Insomnia for easier testing with a GUI.

### Option 3: Admin Dashboard UI (TEST PAGE AVAILABLE)

A simple test UI is available at:
**`https://natura.bixlor.com/admin/glovo-test`**

This page lets you:
- Enter product ID, price, and availability
- Click buttons to update products
- See the API response in real-time
- Test all three update methods (bulk, availability, price)

**⚠️ Note**: This is a TEST page with hardcoded credentials. For production, you should:
1. Create a proper admin page at `/admin/glovo-products`
2. Load credentials from database (not environment variables)
3. Add product list, history, and better UI

---

### 5. Test the API Endpoints

#### Test Bulk Update
```bash
curl -X POST https://natura.bixlor.com/api/glovo/menu/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"id": "NAT001", "price": 25.20, "available": true}
    ],
    "waitForCompletion": true
  }'
```

Expected response:
```json
{
  "success": true,
  "transaction_id": "...",
  "status": "SUCCESS",
  "details": ["Products updated: [NAT001]"]
}
```

#### Test Availability Update
```bash
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-availability \
  -H "Content-Type: application/json" \
  -d '{"productId": "NAT001", "available": false}'
```

#### Test Price Update
```bash
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-price \
  -H "Content-Type: application/json" \
  -d '{"productId": "NAT001", "price": 26.50}'
```

### 6. Verify in Glovo Test Store

1. Go to https://testglovo.com/es/en/barcelona/natura-beldi-ma-test/
2. Check that the product updates are reflected:
   - Prices are correct
   - Availability is correct (available/unavailable products)

### 7. Monitor Logs

Watch for any errors in the application logs:

```bash
# PM2
pm2 logs natura-beldi --lines 100

# Docker
docker-compose logs -f natura-beldi

# Systemd
journalctl -u natura-beldi -f
```

Look for:
- `✅ Bulk update completed: SUCCESS`
- `📦 Updating availability for NAT001: available`
- `💰 Updating price for NAT001: €25.20`

## 🔍 Troubleshooting

### Issue: "You are not authorized"
**Solution**: Check that `GLOVO_SHARED_TOKEN` in `.env` is correct

### Issue: "No valid products found to process"
**Solution**: Product IDs don't exist in Glovo menu. Verify:
1. Product IDs match exactly (case-sensitive)
2. Products were uploaded to Glovo via the Excel template

### Issue: Build fails with TypeScript errors
**Solution**: Run `npm run build` locally first to check for errors

### Issue: API returns 500 error
**Solution**: Check application logs for detailed error messages

### Issue: Transaction stuck in "PROCESSING"
**Solution**:
1. Wait 30-60 seconds
2. Check status with GET endpoint
3. If still stuck after 2 minutes, contact Glovo support

## 📊 Monitoring

After deployment, monitor:
1. Application logs for errors
2. Transaction success rates
3. Glovo test store for accurate product data

## 🚀 Next Steps (Future)

### When Moving to Production

1. **Request Production Credentials** from Glovo:
   - Production shared token
   - Production store ID

2. **Update Environment Variables**:
   ```env
   GLOVO_SHARED_TOKEN=<production-token>
   GLOVO_STORE_ID=<production-store-id>
   GLOVO_API_BASE_URL=https://api.glovoapp.com
   ```

3. **Test Thoroughly** before going live

### Potential Enhancements

- [ ] Add UI in admin panel for product updates
- [ ] Sync product availability with inventory system
- [ ] Schedule automatic price updates
- [ ] Add webhook to receive product update confirmations
- [ ] Create dashboard for bulk update history

## 📝 API Documentation

Full documentation available in: [GLOVO_PARTNERS_API.md](./GLOVO_PARTNERS_API.md)

Quick reference:
- Bulk update: `POST /api/glovo/menu/bulk-update`
- Update availability: `POST /api/glovo/menu/update-availability`
- Update price: `POST /api/glovo/menu/update-price`
- Check status: `GET /api/glovo/menu/bulk-update?transactionId=xxx`

---

## ✅ Deployment Complete!

Once all tests pass, your Glovo Partners API integration is live and ready to use! 🎉
