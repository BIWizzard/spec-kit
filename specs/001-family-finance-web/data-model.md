# Data Model: Family Finance Web Application

## Entity Relationship Diagram
```
Family (1) ←→ (M) FamilyMember
Family (1) ←→ (M) BankAccount
Family (1) ←→ (M) IncomeEvent
Family (1) ←→ (M) Payment
Family (1) ←→ (M) BudgetCategory
Family (1) ←→ (M) SpendingCategory

FamilyMember (1) ←→ (M) Session
FamilyMember (1) ←→ (M) AuditLog

BankAccount (1) ←→ (M) Transaction
IncomeEvent (1) ←→ (M) PaymentAttribution
Payment (1) ←→ (M) PaymentAttribution

BudgetCategory (1) ←→ (M) BudgetAllocation
IncomeEvent (1) ←→ (M) BudgetAllocation

Transaction (M) ←→ (1) SpendingCategory
Payment (M) ←→ (1) SpendingCategory
```

## Core Entities

### Family
```typescript
{
  id: UUID (PK)
  name: string
  createdAt: DateTime
  updatedAt: DateTime
  settings: {
    timezone: string
    currency: string (ISO 4217)
    fiscalYearStart: number (1-12)
  }
  subscriptionStatus: enum (trial|active|suspended|cancelled)
  dataRetentionConsent: boolean
}
```

### FamilyMember
```typescript
{
  id: UUID (PK)
  familyId: UUID (FK → Family)
  email: string (unique)
  passwordHash: string
  firstName: string
  lastName: string
  role: enum (admin|editor|viewer)
  permissions: {
    canManageBankAccounts: boolean
    canEditPayments: boolean
    canViewReports: boolean
    canManageFamily: boolean
  }
  mfaEnabled: boolean
  mfaSecret: string (encrypted)
  emailVerified: boolean
  createdAt: DateTime
  updatedAt: DateTime
  lastLoginAt: DateTime
  deletedAt: DateTime (soft delete)
}
```

### BankAccount
```typescript
{
  id: UUID (PK)
  familyId: UUID (FK → Family)
  plaidAccountId: string (unique)
  plaidItemId: string
  institutionName: string
  accountName: string
  accountType: enum (checking|savings|credit|loan)
  accountNumber: string (last 4 digits only)
  currentBalance: Decimal
  availableBalance: Decimal
  lastSyncAt: DateTime
  syncStatus: enum (active|error|disconnected)
  createdAt: DateTime
  updatedAt: DateTime
  deletedAt: DateTime (soft delete)
}
```

### IncomeEvent
```typescript
{
  id: UUID (PK)
  familyId: UUID (FK → Family)
  name: string
  amount: Decimal
  scheduledDate: Date
  actualDate: Date (nullable)
  actualAmount: Decimal (nullable)
  frequency: enum (once|weekly|biweekly|monthly|quarterly|annual)
  nextOccurrence: Date (calculated)
  allocatedAmount: Decimal (sum of attributions)
  remainingAmount: Decimal (amount - allocatedAmount)
  status: enum (scheduled|received|cancelled)
  source: string (optional)
  notes: text
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Payment
```typescript
{
  id: UUID (PK)
  familyId: UUID (FK → Family)
  payee: string
  amount: Decimal
  dueDate: Date
  paidDate: Date (nullable)
  paidAmount: Decimal (nullable)
  paymentType: enum (once|recurring|variable)
  frequency: enum (once|weekly|biweekly|monthly|quarterly|annual)
  nextDueDate: Date (calculated)
  status: enum (scheduled|paid|overdue|cancelled|partial)
  spendingCategoryId: UUID (FK → SpendingCategory)
  autoPayEnabled: boolean
  notes: text
  createdAt: DateTime
  updatedAt: DateTime
}
```

### PaymentAttribution
```typescript
{
  id: UUID (PK)
  paymentId: UUID (FK → Payment)
  incomeEventId: UUID (FK → IncomeEvent)
  amount: Decimal
  attributionType: enum (manual|automatic)
  createdAt: DateTime
  createdBy: UUID (FK → FamilyMember)
}
```

### BudgetCategory
```typescript
{
  id: UUID (PK)
  familyId: UUID (FK → Family)
  name: string (e.g., "Needs", "Wants", "Savings")
  targetPercentage: Decimal (0-100)
  color: string (hex color for UI)
  sortOrder: number
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

### BudgetAllocation
```typescript
{
  id: UUID (PK)
  incomeEventId: UUID (FK → IncomeEvent)
  budgetCategoryId: UUID (FK → BudgetCategory)
  amount: Decimal
  percentage: Decimal
  createdAt: DateTime
}
```

### SpendingCategory
```typescript
{
  id: UUID (PK)
  familyId: UUID (FK → Family)
  name: string
  parentCategoryId: UUID (FK → SpendingCategory, nullable)
  budgetCategoryId: UUID (FK → BudgetCategory)
  icon: string
  color: string (hex)
  monthlyTarget: Decimal (optional)
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Transaction
```typescript
{
  id: UUID (PK)
  bankAccountId: UUID (FK → BankAccount)
  plaidTransactionId: string (unique)
  amount: Decimal
  date: Date
  description: string
  merchantName: string (nullable)
  pending: boolean
  spendingCategoryId: UUID (FK → SpendingCategory, nullable)
  categoryConfidence: Decimal (0-1)
  userCategorized: boolean
  notes: text
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Session
```typescript
{
  id: UUID (PK)
  familyMemberId: UUID (FK → FamilyMember)
  token: string (unique)
  ipAddress: string
  userAgent: string
  expiresAt: DateTime
  createdAt: DateTime
}
```

### AuditLog
```typescript
{
  id: UUID (PK)
  familyId: UUID (FK → Family)
  familyMemberId: UUID (FK → FamilyMember)
  action: enum (create|update|delete|login|logout|sync)
  entityType: string
  entityId: UUID
  oldValues: JSONB
  newValues: JSONB
  ipAddress: string
  createdAt: DateTime
}
```

## Indexes

### Performance Indexes
```sql
-- Family lookups
CREATE INDEX idx_family_member_family ON FamilyMember(familyId);
CREATE INDEX idx_family_member_email ON FamilyMember(email);

-- Date-based queries
CREATE INDEX idx_income_event_date ON IncomeEvent(scheduledDate);
CREATE INDEX idx_payment_due_date ON Payment(dueDate);
CREATE INDEX idx_transaction_date ON Transaction(date);

-- Status filters
CREATE INDEX idx_payment_status ON Payment(status);
CREATE INDEX idx_income_event_status ON IncomeEvent(status);

-- Attribution lookups
CREATE INDEX idx_payment_attribution_payment ON PaymentAttribution(paymentId);
CREATE INDEX idx_payment_attribution_income ON PaymentAttribution(incomeEventId);

-- Bank sync queries
CREATE INDEX idx_bank_account_family ON BankAccount(familyId);
CREATE INDEX idx_transaction_account ON Transaction(bankAccountId);

-- Category relationships
CREATE INDEX idx_transaction_category ON Transaction(spendingCategoryId);
CREATE INDEX idx_payment_category ON Payment(spendingCategoryId);
```

## Validation Rules

### Business Rules
1. **Payment Attribution**: Sum of attributions cannot exceed payment amount
2. **Budget Allocation**: Sum of budget percentages must equal 100%
3. **Income Allocation**: Sum of payment attributions cannot exceed income amount
4. **Soft Deletes**: Financial records are never hard deleted (audit trail)
5. **Currency Consistency**: All amounts within a family use same currency
6. **Date Validation**: Actual dates cannot be in the future
7. **Balance Constraints**: Remaining amount = Income amount - Sum(attributions)

### Security Constraints
1. **Email Uniqueness**: Email must be unique across all users
2. **Password Requirements**: Minimum 12 characters, complexity rules
3. **MFA Enforcement**: Required for admin role users
4. **Session Expiry**: Sessions expire after 24 hours of inactivity
5. **Audit Logging**: All data modifications logged with user/timestamp

## State Transitions

### IncomeEvent States
```
scheduled → received (when actualDate set)
scheduled → cancelled (user action)
```

### Payment States
```
scheduled → paid (when paidDate set)
scheduled → overdue (when dueDate < today and not paid)
scheduled → partial (when paidAmount < amount)
scheduled → cancelled (user action)
paid → scheduled (if payment reversed)
```

### BankAccount States
```
active → error (sync failure)
error → active (successful resync)
active → disconnected (user action or token expired)
disconnected → active (reconnection)
```

## Data Migration Considerations

### From External Sources
1. **Plaid Import**: Map Plaid categories to SpendingCategory
2. **CSV Import**: Standard format for manual transaction import
3. **Quicken/Mint Migration**: Import mappings for common formats

### Data Retention
1. **Transactions**: Never deleted (unlimited retention per requirements)
2. **Audit Logs**: Retained for 7 years
3. **Deleted Users**: Anonymized after 30 days
4. **Sessions**: Purged after expiry + 7 days

## Performance Optimizations

### Denormalized Fields
1. **IncomeEvent.remainingAmount**: Cached calculation
2. **Payment.nextDueDate**: Cached for recurring payments
3. **Family.subscriptionStatus**: Cached for quick auth checks

### Materialized Views
```sql
-- Monthly spending by category
CREATE MATERIALIZED VIEW monthly_spending AS
SELECT
  familyId,
  DATE_TRUNC('month', date) as month,
  spendingCategoryId,
  SUM(amount) as total
FROM Transaction
GROUP BY familyId, month, spendingCategoryId;

-- Income vs Expense summary
CREATE MATERIALIZED VIEW cash_flow_summary AS
SELECT
  familyId,
  DATE_TRUNC('month', scheduledDate) as month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
FROM (
  SELECT familyId, scheduledDate, amount, 'income' as type FROM IncomeEvent
  UNION ALL
  SELECT familyId, dueDate, amount, 'expense' as type FROM Payment
) combined
GROUP BY familyId, month;
```