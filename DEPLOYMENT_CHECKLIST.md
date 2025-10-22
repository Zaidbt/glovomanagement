# Deployment Checklist - Glovo Partners API Integration

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
