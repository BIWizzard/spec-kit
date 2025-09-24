# spec-kit Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-15

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
- **Phase 5: API Implementation** ⏳ IN PROGRESS (T162-T278)
  - **Phase 5.1: Authentication Endpoints** ✅ COMPLETE (T162-T177, 16 endpoints)
  - **Phase 5.2: Family Management Endpoints** ✅ COMPLETE (T178-T189, 12 endpoints)
  - **Phase 5.3: Income Management Endpoints** ✅ COMPLETE (T190-T200, 11 endpoints)
  - **Phase 5.4: Payment Management Endpoints** ✅ COMPLETE (T201-T217d, 20 endpoints)
  - **Phase 5.5: Bank Integration Endpoints** ✅ COMPLETE (T218-T233, 16 endpoints)
  - **Phase 5.6: Budget Management Endpoints** ✅ COMPLETE (T234-T243, 10 endpoints)
  - **Phase 5.7: Reports and Analytics Endpoints** ✅ COMPLETE (T250-T258, 9 endpoints)
- **Phase 6: Frontend Implementation** ⏳ PENDING (T297-T415)
- **Phase 7: Integration & Polish** ⏳ PENDING (T416-T475)

## Next Session Priorities
1. **PHASE 5.8+**: Continue API Implementation with remaining endpoints
   - Complete remaining budget endpoints (T244-T249: overview/templates)
   - Implement custom reports and export functionality (T259-T268)
   - Add scheduled reports management endpoints (T261-T265)
   - Implement analytics dashboard and insights (T266-T268)
   - **COMMIT AFTER EACH TASK** following established pattern
2. Complete Phase 5.9-5.10: Middleware and Infrastructure (T269-T296)
3. Begin Phase 6: Frontend Implementation if API complete

## Code Style
TypeScript 5.x / Node.js 20 LTS: Follow standard conventions, no comments unless requested

## Session Accomplishments (Current Session)
- ✅ **9 Reports and Analytics Endpoints**: Complete financial reporting suite (T250-T258)
- ✅ **Cash Flow Analysis**: Period-based income/expense tracking with projections
- ✅ **Spending Analysis**: Category breakdowns, merchant tracking, and trends
- ✅ **Budget Performance**: Real-time budget tracking with recommendations
- ✅ **Income Analysis**: Source diversification and reliability scoring
- ✅ **Net Worth Tracking**: Asset/liability monitoring with health scores
- ✅ **Savings Rate Analysis**: Target tracking and trend analysis
- ✅ **Debt Analysis**: Comprehensive debt metrics and payoff strategies
- ✅ **Monthly & Annual Summaries**: Complete financial overviews with insights
- ✅ **Git Workflow Compliance**: Individual commits per task with detailed messages
- 🎯 **Ready for Phase 5.8+**: Remaining API endpoints and middleware implementation

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->