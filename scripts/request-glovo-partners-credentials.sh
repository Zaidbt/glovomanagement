#!/bin/bash

# Script pour demander les credentials Partners Glovo
# Contacte l'équipe d'intégration Glovo

echo "📧 Demande de credentials Partners Glovo"
echo "========================================"

# Configuration
EMAIL="partner.integrationseu@glovoapp.com"
SUBJECT="Request for Partners API Credentials - Natura Beldi"
WEBHOOK_BASE_URL="https://yourdomain.com/api/webhooks/glovo"

echo "📧 Email: $EMAIL"
echo "🔗 Webhook Base URL: $WEBHOOK_BASE_URL"
echo ""

# Template d'email
cat << EOF > glovo-partners-request.txt
Subject: $SUBJECT

Dear Glovo Integration Team,

We are Natura Beldi, a grocery store chain in Morocco, and we would like to integrate with the Glovo Partners API to receive order notifications.

Please provide us with the following credentials:

1. Webhook ID
2. Shared token for authentication
3. Store ID for our locations

Our webhook endpoints are:
- Dispatched order notification: $WEBHOOK_BASE_URL/orders/dispatched
- Canceled order notification: $WEBHOOK_BASE_URL/orders/cancelled

Store Information:
- Store Name: Natura Beldi
- Store ID: 68243580 (if this is correct)
- Location: Casablanca, Morocco
- Address: AGADIR STORE NATURA BELDI

Please let us know if you need any additional information.

Best regards,
Natura Beldi Team
EOF

echo "📝 Template d'email créé: glovo-partners-request.txt"
echo ""
echo "📧 Contenu de l'email:"
echo "====================="
cat glovo-partners-request.txt

echo ""
echo "🎯 Prochaines étapes:"
echo "1. Envoyez cet email à $EMAIL"
echo "2. Attendez la réponse avec les credentials"
echo "3. Configurez les credentials dans votre système"
echo "4. Testez l'intégration"

echo ""
echo "💡 Note: Remplacez 'yourdomain.com' par votre domaine réel"
echo "💡 Note: Assurez-vous que vos webhooks sont accessibles publiquement"