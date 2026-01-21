# Leases Overview Migration Plan

**Date:** 2026-01-20
**Source:** https://github.com/splitleasesharath/_leases-overview.git
**Target:** Split Lease Monorepo (Islands Architecture)
**Status:** PLANNING

---

## Executive Summary

Migrate the standalone `_leases-overview` React dashboard into the Split Lease monorepo, adapting it to the Islands Architecture, Supabase Edge Functions, and established codebase patterns.

---

## Source Repository Analysis

### Technology Stack (Source)
| Category | Source Tech | Target Tech |
|----------|-------------|-------------|
| UI Framework | React 18 + TypeScript | React 18 + JavaScript |
| Build Tool | Vite (standalone) | Vite (monorepo) |
| Routing | React Router DOM | Islands (page per HTML) |
| HTTP Client | Axios → REST API | fetch → Edge Functions |
| State | Local hooks | Local hooks (same) |
| Styling | Vanilla CSS | Vanilla CSS + BEM |
| Types | TypeScript strict | JSDoc (no TS in frontend) |

### Source File Structure
```
_leases-overview/
├── src/
│   ├── components/
│   │   ├── LeaseCard.tsx
│   │   ├── SearchBox.tsx
│   │   ├── LeaseDropdown.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Alert.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── EmptyState.tsx
│   ├── pages/
│   │   └── LeasesOverviewPage.tsx
│   ├── types/
│   │   └── lease.types.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── mockData.ts
│   ├── hooks/
│   │   ├── useBookings.ts
│   │   └── useAlert.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── clipboard.ts
│   └── styles/
│       └── index.css
```

---

## Target Architecture Mapping

### File Mapping (Source → Target)

| Source File | Target File | Notes |
|-------------|-------------|-------|
| `pages/LeasesOverviewPage.tsx` | `app/src/islands/pages/LeasesOverviewPage/LeasesOverviewPage.jsx` | Convert to Hollow Component |
| (new) | `app/src/islands/pages/LeasesOverviewPage/useLeasesOverviewPageLogic.js` | Extract all logic |
| `components/LeaseCard.tsx` | `app/src/islands/pages/LeasesOverviewPage/components/LeaseCard.jsx` | Convert TS → JS |
| `components/SearchBox.tsx` | `app/src/islands/pages/LeasesOverviewPage/components/SearchBox.jsx` | Simplify |
| `components/LeaseDropdown.tsx` | `app/src/islands/pages/LeasesOverviewPage/components/LeaseDropdown.jsx` | Simplify |
| `components/ConfirmDialog.tsx` | `app/src/islands/shared/modals/ConfirmDialog.jsx` | May already exist |
| `components/LoadingSpinner.tsx` | Use existing shared component | Check if exists |
| `components/EmptyState.tsx` | Use existing shared component | Check if exists |
| `components/Alert.tsx` | Use existing `Toast.jsx` system | Already exists! |
| `hooks/useBookings.ts` | Merge into `useLeasesOverviewPageLogic.js` | Hollow component pattern |
| `hooks/useAlert.ts` | Use existing `ToastProvider` | Already exists! |
| `services/api.ts` | `supabase/functions/leases-admin/index.ts` | New Edge Function |
| `types/lease.types.ts` | JSDoc comments in logic files | No TypeScript in frontend |
| `utils/formatters.ts` | `app/src/logic/processors/leases/formatLeaseDisplay.js` | Four-layer logic |
| `utils/clipboard.ts` | `app/src/lib/clipboard.js` | General utility |
| `styles/index.css` | `app/src/styles/pages/leases-overview.css` | BEM naming |
| (new) | `app/public/leases-overview.html` | Static HTML shell |
| (new) | `app/src/leases-overview.jsx` | Entry point |

---

## Discrepancies & Required Fixes

### 1. TypeScript → JavaScript Conversion

**Source Pattern:**
```typescript
interface Lease {
  id: string;
  uniqueId: string;
  agreementNumber: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  paymentStatus: 'paid' | 'partial' | 'pending' | 'overdue';
  // ...
}

const LeaseCard: React.FC<{ lease: Lease }> = ({ lease }) => { ... }
```

**Target Pattern:**
```javascript
/**
 * @typedef {Object} Lease
 * @property {string} _id - Bubble-format ID
 * @property {string} uniqueId
 * @property {string} agreementNumber
 * @property {Date} startDate
 * @property {Date} endDate
 * @property {number} totalAmount
 * @property {'paid'|'partial'|'pending'|'overdue'} paymentStatus
 */

export default function LeaseCard({ lease }) { ... }
```

**Action:** Convert all TypeScript to JavaScript with JSDoc type annotations.

---

### 2. Data Model Field Mapping

**Critical Differences:**

| Source Field | Target Field (Supabase) | Notes |
|--------------|-------------------------|-------|
| `id` | `_id` | Bubble uses `_id` as PK |
| `lease.listing` | `Listing` (FK → `listing._id`) | Capital L, FK reference |
| `lease.guestEmail` | `Guest` (FK → `user._id`) | Need to join `user` table |
| `lease.hostEmail` | `listing.Creator` | Join through listing |
| `startDate` | `Start Date` | Space in column name |
| `endDate` | `End Date` | Space in column name |
| `createdAt` | `Created Date` | Different naming |
| `totalAmount` | `Total Price` | Different naming |
| `paymentStatus` | `Payment Status` | Map to option set values |
| `leaseStatus` | `Status` | Map to option set values |
| `stays[]` | `bookings_stays` (separate table) | FK join required |

**Action:** Create adapter functions in `logic/processors/leases/`:
```javascript
// adaptLeaseFromSupabase.js
export function adaptLeaseFromSupabase(row) {
  return {
    id: row._id,
    uniqueId: row['Unique ID'] || row._id,
    agreementNumber: row['Agreement Number'],
    startDate: new Date(row['Start Date']),
    endDate: new Date(row['End Date']),
    totalAmount: row['Total Price'] || 0,
    paymentStatus: mapPaymentStatus(row['Payment Status']),
    leaseStatus: mapLeaseStatus(row['Status']),
    guestEmail: row.guest?.email || '',
    hostEmail: row.listing?.creator?.email || '',
    listing: row.listing ? adaptListingFromSupabase(row.listing) : null,
    stays: row.stays?.map(adaptStayFromSupabase) || [],
    createdAt: new Date(row['Created Date']),
  };
}
```

---

### 3. API Layer → Edge Function Conversion

**Source Pattern (Axios):**
```typescript
// services/api.ts
const api = axios.create({ baseURL: 'https://api.splitlease.com/v1' });

export const fetchBookings = async (params) => {
  const { data } = await api.get('/bookings', { params });
  return data;
};

export const deleteBooking = async (id) => {
  await api.delete(`/bookings/${id}`);
};
```

**Target Pattern (Edge Function):**
```javascript
// In useLeasesOverviewPageLogic.js
const fetchLeases = async (filters) => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/leases-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAccessToken()}`,
    },
    body: JSON.stringify({
      action: 'list',
      payload: { filters, pagination: { limit: 50, offset: 0 } }
    })
  });
  return response.json();
};
```

**New Edge Function Required:**
```typescript
// supabase/functions/leases-admin/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors();

  const { action, payload } = await req.json();
  const supabase = createClient(/* ... */);

  switch (action) {
    // === CRUD Operations ===
    case 'list':
      // Query bookings_leases with joins
      const { data, error } = await supabase
        .from('bookings_leases')
        .select(`
          *,
          listing:Listing(*),
          guest:Guest(*),
          proposal:Proposal(*),
          stays:bookings_stays(*)
        `)
        .order('Created Date', { ascending: false })
        .range(payload.offset, payload.offset + payload.limit - 1);
      return new Response(JSON.stringify({ data, error }), { headers: corsHeaders });

    case 'get':
      // Single lease with full details
      break;

    case 'updateStatus':
      // Update lease status
      break;

    // === Delete Operations ===
    case 'softDelete':
      // Set Status to 'cancelled' (recoverable)
      break;

    case 'hardDelete':
      // Permanently remove record (requires extra confirmation token)
      break;

    // === Bulk Operations ===
    case 'bulkUpdateStatus':
      // Update status for multiple leases
      // payload: { leaseIds: string[], newStatus: string }
      break;

    case 'bulkSoftDelete':
      // Soft delete multiple leases
      // payload: { leaseIds: string[] }
      break;

    case 'bulkExport':
      // Generate CSV/JSON export of selected leases
      // payload: { leaseIds: string[], format: 'csv' | 'json' }
      break;

    // === Document Operations ===
    case 'uploadDocument':
      // Upload file to Supabase Storage, link to lease
      // payload: { leaseId: string, fileName: string, fileType: string, fileBase64: string }
      break;

    case 'deleteDocument':
      // Remove document from storage and lease record
      // payload: { leaseId: string, documentId: string }
      break;

    case 'listDocuments':
      // Get all documents for a lease
      // payload: { leaseId: string }
      break;
  }
});
```

---

### 4. State Management Pattern

**Source Pattern (Custom Hooks):**
```typescript
// useBookings.ts - contains state + fetch + filter logic
const useBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // ... all logic here
};
```

**Target Pattern (Hollow Component):**
```javascript
// useLeasesOverviewPageLogic.js - ALL logic goes here
export function useLeasesOverviewPageLogic() {
  // State
  const [leases, setLeases] = useState([]);
  const [filteredLeases, setFilteredLeases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ field: 'startDate', order: 'desc' });

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const user = await checkAuthStatus();
      if (!user) {
        window.location.href = '/';
        return;
      }
      fetchLeases();
    };
    checkAuth();
  }, []);

  // Fetch leases
  const fetchLeases = async () => { /* ... */ };

  // Filter logic (use logic/processors/)
  useEffect(() => {
    const filtered = filterLeases(leases, { searchQuery, statusFilter });
    const sorted = sortLeases(filtered, sortConfig);
    setFilteredLeases(sorted);
  }, [leases, searchQuery, statusFilter, sortConfig]);

  // Actions
  const handleDelete = async (leaseId) => { /* ... */ };
  const handleStatusChange = async (leaseId, newStatus) => { /* ... */ };

  return {
    leases: filteredLeases,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortConfig,
    setSortConfig,
    handleDelete,
    handleStatusChange,
  };
}

// LeasesOverviewPage.jsx - ONLY renders UI
export default function LeasesOverviewPage() {
  const logic = useLeasesOverviewPageLogic();

  if (logic.isLoading) return <LoadingState />;
  if (logic.error) return <ErrorState message={logic.error} />;

  return (
    <div className="leases-overview-page">
      <SearchBox value={logic.searchQuery} onChange={logic.setSearchQuery} />
      <LeaseDropdown value={logic.statusFilter} onChange={logic.setStatusFilter} />
      <LeaseTable leases={logic.leases} onSort={logic.setSortConfig} />
    </div>
  );
}
```

---

### 5. Toast/Alert System

**Source Pattern:**
```typescript
// useAlert.ts - custom alert hook
const { showAlert, hideAlert } = useAlert();
showAlert('success', 'Lease deleted successfully');
```

**Target Pattern:**
```javascript
// Use existing ToastProvider from app/src/islands/shared/Toast.jsx
import { ToastProvider, useToast } from '../shared/Toast';

// Wrap page component
<ToastProvider>
  <LeasesOverviewPage />
</ToastProvider>

// In component
const { showToast } = useToast();
showToast({ title: 'Lease deleted successfully', type: 'success' });
```

**⚠️ CRITICAL:** Per the toast regression report in the user's selection, ensure inline toasts use the correct DOM structure matching `toast.css`:
```jsx
<div className="toast-container">
  <div className={`toast toast-${type} show`}>
    <svg className="toast-icon">...</svg>
    <div className="toast-content">
      <h4 className="toast-title">{title}</h4>
    </div>
    <button className="toast-close">×</button>
  </div>
</div>
```

---

### 6. Route Registration

**Add to `app/src/routes.config.js`:**
```javascript
{
  path: '/_internal/leases-overview',
  file: 'leases-overview.html',
  aliases: ['/_internal/leases-overview.html'],
  protected: true,
  adminOnly: true,  // Admin-only access
  cloudflareInternal: true,
  internalName: 'leases-overview-view',
  hasDynamicSegment: false
}
```

**After adding, run:**
```bash
bun run generate-routes
```

> **Note:** The `/_internal` prefix follows the pattern used by `create-suggested-proposal` flow for admin-only internal tools.

---

### 7. Styling Migration

**Source:** Single `index.css` with flat class names
**Target:** BEM naming convention + CSS variables

**Conversion Example:**
```css
/* Source */
.lease-card { ... }
.lease-card-header { ... }
.lease-card-status { ... }
.status-active { ... }

/* Target */
.lease-card { ... }
.lease-card__header { ... }
.lease-card__status { ... }
.lease-card__status--active { ... }
```

**Use CSS variables from `styles/variables.css`:**
```css
.lease-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.lease-card__status--active {
  color: var(--color-success);
}

.lease-card__status--cancelled {
  color: var(--color-danger);
}
```

---

### 8. Utility Functions → Four-Layer Logic

**Source Utils → Target Logic Layer:**

| Source Function | Target Location | Layer |
|-----------------|-----------------|-------|
| `formatDate()` | `logic/processors/leases/formatLeaseDisplay.js` | Processor |
| `formatCurrency()` | `logic/processors/leases/formatLeaseDisplay.js` | Processor |
| `calculatePaymentProgress()` | `logic/calculators/leases/calculatePaymentProgress.js` | Calculator |
| `truncateId()` | `lib/stringUtils.js` | Utility |
| `maskEmail()` | `lib/stringUtils.js` | Utility |

**Create new logic files:**
```javascript
// logic/calculators/leases/calculatePaymentProgress.js
export function calculatePaymentProgress(paidAmount, totalAmount) {
  if (!totalAmount || totalAmount === 0) return 0;
  return Math.min(100, Math.round((paidAmount / totalAmount) * 100));
}

// logic/rules/leases/canDeleteLease.js
export function canDeleteLease(lease) {
  // Can only delete draft or cancelled leases
  return ['draft', 'cancelled'].includes(lease.status);
}

// logic/processors/leases/filterLeases.js
export function filterLeases(leases, { searchQuery, statusFilter }) {
  return leases.filter(lease => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        lease.id.toLowerCase().includes(query) ||
        lease.agreementNumber?.toLowerCase().includes(query) ||
        lease.guestEmail?.toLowerCase().includes(query) ||
        lease.listing?.name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      if (lease.status !== statusFilter) return false;
    }

    return true;
  });
}
```

---

## Implementation Sequence

### Phase 1: Infrastructure (Files & Routes)
1. ☐ Create `app/public/leases-overview.html`
2. ☐ Create `app/src/leases-overview.jsx` (entry point)
3. ☐ Add route to `app/src/routes.config.js` with `/_internal/leases-overview` path
4. ☐ Run `bun run generate-routes`
5. ☐ Create directory structure under `app/src/islands/pages/LeasesOverviewPage/`

### Phase 2: Edge Function (Core)
1. ☐ Create `supabase/functions/leases-admin/index.ts`
2. ☐ Implement `list` action with Supabase query
3. ☐ Implement `get` action for single lease details
4. ☐ Implement `updateStatus` action
5. ☐ Implement `softDelete` action (set Status to cancelled)
6. ☐ Implement `hardDelete` action (permanent removal, extra confirmation)
7. ☐ Test locally with `supabase functions serve`

### Phase 3: Edge Function (Extended Features)
1. ☐ Implement `bulkUpdateStatus` action
2. ☐ Implement `bulkSoftDelete` action
3. ☐ Implement `bulkExport` action (CSV/JSON generation)
4. ☐ Implement `uploadDocument` action (Supabase Storage integration)
5. ☐ Implement `deleteDocument` action
6. ☐ Implement `listDocuments` action
7. ☐ Create Supabase Storage bucket for lease documents

### Phase 4: Logic Layer
1. ☐ Create `logic/calculators/leases/calculatePaymentProgress.js`
2. ☐ Create `logic/rules/leases/canDeleteLease.js`
3. ☐ Create `logic/rules/leases/canHardDeleteLease.js` (extra restrictions)
4. ☐ Create `logic/rules/leases/isLeaseActive.js`
5. ☐ Create `logic/processors/leases/adaptLeaseFromSupabase.js`
6. ☐ Create `logic/processors/leases/filterLeases.js`
7. ☐ Create `logic/processors/leases/formatLeaseDisplay.js`

### Phase 5: Page Component (Core)
1. ☐ Create `useLeasesOverviewPageLogic.js` (all business logic)
2. ☐ Create `LeasesOverviewPage.jsx` (hollow component)
3. ☐ Migrate and convert `LeaseCard.tsx` → `LeaseCard.jsx`
4. ☐ Migrate and convert `SearchBox.tsx` → `SearchBox.jsx`
5. ☐ Migrate and convert `LeaseDropdown.tsx` → `LeaseDropdown.jsx`
6. ☐ Integrate existing `ToastProvider` for notifications
7. ☐ Integrate existing `ConfirmDialog` or create if needed

### Phase 6: Page Component (Extended Features)
1. ☐ Add bulk selection UI (checkboxes on lease cards)
2. ☐ Create `BulkActionToolbar.jsx` component
3. ☐ Create `DocumentUploader.jsx` component (drag-and-drop)
4. ☐ Create `DocumentList.jsx` component
5. ☐ Add hard-delete confirmation modal (double confirmation)

### Phase 7: Styling
1. ☐ Create `app/src/styles/pages/leases-overview.css`
2. ☐ Convert class names to BEM convention
3. ☐ Replace hardcoded colors with CSS variables
4. ☐ Style bulk action toolbar
5. ☐ Style document uploader/list
6. ☐ Import in entry point

### Phase 8: Testing & Verification
1. ☐ Test authentication flow (admin-only access)
2. ☐ Test data fetching from Supabase
3. ☐ Test filtering and search
4. ☐ Test soft-delete with confirmation
5. ☐ Test hard-delete with double confirmation
6. ☐ Test bulk operations (select, status change, delete)
7. ☐ Test document upload/download/delete
8. ☐ Test toast notifications
9. ☐ Verify responsive design
10. ☐ Cross-browser testing

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| TypeScript removal loses type safety | Medium | Use JSDoc extensively, add prop-types |
| Data model mismatch causes bugs | High | Thorough adapter testing, log raw data |
| Edge Function query performance | Medium | Add indexes, test with production-like data |
| Toast styling regression | Medium | Follow DOM structure from regression report |
| Auth flow differences | Low | Reuse existing `auth.js` patterns |

---

## Files to Create (Summary)

### Frontend (app/)
```
app/
├── public/
│   └── leases-overview.html                    # NEW
├── src/
│   ├── leases-overview.jsx                     # NEW (entry)
│   ├── islands/pages/LeasesOverviewPage/
│   │   ├── LeasesOverviewPage.jsx              # NEW
│   │   ├── useLeasesOverviewPageLogic.js       # NEW
│   │   └── components/
│   │       ├── LeaseCard.jsx                   # MIGRATE
│   │       ├── SearchBox.jsx                   # MIGRATE
│   │       └── LeaseDropdown.jsx               # MIGRATE
│   ├── logic/
│   │   ├── calculators/leases/
│   │   │   └── calculatePaymentProgress.js     # NEW
│   │   ├── rules/leases/
│   │   │   ├── canDeleteLease.js               # NEW
│   │   │   └── isLeaseActive.js                # NEW
│   │   └── processors/leases/
│   │       ├── adaptLeaseFromSupabase.js       # NEW
│   │       ├── filterLeases.js                 # NEW
│   │       └── formatLeaseDisplay.js           # NEW
│   └── styles/pages/
│       └── leases-overview.css                 # NEW
```

### Backend (supabase/)
```
supabase/functions/
└── leases-admin/
    └── index.ts                                # NEW
```

### Config Updates
```
app/src/routes.config.js                        # MODIFY (add route)
```

---

## Dependencies

**No new npm packages needed** - the target architecture already has:
- React 18 ✓
- Vite ✓
- date-fns equivalent (or use `dayUtils.js`) ✓
- Toast system ✓

**Remove from source:**
- axios (use native fetch)
- react-router-dom (Islands don't use SPA routing)

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Infrastructure | 1 hour |
| Phase 2: Edge Function | 2-3 hours |
| Phase 3: Logic Layer | 2 hours |
| Phase 4: Page Component | 3-4 hours |
| Phase 5: Styling | 1-2 hours |
| Phase 6: Testing | 2 hours |
| **Total** | **11-14 hours** |

---

## Related Files

- [Source Repository](https://github.com/splitleasesharath/_leases-overview.git)
- [routes.config.js](../../app/src/routes.config.js)
- [Toast.jsx](../../app/src/islands/shared/Toast.jsx)
- [toast.css](../../app/src/styles/components/toast.css)
- [Toast Regression Report](./Documents/20260117131500-toast-styling-regression-report.md)
- [DATABASE_TABLES_DETAILED.md](../Documentation/Database/DATABASE_TABLES_DETAILED.md)
- [supabase/CLAUDE.md](../../supabase/CLAUDE.md)

---

## Approval Checklist

Before implementation:
- [x] Confirm route path → **`/_internal/leases-overview`** (internal admin path)
- [x] Confirm Edge Function name `leases-admin` is acceptable → **Yes**
- [x] Confirm this is an admin-only page (not guest-accessible) → **Admin-only**
- [x] Confirm delete should be soft-delete vs hard-delete → **Both options available**
- [x] Confirm if additional actions needed → **Import lease documents, bulk operations**

---

## Additional Features (Per User Feedback)

### 1. Import Lease Documents
Allow admin to upload/import lease documents (PDFs, contracts) and attach them to lease records.

**Implementation approach:**
- Add `documents` array field in lease data model
- Integrate with Supabase Storage for file uploads
- Add upload UI component with drag-and-drop
- Edge Function actions: `uploadDocument`, `deleteDocument`, `listDocuments`

### 2. Bulk Operations
Enable performing actions on multiple leases at once.

**Supported operations:**
- Bulk status change (e.g., mark multiple as "completed")
- Bulk export (download selected as CSV/PDF)
- Bulk soft-delete

**Implementation approach:**
- Add checkbox selection on lease cards
- Add bulk action toolbar that appears when items selected
- Edge Function action: `bulkUpdate` with array of lease IDs

### 3. Both Delete Options
- **Soft delete**: Sets `Status` to "cancelled" or "deleted" (recoverable)
- **Hard delete**: Permanently removes record (admin confirmation required)

**Implementation approach:**
- Primary delete button performs soft-delete
- "Permanently delete" option in dropdown for hard-delete (with extra confirmation)

---

**Ready for implementation upon approval.**
