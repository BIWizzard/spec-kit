-- Family Finance Web Application - Initial Database Setup
-- Migration 01: Create core tables and relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums
CREATE TYPE "Role" AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE "AccountType" AS ENUM ('checking', 'savings', 'credit', 'loan');
CREATE TYPE "Frequency" AS ENUM ('once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annual');
CREATE TYPE "IncomeStatus" AS ENUM ('scheduled', 'received', 'cancelled');
CREATE TYPE "PaymentStatus" AS ENUM ('scheduled', 'paid', 'overdue', 'cancelled', 'partial');
CREATE TYPE "PaymentType" AS ENUM ('once', 'recurring', 'variable');
CREATE TYPE "AttributionType" AS ENUM ('manual', 'automatic');
CREATE TYPE "SyncStatus" AS ENUM ('active', 'error', 'disconnected');
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'sync');
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'suspended', 'cancelled');

-- Family table
CREATE TABLE "Family" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "dataRetentionConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- FamilyMember table
CREATE TABLE "FamilyMember" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "familyId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- BankAccount table
CREATE TABLE "BankAccount" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "familyId" UUID NOT NULL,
    "plaidAccountId" VARCHAR(255) UNIQUE,
    "plaidItemId" VARCHAR(255),
    "institutionName" VARCHAR(255) NOT NULL,
    "accountName" VARCHAR(255) NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "accountNumber" VARCHAR(4),
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "availableBalance" DECIMAL(12,2),
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- IncomeEvent table
CREATE TABLE "IncomeEvent" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "familyId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "actualDate" DATE,
    "actualAmount" DECIMAL(12,2),
    "frequency" "Frequency" NOT NULL DEFAULT 'once',
    "nextOccurrence" DATE,
    "allocatedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "remainingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "IncomeStatus" NOT NULL DEFAULT 'scheduled',
    "source" VARCHAR(255),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomeEvent_pkey" PRIMARY KEY ("id")
);

-- SpendingCategory table
CREATE TABLE "SpendingCategory" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "familyId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "parentCategoryId" UUID,
    "budgetCategoryId" UUID,
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "monthlyTarget" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpendingCategory_pkey" PRIMARY KEY ("id")
);

-- BudgetCategory table
CREATE TABLE "BudgetCategory" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "familyId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "targetPercentage" DECIMAL(5,2) NOT NULL,
    "color" VARCHAR(7),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- Payment table
CREATE TABLE "Payment" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "familyId" UUID NOT NULL,
    "payee" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidDate" DATE,
    "paidAmount" DECIMAL(12,2),
    "paymentType" "PaymentType" NOT NULL DEFAULT 'once',
    "frequency" "Frequency" NOT NULL DEFAULT 'once',
    "nextDueDate" DATE,
    "status" "PaymentStatus" NOT NULL DEFAULT 'scheduled',
    "spendingCategoryId" UUID,
    "autoPayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- PaymentAttribution table
CREATE TABLE "PaymentAttribution" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "paymentId" UUID NOT NULL,
    "incomeEventId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "attributionType" "AttributionType" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "PaymentAttribution_pkey" PRIMARY KEY ("id")
);

-- BudgetAllocation table
CREATE TABLE "BudgetAllocation" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "incomeEventId" UUID NOT NULL,
    "budgetCategoryId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetAllocation_pkey" PRIMARY KEY ("id")
);

-- Transaction table
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "bankAccountId" UUID NOT NULL,
    "plaidTransactionId" VARCHAR(255) UNIQUE,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "merchantName" VARCHAR(255),
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "spendingCategoryId" UUID,
    "categoryConfidence" DECIMAL(3,2) DEFAULT 0.00,
    "userCategorized" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- Session table
CREATE TABLE "Session" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "familyMemberId" UUID NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "ipAddress" INET,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- AuditLog table
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "familyId" UUID NOT NULL,
    "familyMemberId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" INET,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Create foreign key relationships
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IncomeEvent" ADD CONSTRAINT "IncomeEvent_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SpendingCategory" ADD CONSTRAINT "SpendingCategory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpendingCategory" ADD CONSTRAINT "SpendingCategory_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "SpendingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpendingCategory" ADD CONSTRAINT "SpendingCategory_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES "BudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_spendingCategoryId_fkey" FOREIGN KEY ("spendingCategoryId") REFERENCES "SpendingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentAttribution" ADD CONSTRAINT "PaymentAttribution_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAttribution" ADD CONSTRAINT "PaymentAttribution_incomeEventId_fkey" FOREIGN KEY ("incomeEventId") REFERENCES "IncomeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAttribution" ADD CONSTRAINT "PaymentAttribution_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_incomeEventId_fkey" FOREIGN KEY ("incomeEventId") REFERENCES "IncomeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES "BudgetCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_spendingCategoryId_fkey" FOREIGN KEY ("spendingCategoryId") REFERENCES "SpendingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Session" ADD CONSTRAINT "Session_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for performance optimization
CREATE INDEX "idx_family_member_family" ON "FamilyMember"("familyId");
CREATE INDEX "idx_family_member_email" ON "FamilyMember"("email");
CREATE INDEX "idx_family_member_deleted" ON "FamilyMember"("deletedAt");

CREATE INDEX "idx_bank_account_family" ON "BankAccount"("familyId");
CREATE INDEX "idx_bank_account_plaid_account" ON "BankAccount"("plaidAccountId");
CREATE INDEX "idx_bank_account_sync_status" ON "BankAccount"("syncStatus");
CREATE INDEX "idx_bank_account_deleted" ON "BankAccount"("deletedAt");

CREATE INDEX "idx_income_event_family" ON "IncomeEvent"("familyId");
CREATE INDEX "idx_income_event_scheduled_date" ON "IncomeEvent"("scheduledDate");
CREATE INDEX "idx_income_event_status" ON "IncomeEvent"("status");
CREATE INDEX "idx_income_event_next_occurrence" ON "IncomeEvent"("nextOccurrence");

CREATE INDEX "idx_spending_category_family" ON "SpendingCategory"("familyId");
CREATE INDEX "idx_spending_category_parent" ON "SpendingCategory"("parentCategoryId");
CREATE INDEX "idx_spending_category_budget" ON "SpendingCategory"("budgetCategoryId");
CREATE INDEX "idx_spending_category_active" ON "SpendingCategory"("isActive");

CREATE INDEX "idx_budget_category_family" ON "BudgetCategory"("familyId");
CREATE INDEX "idx_budget_category_sort" ON "BudgetCategory"("sortOrder");
CREATE INDEX "idx_budget_category_active" ON "BudgetCategory"("isActive");

CREATE INDEX "idx_payment_family" ON "Payment"("familyId");
CREATE INDEX "idx_payment_due_date" ON "Payment"("dueDate");
CREATE INDEX "idx_payment_next_due_date" ON "Payment"("nextDueDate");
CREATE INDEX "idx_payment_status" ON "Payment"("status");
CREATE INDEX "idx_payment_category" ON "Payment"("spendingCategoryId");

CREATE INDEX "idx_payment_attribution_payment" ON "PaymentAttribution"("paymentId");
CREATE INDEX "idx_payment_attribution_income" ON "PaymentAttribution"("incomeEventId");
CREATE INDEX "idx_payment_attribution_created_by" ON "PaymentAttribution"("createdBy");

CREATE INDEX "idx_budget_allocation_income" ON "BudgetAllocation"("incomeEventId");
CREATE INDEX "idx_budget_allocation_category" ON "BudgetAllocation"("budgetCategoryId");

CREATE INDEX "idx_transaction_bank_account" ON "Transaction"("bankAccountId");
CREATE INDEX "idx_transaction_plaid_id" ON "Transaction"("plaidTransactionId");
CREATE INDEX "idx_transaction_date" ON "Transaction"("date");
CREATE INDEX "idx_transaction_category" ON "Transaction"("spendingCategoryId");
CREATE INDEX "idx_transaction_pending" ON "Transaction"("pending");

CREATE INDEX "idx_session_member" ON "Session"("familyMemberId");
CREATE INDEX "idx_session_token" ON "Session"("token");
CREATE INDEX "idx_session_expires" ON "Session"("expiresAt");

CREATE INDEX "idx_audit_log_family" ON "AuditLog"("familyId");
CREATE INDEX "idx_audit_log_member" ON "AuditLog"("familyMemberId");
CREATE INDEX "idx_audit_log_entity" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "idx_audit_log_created" ON "AuditLog"("createdAt");

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_family BEFORE UPDATE ON "Family" FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_family_member BEFORE UPDATE ON "FamilyMember" FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_bank_account BEFORE UPDATE ON "BankAccount" FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_income_event BEFORE UPDATE ON "IncomeEvent" FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_spending_category BEFORE UPDATE ON "SpendingCategory" FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_budget_category BEFORE UPDATE ON "BudgetCategory" FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_payment BEFORE UPDATE ON "Payment" FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
CREATE TRIGGER set_timestamp_transaction BEFORE UPDATE ON "Transaction" FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- Create remaining amount trigger for income events
CREATE OR REPLACE FUNCTION calculate_remaining_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW."remainingAmount" = NEW."amount" - COALESCE(NEW."allocatedAmount", 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_remaining_amount_trigger BEFORE INSERT OR UPDATE ON "IncomeEvent" FOR EACH ROW EXECUTE PROCEDURE calculate_remaining_amount();