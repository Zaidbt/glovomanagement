#!/bin/bash

echo "🚀 Setting up Natura Beldi Database..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/natura_beldi"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="natura-beldi-secret-key-2024"

# Glovo API (Phase 2)
GLOVO_API_KEY=""
GLOVO_API_SECRET=""

# Twilio WhatsApp (Phase 2)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_NUMBER=""
EOF
    echo "✅ .env.local created! Please update DATABASE_URL with your PostgreSQL credentials."
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "📋 Next steps:"
echo "1. Update DATABASE_URL in .env.local with your PostgreSQL credentials"
echo "2. Create a PostgreSQL database named 'natura_beldi'"
echo "3. Run: npm run db:push"
echo "4. Run: npm run db:seed"
echo "5. Run: npm run dev"
echo ""
echo "🔑 Default login credentials:"
echo "Admin: Natura.beldi / Natura5600"
echo "Collaborateur: collab.casa / collab123"
echo "Fournisseur: fourni.viande / fourni123"
