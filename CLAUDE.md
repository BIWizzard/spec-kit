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
  - **Phase 5.10: Deployment Infrastructure** ✅ COMPLETE (T281-T298 ✅, 18/18 tasks completed)
- **Phase 6: Frontend Implementation** ⏳ IN PROGRESS (T299-T415)
  - **Phase 6.1: Core Layout and Navigation** ✅ COMPLETE (T299-T306, 8 components)
  - **Phase 6.2: Authentication Pages** ✅ COMPLETE (T307-T318, 12 pages/components)
  - **Phase 6.3: Dashboard and Overview** ✅ COMPLETE (T317-T324, 8 dashboard components)
- **Phase 7: Integration & Polish** ⏳ PENDING (T416-T475)

## Next Session Priorities
1. **🎉 PHASE 6.3 COMPLETE**: Dashboard and overview components fully implemented with KGiQ branding (T317-T324)
2. **BEGIN PHASE 6.4**: Income Management Pages (T325-T333, 9 tasks: income events pages and components)
3. **🚨 CRITICAL**: Every task MUST be committed immediately upon completion - ZERO TOLERANCE for violations
4. **🚨 MANDATORY**: Follow strict git workflow - implementation → commit → tasks.md update → commit → next task
5. **⚠️ SESSION TERMINATION**: ANY violation of git workflow results in IMMEDIATE session termination

## Code Style
TypeScript 5.x / Node.js 20 LTS: Follow standard conventions, no comments unless requested

## Session Accomplishments (Current Session)
- ✅ **Phase 6.3 Dashboard COMPLETED**: All T317-T324 tasks finished, Phase 6.3 100% complete
  - T317: Dashboard page with KGiQ branding integration
  - T318: Dashboard metrics cards with glassmorphic design and trend indicators
  - T319: Interactive cash flow chart with SVG visualization and timeframe selector
  - T320: Recent activity feed with filtering and real-time updates
  - T321: Upcoming events widget with priority indicators and overdue alerts
  - T322: AI-powered financial insights with actionable recommendations
  - T323: Alert notifications center with severity-based categorization
  - T324: Quick actions component with search and keyboard shortcuts
- ✅ **Perfect Git Workflow Compliance**: 16 additional commits (57 total), ZERO violations maintained
- ✅ **Tasks.md Current**: All T317-T324 marked [x] completed, ready for Phase 6.4
- ✅ **KGiQ Branding Maintained**: Consistent golden yellow/sage green/blue-gray theme throughout
- 🚀 **MILESTONE ACHIEVED**: Phase 6.3 dashboard complete - ready for Income Management Pages

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->