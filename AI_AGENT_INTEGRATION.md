# 🤖 AI Agent Integration System

## **Overview**

Complete AI agent integration system for customer support automation using N8N workflows and our database APIs.

## **🔗 API Endpoints**

### **1. Order Lookup API**

```
GET /api/ai-agent/orders/lookup?orderCode=FLOW-040833&phone=+212642310581
```

**Response includes:**

- Complete order details (products, customer, store)
- Order timeline and status history
- Customer loyalty information
- Suggested support actions
- AI context for decision making

### **2. Customer Search API**

```
GET /api/ai-agent/customers/search?phone=+212642310581&name=Zaid
```

**Response includes:**

- Customer profile and analytics
- Order history and preferences
- Communication preferences
- Loyalty tier and spending patterns
- Suggested support actions

### **3. Support Actions API**

```
POST /api/ai-agent/support
```

**Available actions:**

- `update_order_status` - Update order status
- `get_order_details` - Get detailed order info
- `get_customer_details` - Get customer info
- `create_support_ticket` - Create support ticket
- `send_customer_message` - Send message to customer
- `escalate_to_human` - Escalate to human support

### **4. Analytics API**

```
GET /api/ai-agent/analytics?period=7d&storeId=xxx&predictions=true
```

**Response includes:**

- Business metrics and KPIs
- Customer insights and trends
- Product performance
- AI recommendations
- Predictive analytics

## **🔄 N8N Workflow Integration**

### **Workflow 1: Customer Complaint Handler**

```json
{
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "customer-complaint",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Extract Order Code",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Extract order code from customer message\nconst message = $input.first().json.message;\nconst orderCodeMatch = message.match(/\\b[A-Z0-9-]+\\b/);\nconst orderCode = orderCodeMatch ? orderCodeMatch[0] : null;\n\nreturn {\n  orderCode,\n  customerPhone: $input.first().json.phone,\n  message: message\n};"
      }
    },
    {
      "name": "Lookup Order",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://natura.bixlor.com/api/ai-agent/orders/lookup",
        "method": "GET",
        "qs": {
          "orderCode": "={{ $json.orderCode }}",
          "phone": "={{ $json.customerPhone }}"
        }
      }
    },
    {
      "name": "AI Decision",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "resource": "chat",
        "model": "gpt-4",
        "messages": [
          {
            "role": "system",
            "content": "You are a customer support AI for Natura Beldi. Analyze the order data and customer complaint to provide helpful assistance."
          },
          {
            "role": "user",
            "content": "Order Data: {{ $json }}\nCustomer Complaint: {{ $('Extract Order Code').item.json.message }}\n\nProvide a helpful response and suggest actions."
          }
        ]
      }
    },
    {
      "name": "Send Response",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://natura.bixlor.com/api/ai-agent/support",
        "method": "POST",
        "body": {
          "action": "send_customer_message",
          "customerId": "={{ $('Lookup Order').item.json.order.customer.id }}",
          "data": {
            "message": "={{ $json.choices[0].message.content }}",
            "type": "whatsapp"
          }
        }
      }
    }
  ]
}
```

### **Workflow 2: Order Status Updates**

```json
{
  "nodes": [
    {
      "name": "Glovo Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "glovo-status-update",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Update Order Status",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://natura.bixlor.com/api/ai-agent/support",
        "method": "POST",
        "body": {
          "action": "update_order_status",
          "orderId": "={{ $json.orderId }}",
          "data": {
            "newStatus": "={{ $json.status }}"
          }
        }
      }
    },
    {
      "name": "Notify Customer",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://natura.bixlor.com/api/ai-agent/support",
        "method": "POST",
        "body": {
          "action": "send_customer_message",
          "customerId": "={{ $json.customerId }}",
          "data": {
            "message": "Your order {{ $json.orderCode }} status has been updated to {{ $json.status }}",
            "type": "whatsapp"
          }
        }
      }
    }
  ]
}
```

### **Workflow 3: Customer Analytics Dashboard**

```json
{
  "nodes": [
    {
      "name": "Cron Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "rule": {
          "interval": [{ "field": "hour", "value": 1 }]
        }
      }
    },
    {
      "name": "Get Analytics",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://natura.bixlor.com/api/ai-agent/analytics",
        "method": "GET",
        "qs": {
          "period": "7d",
          "predictions": "true"
        }
      }
    },
    {
      "name": "Generate Report",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "resource": "chat",
        "model": "gpt-4",
        "messages": [
          {
            "role": "system",
            "content": "Generate a business intelligence report based on the analytics data."
          },
          {
            "role": "user",
            "content": "Analytics Data: {{ $json }}\n\nGenerate a comprehensive business report with insights and recommendations."
          }
        ]
      }
    },
    {
      "name": "Send Report",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "to": "admin@natura-beldi.com",
        "subject": "Daily Business Analytics Report",
        "text": "={{ $json.choices[0].message.content }}"
      }
    }
  ]
}
```

## **🚀 Implementation Steps**

### **Step 1: Set up N8N Instance**

1. Deploy N8N on your server or use N8N Cloud
2. Configure webhook endpoints
3. Set up OpenAI API key

### **Step 2: Configure Authentication**

```bash
# Add to your N8N environment variables
NATURA_API_URL=https://natura.bixlor.com
NATURA_API_KEY=your_api_key_here
```

### **Step 3: Test API Endpoints**

```bash
# Test order lookup
curl "https://natura.bixlor.com/api/ai-agent/orders/lookup?orderCode=FLOW-040833&phone=+212642310581"

# Test customer search
curl "https://natura.bixlor.com/api/ai-agent/customers/search?phone=+212642310581"

# Test analytics
curl "https://natura.bixlor.com/api/ai-agent/analytics?period=7d"
```

### **Step 4: Deploy Workflows**

1. Import the JSON workflows into N8N
2. Configure webhook URLs
3. Test with sample data
4. Activate workflows

## **🎯 Use Cases**

### **1. Automated Customer Support**

- Customer complains about order → AI looks up order → Provides status update
- Customer asks about delivery → AI checks order timeline → Provides ETA
- Customer wants to cancel → AI checks cancellation policy → Processes request

### **2. Proactive Customer Engagement**

- New customer → AI sends welcome message with tips
- Repeat customer → AI suggests favorite products
- At-risk customer → AI sends re-engagement campaign

### **3. Business Intelligence**

- Daily analytics reports
- Customer behavior analysis
- Product performance insights
- Revenue forecasting

### **4. Order Management**

- Automatic status updates
- Delivery notifications
- Issue escalation
- Refund processing

## **🔧 Advanced Features**

### **Multi-language Support**

```javascript
// In N8N function node
const language = $json.customer.language || "fr";
const messages = {
  fr: "Votre commande est en cours de préparation",
  en: "Your order is being prepared",
  ar: "طلبك قيد التحضير",
};
```

### **Sentiment Analysis**

```javascript
// Analyze customer sentiment
const sentiment = await analyzeSentiment($json.message);
if (sentiment.score < -0.5) {
  // Escalate to human support
  return { action: "escalate", reason: "negative_sentiment" };
}
```

### **Predictive Support**

```javascript
// Predict customer needs based on history
const predictions = await getCustomerPredictions($json.customerId);
if (predictions.likelyToCancel) {
  // Proactive intervention
}
```

## **📊 Monitoring & Analytics**

### **Track AI Agent Performance**

- Response time metrics
- Customer satisfaction scores
- Resolution rates
- Escalation frequency

### **Business Impact**

- Reduced support tickets
- Faster response times
- Improved customer satisfaction
- Cost savings

## **🔒 Security Considerations**

1. **API Authentication**: Use secure API keys
2. **Rate Limiting**: Implement request limits
3. **Data Privacy**: Encrypt sensitive customer data
4. **Access Control**: Restrict AI agent permissions
5. **Audit Logging**: Track all AI actions

## **🚀 Next Steps**

1. **Deploy the API endpoints** ✅
2. **Set up N8N instance**
3. **Configure OpenAI integration**
4. **Test with sample workflows**
5. **Deploy to production**
6. **Monitor and optimize**

---

**🎯 This system will revolutionize your customer support with AI-powered automation!**
