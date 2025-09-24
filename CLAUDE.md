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
- **Phase 5: API Implementation** ⏳ IN PROGRESS (T162-T298)
  - **Phase 5.1: Authentication Endpoints** ✅ COMPLETE (T162-T177, 16 endpoints)
  - **Phase 5.2: Family Management Endpoints** ✅ COMPLETE (T178-T189, 12 endpoints)
  - **Phase 5.3: Income Management Endpoints** ✅ COMPLETE (T190-T200, 11 endpoints)
  - **Phase 5.4: Payment Management Endpoints** ✅ COMPLETE (T201-T217d, 20 endpoints)
  - **Phase 5.5: Bank Integration Endpoints** ✅ COMPLETE (T218-T233, 16 endpoints)
  - **Phase 5.6: Budget Management Endpoints** ✅ COMPLETE (T234-T249, 16 endpoints)
  - **Phase 5.7: Reports and Analytics Endpoints** ✅ COMPLETE (T250-T268, 19 endpoints)
  - **Phase 5.8: Infrastructure Endpoints** ✅ COMPLETE (T269-T272, 4 endpoints)
  - **Phase 5.9: Middleware Implementation** ✅ COMPLETE (T273-T280, 8 middleware components)
  - **Phase 5.10: Deployment Infrastructure** 🔄 NEAR COMPLETE (T281-T294 ✅, T295-T298 pending, 4 remaining)
- **Phase 6: Frontend Implementation** ⏳ PENDING (T297-T415)
- **Phase 7: Integration & Polish** ⏳ PENDING (T416-T475)

## Next Session Priorities
1. **COMPLETE T295-T298**: Finish Phase 5.10 infrastructure (4 tasks: CDN config, rate limiting, testing pipeline, quality checks)
2. **BEGIN PHASE 6**: Frontend implementation (119 tasks: components, pages, state management)
3. **CRITICAL**: Every task MUST be committed immediately upon completion - ZERO TOLERANCE for violations
4. **MANDATORY**: Follow strict git workflow - implementation → commit → tasks.md update → commit → next task

## Code Style
TypeScript 5.x / Node.js 20 LTS: Follow standard conventions, no comments unless requested

## Session Accomplishments (Current Session)
- ✅ **Phase 5.10 Infrastructure MAJOR PROGRESS**: T289-T294 completed (6/10 tasks)
  - T289: Database backup strategy with encryption and S3 integration
  - T290: Comprehensive monitoring and logging (Vercel Analytics + structured backend logging)
  - T291: Complete Sentry error tracking integration (frontend + backend + profiling)
  - T292: Performance monitoring configuration (Web Vitals + system metrics + alerting)
  - T293: Production security configuration (comprehensive middleware + frontend security)
  - T294: SSL certificate and domain configuration (Let's Encrypt automation + DNS security)
- ✅ **Perfect Git Workflow Compliance**: 14 additional commits (33 total), ZERO violations
- ✅ **Tasks.md Maintained**: All completed tasks marked with [x], strict workflow followed
- ✅ **Production-Ready Infrastructure**: Monitoring, security, performance, SSL, backups all configured
- 🎯 **Next Session**: Complete T295-T298 (CDN, rate limiting, testing pipeline, quality checks) to finish Phase 5.10

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->