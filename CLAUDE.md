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
- **Phase 3: API Contract Tests** ✅ COMPLETE (T027-T135a) - 8 major contract tests written and verified failing per TDD
- **Phase 4: Service Layer** 🚧 IN PROGRESS (T145-T161) - Next: Implement core services
- **Phase 5: API Implementation** ⏳ PENDING (T162-T278)
- **Phase 6: Frontend Implementation** ⏳ PENDING (T297-T415)
- **Phase 7: Integration & Polish** ⏳ PENDING (T416-T475)

## Next Session Priorities
1. **PRIORITY**: Implement core services in Phase 4 (T145-T161)
   - Start with: UserService, FamilyService, IncomeService, PaymentService
   - All services should use Prisma client and follow established patterns
2. After services complete: Implement API endpoints in Phase 5
3. Ensure all contract tests pass as implementation progresses

## Code Style
TypeScript 5.x / Node.js 20 LTS: Follow standard conventions, no comments unless requested

## Recent Changes
- Phase 3 TDD contract tests implemented and verified failing
- Database schema complete with all models and relationships
- Test infrastructure established with Jest + supertest + Prisma
- Ready for service layer implementation

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->