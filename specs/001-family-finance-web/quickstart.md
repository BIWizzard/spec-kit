# Quickstart Guide: Family Finance Web Application

## Prerequisites

- Node.js 20 LTS or higher
- PostgreSQL 15 or higher
- Redis (or Docker for local development)
- Plaid developer account (free tier)

## Local Development Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd family-finance-app
npm install
```

### 2. Environment Configuration
Create `.env.local` file:
```env
# Database (Neon serverless PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/family_finance"

# No Redis needed - using PostgreSQL sessions + TanStack Query

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Plaid (get from https://dashboard.plaid.com)
PLAID_CLIENT_ID="your-client-id"
PLAID_SECRET="your-secret"
PLAID_ENV="sandbox"
PLAID_PRODUCTS="transactions"
PLAID_COUNTRY_CODES="US"

# Email (for development, use Mailtrap or similar)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="2525"
SMTP_USER="your-user"
SMTP_PASS="your-pass"
SMTP_FROM="noreply@familyfinance.app"
```

### 3. Database Setup
```bash
# Run migrations
npx prisma migrate dev

# Seed with sample data (optional)
npm run db:seed
```

### 4. Start Development Server
```bash
# Start all services
npm run dev

# Or start individually:
npm run dev:backend  # API on http://localhost:3001
npm run dev:frontend # UI on http://localhost:3000
```

## Testing the Core User Journey

### Step 1: Create Family Account
1. Navigate to http://localhost:3000
2. Click "Get Started" or "Sign Up"
3. Enter family details:
   - Family name: "Johnson Family"
   - Your email: test@example.com
   - Password: (min 12 characters)
   - Enable MFA: Toggle on for security
4. Verify email (check console in dev mode)
5. Complete MFA setup with authenticator app

### Step 2: Connect Bank Account (Sandbox)
1. Go to Settings → Bank Accounts
2. Click "Connect Bank Account"
3. In Plaid Link (sandbox mode):
   - Select any test bank
   - Username: `user_good`
   - Password: `pass_good`
4. Select accounts to sync
5. Confirm connection
6. Wait for initial transaction sync (~30 seconds)

### Step 3: Schedule Income Event
1. Navigate to Income → Add Income
2. Create paycheck:
   - Name: "Monthly Salary"
   - Amount: $3,500
   - Date: 1st of month
   - Frequency: Monthly
3. Click "Save Income"
4. Verify income appears in calendar view

### Step 4: Set Up Budget Allocation
1. Go to Budget → Configure
2. Use preset "50/30/20 Rule" or custom:
   - Needs: 50%
   - Wants: 30%
   - Savings: 20%
3. Click "Apply to All Income"
4. Verify allocation breakdown:
   - $3,500 income → $1,750 Needs, $1,050 Wants, $700 Savings

### Step 5: Schedule and Attribute Payment
1. Navigate to Bills → Add Bill
2. Create rent payment:
   - Payee: "ABC Property Management"
   - Amount: $1,200
   - Due date: 5th of month
   - Category: Housing (Needs)
   - Frequency: Monthly
3. Click "Attribute to Income"
4. Select "Monthly Salary - 1st"
5. Verify remaining balance:
   - Income: $3,500 - $1,200 = $2,300 remaining

### Step 6: View Cash Flow Calendar
1. Go to Calendar view
2. Click on current month
3. Verify display shows:
   - Income events with amounts
   - Scheduled payments with attribution
   - Running balance by day
4. Click any day for detailed view
5. Test drill-down to transaction details

### Step 7: Test Payment Splitting
1. Add new large payment:
   - Payee: "Annual Insurance"
   - Amount: $2,400
   - Due date: 15th
2. Try to attribute to single income (insufficient)
3. System prompts for split
4. Choose "Auto-split" or manual:
   - $2,300 from Income 1 (remaining)
   - $100 from Income 2 (next paycheck)
5. Verify split attribution displayed

### Step 8: Invite Family Member
1. Go to Family → Members
2. Click "Invite Member"
3. Enter spouse email
4. Set role: "Editor"
5. Send invitation
6. Log out and accept invitation
7. Verify shared data access

## Validation Checklist

### Core Functionality
- [ ] User can create account with MFA
- [ ] Bank account connects via Plaid
- [ ] Transactions import and categorize
- [ ] Income events schedule correctly
- [ ] Budget percentages allocate properly
- [ ] Payments attribute to income events
- [ ] Calendar shows accurate cash flow
- [ ] Drill-down views work properly
- [ ] Payment splitting handles edge cases
- [ ] Family members share data correctly

### Performance Validation
- [ ] Page loads < 1 second
- [ ] API responses < 100ms (p95)
- [ ] Calendar renders smoothly
- [ ] Bank sync completes < 60 seconds
- [ ] No memory leaks after extended use

### Security Validation
- [ ] MFA authentication works
- [ ] Sessions expire appropriately
- [ ] Role-based access enforced
- [ ] Bank credentials not stored
- [ ] HTTPS enforced in production

## Running Tests

### Unit Tests
```bash
npm run test:unit
# Coverage report
npm run test:unit:coverage
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
# Start test environment
npm run test:e2e:setup

# Run Playwright tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- --grep "payment attribution"
```

### Contract Tests
```bash
# Validate API contracts
npm run test:contracts

# Test specific endpoint
npm run test:contracts -- --endpoint "/api/payments"
```

## Common Issues & Solutions

### Issue: Plaid Connection Fails
**Solution**: Ensure Plaid credentials are correct and environment is set to "sandbox"

### Issue: Database Migration Errors
**Solution**:
```bash
npx prisma migrate reset
npx prisma migrate dev
```

### Issue: Redis Connection Refused
**Solution**: Start Redis with Docker:
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Issue: MFA QR Code Not Displaying
**Solution**: Check NEXTAUTH_URL matches your development URL

### Issue: Transactions Not Syncing
**Solution**: Trigger manual sync or check Plaid webhook configuration

## Production Deployment

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates ready
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### Deployment Commands
```bash
# Build production bundle
npm run build

# Run database migrations
npx prisma migrate deploy

# Start production server
npm run start
```

### Post-deployment Validation
1. Create test family account
2. Connect sandbox bank account
3. Verify core user journey
4. Check monitoring dashboards
5. Test rollback procedure

## Support & Documentation

- API Documentation: http://localhost:3000/api-docs
- Component Storybook: http://localhost:6006
- Database Schema: `/docs/database.md`
- Architecture Guide: `/docs/architecture.md`

## Quick Commands Reference

```bash
# Development
npm run dev              # Start all services
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed sample data
npm run db:reset         # Reset database

# Testing
npm run test             # All tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Production
npm run build            # Build for production
npm run start            # Start production server
npm run analyze          # Bundle analysis
```