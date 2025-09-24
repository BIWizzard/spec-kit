# Code Quality and Linting Pipeline

## Overview
The Family Finance web application maintains high code quality through automated linting, formatting, type checking, and quality gates. This document outlines the complete code quality pipeline and standards.

## Code Quality Tools

### ESLint Configuration
- **Backend**: Comprehensive TypeScript, Node.js, and security linting
- **Frontend**: React, TypeScript, accessibility, and Next.js linting
- **Security**: Vulnerability detection and security best practices
- **Import Management**: Proper import ordering and dependency management

### Prettier Configuration
- **Consistent Formatting**: Automated code formatting across all files
- **Language-Specific Rules**: Tailored formatting for different file types
- **Integration**: Works seamlessly with ESLint and editor plugins

### TypeScript Strict Mode
- **Type Safety**: Comprehensive type checking with strict configuration
- **Error Prevention**: Catch type-related issues at compile time
- **Code Documentation**: Self-documenting code through types

### Pre-commit Hooks
- **Husky Integration**: Automated pre-commit quality checks
- **Lint-Staged**: Only lint and format changed files for performance
- **Commit Message Validation**: Enforced conventional commit format

## Configuration Files

### ESLint Configurations

#### Backend ESLint (`.eslintrc.js`)
```javascript
// Comprehensive backend linting with:
// - TypeScript strict rules
// - Security vulnerability detection
// - Node.js best practices
// - Import organization
// - Jest testing rules
```

#### Frontend ESLint (`.eslintrc.json`)
```javascript
// Frontend-focused linting with:
// - React and React Hooks rules
// - Next.js optimizations
// - Accessibility (a11y) checks
// - TypeScript integration
// - Security considerations
```

### Prettier Configuration (`.prettierrc.js`)
```javascript
// Consistent code formatting:
// - 2-space indentation
// - Single quotes for strings
// - Trailing commas in multiline
// - 100-character line length
// - Language-specific overrides
```

### SonarCloud Configuration (`sonar-project.properties`)
```properties
# Code quality analysis:
# - Complexity analysis
# - Security vulnerability scanning
# - Technical debt tracking
# - Coverage requirements
# - Quality gate enforcement
```

## Quality Standards

### Code Coverage Requirements
- **Backend**: 80% minimum coverage (branches, functions, lines, statements)
- **Frontend**: 75% minimum coverage (branches, functions, lines, statements)
- **Contract Tests**: 100% API endpoint coverage
- **E2E Tests**: Critical user journey coverage

### Linting Rules

#### TypeScript Rules
```typescript
// Enforced standards:
// - No unused variables (except prefixed with _)
// - Prefer nullish coalescing (??)
// - Prefer optional chaining (?.)
// - No floating promises
// - Explicit return types for public APIs
```

#### Security Rules
```typescript
// Security enforcement:
// - No eval() or Function() constructors
// - Safe regular expressions
// - No buffer vulnerabilities
// - CSRF protection validation
// - SQL injection prevention
```

#### React/Frontend Rules
```typescript
// React best practices:
// - Hooks rules enforcement
// - Accessibility requirements
// - Component naming conventions
// - Props validation
// - JSX formatting standards
```

## Automated Quality Checks

### Pre-commit Pipeline
1. **Lint-Staged Execution**: Format and lint only changed files
2. **Type Checking**: Ensure TypeScript compilation
3. **Merge Conflict Detection**: Prevent commits with conflict markers
4. **TODO/FIXME Warnings**: Alert about pending work items
5. **Commit Message Validation**: Enforce conventional commit format

### CI/CD Quality Gates
1. **Linting**: All code must pass ESLint rules
2. **Type Checking**: TypeScript must compile without errors
3. **Tests**: All tests must pass with required coverage
4. **Security Scanning**: Vulnerability assessment with Trivy
5. **Code Quality**: SonarCloud quality gate requirements

## Development Workflow

### Local Development
```bash
# Format code
npm run format

# Check formatting without changes
npm run format:check

# Lint and fix issues
npm run lint:fix

# Type checking
npm run type-check

# Run all quality checks
npm run pre-commit
```

### Git Hooks Integration
```bash
# Install Husky hooks
npm run prepare

# Manual pre-commit check
npm run pre-commit

# Format staged files
npx lint-staged
```

### Editor Integration
Recommended VS Code extensions:
- **ESLint**: Real-time linting feedback
- **Prettier**: Automatic formatting on save
- **TypeScript Importer**: Auto-import management
- **SonarLint**: Real-time code quality analysis

## Quality Metrics

### SonarCloud Metrics
- **Maintainability Rating**: A grade required
- **Reliability Rating**: A grade required
- **Security Rating**: A grade required
- **Coverage**: Minimum thresholds enforced
- **Duplication**: Less than 3% code duplication
- **Technical Debt**: Maximum 5% debt ratio

### Performance Standards
- **Build Time**: ESLint execution under 30 seconds
- **Pre-commit Speed**: Hook execution under 10 seconds
- **CI Pipeline**: Quality checks complete within 5 minutes
- **Editor Response**: Real-time feedback under 1 second

## Error Handling

### Common Linting Issues

#### Import Order Violations
```typescript
// ❌ Wrong: Mixed import groups
import React from 'react';
import { logger } from '../lib/logger';
import fs from 'fs';

// ✅ Correct: Grouped imports
import fs from 'fs';

import React from 'react';

import { logger } from '../lib/logger';
```

#### TypeScript Violations
```typescript
// ❌ Wrong: Unsafe any usage
const processData = (data: any) => data.value;

// ✅ Correct: Proper typing
interface DataPayload {
  value: string;
}
const processData = (data: DataPayload) => data.value;
```

#### Security Violations
```typescript
// ❌ Wrong: Direct object access
const getValue = (obj: any, key: string) => obj[key];

// ✅ Correct: Safe property access
const getValue = (obj: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
```

### Debugging Quality Issues

#### ESLint Debugging
```bash
# Run ESLint with debug output
DEBUG=eslint:* npm run lint

# Check specific rule
npm run lint -- --print-config src/index.ts

# Disable specific rule for debugging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = {};
```

#### Prettier Conflicts
```bash
# Check Prettier configuration
npx prettier --check src/**/*.ts

# See what Prettier would change
npx prettier --write src/example.ts --dry-run

# Fix ESLint/Prettier conflicts
npm run lint:fix && npm run format
```

## Continuous Improvement

### Quality Metrics Dashboard
- **SonarCloud**: Comprehensive code quality metrics
- **GitHub Actions**: Build and test success rates
- **Coverage Reports**: Test coverage trends over time
- **Technical Debt**: Tracking and reduction goals

### Regular Audits
1. **Weekly**: Review failed quality checks and address patterns
2. **Monthly**: Update ESLint rules based on new best practices
3. **Quarterly**: Audit and upgrade linting dependencies
4. **Annually**: Comprehensive code quality standard review

## Best Practices

### Writing Quality Code
1. **Single Responsibility**: Each function/component has one purpose
2. **Type Safety**: Leverage TypeScript for compile-time safety
3. **Error Handling**: Graceful error handling and user feedback
4. **Performance**: Consider performance implications of code decisions
5. **Security**: Follow security best practices for web applications

### Code Review Guidelines
1. **Quality Gates**: All quality checks must pass before review
2. **Documentation**: Code changes include appropriate documentation
3. **Testing**: New features include comprehensive tests
4. **Performance**: Consider performance impact of changes
5. **Security**: Review for potential security vulnerabilities

### Technical Debt Management
1. **Track**: Monitor technical debt metrics in SonarCloud
2. **Prioritize**: Address high-impact technical debt first
3. **Plan**: Include debt reduction in sprint planning
4. **Prevent**: Use quality gates to prevent new debt accumulation
5. **Refactor**: Regular refactoring to improve code maintainability

## Troubleshooting

### Common Issues
1. **ESLint/Prettier Conflicts**: Run `npm run lint:fix && npm run format`
2. **TypeScript Errors**: Check `tsconfig.json` configuration
3. **Pre-commit Hook Failures**: Review specific error messages and fix issues
4. **Coverage Thresholds**: Add tests to meet minimum coverage requirements
5. **SonarCloud Quality Gate**: Address specific quality issues reported

### Performance Optimization
1. **ESLint Cache**: Enable ESLint caching for faster subsequent runs
2. **Parallel Execution**: Run linting and type checking in parallel
3. **Incremental Checks**: Only check changed files in development
4. **Editor Integration**: Use editor plugins for real-time feedback

## Integration with CI/CD

### GitHub Actions Integration
```yaml
# Quality checks in CI pipeline
- name: Run ESLint
  run: npm run lint

- name: Check TypeScript
  run: npm run type-check

- name: Verify Prettier formatting
  run: npm run format:check

- name: Run SonarCloud analysis
  uses: SonarSource/sonarcloud-github-action@master
```

### Quality Gates
- **Required Checks**: All quality checks must pass for PR merge
- **Branch Protection**: Main branch protected with status checks
- **Automatic Fixes**: Some issues auto-fixed in PR creation
- **Review Requirements**: Code review required for quality gate bypasses

## Future Enhancements

### Planned Improvements
1. **Additional Security Rules**: Enhanced security vulnerability detection
2. **Performance Linting**: Rules to detect performance anti-patterns
3. **Accessibility Automation**: Automated accessibility testing
4. **Code Complexity Metrics**: Advanced complexity analysis
5. **Custom Rules**: Project-specific linting rules

### Tool Evaluation
- **Biome**: Modern linting and formatting tool evaluation
- **Rome**: All-in-one toolchain assessment
- **DeepCode**: AI-powered code analysis integration
- **Semgrep**: Advanced security rule engine evaluation