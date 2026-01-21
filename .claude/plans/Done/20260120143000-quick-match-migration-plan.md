# Quick Match Migration Plan

**Date:** 2026-01-20
**Type:** Feature Migration
**Source:** https://github.com/splitleasesharath/_quick-match.git
**Target:** Split Lease Monorepo (Islands Architecture)
**Status:** PLANNING

---

## Executive Summary

Migrate the **Quick Match** internal tool from a standalone Next.js 14 application to the Split Lease monorepo's Islands Architecture. This tool enables corporate operators to match guest proposals against alternative listings using a 7-criteria heuristic scoring system.

---

## Source Application Analysis

### Technology Stack (Current)
| Layer | Technology | Migration Target |
|-------|------------|------------------|
| Framework | Next.js 14 (App Router) | React 18 + Vite (Islands) |
| Language | TypeScript | JavaScript (project standard) |
| Styling | TailwindCSS | CSS Modules + existing styles |
| State | React Query (TanStack) | Local state + custom hooks |
| HTTP | Axios | fetch + Edge Functions |
| Maps | Google Maps API | Existing GoogleMap component |
| Images | Imgix (react-imgix) | Existing Imgix integration |

### Features to Migrate
1. **Proposal Summary Panel** - Display guest profile and original listing
2. **Candidate Listings Grid** - Filterable grid of alternative listings
3. **Match Heuristics Engine** - 7-criteria scoring algorithm
4. **Filter Controls** - Borough, duration, search filters
5. **Proposal Choice Modal** - Selection confirmation workflow
6. **Google Maps Integration** - Location visualization

---

## Architecture Mapping

### File Structure Transformation

```
NEXT.JS (Source)                          SPLIT LEASE (Target)
═══════════════════════════════════════════════════════════════════════════

src/app/quick-match/page.tsx         →    app/src/islands/pages/QuickMatchPage.jsx
                                          app/src/islands/pages/useQuickMatchPageLogic.js

src/components/                      →    app/src/islands/shared/QuickMatch/
  ProposalSummary.tsx                →      ProposalSummary.jsx
  CandidateListingsGrid.tsx          →      CandidateListingsGrid.jsx
  ListingCard.tsx                    →      QuickMatchListingCard.jsx (avoid collision)
  FilterControls.tsx                 →      QuickMatchFilters.jsx
  ProposalChoicePanel.tsx            →      ProposalChoiceModal.jsx (→ modals/)
  GoogleMap.tsx                      →      (use existing GoogleMap.jsx)

src/hooks/                           →    (absorbed into useQuickMatchPageLogic.js)
  useProposal.ts
  useCandidateListings.ts
  useProposalChoice.ts

src/lib/matchHeuristics.ts           →    app/src/logic/calculators/matching/
                                            calculateMatchScore.js
                                            calculateMatchHeuristics.js

src/types/index.ts                   →    (inline JSDoc or TypeScript interfaces)

src/app/api/proposals/[id]/          →    supabase/functions/quick-match/
  route.ts                           →      index.ts (action: get_proposal)
  candidate-listings/route.ts        →      index.ts (action: search_candidates)
  choice/route.ts                    →      index.ts (action: save_choice)
```

### Entry Point Setup

```
app/public/quick-match.html          # New HTML shell
app/src/quick-match.jsx              # New entry point
app/src/islands/pages/QuickMatchPage.jsx
app/src/islands/pages/useQuickMatchPageLogic.js
```

---

## Discrepancies & Required Fixes

### 1. **Framework Differences**

| Aspect | Next.js Pattern | Split Lease Pattern | Action Required |
|--------|-----------------|---------------------|-----------------|
| Routing | App Router (`/quick-match/page.tsx`) | HTML + Entry Point + routes.config.js | Create 3 files + register route |
| API Routes | `/api/proposals/[id]/route.ts` | Edge Functions with action pattern | Create single Edge Function |
| Data Fetching | React Query + Axios | fetch + custom hooks | Remove React Query, use fetch |
| TypeScript | Full TypeScript | JavaScript + JSDoc | Convert to JS or add to tsconfig |
| Styling | TailwindCSS classes | CSS Modules/existing CSS | Convert Tailwind → CSS |

### 2. **State Management Differences**

```javascript
// NEXT.JS (React Query)
const { data: proposal, isLoading } = useQuery({
  queryKey: ['proposal', proposalId],
  queryFn: () => fetchProposal(proposalId)
});

// SPLIT LEASE (Custom Hook)
const [proposal, setProposal] = useState(null);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  async function load() {
    setIsLoading(true);
    const data = await fetchProposalFromEdgeFunction(proposalId);
    setProposal(data);
    setIsLoading(false);
  }
  load();
}, [proposalId]);
```

### 3. **API Pattern Transformation**

```javascript
// NEXT.JS (Multiple API routes)
GET /api/proposals/[id]
GET /api/proposals/[id]/candidate-listings?same_borough=true&min_nights=6
POST /api/proposals/[id]/choice

// SPLIT LEASE (Single Edge Function with actions)
POST /functions/v1/quick-match
{
  "action": "get_proposal",
  "payload": { "proposal_id": "abc123" }
}

POST /functions/v1/quick-match
{
  "action": "search_candidates",
  "payload": {
    "proposal_id": "abc123",
    "same_borough": true,
    "min_nights": 6,
    "search_text": "",
    "page": 1
  }
}

POST /functions/v1/quick-match
{
  "action": "save_choice",
  "payload": {
    "proposal_id": "abc123",
    "listing_id": "xyz789",
    "notes": "Best match for duration"
  }
}
```

### 4. **Database Schema Mapping**

The quick-match app uses mock data. We need to map to actual Supabase tables:

| Quick-Match Model | Supabase Table | Notes |
|-------------------|----------------|-------|
| `Proposal` | `proposal` | Existing table |
| `Listing` | `listing` | Existing table |
| `User` (guest) | `rentalapplication` | Join via proposal.renter_id |
| `User` (host) | `rentalapplication` | Join via listing.host_id |
| `ProposalChoice` | `proposal_match` | **NEW TABLE REQUIRED** |
| `CandidateListing` | (computed) | listing + calculated heuristics |

### 5. **Match Heuristics Adaptation**

The heuristics engine needs to use Split Lease's actual data fields:

```javascript
// ORIGINAL HEURISTICS (quick-match)
{
  price_drop: listing.price_per_stay < listing.previous_price,
  responsive_landlord: host.response_rate >= 90 || host.average_response_time < 24,
  duration_match: Math.abs(listing.default_min_nights - proposal.nights_selected) <= 1,
  seven_nights_possible: listing.default_min_nights <= 7 && listing.max_nights >= 7,
  close_in_price: Math.abs(listing.price - proposal.listing.price) <= proposal.listing.price * 0.15,
  overlapping_nights: hasOverlappingAvailability(listing, proposal),
  interesting_borough: isInterestingBorough(listing.borough, proposal.listing.borough)
}

// ADAPTED HEURISTICS (Split Lease fields)
{
  price_drop: listing.price_per_stay < listing.previous_price_per_stay, // Need to add field
  responsive_landlord: host.response_rate >= 90, // May not exist - check schema
  duration_match: Math.abs(listing.min_nights - proposal.nights) <= 1,
  seven_nights_possible: listing.min_nights <= 7, // max_nights may not exist
  close_in_price: calculatePriceProximity(listing, proposal) <= 0.15,
  overlapping_nights: checkScheduleOverlap(listing.schedule, proposal.schedule),
  interesting_borough: isHighDemandBorough(listing.borough_id)
}
```

### 6. **Day Indexing Compliance**

Split Lease uses 0-based day indexing (JS standard). Ensure schedule overlap calculations use this:

```javascript
// CORRECT - Using Split Lease's day utilities
import { DAYS } from 'lib/constants.js';
import { isDateBlocked } from 'logic/rules/schedule/isDateBlocked.js';

// Check availability overlap using existing utilities
const hasOverlap = proposal.requested_days.some(day =>
  !isDateBlocked(listing.schedule, day)
);
```

### 7. **Styling Transformation**

```css
/* TAILWIND (quick-match) */
<div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">

/* CSS MODULES (Split Lease) */
/* app/src/styles/components/quick-match.css */
.listing-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-4);
  transition: box-shadow 0.2s ease;
}
.listing-card:hover {
  box-shadow: var(--shadow-lg);
}
```

### 8. **Authentication Integration**

```javascript
// QUICK-MATCH (placeholder)
const user = await getCurrentUser(); // Not implemented
if (!user?.isCorporate) {
  return { error: 'Unauthorized' };
}

// SPLIT LEASE (actual implementation)
import { supabase } from 'lib/supabase.js';
import { checkAuthStatus } from 'lib/auth.js';

// In Edge Function
const authHeader = req.headers.get('Authorization');
const { data: { user }, error } = await supabase.auth.getUser(
  authHeader?.replace('Bearer ', '')
);

// Check corporate role (may need to add role field)
const { data: profile } = await supabase
  .from('rentalapplication')
  .select('is_corporate')
  .eq('user_id', user.id)
  .single();

if (!profile?.is_corporate) {
  return new Response(JSON.stringify({
    success: false,
    error: 'Corporate access required'
  }), { status: 403 });
}
```

---

## New Database Requirements

### New Table: `proposal_match`

```sql
-- Migration: create_proposal_match_table
CREATE TABLE proposal_match (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposal(id) ON DELETE CASCADE,
  matched_listing_id UUID NOT NULL REFERENCES listing(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_heuristics JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  selected_by UUID REFERENCES auth.users(id),
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_proposal_match_proposal ON proposal_match(proposal_id);
CREATE INDEX idx_proposal_match_listing ON proposal_match(matched_listing_id);

-- RLS Policies (corporate users only)
ALTER TABLE proposal_match ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corporate users can view all matches"
  ON proposal_match FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rentalapplication
      WHERE user_id = auth.uid() AND is_corporate = true
    )
  );

CREATE POLICY "Corporate users can insert matches"
  ON proposal_match FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rentalapplication
      WHERE user_id = auth.uid() AND is_corporate = true
    )
  );
```

### Schema Modifications

```sql
-- Add fields to listing table if not present
ALTER TABLE listing ADD COLUMN IF NOT EXISTS previous_price_per_stay NUMERIC;
ALTER TABLE listing ADD COLUMN IF NOT EXISTS max_nights INTEGER;

-- Add corporate flag to rentalapplication if not present
ALTER TABLE rentalapplication ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT false;
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1)
1. Create route entry in `routes.config.js`
2. Create HTML shell (`app/public/quick-match.html`)
3. Create entry point (`app/src/quick-match.jsx`)
4. Create empty page component structure
5. Run `bun run generate-routes`

### Phase 2: Business Logic (Day 1-2)
1. Create `app/src/logic/calculators/matching/calculateMatchScore.js`
2. Create `app/src/logic/calculators/matching/calculateMatchHeuristics.js`
3. Create `app/src/logic/rules/matching/isHighDemandBorough.js`
4. Create `app/src/logic/processors/matching/adaptCandidateListing.js`
5. Unit test heuristics calculations

### Phase 3: Edge Function (Day 2)
1. Create `supabase/functions/quick-match/index.ts`
2. Implement `get_proposal` action
3. Implement `search_candidates` action with heuristics
4. Implement `save_choice` action
5. Add authentication checks

### Phase 4: Database (Day 2)
1. Create `proposal_match` table migration
2. Add missing columns to existing tables
3. Configure RLS policies
4. Test with MCP tools

### Phase 5: Components (Day 3-4)
1. Convert `ProposalSummary.tsx` → JSX
2. Convert `CandidateListingsGrid.tsx` → JSX
3. Convert `QuickMatchListingCard.tsx` → JSX
4. Convert `QuickMatchFilters.tsx` → JSX
5. Create `ProposalChoiceModal.jsx` in modals/
6. Convert Tailwind styles → CSS

### Phase 6: Page Integration (Day 4)
1. Build `QuickMatchPage.jsx` (hollow component)
2. Build `useQuickMatchPageLogic.js` (all logic)
3. Wire up components
4. Integrate with Edge Function
5. Add toast notifications

### Phase 7: Testing & Polish (Day 5)
1. End-to-end testing with real data
2. Error handling refinement
3. Loading states and UX polish
4. Mobile responsiveness check
5. Security audit

---

## Files to Create

### Frontend
```
app/public/quick-match.html
app/src/quick-match.jsx
app/src/islands/pages/QuickMatchPage.jsx
app/src/islands/pages/useQuickMatchPageLogic.js
app/src/islands/shared/QuickMatch/ProposalSummary.jsx
app/src/islands/shared/QuickMatch/CandidateListingsGrid.jsx
app/src/islands/shared/QuickMatch/QuickMatchListingCard.jsx
app/src/islands/shared/QuickMatch/QuickMatchFilters.jsx
app/src/islands/modals/ProposalChoiceModal.jsx
app/src/styles/components/quick-match.css
```

### Backend
```
supabase/functions/quick-match/index.ts
supabase/functions/quick-match/actions/getProposal.ts
supabase/functions/quick-match/actions/searchCandidates.ts
supabase/functions/quick-match/actions/saveChoice.ts
```

### Logic Layer
```
app/src/logic/calculators/matching/calculateMatchScore.js
app/src/logic/calculators/matching/calculateMatchHeuristics.js
app/src/logic/rules/matching/isHighDemandBorough.js
app/src/logic/rules/matching/canBeMatchedToProposal.js
app/src/logic/processors/matching/adaptCandidateListing.js
app/src/logic/processors/matching/formatMatchDisplay.js
```

---

## Files to Modify

```
app/src/routes.config.js           # Add quick-match route
app/src/styles/main.css            # Import quick-match.css (if using global import)
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing database fields | High | Audit schema before implementation |
| Corporate role not implemented | Medium | Add is_corporate field, seed test users |
| Heuristics accuracy | Medium | Validate against real proposal data |
| Performance with large datasets | Medium | Add pagination, indexes |
| Authentication gaps | High | Use existing auth patterns |

---

## Success Criteria

- [ ] Quick Match page loads at `/quick-match?proposal=ID`
- [ ] Proposal summary displays correctly
- [ ] Candidate listings show with match scores
- [ ] Filters work (borough, duration, search)
- [ ] Selection saves to `proposal_match` table
- [ ] Only corporate users can access
- [ ] Mobile responsive
- [ ] Follows Split Lease architecture patterns

---

## Related Files (Existing Codebase)

### To Reference
- [routes.config.js](../../app/src/routes.config.js) - Route registration
- [GoogleMap.jsx](../../app/src/islands/shared/GoogleMap.jsx) - Map component
- [ListingCard.jsx](../../app/src/islands/shared/ListingCard/ListingCard.jsx) - Card pattern
- [Toast.jsx](../../app/src/islands/shared/Toast.jsx) - Notifications
- [Modal.jsx](../../app/src/islands/shared/Modal.jsx) - Base modal
- [auth.js](../../app/src/lib/auth.js) - Authentication
- [supabase.js](../../app/src/lib/supabase.js) - Database client
- [dayUtils.js](../../app/src/lib/dayUtils.js) - Day indexing

### To Study (Similar Patterns)
- [SearchPage.jsx](../../app/src/islands/pages/SearchPage.jsx) - Grid + filters pattern
- [GuestProposalsPage.jsx](../../app/src/islands/pages/GuestProposalsPage.jsx) - Proposal display
- [ViewSplitLeasePage.jsx](../../app/src/islands/pages/ViewSplitLeasePage.jsx) - Listing details

### Edge Function Examples
- [proposal/index.ts](../../supabase/functions/proposal/index.ts) - Action pattern
- [listing/index.ts](../../supabase/functions/listing/index.ts) - CRUD pattern

---

## Notes

1. **TypeScript Decision**: The project uses JavaScript. Convert all `.tsx`/`.ts` to `.jsx`/`.js` unless there's a decision to add TypeScript to the frontend.

2. **React Query Removal**: React Query adds complexity. The existing pattern of `useState` + `useEffect` with loading states is simpler and consistent with the codebase.

3. **Tailwind Removal**: Convert all Tailwind utility classes to CSS. This maintains consistency and reduces bundle size (no Tailwind runtime).

4. **Protected Route**: This should be a protected route (`protected: true` in routes.config.js) requiring authentication.

5. **Internal Tool Classification**: Consider adding `devOnly: true` or a new `internalTool: true` flag to routes.config.js for internal tools.
