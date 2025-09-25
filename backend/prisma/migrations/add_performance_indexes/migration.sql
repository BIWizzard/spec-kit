-- Migration: Add Performance Optimization Indexes
-- Task: T447 - Database query optimization and indexing
-- Created: 2024-01-24

-- =====================================================
-- PHASE 1: CRITICAL PERFORMANCE INDEXES
-- =====================================================

-- Date-based indexes (High Priority)
-- These support the most common financial app queries

-- Income events by scheduled date (dashboard, reports)
CREATE INDEX IF NOT EXISTS idx_income_events_scheduled_date
ON income_events(scheduled_date);

-- Income events by next occurrence (recurring processing)
CREATE INDEX IF NOT EXISTS idx_income_events_next_occurrence
ON income_events(next_occurrence);

-- Payments by due date (upcoming payments, overdue detection)
CREATE INDEX IF NOT EXISTS idx_payments_due_date
ON payments(due_date);

-- Payments by next due date (recurring processing)
CREATE INDEX IF NOT EXISTS idx_payments_next_due_date
ON payments(next_due_date);

-- Transactions by date (recent activity, reports) - DESC for latest first
CREATE INDEX IF NOT EXISTS idx_transactions_date_desc
ON transactions(date DESC);

-- Status-based indexes (High Priority)
-- These support filtering by status which is very common

-- Payment status filtering (scheduled, overdue, paid)
CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments(status);

-- Income event status filtering
CREATE INDEX IF NOT EXISTS idx_income_events_status
ON income_events(status);

-- Bank account sync status (monitoring, reconnection)
CREATE INDEX IF NOT EXISTS idx_bank_accounts_sync_status
ON bank_accounts(sync_status);

-- Session expiration (active session validation)
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
ON sessions(expires_at);

-- Family-based composite indexes (High Priority)
-- These support family-scoped queries which are the most common pattern

-- Family-scoped payment queries with status
CREATE INDEX IF NOT EXISTS idx_payments_family_status
ON payments(family_id, status);

-- Family-scoped income queries with status
CREATE INDEX IF NOT EXISTS idx_income_events_family_status
ON income_events(family_id, status);

-- Family-scoped bank account queries with status
CREATE INDEX IF NOT EXISTS idx_bank_accounts_family_status
ON bank_accounts(family_id, sync_status);

-- Family-scoped date-based queries
CREATE INDEX IF NOT EXISTS idx_payments_family_due_date
ON payments(family_id, due_date);

CREATE INDEX IF NOT EXISTS idx_income_events_family_scheduled_date
ON income_events(family_id, scheduled_date);

-- Transaction queries by bank account and date
CREATE INDEX IF NOT EXISTS idx_transactions_account_date_desc
ON transactions(bank_account_id, date DESC);

-- Authentication performance indexes (Critical)
-- These are hit on every API request

-- Session validation (token lookup with expiration check)
CREATE INDEX IF NOT EXISTS idx_sessions_token_expires
ON sessions(token, expires_at);

-- Family member role-based queries
CREATE INDEX IF NOT EXISTS idx_family_members_family_role
ON family_members(family_id, role);

-- =====================================================
-- PHASE 2: ADVANCED OPTIMIZATION INDEXES
-- =====================================================

-- Budget and allocation indexes
CREATE INDEX IF NOT EXISTS idx_budget_allocations_income_event
ON budget_allocations(income_event_id);

CREATE INDEX IF NOT EXISTS idx_budget_allocations_budget_category
ON budget_allocations(budget_category_id);

-- Payment attribution optimization (complex joins)
CREATE INDEX IF NOT EXISTS idx_payment_attributions_payment
ON payment_attributions(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_attributions_income
ON payment_attributions(income_event_id);

-- Composite index for payment attribution joins
CREATE INDEX IF NOT EXISTS idx_payment_attributions_payment_income
ON payment_attributions(payment_id, income_event_id);

-- Transaction categorization indexes
CREATE INDEX IF NOT EXISTS idx_transactions_spending_category
ON transactions(spending_category_id);

-- Partial index for uncategorized transactions (common query)
CREATE INDEX IF NOT EXISTS idx_transactions_uncategorized
ON transactions(bank_account_id, date DESC)
WHERE spending_category_id IS NULL;

-- User categorization tracking
CREATE INDEX IF NOT EXISTS idx_transactions_user_categorized
ON transactions(user_categorized, date DESC);

-- Audit log performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_family_created_desc
ON audit_logs(family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
ON audit_logs(entity_type, entity_id);

-- =====================================================
-- PHASE 3: SOFT DELETE OPTIMIZATION
-- =====================================================

-- Partial indexes for active records (exclude soft deletes)
CREATE INDEX IF NOT EXISTS idx_family_members_active
ON family_members(family_id, role)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_active
ON bank_accounts(family_id, sync_status)
WHERE deleted_at IS NULL;

-- =====================================================
-- PHASE 4: SPECIALIZED QUERY OPTIMIZATION
-- =====================================================

-- Pending transactions (real-time updates from Plaid)
CREATE INDEX IF NOT EXISTS idx_transactions_pending
ON transactions(bank_account_id, pending, date DESC)
WHERE pending = true;

-- Overdue payments (dashboard alerts)
CREATE INDEX IF NOT EXISTS idx_payments_overdue
ON payments(family_id, due_date, status)
WHERE status = 'overdue';

-- MFA enabled users (security queries)
CREATE INDEX IF NOT EXISTS idx_family_members_mfa_enabled
ON family_members(family_id, mfa_enabled)
WHERE mfa_enabled = true;

-- Email verification tracking
CREATE INDEX IF NOT EXISTS idx_family_members_email_verified
ON family_members(email_verified, created_at)
WHERE email_verified = false;

-- =====================================================
-- MATERIALIZED VIEWS FOR COMPLEX REPORTS
-- =====================================================

-- Monthly cash flow summary for faster reports
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_cash_flow AS
SELECT
  ie.family_id,
  DATE_TRUNC('month', ie.scheduled_date)::date as month,
  SUM(CASE WHEN ie.status = 'received' THEN ie.actual_amount ELSE ie.amount END) as total_income,
  COUNT(ie.id) as income_count,
  AVG(CASE WHEN ie.status = 'received' THEN ie.actual_amount ELSE ie.amount END) as avg_income
FROM income_events ie
GROUP BY ie.family_id, DATE_TRUNC('month', ie.scheduled_date);

-- Index for materialized view
CREATE INDEX IF NOT EXISTS idx_monthly_cash_flow_family_month
ON monthly_cash_flow(family_id, month DESC);

-- Monthly spending summary by category
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_spending AS
SELECT
  ba.family_id,
  DATE_TRUNC('month', t.date)::date as month,
  sc.id as spending_category_id,
  sc.name as category_name,
  SUM(ABS(t.amount)) as total_spent,
  COUNT(t.id) as transaction_count,
  AVG(ABS(t.amount)) as avg_transaction_amount
FROM transactions t
JOIN bank_accounts ba ON t.bank_account_id = ba.id
LEFT JOIN spending_categories sc ON t.spending_category_id = sc.id
WHERE t.amount < 0  -- Only expenses
GROUP BY ba.family_id, DATE_TRUNC('month', t.date), sc.id, sc.name;

-- Index for materialized view
CREATE INDEX IF NOT EXISTS idx_monthly_spending_family_month
ON monthly_spending(family_id, month DESC);

-- =====================================================
-- PERFORMANCE MONITORING SETUP
-- =====================================================

-- Enable pg_stat_statements for query performance monitoring
-- (This should be done at the PostgreSQL configuration level)

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_cash_flow;
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_spending;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INDEX STATISTICS AND MONITORING
-- =====================================================

-- View for monitoring index usage
CREATE VIEW IF NOT EXISTS index_usage_stats AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW_USAGE'
    WHEN idx_scan < 1000 THEN 'MODERATE_USAGE'
    ELSE 'HIGH_USAGE'
  END as usage_category
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View for monitoring table scan patterns
CREATE VIEW IF NOT EXISTS table_scan_stats AS
SELECT
  schemaname,
  tablename,
  seq_scan as sequential_scans,
  seq_tup_read as sequential_tuples_read,
  idx_scan as index_scans,
  idx_tup_fetch as index_tuples_fetched,
  CASE
    WHEN idx_scan = 0 THEN 'NO_INDEX_USAGE'
    WHEN seq_scan > idx_scan THEN 'HIGH_SEQUENTIAL_SCANS'
    ELSE 'GOOD_INDEX_USAGE'
  END as scan_pattern
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- =====================================================
-- MIGRATION VALIDATION
-- =====================================================

-- Verify all critical indexes exist
DO $$
BEGIN
  -- Check if critical indexes were created
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_payments_family_status') THEN
    RAISE EXCEPTION 'Critical index idx_payments_family_status was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_income_events_scheduled_date') THEN
    RAISE EXCEPTION 'Critical index idx_income_events_scheduled_date was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sessions_token_expires') THEN
    RAISE EXCEPTION 'Critical index idx_sessions_token_expires was not created';
  END IF;

  RAISE NOTICE 'Database optimization migration completed successfully';
  RAISE NOTICE 'Critical performance indexes created and validated';
END $$;