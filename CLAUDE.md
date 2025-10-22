# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Natura Beldi Management System** is a Next.js 15 application built with TypeScript, Prisma, and NextAuth for managing restaurant operations across multiple stores. The system integrates with Glovo (food delivery platform) and Twilio WhatsApp for order management and customer communication.

### Core Business Model

- **Multi-store management** with role-based access control (Admin, Collaborateur, Fournisseur)
- **Order flow**: Glovo webhook → Database → WhatsApp notification to collaborateur/fournisseur
- **OAuth token management** with automatic refresh for Glovo API
- **Customer analytics** and conversation tracking via WhatsApp

## Commands

### Development
```bash
npm run dev              # Start development server with Turbopack
npm run build            # Build for production with Turbopack
npm start                # Start production server
npm run lint             # Run ESLint
```

### Database
```bash
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema changes to database
npm run db:seed          # Seed database with initial data
```

### Testing Scripts
```bash
./test-order-flow.sh     # Test complete order flow (Glovo → Database → WhatsApp)
./test-ai-agent.sh       # Test AI agent integration endpoints
./send-test-order-production.sh  # Send test order to production
./call-cleanup-production.sh     # Clean up test data
```

## Architecture

### Authentication & Authorization

- **NextAuth.js** with JWT sessions and credential provider
- **Role-based routing**: Each role (ADMIN, COLLABORATEUR, FOURNISSEUR) has dedicated dashboard routes under `/admin`, `/collaborateur`, `/fournisseur`
- **Session management**: JWT tokens store user role and ID, validated in API routes and pages
- **Event tracking**: All user actions logged via `event-tracker.ts` service

### Glovo Integration

The Glovo integration has **two different APIs** depending on environment:

#### Test Environment (stageapi.glovoapp.com)
- Uses **shared token** (read-only): `8b979af6-8e38-4bdb-aa07-26408928052a`
- **External Store ID**: `store-01` (your identifier, appears in webhooks)
- **Internal Store Address ID**: `226071` (Glovo's internal ID)
- **Auto-accept enabled**: Orders are automatically accepted by Glovo after ~1 hour
- **Token permissions**:
  - ✅ Receive webhooks (order notifications)
  - ✅ Read store data (closing status, packaging types, menu)
  - ❌ Cannot accept orders or update status (read-only)
- **Authentication format**: Plain token (no "Bearer" prefix)
- **Working endpoints**:
  - `GET /webhook/stores/store-01/closing` - Get temporary closure status
  - `GET /webhook/stores/store-01/packagings/types` - Get packaging types
  - `GET /webhook/stores/store-01/menu/updates` - Get menu update status

#### Production Environment (api.glovoapp.com)
1. **Initial setup**: Store Glovo credentials (Client ID, Client Secret) in `Credential` table
2. **Token exchange**: `glovo-service.ts` exchanges credentials for access/refresh tokens
3. **Webhook ingestion**: `/api/webhooks/glovo/orders` receives order events from Glovo
4. **Token refresh**: `token-refresh-service.ts` automatically renews tokens before expiration (runs via cron every 30 minutes)
5. **Full write permissions**: Can accept orders, update status, modify menu

### Twilio WhatsApp Integration

- **WhatsApp Business API** integration via `twilio-service.ts`
- **Conversation tracking**: Each store's conversations stored in `Conversation` and `Message` tables
- **Bidirectional messaging**: Inbound messages via webhook, outbound via Twilio API
- **Automatic notifications**: Orders trigger WhatsApp messages to collaborateurs/fournisseurs

### Database Schema (Prisma)

**Key relationships:**
- `User` ↔ `Store` (many-to-many via `CollaborateurStore` and `FournisseurStore`)
- `Store` → `Order` (one-to-many)
- `Credential` → `Order` (tracks which API credential received the order)
- `Customer` → `Order` (one-to-many for analytics)
- `Conversation` → `Message` (one-to-many for WhatsApp threads)

**Important fields:**
- `Order.orderId`: Glovo's order ID (NOT the database primary key)
- `Order.orderCode`: Human-readable code like "FLOW-040833"
- `Order.status`: ACCEPTED, READY_FOR_PICKUP, OUT_FOR_DELIVERY, PICKED_UP_BY_CUSTOMER, CANCELLED
- `Credential.expiresAt`: OAuth token expiration timestamp (critical for refresh logic)
- All prices stored in **centimes** (e.g., 1000 = 10.00 MAD)

### API Routes Structure

```
/api/auth/[...nextauth]         # NextAuth authentication
/api/webhooks/glovo/orders      # Glovo order webhook receiver
/api/glovo/token                # OAuth token exchange
/api/glovo/refresh              # Manual token refresh
/api/glovo/dispatch             # Dispatch order to Glovo
/api/orders/*                   # Order CRUD operations
/api/ai-agent/*                 # AI agent integration for N8N workflows
/api/customers/*                # Customer analytics
/api/stores/*                   # Store management
/api/collaborateurs/*           # Collaborateur management
/api/fournisseurs/*             # Fournisseur management
```

### Service Layer (`src/lib/`)

**Core services:**
- `glovo-service.ts`: Glovo API client with OAuth handling
- `glovo-business-service.ts`: High-level Glovo business logic (order processing, menu sync)
- `token-refresh-service.ts`: Automatic OAuth token renewal
- `twilio-service.ts`: WhatsApp messaging via Twilio
- `whatsapp-conversation-service.ts`: Conversation state management
- `event-tracker.ts`: System-wide event logging (server-side)
- `client-event-tracker.ts`: Client-side event tracking
- `credentials-service.ts`: Secure credential storage/retrieval

### Environment Variables

Required in `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Glovo (stored in Credential table, not env vars)
# Managed via admin dashboard

# Twilio (stored in Credential table)
# Managed via admin dashboard

# Cron (for token refresh)
CRON_SECRET="natura-beldi-cron-2024"
```

## Key Development Patterns

### Token Refresh Pattern

OAuth tokens (Glovo, Twilio) are stored in the `Credential` table with `expiresAt` timestamp. The system:
1. Checks token validity before API calls (`getValidToken()` in `glovo-service.ts`)
2. Automatically refreshes if expiring within 30 minutes
3. Runs cron job every 30 minutes via `/api/cron/token-refresh` endpoint

### Order Processing Flow

1. Glovo webhook posts to `/api/webhooks/glovo/orders`
2. Order parsed and saved to database with `source: "GLOVO"`
3. Event created in `Event` table for audit trail
4. WhatsApp message sent to assigned collaborateur via `twilio-service.ts`
5. Customer record updated with analytics (total orders, total spent, etc.)

### Role-Based Data Access

- **Admin**: Full access to all stores, users, and orders
- **Collaborateur**: Access only to assigned stores (via `CollaborateurStore`)
- **Fournisseur**: Access only to assigned stores (via `FournisseurStore`)

Check user assignments in API routes using:
```typescript
const stores = await prisma.collaborateurStore.findMany({
  where: { collaborateurId: session.user.id }
});
```

### AI Agent Integration

The `/api/ai-agent/*` endpoints provide webhook-compatible APIs for N8N workflows:
- Order lookup by code and phone
- Customer search and analytics
- Support actions (update status, send messages)
- Business analytics with predictions

Used for automating customer support via AI (see [AI_AGENT_INTEGRATION.md](AI_AGENT_INTEGRATION.md))

## Important Notes

### Glovo API Quirks

- Order times use format `yyyy-MM-dd HH:mm:ss` with `utc_offset_minutes`
- All prices in **centimes** (multiply by 100 before storing)
- Shared token for test environment (no OAuth required)
- Production uses full OAuth flow with refresh tokens

### Database Migrations

- **DO NOT** use `prisma migrate` - this project uses `prisma db push` for schema changes
- Always run `npm run db:generate` after schema changes
- Seed script creates default admin user: `Natura.beldi` / `Natura5600`

### Turbopack Usage

This project uses **Turbopack** for faster builds:
- Dev server: `next dev --turbopack`
- Build: `next build --turbopack`
- Do not remove `--turbopack` flags from package.json scripts

### TypeScript Strict Mode

- Project uses strict TypeScript with `"strict": true`
- Prisma types are generated - always import from `@prisma/client`
- Use type guards for user roles: `user.role === "ADMIN"`

## Testing

### Manual Testing Workflow

1. **Start dev server**: `npm run dev`
2. **Login as admin**: Navigate to `/login`, use `Natura.beldi` / `Natura5600`
3. **Set up Glovo credentials**: Admin dashboard → Credentials → Add Glovo API
4. **Set up Twilio**: Admin dashboard → Credentials → Add Twilio WhatsApp
5. **Test order flow**: Run `./test-order-flow.sh` or use Glovo test site

### Common Test Scenarios

- **Order webhook**: POST to `/api/webhooks/glovo/orders` with Glovo order JSON
- **Token refresh**: GET `/api/cron/token-refresh` with `Authorization: Bearer <CRON_SECRET>`
- **WhatsApp message**: Use Twilio console to send message to configured number

## Debugging

### Common Issues

**"Credentials not found"**: Ensure Glovo/Twilio credentials are configured in admin dashboard and marked as active

**Token expired errors**: Run token refresh manually via `/api/glovo/refresh` or check cron job is running

**Webhook not receiving orders**: Verify webhook URL is registered with Glovo and matches your deployed URL

**TypeScript errors on build**: Run `npm run db:generate` to regenerate Prisma client types

### Logging

- All services use `console.log/error` for logging
- Event tracker logs to database `Event` table
- Cron logs to `/var/log/natura-beldi-tokens.log` (if configured)

## Production Deployment

1. Set `DATABASE_URL` to production PostgreSQL
2. Set `NEXTAUTH_URL` to production domain
3. Generate secure `NEXTAUTH_SECRET`: `openssl rand -base64 32`
4. Configure Glovo webhook URL to point to production `/api/webhooks/glovo/orders`
5. Set up cron job for token refresh (see [CRON_SETUP.md](CRON_SETUP.md))
6. Run `npm run build` to verify build succeeds
7. Deploy to hosting platform (Vercel recommended for Next.js)
