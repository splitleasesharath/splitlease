# Co-Host Requests Page Migration Plan

**Created**: 2026-01-21 16:45:00
**Status**: Ready for Implementation
**Type**: BUILD - Internal Tool Migration
**Source**: https://github.com/splitleasesharath/_co-host-requests

---

## Executive Summary

Migrate the standalone Co-Host Requests tool from the GitHub repository into the Split Lease monorepo architecture. The tool manages co-host help requests from hosts, allowing admins to track status, assign co-hosts, and manage the request lifecycle.

---

## Source Analysis

### Repository Structure (GitHub)
```
_co-host-requests/
├── src/
│   ├── components/          # 10 React components (TypeScript)
│   ├── pages/               # CoHostRequestsPage.tsx
│   ├── services/            # api.ts, mockData.ts
│   ├── styles/              # 12 CSS files
│   └── types/               # cohost.types.ts
├── index.html
├── preview.html             # Standalone HTML preview
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Key Features from Source
1. **Request List View** - Card-based layout with filtering
2. **Status Filtering** - Pending, Approved, Rejected, Active, Completed, Archived
3. **Search** - By requester name, recipient name, property, or message
4. **Sorting** - By date, status, requester name, property
5. **Pagination** - For large datasets
6. **Statistics Dashboard** - Quick counts by status
7. **Action Buttons** - Approve, Reject, Archive, Delete
8. **Detail Modal** - Full request details view

### Source Data Model (from cohost.types.ts)
```typescript
interface CoHostRequest {
  id: string;
  requesterId: string;
  requester: User;           // Nested user object
  recipientId: string;
  recipient: User;           // Nested user object (co-host)
  propertyId: string;
  property: Property;        // Nested property object
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'archived';
  message: string;
  termsRequirements?: string;
  responseMessage?: string;
  requestDate: Date;
  responseDate?: Date;
  isActive: boolean;
  isArchived: boolean;
}
```

---

## Target Architecture Analysis

### Existing Database Schema (`co_hostrequest` table)

| Column | Type | Notes |
|--------|------|-------|
| `_id` | text | Primary key (Bubble format) |
| `Host User` | text | FK to user table (requester) |
| `Co-Host User` | text | FK to user table (assigned co-host) |
| `Co-Host selected (OS)` | text | Option set value |
| `Listing` | text | FK to listing table |
| `Status - Co-Host Request` | text | **Different values!** |
| `Subject` | text | Request subject/category |
| `details submitted (optional)` | text | Request message/details |
| `Request notes` | text | Internal notes |
| `Admin Notes` | text | Admin-specific notes |
| `Rating` | numeric | Service rating |
| `Rating message (optional)` | text | Rating feedback |
| `virtual meeting link` | text | Legacy meeting link |
| `Meeting link` | text | Current meeting link |
| `Google Meet Link` | text | Google Meet URL |
| `Dates and times suggested` | jsonb | Proposed meeting times |
| `Date and time selected` | timestamptz | Confirmed meeting time |
| `Meeting Date Time` | timestamptz | Actual meeting datetime |
| `show notification status change` | boolean | UI flag |
| `pending` | boolean | Pending flag |
| `Slack Message TS` | text | Slack thread reference |
| `Created Date` | timestamptz | Creation timestamp |
| `Modified Date` | timestamptz | Last modified |
| `created_at` | timestamptz | Supabase timestamp |
| `updated_at` | timestamptz | Supabase timestamp |

### Status Value Mapping (CRITICAL DISCREPANCY)

| Source Status | DB Status | Count |
|--------------|-----------|-------|
| `pending` | `Co-Host Requested` | 14 |
| `approved` | `Co-Host Selected` | 2 |
| `rejected` | *(no equivalent)* | - |
| `active` | `Virtual Meeting Finished` | 1 |
| `completed` | `Request closed` | 9 |
| `archived` | *(no equivalent)* | - |

**Resolution**: Use the actual database status values, not the mock data values.

---

## Discrepancies & Required Fixes

### 1. Status Values (HIGH PRIORITY)
**Problem**: Source uses generic status names; DB has domain-specific names.

**Fix**: Create status mapping constant:
```javascript
const STATUS_MAP = {
  'Co-Host Requested': { label: 'Pending', color: 'yellow', canApprove: true, canReject: true },
  'Co-Host Selected': { label: 'Assigned', color: 'blue', canApprove: false, canReject: false },
  'Virtual Meeting Finished': { label: 'Meeting Done', color: 'green', canApprove: false, canReject: false },
  'Request closed': { label: 'Closed', color: 'gray', canApprove: false, canReject: false }
};
```

### 2. Data Model Differences (HIGH PRIORITY)
**Problem**: Source expects nested `requester`, `recipient`, `property` objects.

**Fix**: The Edge Function must JOIN related tables:
```sql
SELECT
  c.*,
  h."First Name" as host_first_name,
  h."Last Name" as host_last_name,
  h.email as host_email,
  ch."First Name" as cohost_first_name,
  ch."Last Name" as cohost_last_name,
  l."🏷Name" as listing_name,
  l."📍Borough" as listing_borough
FROM co_hostrequest c
LEFT JOIN "user" h ON c."Host User" = h._id
LEFT JOIN "user" ch ON c."Co-Host User" = ch._id
LEFT JOIN listing l ON c."Listing" = l._id
```

### 3. TypeScript to JavaScript (MEDIUM PRIORITY)
**Problem**: Source uses TypeScript; Split Lease frontend uses JavaScript.

**Fix**: Convert all `.tsx` files to `.jsx`, remove type annotations:
- `CoHostRequestsPage.tsx` → `CoHostRequestsPage.jsx`
- `cohost.types.ts` → Remove (use JSDoc comments instead)
- All component files: `.tsx` → `.jsx`

### 4. Hollow Component Pattern (MEDIUM PRIORITY)
**Problem**: Source has logic in `CoHostRequestsPage.tsx`.

**Fix**: Extract ALL logic to `useCoHostRequestsPageLogic.js`:
- State management
- API calls
- Event handlers
- Computed values

### 5. API Layer (HIGH PRIORITY)
**Problem**: Source uses mock data with in-memory store.

**Fix**: Create real Edge Function `co-host-requests/index.ts` with actions:
- `list` - Fetch paginated, filtered requests
- `getById` - Fetch single request with relations
- `updateStatus` - Change request status
- `assignCoHost` - Assign a co-host user to request
- `addNotes` - Add admin/request notes
- `getStatistics` - Status counts

### 6. Field Name Mapping (HIGH PRIORITY)
**Problem**: Source uses camelCase; DB uses Bubble emoji naming.

**Fix**: Create adapter functions:
```javascript
// In useCoHostRequestsPageLogic.js
function adaptRequestFromSupabase(raw) {
  return {
    id: raw._id,
    status: raw['Status - Co-Host Request'],
    subject: raw['Subject'],
    message: raw['details submitted (optional)'],
    requestNotes: raw['Request notes'],
    adminNotes: raw['Admin Notes'],
    hostId: raw['Host User'],
    cohostId: raw['Co-Host User'],
    listingId: raw['Listing'],
    meetingLink: raw['Meeting link'] || raw['Google Meet Link'],
    meetingDateTime: raw['Meeting Date Time'],
    createdAt: raw['Created Date'],
    modifiedAt: raw['Modified Date'],
    // Joined data
    hostName: raw.host_first_name ? `${raw.host_first_name} ${raw.host_last_name}` : 'Unknown',
    hostEmail: raw.host_email,
    cohostName: raw.cohost_first_name ? `${raw.cohost_first_name} ${raw.cohost_last_name}` : null,
    listingName: raw.listing_name,
    listingBorough: raw.listing_borough
  };
}
```

### 7. CSS Architecture (LOW PRIORITY)
**Problem**: Source uses 12 separate CSS files.

**Fix**: Options:
1. **Recommended**: Consolidate into single `CoHostRequestsPage.css`
2. Alternative: Keep separate but import all in main component

### 8. Co-Host Selection Feature (MEDIUM PRIORITY)
**Problem**: Source has approve/reject flow for co-host acceptance.
**Reality**: DB schema shows this is admin-assigning-cohost, not cohost-accepting-request.

**Fix**: Replace Approve/Reject buttons with:
- "Assign Co-Host" dropdown (select from available co-hosts)
- "Close Request" button
- "Add Notes" action

### 9. Authentication (MEDIUM PRIORITY)
**Problem**: Source uses mock `currentUser`.

**Fix**: Use existing auth pattern from other internal tools:
```javascript
import { checkAuthStatus } from '../../../lib/auth';

useEffect(() => {
  const checkAuth = async () => {
    const { user, session } = await checkAuthStatus();
    if (!user || !session) {
      window.location.href = '/?auth=login&redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    setAccessToken(session.access_token);
  };
  checkAuth();
}, []);
```

### 10. Missing Features in Source (ADD)
Based on DB schema, add these features not in source:
- **Meeting scheduling** - Dates and times suggested, selected datetime
- **Google Meet integration** - Display/create meeting links
- **Rating system** - Rate completed co-host assistance
- **Slack integration** - Thread reference for notifications

---

## Implementation Plan

### Phase 1: Infrastructure Setup
1. Add route to `routes.config.js`
2. Create HTML entry point `app/public/co-host-requests.html`
3. Create React entry file `app/src/co-host-requests.jsx`

### Phase 2: Edge Function
1. Create `supabase/functions/co-host-requests/index.ts`
2. Implement actions: `list`, `getById`, `updateStatus`, `assignCoHost`, `addNotes`, `getStatistics`
3. Add to `_shared/` any reusable utilities

### Phase 3: Frontend Logic
1. Create `app/src/islands/pages/CoHostRequestsPage/`
2. Create `useCoHostRequestsPageLogic.js` with all business logic
3. Adapt data fetching to use Edge Function

### Phase 4: Components (Convert from TypeScript)
1. `CoHostRequestsPage.jsx` - Main hollow component
2. `CoHostRequestCard.jsx` - Card display
3. `FilterSection.jsx` - Filters and search
4. `StatisticsBar.jsx` - Status counts
5. `RequestDetailsModal.jsx` - Full details view
6. `Pagination.jsx` - (or use existing shared component)
7. `StatusBadge.jsx` - Status indicator
8. `ActionButtons.jsx` - Admin actions

### Phase 5: Styling
1. Create `CoHostRequestsPage.css`
2. Migrate and consolidate styles from source
3. Match Split Lease design system

### Phase 6: Testing & Polish
1. Test with real database data
2. Verify all status transitions
3. Test co-host assignment flow
4. Add loading and error states

---

## File Creation Checklist

### New Files to Create
- [ ] `app/public/co-host-requests.html`
- [ ] `app/src/co-host-requests.jsx`
- [ ] `app/src/islands/pages/CoHostRequestsPage/index.jsx`
- [ ] `app/src/islands/pages/CoHostRequestsPage/CoHostRequestsPage.jsx`
- [ ] `app/src/islands/pages/CoHostRequestsPage/useCoHostRequestsPageLogic.js`
- [ ] `app/src/islands/pages/CoHostRequestsPage/components/CoHostRequestCard.jsx`
- [ ] `app/src/islands/pages/CoHostRequestsPage/components/FilterSection.jsx`
- [ ] `app/src/islands/pages/CoHostRequestsPage/components/StatisticsBar.jsx`
- [ ] `app/src/islands/pages/CoHostRequestsPage/components/RequestDetailsModal.jsx`
- [ ] `app/src/islands/pages/CoHostRequestsPage/components/StatusBadge.jsx`
- [ ] `app/src/islands/pages/CoHostRequestsPage/components/ActionButtons.jsx`
- [ ] `app/src/islands/pages/CoHostRequestsPage/CoHostRequestsPage.css`
- [ ] `supabase/functions/co-host-requests/index.ts`

### Files to Modify
- [ ] `app/src/routes.config.js` - Add new route

---

## Route Configuration

```javascript
// Add to routes.config.js in CORPORATE INTERNAL TOOLS section
{
  path: '/_internal/co-host-requests',
  file: 'co-host-requests.html',
  aliases: ['/_internal/co-host-requests.html', '/co-host-requests'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'co-host-requests-view',
  hasDynamicSegment: false
}
```

---

## Edge Function API Design

### Endpoint: `POST /functions/v1/co-host-requests`

#### Action: `list`
```json
{
  "action": "list",
  "payload": {
    "limit": 25,
    "offset": 0,
    "filters": {
      "status": "Co-Host Requested",
      "searchText": "john",
      "dateRange": { "start": "2025-01-01", "end": "2025-12-31" }
    },
    "sortField": "Created Date",
    "sortOrder": "desc"
  }
}
```

#### Action: `updateStatus`
```json
{
  "action": "updateStatus",
  "payload": {
    "requestId": "1757673351993x723795763816038400",
    "newStatus": "Request closed",
    "adminNotes": "Resolved via phone call"
  }
}
```

#### Action: `assignCoHost`
```json
{
  "action": "assignCoHost",
  "payload": {
    "requestId": "1757673351993x723795763816038400",
    "cohostUserId": "user_id_here"
  }
}
```

#### Action: `getStatistics`
```json
{
  "action": "getStatistics"
}
// Returns: { "Co-Host Requested": 14, "Request closed": 9, ... }
```

---

## Key References

### Existing Internal Tools (Reference Architecture)
- [useQuickPricePageLogic.js](../../../app/src/islands/pages/QuickPricePage/useQuickPricePageLogic.js) - Edge function pattern
- [useGuestRelationshipsDashboardLogic.js](../../../app/src/islands/pages/GuestRelationshipsDashboard/useGuestRelationshipsDashboardLogic.js) - Complex state management
- [useManageInformationalTextsPageLogic.js](../../../app/src/islands/pages/useManageInformationalTextsPageLogic.js) - CRUD operations

### Database Tables
- `co_hostrequest` - Main table (26 records currently)
- `user` - For host and co-host lookups
- `listing` - For property information

### Source Repository Files
- `src/pages/CoHostRequestsPage.tsx` - Main page (needs hollow conversion)
- `src/services/api.ts` - API structure to replicate
- `src/types/cohost.types.ts` - Data model reference
- `src/components/*` - UI components to convert

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Status value mismatch | HIGH | Use DB values, map for display |
| Missing user data in joins | MEDIUM | Handle null cases gracefully |
| TypeScript conversion errors | LOW | Careful JSDoc annotation |
| Different feature expectations | MEDIUM | Document actual vs expected behavior |

---

## Success Criteria

1. Page loads at `/_internal/co-host-requests`
2. Displays all existing co-host requests from database
3. Filtering by status works with real status values
4. Search finds requests by host name, listing name
5. Statistics bar shows accurate counts
6. Admin can change request status
7. Admin can assign co-host to request
8. Admin can add notes to request
9. Detail modal shows full request information
10. Follows Hollow Component pattern
11. Uses Edge Function for all data operations

---

## Post-Implementation Reminders

- [ ] Run `bun run generate-routes` after adding route
- [ ] Deploy Edge Function: `supabase functions deploy co-host-requests`
- [ ] Test with admin user authentication
- [ ] Commit changes to current branch
