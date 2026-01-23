# Usability Data Management Migration Plan

**Date**: 2026-01-21
**Status**: Planning
**Priority**: High
**Estimated Effort**: Medium (3-4 hours)

## Executive Summary

Migrate the standalone usability testing data management tool from the `_usability-data` GitHub repository into the Split Lease monorepo architecture. This internal tool allows admins to manage usability test data (delete host/guest data, create quick proposals, delete proposals) and must be integrated following our Islands Architecture, Edge Functions pattern, and Supabase database structure.

**Source Repository**: https://github.com/splitleasesharath/_usability-data.git
**Target Location**: `/_internal/usability-data-management` (admin-protected internal tool)

---

## Analysis of Source Code

### Current Architecture (Standalone Repo)

**File Structure**:
```
_usability-data/
├── index.html          (Single HTML page, 260 lines)
├── app.js              (Vanilla JS, 677 lines, mock data)
└── styles.css          (CSS, 633 lines)
```

**Key Features**:
1. **Delete Host Account Data**
   - Clear threads, proposals, data
   - Delete listings
   - Delete usability test status

2. **Delete Guest Account Data**
   - Clear threads, proposals, data
   - Delete usability test status

3. **Quick Proposal Creation**
   - Load listing by ID
   - Select guest
   - Configure move-in date, reservation days, span
   - Calculate pricing (4-week rent, total, nightly, initial payment)
   - Preview listing photos
   - Track created proposal/thread IDs

4. **Proposal Deletion**
   - Delete proposal by ID

**Technical Stack**:
- Vanilla JavaScript
- Mock data arrays (`mockHosts`, `mockGuests`, `mockListings`)
- No actual API integration (placeholder comments)
- Modal-based confirmation for proposal creation
- Alert overlay for notifications

**State Management**:
```javascript
const appState = {
    selectedHost: null,
    selectedGuest: null,
    selectedListing: null,
    selectedProposalGuest: null,
    selectedDays: [],
    reservationSpan: 13,
    calculations: { ... },
    recentProposalId: null,
    recentThreadId: null
};
```

---

## Target Architecture (Split Lease Monorepo)

### Islands Architecture Integration

**Route Configuration** ([routes.config.js](../../../app/src/routes.config.js)):
```javascript
{
  path: '/_internal/usability-data-management',
  file: 'usability-data-management.html',
  aliases: ['/_internal/usability-data-management.html', '/usability-data-management'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'usability-data-management-view',
  hasDynamicSegment: false
}
```

**File Structure**:
```
app/
├── public/
│   └── usability-data-management.html                   (HTML entry point)
├── src/
    ├── islands/
    │   └── pages/
    │       └── UsabilityDataManagementPage/
    │           ├── UsabilityDataManagementPage.jsx      (Hollow component)
    │           ├── useUsabilityDataManagementPageLogic.js (Hook with all logic)
    │           ├── components/
    │           │   ├── HostDataSection.jsx
    │           │   ├── GuestDataSection.jsx
    │           │   ├── ProposalCreationSection.jsx
    │           │   ├── ProposalDeletionSection.jsx
    │           │   ├── DaySelector.jsx
    │           │   ├── ListingPreview.jsx
    │           │   ├── CalculatedFieldsDisplay.jsx
    │           │   └── ProposalConfirmationModal.jsx
    │           └── constants/
    │               └── reservationSpans.js
    └── lib/
        └── usabilityDataService.js                      (API client for Edge Function)

supabase/
└── functions/
    └── usability-data-admin/
        ├── index.ts                                     (Main handler)
        ├── actions/
        │   ├── deleteHostData.ts
        │   ├── deleteHostListings.ts
        │   ├── deleteHostTestStatus.ts
        │   ├── deleteGuestData.ts
        │   ├── deleteGuestTestStatus.ts
        │   ├── createQuickProposal.ts
        │   ├── deleteProposal.ts
        │   ├── fetchListing.ts
        │   ├── listHosts.ts
        │   └── listGuests.ts
        └── _shared/
            └── validation.ts
```

---

## Architectural Discrepancies & Required Changes

### 1. **Mock Data → Real Supabase Database**

**Original**:
```javascript
const mockHosts = [
    { id: 'host_001', email: 'john.host@example.com', name: 'John Smith' },
    // ...
];
```

**Migration**:
- Query `public.user` table with `WHERE is_usability_tester = true AND "User Type" = 'Host'`
- Display: `"Name - First" + "Name - Last"` and `email`
- Filter by user type (Host vs Guest)

**Database Schema Reference**:
```sql
-- From 20260118160000_add_is_usability_tester_to_user.sql
ALTER TABLE public.user ADD COLUMN is_usability_tester BOOLEAN DEFAULT false;
```

---

### 2. **Vanilla JS → React Islands Architecture**

**Pattern**: Hollow Components + Hook-Based Logic

**Example Transformation**:

**Before (Vanilla JS)**:
```javascript
function handleHostSelection(e) {
    const hostId = e.target.value;
    const host = mockHosts.find(h => h.id === hostId);
    if (host) {
        appState.selectedHost = host;
        elements.hostEmail.value = host.email;
    }
}
```

**After (React Hook)**:
```javascript
// useUsabilityDataManagementPageLogic.js
const handleHostSelection = useCallback((hostId) => {
    const host = hosts.find(h => h.id === hostId);
    setSelectedHost(host || null);
}, [hosts]);
```

**Hollow Component**:
```javascript
// UsabilityDataManagementPage.jsx
export function UsabilityDataManagementPage() {
    const logic = useUsabilityDataManagementPageLogic();
    return <HostDataSection {...logic.hostSection} />;
}
```

---

### 3. **Client-Side API Placeholders → Edge Function Actions**

**Original Placeholder**:
```javascript
async function handleClearHostData() {
    // API PLACEHOLDER: Delete host threads, proposals, and data
    // await supabase.rpc('clear_host_data', { host_id: appState.selectedHost.id });
    await simulateApiCall(1500);
}
```

**Migrated Edge Function**:
```typescript
// supabase/functions/usability-data-admin/actions/deleteHostData.ts
export async function deleteHostData(payload: { hostId: string }, supabase: SupabaseClient) {
    const { hostId } = payload;

    // Delete proposals where host is involved
    await supabase.from('proposal').delete().eq('Host', hostId);

    // Delete message threads where host is a participant
    await supabase.from('message_threads').delete().eq('host_id', hostId);

    // Clear host-specific data (customize based on actual requirements)

    return { success: true, message: `Cleared data for host ${hostId}` };
}
```

**Service Call (Frontend)**:
```javascript
// app/src/lib/usabilityDataService.js
export async function clearHostData(hostId) {
    const response = await supabase.functions.invoke('usability-data-admin', {
        body: {
            action: 'deleteHostData',
            payload: { hostId }
        }
    });
    return response.data;
}
```

---

### 4. **Day Selection Logic → Reuse Existing Day Utilities**

**Original**:
```javascript
const dayMap = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
const pattern = dayMap.map(day => {
    return appState.selectedDays.includes(day) ? day.charAt(0).toUpperCase() : '-';
}).join('');
```

**Migration**: Use existing [dayUtils.js](../../../app/src/lib/dayUtils.js)
```javascript
import { formatDayPattern, DAY_INDICES } from '@/lib/dayUtils';

// Convert selected day buttons to 0-indexed array
const selectedDayIndices = selectedDays.map(dayLabel => DAY_INDICES[dayLabel]);
const pattern = formatDayPattern(selectedDayIndices);
```

**⚠️ Day Indexing Standard**:
- **Use 0-indexed days** (0=Sunday, 6=Saturday) matching JavaScript `Date.getDay()`
- Original code uses labels ('S', 'M', 'T', 'W', 'Th', 'F', 'Sa') - must convert to indices

---

### 5. **Pricing Calculations → Four-Layer Logic Architecture**

**Original**:
```javascript
function calculateProposal() {
    const nightlyPrice = appState.calculations.nightlyPrice || 0;
    const daysPerWeek = appState.selectedDays.length;
    const weeks = appState.reservationSpan;

    const fourWeeksRent = nightlyPrice * daysPerWeek * 4;
    const totalPrice = nightlyPrice * daysPerWeek * weeks;
    // ...
}
```

**Migration**: Move to `app/src/logic/calculators/pricing/`

**New Structure**:
```javascript
// app/src/logic/calculators/pricing/calculateQuickProposal.js
export function calculateQuickProposal({
    nightlyPrice,
    selectedDayIndices,
    reservationWeeks
}) {
    const daysPerWeek = selectedDayIndices.length;

    return {
        fourWeeksRent: nightlyPrice * daysPerWeek * 4,
        actualWeeks: reservationWeeks,
        totalPrice: nightlyPrice * daysPerWeek * reservationWeeks,
        initialPayment: nightlyPrice * daysPerWeek * 4, // Deposit = 4 weeks rent
        nightlyPrice
    };
}
```

---

### 6. **Modal & Alert Components → Shared Components**

**Original**:
- Custom modal (`#proposalModal`)
- Custom alert overlay (`#alertOverlay`)

**Migration**:
- **Confirmation Modal**: Reuse or adapt existing modal patterns from [shared components](../../../app/src/islands/shared/)
- **Alerts/Toasts**: Use consistent notification system (check if one exists, or create shared `AlertToast` component)

---

### 7. **Authentication & Authorization**

**Required**:
- Page route marked as `protected: true, adminOnly: true`
- Edge Function must verify:
  ```typescript
  const isAuthorized = await checkAdminOrCorporateStatus(supabase, user.email);
  if (!isAuthorized) {
      return errorResponse('Admin or corporate access required', 403);
  }
  ```
- Pattern: Same as [simulation-admin](../../../supabase/functions/simulation-admin/index.ts)

---

## Database Schema Mapping

### Tables Involved

| Functionality | Table | Columns |
|--------------|-------|---------|
| List Hosts/Guests | `public.user` | `_id`, `"Name - First"`, `"Name - Last"`, `email`, `is_usability_tester`, `"User Type"` |
| Delete Proposals | `public.proposal` | `_id`, `Host`, `Guest`, `Listing` |
| Delete Listings | `public.listing` | `_id`, `"Unique ID"`, `Host` |
| Delete Threads | `public.message_threads` | `thread_id`, `host_id`, `guest_id` |
| Usability Test Status | `public.user` | `"Usability Step"` (column already exists per simulation-admin) |
| Create Proposal | `public.proposal` | All columns (use existing proposal creation Edge Function) |

### Foreign Key Constraints

**⚠️ Critical**: The `listing` table has **12 FK constraints**. When deleting related data:
1. Delete dependent records first (proposals, threads)
2. Then delete listings
3. Handle FK violations gracefully with error messages

**Reference**: [20260217091827-edit-listing-409-regression-report.md](../../Documents/20260217091827-edit-listing-409-regression-report.md)

---

## Edge Function Actions Specification

### Action: `listHosts`
**Payload**: `{ search?: string, limit?: number, offset?: number }`
**Query**:
```sql
SELECT _id, "Name - First", "Name - Last", email, "Modified Date"
FROM public.user
WHERE is_usability_tester = true AND "User Type" = 'Host'
  AND (LOWER(email) LIKE LOWER($search) OR LOWER("Name - First" || ' ' || "Name - Last") LIKE LOWER($search))
ORDER BY "Modified Date" DESC
LIMIT $limit OFFSET $offset;
```

### Action: `listGuests`
**Payload**: `{ search?: string, limit?: number, offset?: number }`
**Query**: Same as `listHosts`, but with `"User Type" = 'Guest'`

### Action: `deleteHostData`
**Payload**: `{ hostId: string }`
**Operations**:
1. Delete proposals: `DELETE FROM proposal WHERE "Host" = $hostId`
2. Delete threads: `DELETE FROM message_threads WHERE host_id = $hostId`
3. Clear other host-related data (TBD based on requirements)

### Action: `deleteHostListings`
**Payload**: `{ hostId: string }`
**Operations**:
1. Delete dependent proposals first: `DELETE FROM proposal WHERE "Listing" IN (SELECT _id FROM listing WHERE "Host" = $hostId)`
2. Delete listings: `DELETE FROM listing WHERE "Host" = $hostId`

### Action: `deleteHostTestStatus`
**Payload**: `{ hostId: string }`
**Operations**:
1. Reset usability step: `UPDATE public.user SET "Usability Step" = 0 WHERE _id = $hostId`

### Action: `deleteGuestData`
**Payload**: `{ guestId: string }`
**Operations**:
1. Delete proposals: `DELETE FROM proposal WHERE "Guest" = $guestId`
2. Delete threads: `DELETE FROM message_threads WHERE guest_id = $guestId`

### Action: `deleteGuestTestStatus`
**Payload**: `{ guestId: string }`
**Operations**: Same as `deleteHostTestStatus`

### Action: `fetchListing`
**Payload**: `{ listingId: string }`
**Query**:
```sql
SELECT _id, "Unique ID", "Listing Name", "Price #1", photos, "Host"
FROM public.listing
WHERE "Unique ID" = $listingId OR _id = $listingId;
```

### Action: `createQuickProposal`
**Payload**:
```typescript
{
    listingId: string,
    guestId: string,
    moveInDate: string,
    selectedDayIndices: number[],
    reservationWeeks: number,
    totalPrice: number,
    notes?: string
}
```
**Operations**:
1. Reuse existing proposal creation logic from [proposal Edge Function](../../../supabase/functions/proposal/actions/create_test_proposal.ts)
2. Create proposal record
3. Create message thread
4. Return `{ proposalId, threadId }`

### Action: `deleteProposal`
**Payload**: `{ proposalId: string }`
**Operations**:
1. Delete proposal: `DELETE FROM proposal WHERE _id = $proposalId OR "Unique ID" = $proposalId`
2. Optionally delete associated thread (confirm requirement)

---

## Implementation Steps

### Phase 1: Setup (30 min)
1. ✅ Add route to [routes.config.js](../../../app/src/routes.config.js)
2. ✅ Run `bun run generate-routes` to update `_redirects` and `_routes.json`
3. ✅ Create HTML entry point: `app/public/usability-data-management.html`
4. ✅ Create page component directory: `app/src/islands/pages/UsabilityDataManagementPage/`

### Phase 2: Edge Function (60 min)
1. ✅ Create `supabase/functions/usability-data-admin/index.ts`
2. ✅ Implement action handlers in `actions/` directory
3. ✅ Add authentication/authorization checks
4. ✅ Test locally with `supabase functions serve usability-data-admin`

### Phase 3: Frontend - Data Fetching (45 min)
1. ✅ Create `app/src/lib/usabilityDataService.js` with API calls
2. ✅ Implement `useUsabilityDataManagementPageLogic.js` hook
3. ✅ Fetch hosts/guests on mount
4. ✅ Handle loading/error states

### Phase 4: Frontend - Components (90 min)
1. ✅ Build hollow components:
   - `HostDataSection.jsx`
   - `GuestDataSection.jsx`
   - `ProposalCreationSection.jsx`
   - `ProposalDeletionSection.jsx`
2. ✅ Create subcomponents:
   - `DaySelector.jsx` (interactive day buttons)
   - `ListingPreview.jsx` (photos, name, features)
   - `CalculatedFieldsDisplay.jsx` (pricing breakdown)
   - `ProposalConfirmationModal.jsx`

### Phase 5: Business Logic (30 min)
1. ✅ Create `app/src/logic/calculators/pricing/calculateQuickProposal.js`
2. ✅ Integrate day utilities from `lib/dayUtils.js`
3. ✅ Wire up calculations in hook

### Phase 6: Styling (30 min)
1. ✅ Port CSS from `styles.css` to component-scoped styles
2. ✅ Match Split Lease design system colors (`#2B1D5F` purple, `#1a365d` navy)
3. ✅ Ensure responsive design (mobile-friendly)

### Phase 7: Testing & Refinement (45 min)
1. ✅ Test all delete operations with real data
2. ✅ Verify proposal creation flow
3. ✅ Test error handling (FK violations, missing data)
4. ✅ Check admin-only access control
5. ✅ Cross-browser testing

### Phase 8: Deployment
1. ✅ Deploy Edge Function: `supabase functions deploy usability-data-admin`
2. ✅ Deploy frontend: `bun run build && npx wrangler pages deploy dist --project-name splitlease`
3. ✅ Verify in production

---

## Risk Assessment & Mitigation

### Risk 1: FK Constraint Violations
**Impact**: High - Deleting records could fail due to foreign key dependencies
**Mitigation**:
- Delete in correct order (proposals → threads → listings)
- Use transactions where possible
- Provide clear error messages to user

### Risk 2: Data Loss (Accidental Deletions)
**Impact**: Critical - Usability test data is valuable
**Mitigation**:
- Add confirmation modals for all destructive actions
- Consider soft-delete pattern (mark as deleted rather than hard delete)
- Log all deletion operations for audit trail

### Risk 3: Performance (Fetching All Testers)
**Impact**: Medium - Large tester lists could slow down page load
**Mitigation**:
- Implement pagination (limit 50 per page)
- Add search/filter functionality
- Use database indices (`idx_user_is_usability_tester` already exists)

### Risk 4: Authorization Bypass
**Impact**: Critical - Unauthorized access to admin tool
**Mitigation**:
- Enforce `adminOnly: true` in route config
- Edge Function checks `checkAdminOrCorporateStatus()`
- Test with non-admin accounts

---

## Testing Plan

### Unit Tests
- [ ] Pricing calculations (`calculateQuickProposal`)
- [ ] Day utilities integration
- [ ] Service API call mocking

### Integration Tests
- [ ] Edge Function actions (each action handler)
- [ ] Database operations with test data
- [ ] Authentication/authorization flows

### E2E Tests (Manual)
- [ ] Load page as admin (should succeed)
- [ ] Load page as non-admin (should redirect/403)
- [ ] Select host → delete data → verify proposals/threads deleted
- [ ] Select host → delete listings → verify FK cascade
- [ ] Create quick proposal → verify proposal + thread created
- [ ] Delete proposal → verify removal

---

## Success Criteria

1. ✅ Page accessible at `/_internal/usability-data-management`
2. ✅ Only admin/corporate users can access
3. ✅ All 10 Edge Function actions work correctly
4. ✅ UI matches original functionality (dropdowns, day selector, pricing display)
5. ✅ No console errors or warnings
6. ✅ Mobile-responsive design
7. ✅ Error handling for all edge cases (missing data, FK violations)
8. ✅ Code follows Split Lease architecture patterns (Hollow Components, Four-Layer Logic, Islands)

---

## Post-Migration Cleanup

1. Archive original `_usability-data` repository (mark as deprecated)
2. Update internal documentation to reference new `/_internal/usability-data-management` page
3. Notify team of new URL and functionality
4. Monitor error logs for first week after deployment

---

## Dependencies & Prerequisites

**External Dependencies**:
- Supabase database with `public.user`, `public.proposal`, `public.listing`, `public.message_threads` tables
- Existing `is_usability_tester` column in `user` table
- Admin user authentication system

**Code Dependencies**:
- [routes.config.js](../../../app/src/routes.config.js) - Route registration
- [dayUtils.js](../../../app/src/lib/dayUtils.js) - Day indexing utilities
- [auth.js](../../../app/src/lib/auth.js) - Authentication utilities
- [supabase.js](../../../app/src/lib/supabase.js) - Supabase client
- Existing proposal Edge Function for reference

**Build Tools**:
- Bun (package manager)
- Vite (dev server + build)
- Deno (Edge Functions runtime)

---

## File References

### Source Files (To Migrate From)
- [.claude/temp/usability-data/index.html](.claude/temp/usability-data/index.html)
- [.claude/temp/usability-data/app.js](.claude/temp/usability-data/app.js)
- [.claude/temp/usability-data/styles.css](.claude/temp/usability-data/styles.css)

### Target Files (To Create)
**Frontend**:
- `app/public/usability-data-management.html`
- `app/src/islands/pages/UsabilityDataManagementPage/UsabilityDataManagementPage.jsx`
- `app/src/islands/pages/UsabilityDataManagementPage/useUsabilityDataManagementPageLogic.js`
- `app/src/islands/pages/UsabilityDataManagementPage/components/*.jsx`
- `app/src/lib/usabilityDataService.js`
- `app/src/logic/calculators/pricing/calculateQuickProposal.js`

**Backend**:
- `supabase/functions/usability-data-admin/index.ts`
- `supabase/functions/usability-data-admin/actions/*.ts`

### Reference Files
- [app/src/routes.config.js](../../../app/src/routes.config.js) - Route configuration
- [supabase/functions/simulation-admin/index.ts](../../../supabase/functions/simulation-admin/index.ts) - Admin auth pattern
- [app/src/lib/dayUtils.js](../../../app/src/lib/dayUtils.js) - Day utilities
- [supabase/migrations/20260118160000_add_is_usability_tester_to_user.sql](../../../supabase/migrations/20260118160000_add_is_usability_tester_to_user.sql) - Database schema

---

## Questions for Clarification

1. **Soft Delete vs Hard Delete**: Should we implement soft-delete (mark as deleted) or hard-delete for proposals/listings?
2. **Thread Deletion**: When deleting a proposal, should we also delete the associated message thread?
3. **Audit Logging**: Do we need to log all deletion operations for compliance/audit purposes?
4. **Pagination Default**: What's the preferred default page size for host/guest lists? (Suggest: 50)
5. **Test Data Creation**: Should "Quick Proposal Creation" reuse existing test proposal logic or implement custom flow?

---

## Timeline

**Total Estimated Time**: 5.5 hours
**Suggested Phases**:
- Day 1 (3 hours): Phases 1-3 (Setup + Edge Function + Data Fetching)
- Day 2 (2.5 hours): Phases 4-6 (Components + Logic + Styling)
- Day 3 (1 hour): Phase 7-8 (Testing + Deployment)

---

**Plan Created By**: Claude Code
**Last Updated**: 2026-01-21 17:00:00
