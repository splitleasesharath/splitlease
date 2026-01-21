# Quick-Price Tool Migration Plan

**Created**: 2026-01-21 16:00:00
**Source**: https://github.com/splitleasesharath/_quick-price.git
**Status**: Planning
**Classification**: BUILD (New Feature Migration)

---

## Executive Summary

Migrate the standalone `_quick-price` admin dashboard (vanilla JavaScript) into the Split Lease React 18 + Vite Islands Architecture. This tool enables internal staff to modify listing prices, add price overrides, apply discounts, and manage bulk pricing operations.

---

## Source Repository Analysis

### Current State (quick-price repo)
| Aspect | Implementation |
|--------|---------------|
| Framework | Vanilla JavaScript (IIFE pattern) |
| State Management | Plain object (`const state = {}`) |
| Database | None (mock data only) |
| API | None (mock functions) |
| Authentication | Hardcoded email |
| Styling | Custom CSS with design system variables |
| Lines of Code | ~1,600 (JS/CSS) |

### Key Features to Migrate
1. **Listing Table Display** - 19 columns of pricing/listing data
2. **Advanced Filtering** - 7 filters (rental type, name, host, borough, neighborhood, date range)
3. **Sorting** - By creation date (asc/desc)
4. **Inline Actions** - Activate/deactivate, delete, change rental type
5. **Price Override Management** - Set custom prices per listing
6. **Global Pricing Config Display** - Site markup, discounts, ZAT config
7. **Bulk Operations** - Update all prices simultaneously
8. **Toast Notifications** - Success/warning/error feedback
9. **Confirmation Modals** - Delete confirmations with safety checks

---

## Target Architecture

### Split Lease Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUICK-PRICE TOOL (NEW)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  public/quick-price.html  ──→  src/quick-price.jsx (entry)     │
│                                     │                           │
│                                     ▼                           │
│  islands/pages/QuickPricePage/                                  │
│  ├── QuickPricePage.jsx         (hollow component)             │
│  ├── useQuickPricePageLogic.js  (all state/effects)            │
│  ├── components/                                                │
│  │   ├── PricingFilters.jsx     (filter sidebar)               │
│  │   ├── ListingsTable.jsx      (main data table)              │
│  │   ├── PricingConfigPanel.jsx (right sidebar)                │
│  │   ├── PriceEditModal.jsx     (inline price editing)         │
│  │   └── BulkActionsBar.jsx     (bulk operations)              │
│  └── quick-price.types.ts       (TypeScript interfaces)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EDGE FUNCTION (NEW)                           │
│              supabase/functions/pricing-admin/                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Actions:                                                       │
│  ├── list          - Paginated listing fetch with filters      │
│  ├── get           - Single listing detail                     │
│  ├── updatePrice   - Update pricing fields (single)            │
│  ├── bulkUpdate    - Batch price updates                       │
│  ├── setOverride   - Set/clear price override                  │
│  ├── toggleActive  - Activate/deactivate listing               │
│  ├── getConfig     - Fetch global pricing configuration        │
│  └── updateConfig  - Update global pricing parameters          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE CHANGES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NEW TABLE: pricing_configuration                               │
│  ├── id: UUID (PK)                                             │
│  ├── overall_site_markup: NUMERIC (default 0.17)               │
│  ├── weekly_markup: NUMERIC (default 0.10)                     │
│  ├── unused_nights_discount: NUMERIC (default 0.05)            │
│  ├── full_time_discount: NUMERIC (default 0.13)                │
│  ├── zat_version: VARCHAR                                      │
│  ├── zat_active: BOOLEAN                                       │
│  ├── updated_at: TIMESTAMP                                     │
│  └── updated_by: UUID (FK → auth.users)                        │
│                                                                 │
│  NEW TABLE: pricing_audit_log                                   │
│  ├── id: UUID (PK)                                             │
│  ├── listing_id: VARCHAR (FK → listing._id)                    │
│  ├── field_changed: VARCHAR                                    │
│  ├── old_value: JSONB                                          │
│  ├── new_value: JSONB                                          │
│  ├── changed_by: UUID (FK → auth.users)                        │
│  └── changed_at: TIMESTAMP                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Discrepancies & Required Fixes

### 1. Framework Migration (MAJOR)

| Source (quick-price) | Target (Split Lease) | Migration Work |
|---------------------|---------------------|----------------|
| Vanilla JS IIFE | React 18 functional components | Rewrite all JS |
| `const state = {}` | `useState()` + custom hooks | State refactor |
| `document.getElementById()` | JSX + refs (if needed) | DOM access removal |
| Event listeners | React event handlers | Event binding |
| `window.app` global | Props/context/hooks | API exposure |

### 2. Data Source Migration (MAJOR)

| Source | Target | Migration Work |
|--------|--------|----------------|
| `mockData.js` (25 fake listings) | Supabase `listing` table (real data) | API integration |
| In-memory state | Server-side with pagination | Add pagination |
| No persistence | Full CRUD via Edge Functions | New Edge Function |
| Hardcoded neighborhoods | Database or config file | Externalize config |

### 3. Field Name Mapping (CRITICAL)

The quick-price repo uses different field names than Split Lease:

| quick-price Field | Split Lease Field | Notes |
|------------------|-------------------|-------|
| `id` | `_id` | Bubble-compatible ID |
| `name` | `🏷Name` | Emoji prefix convention |
| `active` | `✅Active` | Boolean status |
| `rentalType` | `🏠Rental Type` | Enum field |
| `hostEmail` | `👤Host._id` → join to get email | FK relationship |
| `borough` | `📍Borough` | NYC borough |
| `locationHood` | `📍Neighborhood` | Sub-location |
| `unitMarkup` | `💰Unit Markup` | Price multiplier |
| `weeklyHostRate` | `💰Weekly Host Compensation` | Weekly rate |
| `monthlyHostRate` | `💰Monthly Host Compensation` | Monthly rate |
| `nightlyRate5` | `💰Nightly Host Rate for 5 nights` | Frequency pricing |
| `nightlyRate4` | `💰Nightly Host Rate for 4 nights` | Frequency pricing |
| `nightlyRate3` | `💰Nightly Host Rate for 3 nights` | Frequency pricing |
| `nightlyRate2` | `💰Nightly Host Rate for 2 nights` | Frequency pricing |
| `cleaningCost` | `💰Cleaning Cost / Maintenance Fee` | Optional fee |
| `damageDeposit` | `💰Damage Deposit` | Required deposit |
| `priceOverride` | `💰Price Override` | ✅ Already exists! |
| `receptivityOverride` | `📊Receptivity Override` | NEW - needs column |
| `createdAt` | `Created Date` | Timestamp |

### 4. Authentication Gap (CRITICAL)

| Source | Target | Migration Work |
|--------|--------|----------------|
| Hardcoded `admin@splitlease.com` | Supabase Auth + role check | Add auth middleware |
| No authorization | Admin-only access | Implement RLS + role |
| No audit trail | Full change logging | New audit table |

### 5. Pricing Constants Alignment

The quick-price repo has different discount values than Split Lease:

| Parameter | quick-price | Split Lease | Action |
|-----------|-------------|-------------|--------|
| Site Markup | 15% | 17% | Use Split Lease value |
| Weekly Markup | 10% | N/A | Add to pricingConstants.js |
| Unused Nights Discount | 5% | N/A | Add to pricingConstants.js |
| Full-Time Discount | 20% | 13% | Use Split Lease value |
| Full-Time Threshold | Not specified | 7 nights | Keep Split Lease |

### 6. CSS/Styling Migration

| Source | Target | Migration Work |
|--------|--------|----------------|
| Custom CSS variables | Split Lease design tokens | Map variables |
| 1000+ lines custom CSS | Existing component styles | Selective adoption |
| Inter font | Split Lease typography | Use existing fonts |
| Three-column layout | Islands page pattern | Adapt layout |

### 7. Missing Features in Split Lease

Features from quick-price that don't exist in Split Lease yet:

| Feature | Implementation Needed |
|---------|----------------------|
| Bulk price update | New Edge Function action |
| Price audit log | New database table |
| Global pricing config table | New database table |
| Neighborhood cascading dropdown | Externalize NYC neighborhoods |
| Admin-only internal page | New route + auth guard |
| Price override UI | New modal component |

---

## Implementation Phases

### Phase 1: Database Setup (Day 1)

1. **Create `pricing_configuration` table**
   - Store global pricing parameters
   - Single row (singleton pattern)
   - RLS: Admin read/write only

2. **Create `pricing_audit_log` table**
   - Track all pricing changes
   - Immutable (insert-only)
   - RLS: Admin read only

3. **Add missing columns to `listing` table** (if needed)
   - Verify `💰Price Override` exists ✅
   - Add `📊Receptivity Override` if missing

### Phase 2: Edge Function (Days 2-3)

Create `supabase/functions/pricing-admin/` following `leases-admin` pattern:

```typescript
// Actions to implement
switch (action) {
  case 'list':        // Paginated listing fetch with filters
  case 'get':         // Single listing with all pricing fields
  case 'updatePrice': // Update specific pricing fields
  case 'bulkUpdate':  // Batch updates with transaction
  case 'setOverride': // Set/clear price override
  case 'toggleActive':// Activate/deactivate listing
  case 'getConfig':   // Fetch pricing configuration
  case 'updateConfig':// Update pricing parameters (admin only)
}
```

**Critical**: Follow the "send only changed fields" pattern to avoid FK constraint violations.

### Phase 3: Frontend Components (Days 4-6)

1. **Route Registration**
   - Add to `routes.config.js`: `/internal/quick-price`
   - Create `public/quick-price.html`
   - Create `src/quick-price.jsx` entry point

2. **Page Component** (Hollow Pattern)
   ```
   QuickPricePage/
   ├── QuickPricePage.jsx          # UI only, delegates to hook
   ├── useQuickPricePageLogic.js   # All state, effects, handlers
   ├── components/
   │   ├── PricingFilters.jsx      # Left sidebar filters
   │   ├── ListingsTable.jsx       # Main data table
   │   ├── PricingConfigPanel.jsx  # Right sidebar
   │   ├── PriceEditModal.jsx      # Edit pricing modal
   │   ├── DeleteConfirmModal.jsx  # Delete confirmation
   │   └── BulkActionsBar.jsx      # Bulk operation controls
   └── quick-price.types.ts        # TypeScript definitions
   ```

3. **Reuse Existing Components**
   - Toast notifications: Use existing pattern
   - Modal base: Use existing modal components
   - Form inputs: Use existing form components
   - Loading states: Use existing spinners

### Phase 4: Integration & Testing (Days 7-8)

1. **Connect frontend to Edge Function**
2. **Test with real listing data**
3. **Verify Bubble sync for price changes**
4. **Test bulk operations with transaction rollback**
5. **Verify audit log entries**

### Phase 5: Polish & Deploy (Days 9-10)

1. **Add pagination** (listings table can be large)
2. **Add export functionality** (CSV/JSON)
3. **Add keyboard shortcuts** (efficiency for admin users)
4. **Deploy Edge Function** (manual reminder)
5. **Update documentation**

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| FK constraint violations on update | HIGH | Use changed-fields-only pattern |
| Bubble sync failures | MEDIUM | Queue-based async sync already exists |
| Admin auth bypass | HIGH | Implement proper RLS + role checks |
| Price calculation drift | MEDIUM | Reuse existing calculators |
| Performance with large datasets | MEDIUM | Add pagination + indexes |

---

## File References

### Existing Files to Integrate With

| File | Purpose |
|------|---------|
| [routes.config.js](../../../app/src/routes.config.js) | Add new route |
| [pricingConstants.js](../../../app/src/logic/constants/pricingConstants.js) | Pricing values |
| [calculateGuestFacingPrice.js](../../../app/src/logic/calculators/pricing/calculateGuestFacingPrice.js) | Price calculations |
| [getNightlyRateByFrequency.js](../../../app/src/logic/calculators/pricing/getNightlyRateByFrequency.js) | Rate lookup |
| [leases-admin/index.ts](../../../supabase/functions/leases-admin/index.ts) | Edge Function pattern |
| [_shared/cors.ts](../../../supabase/functions/_shared/cors.ts) | CORS handling |
| [_shared/errors.ts](../../../supabase/functions/_shared/errors.ts) | Error responses |
| [queueSync.ts](../../../supabase/functions/_shared/queueSync.ts) | Bubble sync queue |

### New Files to Create

| File | Purpose |
|------|---------|
| `public/quick-price.html` | HTML entry point |
| `src/quick-price.jsx` | React mount point |
| `islands/pages/QuickPricePage/QuickPricePage.jsx` | Page component |
| `islands/pages/QuickPricePage/useQuickPricePageLogic.js` | Page logic hook |
| `islands/pages/QuickPricePage/components/*.jsx` | Sub-components |
| `supabase/functions/pricing-admin/index.ts` | Edge Function |
| `supabase/functions/pricing-admin/handlers/*.ts` | Action handlers |
| `supabase/migrations/YYYYMMDD_pricing_admin_tables.sql` | New tables |

### Source Repository Files (Reference Only)

| File | Use For |
|------|---------|
| `src/js/app.js` | Feature logic reference |
| `src/js/mockData.js` | Data structure reference |
| `src/css/styles.css` | UI pattern reference |
| `SL _quick-price Page BUBBLE APP REQUIREMENTS SPECIFICATION.md` | Requirements doc |

---

## Success Criteria

- [ ] Admin users can view all listings with pricing data
- [ ] Filters work: rental type, name, host, borough, neighborhood, date range
- [ ] Sorting works: by creation date (asc/desc)
- [ ] Individual price fields can be edited
- [ ] Price override can be set/cleared
- [ ] Listings can be activated/deactivated
- [ ] Bulk price updates work with proper transaction handling
- [ ] All changes are logged in audit table
- [ ] Bubble sync triggers automatically on price changes
- [ ] Only admin users can access the tool
- [ ] No FK constraint violations on updates

---

## Estimated Effort

| Phase | Days | Tasks |
|-------|------|-------|
| Database Setup | 1 | Migrations, RLS policies |
| Edge Function | 2 | 8 actions + error handling |
| Frontend Components | 3 | Page + 6 components + hook |
| Integration & Testing | 2 | E2E testing, edge cases |
| Polish & Deploy | 2 | Pagination, export, docs |
| **Total** | **10** | Full migration |

---

## Next Steps

1. **User Approval**: Review this plan and confirm scope
2. **Clarify Questions**:
   - Should `receptivityOverride` be added to listings?
   - Should global pricing config be editable or read-only?
   - What admin role identifier exists in the system?
   - Should Bubble sync be immediate or queue-based for price changes?
3. **Begin Phase 1**: Database migrations after approval
