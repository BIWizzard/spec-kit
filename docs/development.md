# KGiQ Family Finance - Developer Setup Guide

This guide helps developers set up their local development environment for the KGiQ Family Finance application, covering everything from initial setup to advanced development workflows.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Development Workflow](#development-workflow)
5. [Code Standards & Guidelines](#code-standards--guidelines)
6. [Testing](#testing)
7. [Debugging](#debugging)
8. [Database Development](#database-development)
9. [API Development](#api-development)
10. [Frontend Development](#frontend-development)
11. [IDE Configuration](#ide-configuration)
12. [Troubleshooting](#troubleshooting)
13. [Contributing](#contributing)

---

## Prerequisites

### System Requirements

#### Required Software
- **Node.js**: 20 LTS (latest)
- **npm**: 10+ (comes with Node.js)
- **Git**: Latest version
- **Docker**: 20.10+ and Docker Compose 2.0+
- **PostgreSQL**: 15+ (local or containerized)

#### Recommended Software
- **Visual Studio Code**: With recommended extensions
- **Postman**: For API testing
- **pgAdmin** or **Adminer**: Database management
- **Figma**: UI/UX design access

#### Platform-specific Installation

**macOS (using Homebrew):**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required software
brew install node@20 git docker postgresql@15
brew install --cask visual-studio-code postman
```

**Ubuntu/Debian:**
```bash
# Update package list
sudo apt update

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install other requirements
sudo apt-get install -y git docker.io docker-compose postgresql-15
```

**Windows:**
```bash
# Install using Chocolatey (recommended)
# First install Chocolatey from https://chocolatey.org/install

# Install required software
choco install nodejs git docker-desktop postgresql vscode postman
```

### Development Accounts

Create accounts for these services:

#### Required for Development
- **GitHub**: Repository access and CI/CD
- **Plaid**: Sandbox API access (free)
- **Neon**: Database hosting (free tier)

#### Optional but Recommended
- **Vercel**: Deployment platform (free tier)
- **Resend**: Email service (free tier)
- **Sentry**: Error tracking (free tier)

---

## Quick Start

### One-Command Setup (Docker)

The fastest way to get started:

```bash
# Clone the repository
git clone https://github.com/your-org/family-finance-web.git
cd family-finance-web

# Start everything with Docker Compose
docker-compose up -d

# Wait for services to be ready
docker-compose logs -f
```

**Access Points:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs
- **Database Admin**: http://localhost:8080 (Adminer)
- **Email Testing**: http://localhost:8025 (Mailhog)

### Manual Setup (5 minutes)

If you prefer manual setup:

```bash
# Clone and install
git clone https://github.com/your-org/family-finance-web.git
cd family-finance-web
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up database
npm run db:setup

# Start development servers
npm run dev
```

---

## Detailed Setup

### Repository Setup

1. **Clone the Repository**
```bash
# Using SSH (recommended)
git clone git@github.com:your-org/family-finance-web.git

# Or using HTTPS
git clone https://github.com/your-org/family-finance-web.git

cd family-finance-web
```

2. **Install Dependencies**
```bash
# Install all dependencies (root, backend, frontend)
npm install

# Or install individually
npm ci                    # Root dependencies
cd backend && npm ci      # Backend dependencies
cd ../frontend && npm ci  # Frontend dependencies
```

### Environment Configuration

1. **Copy Environment Template**
```bash
cp .env.example .env.local
```

2. **Configure Environment Variables**
```bash
# .env.local
NODE_ENV=development

# Database (choose one)
# Option 1: Local PostgreSQL
DATABASE_URL="postgresql://family_finance_user:dev_password@localhost:5432/family_finance_dev"

# Option 2: Neon (cloud PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/family_finance_dev?sslmode=require"

# Authentication
JWT_SECRET="dev-jwt-secret-make-it-long-and-secure-for-development"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-nextauth-secret-also-make-it-long-and-secure"

# Plaid (sandbox)
PLAID_CLIENT_ID="your-sandbox-client-id"
PLAID_SECRET="your-sandbox-secret"
PLAID_ENV="sandbox"
PLAID_PRODUCTS="transactions"
PLAID_COUNTRY_CODES="US"

# Email (for development)
SMTP_HOST="localhost"
SMTP_PORT="1025"
EMAIL_FROM="dev@localhost"

# Logging
LOG_LEVEL="debug"
DEV_LOG_SQL="true"
```

3. **Get API Keys**

**Plaid Sandbox:**
1. Sign up at https://dashboard.plaid.com
2. Create a new application
3. Copy Client ID and Secret (Sandbox)

**Neon Database (Optional):**
1. Sign up at https://neon.tech
2. Create a project
3. Copy connection string

### Database Setup

#### Option 1: Docker PostgreSQL (Recommended)
```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d postgres

# Verify database is running
docker-compose logs postgres
```

#### Option 2: Local PostgreSQL
```bash
# Start PostgreSQL service
# macOS
brew services start postgresql@15

# Ubuntu/Debian
sudo systemctl start postgresql

# Create database and user
createuser family_finance_user --password  # Enter: dev_password
createdb family_finance_dev --owner family_finance_user
```

#### Option 3: Neon (Cloud)
```bash
# No local setup needed, just configure DATABASE_URL in .env.local
```

### Initialize Database

```bash
# Generate Prisma client
cd backend
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed with sample data (optional)
npx prisma db seed
```

### Verify Setup

```bash
# Run all tests to verify setup
npm run test

# Start development servers
npm run dev

# Check health endpoints
curl http://localhost:3001/api/health
curl http://localhost:3000/api/auth/csrf
```

---

## Development Workflow

### Daily Development Routine

1. **Start Development Environment**
```bash
# Start all services
npm run dev

# Or start individually
npm run dev:backend   # Backend only
npm run dev:frontend  # Frontend only

# Or with Docker
docker-compose up -d
```

2. **Verify Everything is Running**
- **Backend**: http://localhost:3001/api/health
- **Frontend**: http://localhost:3000
- **Database**: Check connection in logs

3. **Development Commands**
```bash
# Code quality checks
npm run lint           # Lint all code
npm run type-check     # TypeScript check
npm run format         # Format all code

# Testing
npm run test           # Run all tests
npm run test:watch     # Watch mode testing
npm run test:coverage  # Coverage reports

# Database operations
npm run db:reset       # Reset database
npm run db:seed        # Seed sample data
```

### Git Workflow

1. **Branch Naming Convention**
```bash
# Feature branches
git checkout -b feature/T123-payment-attribution

# Bug fixes
git checkout -b fix/T456-login-validation

# Documentation
git checkout -b docs/update-api-guide
```

2. **Commit Message Format**
```bash
# Format: type(scope): description
git commit -m "feat(api): implement payment attribution endpoint"
git commit -m "fix(ui): resolve login form validation issues"
git commit -m "docs: update API documentation for payments"
```

3. **Pre-commit Checks**
```bash
# Automatic checks run before commit
npm run pre-commit

# Manual run
npm run lint && npm run type-check && npm run test:ci
```

### Code Quality Gates

Before submitting code:

```bash
# Complete verification
npm run verify

# This runs:
# - ESLint (code quality)
# - TypeScript check
# - All tests
# - Build verification
```

---

## Code Standards & Guidelines

### TypeScript Standards

1. **Type Definitions**
```typescript
// Always use strict typing
interface PaymentRequest {
  payee: string;
  amount: number;
  dueDate: Date;
  categoryId: string;
}

// Use enums for constants
enum PaymentStatus {
  SCHEDULED = 'scheduled',
  PAID = 'paid',
  OVERDUE = 'overdue'
}

// Avoid 'any', use specific types
type ApiResponse<T> = {
  data: T;
  message: string;
  status: 'success' | 'error';
};
```

2. **Error Handling**
```typescript
// Use Result pattern for error handling
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// API error responses
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### File Organization

```
backend/src/
├── api/              # API endpoints
│   ├── auth/         # Authentication routes
│   ├── payments/     # Payment routes
│   └── families/     # Family routes
├── services/         # Business logic
├── models/           # Data models/types
├── middleware/       # Express middleware
├── lib/              # Utilities
└── tests/            # Test files

frontend/src/
├── app/              # Next.js 14 app router
├── components/       # Reusable components
├── lib/              # Utilities
├── hooks/            # Custom React hooks
├── stores/           # State management
└── types/            # TypeScript definitions
```

### Naming Conventions

```typescript
// Files: kebab-case
payment-service.ts
user-profile.tsx

// Functions: camelCase
getUserProfile()
calculatePaymentAmount()

// Components: PascalCase
PaymentForm
UserDashboard

// Constants: SCREAMING_SNAKE_CASE
MAX_PAYMENT_AMOUNT = 10000

// Types/Interfaces: PascalCase
interface PaymentData {}
type UserRole = 'admin' | 'member'
```

### ESLint Configuration

The project uses these rules:

```javascript
// .eslintrc.js highlights
{
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "prettier/prettier": "error"
  }
}
```

---

## Testing

### Test Structure

```
tests/
├── contract/         # API contract tests
├── integration/      # Integration tests
├── unit/            # Unit tests
├── e2e/             # End-to-end tests
├── performance/     # Performance tests
└── fixtures/        # Test data
```

### Running Tests

```bash
# All tests
npm run test

# Specific test types
npm run test:backend
npm run test:frontend
npm run test:contract
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage reports
npm run test:coverage

# CI mode (no watch, exit on complete)
npm run test:ci
```

### Writing Tests

#### Unit Tests (Jest)
```typescript
// backend/src/services/__tests__/payment.service.test.ts
import { PaymentService } from '../payment.service';
import { mockPrismaClient } from '../../__mocks__/prisma';

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService(mockPrismaClient);
  });

  it('should create payment with valid data', async () => {
    const paymentData = {
      payee: 'Test Payee',
      amount: 100.00,
      dueDate: new Date('2024-01-15')
    };

    const result = await paymentService.create(paymentData);

    expect(result.success).toBe(true);
    expect(result.data.payee).toBe('Test Payee');
  });
});
```

#### Integration Tests
```typescript
// tests/integration/payment-flow.test.ts
import supertest from 'supertest';
import { app } from '../../backend/src/app';

describe('Payment Flow Integration', () => {
  it('should complete payment attribution flow', async () => {
    // Create income event
    const incomeResponse = await supertest(app)
      .post('/api/income-events')
      .send({ name: 'Salary', amount: 3000 });

    // Create payment
    const paymentResponse = await supertest(app)
      .post('/api/payments')
      .send({ payee: 'Rent', amount: 1200 });

    // Attribute payment to income
    const attributionResponse = await supertest(app)
      .post(`/api/payments/${paymentResponse.body.id}/attributions`)
      .send({
        incomeEventId: incomeResponse.body.id,
        amount: 1200
      });

    expect(attributionResponse.status).toBe(201);
  });
});
```

#### E2E Tests (Playwright)
```typescript
// tests/e2e/payment-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Payment Management', () => {
  test('user can create and attribute payment', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=submit]');

    // Navigate to payments
    await page.click('[data-testid=nav-payments]');

    // Create payment
    await page.click('[data-testid=add-payment]');
    await page.fill('[data-testid=payee]', 'Electric Company');
    await page.fill('[data-testid=amount]', '150.00');
    await page.click('[data-testid=save-payment]');

    // Verify payment created
    await expect(page.locator('[data-testid=payment-list]')).toContainText('Electric Company');
  });
});
```

### Test Data Management

```typescript
// tests/fixtures/test-data.ts
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User'
  },
  member: {
    email: 'member@test.com',
    password: 'member123',
    firstName: 'Member',
    lastName: 'User'
  }
};

export const testPayments = {
  rent: {
    payee: 'Landlord',
    amount: 1200.00,
    dueDate: '2024-01-01'
  },
  utilities: {
    payee: 'Electric Company',
    amount: 150.00,
    dueDate: '2024-01-05'
  }
};
```

---

## Debugging

### Backend Debugging

#### Node.js Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/index.ts",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeArgs": ["--loader", "ts-node/esm"]
    }
  ]
}
```

#### Debug with Nodemon
```bash
# Start backend in debug mode
cd backend
npm run dev:debug

# Attach debugger on port 9229
```

#### Logging
```typescript
// Use structured logging
import { logger } from '../lib/logger';

export class PaymentService {
  async createPayment(data: PaymentData) {
    logger.info('Creating payment', {
      payee: data.payee,
      amount: data.amount,
      userId: data.userId
    });

    try {
      const payment = await this.prisma.payment.create({ data });
      logger.info('Payment created successfully', { paymentId: payment.id });
      return { success: true, data: payment };
    } catch (error) {
      logger.error('Failed to create payment', {
        error: error.message,
        stack: error.stack,
        data
      });
      throw error;
    }
  }
}
```

### Frontend Debugging

#### React Developer Tools
1. Install React Developer Tools extension
2. Enable Profiler for performance debugging
3. Use Components tab to inspect state

#### Next.js Debug Configuration
```json
// .vscode/launch.json
{
  "name": "Debug Frontend",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/frontend/node_modules/.bin/next",
  "args": ["dev"],
  "cwd": "${workspaceFolder}/frontend",
  "env": {
    "NODE_ENV": "development"
  }
}
```

#### Browser Debugging
```typescript
// Use browser breakpoints
const PaymentForm = () => {
  const handleSubmit = (data: PaymentData) => {
    debugger; // Browser will stop here
    console.log('Form data:', data);

    // Debug network requests
    fetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(response => {
      console.log('Response:', response);
    });
  };
};
```

### Database Debugging

#### Prisma Query Logging
```typescript
// Enable in prisma client
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' }
  ]
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

#### Database Inspection
```bash
# Connect to database directly
psql $DATABASE_URL

# Or use Adminer (with Docker setup)
# Visit http://localhost:8080

# Useful queries
SELECT * FROM "Payment" WHERE "familyId" = 'your-family-id';
SELECT * FROM "IncomeEvent" WHERE "scheduledDate" >= NOW();
```

---

## Database Development

### Prisma Workflow

1. **Schema Changes**
```bash
# Edit schema file
code backend/prisma/schema.prisma

# Generate migration
npx prisma migrate dev --name "add-payment-categories"

# Generate client
npx prisma generate
```

2. **Database Operations**
```bash
# Reset database (dev only)
npx prisma migrate reset

# Deploy migrations (production)
npx prisma migrate deploy

# View database in browser
npx prisma studio
```

3. **Seeding Data**
```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test family
  const family = await prisma.family.create({
    data: {
      name: 'Test Family',
      currency: 'USD'
    }
  });

  // Create test user
  const user = await prisma.familyMember.create({
    data: {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      familyId: family.id,
      role: 'admin'
    }
  });

  console.log('Seed data created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Database Best Practices

1. **Migrations**
   - Always test migrations on development data
   - Use descriptive migration names
   - Never edit existing migrations
   - Create rollback scripts for complex changes

2. **Performance**
   - Add indexes for commonly queried fields
   - Use appropriate data types
   - Avoid N+1 queries with Prisma includes

3. **Data Integrity**
   - Use foreign key constraints
   - Add validation at database level
   - Use transactions for related changes

---

## API Development

### API Endpoint Structure

```typescript
// backend/src/api/payments/create.ts
import { Request, Response } from 'express';
import { PaymentService } from '../../services/payment.service';
import { validatePaymentData } from '../../validators/payment.validator';

export const createPayment = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validation = validatePaymentData(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Business logic
    const paymentService = new PaymentService();
    const result = await paymentService.create({
      ...validation.data,
      familyId: req.user.familyId
    });

    if (!result.success) {
      return res.status(400).json({
        message: result.error.message
      });
    }

    // Success response
    res.status(201).json({
      message: 'Payment created successfully',
      data: result.data
    });
  } catch (error) {
    logger.error('Failed to create payment', { error });
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};
```

### Input Validation

```typescript
// backend/src/validators/payment.validator.ts
import { z } from 'zod';

const paymentSchema = z.object({
  payee: z.string().min(1).max(100),
  amount: z.number().positive().max(999999.99),
  dueDate: z.string().datetime(),
  categoryId: z.string().uuid(),
  notes: z.string().optional()
});

export const validatePaymentData = (data: unknown) => {
  try {
    const parsed = paymentSchema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      errors: error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message
      }))
    };
  }
};
```

### API Testing

```bash
# Test endpoints with curl
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "payee": "Electric Company",
    "amount": 150.00,
    "dueDate": "2024-01-15T00:00:00Z",
    "categoryId": "uuid-here"
  }'

# Test with Postman collection
# Import collection from docs/postman-collection.json
```

### API Documentation

The API uses OpenAPI 3.0 specifications:

- **Interactive Docs**: http://localhost:3001/api/docs
- **OpenAPI Spec**: http://localhost:3001/api/openapi.yaml
- **Postman Collection**: http://localhost:3001/api/postman-collection.json

---

## Frontend Development

### Next.js 14 App Router

```typescript
// frontend/src/app/payments/page.tsx
import { PaymentList } from '../../components/payments/payment-list';
import { AddPaymentButton } from '../../components/payments/add-payment-button';

export default async function PaymentsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <AddPaymentButton />
      </div>
      <PaymentList />
    </div>
  );
}
```

### Component Development

```typescript
// frontend/src/components/payments/payment-form.tsx
'use client';

import { useState } from 'react';
import { usePaymentMutation } from '../../hooks/use-payments';

interface PaymentFormProps {
  onSuccess?: (payment: Payment) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    payee: '',
    amount: '',
    dueDate: ''
  });

  const createPayment = usePaymentMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payment = await createPayment.mutateAsync({
        payee: formData.payee,
        amount: parseFloat(formData.amount),
        dueDate: new Date(formData.dueDate)
      });

      onSuccess?.(payment);
    } catch (error) {
      console.error('Failed to create payment:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="payee">Payee</label>
        <input
          id="payee"
          type="text"
          value={formData.payee}
          onChange={(e) => setFormData(prev => ({ ...prev, payee: e.target.value }))}
          required
        />
      </div>
      {/* More form fields */}
      <button type="submit" disabled={createPayment.isLoading}>
        {createPayment.isLoading ? 'Creating...' : 'Create Payment'}
      </button>
    </form>
  );
};
```

### State Management

```typescript
// frontend/src/hooks/use-payments.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../lib/api-client';

export const usePayments = () => {
  return useQuery({
    queryKey: ['payments'],
    queryFn: paymentApi.list
  });
};

export const usePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    }
  });
};
```

### Styling (Tailwind CSS)

```tsx
// Component with Tailwind classes
<div className="bg-white shadow-lg rounded-lg border border-gray-200 p-6">
  <h2 className="text-xl font-semibold text-gray-900 mb-4">
    Payment Details
  </h2>
  <div className="grid grid-cols-2 gap-4">
    <div className="text-sm text-gray-500">Payee</div>
    <div className="font-medium">{payment.payee}</div>
  </div>
</div>
```

---

## IDE Configuration

### Visual Studio Code

#### Recommended Extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "ms-vscode.vscode-jest",
    "ms-playwright.playwright"
  ]
}
```

#### Workspace Settings

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

#### Code Snippets

```json
// .vscode/snippets/typescript.json
{
  "API Endpoint": {
    "prefix": "api-endpoint",
    "body": [
      "import { Request, Response } from 'express';",
      "import { logger } from '../lib/logger';",
      "",
      "export const ${1:handlerName} = async (req: Request, res: Response) => {",
      "  try {",
      "    $2",
      "    res.json({ message: 'Success', data: result });",
      "  } catch (error) {",
      "    logger.error('${3:Error description}', { error });",
      "    res.status(500).json({ message: 'Internal server error' });",
      "  }",
      "};"
    ]
  }
}
```

### Browser Developer Tools

#### React DevTools Setup
1. Install React Developer Tools extension
2. Enable Profiler for performance analysis
3. Use Components tab for state inspection

#### Performance Debugging
```javascript
// Add to browser console for performance monitoring
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});

observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
```

---

## Troubleshooting

### Common Setup Issues

#### Node.js Version Conflicts
```bash
# Check Node version
node --version

# Should be 20.x.x, if not:
# Using nvm (macOS/Linux)
nvm install 20
nvm use 20

# Using fnm
fnm install 20
fnm use 20
```

#### npm Installation Failures
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try:
npm ci --legacy-peer-deps
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Docker containers
docker-compose ps
docker-compose logs postgres
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or change port in package.json
"dev": "next dev -p 3001"
```

### Development Issues

#### Build Failures
```bash
# Clean build artifacts
npm run clean

# Rebuild everything
npm run build

# Check TypeScript errors
npm run type-check

# Check for missing dependencies
npm ls
```

#### Test Failures
```bash
# Run tests in verbose mode
npm run test -- --verbose

# Run specific test file
npm run test -- payment.test.ts

# Update snapshots
npm run test -- --updateSnapshot

# Clear jest cache
npx jest --clearCache
```

#### Docker Issues
```bash
# Restart all services
docker-compose down
docker-compose up -d

# Rebuild images
docker-compose build --no-cache

# Check logs
docker-compose logs -f [service-name]

# Clean up Docker
docker system prune -a
```

### Performance Issues

#### Slow Development Server
```bash
# Check if too many files are being watched
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf

# Restart development server
npm run dev

# Use faster TypeScript checker
npm install --save-dev fork-ts-checker-webpack-plugin
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Monitor memory usage
node --inspect backend/src/index.ts

# Use production build for testing
npm run build
npm run start
```

---

## Contributing

### Development Process

1. **Pick a Task**
   - Check project board for available tasks
   - Assign yourself to prevent conflicts
   - Understand requirements and acceptance criteria

2. **Create Feature Branch**
```bash
git checkout -b feature/T123-description
```

3. **Development Cycle**
```bash
# Make changes
# Run tests frequently
npm run test:watch

# Check code quality
npm run lint
npm run type-check

# Commit changes (triggers pre-commit hooks)
git add .
git commit -m "feat(scope): implement feature description"
```

4. **Pre-submission Checklist**
- [ ] All tests passing
- [ ] Code coverage maintained (>80%)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Manual testing completed
- [ ] Documentation updated

5. **Submit Pull Request**
```bash
git push origin feature/T123-description

# Create PR with template:
# - Description of changes
# - Testing completed
# - Screenshots (if UI changes)
# - Breaking changes (if any)
```

### Code Review Process

#### Before Requesting Review
- Self-review your changes
- Test edge cases
- Update documentation
- Add/update tests

#### Review Guidelines
- Focus on logic and architecture
- Check for security issues
- Verify test coverage
- Ensure code follows standards

### Release Process

1. **Version Bump**
```bash
npm version patch  # Bug fixes
npm version minor  # New features
npm version major  # Breaking changes
```

2. **Deployment**
```bash
# Staging deployment
git push origin develop

# Production deployment
git push origin main
```

3. **Post-deployment**
- Verify health checks
- Monitor error rates
- Update changelog
- Notify team

---

## Getting Help

### Internal Resources
- **Documentation**: `/docs` directory
- **API Reference**: http://localhost:3001/api/docs
- **Component Library**: http://localhost:6006 (Storybook)
- **Database Schema**: http://localhost:5555 (Prisma Studio)

### External Resources
- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **React Query**: https://tanstack.com/query/latest
- **Tailwind CSS**: https://tailwindcss.com/docs

### Community
- **GitHub Discussions**: Project repository discussions
- **Slack Channel**: #family-finance-dev
- **Weekly Standups**: Every Monday 9 AM
- **Code Review Sessions**: Fridays 2 PM

### Support Contacts
- **Technical Lead**: tech-lead@kgiq.com
- **DevOps**: devops@kgiq.com
- **Product Manager**: product@kgiq.com

---

## Conclusion

This development guide covers everything you need to contribute effectively to the KGiQ Family Finance project. The setup is designed to be straightforward while maintaining high code quality and developer experience standards.

Remember:
- Follow the established patterns and conventions
- Write tests for your code
- Keep documentation updated
- Ask questions when unclear
- Contribute to improving this guide

Happy coding! 🚀

---

**Last Updated**: January 2025
**Version**: 1.0
**Maintainers**: Development Team