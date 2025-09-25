# KGiQ Family Finance - Service Setup Guide

This guide walks you through connecting all the external services required for the Family Finance application. Follow these steps in order for the smoothest setup experience.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Neon PostgreSQL Database](#1-neon-postgresql-database-t471a)
3. [Authentication Provider](#2-authentication-provider-t471b)
4. [Plaid API (Bank Integration)](#3-plaid-api-bank-integration-t471c)
5. [Resend Email Service](#4-resend-email-service-t471d)
6. [Vercel Deployment](#5-vercel-deployment-t471e)
7. [Database Migrations](#6-database-migrations-t471f)
8. [Verification](#7-verification-t471g)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 20+ installed
- Git repository cloned locally
- npm or yarn package manager
- A web browser for service signups
- Credit card (some services require it even for free tiers)

## 1. Neon PostgreSQL Database (T471a)

Neon provides a serverless PostgreSQL database with a generous free tier.

### Setup Steps:

1. **Create Neon Account**
   - Go to [https://console.neon.tech/](https://console.neon.tech/)
   - Sign up with GitHub, Google, or email
   - No credit card required for free tier

2. **Create Database**
   - Click "Create Database"
   - Project Name: `family-finance-prod` (or your preference)
   - Database Name: `family_finance`
   - Region: Choose closest to your users (e.g., `us-east-2`)
   - Click "Create Project"

3. **Get Connection String**
   - In the dashboard, click on "Connection Details"
   - Copy the connection string (looks like):
     ```
     postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/family_finance?sslmode=require
     ```

4. **Configure Environment**
   ```bash
   # Copy the example file if you haven't already
   cp .env.example .env.local

   # Edit .env.local and add your connection string
   DATABASE_URL="your-neon-connection-string-here"
   DIRECT_URL="your-neon-connection-string-here"
   ```

5. **Test Connection**
   ```bash
   # From the backend directory
   cd backend
   npx prisma db push --accept-data-loss
   ```

### Free Tier Limits:
- 3 GB storage
- 1 compute hour/month active time
- Unlimited projects
- Perfect for development and small production apps

## 2. Authentication Provider (T471b)

Choose ONE of these options:

### Option A: Supabase Auth (Recommended for simplicity)

1. **Create Supabase Account**
   - Go to [https://app.supabase.com/](https://app.supabase.com/)
   - Sign up with GitHub or email
   - Create new project (free tier available)

2. **Get API Keys**
   - Go to Settings → API
   - Copy:
     - Project URL
     - Anon/Public key
     - Service Role key (keep secret!)

3. **Configure Environment**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="https://yourproject.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

### Option B: NextAuth with OAuth Providers

1. **Generate NextAuth Secret**
   ```bash
   openssl rand -base64 32
   ```

2. **Set up OAuth Provider (e.g., Google)**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://yourdomain.com/api/auth/callback/google`

3. **Configure Environment**
   ```bash
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-generated-secret"
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

## 3. Plaid API (Bank Integration) (T471c)

Plaid connects your app to users' bank accounts securely.

### Setup Steps:

1. **Create Plaid Account**
   - Go to [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
   - Complete registration (requires business information)
   - Free sandbox access immediately available

2. **Get API Keys**
   - Navigate to Team Settings → Keys
   - Copy Sandbox keys (for development):
     - Client ID
     - Sandbox secret

3. **Configure Sandbox Settings**
   - Go to Team Settings → Compliance
   - Add redirect URIs:
     - `http://localhost:3000/bank-accounts/connect`
     - Your production URL later

4. **Configure Environment**
   ```bash
   PLAID_CLIENT_ID="your-plaid-client-id"
   PLAID_SECRET="your-sandbox-secret"
   PLAID_ENV="sandbox"
   PLAID_PRODUCTS="transactions,accounts,balances"
   PLAID_COUNTRY_CODES="US"
   PLAID_WEBHOOK_URL="https://yourdomain.com/api/plaid/webhook"
   ```

5. **Test Credentials for Sandbox**
   - Username: `user_good`
   - Password: `pass_good`
   - MFA (if requested): `1234`

### Sandbox Features:
- Unlimited test connections
- Simulated bank data
- Test various scenarios (errors, MFA, etc.)

## 4. Resend Email Service (T471d)

Resend handles transactional emails (password resets, notifications, etc.).

### Setup Steps:

1. **Create Resend Account**
   - Go to [https://resend.com/](https://resend.com/)
   - Sign up (free tier: 100 emails/day, 3000/month)

2. **Verify Domain (Optional for production)**
   - Add your domain
   - Add DNS records as instructed
   - Wait for verification

3. **Get API Key**
   - Go to API Keys section
   - Create new API key
   - Copy immediately (shown only once)

4. **Configure Environment**
   ```bash
   RESEND_API_KEY="re_your_api_key_here"
   RESEND_FROM_EMAIL="notifications@yourdomain.com"
   RESEND_FROM_NAME="KGiQ Family Finance"
   ```

### Free Tier Limits:
- 100 emails/day
- 3000 emails/month
- Perfect for development and small apps

## 5. Vercel Deployment (T471e)

Vercel hosts your Next.js application with zero configuration.

### Setup Steps:

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy to Staging**
   ```bash
   # From project root
   vercel --env-file=.env.local

   # Follow prompts:
   # - Set up and deploy: Y
   # - Which scope: Your account
   # - Link to existing project: N
   # - Project name: family-finance-staging
   # - Directory: ./frontend
   ```

4. **Configure Environment Variables**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project
   - Settings → Environment Variables
   - Add all variables from .env.local
   - Different values for Production/Preview/Development

5. **Get Deployment URLs**
   - Staging: `https://family-finance-staging.vercel.app`
   - Production: `https://family-finance.vercel.app` (after domain setup)

### Free Tier Features:
- Unlimited deployments
- Automatic HTTPS
- Global CDN
- Serverless functions
- Analytics (basic)

## 6. Database Migrations (T471f)

Run Prisma migrations to set up your database schema.

### Setup Steps:

1. **Ensure Database Connection**
   ```bash
   # Test connection
   cd backend
   npx prisma db pull
   ```

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Run Migrations**
   ```bash
   # Create migration files
   npx prisma migrate dev --name init

   # For production
   npx prisma migrate deploy
   ```

4. **Seed Initial Data (Optional)**
   ```bash
   npx prisma db seed
   ```

5. **Verify Schema**
   ```bash
   npx prisma studio
   # Opens browser to inspect database
   ```

## 7. Verification (T471g)

Run these tests to verify all services are connected properly.

### Quick Verification Script:

```bash
# Create verification script
cat > verify-services.sh << 'EOF'
#!/bin/bash

echo "🔍 Verifying Service Connections..."
echo "=================================="

# Check environment variables
check_env() {
    if [ -z "${!1}" ]; then
        echo "❌ $1 is not set"
        return 1
    else
        echo "✅ $1 is configured"
        return 0
    fi
}

# Database
echo -e "\n📊 Database Configuration:"
check_env DATABASE_URL

# Authentication
echo -e "\n🔐 Authentication:"
check_env NEXTAUTH_SECRET || check_env NEXT_PUBLIC_SUPABASE_URL

# Plaid
echo -e "\n🏦 Plaid Integration:"
check_env PLAID_CLIENT_ID
check_env PLAID_SECRET

# Email
echo -e "\n📧 Email Service:"
check_env RESEND_API_KEY

# Test database connection
echo -e "\n🔗 Testing Database Connection:"
cd backend && npx prisma db push --skip-generate && echo "✅ Database connected" || echo "❌ Database connection failed"

# Test Next.js build
echo -e "\n🏗️ Testing Build:"
cd ../frontend && npm run build && echo "✅ Build successful" || echo "❌ Build failed"

echo -e "\n=================================="
echo "📋 Verification Complete!"
EOF

chmod +x verify-services.sh
./verify-services.sh
```

### Manual Verification Checklist:

- [ ] Database: Can connect via Prisma Studio
- [ ] Auth: Can load login page without errors
- [ ] Plaid: Link token generates successfully
- [ ] Email: Test email sends successfully
- [ ] Vercel: Staging deployment accessible
- [ ] Environment: All required variables set

## Troubleshooting

### Common Issues:

1. **Database Connection Timeout**
   - Check if IP is whitelisted in Neon dashboard
   - Verify connection string includes `?sslmode=require`

2. **Authentication Redirect Errors**
   - Ensure callback URLs match exactly
   - Check NEXTAUTH_URL matches your domain

3. **Plaid Sandbox Not Working**
   - Verify using sandbox credentials (not development/production)
   - Check PLAID_ENV is set to "sandbox"

4. **Email Not Sending**
   - Verify domain is verified (for custom domains)
   - Check API key is valid
   - Ensure from email matches verified domain

5. **Vercel Deployment Fails**
   - Check build logs for missing environment variables
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

### Getting Help:

- Neon: [docs.neon.tech](https://docs.neon.tech)
- Plaid: [plaid.com/docs](https://plaid.com/docs)
- Resend: [resend.com/docs](https://resend.com/docs)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Project Issues: [GitHub Issues](https://github.com/yourusername/family-finance/issues)

## Next Steps

After completing all service connections:

1. Run the full test suite: `npm test`
2. Test with real bank account in Plaid sandbox
3. Deploy to production environment
4. Configure production domain and SSL
5. Set up monitoring and alerts
6. Begin user acceptance testing with real data

---

*Last updated: January 2025*
*Version: 1.0.0*