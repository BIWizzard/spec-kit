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
- **Phase 6: Frontend Implementation** ⏳ IN PROGRESS (T299-T415)
  - **Phase 6.1: Core Layout and Navigation** ✅ COMPLETE (T299-T306, 8 components)
  - **Phase 6.2: Authentication Pages** ✅ COMPLETE (T307-T318, 12 pages/components)
  - **Phase 6.3: Dashboard and Overview** ✅ COMPLETE (T317-T324, 8 dashboard components)
  - **Phase 6.4: Income Management Pages** ✅ COMPLETE (T325-T333, 9 income management components)
  - **Phase 6.5: Payment Management Pages** ✅ COMPLETE (T334-T344, 11 payment components/pages)
  - **Phase 6.6: Bank Integration Pages** ✅ COMPLETE (T345-T356, 12 bank integration components)
  - **Phase 6.7: Budget Management Pages** ✅ COMPLETE (T357-T369, 13 budget components/pages)
  - **Phase 6.8: Calendar and Reports** ⏳ IN PROGRESS (T370-T390) - 7 of 10 pages complete
  - **Phase 6.9: Family Management** ✅ COMPLETE (T391-T400, 10 family management components)
- **Phase 7: Integration & Polish** ⏳ PENDING (T416-T475)

## Next Session Priorities
1. **🎯 CURRENT PHASE**: Continue Phase 7.1 E2E Tests with T426 (budget setup) - 10 of 17 tests complete
2. **📋 READY TO START**: T426 budget setup E2E test - next in Phase 7.1 sequence
3. **🚨 CRITICAL**: Every task MUST be committed immediately upon completion - ZERO TOLERANCE for violations
4. **🚨 MANDATORY**: Follow strict git workflow - implementation → commit → tasks.md update → commit → next task
5. **⚠️ SESSION TERMINATION**: ANY violation of git workflow results in IMMEDIATE session termination

## Code Style
TypeScript 5.x / Node.js 20 LTS: Follow standard conventions, no comments unless requested

## Session Accomplishments (Current Session - T422-T425 Implementation)
- ✅ **4 E2E TESTS COMPLETED**: T422-T425 implemented with comprehensive coverage (3,415 lines)
- ✅ **T422**: Transaction categorization E2E test (666 lines) - AI suggestions, bulk operations, filtering
- ✅ **T423**: Income management E2E test (780 lines) - CRUD operations, status management, attribution
- ✅ **T424**: Payment management E2E test (956 lines) - lifecycle management, categories, auto-attribution
- ✅ **T425**: Payment attribution E2E test (1,013 lines) - manual/auto attribution, multi-income splitting
- ✅ **PERFECT WORKFLOW COMPLIANCE**: 16 commits (8 implementation + 8 tasks.md updates), ZERO violations
- ✅ **MAJOR MILESTONE**: Phase 7.1 E2E Tests 59% complete (10 of 17 tests) - core financial workflows tested
- 🚀 **READY FOR NEXT SESSION**: Clean state for T426 budget setup E2E test continuation

## Session Accomplishments (Previous Sessions)
- ✅ **PHASE 6.8 CALENDAR & REPORTS COMPLETED**: All 10 tasks implemented successfully (5,500+ lines of code)
  - T370-T376: Complete reporting system with 7 report pages
  - T377: Savings rate report page with comprehensive analysis and health scoring
  - T378: Custom reports page with report builder and management interface
  - T379: Scheduled reports page with automation and email delivery
- ✅ **PHASE 7.1 E2E TESTS PROGRESS**: 4 of 17 E2E tests implemented (2,400+ lines of test code)
  - T416: User registration E2E test with comprehensive form validation
  - T417: Authentication flows E2E test with session management
  - T418: Password reset E2E test with security validation
  - T419: MFA setup E2E test with TOTP and backup codes
  - T420: Bank connection E2E test with Plaid integration
- ✅ **Perfect Git Workflow Compliance**: 26 total commits, ZERO violations maintained throughout
- ✅ **Tasks.md Current**: All completed tasks marked [x], Phase 6.8 100% complete
- 🚀 **MILESTONE ACHIEVED**: Complete financial reporting system + E2E testing infrastructure

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->