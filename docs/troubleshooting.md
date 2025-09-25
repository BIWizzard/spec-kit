# Troubleshooting Guide: KGiQ Family Finance

## Table of Contents
1. [General Troubleshooting](#general-troubleshooting)
2. [Authentication Issues](#authentication-issues)
3. [Bank Connection Problems](#bank-connection-problems)
4. [Database Issues](#database-issues)
5. [Performance Problems](#performance-problems)
6. [Frontend Issues](#frontend-issues)
7. [API Errors](#api-errors)
8. [Development Setup Issues](#development-setup-issues)
9. [Deployment Problems](#deployment-problems)
10. [Security Concerns](#security-concerns)
11. [Data Integrity Issues](#data-integrity-issues)
12. [Monitoring and Logs](#monitoring-and-logs)

## General Troubleshooting

### First Steps for Any Issue
1. **Check system status**:
   - Visit `/api/health` endpoint
   - Check database connectivity
   - Verify environment variables are set

2. **Gather information**:
   - Browser/device details
   - Time of occurrence
   - Steps to reproduce
   - Error messages (exact text)

3. **Check logs**:
   ```bash
   # Application logs
   npm run logs

   # Database logs
   npm run db:logs

   # System logs
   tail -f /var/log/application.log
   ```

### Quick Diagnostic Commands
```bash
# Health check
curl http://localhost:3000/api/health

# Database connection test
npm run db:test

# Environment validation
npm run env:validate

# Service status
npm run status
```

## Authentication Issues

### Problem: Cannot Login
**Symptoms**: Login form rejects valid credentials, "Invalid credentials" error

**Causes & Solutions**:
1. **Incorrect password**:
   ```bash
   # Reset password via admin panel
   npm run auth:reset-password user@example.com
   ```

2. **Account locked**:
   ```sql
   -- Check failed login attempts
   SELECT email, failed_login_attempts, locked_until
   FROM FamilyMember
   WHERE email = 'user@example.com';

   -- Unlock account
   UPDATE FamilyMember
   SET failed_login_attempts = 0, locked_until = NULL
   WHERE email = 'user@example.com';
   ```

3. **Email not verified**:
   ```sql
   -- Check verification status
   SELECT email, email_verified FROM FamilyMember WHERE email = 'user@example.com';

   -- Manually verify email
   UPDATE FamilyMember SET email_verified = true WHERE email = 'user@example.com';
   ```

### Problem: MFA Issues
**Symptoms**: TOTP codes rejected, "Invalid verification code" error

**Solutions**:
1. **Time sync issues**:
   - Ensure server and client clocks are synchronized
   - Check timezone settings

2. **Reset MFA**:
   ```bash
   npm run auth:reset-mfa user@example.com
   ```

3. **Backup codes**:
   ```sql
   -- Generate new backup codes
   SELECT generate_backup_codes('user@example.com');
   ```

### Problem: Session Issues
**Symptoms**: Frequent logouts, "Session expired" errors

**Causes & Solutions**:
1. **Short session timeout**:
   ```env
   # Increase session duration (in .env)
   SESSION_TIMEOUT=86400000  # 24 hours
   ```

2. **Cookie issues**:
   - Check browser cookie settings
   - Verify HTTPS in production
   - Check domain configuration

3. **Database session cleanup**:
   ```sql
   -- Clean expired sessions
   DELETE FROM Session WHERE expires_at < NOW();
   ```

## Bank Connection Problems

### Problem: Plaid Connection Failed
**Symptoms**: "Unable to connect to bank", Plaid Link errors

**Diagnostic Steps**:
```bash
# Check Plaid configuration
echo $PLAID_CLIENT_ID
echo $PLAID_SECRET
echo $PLAID_ENV

# Test Plaid connection
npm run plaid:test
```

**Common Solutions**:
1. **Invalid credentials**:
   - Verify Plaid dashboard credentials
   - Check environment (sandbox vs production)

2. **Webhook issues**:
   ```bash
   # Test webhook endpoint
   curl -X POST http://localhost:3000/api/plaid/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

3. **Rate limiting**:
   ```sql
   -- Check API usage
   SELECT COUNT(*) FROM audit_log
   WHERE action = 'plaid_api_call'
   AND created_at > NOW() - INTERVAL '1 hour';
   ```

### Problem: Transaction Sync Issues
**Symptoms**: Missing transactions, outdated balances

**Solutions**:
1. **Manual sync**:
   ```bash
   npm run sync:bank-accounts
   ```

2. **Check sync status**:
   ```sql
   SELECT id, institution_name, last_sync_at, sync_status
   FROM BankAccount
   WHERE sync_status = 'error';
   ```

3. **Re-establish connection**:
   ```sql
   -- Mark for reconnection
   UPDATE BankAccount
   SET sync_status = 'disconnected'
   WHERE id = 'account-id';
   ```

## Database Issues

### Problem: Connection Refused
**Symptoms**: "Connection refused", "Database unavailable"

**Diagnostic Steps**:
```bash
# Check database status
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -U username -d family_finance -c "SELECT 1;"
```

**Solutions**:
1. **PostgreSQL not running**:
   ```bash
   # Start PostgreSQL
   brew services start postgresql  # macOS
   sudo systemctl start postgresql  # Linux
   ```

2. **Connection string issues**:
   ```bash
   # Validate DATABASE_URL
   npm run db:validate-url
   ```

3. **Network connectivity**:
   ```bash
   # Test network connection
   telnet localhost 5432
   ```

### Problem: Migration Failures
**Symptoms**: Schema mismatch, migration errors

**Solutions**:
1. **Reset database**:
   ```bash
   npm run db:reset
   npm run db:migrate
   ```

2. **Partial migration**:
   ```bash
   # Check migration status
   npx prisma migrate status

   # Mark as applied
   npx prisma migrate resolve --applied "migration_name"
   ```

3. **Schema drift**:
   ```bash
   # Reset schema
   npx prisma db push --force-reset
   ```

### Problem: Performance Issues
**Symptoms**: Slow queries, timeouts

**Diagnostic Queries**:
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions**:
1. **Add indexes**:
   ```sql
   CREATE INDEX CONCURRENTLY idx_transaction_date ON Transaction(date);
   CREATE INDEX CONCURRENTLY idx_payment_due_date ON Payment(due_date);
   ```

2. **Update statistics**:
   ```sql
   ANALYZE;
   VACUUM ANALYZE;
   ```

3. **Connection pooling**:
   ```env
   DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true"
   ```

## Performance Problems

### Problem: Slow Page Loads
**Symptoms**: Pages take >3 seconds to load

**Diagnostic Tools**:
```bash
# Performance audit
npm run audit:performance

# Bundle analysis
npm run analyze

# Lighthouse audit
npm run lighthouse
```

**Solutions**:
1. **Bundle optimization**:
   ```bash
   # Analyze bundle size
   npm run build -- --analyze

   # Remove unused dependencies
   npm run deps:unused
   ```

2. **Image optimization**:
   ```javascript
   // Use Next.js Image component
   import Image from 'next/image'

   <Image
     src="/logo.png"
     alt="Logo"
     width={200}
     height={100}
     priority
   />
   ```

3. **Caching improvements**:
   ```javascript
   // Increase stale time for stable data
   const { data } = useQuery({
     queryKey: ['budget-categories'],
     queryFn: fetchBudgetCategories,
     staleTime: 5 * 60 * 1000, // 5 minutes
   });
   ```

### Problem: Memory Leaks
**Symptoms**: Increasing memory usage, browser crashes

**Detection**:
```bash
# Memory monitoring
npm run monitor:memory

# Heap dump analysis
node --inspect app.js
```

**Solutions**:
1. **Clean up subscriptions**:
   ```javascript
   useEffect(() => {
     const subscription = observable.subscribe();
     return () => subscription.unsubscribe();
   }, []);
   ```

2. **Optimize React components**:
   ```javascript
   // Use React.memo for expensive components
   const ExpensiveComponent = React.memo(({ data }) => {
     // Component logic
   });
   ```

## Frontend Issues

### Problem: White Screen of Death
**Symptoms**: Blank page, no console errors

**Diagnostic Steps**:
1. **Check browser console**
2. **Inspect network requests**
3. **Check service worker**

**Solutions**:
1. **Clear cache**:
   ```javascript
   // Force reload without cache
   window.location.reload(true);
   ```

2. **Check JavaScript errors**:
   ```bash
   # Enable source maps in production
   GENERATE_SOURCEMAP=true npm run build
   ```

3. **Service worker issues**:
   ```javascript
   // Unregister service worker
   navigator.serviceWorker.getRegistrations()
     .then(registrations => {
       registrations.forEach(registration => registration.unregister());
     });
   ```

### Problem: Form Validation Errors
**Symptoms**: Form submits with invalid data, validation bypassed

**Solutions**:
1. **Client-side validation**:
   ```javascript
   const schema = z.object({
     amount: z.number().positive(),
     date: z.date().min(new Date()),
   });

   const { errors } = useForm({
     resolver: zodResolver(schema),
   });
   ```

2. **Server-side validation**:
   ```javascript
   // Always validate on server
   if (!isValidAmount(amount)) {
     return res.status(400).json({ error: 'Invalid amount' });
   }
   ```

### Problem: State Management Issues
**Symptoms**: Data not persisting, inconsistent UI state

**Solutions**:
1. **Check Zustand store**:
   ```javascript
   // Debug store state
   const store = useStore.getState();
   console.log('Current store state:', store);
   ```

2. **TanStack Query cache**:
   ```javascript
   // Invalidate cache
   queryClient.invalidateQueries(['payments']);

   // Clear specific cache
   queryClient.removeQueries(['payments', paymentId]);
   ```

## API Errors

### Problem: 500 Internal Server Error
**Symptoms**: API requests failing with 500 status

**Diagnostic Steps**:
1. **Check server logs**:
   ```bash
   tail -f logs/error.log
   ```

2. **Database connectivity**:
   ```bash
   npm run db:test
   ```

**Common Causes**:
1. **Unhandled exceptions**:
   ```javascript
   // Add proper error handling
   try {
     await processPayment(data);
   } catch (error) {
     console.error('Payment processing failed:', error);
     return res.status(500).json({ error: 'Payment processing failed' });
   }
   ```

2. **Database constraints**:
   ```sql
   -- Check constraint violations
   SELECT * FROM information_schema.check_constraints;
   ```

### Problem: 401 Unauthorized
**Symptoms**: Authenticated requests rejected

**Solutions**:
1. **Token validation**:
   ```javascript
   // Check token expiry
   const decoded = jwt.decode(token);
   console.log('Token expires:', new Date(decoded.exp * 1000));
   ```

2. **Session verification**:
   ```sql
   SELECT * FROM Session
   WHERE token = 'session-token'
   AND expires_at > NOW();
   ```

### Problem: Rate Limiting
**Symptoms**: 429 Too Many Requests

**Solutions**:
1. **Check rate limits**:
   ```javascript
   // Increase limits for authenticated users
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: authenticated ? 1000 : 100,
   });
   ```

2. **Implement backoff**:
   ```javascript
   const retryWithBackoff = async (fn, retries = 3) => {
     try {
       return await fn();
     } catch (error) {
       if (error.status === 429 && retries > 0) {
         await new Promise(resolve => setTimeout(resolve, 1000));
         return retryWithBackoff(fn, retries - 1);
       }
       throw error;
     }
   };
   ```

## Development Setup Issues

### Problem: Node.js Version Conflicts
**Symptoms**: Package installation fails, unexpected behavior

**Solutions**:
1. **Use Node Version Manager**:
   ```bash
   # Install correct version
   nvm install 20
   nvm use 20

   # Set default
   nvm alias default 20
   ```

2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   rm -rf node_modules
   npm install
   ```

### Problem: Environment Variables Not Loading
**Symptoms**: Configuration errors, undefined variables

**Solutions**:
1. **Check .env files**:
   ```bash
   # Verify file exists and has correct permissions
   ls -la .env*

   # Check for syntax errors
   cat .env.local | grep -v '^#' | grep '='
   ```

2. **Load order verification**:
   ```javascript
   // Add debugging
   console.log('Environment loaded:', {
     NODE_ENV: process.env.NODE_ENV,
     DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
   });
   ```

### Problem: Hot Reload Not Working
**Symptoms**: Changes require manual refresh

**Solutions**:
1. **Check file watching**:
   ```bash
   # Increase file watch limit
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Next.js configuration**:
   ```javascript
   // next.config.js
   module.exports = {
     experimental: {
       forceSwcTransforms: true,
     },
   };
   ```

## Deployment Problems

### Problem: Build Failures
**Symptoms**: Deployment fails during build step

**Solutions**:
1. **Check build logs**:
   ```bash
   npm run build 2>&1 | tee build.log
   ```

2. **Memory issues**:
   ```json
   // package.json
   {
     "scripts": {
       "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
     }
   }
   ```

3. **TypeScript errors**:
   ```bash
   # Type checking
   npx tsc --noEmit

   # Fix common issues
   npm run type:check
   ```

### Problem: Database Migration in Production
**Symptoms**: Schema changes not applied, data inconsistencies

**Solutions**:
1. **Safe migration process**:
   ```bash
   # Backup before migration
   pg_dump -h host -U user database > backup.sql

   # Run migration
   npx prisma migrate deploy

   # Verify migration
   npx prisma migrate status
   ```

2. **Rollback procedure**:
   ```bash
   # Restore from backup if needed
   psql -h host -U user database < backup.sql
   ```

### Problem: Environment Variables in Production
**Symptoms**: Configuration errors in production

**Solutions**:
1. **Vercel deployment**:
   ```bash
   # Set environment variables
   vercel env add DATABASE_URL production
   ```

2. **Docker deployment**:
   ```dockerfile
   # Use build args
   ARG DATABASE_URL
   ENV DATABASE_URL=$DATABASE_URL
   ```

## Security Concerns

### Problem: Suspected Security Breach
**Symptoms**: Unusual activity, unauthorized access

**Immediate Actions**:
1. **Change all credentials**
2. **Revoke all sessions**
3. **Enable additional logging**
4. **Notify affected users**

**Investigation**:
```sql
-- Check recent logins
SELECT email, ip_address, created_at
FROM audit_log
WHERE action = 'login'
ORDER BY created_at DESC
LIMIT 100;

-- Check failed login attempts
SELECT ip_address, COUNT(*) as attempts
FROM audit_log
WHERE action = 'login_failed'
AND created_at > NOW() - INTERVAL '1 day'
GROUP BY ip_address
ORDER BY attempts DESC;
```

### Problem: SSL/TLS Issues
**Symptoms**: Certificate errors, insecure connections

**Solutions**:
1. **Certificate renewal**:
   ```bash
   # Check certificate expiry
   openssl x509 -in cert.pem -noout -dates

   # Auto-renewal with Let's Encrypt
   certbot renew --dry-run
   ```

2. **HTTPS redirect**:
   ```javascript
   // Force HTTPS in production
   if (process.env.NODE_ENV === 'production' && !req.secure) {
     return res.redirect(`https://${req.headers.host}${req.url}`);
   }
   ```

## Data Integrity Issues

### Problem: Financial Data Discrepancies
**Symptoms**: Balance calculations incorrect, missing transactions

**Investigation Queries**:
```sql
-- Check balance calculations
SELECT
  ie.id,
  ie.amount as income_amount,
  COALESCE(SUM(pa.amount), 0) as attributed_amount,
  ie.amount - COALESCE(SUM(pa.amount), 0) as remaining_amount
FROM IncomeEvent ie
LEFT JOIN PaymentAttribution pa ON ie.id = pa.income_event_id
GROUP BY ie.id, ie.amount
HAVING ie.amount - COALESCE(SUM(pa.amount), 0) < 0;

-- Check orphaned attributions
SELECT pa.*
FROM PaymentAttribution pa
LEFT JOIN IncomeEvent ie ON pa.income_event_id = ie.id
LEFT JOIN Payment p ON pa.payment_id = p.id
WHERE ie.id IS NULL OR p.id IS NULL;
```

**Solutions**:
1. **Data repair**:
   ```sql
   -- Fix negative balances
   UPDATE IncomeEvent
   SET remaining_amount = amount - (
     SELECT COALESCE(SUM(amount), 0)
     FROM PaymentAttribution
     WHERE income_event_id = IncomeEvent.id
   );
   ```

2. **Implement constraints**:
   ```sql
   -- Add check constraints
   ALTER TABLE PaymentAttribution
   ADD CONSTRAINT check_positive_amount CHECK (amount > 0);
   ```

### Problem: Duplicate Transactions
**Symptoms**: Same transaction appears multiple times

**Detection**:
```sql
-- Find duplicates
SELECT plaid_transaction_id, COUNT(*)
FROM Transaction
GROUP BY plaid_transaction_id
HAVING COUNT(*) > 1;
```

**Solutions**:
1. **Deduplication**:
   ```sql
   -- Remove duplicates (keep oldest)
   DELETE FROM Transaction t1
   USING Transaction t2
   WHERE t1.plaid_transaction_id = t2.plaid_transaction_id
   AND t1.created_at > t2.created_at;
   ```

2. **Prevention**:
   ```sql
   -- Add unique constraint
   ALTER TABLE Transaction
   ADD CONSTRAINT unique_plaid_transaction
   UNIQUE (plaid_transaction_id);
   ```

## Monitoring and Logs

### Log Locations
```bash
# Application logs
tail -f logs/application.log

# Error logs
tail -f logs/error.log

# Access logs
tail -f logs/access.log

# Database logs
tail -f /var/log/postgresql/postgresql.log

# System logs
journalctl -u family-finance -f
```

### Key Metrics to Monitor
1. **Performance**:
   - Response times (p50, p95, p99)
   - Database query performance
   - Memory usage
   - CPU utilization

2. **Business**:
   - Active users
   - Bank connection success rate
   - Transaction sync frequency
   - Error rates by endpoint

3. **Security**:
   - Failed login attempts
   - Suspicious activity patterns
   - API rate limiting triggers

### Alerting Thresholds
```yaml
# Example alerting configuration
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    duration: 5m

  - name: Slow Response Time
    condition: response_time_p95 > 2000ms
    duration: 2m

  - name: Database Connection Issues
    condition: db_connection_errors > 0
    duration: 1m

  - name: Failed Bank Syncs
    condition: failed_sync_rate > 10%
    duration: 10m
```

## Emergency Procedures

### Production Incident Response
1. **Assess severity** (P0-P4)
2. **Engage incident commander**
3. **Create incident channel**
4. **Implement immediate fixes**
5. **Monitor impact**
6. **Post-incident review**

### Rollback Procedures
```bash
# Database rollback
npm run db:rollback

# Application rollback
git revert <commit-hash>
npm run deploy:rollback

# Full system rollback
npm run system:rollback --to-version=1.2.3
```

### Contact Information
- **On-call Developer**: [contact info]
- **Database Admin**: [contact info]
- **Infrastructure Team**: [contact info]
- **Security Team**: [contact info]

---

*This troubleshooting guide should be kept up-to-date as new issues are discovered and resolved. Each section should include common symptoms, diagnostic steps, and proven solutions.*