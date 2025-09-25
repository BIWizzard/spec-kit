# Family Finance API Documentation

**Version**: 1.0.0
**Base URL**: https://family-finance.kgiq.com
**Authentication**: Bearer Token (JWT)

## Overview

The Family Finance Web Application API provides comprehensive endpoints for family financial management including user authentication, family management, income tracking, payment management, bank integration, budget allocation, and financial reporting.

## Quick Start

1. **Register**: Create a new account using `/api/auth/register`
2. **Login**: Authenticate using `/api/auth/login` to get access tokens
3. **Use tokens**: Include Bearer token in Authorization header for protected endpoints
4. **Manage finances**: Use endpoints to track income, payments, budgets, and reports

## Authentication

### Bearer Token Authentication
Most endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-access-token>
```

### Token Management
- Access tokens expire in 24 hours
- Use refresh tokens to obtain new access tokens
- Tokens are invalidated on logout

## Rate Limiting

API requests are rate limited to prevent abuse:
- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Bank sync endpoints**: 30 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per time window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when window resets (Unix timestamp)

## Pagination

List endpoints support pagination with query parameters:
- `page`: Page number (default: 1, minimum: 1)
- `pageSize`: Items per page (default: 20, max: 100)

Response format includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user and create a family.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "familyName": "The Doe Family",
  "phone": "+1234567890", // optional
  "timezone": "America/New_York", // optional
  "currency": "USD" // optional
}
```

**Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "familyId": "uuid",
    "role": "admin"
  },
  "family": {
    "id": "uuid",
    "name": "The Doe Family",
    "currency": "USD"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  }
}
```

### POST /api/auth/login
Authenticate user and return access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "familyId": "uuid",
    "role": "admin"
  },
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  }
}
```

### POST /api/auth/logout
Logout user and invalidate tokens.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response (200):**
```json
{
  "accessToken": "new-jwt-token",
  "expiresIn": 86400
}
```

### GET /api/auth/me
Get current authenticated user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "familyId": "uuid",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Multi-Factor Authentication (MFA)

#### POST /api/auth/mfa/setup
Setup MFA for user account.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "secret": "mfa-secret",
  "qrCode": "data:image/png;base64,..."
}
```

#### POST /api/auth/mfa/enable
Enable MFA after setup verification.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "code": "123456"
}
```

#### POST /api/auth/mfa/disable
Disable MFA for user account.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "code": "123456"
}
```

### Password Management

#### POST /api/auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST /api/auth/reset-password
Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "newpassword123"
}
```

#### POST /api/auth/change-password
Change password for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Email Verification

#### POST /api/auth/verify-email
Verify email address using verification token.

**Request Body:**
```json
{
  "token": "verification-token"
}
```

#### POST /api/auth/resend-verification
Resend email verification.

**Headers:** `Authorization: Bearer <token>`

### Session Management

#### GET /api/auth/sessions
Get active sessions for user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

#### DELETE /api/auth/sessions
Delete all user sessions (logout from all devices).

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/auth/sessions/{id}
Delete specific session.

**Headers:** `Authorization: Bearer <token>`

---

## Family Management Endpoints

### GET /api/families
Get family information.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "uuid",
  "name": "The Doe Family",
  "currency": "USD",
  "timezone": "America/New_York",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### PUT /api/families
Update family information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Family Name",
  "currency": "EUR",
  "timezone": "Europe/London"
}
```

### Family Members

#### GET /api/families/members
Get family members.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "members": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "permissions": {
        "canManageBankAccounts": true,
        "canEditPayments": true,
        "canViewReports": true
      }
    }
  ]
}
```

#### POST /api/families/members
Invite family member.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "email": "member@example.com",
  "role": "member",
  "permissions": {
    "canManageBankAccounts": false,
    "canEditPayments": true,
    "canViewReports": true
  }
}
```

#### PUT /api/families/members/{id}
Update family member.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "role": "admin",
  "permissions": {
    "canManageBankAccounts": true,
    "canEditPayments": true,
    "canViewReports": true
  }
}
```

#### DELETE /api/families/members/{id}
Remove family member.

**Headers:** `Authorization: Bearer <token>`

### Family Invitations

#### GET /api/families/invitations
Get pending invitations.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/families/invitations/{id}
Get invitation details.

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/families/invitations/{id}
Cancel invitation.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/families/invitations/{id}/accept
Accept family invitation.

**Request Body:**
```json
{
  "token": "invitation-token"
}
```

#### POST /api/families/invitations/{id}/resend
Resend invitation email.

**Headers:** `Authorization: Bearer <token>`

### GET /api/families/activity
Get family activity log.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number
- `pageSize`: Items per page
- `startDate`: Filter from date (YYYY-MM-DD)
- `endDate`: Filter to date (YYYY-MM-DD)

---

## Income Management Endpoints

### GET /api/income-events
Get income events.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `pageSize`: Pagination
- `status`: Filter by status (scheduled, received, cancelled)
- `startDate`, `endDate`: Date range filter

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Salary",
      "amount": 5000.00,
      "scheduledDate": "2024-01-15",
      "status": "scheduled",
      "frequency": "monthly",
      "allocatedAmount": 4800.00,
      "remainingAmount": 200.00
    }
  ],
  "pagination": {...}
}
```

### POST /api/income-events
Create income event.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Salary",
  "amount": 5000.00,
  "scheduledDate": "2024-01-15",
  "frequency": "monthly",
  "source": "Primary Job",
  "notes": "Monthly salary payment"
}
```

### GET /api/income-events/{id}
Get income event details.

**Headers:** `Authorization: Bearer <token>`

### PUT /api/income-events/{id}
Update income event.

**Headers:** `Authorization: Bearer <token>`

### DELETE /api/income-events/{id}
Delete income event.

**Headers:** `Authorization: Bearer <token>`

### POST /api/income-events/{id}/mark-received
Mark income as received.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "actualAmount": 4950.00,
  "actualDate": "2024-01-15"
}
```

### POST /api/income-events/{id}/revert-received
Revert received status.

**Headers:** `Authorization: Bearer <token>`

### GET /api/income-events/{id}/attributions
Get income attributions (payments allocated to this income).

**Headers:** `Authorization: Bearer <token>`

### GET /api/income-events/upcoming
Get upcoming income events.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `days`: Look ahead days (default: 30)

### GET /api/income-events/summary
Get income summary statistics.

**Headers:** `Authorization: Bearer <token>`

### POST /api/income-events/bulk
Create multiple income events.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "incomeEvents": [
    {
      "name": "Salary",
      "amount": 5000.00,
      "scheduledDate": "2024-01-15",
      "frequency": "monthly"
    }
  ]
}
```

---

## Payment Management Endpoints

### GET /api/payments
Get payments.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `pageSize`: Pagination
- `status`: Filter by status
- `category`: Filter by spending category
- `startDate`, `endDate`: Date range filter

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "payee": "Electric Company",
      "amount": 150.00,
      "dueDate": "2024-01-20",
      "status": "scheduled",
      "paymentType": "recurring",
      "frequency": "monthly"
    }
  ],
  "pagination": {...}
}
```

### POST /api/payments
Create payment.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "payee": "Electric Company",
  "amount": 150.00,
  "dueDate": "2024-01-20",
  "paymentType": "recurring",
  "frequency": "monthly",
  "spendingCategoryId": "uuid",
  "autoPayEnabled": false,
  "notes": "Monthly electric bill"
}
```

### GET /api/payments/{id}
Get payment details.

**Headers:** `Authorization: Bearer <token>`

### PUT /api/payments/{id}
Update payment.

**Headers:** `Authorization: Bearer <token>`

### DELETE /api/payments/{id}
Delete payment.

**Headers:** `Authorization: Bearer <token>`

### POST /api/payments/{id}/mark-paid
Mark payment as paid.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "paidAmount": 150.00,
  "paidDate": "2024-01-20"
}
```

### POST /api/payments/{id}/revert-paid
Revert paid status.

**Headers:** `Authorization: Bearer <token>`

### POST /api/payments/{id}/auto-attribute
Automatically attribute payment to income events.

**Headers:** `Authorization: Bearer <token>`

### GET /api/payments/upcoming
Get upcoming payments.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `days`: Look ahead days (default: 30)

### GET /api/payments/overdue
Get overdue payments.

**Headers:** `Authorization: Bearer <token>`

### GET /api/payments/summary
Get payment summary statistics.

**Headers:** `Authorization: Bearer <token>`

### POST /api/payments/bulk
Create multiple payments.

**Headers:** `Authorization: Bearer <token>`

### Payment Attribution

#### GET /api/payments/{id}/attributions
Get payment attributions.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/payments/{id}/attributions
Create payment attribution.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "incomeEventId": "uuid",
  "amount": 150.00
}
```

#### PUT /api/payments/{id}/attributions/{attributionId}
Update payment attribution.

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/payments/{id}/attributions/{attributionId}
Delete payment attribution.

**Headers:** `Authorization: Bearer <token>`

### Spending Categories

#### GET /api/spending-categories
Get spending categories.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/spending-categories
Create spending category.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Utilities",
  "budgetCategoryId": "uuid",
  "icon": "electric-bolt",
  "color": "#FFD166",
  "monthlyTarget": 300.00
}
```

#### PUT /api/spending-categories/{id}
Update spending category.

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/spending-categories/{id}
Delete spending category.

**Headers:** `Authorization: Bearer <token>`

---

## Bank Integration Endpoints

### Bank Accounts

#### GET /api/bank-accounts
Get bank accounts.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "institutionName": "Chase Bank",
      "accountName": "Checking",
      "accountType": "checking",
      "accountNumber": "****1234",
      "balance": 2500.00,
      "availableBalance": 2400.00,
      "isActive": true,
      "lastSyncAt": "2024-01-20T10:00:00Z"
    }
  ]
}
```

#### POST /api/bank-accounts
Connect new bank account via Plaid.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "publicToken": "plaid-public-token",
  "accountId": "plaid-account-id"
}
```

#### GET /api/bank-accounts/{id}
Get bank account details.

**Headers:** `Authorization: Bearer <token>`

#### PUT /api/bank-accounts/{id}
Update bank account.

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/bank-accounts/{id}
Disconnect bank account.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/bank-accounts/{id}/sync
Sync bank account transactions.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/bank-accounts/{id}/reconnect
Reconnect bank account.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/bank-accounts/sync-all
Sync all bank accounts.

**Headers:** `Authorization: Bearer <token>`

### Transactions

#### GET /api/transactions
Get transactions.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page`, `pageSize`: Pagination
- `bankAccountId`: Filter by bank account
- `categoryId`: Filter by spending category
- `startDate`, `endDate`: Date range filter
- `uncategorized`: Show only uncategorized (true/false)

#### GET /api/transactions/{id}
Get transaction details.

**Headers:** `Authorization: Bearer <token>`

#### PUT /api/transactions/{id}
Update transaction (categorization).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "spendingCategoryId": "uuid",
  "notes": "Grocery shopping"
}
```

#### POST /api/transactions/categorize-batch
Categorize multiple transactions.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "spendingCategoryId": "uuid"
    }
  ]
}
```

#### GET /api/transactions/uncategorized
Get uncategorized transactions.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/transactions/match-payments
Match transactions to payments.

**Headers:** `Authorization: Bearer <token>`

### Plaid Integration

#### POST /api/plaid/link-token
Get Plaid Link token for connecting accounts.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "linkToken": "link-token-uuid"
}
```

#### POST /api/plaid/webhook
Plaid webhook endpoint (internal use).

---

## Budget Management Endpoints

### Budget Categories

#### GET /api/budget-categories
Get budget categories.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Needs",
      "targetPercentage": 50.0,
      "color": "#8FAD77",
      "isActive": true
    }
  ]
}
```

#### POST /api/budget-categories
Create budget category.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Wants",
  "targetPercentage": 30.0,
  "color": "#FFD166"
}
```

#### GET /api/budget-categories/{id}
Get budget category details.

**Headers:** `Authorization: Bearer <token>`

#### PUT /api/budget-categories/{id}
Update budget category.

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/budget-categories/{id}
Delete budget category.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/budget-categories/validate-percentages
Validate budget percentages sum to 100%.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "categories": [
    {"id": "uuid", "targetPercentage": 50.0},
    {"id": "uuid", "targetPercentage": 30.0},
    {"id": "uuid", "targetPercentage": 20.0}
  ]
}
```

### Budget Allocations

#### GET /api/budget-allocations
Get budget allocations.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `incomeEventId`: Filter by income event

#### GET /api/budget-allocations/{id}
Get budget allocation details.

**Headers:** `Authorization: Bearer <token>`

#### PUT /api/budget-allocations/{id}
Update budget allocation.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/budget-allocations/{incomeEventId}/generate
Generate budget allocations for income event.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/budget-allocations/{incomeEventId}/summary
Get allocation summary for income event.

**Headers:** `Authorization: Bearer <token>`

### Budget Analysis

#### GET /api/budget/overview
Get budget overview.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/budget/performance
Get budget performance analysis.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/budget/projections
Get budget projections.

**Headers:** `Authorization: Bearer <token>`

### Budget Templates

#### GET /api/budget/templates
Get budget templates.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/budget/templates
Apply budget template.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "templateId": "50-30-20"
}
```

---

## Reports & Analytics Endpoints

### Financial Reports

#### GET /api/reports/cash-flow
Get cash flow report.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate`, `endDate`: Date range
- `granularity`: daily, weekly, monthly

#### GET /api/reports/spending-analysis
Get spending analysis report.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/reports/budget-performance
Get budget performance report.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/reports/income-analysis
Get income analysis report.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/reports/net-worth
Get net worth report.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/reports/savings-rate
Get savings rate report.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/reports/debt-analysis
Get debt analysis report.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/reports/monthly-summary
Get monthly summary report.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/reports/annual-summary
Get annual summary report.

**Headers:** `Authorization: Bearer <token>`

### Custom Reports

#### POST /api/reports/custom
Generate custom report.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Custom Report",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "metrics": ["income", "expenses", "savings"],
  "groupBy": "month",
  "categories": ["uuid1", "uuid2"]
}
```

#### POST /api/reports/export
Export report data.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "reportType": "cash-flow",
  "format": "pdf",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

### Scheduled Reports

#### GET /api/reports/scheduled
Get scheduled reports.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/reports/scheduled
Create scheduled report.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Monthly Cash Flow",
  "reportType": "cash-flow",
  "frequency": "monthly",
  "recipients": ["user@example.com"],
  "format": "pdf"
}
```

#### GET /api/reports/scheduled/{id}
Get scheduled report details.

**Headers:** `Authorization: Bearer <token>`

#### PUT /api/reports/scheduled/{id}
Update scheduled report.

**Headers:** `Authorization: Bearer <token>`

#### DELETE /api/reports/scheduled/{id}
Delete scheduled report.

**Headers:** `Authorization: Bearer <token>`

### Analytics

#### GET /api/analytics/dashboard
Get dashboard analytics.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/analytics/trends
Get financial trends analysis.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/analytics/insights
Get financial insights.

**Headers:** `Authorization: Bearer <token>`

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "statusCode": 400,
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "message": "Authentication required",
  "error": "UNAUTHORIZED",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "message": "Insufficient permissions",
  "error": "FORBIDDEN",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "message": "Resource not found",
  "error": "NOT_FOUND",
  "statusCode": 404
}
```

### 429 Too Many Requests
```json
{
  "message": "Rate limit exceeded",
  "error": "RATE_LIMIT_EXCEEDED",
  "statusCode": 429,
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "error": "INTERNAL_ERROR",
  "statusCode": 500,
  "requestId": "uuid"
}
```

---

## Data Models

### Common Field Types
- **UUID**: Unique identifier (string)
- **DateTime**: ISO 8601 format (2024-01-01T00:00:00Z)
- **Date**: YYYY-MM-DD format
- **Decimal**: Monetary amounts (up to 2 decimal places)
- **Email**: Valid email address format

### Enums

#### User Roles
- `admin`: Full access to all features
- `member`: Limited access based on permissions

#### Payment Status
- `scheduled`: Payment is scheduled
- `paid`: Payment has been completed
- `overdue`: Payment is past due
- `cancelled`: Payment has been cancelled
- `partial`: Payment partially completed

#### Income Status
- `scheduled`: Income is expected
- `received`: Income has been received
- `cancelled`: Income event cancelled

#### Account Types
- `checking`: Checking account
- `savings`: Savings account
- `credit`: Credit card account
- `loan`: Loan account

#### Frequency Types
- `once`: One-time occurrence
- `weekly`: Every week
- `biweekly`: Every two weeks
- `monthly`: Every month
- `quarterly`: Every three months
- `annual`: Once per year

---

## Webhooks

The API supports webhooks for real-time notifications:

### Supported Events
- `payment.due`: Payment is due within 3 days
- `payment.overdue`: Payment is overdue
- `income.received`: Income has been received
- `bank.sync.completed`: Bank account sync completed
- `bank.sync.error`: Bank account sync failed

### Webhook Format
```json
{
  "event": "payment.due",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "paymentId": "uuid",
    "payee": "Electric Company",
    "amount": 150.00,
    "dueDate": "2024-01-20"
  }
}
```

---

## SDKs and Tools

### Interactive API Documentation
- **Swagger UI**: Available at `/api/docs`
- **OpenAPI Spec**: Available at `/api/openapi.yaml`

### Postman Collection
Import the API collection for testing:
```
GET /api/postman-collection.json
```

### Rate Limiting Best Practices
1. Implement exponential backoff for retries
2. Cache responses when appropriate
3. Use bulk endpoints for multiple operations
4. Monitor rate limit headers
5. Implement request queuing for high-volume operations

---

## Support

- **Documentation**: https://docs.family-finance.kgiq.com
- **API Status**: https://status.family-finance.kgiq.com
- **Support Email**: api-support@kgiq.com
- **GitHub Issues**: https://github.com/kgiq/family-finance/issues

Last Updated: 2025-01-24