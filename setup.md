# Setup Instructions for Natura Beldi Management

## Prerequisites

1. **Node.js 18+** installed
2. **PostgreSQL** database running
3. **Git** (optional, for version control)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

#### Option A: Local PostgreSQL

1. Create a PostgreSQL database named `natura_beldi`
2. Update the `.env.local` file with your database credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/natura_beldi"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

#### Option B: Use a cloud database service (Supabase, Railway, etc.)

1. Create a new PostgreSQL database
2. Copy the connection string to your `.env.local` file

### 3. Database Migration

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed the database with initial data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

## Default Login Credentials

After running the seed script, you can login with:

- **Admin**: `Natura.beldi` / `Natura5600`
- **Collaborateur**: `collab.casa` / `collab123`
- **Fournisseur**: `fourni.viande` / `fourni123`

## Project Structure

```
natura-beldi/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Admin dashboard
│   │   ├── collaborateur/    # Collaborateur dashboard
│   │   ├── fournisseur/       # Fournisseur dashboard
│   │   ├── api/               # API routes
│   │   └── login/             # Authentication
│   ├── components/            # UI components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── admin/            # Admin-specific components
│   │   ├── collaborateur/    # Collaborateur components
│   │   └── fournisseur/      # Fournisseur components
│   ├── lib/                  # Utilities
│   ├── config/               # Configuration files
│   └── types/                # TypeScript definitions
├── prisma/                   # Database schema & migrations
└── public/                  # Static assets
```

## Features Implemented (Phase 1)

### ✅ Authentication System

- NextAuth.js with JWT sessions
- Role-based access control (ADMIN, COLLABORATEUR, FOURNISSEUR)
- Secure password hashing with bcryptjs

### ✅ Admin Dashboard

- Store management (CRUD operations)
- Collaborateur management (CRUD operations)
- Fournisseur management (CRUD operations)
- Attribution system (assign users to stores)
- Statistics and overview

### ✅ Collaborateur Dashboard

- Order management interface
- WhatsApp integration placeholder
- Real-time statistics
- Quick actions

### ✅ Fournisseur Dashboard

- Order tracking and management
- Status updates
- Statistics and performance metrics

### ✅ Database Schema

- Complete Prisma schema with all relationships
- User roles and permissions system
- Store management
- Order and order items tracking
- Many-to-many relationships for assignments

## Next Steps (Phase 2)

1. **Glovo API Integration**

   - Webhook setup for order reception
   - Order parsing and auto-dispatch
   - Real-time notifications

2. **Twilio WhatsApp Integration**

   - Business API setup
   - Message templates
   - Customer communication

3. **Advanced Features**
   - Analytics and reporting
   - Stock management
   - Performance tracking

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Check connection string format
- Verify database exists

### Build Issues

- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (18+ required)

### Authentication Issues

- Verify NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain

## Support

For issues or questions:

1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure database is accessible
4. Check that all dependencies are installed

**Happy coding! 🚀**
