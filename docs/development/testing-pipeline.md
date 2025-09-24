# Automated Testing Pipeline

## Overview
The Family Finance web application uses a comprehensive automated testing pipeline that includes unit tests, integration tests, contract tests, and end-to-end tests. The pipeline is designed to ensure code quality, functionality, and reliability across all components.

## Testing Architecture

### Test Types
1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test interaction between components and services
3. **Contract Tests**: Validate API contracts and data flow
4. **End-to-End Tests**: Test complete user workflows in a browser environment

### Test Environment Setup
- **Backend**: Node.js with Jest, TypeScript, Prisma
- **Frontend**: Next.js with Jest, React Testing Library, Playwright
- **Database**: PostgreSQL test database
- **CI/CD**: GitHub Actions with automated deployment

## Testing Structure

### Backend Testing (`/backend/tests/`)
```
backend/
├── src/
│   ├── **/*.test.ts        # Unit tests alongside source code
│   └── **/__tests__/       # Component-specific test suites
├── tests/
│   ├── setup.ts            # Test environment setup
│   ├── globalSetup.ts      # Global test initialization
│   ├── globalTeardown.ts   # Global test cleanup
│   ├── unit/               # Isolated unit tests
│   ├── integration/        # Service integration tests
│   └── mocks/              # Mock implementations
└── jest.config.js          # Jest configuration
```

### Frontend Testing (`/frontend/tests/`)
```
frontend/
├── src/
│   ├── **/*.test.tsx       # Component unit tests
│   └── **/__tests__/       # Component test suites
├── __tests__/
│   ├── unit/               # Isolated component tests
│   ├── integration/        # Page and flow tests
│   └── __mocks__/          # Mock implementations
├── tests/
│   └── e2e/                # End-to-end test scenarios
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Jest environment setup
└── playwright.config.ts    # Playwright E2E configuration
```

### Contract Testing (`/tests/contract/`)
```
tests/
├── contract/
│   ├── test_*.ts           # API contract tests
│   └── fixtures/           # Test data fixtures
├── jest.config.js          # Contract test configuration
└── setup.ts                # Contract test environment
```

## NPM Scripts

### Root Level Scripts
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run CI test suite
npm run test:ci

# Run specific test categories
npm run test:backend
npm run test:frontend
npm run test:contract
npm run test:e2e

# Code quality checks
npm run lint
npm run type-check
npm run format

# Build verification
npm run build
npm run verify  # lint + type-check + test + build
```

### Backend Scripts
```bash
cd backend

# Test commands
npm run test                # Run all backend tests
npm run test:watch          # Watch mode for development
npm run test:coverage       # Generate coverage report
npm run test:ci             # CI-optimized test run
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only

# Code quality
npm run lint                # ESLint checking
npm run lint:fix            # Auto-fix linting issues
npm run type-check          # TypeScript type checking
npm run format              # Format code with Prettier

# Database operations
npm run db:generate         # Generate Prisma client
npm run db:migrate          # Run database migrations
npm run db:seed             # Seed test data
npm run db:reset            # Reset database

# Pre-commit hook
npm run pre-commit          # Lint + type-check + test
```

### Frontend Scripts
```bash
cd frontend

# Test commands
npm run test                # Run all frontend tests
npm run test:watch          # Watch mode for development
npm run test:coverage       # Generate coverage report
npm run test:ci             # CI-optimized test run
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e            # End-to-end tests
npm run test:e2e:ui         # E2E tests with UI

# Code quality
npm run lint                # Next.js ESLint
npm run lint:fix            # Auto-fix linting issues
npm run type-check          # TypeScript type checking
npm run format              # Format code with Prettier

# Build and analysis
npm run build               # Production build
npm run analyze             # Bundle analyzer
npm run storybook           # Start Storybook
```

## Test Pipeline Script

### Automated Pipeline
The `scripts/test-pipeline.sh` script orchestrates the complete testing workflow:

```bash
# Run complete test pipeline
./scripts/test-pipeline.sh

# Run with coverage reports
./scripts/test-pipeline.sh --coverage

# Skip specific test categories
./scripts/test-pipeline.sh --skip-e2e --skip-frontend

# Run in parallel mode
./scripts/test-pipeline.sh --parallel
```

### Pipeline Stages
1. **Prerequisites Check**: Node.js version, database connectivity
2. **Dependency Installation**: Backend and frontend dependencies
3. **Code Quality**: Linting and type checking
4. **Unit Testing**: Backend and frontend unit tests
5. **Contract Testing**: API contract validation
6. **Build Verification**: Ensure code compiles correctly
7. **E2E Testing**: Full browser-based testing
8. **Coverage Reports**: Generate and merge coverage data

## GitHub Actions CI/CD

### Workflow File
`.github/workflows/ci.yml` contains the complete CI/CD pipeline:

- **Security Scanning**: Trivy vulnerability scanner, npm audit
- **Parallel Testing**: Backend, frontend, and E2E tests run in parallel
- **Multi-Environment**: Separate staging and production deployments
- **Code Quality**: SonarCloud integration, coverage thresholds
- **Performance Testing**: Lighthouse CI for performance metrics

### Environment Configuration
```yaml
# Required secrets in GitHub repository settings
VERCEL_TOKEN                    # Vercel deployment token
VERCEL_ORG_ID                   # Vercel organization ID
VERCEL_PROJECT_ID               # Vercel project ID
DATABASE_URL                    # Production database URL
JWT_SECRET                      # Production JWT secret
NEXTAUTH_SECRET                 # NextAuth secret
SONAR_TOKEN                     # SonarCloud token
LHCI_GITHUB_APP_TOKEN          # Lighthouse CI token
```

## Coverage Requirements

### Backend Coverage Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Frontend Coverage Thresholds
- **Branches**: 75%
- **Functions**: 75%
- **Lines**: 75%
- **Statements**: 75%

### Coverage Exclusions
- Type definition files (`*.d.ts`)
- Test files (`*.test.*`, `*.spec.*`)
- Story files (`*.stories.*`)
- Configuration files (`next.config.js`, entry points)
- Mock files and test utilities

## Database Testing

### Test Database Setup
```bash
# PostgreSQL test database
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/family_finance_test

# Automatic cleanup between tests
# Database transactions rolled back after each test
# Fresh schema applied before test suite
```

### Migration Testing
- All migrations tested in CI environment
- Schema validation against Prisma models
- Seed data consistency verification

## Mock Strategy

### External Service Mocks
- **Sentry**: Error tracking and performance monitoring
- **Plaid**: Bank account integration
- **Resend**: Email service
- **Vercel Analytics**: Usage tracking
- **NextAuth**: Authentication provider

### Component Mocks
- **Next.js Router**: Navigation testing
- **Next.js Image**: Image optimization
- **TanStack Query**: Data fetching
- **Browser APIs**: IntersectionObserver, ResizeObserver

## Performance Testing

### Lighthouse CI
- **Performance Score**: > 90
- **Accessibility Score**: > 95
- **Best Practices Score**: > 90
- **SEO Score**: > 90
- **PWA Score**: > 80

### Load Testing
- **Artillery**: API endpoint load testing
- **Response Time**: < 200ms (p95)
- **Concurrent Users**: 100+ supported
- **Error Rate**: < 0.1%

## Test Data Management

### Fixtures and Factories
- Consistent test data across all test types
- Factory functions for creating test objects
- Realistic data that mirrors production patterns
- Privacy-compliant test data (no real user information)

### Database Seeding
```typescript
// Example test factory
const createTestFamily = () => ({
  id: 'test-family-id',
  name: 'Test Family',
  members: [
    createTestUser({ role: 'parent' }),
    createTestUser({ role: 'child' })
  ]
});
```

## Debugging Tests

### Local Development
```bash
# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testNamePattern="User Service"

# Debug mode with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Verbose output
npm test -- --verbose
```

### CI Debugging
- GitHub Actions artifact uploads
- Test result screenshots and videos
- Detailed error logs and stack traces
- Coverage reports as HTML artifacts

## Best Practices

### Test Writing Guidelines
1. **Descriptive Names**: Clear test and describe block names
2. **AAA Pattern**: Arrange, Act, Assert structure
3. **Single Assertion**: One concept per test
4. **Independent Tests**: No test dependencies
5. **Clean Mocks**: Reset mocks between tests

### Performance Optimization
1. **Parallel Execution**: Tests run in parallel where possible
2. **Selective Testing**: Run only relevant tests during development
3. **Efficient Mocking**: Mock external dependencies appropriately
4. **Resource Cleanup**: Proper cleanup to prevent memory leaks

### Security Testing
1. **Input Validation**: Test with malicious input patterns
2. **Authentication**: Verify access control and permissions
3. **Data Protection**: Ensure sensitive data is handled securely
4. **Rate Limiting**: Test API rate limit enforcement

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and accessible
2. **Port Conflicts**: Check that required ports (3000, 3001) are available
3. **Environment Variables**: Verify all required environment variables are set
4. **Node Version**: Ensure compatible Node.js version (20 LTS)
5. **Memory Issues**: Increase Node.js memory limit if needed

### Test Failures
- Check test logs for specific error messages
- Verify database state and migrations
- Ensure all dependencies are installed
- Check environment variable configuration
- Review mock implementations for accuracy

## Future Enhancements

### Planned Improvements
1. **Visual Regression Testing**: Screenshot comparison testing
2. **API Load Testing**: Automated performance benchmarking
3. **Cross-Browser Testing**: Extended browser matrix
4. **Accessibility Testing**: Automated a11y validation
5. **Security Scanning**: Automated vulnerability assessment

### Testing Tools Evaluation
- **Cypress**: Alternative E2E testing framework
- **Storybook**: Component testing and documentation
- **MSW**: Mock service worker for API mocking
- **Testing Library**: Enhanced component testing utilities