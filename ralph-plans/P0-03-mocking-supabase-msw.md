# P0-03: Mock Supabase API with MSW

**Priority**: P0 - Foundation
**Estimated Time**: 3-4 hours
**Prerequisites**: P0-01, P0-02
**Status**: NOT STARTED

## Implementation Tracker

- [ ] IMPLEMENTED: Create MSW setup infrastructure
- [ ] IMPLEMENTED: Create listing handlers (GET/POST/PATCH/DELETE)
- [ ] IMPLEMENTED: Create proposal handlers (GET/POST)
- [ ] IMPLEMENTED: Create fixtures (listings, proposals, users)
- [ ] IMPLEMENTED: Test SearchPage with MSW
- [ ] IMPLEMENTED: Test error scenarios (500, 400)

**IMPLEMENTATION STATUS**: ⬜ NOT IMPLEMENTED

## Files to Create

1. app/test-utilities/msw/setup.ts
2. app/test-utilities/msw/handlers/listing.handlers.ts
3. app/test-utilities/msw/handlers/proposal.handlers.ts
4. app/test-utilities/msw/fixtures/listings.fixture.ts
5. app/test-utilities/msw/fixtures/proposals.fixture.ts
6. app/src/islands/pages/SearchPage.test.jsx (sample test)

**MARK AS**: ✅ IMPLEMENTED when all files created and SearchPage test passes.

## Next: P0-04 mocking-auth-context
