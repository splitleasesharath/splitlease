# Informational Texts Admin Tool Migration Plan

**Created**: 2026-01-21 15:00:00
**Source Repository**: https://github.com/splitleasesharath/_add-informational-texts.git
**Classification**: BUILD (new internal admin feature)
**Complexity**: Medium - requires architectural adaptation but no database changes

---

## Executive Summary

The source repository is a **standalone React admin tool** for creating/managing informational text records in Supabase. The Split Lease codebase **already has** the consumer-side infrastructure:
- ✅ `InformationalText.jsx` component (displays tooltips)
- ✅ `informationalTextsFetcher.js` (fetches from `informationaltexts` table)
- ✅ `informationaltexts` Supabase table (15 columns, fully populated)

**What's missing**: An admin interface to CREATE/UPDATE/DELETE these records without direct database access.

---

## Architecture Comparison

### Source Repository (Standalone Tool)

```
_add-informational-texts/
├── src/
│   ├── App.tsx                    → Main state management
│   ├── components/
│   │   ├── InformationalTextForm.tsx  → Form for creating entries
│   │   ├── PreviewPanel.tsx           → Entry list + preview
│   │   └── InfoPopup.tsx              → Help modal
│   └── lib/
│       └── supabase.ts            → Direct Supabase client
```

**Pattern**: Direct client-to-Supabase (no Edge Functions)

### Target Architecture (Split Lease)

```
app/
├── public/
│   └── manage-informational-texts.html  → NEW: HTML entry point
├── src/
│   ├── manage-informational-texts.jsx   → NEW: React mount
│   └── islands/
│       └── pages/
│           └── ManageInformationalTextsPage.jsx  → NEW: Page component
│           └── useManageInformationalTextsPageLogic.js  → NEW: Logic hook

supabase/functions/
└── informational-texts/             → NEW: Edge Function (action-based)
    └── index.ts
```

**Pattern**: Hollow component + Edge Function (Split Lease standard)

---

## Discrepancies & Required Fixes

### 1. **Direct Supabase Access → Edge Function**

| Source | Target |
|--------|--------|
| `supabase.from('informationaltexts').insert(...)` | `POST /informational-texts { action: 'create', payload: {...} }` |

**Why**: Split Lease architecture requires all database operations go through Edge Functions for security, validation, and Bubble sync compatibility.

**Fix**: Create `supabase/functions/informational-texts/index.ts` with action-based routing:
- `list` - Get all entries (paginated)
- `get` - Get single entry by ID
- `create` - Insert new entry
- `update` - Update existing entry
- `delete` - Soft delete entry

---

### 2. **TypeScript → JavaScript**

| Source | Target |
|--------|--------|
| `.tsx` components | `.jsx` components |
| Type annotations | JSDoc comments (optional) |

**Why**: Split Lease frontend uses JavaScript with JSDoc for documentation.

**Fix**: Convert all TypeScript to JavaScript, remove type annotations, use prop destructuring for self-documentation.

---

### 3. **Standalone App → Islands Architecture**

| Source | Target |
|--------|--------|
| Single `App.tsx` root | HTML file + mount script + page component |
| State in App component | Hollow component pattern (logic hook) |

**Why**: Split Lease uses islands architecture where each page is an independent React root.

**Fix**:
1. Create `public/manage-informational-texts.html`
2. Create `src/manage-informational-texts.jsx` (mount script)
3. Create `islands/pages/ManageInformationalTextsPage.jsx` (UI only)
4. Create `islands/pages/useManageInformationalTextsPageLogic.js` (all state/handlers)

---

### 4. **Column Name Mapping**

The database uses Bubble-style column names with spaces. The fetcher already handles this:

| Database Column | JavaScript Key |
|-----------------|----------------|
| `Information Tag-Title` | `tagTitle` |
| `Desktop copy` | `desktop` |
| `Desktop+ copy` | `desktopPlus` |
| `Mobile copy` | `mobile` |
| `iPad copy` | `ipad` |
| `show more available?` | `showMore` |
| `Link` | `hasLink` |

**Fix**: Edge Function must handle bidirectional mapping (JS ↔ DB column names).

---

### 5. **Missing CRUD Operations**

| Source | Current Codebase |
|--------|------------------|
| CREATE only | READ only (via fetcher) |

**Why**: The source tool only creates entries. The existing fetcher only reads.

**Fix**: Edge Function needs full CRUD. Admin page needs:
- List view with all entries
- Create form (port from source)
- Edit form (new)
- Delete confirmation (new)

---

### 6. **Route Registration**

The source has no routing (standalone). Target needs:

```javascript
// routes.config.js - ADD:
{
  path: '/_internal/manage-informational-texts',
  file: 'manage-informational-texts.html',
  aliases: ['/_internal/manage-informational-texts.html'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'manage-informational-texts-view',
  hasDynamicSegment: false
}
```

---

### 7. **Styling Approach**

| Source | Target |
|--------|--------|
| Tailwind CSS | Inline styles / CSS modules |

**Why**: Split Lease doesn't use Tailwind in the main app (only some pages).

**Fix**: Convert Tailwind classes to inline styles or create a CSS file. Follow existing patterns in `islands/pages/`.

---

### 8. **Toast Notifications**

| Source | Target |
|--------|--------|
| `react-hot-toast` | Native implementation or existing pattern |

**Fix**: Check if `react-hot-toast` is already a dependency. If not, either add it or use the existing notification pattern from other admin pages.

---

### 9. **Preview Panel Enhancement**

The source's `PreviewPanel.tsx` shows a basic preview. For Split Lease:

**Enhancement**: Show how the text will appear in the actual `InformationalText.jsx` component across device sizes (Desktop, Desktop+, iPad, Mobile).

---

### 10. **Validation & Error Handling**

| Source | Target |
|--------|--------|
| Basic client-side validation | Edge Function validation + client-side |
| Toast for errors | Structured error responses + UI feedback |

**Fix**:
- Edge Function validates required fields (`tagTitle`, `desktop`)
- Edge Function checks for duplicate `Information Tag-Title`
- Client shows validation errors inline

---

## Implementation Plan

### Phase 1: Edge Function (Backend)

**File**: `supabase/functions/informational-texts/index.ts`

```typescript
// Actions:
// - list: GET all entries with pagination
// - get: GET single entry by _id
// - create: INSERT new entry
// - update: UPDATE existing entry (partial updates supported)
// - delete: Soft delete (set deleted_at or similar)

// Column mapping utility for JS ↔ DB conversion
```

**Estimated effort**: 2-3 hours

---

### Phase 2: Route & HTML Setup

1. **Add route** to `routes.config.js`
2. **Create HTML** file: `public/manage-informational-texts.html`
3. **Create mount script**: `src/manage-informational-texts.jsx`
4. **Run**: `bun run generate-routes`

**Estimated effort**: 30 minutes

---

### Phase 3: Page Component (UI)

**File**: `app/src/islands/pages/ManageInformationalTextsPage.jsx`

Port from source with adaptations:
- Two-column layout (form left, preview right)
- List of existing entries
- Create/Edit form
- Delete confirmation modal
- Device preview tabs (Desktop, Desktop+, iPad, Mobile)

**Estimated effort**: 3-4 hours

---

### Phase 4: Logic Hook

**File**: `app/src/islands/pages/useManageInformationalTextsPageLogic.js`

State management:
- `entries` - All informational texts
- `selectedEntry` - Currently selected for edit/preview
- `formData` - Current form state
- `isSubmitting` - Loading state
- `errors` - Validation errors
- `mode` - 'create' | 'edit'

Handlers:
- `fetchEntries()` - Load all entries via Edge Function
- `handleCreate(data)` - Create new entry
- `handleUpdate(id, data)` - Update existing entry
- `handleDelete(id)` - Delete entry
- `handleSelectEntry(entry)` - Select for edit/preview

**Estimated effort**: 2-3 hours

---

### Phase 5: Testing & Polish

- Test all CRUD operations
- Test responsive preview
- Test validation edge cases
- Test with existing `InformationalText.jsx` consumer

**Estimated effort**: 1-2 hours

---

## File Reference Summary

### Files to CREATE

| File | Purpose |
|------|---------|
| `supabase/functions/informational-texts/index.ts` | Edge Function for CRUD |
| `app/public/manage-informational-texts.html` | HTML entry point |
| `app/src/manage-informational-texts.jsx` | React mount script |
| `app/src/islands/pages/ManageInformationalTextsPage.jsx` | Page component (UI) |
| `app/src/islands/pages/useManageInformationalTextsPageLogic.js` | Logic hook |

### Files to MODIFY

| File | Change |
|------|--------|
| `app/src/routes.config.js` | Add new route entry |

### Files to REFERENCE (read-only context)

| File | Why |
|------|-----|
| [app/src/islands/shared/InformationalText.jsx](app/src/islands/shared/InformationalText.jsx) | Consumer component - understand how content is displayed |
| [app/src/lib/informationalTextsFetcher.js](app/src/lib/informationalTextsFetcher.js) | Existing column mapping pattern |
| [app/src/islands/pages/InternalTestPage.jsx](app/src/islands/pages/InternalTestPage.jsx) | Internal page pattern reference |
| [supabase/functions/leases-admin/index.ts](supabase/functions/leases-admin/index.ts) | Admin Edge Function pattern |
| [app/src/islands/pages/HostOverviewPage.jsx](app/src/islands/pages/HostOverviewPage.jsx) | Hollow component pattern reference |

### Source Repository Files (for porting)

| Source File | Maps To |
|-------------|---------|
| `src/components/InformationalTextForm.tsx` | Form section in `ManageInformationalTextsPage.jsx` |
| `src/components/PreviewPanel.tsx` | Preview section in `ManageInformationalTextsPage.jsx` |
| `src/components/InfoPopup.tsx` | Can reuse existing modal pattern |
| `src/App.tsx` | Logic moves to `useManageInformationalTextsPageLogic.js` |

---

## Database Schema Reference

**Table**: `informationaltexts`

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `_id` | text | YES | Primary key |
| `Information Tag-Title` | text | YES | Unique lookup key |
| `Desktop copy` | text | YES | Required content |
| `Desktop+ copy` | text | NO | Extended desktop content |
| `Mobile copy` | text | NO | Mobile-specific content |
| `iPad copy` | text | NO | iPad-specific content |
| `Link` | boolean | NO | Has link feature |
| `show more available?` | boolean | NO | Expandable content |
| `Created By` | text | YES | Audit field |
| `Created Date` | timestamp | YES | Audit field |
| `Modified Date` | timestamp | YES | Audit field |
| `created_at` | timestamp | NO | Supabase native |
| `updated_at` | timestamp | NO | Supabase native |
| `bubble_id` | text | NO | Legacy Bubble reference |
| `pending` | boolean | NO | Sync queue status |

---

## Security Considerations

1. **Route Protection**: `adminOnly: true` in route config
2. **Edge Function Auth**: Validate admin role in Edge Function
3. **Input Sanitization**: Sanitize HTML in content fields
4. **CSRF**: Use existing auth token pattern

---

## Rollback Plan

If issues arise:
1. Edge Function can be disabled without affecting existing read-only functionality
2. Route can be removed from `routes.config.js`
3. No database schema changes = no migration rollback needed

---

## Success Criteria

- [ ] Admin can list all informational texts
- [ ] Admin can create new informational text with all device variants
- [ ] Admin can edit existing informational text
- [ ] Admin can delete informational text (soft delete)
- [ ] Preview shows content as it appears in `InformationalText.jsx`
- [ ] Existing consumer functionality unchanged
- [ ] Route protected to admin users only

---

## Estimated Total Effort

| Phase | Hours |
|-------|-------|
| Edge Function | 2-3 |
| Route Setup | 0.5 |
| Page Component | 3-4 |
| Logic Hook | 2-3 |
| Testing | 1-2 |
| **Total** | **9-12.5 hours** |

