# Plan: Purge Guest-Proposals Page Implementation

## Overview
Complete removal of all guest-proposals page code, routing, configuration, and related files to start fresh.

---

## Files to DELETE (17 files)

### 1. Entry Points & Core Files
| File | Description |
|------|-------------|
| `app/public/guest-proposals.html` | HTML entry point |
| `app/src/guest-proposals.jsx` | React entry point |
| `app/src/islands/pages/GuestProposalsPage.jsx` | Main page component (368 lines) |
| `app/src/islands/pages/useGuestProposalsPageLogic.js` | Page logic hook (960 lines) |

### 2. Proposals Components Directory (7 files)
| File | Description |
|------|-------------|
| `app/src/islands/proposals/ProposalCard.jsx` | Main proposal display card |
| `app/src/islands/proposals/ProposalSelector.jsx` | Dropdown selector |
| `app/src/islands/proposals/ProgressTracker.jsx` | 6-stage pipeline visualization |
| `app/src/islands/proposals/EmptyState.jsx` | No proposals message |
| `app/src/islands/proposals/ErrorState.jsx` | Error display |
| `app/src/islands/proposals/LoadingState.jsx` | Loading spinner |
| `app/src/islands/proposals/VirtualMeetingsSection.jsx` | Virtual meeting management |

### 3. Styling
| File | Description |
|------|-------------|
| `app/src/styles/components/guest-proposals.css` | All page styles (1,094 lines) |

### 4. Cloudflare Functions
| File | Description |
|------|-------------|
| `app/functions/guest-proposals/[id].js` | Dynamic route handler |
| `app/functions/guest-proposals/CLAUDE.md` | Function documentation |
| `app/functions/guest-proposals/` | (Delete entire directory) |

### 5. Build Artifacts (auto-regenerated, but can clean)
| File | Description |
|------|-------------|
| `app/dist/guest-proposals.html` | Built HTML |
| `app/dist/assets/guest-proposals-*.js` | Built JS bundle |
| `app/dist/assets/guest-proposals-*.css` | Built CSS |

### 6. Screenshots (optional cleanup)
| File | Description |
|------|-------------|
| `.playwright-mcp/guest-proposals-*.png` | 6 screenshot files |

---

## Files to MODIFY (7 files)

### 1. Routing Configuration

#### `app/vite.config.js`
**Remove lines ~27-50**: Development server routing for `/guest-proposals`
```javascript
// REMOVE: guest-proposals routing block
if (req.url?.startsWith('/guest-proposals')) {
  ...
}
```
**Remove line ~424**: Build config entry
```javascript
// REMOVE from rollupOptions.input:
'guest-proposals': resolve(__dirname, 'public/guest-proposals.html'),
```

#### `app/public/_routes.json`
**Remove** `/guest-proposals/*` from include array:
```json
{
  "include": [
    "/api/*"
    // REMOVE: "/guest-proposals/*"
  ]
}
```

#### `app/public/_redirects`
**Remove lines 22-23**: guest-proposals redirects (if present)

### 2. Navigation

#### `app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx`
**Remove lines ~183-195**: Navigation menu item
```javascript
// REMOVE from menuItems array:
{
  path: '/guest-proposals',
  label: 'My Proposals',
  icon: 'proposals',
  id: 'guest-proposals',
}
```

### 3. Authentication

#### `app/src/lib/auth.js`
**Remove** `/guest-proposals` from protected pages list (~lines 802-809)

#### `app/src/logic/rules/auth/isProtectedPage.js`
**Remove** guest-proposals from protected page rules

### 4. Styles Import

#### `app/src/styles/main.css`
**Remove** import of guest-proposals.css (if imported here)

---

## Files to KEEP (May reference proposals but are shared)

These files contain proposal-related logic but are NOT specific to the guest-proposals page. They may be used by other features and should be preserved:

| File | Reason to Keep |
|------|----------------|
| `app/src/logic/rules/proposals/proposalRules.js` | Shared proposal business rules |
| `app/src/logic/rules/proposals/CLAUDE.md` | Documentation |
| `app/src/logic/workflows/booking/*.js` | Booking workflows (shared) |
| `app/src/logic/processors/proposal/*.js` | Data processors (shared) |
| `app/src/lib/proposalDataFetcher.js` | Supabase data fetching (shared) |
| `app/src/islands/modals/*.jsx` | Modals (may be used elsewhere) |

---

## Documentation to ARCHIVE (Move to docs/Done/)

| File | Action |
|------|--------|
| `docs/GUEST_PROPOSALS_MIGRATION_PLAN.md` | Move to docs/Done/ |
| `docs/GUEST_PROPOSALS_BUTTON_CONDITIONALS.md` | Move to docs/Done/ |

---

## Execution Order

1. **Delete entry points**: `guest-proposals.html`, `guest-proposals.jsx`
2. **Delete page components**: `GuestProposalsPage.jsx`, `useGuestProposalsPageLogic.js`
3. **Delete proposals directory**: `app/src/islands/proposals/` (entire folder)
4. **Delete styles**: `guest-proposals.css`
5. **Delete functions**: `app/functions/guest-proposals/` (entire folder)
6. **Modify routing**: Update `vite.config.js`, `_routes.json`, `_redirects`
7. **Modify navigation**: Remove from `LoggedInAvatar.jsx`
8. **Modify auth**: Remove from `auth.js` and `isProtectedPage.js`
9. **Clean main.css**: Remove import if present
10. **Archive docs**: Move migration plans to Done/
11. **Clean build**: Delete `app/dist/guest-proposals*` files
12. **Clean screenshots**: Delete `.playwright-mcp/guest-proposals-*.png` (optional)

---

## Post-Purge Verification

After purge, run:
```bash
npm run build  # Should complete without guest-proposals references
```

Search for orphaned references:
```bash
grep -r "guest-proposals" app/
grep -r "GuestProposals" app/
```

---

## Change Log (Executed 2025-11-29)

| Action | Files | Status |
|--------|-------|--------|
| Delete entry points | 2 files | ✅ Complete |
| Delete page components | 2 files | ✅ Complete |
| Delete proposals components | 7 files | ✅ Complete |
| Delete styles | 1 file | ✅ Complete |
| Delete Cloudflare functions | 2 files + directory | ✅ Complete |
| Modify vite.config.js | Remove routing + build entry | ✅ Complete |
| Modify _routes.json | Remove include entry | ✅ Complete |
| Modify _redirects | Remove redirects | ✅ Complete |
| Modify LoggedInAvatar.jsx | Remove nav item | ✅ Complete |
| Modify auth.js | Remove protected page | ✅ Complete |
| Modify isProtectedPage.js | Remove rule | ✅ Complete |
| Archive documentation | 2 files | ✅ Complete |
| Clean build artifacts | 3+ files | ✅ Complete |
| Clean screenshots | 6 files | ✅ Complete |
| Update CLAUDE.md documentation | 4 files | ✅ Complete |

**Total Files Deleted**: 17 files
**Total Files Modified**: 11 files
**Total Docs Archived**: 2 files
**Build Status**: ✅ Passes
