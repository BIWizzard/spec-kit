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
- **Phase 6: Frontend Implementation** ⏳ PENDING (T297-T415)
- **Phase 7: Integration & Polish** ⏳ PENDING (T416-T475)

## Next Session Priorities
1. **PHASE 5.6**: Continue API Implementation with Budget Management Endpoints (T234-T243)
   - Implement budget category CRUD operations
   - Add budget allocation and adjustment endpoints
   - Create reporting and analytics endpoints
   - **COMMIT AFTER EACH TASK** following established pattern
2. Continue sequential implementation through remaining Phase 5 categories
3. Ensure all contract tests pass as implementation progresses

## Code Style
TypeScript 5.x / Node.js 20 LTS: Follow standard conventions, no comments unless requested

## Session Accomplishments (Current Session)
- ✅ **16 Bank Integration Endpoints**: Complete banking and transaction management (T218-T233)
- ✅ **Bank Account Management**: CRUD operations for connected accounts with Plaid integration
- ✅ **Transaction Processing**: Comprehensive transaction listing, filtering, and categorization
- ✅ **Batch Operations**: Bulk transaction categorization and payment matching algorithms
- ✅ **Plaid Integration**: Link token creation and webhook handling for real-time updates
- ✅ **Advanced Analytics**: Uncategorized transaction identification and category suggestions
- ✅ **Sync Management**: Manual and automatic transaction synchronization across all accounts
- ✅ **Git Workflow Compliance**: 2 commits with proper messages and comprehensive implementation
- 🎯 **Ready for Phase 5.6**: Budget Management Endpoints starting with T234

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->