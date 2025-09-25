# KGiQ Family Finance - Deployment Guide

This guide covers all deployment options for the KGiQ Family Finance application, from local development to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development Deployment](#local-development-deployment)
4. [Staging Environment](#staging-environment)
5. [Production Deployment](#production-deployment)
6. [Database Management](#database-management)
7. [Monitoring & Logging](#monitoring--logging)
8. [Security Configuration](#security-configuration)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

### System Requirements

#### Production Environment
- **Node.js**: 20 LTS or higher
- **Database**: PostgreSQL 15+ (Neon recommended for serverless)
- **Platform**: Vercel (recommended) or any Node.js hosting
- **Domain**: Custom domain with SSL support
- **Email**: Transactional email service (Resend recommended)

#### Development Environment
- **Node.js**: 20 LTS
- **Docker**: 20.10+ and Docker Compose 2.0+
- **PostgreSQL**: 15+ (local or containerized)
- **Git**: Latest version

### External Services

#### Required Services
- **Neon Database**: Serverless PostgreSQL database
- **Plaid**: Bank integration API (production account)
- **Resend**: Transactional email service
- **Vercel**: Hosting and deployment platform

#### Optional Services
- **Sentry**: Error tracking and monitoring
- **Vercel Analytics**: Performance monitoring
- **SonarCloud**: Code quality analysis

---

## Environment Configuration

### Environment Variables

Create environment files for each deployment target:

#### Production (.env.production)
```bash
# Application
NODE_ENV=production
APP_NAME="KGiQ Family Finance"
APP_VERSION="1.0.0"

# Database (Neon)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/family_finance?sslmode=require"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-minimum-64-characters-long"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret-also-very-long-and-secure"

# Plaid Integration
PLAID_CLIENT_ID="your-plaid-client-id"
PLAID_SECRET="your-plaid-secret-key"
PLAID_ENV="production"
PLAID_PRODUCTS="transactions"
PLAID_COUNTRY_CODES="US"
PLAID_WEBHOOK_URL="https://your-domain.com/api/plaid/webhook"

# Email Service (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="noreply@your-domain.com"

# Security
WEBHOOK_SECRET="webhook-secret-for-external-integrations"
ENCRYPTION_KEY="32-character-encryption-key-here"

# Monitoring (optional)
SENTRY_DSN="https://xxxxxxxx@sentry.io/xxxxxxxx"
VERCEL_ANALYTICS_ID="your-vercel-analytics-id"
```

#### Staging (.env.staging)
```bash
# Application
NODE_ENV=staging
APP_NAME="KGiQ Family Finance (Staging)"
APP_VERSION="1.0.0"

# Database (Neon staging branch)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/family_finance_staging?sslmode=require"

# Authentication
JWT_SECRET="staging-jwt-secret-different-from-production"
NEXTAUTH_URL="https://staging-your-domain.vercel.app"
NEXTAUTH_SECRET="staging-nextauth-secret"

# Plaid Integration (Sandbox)
PLAID_CLIENT_ID="your-plaid-sandbox-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"
PLAID_PRODUCTS="transactions"
PLAID_COUNTRY_CODES="US"
PLAID_WEBHOOK_URL="https://staging-your-domain.vercel.app/api/plaid/webhook"

# Email Service (Development)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="staging@your-domain.com"

# Security
WEBHOOK_SECRET="staging-webhook-secret"
ENCRYPTION_KEY="staging-32-char-encryption-key"
```

#### Development (.env.local)
```bash
# Application
NODE_ENV=development
APP_NAME="KGiQ Family Finance (Dev)"
APP_VERSION="1.0.0"

# Database (Local PostgreSQL)
DATABASE_URL="postgresql://family_finance_user:dev_password@localhost:5432/family_finance_dev"

# Authentication
JWT_SECRET="dev-jwt-secret-for-local-development-only"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-nextauth-secret-local"

# Plaid Integration (Sandbox)
PLAID_CLIENT_ID="your-plaid-sandbox-client-id"
PLAID_SECRET="your-plaid-sandbox-secret"
PLAID_ENV="sandbox"
PLAID_PRODUCTS="transactions"
PLAID_COUNTRY_CODES="US"
PLAID_WEBHOOK_URL="http://localhost:3000/api/plaid/webhook"

# Email (Mailhog for local testing)
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="dev@localhost"

# Development
LOG_LEVEL="debug"
DEV_LOG_SQL="true"
```

### Vercel Environment Variables

Set these in your Vercel project settings:

#### Production Variables
```bash
# Add via Vercel CLI or Dashboard
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add NEXTAUTH_SECRET production
vercel env add PLAID_CLIENT_ID production
vercel env add PLAID_SECRET production
vercel env add RESEND_API_KEY production
# ... add all production variables
```

#### Preview/Staging Variables
```bash
# Add for staging deployments
vercel env add DATABASE_URL preview
vercel env add JWT_SECRET preview
vercel env add NEXTAUTH_SECRET preview
# ... add all staging variables
```

---

## Local Development Deployment

### Docker Compose Setup (Recommended)

1. **Start All Services**
```bash
# Clone the repository
git clone <repository-url>
cd family-finance-web

# Start all services with Docker Compose
docker-compose up -d
```

2. **Verify Services**
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

3. **Access Services**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database Admin**: http://localhost:8080 (Adminer)
- **Email Testing**: http://localhost:8025 (Mailhog)
- **API Documentation**: http://localhost:3001/api/docs

### Manual Local Setup

1. **Database Setup**
```bash
# Start PostgreSQL (if not using Docker)
# macOS with Homebrew
brew services start postgresql@15

# Ubuntu/Debian
sudo systemctl start postgresql

# Create database
createdb family_finance_dev
```

2. **Backend Setup**
```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run db:seed

# Start backend
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

---

## Staging Environment

### Vercel Staging Deployment

1. **Configure Staging Branch**
```bash
# Create staging branch
git checkout -b develop

# Configure Vercel for staging
vercel --scope your-team-name
vercel link --project family-finance-staging
```

2. **Set Staging Environment Variables**
```bash
# Set all staging variables
vercel env add DATABASE_URL preview
vercel env add NEXTAUTH_URL preview
# ... add all required variables
```

3. **Deploy to Staging**
```bash
# Push to develop branch triggers staging deployment
git push origin develop

# Or manual deployment
vercel --target staging
```

4. **Verify Staging Deployment**
- URL: `https://staging-family-finance.vercel.app`
- Check database connectivity
- Test Plaid sandbox integration
- Verify email delivery

### Staging Database Setup

1. **Neon Staging Branch**
```bash
# Create staging branch in Neon
neon branches create --parent main staging

# Get staging connection string
neon connection-string --branch staging
```

2. **Run Staging Migrations**
```bash
# Set staging DATABASE_URL
export DATABASE_URL="postgresql://staging-connection-string"

# Run migrations
npx prisma migrate deploy

# Seed staging data
npm run db:seed:staging
```

---

## Production Deployment

### Pre-deployment Checklist

#### Code Quality
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage above 80%
- [ ] Security vulnerabilities addressed
- [ ] Performance benchmarks met
- [ ] Documentation updated

#### Infrastructure
- [ ] Production database configured (Neon)
- [ ] Domain and SSL certificate ready
- [ ] CDN configured for static assets
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented

#### External Services
- [ ] Plaid production account configured
- [ ] Email service configured (Resend)
- [ ] Error tracking set up (Sentry)
- [ ] Analytics configured

### Vercel Production Deployment

1. **Configure Production Project**
```bash
# Link to production project
vercel link --project family-finance-production

# Set all production environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add NEXTAUTH_SECRET production
vercel env add PLAID_CLIENT_ID production
vercel env add PLAID_SECRET production
vercel env add RESEND_API_KEY production
```

2. **Deploy to Production**
```bash
# Deploy current branch to production
vercel --prod

# Or deploy specific commit
vercel --prod --meta commit=<commit-hash>
```

3. **Custom Domain Setup**
```bash
# Add custom domain
vercel domains add your-domain.com

# Verify domain
vercel domains verify your-domain.com

# Set as primary
vercel alias set family-finance-xxx.vercel.app your-domain.com
```

### Alternative Deployment (Non-Vercel)

#### Docker Production Setup

1. **Production Dockerfile**
```dockerfile
# Create production Dockerfiles
# backend/Dockerfile
FROM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

2. **Production Docker Compose**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
    ports:
      - "3001:3001"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    ports:
      - "3000:3000"
```

3. **Deploy with Docker**
```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Post-deployment Verification

1. **Health Checks**
```bash
# Check API health
curl https://your-domain.com/api/health

# Check database connectivity
curl https://your-domain.com/api/health/db

# Check external service connectivity
curl https://your-domain.com/api/health/plaid
```

2. **Smoke Tests**
```bash
# Run critical path tests
npm run test:smoke

# Run user journey tests
npm run test:e2e:critical
```

3. **Performance Checks**
```bash
# Lighthouse audit
npm run lighthouse

# Load testing
npm run test:load

# Monitor response times
curl -w "@curl-format.txt" https://your-domain.com/api/families
```

---

## Database Management

### Neon PostgreSQL Setup

1. **Create Neon Project**
```bash
# Install Neon CLI
npm install -g neonctl

# Login to Neon
neonctl auth

# Create project
neonctl projects create --name "family-finance" --region us-east-1
```

2. **Configure Branches**
```bash
# Main branch (production)
neonctl branches create --name main --parent root

# Staging branch
neonctl branches create --name staging --parent main

# Development branch
neonctl branches create --name develop --parent staging
```

3. **Connection Strings**
```bash
# Get connection strings
neonctl connection-string --branch main
neonctl connection-string --branch staging
neonctl connection-string --branch develop
```

### Database Migrations

1. **Production Migrations**
```bash
# Always test migrations on staging first
export DATABASE_URL="staging-connection-string"
npx prisma migrate deploy

# Then run on production
export DATABASE_URL="production-connection-string"
npx prisma migrate deploy
```

2. **Migration Rollback**
```bash
# Create rollback migration
npx prisma migrate diff \
  --from-schema-datasource schema.prisma \
  --to-schema-datamodel previous-schema.prisma \
  --script > rollback.sql

# Apply rollback
psql $DATABASE_URL < rollback.sql
```

3. **Data Seeding**
```bash
# Seed staging environment
npm run db:seed:staging

# Seed production (initial setup only)
npm run db:seed:production
```

### Database Monitoring

1. **Query Performance**
```bash
# Enable query logging in Neon
neonctl set-context --analytics-enabled true

# Monitor slow queries
neonctl logs --branch main --filter "slow_query"
```

2. **Connection Monitoring**
```bash
# Monitor connection usage
neonctl metrics connections --branch main

# Monitor database size
neonctl metrics storage --branch main
```

---

## Monitoring & Logging

### Application Monitoring

1. **Vercel Analytics**
```bash
# Enable in vercel.json
{
  "analytics": {
    "enable": true
  },
  "speedInsights": {
    "enable": true
  }
}
```

2. **Sentry Error Tracking**
```bash
# Install Sentry
npm install @sentry/nextjs @sentry/node

# Configure in sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1
});
```

### Logging Configuration

1. **Structured Logging**
```typescript
// backend/src/lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});
```

2. **Log Aggregation**
```bash
# Vercel logs
vercel logs --follow

# Export logs for analysis
vercel logs --since 1h > logs.txt
```

### Performance Monitoring

1. **API Response Times**
```typescript
// Middleware to track response times
export const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration
    });
  });
  next();
};
```

2. **Database Performance**
```typescript
// Prisma query logging
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' }
  ]
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) { // Log slow queries
    logger.warn('Slow query detected', {
      query: e.query,
      duration: e.duration
    });
  }
});
```

---

## Security Configuration

### SSL/TLS Configuration

1. **Vercel SSL**
```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

2. **Custom Domain SSL**
```bash
# Vercel automatically provisions SSL certificates
# For custom domains, ensure DNS is configured correctly
vercel domains verify your-domain.com
```

### Security Headers

1. **Content Security Policy**
```json
// vercel.json security headers
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.plaid.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://api.plaid.com; frame-src https://cdn.plaid.com; object-src 'none';"
}
```

2. **Additional Security Headers**
```json
{
  "key": "X-Content-Type-Options",
  "value": "nosniff"
},
{
  "key": "X-Frame-Options",
  "value": "DENY"
},
{
  "key": "X-XSS-Protection",
  "value": "1; mode=block"
},
{
  "key": "Referrer-Policy",
  "value": "strict-origin-when-cross-origin"
}
```

### Environment Security

1. **Secret Management**
```bash
# Use Vercel environment variables for secrets
# Never commit secrets to git
# Rotate secrets regularly

# Environment variable naming convention
DATABASE_URL              # Database connection
JWT_SECRET               # JWT signing key
NEXTAUTH_SECRET          # NextAuth encryption
PLAID_SECRET            # Plaid API secret
RESEND_API_KEY          # Email service key
WEBHOOK_SECRET          # Webhook validation
ENCRYPTION_KEY          # Data encryption key
```

2. **Access Control**
```bash
# Limit database access
# Use read-only replicas for reporting
# Implement IP restrictions where possible
# Enable connection pooling
```

---

## Backup & Recovery

### Database Backups

1. **Neon Automatic Backups**
```bash
# Neon provides automatic point-in-time recovery
# Backups are retained for 7 days (free tier) or 30 days (paid)

# Manual backup
neonctl backup create --branch main --name "pre-migration-backup"

# List backups
neonctl backup list --branch main
```

2. **Custom Backup Scripts**
```bash
#!/bin/bash
# scripts/backup-db.sh

# Set variables
BACKUP_DIR="/backups/family-finance"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE_URL="your-database-url"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

3. **Automated Backup Scheduling**
```bash
# Add to crontab
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-db.sh

# Weekly full backup
0 0 * * 0 /path/to/scripts/full-backup.sh
```

### Disaster Recovery

1. **Recovery Procedures**
```bash
# Point-in-time recovery with Neon
neonctl branches create --name recovery --parent main --timestamp "2024-01-01T12:00:00Z"

# Manual restore from backup
gunzip backup_20240101_120000.sql.gz
psql $DATABASE_URL < backup_20240101_120000.sql
```

2. **Recovery Testing**
```bash
#!/bin/bash
# scripts/test-recovery.sh

# Create test environment
neonctl branches create --name recovery-test --parent main

# Test restore procedure
# Verify data integrity
# Document recovery time
# Clean up test environment
```

### Data Retention

1. **Data Lifecycle Management**
```sql
-- Archive old audit logs (older than 2 years)
CREATE TABLE audit_log_archive AS
SELECT * FROM audit_log
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM audit_log
WHERE created_at < NOW() - INTERVAL '2 years';

-- Archive old sessions (older than 30 days)
DELETE FROM session
WHERE expires_at < NOW() - INTERVAL '30 days';
```

2. **Automated Cleanup**
```bash
# Add to vercel.json crons
{
  "crons": [
    {
      "path": "/api/cron/cleanup-old-data",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

---

## Troubleshooting

### Common Deployment Issues

#### Build Failures

**Issue**: Build fails with TypeScript errors
```bash
# Solution: Fix type errors
npm run type-check
npm run lint:fix

# Or ignore specific errors (not recommended)
// @ts-ignore
```

**Issue**: Prisma client generation fails
```bash
# Solution: Regenerate Prisma client
npx prisma generate
npm run build
```

**Issue**: Environment variables not accessible
```bash
# Check variable names and values
vercel env ls
vercel env pull .env.local

# Verify in deployment logs
vercel logs
```

#### Runtime Issues

**Issue**: Database connection failures
```bash
# Check connection string format
# Verify database is accessible
# Check connection limits
# Verify SSL settings for production
```

**Issue**: Authentication not working
```bash
# Verify NEXTAUTH_URL matches deployment URL
# Check NEXTAUTH_SECRET is set
# Verify JWT_SECRET is consistent
# Check cookie settings for production
```

**Issue**: Plaid integration failures
```bash
# Verify PLAID_ENV setting (sandbox/production)
# Check Plaid credentials
# Verify webhook URL is accessible
# Check Plaid service status
```

### Debugging Tools

1. **Logs Analysis**
```bash
# Vercel deployment logs
vercel logs --follow

# Filter specific errors
vercel logs | grep "ERROR"

# Export logs for analysis
vercel logs --since 24h > debug.log
```

2. **Database Debugging**
```bash
# Connect to database
psql $DATABASE_URL

# Check active connections
SELECT * FROM pg_stat_activity;

# Monitor query performance
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC;
```

3. **Health Checks**
```bash
# API health check
curl -v https://your-domain.com/api/health

# Database health
curl https://your-domain.com/api/health/db

# External services health
curl https://your-domain.com/api/health/plaid
```

### Performance Troubleshooting

1. **Slow Response Times**
```bash
# Check API response times
curl -w "@curl-format.txt" https://your-domain.com/api/endpoint

# Monitor database queries
# Add indexes for slow queries
# Implement caching
# Optimize API endpoints
```

2. **High Memory Usage**
```bash
# Monitor Vercel function metrics
# Check for memory leaks
# Optimize database queries
# Implement pagination
```

3. **Cold Start Issues**
```bash
# Vercel serverless functions have cold starts
# Optimize bundle size
# Use edge functions where appropriate
# Implement warming strategies
```

---

## Maintenance & Updates

### Regular Maintenance Tasks

#### Weekly Tasks
- [ ] Review error logs and resolve critical issues
- [ ] Monitor performance metrics and response times
- [ ] Check security alerts and update dependencies
- [ ] Review backup integrity and test recovery procedures
- [ ] Monitor database performance and query efficiency

#### Monthly Tasks
- [ ] Update Node.js dependencies (`npm audit` and `npm update`)
- [ ] Review and rotate API keys and secrets
- [ ] Analyze usage patterns and optimize performance
- [ ] Review and update security policies
- [ ] Test disaster recovery procedures

#### Quarterly Tasks
- [ ] Full security audit and penetration testing
- [ ] Performance benchmarking and optimization
- [ ] Review and update documentation
- [ ] Capacity planning and scaling assessment
- [ ] Business continuity plan review

### Update Procedures

1. **Dependency Updates**
```bash
# Check for outdated packages
npm outdated

# Update dependencies safely
npm update
npm audit fix

# Test after updates
npm run test:all
npm run build
```

2. **Security Updates**
```bash
# Check for security vulnerabilities
npm audit

# Fix critical vulnerabilities
npm audit fix --force

# Manual security patches if needed
npm install package@latest
```

3. **Database Schema Updates**
```bash
# Create migration
npx prisma migrate dev --name "description-of-changes"

# Test on staging
export DATABASE_URL="staging-url"
npx prisma migrate deploy

# Deploy to production
export DATABASE_URL="production-url"
npx prisma migrate deploy
```

### Scaling Considerations

1. **Horizontal Scaling**
```bash
# Vercel automatically scales serverless functions
# No manual intervention needed for traffic spikes
# Monitor function invocation limits
```

2. **Database Scaling**
```bash
# Neon automatically scales compute resources
# Monitor connection limits
# Consider read replicas for heavy read workloads
# Implement connection pooling
```

3. **Performance Optimization**
```bash
# Monitor Core Web Vitals
# Optimize bundle size
# Implement caching strategies
# Use CDN for static assets
```

### Monitoring and Alerts

1. **Set Up Alerts**
```bash
# Error rate alerts
# Response time alerts
# Database performance alerts
# Security incident alerts
# Uptime monitoring alerts
```

2. **Performance Monitoring**
```bash
# Set up dashboards for key metrics
# Monitor user experience metrics
# Track business KPIs
# Set up automated reports
```

---

## Conclusion

This deployment guide covers all aspects of deploying the KGiQ Family Finance application from development to production. Follow the appropriate sections based on your deployment target, and always test changes in staging before deploying to production.

For additional support or questions about deployment, refer to:

- **Vercel Documentation**: https://vercel.com/docs
- **Neon Documentation**: https://neon.tech/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Prisma Deployment**: https://www.prisma.io/docs/guides/deployment

Remember to:
- Always backup your database before major changes
- Test all deployments thoroughly
- Monitor application health continuously
- Keep dependencies and security patches up to date
- Document any custom deployment procedures

---

**Last Updated**: January 2025
**Version**: 1.0
**Support**: devops@kgiq.com