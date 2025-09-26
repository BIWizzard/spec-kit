-- Family Finance Web Application - Performance Optimization
-- Migration 02: Add performance improvements and materialized views

-- Create materialized view for monthly spending by category
CREATE MATERIALIZED VIEW "monthly_spending_by_category" AS
SELECT
    t."bankAccountId",
    ba."familyId",
    DATE_TRUNC('month', t."date") as "month",
    t."spendingCategoryId",
    sc."name" as "categoryName",
    sc."budgetCategoryId",
    bc."name" as "budgetCategoryName",
    COUNT(*) as "transactionCount",
    SUM(ABS(t."amount")) as "totalAmount",
    AVG(ABS(t."amount")) as "averageAmount",
    MIN(ABS(t."amount")) as "minAmount",
    MAX(ABS(t."amount")) as "maxAmount"
FROM "Transaction" t
JOIN "BankAccount" ba ON t."bankAccountId" = ba."id"
LEFT JOIN "SpendingCategory" sc ON t."spendingCategoryId" = sc."id"
LEFT JOIN "BudgetCategory" bc ON sc."budgetCategoryId" = bc."id"
WHERE t."amount" < 0 -- Only expenses (negative amounts)
GROUP BY
    t."bankAccountId",
    ba."familyId",
    DATE_TRUNC('month', t."date"),
    t."spendingCategoryId",
    sc."name",
    sc."budgetCategoryId",
    bc."name";

-- Create unique index on materialized view
CREATE UNIQUE INDEX "monthly_spending_by_category_unique_idx" ON "monthly_spending_by_category"
("bankAccountId", "familyId", "month", COALESCE("spendingCategoryId", '00000000-0000-0000-0000-000000000000'));

-- Create materialized view for cash flow summary
CREATE MATERIALIZED VIEW "cash_flow_summary" AS
SELECT
    family_id,
    month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as "totalIncome",
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as "totalExpenses",
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as "netCashFlow",
    COUNT(CASE WHEN type = 'income' THEN 1 END) as "incomeCount",
    COUNT(CASE WHEN type = 'expense' THEN 1 END) as "expenseCount"
FROM (
    -- Income events
    SELECT
        ie."familyId" as family_id,
        DATE_TRUNC('month', COALESCE(ie."actualDate", ie."scheduledDate")) as month,
        ie."amount",
        'income' as type
    FROM "IncomeEvent" ie
    WHERE ie."status" != 'cancelled'

    UNION ALL

    -- Payments
    SELECT
        p."familyId" as family_id,
        DATE_TRUNC('month', COALESCE(p."paidDate", p."dueDate")) as month,
        p."amount",
        'expense' as type
    FROM "Payment" p
    WHERE p."status" != 'cancelled'

    UNION ALL

    -- Bank transactions (expenses only)
    SELECT
        ba."familyId" as family_id,
        DATE_TRUNC('month', t."date") as month,
        ABS(t."amount") as amount,
        'expense' as type
    FROM "Transaction" t
    JOIN "BankAccount" ba ON t."bankAccountId" = ba."id"
    WHERE t."amount" < 0
) combined
GROUP BY family_id, month;

-- Create unique index on cash flow summary
CREATE UNIQUE INDEX "cash_flow_summary_unique_idx" ON "cash_flow_summary" ("family_id", "month");

-- Create materialized view for budget performance
CREATE MATERIALIZED VIEW "budget_performance" AS
SELECT
    bc."familyId",
    bc."id" as "budgetCategoryId",
    bc."name" as "categoryName",
    bc."targetPercentage",
    DATE_TRUNC('month', t."date") as "month",

    -- Calculate total family income for the month
    (
        SELECT COALESCE(SUM(ie."amount"), 0)
        FROM "IncomeEvent" ie
        WHERE ie."familyId" = bc."familyId"
        AND DATE_TRUNC('month', COALESCE(ie."actualDate", ie."scheduledDate")) = DATE_TRUNC('month', t."date")
        AND ie."status" = 'received'
    ) as "monthlyIncome",

    -- Calculate target amount based on percentage
    (bc."targetPercentage" / 100.0) * (
        SELECT COALESCE(SUM(ie."amount"), 0)
        FROM "IncomeEvent" ie
        WHERE ie."familyId" = bc."familyId"
        AND DATE_TRUNC('month', COALESCE(ie."actualDate", ie."scheduledDate")) = DATE_TRUNC('month', t."date")
        AND ie."status" = 'received'
    ) as "targetAmount",

    -- Calculate actual spending
    COALESCE(SUM(ABS(t."amount")), 0) as "actualAmount",

    -- Calculate variance
    COALESCE(SUM(ABS(t."amount")), 0) - (
        (bc."targetPercentage" / 100.0) * (
            SELECT COALESCE(SUM(ie."amount"), 0)
            FROM "IncomeEvent" ie
            WHERE ie."familyId" = bc."familyId"
            AND DATE_TRUNC('month', COALESCE(ie."actualDate", ie."scheduledDate")) = DATE_TRUNC('month', t."date")
            AND ie."status" = 'received'
        )
    ) as "variance",

    COUNT(t."id") as "transactionCount"

FROM "BudgetCategory" bc
LEFT JOIN "SpendingCategory" sc ON sc."budgetCategoryId" = bc."id"
LEFT JOIN "Transaction" t ON t."spendingCategoryId" = sc."id" AND t."amount" < 0
WHERE bc."isActive" = true
GROUP BY
    bc."familyId",
    bc."id",
    bc."name",
    bc."targetPercentage",
    DATE_TRUNC('month', t."date");

-- Create unique index on budget performance
CREATE UNIQUE INDEX "budget_performance_unique_idx" ON "budget_performance"
("familyId", "budgetCategoryId", "month");

-- Create function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY "monthly_spending_by_category";
    REFRESH MATERIALIZED VIEW CONCURRENTLY "cash_flow_summary";
    REFRESH MATERIALIZED VIEW CONCURRENTLY "budget_performance";

    -- Log the refresh
    INSERT INTO "AuditLog" ("familyId", "familyMemberId", "action", "entityType", "entityId", "newValues")
    VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid, -- System user
        '00000000-0000-0000-0000-000000000000'::uuid, -- System user
        'update',
        'materialized_views',
        '00000000-0000-0000-0000-000000000000'::uuid,
        '{"refreshed_at": "' || NOW() || '"}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- Create additional performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transaction_amount_negative" ON "Transaction"("amount") WHERE "amount" < 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transaction_date_amount" ON "Transaction"("date", "amount");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_income_event_actual_date" ON "IncomeEvent"("actualDate") WHERE "actualDate" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_paid_date" ON "Payment"("paidDate") WHERE "paidDate" IS NOT NULL;

-- Create partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_family_member_active" ON "FamilyMember"("familyId", "role") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bank_account_active" ON "BankAccount"("familyId", "syncStatus") WHERE "deletedAt" IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_session_active" ON "Session"("familyMemberId", "expiresAt") WHERE "expiresAt" > NOW();

-- Create composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_transaction_family_date" ON "Transaction" USING btree ("bankAccountId", "date" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payment_family_status_due" ON "Payment"("familyId", "status", "dueDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_income_family_status_date" ON "IncomeEvent"("familyId", "status", "scheduledDate");

-- Create GIN indexes for JSONB columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_family_settings_gin" ON "Family" USING gin("settings");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_family_member_permissions_gin" ON "FamilyMember" USING gin("permissions");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_log_old_values_gin" ON "AuditLog" USING gin("oldValues");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_audit_log_new_values_gin" ON "AuditLog" USING gin("newValues");

-- Add constraints for data integrity
ALTER TABLE "PaymentAttribution" ADD CONSTRAINT "check_attribution_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "check_budget_allocation_positive" CHECK ("amount" > 0 AND "percentage" >= 0 AND "percentage" <= 100);
ALTER TABLE "IncomeEvent" ADD CONSTRAINT "check_income_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "check_payment_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "check_budget_percentage_valid" CHECK ("targetPercentage" >= 0 AND "targetPercentage" <= 100);

-- Add check constraint to ensure remaining amount is calculated correctly
ALTER TABLE "IncomeEvent" ADD CONSTRAINT "check_remaining_amount_valid"
CHECK ("remainingAmount" = "amount" - COALESCE("allocatedAmount", 0));

-- Create function to automatically update allocated amounts
CREATE OR REPLACE FUNCTION update_income_allocated_amount()
RETURNS TRIGGER AS $$
DECLARE
    total_attributed DECIMAL(12,2);
BEGIN
    -- Calculate total attributed amount for this income event
    SELECT COALESCE(SUM("amount"), 0) INTO total_attributed
    FROM "PaymentAttribution"
    WHERE "incomeEventId" = COALESCE(NEW."incomeEventId", OLD."incomeEventId");

    -- Update the income event allocated amount
    UPDATE "IncomeEvent"
    SET "allocatedAmount" = total_attributed
    WHERE "id" = COALESCE(NEW."incomeEventId", OLD."incomeEventId");

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain data consistency
CREATE TRIGGER update_allocated_amount_on_attribution_insert
    AFTER INSERT ON "PaymentAttribution"
    FOR EACH ROW
    EXECUTE FUNCTION update_income_allocated_amount();

CREATE TRIGGER update_allocated_amount_on_attribution_update
    AFTER UPDATE ON "PaymentAttribution"
    FOR EACH ROW
    EXECUTE FUNCTION update_income_allocated_amount();

CREATE TRIGGER update_allocated_amount_on_attribution_delete
    AFTER DELETE ON "PaymentAttribution"
    FOR EACH ROW
    EXECUTE FUNCTION update_income_allocated_amount();

-- Create function for session cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "Session" WHERE "expiresAt" < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Set up row level security (RLS) policies
ALTER TABLE "Family" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FamilyMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BankAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IncomeEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SpendingCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAttribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;