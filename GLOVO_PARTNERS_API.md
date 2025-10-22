# Glovo Partners API - Product Management

## Overview

The Glovo Partners API allows you to manage your menu products through bulk updates. This is the **recommended way** to update products according to Glovo (instead of the PATCH endpoints).

## ✅ What Works

- **Bulk Updates**: Update multiple products at once (`/menu/updates`)
- **Product Availability**: Mark products as available/unavailable
- **Product Pricing**: Update product prices
- **Transaction Tracking**: Check status of bulk updates
- **Webhooks**: Receive incoming orders

## ❌ What Doesn't Work (Yet)

- **GET Menu**: Cannot retrieve current menu via API (404)
- **GET Products**: Cannot list products via API (404)

## Environment Variables

Add these to your `.env` or `.env.local`:

```env
GLOVO_SHARED_TOKEN=8b979af6-8e38-4bdb-aa07-26408928052a
GLOVO_STORE_ID=store-01
GLOVO_API_BASE_URL=https://stageapi.glovoapp.com
```

## API Endpoints

### 1. Bulk Update Products

**Endpoint**: `POST /api/glovo/menu/bulk-update`

Update multiple products in a single request.

**Request Body**:
```json
{
  "products": [
    {
      "id": "NAT001",
      "name": "Sardine: Trésor Méditerranéen des Oméga-3",
      "price": 25.20,
      "available": true
    },
    {
      "id": "NAT002",
      "available": false
    }
  ],
  "waitForCompletion": true  // optional, default false
}
```

**Response** (waitForCompletion = false):
```json
{
  "success": true,
  "transaction_id": "9093f161-7f5f-44f7-bef4-26d35fc8e2e9",
  "message": "Bulk update initiated for 2 products. Use transaction_id to check status."
}
```

**Response** (waitForCompletion = true):
```json
{
  "success": true,
  "transaction_id": "9093f161-7f5f-44f7-bef4-26d35fc8e2e9",
  "status": "SUCCESS",
  "details": ["Products updated: [NAT001, NAT002]"],
  "last_updated_at": "2025-10-22T03:28:52.647707318Z"
}
```

**Example**:
```bash
curl -X POST https://natura.bixlor.com/api/glovo/menu/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"id": "NAT001", "price": 26.00, "available": true}
    ],
    "waitForCompletion": true
  }'
```

---

### 2. Check Bulk Update Status

**Endpoint**: `GET /api/glovo/menu/bulk-update?transactionId=xxx`

Check the status of a bulk update transaction.

**Response**:
```json
{
  "success": true,
  "transaction_id": "9093f161-7f5f-44f7-bef4-26d35fc8e2e9",
  "status": "SUCCESS",
  "details": ["Products updated: [NAT001]"],
  "last_updated_at": "2025-10-22T03:28:52.647707318Z"
}
```

**Status Values**:
- `SUCCESS`: Update completed successfully
- `PROCESSING`: Update in progress
- `PARTIALLY_PROCESSED`: Some products updated, some failed
- `NOT_PROCESSED`: Update failed (e.g., invalid product IDs)
- `GLOVO_ERROR`: Glovo system error

**Example**:
```bash
curl -X GET "https://natura.bixlor.com/api/glovo/menu/bulk-update?transactionId=9093f161-7f5f-44f7-bef4-26d35fc8e2e9"
```

---

### 3. Update Product Availability

**Endpoint**: `POST /api/glovo/menu/update-availability`

Mark products as available or unavailable (in stock / out of stock).

**Single Product**:
```json
{
  "productId": "NAT001",
  "available": false
}
```

**Multiple Products**:
```json
{
  "updates": [
    { "id": "NAT001", "available": false },
    { "id": "NAT002", "available": true }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "productId": "NAT001",
  "available": false,
  "transaction_id": "xxx",
  "status": "SUCCESS",
  "details": ["Products updated: [NAT001]"]
}
```

**Example**:
```bash
# Mark product as out of stock
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-availability \
  -H "Content-Type: application/json" \
  -d '{"productId": "NAT001", "available": false}'

# Update multiple products
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-availability \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {"id": "NAT001", "available": false},
      {"id": "NAT002", "available": true}
    ]
  }'
```

---

### 4. Update Product Price

**Endpoint**: `POST /api/glovo/menu/update-price`

Update product prices.

**Single Product**:
```json
{
  "productId": "NAT001",
  "price": 29.99
}
```

**Multiple Products**:
```json
{
  "updates": [
    { "id": "NAT001", "price": 29.99 },
    { "id": "NAT002", "price": 15.50 }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "productId": "NAT001",
  "price": 29.99,
  "transaction_id": "xxx",
  "status": "SUCCESS",
  "details": ["Products updated: [NAT001]"]
}
```

**Example**:
```bash
# Update single price
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-price \
  -H "Content-Type: application/json" \
  -d '{"productId": "NAT001", "price": 29.99}'

# Update multiple prices
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-price \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {"id": "NAT001", "price": 29.99},
      {"id": "NAT002", "price": 15.50}
    ]
  }'
```

---

## Using the Service Directly

You can also use the `GlovoPartnersService` class directly in your code:

```typescript
import { glovoPartnersService } from "@/lib/glovo-partners-service";

// Update a single product
const response = await glovoPartnersService.updateProduct({
  id: "NAT001",
  price: 25.20,
  available: true
});

// Update multiple products
const response = await glovoPartnersService.updateProducts([
  { id: "NAT001", price: 25.20 },
  { id: "NAT002", available: false }
]);

// Update and wait for completion
const status = await glovoPartnersService.updateProductsAndWait([
  { id: "NAT001", price: 25.20 }
]);

// Check status
const status = await glovoPartnersService.getBulkUpdateStatus(transactionId);

// Update availability
await glovoPartnersService.updateProductAvailability("NAT001", false);

// Update price
await glovoPartnersService.updateProductPrice("NAT001", 29.99);
```

---

## Important Notes

### Product IDs
- You can **only update existing products**, not create new ones
- Use the exact product IDs from your menu template (e.g., `NAT001`, `NAT002`)
- If a product ID doesn't exist, it will be listed in the "not updated" section

### Pricing
- Prices are in the currency configured for your store
- Use decimal numbers (e.g., `25.20`, not `2520`)
- Negative prices are not allowed (will be changed to 0 by Glovo)

### Rate Limits
- **Full menu upload**: Maximum 5 times per day
- **Bulk updates**: Use for frequent changes (no daily limit mentioned)
- **Maximum items per request**: 10,000 products/attributes

### Best Practices
1. Use **bulk updates** instead of individual PATCH requests (better performance)
2. Use `waitForCompletion: false` for async updates, then check status later
3. Handle `PARTIALLY_PROCESSED` status - some products may succeed while others fail
4. Keep your product IDs consistent between your system and Glovo

---

## Testing

Test the API locally:

```bash
# Test bulk update
curl -X POST http://localhost:3000/api/glovo/menu/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "products": [{"id": "NAT001", "price": 25.20}],
    "waitForCompletion": true
  }'

# Test availability update
curl -X POST http://localhost:3000/api/glovo/menu/update-availability \
  -H "Content-Type: application/json" \
  -d '{"productId": "NAT001", "available": false}'
```

---

## Deployment to VPS

1. **Add environment variables** to your VPS `.env`:
```bash
GLOVO_SHARED_TOKEN=8b979af6-8e38-4bdb-aa07-26408928052a
GLOVO_STORE_ID=store-01
GLOVO_API_BASE_URL=https://stageapi.glovoapp.com
```

2. **Deploy the code**:
```bash
git add .
git commit -m "Add Glovo Partners API integration for product management"
git push
```

3. **Test on production**:
```bash
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-availability \
  -H "Content-Type: application/json" \
  -d '{"productId": "NAT001", "available": true}'
```

---

## Troubleshooting

### "No valid products found to process"
- The product ID doesn't exist in your Glovo menu
- Check your menu template for the correct product IDs

### "You are not authorized"
- Check that your `GLOVO_SHARED_TOKEN` is correct
- Verify you're using the Stage API URL

### "404 NOT FOUND"
- For `/menu` GET endpoint: This is expected - Glovo hasn't enabled read access yet
- For `/menu/updates` POST: Check your store ID is correct

### Transaction stuck in "PROCESSING"
- Wait 30-60 seconds and check again
- If still processing after 2 minutes, contact Glovo support

---

## Support

If you encounter issues with the Glovo API:
1. Check the transaction status for error details
2. Review the Glovo documentation: [GLOVO DOCUMENTATION.yaml](./GLOVO%20DOCUMENTATION.yaml)
3. Contact Glovo support: partner.integrationseu@glovoapp.com
