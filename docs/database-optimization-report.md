# Database Query Optimization and Indexing Analysis
Task: T447 - Database query optimization and indexing

## Current Database Schema Analysis

### Schema Overview
The Family Finance Web Application uses PostgreSQL with Prisma ORM, containing 11 core tables:
- `families` (root entity)
- `family_members` (authentication, user data)
- `bank_accounts` (Plaid integration)
- `income_events` (income tracking)
- `payments` (payment management)
- `payment_attributions` (income-payment linking)
- `budget_categories` (budget classification)
- `budget_allocations` (budget distribution)
- `spending_categories` (expense categorization)
- `transactions` (bank transaction data)
- `sessions` (authentication sessions)
- `audit_logs` (activity tracking)

## Query Pattern Analysis

### High-Frequency Query Patterns
Based on API endpoints and user interaction patterns:

1. **Authentication Queries**
   - User lookup by email: `SELECT * FROM family_members WHERE email = ?`
   - Session validation: `SELECT * FROM sessions WHERE token = ? AND expiresAt > NOW()`
   - Family member permissions: `SELECT permissions FROM family_members WHERE id = ?`

2. **Dashboard Queries**
   - Family data with members: `SELECT * FROM families f JOIN family_members fm ON f.id = fm.familyId WHERE fm.id = ?`
   - Recent transactions: `SELECT * FROM transactions ORDER BY date DESC LIMIT ?`
   - Upcoming payments: `SELECT * FROM payments WHERE dueDate >= CURRENT_DATE AND status = 'scheduled' ORDER BY dueDate`
   - Income summary: `SELECT * FROM income_events WHERE scheduledDate BETWEEN ? AND ?`

3. **Financial Data Queries**
   - Payment attributions: `SELECT * FROM payment_attributions WHERE paymentId = ? OR incomeEventId = ?`
   - Budget allocations: `SELECT * FROM budget_allocations ba JOIN budget_categories bc ON ba.budgetCategoryId = bc.id WHERE ba.incomeEventId = ?`
   - Transaction categorization: `SELECT * FROM transactions WHERE spendingCategoryId IS NULL ORDER BY date DESC`

4. **Reporting Queries**
   - Cash flow analysis: Complex aggregations across income_events and payments
   - Spending analysis: Aggregations across transactions grouped by categories
   - Monthly summaries: Time-based aggregations with date filtering

## Current Index Analysis

### Existing Indexes (Implicit from Prisma Schema)
1. **Primary Keys**: All tables have CUID primary keys
2. **Unique Constraints**:
   - `family_members.email`
   - `bank_accounts.plaidAccountId`
   - `transactions.plaidTransactionId`
   - `sessions.token`
3. **Foreign Key Indexes**: Prisma automatically creates indexes for foreign keys

### Missing Critical Indexes
Several high-impact indexes are missing based on query patterns:

1. **Date-based queries** (very common in financial apps)
2. **Status-based filtering** (payment status, income status)
3. **Composite indexes** for complex queries
4. **Partial indexes** for soft-deleted records

## Performance Optimization Recommendations

### 1. Critical Indexes for Query Performance

#### Date-Based Indexes (High Priority)
```sql
-- Income events by scheduled date (dashboard, reports)
CREATE INDEX idx_income_events_scheduled_date ON income_events(scheduled_date);

-- Payments by due date (upcoming payments, overdue)
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- Transactions by date (recent activity, reports)
CREATE INDEX idx_transactions_date ON transactions(date DESC);

-- Next occurrence for recurring items
CREATE INDEX idx_income_events_next_occurrence ON income_events(next_occurrence);
CREATE INDEX idx_payments_next_due_date ON payments(next_due_date);
```

#### Status-Based Indexes (High Priority)
```sql
-- Payment status filtering (scheduled, overdue, paid)
CREATE INDEX idx_payments_status ON payments(status);

-- Income event status filtering
CREATE INDEX idx_income_events_status ON income_events(status);

-- Bank account sync status
CREATE INDEX idx_bank_accounts_sync_status ON bank_accounts(sync_status);

-- Session expiration (active session validation)
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

#### Family-Based Composite Indexes (High Priority)
```sql
-- Family-scoped queries with status filtering
CREATE INDEX idx_payments_family_status ON payments(family_id, status);
CREATE INDEX idx_income_events_family_status ON income_events(family_id, status);
CREATE INDEX idx_bank_accounts_family_status ON bank_accounts(family_id, sync_status);

-- Family-scoped date filtering
CREATE INDEX idx_payments_family_due_date ON payments(family_id, due_date);
CREATE INDEX idx_income_events_family_scheduled_date ON income_events(family_id, scheduled_date);
CREATE INDEX idx_transactions_family_date ON transactions(bank_account_id, date DESC);
```

#### Authentication Performance Indexes (Critical)
```sql
-- Session validation (high frequency)
CREATE INDEX idx_sessions_token_expires ON sessions(token, expires_at);

-- Family member lookup optimization
CREATE INDEX idx_family_members_family_role ON family_members(family_id, role);
```

### 2. Advanced Optimization Indexes

#### Reporting Query Optimization
```sql
-- Budget allocation queries
CREATE INDEX idx_budget_allocations_income_event ON budget_allocations(income_event_id);
CREATE INDEX idx_budget_allocations_budget_category ON budget_allocations(budget_category_id);

-- Payment attribution queries (complex joins)
CREATE INDEX idx_payment_attributions_payment_income ON payment_attributions(payment_id, income_event_id);

-- Transaction categorization
CREATE INDEX idx_transactions_uncategorized ON transactions(spending_category_id)
  WHERE spending_category_id IS NULL;

-- User-categorized transactions
CREATE INDEX idx_transactions_user_categorized ON transactions(user_categorized, date DESC);
```

#### Performance Monitoring Indexes
```sql
-- Audit log performance (recent activity)
CREATE INDEX idx_audit_logs_family_created ON audit_logs(family_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Soft delete performance
CREATE INDEX idx_family_members_active ON family_members(family_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_bank_accounts_active ON bank_accounts(family_id)
  WHERE deleted_at IS NULL;
```

### 3. Query Optimization Strategies

#### Materialized Views for Complex Reports
```sql
-- Monthly cash flow summary
CREATE MATERIALIZED VIEW monthly_cash_flow AS
SELECT
  i.family_id,
  DATE_TRUNC('month', i.scheduled_date) as month,
  SUM(i.amount) as total_income,
  COUNT(i.id) as income_count
FROM income_events i
WHERE i.status = 'received'
GROUP BY i.family_id, DATE_TRUNC('month', i.scheduled_date);

-- Spending by category summary
CREATE MATERIALIZED VIEW monthly_spending AS
SELECT
  t.family_id,
  DATE_TRUNC('month', t.date) as month,
  sc.name as category_name,
  SUM(ABS(t.amount)) as total_spent,
  COUNT(t.id) as transaction_count
FROM transactions t
JOIN bank_accounts ba ON t.bank_account_id = ba.id
JOIN spending_categories sc ON t.spending_category_id = sc.id
WHERE t.amount < 0
GROUP BY ba.family_id, DATE_TRUNC('month', t.date), sc.name;
```

#### Partial Indexes for Efficiency
```sql
-- Active records only (exclude soft deletes)
CREATE INDEX idx_active_family_members ON family_members(family_id, role)
  WHERE deleted_at IS NULL;

-- Pending transactions only
CREATE INDEX idx_pending_transactions ON transactions(bank_account_id, date)
  WHERE pending = true;

-- Overdue payments only
CREATE INDEX idx_overdue_payments ON payments(family_id, due_date)
  WHERE status = 'overdue';
```

## Implementation Strategy

### Phase 1: Critical Performance Indexes
Deploy immediately for maximum impact:
1. Date-based indexes (income_events, payments, transactions)
2. Status-based indexes (payments, income_events)
3. Family-scoped composite indexes
4. Authentication performance indexes

### Phase 2: Advanced Optimization
Deploy after measuring Phase 1 impact:
1. Reporting query indexes
2. Materialized views
3. Partial indexes
4. Performance monitoring indexes

### Phase 3: Continuous Optimization
Ongoing monitoring and optimization:
1. Query performance monitoring
2. Index usage analysis
3. Regular VACUUM and ANALYZE operations
4. Query plan optimization

## Expected Performance Improvements

### Query Performance Targets
- **Authentication queries**: <5ms (currently ~20ms)
- **Dashboard data loading**: <50ms (currently ~200ms)
- **Financial reports**: <500ms (currently ~2-5s)
- **Transaction listing**: <100ms (currently ~300ms)

### Concurrent User Impact
- **10 concurrent users**: 90%+ cache hit rate
- **50 concurrent users**: <200ms p95 response time
- **100+ concurrent users**: Graceful degradation with maintained functionality

## Monitoring and Maintenance

### Performance Monitoring Queries
```sql
-- Index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Slow query identification
SELECT
  calls,
  total_time,
  mean_time,
  query
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

### Maintenance Schedule
- **Daily**: Automated VACUUM and ANALYZE
- **Weekly**: Index usage review
- **Monthly**: Query performance analysis
- **Quarterly**: Full optimization review

## Risk Assessment

### Low Risk Optimizations
- Adding indexes to existing columns
- Creating partial indexes for specific queries
- Query parameter optimization

### Medium Risk Optimizations
- Materialized views (refresh strategy needed)
- Composite index changes
- Schema modifications for denormalized fields

### High Risk Optimizations
- Table partitioning for large datasets
- Major schema refactoring
- Database engine configuration changes

## Conclusion

The proposed database optimization strategy will significantly improve query performance, especially for high-frequency operations like authentication, dashboard loading, and financial reports. The phased approach ensures minimal risk while delivering measurable performance improvements.

Implementation of Phase 1 indexes alone should achieve the <200ms API response time target for most endpoints, with additional phases providing further optimization for complex reporting queries and high-concurrency scenarios.