# Edge Function Functional Programming Refactoring Plan

**Date**: 2026-01-06
**Classification**: CLEANUP
**Scope**: Refactor Supabase Edge Functions toward functional programming purity
**Priority**: High (improves testability, predictability, maintainability)

---

## Executive Summary

The Split Lease Edge Functions codebase has a strong foundation with clear architectural patterns. However, several patterns violate functional programming principles:

1. **Mutation patterns** in data transformation
2. **Mixed concerns** (I/O + business logic not properly separated)
3. **Exception-based error handling** (should use Result/Either types)
4. **Imperative loops** instead of declarative transformations
5. **Hidden side effects** in pure-looking functions

---

## Current State Analysis

### Strengths (Already FP-compliant)

- Explicit dependencies (BubbleSyncService constructor)
- Typed error classes (errors.ts)
- Pure validation functions
- Immutable responses in read operations
- Fire-and-forget I/O (slack.ts)
- Clear imperative shell pattern (queueSync.ts)

### Gaps (Not Yet FP)

| Issue | File(s) | Impact | Effort |
|-------|---------|--------|--------|
| Mutation in field filtering | queueSync.ts | Medium | Low |
| Mixed concerns in sync service | bubbleSync.ts | High | Medium |
| Imperative loops | queueManager.ts | Medium | Low |
| Exception-as-control-flow | validation.ts | Medium | Medium |
| Implicit async side effects | handlers | Medium | Medium |
| Object mutation | transformer.ts | Medium | Low |

---

## Refactoring Phases

### Phase 1: Utility Layer (2-3h, Low Risk)

**1.1 Create Result Type** (`_shared/result.ts`)
- Implement Result<T, E> with ok, err, match, map, andThen, getOrElse
- Enables error-as-values pattern

**1.2 Create Immutable Utilities** (`_shared/immutable.ts`)
- updateRecord, filterFields, omitFields, pickFields
- Centralizes immutable patterns

**1.3 Create Logger Utilities** (`_shared/logger.ts`)
- Pure logging functions for chaining
- No side effects on core logic

---

### Phase 2: Shared Utilities (4-5h, Medium Risk)

**2.1 Refactor validation.ts**
- Replace throws with Result return types
- Add composable predicates
- Batch validation support

**2.2 Refactor errors.ts**
- Add error composition utilities
- Error accumulation for batch operations

**2.3 Refactor queueSync.ts**
- Use immutable utilities
- Extract key generation to pure function
- Add type-safe queue builders

---

### Phase 3: Bubble Sync Service (5-6h, High Risk)

**3.1 Separate Concerns in BubbleSyncService**
- Extract pure workflow logic from HTTP I/O
- Create thin HTTP wrapper (Imperative Shell)
- Compose pure logic with I/O effects

**3.2 Create Atomic Sync Workflow** (`_shared/atomicSync.ts`)
- Pure atomic sync state machine (no I/O)
- Step-based composition

**3.3 Create HTTP Client Adapter** (`_shared/httpClient.ts`)
- Separate pure HTTP request building from I/O execution
- Reusable for any HTTP-based service

---

### Phase 4: Handler Framework (3-4h, Medium Risk)

**4.1 Create Handler Framework** (`_shared/handlers.ts`)
- Pure handler type: FPHandler<Req, Res>
- Middleware composer
- Validation middleware
- Auth middleware

**4.2 Refactor Sample Handlers**
- Extract validation to pure functions
- Extract calculations to pure functions
- Keep I/O at edges
- Use Result composition

---

### Phase 5: Complex Utilities (3-4h, Medium Risk)

**5.1 Refactor bubble_sync/lib/transformer.ts**
- Extract pure transformation functions
- Use declarative field mapping
- Create type-safe field transformers

**5.2 Refactor bubble_sync/lib/queueManager.ts**
- Replace loops with declarative operations
- Create query builders
- Extract status transitions to pure functions

---

### Phase 6: Integration & Testing (2-3h, Low Risk)

- Update handler entry points
- Add type guards
- Create testing utilities
- Manual testing of all edge functions

---

## Implementation Timeline

**Week 1: Foundation**
- Phase 1.1-1.3: Create utility modules (5h)
- Phase 2.1: Refactor validation.ts (2h)
- Commit: "refactor(shared): add FP utilities (result, immutable, logger)"

**Week 2: Core Utilities**
- Phase 2.2-2.3: Refactor errors and queueSync (4h)
- Phase 3.1: Extract bubbleSync concerns (3h)
- Commit: "refactor(shared): apply FP patterns to utilities"

**Week 3: Sync Service & HTTP**
- Phase 3.2-3.3: Create atomicSync and httpClient (4h)
- Refactor bubbleSync to use new modules (2h)
- Commit: "refactor(services): separate I/O concerns in bubble sync"

**Week 4: Handlers & Complex Logic**
- Phase 4.1-4.2: Create handler framework (4h)
- Phase 5.1-5.2: Refactor transformers (4h)
- Commit: "refactor(handlers): apply FP patterns to request handlers"

**Week 5: Integration & Verification**
- Phase 6: Integration and testing (7h)
- Manual testing of all edge functions
- Commit: "test(edge-functions): FP refactoring complete and verified"

---

## Success Criteria

### Code Quality
- Zero mutations in core logic (verified via code review)
- All pure functions testable without mocks
- All imperative loops replaced with declarative operations
- All I/O segregated to imperative shell
- Error handling uses Result types (no throwing for expected errors)

### Integration
- All existing API contracts maintain backward compatibility
- All handlers return Result types through composition chain
- Error collection still works (Slack notifications)
- Queue sync fires-and-forgets asynchronously
- BubbleSyncService maintains atomic guarantees

### Testing
- Pure functions testable without HTTP/DB mocks
- Handler composition testable in isolation
- Error paths tested without side effects
- Type safety increased (Result chaining enforces error handling)

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Breaking API contracts | High | Maintain request/response format, update internals only |
| Result type proliferation | Medium | Standardize patterns, create middleware |
| Over-abstraction | Medium | Keep sensible concrete types |
| Async/Result awkwardness | Medium | Create async Result helpers |
| Performance regression | Low | Benchmark before/after |

---

## Files Affected

### New Files
- supabase/functions/_shared/result.ts
- supabase/functions/_shared/immutable.ts
- supabase/functions/_shared/logger.ts
- supabase/functions/_shared/handlers.ts
- supabase/functions/_shared/atomicSync.ts
- supabase/functions/_shared/httpClient.ts

### Modified Files
- supabase/functions/_shared/validation.ts
- supabase/functions/_shared/errors.ts
- supabase/functions/_shared/queueSync.ts
- supabase/functions/_shared/bubbleSync.ts
- supabase/functions/bubble_sync/lib/transformer.ts
- supabase/functions/bubble_sync/lib/queueManager.ts
- supabase/functions/proposal/actions/create.ts
- supabase/functions/listing/handlers/create.ts
- All bubble-proxy handlers

### Unchanged
- supabase/functions/_shared/cors.ts
- supabase/functions/_shared/slack.ts
- supabase/functions/_shared/openai.ts

---

## Next Steps

1. Review this plan with team
2. Start Phase 1 (foundation utilities) - minimal risk
3. Gather feedback on Result type API design
4. Proceed with Phase 2 once foundation is stable
5. Plan integration testing approach

---

**PLAN_VERSION**: 1.0
**CREATED**: 2026-01-06
**STATUS**: Ready for Implementation
