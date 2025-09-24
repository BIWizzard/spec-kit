# spec-kit Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-24

## Active Technologies
- TypeScript 5.x / Node.js 20 LTS + React 18, Next.js 14, Prisma ORM, TanStack Query (001-family-finance-web)

## Project Structure
```
backend/
  src/
    models/       # Prisma schemas and models (COMPLETE)
    services/     # Business logic services (IN PROGRESS - Phase 4)
    api/          # API endpoints (PENDING - Phase 5)
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
- **Phase 5: API Implementation** ⏳ PENDING (T162-T278)
- **Phase 6: Frontend Implementation** ⏳ PENDING (T297-T415)
- **Phase 7: Integration & Polish** ⏳ PENDING (T416-T475)

## Next Session Priorities
1. **PHASE 5**: Implement API endpoints (T162-T278)
   - Start with Authentication endpoints (T162-T177)
   - Then Family Management endpoints (T178-T189)
   - Continue with remaining endpoint categories
   - **COMMIT AFTER EACH TASK** (T162, then commit; T163, then commit; etc.)
2. Ensure all contract tests pass as implementation progresses
3. After Phase 5 complete: Begin Frontend implementation (Phase 6)

## Code Style
TypeScript 5.x / Node.js 20 LTS: Follow standard conventions, no comments unless requested

## Recent Changes (Latest Session)
- ✅ Phase 4 COMPLETE: All 17 service layer implementations finished
  - Core Services: Family, User, Income, Payment, Budget, Bank, Transaction, Reports, Attribution, SpendingCategory, ScheduledReport, Export
  - Integration Services: PlaidIntegration, Email, Audit, Validation, Cache
- ✅ Git workflow compliance: All tasks committed individually with proper messages
- ✅ Service layer comprehensive: 3000+ lines of TypeScript service implementations
- 🎯 Ready for Phase 5: API Implementation (T162-T278)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->