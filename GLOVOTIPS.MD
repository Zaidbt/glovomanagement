# 🚀 Glovo Integration Tips & Guide

## 🔑 **Your Glovo Credentials (What You Have):**

### **1. LAAS Partner Credentials** (in your admin panel):

- **Client ID**: From `laaspartners.testglovo.com`
- **Client Secret**: From `laaspartners.testglovo.com`
- **Purpose**: For making API calls **TO** Glovo (accepting orders, getting store info)

### **2. Staged Store Credentials** (from Glovo support):

- **Shared Token**: `8b979af6-8e38-4bdb-aa07-26408928052a`
- **Store ID**: `store-01`
- **Customer Web URL**: `https://testglovo.com/es/en/barcelona/natura-beldi-ma-test/`
- **Purpose**: For Glovo to send webhooks **TO** your app

## 🌐 **Two Different APIs:**

### **Glovo Business API** (Outbound - You → Glovo):

- **Uses**: LAAS Partner credentials
- **Purpose**: Accept orders, get store info, update order status
- **Example**: When you click "Accept Order" in your dashboard

### **Glovo DH Partner API** (Inbound - Glovo → You):

- **Uses**: Staged Store credentials
- **Purpose**: Glovo sends order notifications to your webhook
- **Example**: When a customer places an order on Glovo

## 🔗 **Webhook Configuration:**

Your webhook URL: `https://natura.bixlor.com/api/webhooks/glovo/orders`

**This needs to be configured in Glovo's system** using your Staged Store credentials.

## 📋 **What You Need to Do:**

1. **Send email to Glovo support** to configure the webhook URL
2. **Send the menu template** (`menu_catalog_template_STAGE.xlsx`)
3. **Test with real orders** from Glovo's test environment

## 🎯 **Summary:**

- **LAAS Partner** = You calling Glovo
- **Staged Store** = Glovo calling you
- **Webhook** = Where Glovo sends order data
- **Menu** = What products Glovo shows to customers

## 🔧 **Technical Details:**

### **Order Flow:**

1. Customer places order on Glovo
2. Glovo sends webhook to your app
3. Your app processes the order
4. You can accept/reject via Business API
5. Glovo updates customer with status

### **Webhook Data Format:**

```json
{
  "order_id": "unique-order-id",
  "store_id": "store-01",
  "customer": {
    "name": "Customer Name",
    "phone_number": "+212600000000"
  },
  "items": [...],
  "payment": {...},
  "status": "RECEIVED"
}
```

### **API Endpoints:**

- **Webhook**: `POST /api/webhooks/glovo/orders`
- **Dispatch**: `POST /api/glovo/dispatch`
- **Accept Order**: `POST /api/glovo/accept`

## 🚨 **Common Issues:**

1. **Database Resets**: Caused by new migrations, fix with explicit deploy commands
2. **Webhook Not Working**: Check Glovo configuration
3. **Credentials Confusion**: LAAS for outbound, Staged Store for inbound
4. **Menu Upload**: Required for real orders

## 📞 **Support Contacts:**

- **Glovo Support**: For webhook configuration
- **Technical Issues**: Check logs and database
- **Testing**: Use test scripts for development

## 🔄 **Next Steps:**

1. Configure webhook in Glovo system
2. Upload menu template
3. Test with real orders
4. Monitor webhook logs
5. Set up production credentials
