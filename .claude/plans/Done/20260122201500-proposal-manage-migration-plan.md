# Implementation Plan: Proposal Management Tool Migration

## Overview

This plan details the migration of the external proposal management tool from `c:/temp/proposal-manage/` into the Split Lease codebase. The tool provides admin-level proposal management including advanced filtering, quick proposal creation, and status management. The migration requires adapting the React Router SPA pattern to Islands Architecture and integrating with existing Supabase Edge Functions.

## Success Criteria

- [ ] ProposalManagePage accessible at `/_internal/proposal-manage`
- [ ] All proposal filtering works against Supabase database
- [ ] Quick proposal creation wizard functional using existing Edge Functions
- [ ] Status updates persisted via proposal Edge Function
- [ ] Reminder actions integrated with existing messaging/notification systems
- [ ] Component follows Hollow Component Pattern
- [ ] No React Router dependencies (full page loads between pages)
- [ ] Admin-only access enforced

---

## Context & References

### External Repository Files (Source)

| File | Purpose | Migration Strategy |
|------|---------|-------------------|
| `c:/temp/proposal-manage/src/pages/ProposalManagePage.jsx` | Main container with state management | Refactor into Hollow Component + Logic Hook |
| `c:/temp/proposal-manage/src/components/FilterSection/FilterSection.jsx` | Filter inputs UI | Adapt with minor CSS changes |
| `c:/temp/proposal-manage/src/components/ProposalItem/ProposalItem.jsx` | Proposal card display | Adapt status dropdown, reuse existing normalizers |
| `c:/temp/proposal-manage/src/components/QuickProposalCreation/QuickProposalCreation.jsx` | 4-step wizard | Adapt to use existing searchable dropdowns |
| `c:/temp/proposal-manage/src/types/proposal.js` | Status constants, data classes | Merge with existing config |
| `c:/temp/proposal-manage/src/services/mockData.js` | Mock data and filter functions | Replace with Supabase queries |
| `c:/temp/proposal-manage/API_DOCUMENTATION.md` | API endpoint specs | Map to Edge Function actions |

### Target Codebase Files (Destination)

| File | Purpose | Impact |
|------|---------|--------|
| `app/src/routes.config.js` | Route registry | Add new route entry |
| `app/src/lib/proposalService.js` | Proposal API client | May need new search action |
| `app/src/config/proposalStatusConfig.js` | Status constants | Reference for status values |
| `supabase/functions/proposal/index.ts` | Edge Function | May need `search` action |
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Host proposals logic | Reference patterns |
| `app/src/islands/pages/HostProposalsPage/index.jsx` | Host proposals UI | Reference patterns |
| `app/src/lib/dataLookups.js` | Reference data fetching | Use for user/listing search |

### Existing Patterns to Follow

| Pattern | Description | Location |
|---------|-------------|----------|
| Hollow Component | UI delegates ALL logic to hook | `HostProposalsPage/index.jsx` + `useHostProposalsPageLogic.js` |
| Data Normalization | Bubble format to camelCase | `useHostProposalsPageLogic.js` lines 32-140 |
| Edge Function Invocation | `supabase.functions.invoke('proposal', { body: { action, payload } })` | `proposalService.js` |
| Admin Route | `/_internal/*` path with `adminOnly: true` | `routes.config.js` lines 596-644 |
| Status Constants | `PROPOSAL_STATUS` enum | `proposalStatusConfig.js` |

---

## Architecture Adaptation Strategy

### 1. Routing Architecture (React Router -> Islands)

**Problem**: External tool uses React Router for client-side navigation between wizard steps.

**Solution**:
- Remove `react-router-dom` dependency entirely
- Wizard steps managed via local state (already done in QuickProposalCreation)
- Navigation between pages uses `window.location.href` or `<a>` tags
- URL parameters for deep-linking to specific proposals: `?proposal={id}`

### 2. API Integration (REST -> Edge Functions)

**External API Mapping**:

| External Endpoint | Target Edge Function | Action | Notes |
|-------------------|---------------------|--------|-------|
| `GET /proposals/search` | `proposal` | `search` (NEW) | Need to add search action |
| `GET /proposals/:id` | `proposal` | `get` | Existing |
| `POST /proposals` | `proposal` | `create_suggested` | Existing for admin creation |
| `PATCH /proposals/:id/status` | `proposal` | `update` | Existing |
| `PATCH /proposals/:id` | `proposal` | `update` | Existing |
| `POST /proposals/:id/cancel` | `proposal` | `update` | Use status change |
| `POST /proposals/:id/remind-guest` | TBD | N/A | Use messaging or new action |
| `POST /proposals/:id/remind-host` | TBD | N/A | Use messaging or new action |
| `GET /users/search` | Direct Supabase query | N/A | Query `user` table |
| `GET /listings/search` | Direct Supabase query | N/A | Query `listing` table |

### 3. Component Structure (Mixed -> Hollow Pattern)

**Before** (External):
```
ProposalManagePage.jsx (state + UI mixed)
├── FilterSection.jsx (presentational)
├── ProposalItem.jsx (presentational + local state)
└── QuickProposalCreation.jsx (state + UI mixed)
```

**After** (Target):
```
ProposalManagePage/
├── index.jsx (Hollow UI component)
├── useProposalManagePageLogic.js (ALL business logic)
├── FilterSection.jsx (presentational, receives props)
├── ProposalItem.jsx (presentational, receives props)
├── QuickProposalCreation.jsx (Hollow UI with local wizard state)
├── useQuickProposalCreationLogic.js (wizard business logic)
└── ProposalManagePage.css (styles)
```

### 4. Data Format (camelCase -> Bubble Normalization)

**Normalization Layer Required**:
- Input: Raw Supabase/Bubble field names (`"Move in range start"`, `"Days Selected"`)
- Output: camelCase format expected by UI (`moveInRangeStart`, `daysSelected`)

**Use Existing Normalizers**:
```javascript
// From useHostProposalsPageLogic.js
import { normalizeListing, normalizeGuest, normalizeProposal } from './normalizers.js';
```

**Create admin-specific wrapper**:
```javascript
// For ProposalManagePage - combines all normalized data
function normalizeProposalForAdmin(rawProposal) {
  return {
    ...normalizeProposal(rawProposal),
    guest: normalizeGuest(rawProposal.guest || rawProposal.Guest),
    host: normalizeGuest(rawProposal.host || rawProposal['Host User']),
    listing: normalizeListing(rawProposal.listing || rawProposal.Listing)
  };
}
```

### 5. Authentication (localStorage token -> Supabase Auth)

**Target Pattern**:
```javascript
// From useHostProposalsPageLogic.js Gold Standard Auth Pattern
const isLoggedIn = await checkAuthStatus();
const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

// Fallback to session metadata
const { data: { session } } = await supabase.auth.getSession();

// Admin check
if (!userData?.isAdmin) {
  window.location.href = '/';
  return;
}
```

---

## Implementation Steps

### Phase 1: Core Infrastructure (Foundation)

#### Step 1.1: Register Route
**Files**: `app/src/routes.config.js`
**Purpose**: Add route entry for admin proposal management page
**Details**:
- Add route at `/_internal/proposal-manage`
- Set `adminOnly: true` and `protected: true`
- Add alias `/proposal-manage` for convenience

```javascript
// Add after line ~620 (after existing /_internal routes)
{
  path: '/_internal/proposal-manage',
  file: 'proposal-manage.html',
  aliases: ['/_internal/proposal-manage.html', '/proposal-manage'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'proposal-manage-view',
  hasDynamicSegment: false
},
```

**Validation**: Run `bun run generate-routes` to verify no conflicts

#### Step 1.2: Create HTML Entry Point
**Files**: `app/public/proposal-manage.html`
**Purpose**: HTML shell for React island
**Details**:
- Copy template from existing admin page (e.g., `admin-threads.html`)
- Update title to "Proposal Management - Split Lease Admin"
- Reference entry point script

**Validation**: Verify file accessible via dev server

#### Step 1.3: Create React Entry Point
**Files**: `app/src/proposal-manage.jsx`
**Purpose**: Mount React root
**Details**:
- Standard entry point pattern
- Import and render `ProposalManagePage`

```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import ProposalManagePage from './islands/pages/ProposalManagePage/index.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<ProposalManagePage />);
```

**Validation**: Page loads without errors (may show empty state)

---

### Phase 2: Page Structure (Hollow Component + Logic Hook)

#### Step 2.1: Create Page Directory Structure
**Files**:
- `app/src/islands/pages/ProposalManagePage/index.jsx`
- `app/src/islands/pages/ProposalManagePage/useProposalManagePageLogic.js`
- `app/src/islands/pages/ProposalManagePage/ProposalManagePage.css`
**Purpose**: Establish Hollow Component Pattern
**Details**:

**index.jsx** (UI Shell):
```jsx
import { useState } from 'react';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useProposalManagePageLogic } from './useProposalManagePageLogic.js';
import './ProposalManagePage.css';

export default function ProposalManagePage() {
  const {
    // Auth state
    authState,
    // Data
    proposals,
    filters,
    isLoading,
    error,
    // Counts
    totalCount,
    // Handlers
    handleFilterChange,
    handleClearFilters,
    handleStatusChange,
    handleAction,
    handleRetry,
    // Quick creation
    isCreationFormOpen,
    handleToggleCreationForm,
    handleCreateProposal
  } = useProposalManagePageLogic();

  if (authState.shouldRedirect) {
    return <LoadingState />;
  }

  return (
    <>
      <Header />
      <main className="pm-page">
        {/* Page header with action buttons */}
        {/* Quick creation form (conditional) */}
        {/* Filter section */}
        {/* Proposals list */}
      </main>
      <Footer />
    </>
  );
}
```

**Validation**: Page renders with basic structure

#### Step 2.2: Implement Logic Hook - Auth & Data Loading
**Files**: `app/src/islands/pages/ProposalManagePage/useProposalManagePageLogic.js`
**Purpose**: All business logic for the page
**Details**:

```javascript
import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';

export function useProposalManagePageLogic() {
  // Auth state
  const [authState, setAuthState] = useState({
    isChecking: true,
    isAuthenticated: false,
    isAdmin: false,
    shouldRedirect: false
  });

  // Filter state
  const [filters, setFilters] = useState({
    guestSearch: '',
    hostSearch: '',
    status: '',
    proposalId: '',
    listingSearch: '',
    startDate: null,
    endDate: null,
    sortDirection: 'desc'
  });

  // Data state
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Creation form state
  const [isCreationFormOpen, setIsCreationFormOpen] = useState(false);

  // Auth check on mount
  useEffect(() => {
    async function checkAuth() {
      // Gold Standard Auth Pattern
      // Check admin status
      // Redirect if not admin
    }
    checkAuth();
  }, []);

  // Load proposals when filters change
  useEffect(() => {
    if (authState.isAdmin) {
      loadProposals();
    }
  }, [filters, authState.isAdmin]);

  // ... handlers
  return { /* API */ };
}
```

**Validation**: Auth check works, redirects non-admins

---

### Phase 3: Filtering & Search

#### Step 3.1: Add Search Action to Proposal Edge Function
**Files**: `supabase/functions/proposal/actions/search.ts` (NEW)
**Purpose**: Server-side proposal search with filters
**Details**:

```typescript
// New handler for admin search
export async function handleSearch(
  payload: SearchPayload,
  supabase: SupabaseClient
): Promise<SearchResult> {
  const {
    guestSearch,
    hostSearch,
    status,
    proposalId,
    listingSearch,
    startDate,
    endDate,
    sortDirection = 'desc',
    page = 1,
    limit = 50
  } = payload;

  let query = supabase
    .from('proposal')
    .select(`
      *,
      guest:Guest(
        _id, "Name - Full", email, "Profile Photo", "user verified?"
      ),
      listing:Listing(
        _id, Name, "Full Address", "rental type", "Cover Photo"
      )
    `, { count: 'exact' })
    .neq('Deleted', true);

  // Apply filters
  if (proposalId) {
    query = query.ilike('_id', `%${proposalId}%`);
  }
  if (status) {
    query = query.eq('Status', status);
  }
  if (startDate) {
    query = query.gte('Modified Date', startDate);
  }
  if (endDate) {
    query = query.lte('Modified Date', endDate);
  }

  // Sort and paginate
  query = query
    .order('Modified Date', { ascending: sortDirection === 'asc' })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return { proposals: data, total: count };
}
```

**Note**: Guest/Host text search requires more complex logic (may need RPC function)

**Validation**: Search returns filtered results

#### Step 3.2: Implement Filter Section Component
**Files**: `app/src/islands/pages/ProposalManagePage/FilterSection.jsx`
**Purpose**: Filter inputs UI
**Details**:
- Adapt from external FilterSection.jsx
- Remove react-select dependency, use native HTML or existing dropdown components
- Remove react-datepicker, use native `<input type="date">`
- Style with existing CSS variables

```jsx
export default function FilterSection({ filters, onFilterChange, onClearAll }) {
  return (
    <div className="pm-filter-section">
      <div className="pm-filter-row">
        <input
          type="text"
          className="pm-searchbox"
          placeholder="Search Guest Name, email, phone"
          value={filters.guestSearch}
          onChange={(e) => onFilterChange('guestSearch', e.target.value)}
        />
        {/* ... other filters */}
      </div>
    </div>
  );
}
```

**Validation**: Filters update state and trigger search

#### Step 3.3: Implement Guest/Host/Listing Text Search
**Files**: `supabase/functions/proposal/actions/search.ts`
**Purpose**: Full-text search across related entities
**Details**:
- Create Supabase RPC function for complex joins
- Search guest by name/email/phone
- Search host by name/email/phone
- Search listing by name/id/type

**Alternative**: Direct Supabase query with subqueries (less efficient but no migration needed)

**Validation**: Text search finds matching proposals

---

### Phase 4: Proposal List & Actions

#### Step 4.1: Implement ProposalItem Component
**Files**: `app/src/islands/pages/ProposalManagePage/ProposalItem.jsx`
**Purpose**: Display single proposal card with all details
**Details**:
- Adapt from external ProposalItem.jsx
- Use existing date formatters (`lib/dateFormatters.js`)
- Use existing currency formatters
- Status dropdown uses PROPOSAL_STATUSES from `types/proposal.js` (merged into config)
- Days display uses existing day helpers

```jsx
import { format } from 'date-fns';
import { PROPOSAL_STATUSES } from './constants.js';

export default function ProposalItem({ proposal, onStatusChange, onAction }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <div className="pm-proposal-item">
      {/* Guest Section */}
      {/* Listing Section */}
      {/* Host Section */}
      {/* Pricing Section */}
      {/* Reservation Section */}
      {/* Status Section with dropdown */}
      {/* Action Buttons */}
    </div>
  );
}
```

**Validation**: Proposals display correctly with all sections

#### Step 4.2: Implement Status Change Handler
**Files**: `app/src/islands/pages/ProposalManagePage/useProposalManagePageLogic.js`
**Purpose**: Update proposal status via Edge Function
**Details**:

```javascript
const handleStatusChange = useCallback(async (proposalId, newStatus) => {
  try {
    // Optimistic update
    setProposals(prev =>
      prev.map(p => p._id === proposalId ? { ...p, status: newStatus } : p)
    );

    const { error } = await supabase.functions.invoke('proposal', {
      body: {
        action: 'update',
        payload: { proposal_id: proposalId, status: newStatus }
      }
    });

    if (error) throw error;
  } catch (err) {
    console.error('Failed to update status:', err);
    // Revert optimistic update
    loadProposals();
    alert('Failed to update status');
  }
}, [loadProposals]);
```

**Validation**: Status changes persist to database

#### Step 4.3: Implement Action Handlers
**Files**: `app/src/islands/pages/ProposalManagePage/useProposalManagePageLogic.js`
**Purpose**: Handle all proposal actions
**Details**:

| Action | Implementation |
|--------|---------------|
| `viewListing` | `window.open('/view-split-lease?id=' + listingId, '_blank')` |
| `modifyAsHost` | Navigate to HostEditingProposal or open modal |
| `modifyAsGuest` | Navigate to GuestEditingProposal or open modal |
| `sendReminderGuest` | Send message via messaging Edge Function |
| `sendReminderHost` | Send message via messaging Edge Function |
| `cancelProposal` | Update status to "Proposal Cancelled by Split Lease" |

**Validation**: Each action performs expected behavior

---

### Phase 5: Quick Proposal Creation Wizard

#### Step 5.1: Implement Listing/Host Search
**Files**: `app/src/islands/pages/ProposalManagePage/QuickProposalCreation.jsx`
**Purpose**: Step 1 - Search and select listing
**Details**:
- Query `listing` table directly via Supabase
- Display searchable dropdown with listing name, address, host info
- On selection, store listing ID and move to step 2

```javascript
const searchListings = async (query) => {
  const { data } = await supabase
    .from('listing')
    .select(`
      _id, Name, "Full Address", "rental type", "Cover Photo",
      host:"Host User"(_id, "Name - Full", email)
    `)
    .or(`Name.ilike.%${query}%,_id.ilike.%${query}%`)
    .limit(20);
  return data;
};
```

**Validation**: Listings load and are selectable

#### Step 5.2: Implement Guest Search
**Files**: `app/src/islands/pages/ProposalManagePage/QuickProposalCreation.jsx`
**Purpose**: Step 2 - Search and select guest
**Details**:
- Query `user` table directly via Supabase
- Display searchable dropdown with guest name, email, photo
- On selection, pre-fill about/needs fields and move to step 3

```javascript
const searchGuests = async (query) => {
  const { data } = await supabase
    .from('user')
    .select('_id, "Name - Full", email, "Profile Photo", "About Me / Bio"')
    .or(`"Name - Full".ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);
  return data;
};
```

**Validation**: Guests load and are selectable

#### Step 5.3: Implement Proposal Details Form
**Files**: `app/src/islands/pages/ProposalManagePage/QuickProposalCreation.jsx`
**Purpose**: Step 3 - Enter proposal details
**Details**:
- About guest, need for space, special needs text areas
- Status dropdown (default: "Proposal Submitted for guest by Split Lease...")
- Move-in date picker (native date input)
- Reservation span (number input)
- Day selector (reuse existing DayButton or create simple toggle row)
- Pricing calculation display

**Validation**: Form collects all required data

#### Step 5.4: Implement Proposal Submission
**Files**: `app/src/islands/pages/ProposalManagePage/useProposalManagePageLogic.js`
**Purpose**: Create proposal via Edge Function
**Details**:
- Use existing `create_suggested` action
- Transform form data to Edge Function payload
- Handle success/error states

```javascript
const handleCreateProposal = useCallback(async (formData) => {
  try {
    const { data, error } = await supabase.functions.invoke('proposal', {
      body: {
        action: 'create_suggested',
        payload: {
          guestId: formData.selectedGuest._id,
          listingId: formData.selectedListing._id,
          moveInStartRange: formData.moveInDate,
          daysSelected: formData.weeklySchedule
            .map((active, i) => active ? i : null)
            .filter(i => i !== null),
          reservationSpanWeeks: formData.reservationSpanWeeks,
          aboutMe: formData.guestAbout,
          needForSpace: formData.guestNeedForSpace,
          specialNeeds: formData.guestSpecialNeeds,
          status: formData.proposalStatus
        }
      }
    });

    if (error) throw error;
    return { success: true, proposalId: data.data?.proposalId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}, []);
```

**Validation**: Proposals created successfully

#### Step 5.5: Implement Confirmation Step
**Files**: `app/src/islands/pages/ProposalManagePage/QuickProposalCreation.jsx`
**Purpose**: Step 4 - Show success and offer to create another
**Details**:
- Display created proposal ID and thread ID (if available)
- "Create Another" button resets form to step 1
- Close button hides creation form

**Validation**: Full wizard flow completes successfully

---

### Phase 6: Reminders & Messaging Integration

#### Step 6.1: Implement Reminder to Guest
**Files**: `app/src/islands/pages/ProposalManagePage/useProposalManagePageLogic.js`
**Purpose**: Send reminder notification to guest
**Details**:
- Option A: Use existing messaging Edge Function to send in-app message
- Option B: Create new reminder action in proposal Edge Function
- Option C: Trigger Bubble workflow for email notification

**Recommended**: Option A - leverage existing messaging system

```javascript
const handleSendReminderGuest = useCallback(async (proposal) => {
  try {
    const { error } = await supabase.functions.invoke('bubble-proxy', {
      body: {
        action: 'send_message',
        payload: {
          threadId: proposal.threadId,
          recipientId: proposal.guest._id,
          message: `Reminder: Please review your proposal for ${proposal.listing.name}`
        }
      }
    });

    if (error) throw error;
    alert(`Reminder sent to ${proposal.guest.name}`);
  } catch (err) {
    alert('Failed to send reminder');
  }
}, []);
```

**Validation**: Guest receives notification

#### Step 6.2: Implement Reminder to Host
**Files**: Same as above
**Purpose**: Send reminder notification to host
**Details**: Similar to guest reminder, different recipient

**Validation**: Host receives notification

---

## Phase 7: Polish & Testing

### Step 7.1: Add Loading States
**Files**: `app/src/islands/pages/ProposalManagePage/index.jsx`
**Purpose**: Show loading indicators
**Details**:
- Page-level loading during initial load
- Inline loading during filter changes
- Button loading during actions

### Step 7.2: Add Error States
**Files**: `app/src/islands/pages/ProposalManagePage/index.jsx`
**Purpose**: Show error messages with retry
**Details**:
- Error banner for failed loads
- Inline errors for failed actions
- Retry button functionality

### Step 7.3: Add Empty States
**Files**: `app/src/islands/pages/ProposalManagePage/index.jsx`
**Purpose**: Handle no results scenarios
**Details**:
- "No proposals found" with clear filters button
- "No proposals in system" initial state

### Step 7.4: Responsive Design
**Files**: `app/src/islands/pages/ProposalManagePage/ProposalManagePage.css`
**Purpose**: Mobile-friendly layout
**Details**:
- Stack filters vertically on mobile
- Collapsible proposal cards on mobile
- Touch-friendly button sizes

---

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| No proposals match filters | Show empty state with clear filters button |
| Edge Function timeout | Show retry button with error message |
| User session expired mid-action | Re-authenticate and retry |
| Concurrent status updates | Last write wins (acceptable for admin tool) |
| Large result set (1000+ proposals) | Pagination with 50 per page default |
| Invalid proposal ID in URL | Show "Proposal not found" with link to clear filter |

---

## Testing Considerations

### Manual Testing Checklist

1. **Auth Flow**
   - [ ] Non-admin redirected to home
   - [ ] Admin can access page
   - [ ] Session expiry handled gracefully

2. **Filtering**
   - [ ] Guest search finds by name, email, phone
   - [ ] Host search finds by name, email, phone
   - [ ] Status filter shows correct results
   - [ ] Proposal ID search finds exact match
   - [ ] Listing search finds by name, ID, type
   - [ ] Date range filter works correctly
   - [ ] Sort direction toggles work
   - [ ] Clear all resets filters

3. **Proposal List**
   - [ ] All proposal data displays correctly
   - [ ] Status dropdown updates successfully
   - [ ] Action buttons trigger correct behavior

4. **Quick Creation**
   - [ ] Listing search works
   - [ ] Guest search works
   - [ ] Form validation prevents invalid submissions
   - [ ] Pricing calculations match expected values
   - [ ] Proposal created successfully
   - [ ] Confirmation shows correct IDs

5. **Integration**
   - [ ] Proposal appears in HostProposalsPage after creation
   - [ ] Status changes reflect in other views
   - [ ] Reminders received by correct recipients

---

## Rollback Strategy

1. **Route Removal**: Delete route entry from `routes.config.js`
2. **File Cleanup**: Remove all files under `app/src/islands/pages/ProposalManagePage/`
3. **Edge Function**: If search action added, remove from valid actions list
4. **Entry Points**: Remove `proposal-manage.html` and `proposal-manage.jsx`

---

## Dependencies & Blockers

### Required Before Start
- [ ] Confirm admin user detection logic (field name in user table)
- [ ] Confirm messaging Edge Function availability for reminders
- [ ] Confirm `create_suggested` action payload format

### Potential Blockers
- Guest/host text search across joins may require RPC function
- Reminder functionality may need new Edge Function action
- Admin role check may need backend validation

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Complex filter queries slow | Medium | Medium | Add database indexes, limit results |
| Admin check bypassable | Low | High | Validate admin status in Edge Function |
| Status update conflicts | Low | Low | Accept last-write-wins for admin tool |
| Migration introduces bugs | Medium | Medium | Thorough testing, staged rollout |
| react-datepicker/react-select conflicts | Low | Low | Use native HTML inputs instead |

---

## File Structure Summary

### Files to Create

```
app/public/
  proposal-manage.html

app/src/
  proposal-manage.jsx

app/src/islands/pages/ProposalManagePage/
  index.jsx                         # Main page (Hollow Component)
  useProposalManagePageLogic.js     # All business logic
  FilterSection.jsx                 # Filter inputs
  ProposalItem.jsx                  # Proposal card display
  QuickProposalCreation.jsx         # 4-step wizard
  useQuickProposalCreationLogic.js  # Wizard logic (optional separation)
  constants.js                      # Status constants (merge with existing)
  normalizers.js                    # Data normalization helpers
  ProposalManagePage.css            # All styles

supabase/functions/proposal/
  actions/search.ts                 # NEW: Admin search action
```

### Files to Modify

```
app/src/routes.config.js            # Add route entry
supabase/functions/proposal/index.ts # Register search action (if added)
```

---

## Key File References

| Path | Purpose |
|------|---------|
| `c:/Users/Split Lease/My Drive/!Agent Context and Tools/SL3/Split Lease/app/src/routes.config.js` | Route registry |
| `c:/Users/Split Lease/My Drive/!Agent Context and Tools/SL3/Split Lease/app/src/lib/proposalService.js` | Existing proposal API |
| `c:/Users/Split Lease/My Drive/!Agent Context and Tools/SL3/Split Lease/app/src/config/proposalStatusConfig.js` | Status constants |
| `c:/Users/Split Lease/My Drive/!Agent Context and Tools/SL3/Split Lease/supabase/functions/proposal/index.ts` | Edge Function entry |
| `c:/Users/Split Lease/My Drive/!Agent Context and Tools/SL3/Split Lease/app/src/islands/pages/HostProposalsPage/index.jsx` | Reference UI pattern |
| `c:/Users/Split Lease/My Drive/!Agent Context and Tools/SL3/Split Lease/app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Reference logic pattern |
| `c:/Users/Split Lease/My Drive/!Agent Context and Tools/SL3/Split Lease/app/src/lib/dataLookups.js` | Reference data fetching |
| `c:/temp/proposal-manage/src/pages/ProposalManagePage.jsx` | Source: main container |
| `c:/temp/proposal-manage/src/components/FilterSection/FilterSection.jsx` | Source: filters |
| `c:/temp/proposal-manage/src/components/ProposalItem/ProposalItem.jsx` | Source: proposal card |
| `c:/temp/proposal-manage/src/components/QuickProposalCreation/QuickProposalCreation.jsx` | Source: wizard |
| `c:/temp/proposal-manage/src/types/proposal.js` | Source: types/constants |
| `c:/temp/proposal-manage/API_DOCUMENTATION.md` | API specs reference |

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Core Infrastructure | 1-2 hours |
| Phase 2: Page Structure | 2-3 hours |
| Phase 3: Filtering & Search | 4-6 hours |
| Phase 4: Proposal List & Actions | 3-4 hours |
| Phase 5: Quick Creation Wizard | 4-6 hours |
| Phase 6: Reminders Integration | 2-3 hours |
| Phase 7: Polish & Testing | 3-4 hours |

**Total Estimated: 19-28 hours**

---

**Plan Version**: 1.0
**Created**: 2026-01-22
**Author**: Claude (Implementation Planning Architect)
