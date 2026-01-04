# Functional Design Architecture Report

**Generated**: 2026-01-04
**Scope**: Complete codebase analysis for functional design improvements
**Analysis Method**: 5 parallel subagent exploration with synthesis

---

## Executive Summary

This comprehensive architectural review analyzed the Split Lease codebase across 5 dimensions:
1. **Project Structure & Build System**
2. **Frontend Component Patterns**
3. **Four-Layer Logic Architecture**
4. **Supabase Edge Functions Backend**
5. **Data Fetching & State Management**

### Overall Assessment

The codebase demonstrates **strong architectural foundations** with well-documented patterns including:
- Islands Architecture with Hollow Component Pattern
- Four-Layer Logic Architecture (calculators → rules → processors → workflows)
- Action-based Edge Functions with queue-based sync
- NO FALLBACK philosophy for authentic error handling

However, **functional design improvements** are needed in several areas where patterns are inconsistently applied or could be more purely functional.

### Key Metrics

| Area | Compliance | Critical Issues |
|------|------------|-----------------|
| Hollow Component Pattern | 70% | 2 pages with 1,700+ lines of embedded logic |
| Four-Layer Logic Purity | 85% | 4 rules returning non-booleans |
| Edge Function Consistency | 75% | 6 different handler signature patterns |
| Data Fetching Patterns | 80% | Imperative patterns, no dedicated transformation layer |

---

## Section 1: Critical Architectural Violations

### 1.1 React Hook in Logic Layer (CRITICAL)

**File**: [rules/proposals/useProposalButtonStates.js](app/src/logic/rules/proposals/useProposalButtonStates.js)

**Issue**: A React hook (using `useMemo`) exists in the `logic/rules/` directory, violating the separation between pure business logic and React component lifecycle.

**Impact**:
- Logic layer should be framework-agnostic
- Cannot be tested without React
- Violates functional programming principles

**Recommendation**: Move to `app/src/islands/shared/hooks/useProposalButtonStates.js` or create a pure function that the hook wraps.

---

### 1.2 Massive Component with No Logic Hook (CRITICAL)

**File**: [FavoriteListingsPage.jsx](app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx) - **1,763 lines**

**Issue**: Contains all business logic inline:
- ~40 state variables
- Data fetching in component
- Proposal submission logic (150+ lines)
- Photo gallery state management
- Multiple inline sub-components (PropertyCard at 370 lines)

**Impact**:
- Violates Hollow Component Pattern
- Untestable business logic
- Difficult to maintain

**Recommendation**: Extract `useFavoriteListingsPageLogic.js` hook and split PropertyCard to separate file.

---

### 1.3 Unused Logic Hook (HIGH)

**File**: [ViewSplitLeasePage.jsx](app/src/islands/pages/ViewSplitLeasePage.jsx)

**Issue**: Hook file `useViewSplitLeasePageLogic.js` EXISTS but is NOT USED. The page has ~150 lines of inline helper functions duplicating what should be in the hook.

**Recommendation**: Refactor to actually use the existing hook.

---

### 1.4 Non-Boolean Returns in Rules Layer (HIGH)

**Files**:
- [proposalRules.js](app/src/logic/rules/proposals/proposalRules.js): `getCancelButtonText()` returns string
- [virtualMeetingRules.js](app/src/logic/rules/proposals/virtualMeetingRules.js): `getVMButtonText()`, `getVMButtonStyle()`, `getVMStateInfo()` return strings/objects
- [determineProposalStage.js](app/src/logic/rules/proposals/determineProposalStage.js): Returns number (1-6)

**Issue**: Rules layer should only contain boolean predicates (`is*`, `can*`, `has*`, `should*`). These functions perform data transformation.

**Recommendation**: Move to `processors/proposals/` directory.

---

## Section 2: Structural Inconsistencies

### 2.1 Handler Signature Inconsistency (Edge Functions)

**Current Patterns**:
| Pattern | Functions Using |
|---------|-----------------|
| `handler(payload)` | listing/* |
| `handler(payload, user, supabase)` | proposal/* |
| `handler(supabase, payload, user)` | messages/* |
| `handler(supabaseUrl, supabaseKey, payload)` | auth-user/* |
| `handler(supabase, bubbleConfig, payload)` | bubble_sync/* |

**Recommendation**: Standardize on `handler(payload, context)` where context = `{ supabase, user?, config? }`.

---

### 2.2 Directory Naming Inconsistency

| Location | Issue |
|----------|-------|
| `proposal/actions/` | Only function using "actions" instead of "handlers" |
| `processors/proposal/` + `processors/proposals/` | Duplicate directories |

**Recommendation**:
- Rename `proposal/actions/` to `proposal/handlers/`
- Consolidate `processors/proposal/` and `processors/proposals/`

---

### 2.3 Mount Point ID Inconsistency (Frontend)

| Pattern | Files |
|---------|-------|
| `document.getElementById('{page}-page')` | Most pages |
| `document.getElementById('root')` | account-profile.jsx |

**Recommendation**: Standardize all entry points to use consistent mount ID pattern.

---

### 2.4 Vite Config Hardcoded Inputs

**File**: [vite.config.js](app/vite.config.js)

**Issue**: Route registry exports `buildRollupInputs()` function, but vite.config.js hardcodes 27 inputs manually instead of using it.

**Recommendation**: Replace hardcoded inputs with `buildRollupInputs()` call.

---

## Section 3: Code Duplication Opportunities

### 3.1 Supabase Client Initialization (Edge Functions)

**Duplicated in**: 10+ files across Edge Functions

```typescript
// Pattern repeated everywhere
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
```

**Recommendation**: Create `_shared/supabaseClient.ts`:
```typescript
export function createServiceClient(): SupabaseClient { ... }
```

---

### 3.2 Environment Variable Validation (Edge Functions)

**Duplicated in**: Every Edge Function

```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL');
if (!supabaseUrl) throw new Error('Missing...');
```

**Recommendation**: Create `_shared/config.ts`:
```typescript
export function getRequiredEnv(...keys: string[]) { ... }
```

---

### 3.3 Authentication Validation (Edge Functions)

**Duplicated in**: proposal, messages, ai-gateway (with slight variations)

```typescript
const authHeader = req.headers.get("Authorization");
// ... 10+ lines of validation
```

**Recommendation**: Create `_shared/auth.ts`:
```typescript
export async function authenticateRequest(req: Request): Promise<User | null> { ... }
```

---

### 3.4 Duplicate Workflow Files

**Files**:
- `booking/cancelProposalWorkflow.js`
- `proposals/cancelProposalWorkflow.js`

**Recommendation**: Consolidate into single file.

---

## Section 4: Functional Design Improvements

### 4.1 Imperative Data Fetching → Declarative

**Current Pattern** (scattered across logic hooks):
```javascript
useEffect(() => {
  setLoading(true);
  try {
    const data = await fetchData();
    setState(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [deps]);
```

**Functional Alternative**: Create reusable `useAsync` hook or adopt SWR/React Query

```javascript
const { loading, data, error } = useAsync(() => fetchData(), [deps]);
```

**Files Affected**: All `use*PageLogic.js` files

---

### 4.2 Mixed Side Effects → Isolated Effects

**Current Pattern**: Data transformation mixed with state updates
```javascript
const transformed = listings.map(transform);
setAllListings(transformed); // Side effect mixed with pure transform
```

**Functional Alternative**: Separate pure transformations from effects
```javascript
const processListings = pipe(mapListings, filterByCoordinates, sortByScore);
// Effect isolated
useEffect(() => fetchRaw().then(processListings).then(setState), [filters]);
```

---

### 4.3 Exception-Based → Result Types

**Current Pattern**: Try/catch with thrown errors
```javascript
try {
  const data = await fetch();
  return data;
} catch (err) {
  setError(err.message);
  return null;
}
```

**Functional Alternative**: Explicit Result types
```javascript
const Ok = value => ({ ok: true, value });
const Err = error => ({ ok: false, error });

// Fetcher returns Result
async function fetchListing(id) {
  const { data, error } = await supabase.from('listing').select('*').eq('_id', id);
  return error ? Err(error.message) : Ok(data);
}
```

---

### 4.4 Missing Data Transformation Layer

**Current Pattern**: Transformations scattered in fetcher functions

**Recommendation**: Centralize in `logic/processors/`:
```javascript
// app/src/logic/processors/listing/transformListingData.js
export function transformListingData(rawListing, lookups) {
  return {
    id: rawListing._id,
    name: rawListing.Name,
    location: resolveLocation(rawListing, lookups),
    amenities: resolveAmenities(rawListing, lookups),
    // Consistent structure
  };
}
```

---

### 4.5 Calculator Naming Convention

**File**: [shiftMoveInDateIfPast.js](app/src/logic/calculators/scheduling/shiftMoveInDateIfPast.js)

**Issue**: Uses `shift*` prefix instead of `calculate*` or `get*`

**Recommendation**: Rename to `calculateNextValidMoveInDate`

---

## Section 5: Priority Refactoring Roadmap

### Phase 1: Critical Fixes (Week 1)

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Move `useProposalButtonStates.js` out of logic layer | 1 hour |
| P0 | Extract `useFavoriteListingsPageLogic.js` hook | 4 hours |
| P0 | Connect `ViewSplitLeasePage` to its existing hook | 2 hours |
| P1 | Move non-boolean functions from rules to processors | 2 hours |
| P1 | Rename `proposal/actions/` to `proposal/handlers/` | 30 min |

### Phase 2: Standardization (Week 2)

| Priority | Task | Effort |
|----------|------|--------|
| P1 | Standardize Edge Function handler signatures | 4 hours |
| P1 | Create `_shared/supabaseClient.ts` | 1 hour |
| P1 | Create `_shared/config.ts` for env validation | 1 hour |
| P1 | Create `_shared/auth.ts` for auth validation | 2 hours |
| P2 | Standardize entry point mount IDs | 1 hour |
| P2 | Use `buildRollupInputs()` in vite.config.js | 30 min |

### Phase 3: Functional Patterns (Week 3+)

| Priority | Task | Effort |
|----------|------|--------|
| P2 | Create `useAsync` hook for declarative data fetching | 2 hours |
| P2 | Centralize data transformations in processors | 4 hours |
| P3 | Consolidate duplicate workflows | 2 hours |
| P3 | Add cache invalidation to dataLookups.js | 2 hours |
| P3 | Consider Result type pattern for error handling | 4 hours |

---

## Section 6: Positive Patterns to Preserve

### Frontend
1. **Hollow Component Pattern** - When properly implemented (HostOverviewPage, MessagingPage)
2. **Route Registry** - Single source of truth for routing
3. **NO FALLBACK philosophy** - Authentic error handling

### Logic Layer
1. **Strict input validation** in calculators with descriptive errors
2. **Named parameter objects** (`{ nightlyRate, frequency }`)
3. **JSDoc documentation** with `@intent`, `@rule`, `@example`
4. **Constants centralization** in `logic/constants/`
5. **Composition over inheritance** in workflows

### Backend
1. **Action-based Edge Functions** - Clean API design
2. **Queue-based sync** - Resilient Bubble.io integration
3. **Error collection pattern** - Consolidated Slack reporting
4. **CORS handling** - Consistent across all functions

---

## Section 7: Related Analysis Documents

This report synthesizes findings from the following detailed analyses:

| Document | Focus Area |
|----------|------------|
| [20260104024828-project-architecture-analysis.md](.claude/plans/Documents/20260104024828-project-architecture-analysis.md) | Project structure, routing, build system |
| [20260104120000-frontend-architecture-analysis.md](.claude/plans/Documents/20260104120000-frontend-architecture-analysis.md) | Component patterns, hooks, state management |
| [20260104024914-four-layer-logic-architecture-analysis.md](.claude/plans/Documents/20260104024914-four-layer-logic-architecture-analysis.md) | Calculator/rule/processor/workflow layers |
| [20260104143500-supabase-edge-functions-architectural-analysis.md](.claude/plans/Documents/20260104143500-supabase-edge-functions-architectural-analysis.md) | Edge Functions patterns |
| [20260104153000-data-fetching-analysis.md](.claude/plans/Documents/20260104153000-data-fetching-analysis.md) | Data fetching, caching, error handling |

---

## Conclusion

The Split Lease codebase has strong architectural foundations but would benefit from:

1. **Enforcing existing patterns** - Several pages don't follow the Hollow Component Pattern that others exemplify
2. **Standardizing signatures** - Edge Functions use 6 different handler patterns
3. **Separating concerns** - React hooks don't belong in the logic layer
4. **Adopting functional patterns** - Declarative data fetching, isolated effects, Result types

Implementing these changes will improve testability, maintainability, and align the codebase with functional programming principles.

---

**VERSION**: 1.0
**AUTHOR**: Claude Code Architecture Analysis
**COMMIT**: To be committed after review
