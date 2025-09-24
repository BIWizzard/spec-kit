import { beforeEach, afterEach, afterAll, beforeAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Test database instance
let testDb: PrismaClient;

beforeAll(async () => {
  // Setup test database connection
  testDb = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/family_finance_test'
      }
    }
  });

  // Connect to test database
  await testDb.$connect();

  // Setup test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long!';
});

beforeEach(async () => {
  // Clean up database before each test
  await testDb.$transaction([
    testDb.session.deleteMany(),
    testDb.income.deleteMany(),
    testDb.payment.deleteMany(),
    testDb.bankAccount.deleteMany(),
    testDb.budget.deleteMany(),
    testDb.familyInvitation.deleteMany(),
    testDb.user.deleteMany(),
    testDb.family.deleteMany(),
  ]);
});

afterEach(async () => {
  // Clean up any remaining test data
  jest.clearAllMocks();
});

afterAll(async () => {
  // Cleanup after all tests
  await testDb.$disconnect();
});

// Make testDb available globally for tests
(global as any).testDb = testDb;

// Mock external services
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

jest.mock('@sentry/profiling-node', () => ({
  init: jest.fn(),
}));

// Mock Plaid client
jest.mock('plaid', () => ({
  PlaidApi: jest.fn(() => ({
    accountsGet: jest.fn(),
    transactionsGet: jest.fn(),
    institutionsGet: jest.fn(),
    linkTokenCreate: jest.fn(),
    itemPublicTokenExchange: jest.fn(),
  })),
  Configuration: jest.fn(),
  PlaidEnvironments: {
    sandbox: 'sandbox',
    development: 'development',
    production: 'production',
  },
  CountryCode: {
    US: 'US',
  },
  Products: {
    Transactions: 'transactions',
    Auth: 'auth',
  },
}));

// Mock email service
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn(() => Promise.resolve({ id: 'test-email-id' })),
    },
  })),
}));

// Console override for cleaner test output
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError(...args);
  };
});

afterEach(() => {
  console.error = originalError;
});