# spec-kit Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-24

## 🚨 CRITICAL WORKFLOW REQUIREMENT 🚨
**NON-NEGOTIABLE**: After completing ANY task implementation:
1. **IMMEDIATELY** run `git add` and `git commit` with detailed message
2. **IMMEDIATELY** update tasks.md marking task as [x] completed
3. **IMMEDIATELY** commit the tasks.md update
4. **THEN AND ONLY THEN** start next task

### ⚠️ VIOLATION CONSEQUENCES ⚠️
**ANY DEVIATION FROM THIS WORKFLOW RESULTS IN IMMEDIATE SESSION TERMINATION**

**EXAMPLES OF VIOLATIONS THAT TERMINATE SESSIONS:**
- ❌ Implementing multiple tasks before committing
- ❌ Forgetting to update tasks.md after implementation
- ❌ Batch committing multiple tasks at once
- ❌ Starting new task before completing commit cycle
- ❌ Any workflow step performed out of order

**THIS WORKFLOW IS MANDATORY** - It prevents data loss and maintains project integrity.

## Active Technologies
- TypeScript 5.x / Node.js 20 LTS + React 18, Next.js 14, Prisma ORM, TanStack Query (001-family-finance-web)

## Brand Identity
- **Product Brand**: KGiQ Family Finance (under KGiQ freelance brand)
- **Design System**: Glassmorphic dark theme with KGiQ color palette
- **Color Scheme**: Golden yellow (#FFD166), sage green (#8FAD77), blue-gray (#5E7F9B)
- **UI Style**: Professional glassmorphic cards with subtle transparency and backdrop blur effects

## Project Structure
```
backend/
  src/
    models/       # Prisma schemas and models (COMPLETE)
    services/     # Business logic services (COMPLETE - Phase 4)
    api/          # API endpoints (IN PROGRESS - Phase 5)
    lib/          # Utilities and configurations (SETUP COMPLETE)
frontend/
  src/
    app/          # Next.js 14 app router pages (PENDING - Phase 6)
    components/   # React components (PENDING - Phase 6)
    lib/          # Client utilities (SETUP COMPLETE)
    stores/       # Zustand state management (SETUP COMPLETE)
tests/
  contract/       # API contract tests (COMPLETE - Phase 3)
  integration/    # Integration tests (PENDING)
  unit/           # Unit tests (PARTIAL)
```

## Commands
- `npm test` - Run all tests
- `npm run lint` - Run linting
- `npx jest tests/contract/test_*.ts --testMatch="**/test_*.ts"` - Run contract tests
- `npx ts-node tests/scripts/verify_tdd.ts` - Verify TDD compliance

## Implementation Status (001-family-finance-web)
- **Phase 1-2: Setup & Database Models** ✅ COMPLETE (T001-T026)
- **Phase 3: API Contract Tests** ✅ COMPLETE (T027-T135a) - All 110 contract tests implemented and failing per TDD
- **Phase 4: Service Layer** ✅ COMPLETE (T145-T161) - All 17 services implemented and tested
- **Phase 5: API Implementation** ✅ COMPLETE (T162-T298)
  - **Phase 5.1: Authentication Endpoints** ✅ COMPLETE (T162-T177, 16 endpoints)
  - **Phase 5.2: Family Management Endpoints** ✅ COMPLETE (T178-T189, 12 endpoints)
  - **Phase 5.3: Income Management Endpoints** ✅ COMPLETE (T190-T200, 11 endpoints)
  - **Phase 5.4: Payment Management Endpoints** ✅ COMPLETE (T201-T217d, 20 endpoints)
  - **Phase 5.5: Bank Integration Endpoints** ✅ COMPLETE (T218-T233, 16 endpoints)
  - **Phase 5.6: Budget Management Endpoints** ✅ COMPLETE (T234-T249, 16 endpoints)
  - **Phase 5.7: Reports and Analytics Endpoints** ✅ COMPLETE (T250-T268, 19 endpoints)
  - **Phase 5.8: Infrastructure Endpoints** ✅ COMPLETE (T269-T272, 4 endpoints)
  - **Phase 5.9: Middleware Implementation** ✅ COMPLETE (T273-T280, 8 middleware components)
  - **Phase 5.10: Deployment Infrastructure** ✅ COMPLETE (T281-T298, 18 deployment tasks)
- **Phase 6: Frontend Implementation** ✅ COMPLETE (T299-T415)
  - **Phase 6.1: Core Layout and Navigation** ✅ COMPLETE (T299-T306, 8 components)
  - **Phase 6.2: Authentication Pages** ✅ COMPLETE (T307-T318, 12 pages/components)
  - **Phase 6.3: Dashboard and Overview** ✅ COMPLETE (T317-T324, 8 dashboard components)
  - **Phase 6.4: Income Management Pages** ✅ COMPLETE (T325-T333, 9 income management components)
  - **Phase 6.5: Payment Management Pages** ✅ COMPLETE (T334-T344, 11 payment components/pages)
  - **Phase 6.6: Bank Integration Pages** ✅ COMPLETE (T345-T356, 12 bank integration components)
  - **Phase 6.7: Budget Management Pages** ✅ COMPLETE (T357-T369, 13 budget components/pages)
  - **Phase 6.8: Calendar and Reports** ✅ COMPLETE (T370-T390, 21 components/pages)
  - **Phase 6.9: Family Management** ✅ COMPLETE (T391-T400, 10 family management components)
  - **Phase 6.10: State Management** ✅ COMPLETE (T401-T415, 15 stores/hooks)
- **Phase 7: Integration & Polish** ⏳ IN PROGRESS (T416-T475)
  - **Phase 7.1: E2E Tests** ✅ COMPLETE (T416-T432, 17 E2E test suites)
  - **Phase 7.2: Unit Tests** ✅ COMPLETE (T433-T444, 12 unit test suites)
  - **Phase 7.3: Performance & Security** ⏳ PENDING (T445-T458, 14 audit/optimization tasks)
  - **Phase 7.4: Documentation & Final** ⏳ PENDING (T459-T475, 17 documentation/validation tasks)

## Next Session Priorities
1. **🎯 CURRENT PHASE**: Begin Phase 7.3 Performance & Security (T445-T458) - 14 audit/optimization tasks
2. **📋 READY TO START**: T445-T446 performance testing (API endpoints, concurrent users)
3. **🚨 CRITICAL**: Every task MUST be committed immediately upon completion - ZERO TOLERANCE for violations
4. **🚨 MANDATORY**: Follow strict git workflow - implementation → commit → tasks.md update → commit → next task
5. **⚠️ SESSION TERMINATION**: ANY violation of git workflow results in IMMEDIATE session termination

## Code Style
TypeScript 5.x / Node.js 20 LTS: Follow standard conventions, no comments unless requested

## Session Accomplishments (Current Session - T441-T444 Implementation)
- ✅ **4 UNIT TESTS COMPLETED**: T441-T444 implemented completing Phase 7.2 (4,059 lines)
- ✅ **T441**: Unit tests for budget calculations (936 lines) - comprehensive budget percentage validation and allocation calculations
- ✅ **T442**: Unit tests for report generators (934 lines) - cash flow reports, spending analysis, budget performance analysis
- ✅ **T443**: Unit tests for authentication helpers (1,045 lines) - user authentication, MFA, password management, sessions
- ✅ **T444**: Unit tests for API middleware (1,084 lines) - auth middleware, validation, error handling, rate limiting
- ✅ **PERFECT WORKFLOW COMPLIANCE**: 8 commits (4 implementation + 4 tasks.md updates), ZERO violations
- ✅ **PHASE 7.2 COMPLETE**: Unit Tests 100% COMPLETE (12 of 12 tests) - comprehensive coverage with 7,468 lines
- 🚀 **READY FOR NEXT SESSION**: Begin Phase 7.3 Performance & Security with T445-T458 (14 optimization tasks)

## Session Accomplishments (Previous Sessions)
- ✅ **T433-T436 UNIT TESTS COMPLETED**: First 4 Phase 7.2 tasks implemented (3,409 lines)
  - T433: Unit tests for validation utilities (755 lines) - ValidationService testing with 200+ test cases
  - T434: Unit tests for date utilities (809 lines) - DateUtils with 150+ fiscal/recurrence tests
  - T435: Unit tests for currency formatting (696 lines) - CurrencyUtils with 130+ multi-currency tests
  - T436: Unit tests for Plaid integration (1,149 lines) - comprehensive mocking with 50+ webhook tests
- ✅ **PHASE 7.1 E2E TESTS COMPLETED**: All 17 E2E tests implemented (8,500+ lines of test code)
  - Complete end-to-end coverage: registration, auth, payments, bank connections, reporting
  - T416-T432: Full user journey validation with Playwright integration
- ✅ **PHASE 6.8 CALENDAR & REPORTS COMPLETED**: All 21 components (5,500+ lines of code)
  - Complete financial reporting system with 10 specialized report types
  - Custom report builder and scheduled automation functionality
- ✅ **Perfect Git Workflow Compliance**: 42 total commits, ZERO violations maintained throughout
- ✅ **Tasks.md Current**: All completed tasks marked [x], Phase 7.1 100% complete, Phase 7.2 67% complete

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->