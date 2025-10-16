# Glovo Test Environment Setup

## Test Credentials

### Testing Stage Information
- **Customer Web URL**: https://testglovo.com/es/en/barcelona/natura-beldi-ma-test/
- **Shared Token**: `8b979af6-8e38-4bdb-aa07-26408928052a`
- **Store ID**: `store-01`
- **API Base URL**: `https://stageapi.glovoapp.com`

## Important Notes

### Authentication Method
Glovo test environment uses a **Shared Token** instead of OAuth flow:
- No need for OAuth token exchange
- Use the shared token directly in Authorization header: `Authorization: <shared-token>`
- Token doesn't expire during testing

### API Endpoints
All API calls should be made to: `https://stageapi.glovoapp.com`

Example request:
```bash
curl -X GET "https://stageapi.glovoapp.com/webhook/stores" \
  -H "Authorization: 8b979af6-8e38-4bdb-aa07-26408928052a"
```

## Configuration Steps

### 1. Add Environment Variables
Add these to your `.env.local` file:
```env
# Glovo Test Configuration
GLOVO_TEST_MODE=true
GLOVO_SHARED_TOKEN=8b979af6-8e38-4bdb-aa07-26408928052a
GLOVO_STORE_ID=store-01
GLOVO_API_BASE_URL=https://stageapi.glovoapp.com
```

### 2. Testing the Connection
You can test the connection using:
```bash
# Test webhook stores endpoint
curl -X GET "https://stageapi.glovoapp.com/webhook/stores" \
  -H "Authorization: 8b979af6-8e38-4bdb-aa07-26408928052a"

# Test specific store
curl -X GET "https://stageapi.glovoapp.com/webhook/stores/store-01" \
  -H "Authorization: 8b979af6-8e38-4bdb-aa07-26408928052a"

# Test orders endpoint
curl -X GET "https://stageapi.glovoapp.com/webhook/stores/store-01/orders" \
  -H "Authorization: 8b979af6-8e38-4bdb-aa07-26408928052a"
```

### 3. Place Test Orders
Visit: https://testglovo.com/es/en/barcelona/natura-beldi-ma-test/
- Place orders as a customer
- Orders will be sent to your webhook endpoint

## Next Steps

1. ✅ Update `.env.local` with test credentials
2. ✅ Update Glovo service to support shared token mode
3. ✅ Set up webhook endpoint to receive orders
4. ✅ Test end-to-end order flow
5. ✅ Verify order status updates

## Webhook Configuration

Your webhook should be configured to receive orders at:
- Development: `http://localhost:3000/api/webhooks/glovo/orders`
- Production: `https://natura.bixlor.com/api/webhooks/glovo/orders`

For local testing, you can use a tunneling service like:
- ngrok: `ngrok http 3000`
- localtunnel: `lt --port 3000`
