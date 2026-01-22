# Verify Users Admin Tool Migration Plan

**Created**: 2026-01-21 18:00:00
**Status**: New
**Source Repository**: https://github.com/splitleasesharath/_verify-users.git
**Classification**: BUILD (New Feature Migration)

---

## Executive Summary

This plan outlines the migration of the `_verify-users` identity verification admin dashboard from a standalone React 19 + TypeScript prototype into the Split Lease islands architecture. The source is a **frontend-only prototype with mock data** that requires significant architectural adaptation and backend integration.

---

## Source Repository Analysis

### What Exists (Prototype)

| Component | Description | Status |
|-----------|-------------|--------|
| `App.tsx` | Main orchestrator with state management | Mock data only |
| `Header.tsx` | Navigation with hamburger menu | Needs replacement |
| `UserSelect.tsx` | Email-based user search dropdown | Needs API integration |
| `IdentityVerificationContainer.tsx` | 2×2 document grid + toggle | Core logic to preserve |
| `ImageModal.tsx` | Document image viewer | Can adapt |
| `VerificationToggle.tsx` | Verification status switch | Can adapt |
| `mockUsers.ts` | Mock user data | Replace with Supabase |
| `types/user.ts` | TypeScript interfaces | Convert to JSDoc |

### Prototype Tech Stack
- React 19.2.0 + TypeScript
- Vite (port 8005)
- Tailwind CSS 4.1.18
- No backend integration

---

## Target Architecture Requirements

### Split Lease Patterns to Follow

| Pattern | Requirement |
|---------|-------------|
| **Islands Architecture** | Standalone HTML + JSX entry + Page component |
| **Hollow Components** | Page contains ZERO logic, delegates to `useVerifyUsersPageLogic.js` |
| **Four-Layer Logic** | Business logic in `logic/` directory (calculators, rules, processors, workflows) |
| **Route Registry** | Single entry in `routes.config.js` |
| **Edge Functions** | `{ action, payload }` request pattern |
| **Inline Styles** | JavaScript style objects, not Tailwind classes |
| **No TypeScript** | Convert to JavaScript with JSDoc comments |

---

## Architectural Discrepancies & Fixes

### 1. Component Architecture

| Discrepancy | Source (Prototype) | Target (Split Lease) | Fix Required |
|-------------|-------------------|---------------------|--------------|
| **Logic location** | Logic embedded in `App.tsx` | Logic in `useVerifyUsersPageLogic.js` hook | Extract ALL state and handlers to hook |
| **State management** | useState in App component | useState in custom hook only | Move state to hook |
| **TypeScript** | `.tsx` files with interfaces | `.jsx` files with JSDoc | Convert all files |
| **Styling** | Tailwind CSS classes | Inline JavaScript style objects | Rewrite all styles |
| **Header** | Custom Header.tsx | Use shared `Header.jsx` or admin-specific | Replace with Split Lease header |

### 2. Routing & Entry Points

| Discrepancy | Source | Target | Fix Required |
|-------------|--------|--------|--------------|
| **SPA routing** | Single `index.html` | Dedicated `verify-users.html` | Create HTML shell |
| **Entry point** | `main.tsx` | `verify-users.jsx` | Create entry file |
| **Route config** | None | `routes.config.js` entry | Add route entry |
| **Protection** | None | `protected: true, adminOnly: true` | Add auth checks |

### 3. Data Layer

| Discrepancy | Source | Target | Fix Required |
|-------------|--------|--------|--------------|
| **Data source** | `mockUsers.ts` (hardcoded) | Supabase `public.user` table | Create Edge Function |
| **User ID field** | `id` (string) | `_id` (Bubble convention) | Update field references |
| **Document storage** | Data URIs in mock | Supabase Storage URLs | Integrate with storage |
| **Search function** | `searchUsers()` in mock | API call to Edge Function | Create search action |

### 4. Backend Integration

| Discrepancy | Source | Target | Fix Required |
|-------------|--------|--------|--------------|
| **API calls** | None (all mock) | Edge Function with actions | Create `verify-users` Edge Function |
| **Verification toggle** | Local state only | Supabase update + side effects | Implement real workflow |
| **Side effects** | Console.log only | Email/SMS services | Integrate notification services |
| **Error handling** | None | Error boundaries + Slack logging | Add error handling |

### 5. User Interface

| Discrepancy | Source | Target | Fix Required |
|-------------|--------|--------|--------------|
| **CSS framework** | Tailwind classes | Inline style objects | Convert all styles |
| **Color scheme** | `#0015B8` blue | Match Split Lease admin palette | Verify brand colors |
| **Modal pattern** | Custom ImageModal | Match existing modal patterns | Adapt to SL patterns |
| **Responsive** | Mobile hamburger menu | Admin pages may be desktop-only | Decide on mobile support |

---

## Database Schema Requirements

### Option A: Extend `public.user` Table (Recommended)

Add columns to existing user table:

```sql
-- Migration: add_verification_fields_to_user
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ;
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS identity_verified_by UUID REFERENCES auth.users(id);
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS selfie_with_id_url TEXT;
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS id_front_url TEXT;
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS id_back_url TEXT;
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS tasks_completed TEXT[] DEFAULT '{}';
ALTER TABLE public.user ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100);
```

### Option B: Separate `user_verification` Table

```sql
-- Migration: create_user_verification_table
CREATE TABLE public.user_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.user(_id),

  -- Document URLs
  profile_photo_url TEXT,
  selfie_with_id_url TEXT,
  id_front_url TEXT,
  id_back_url TEXT,

  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  verification_notes TEXT,

  -- Progress tracking
  tasks_completed TEXT[] DEFAULT '{}',
  profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_user_verification_user_id ON public.user_verification(user_id);

-- RLS policies
ALTER TABLE public.user_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can read all verification records"
  ON public.user_verification FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can update verification records"
  ON public.user_verification FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');
```

**Recommendation**: Option A if verification is tightly coupled to user identity; Option B if verification needs audit trail or versioning.

---

## File Structure (After Migration)

```
app/
├── public/
│   └── verify-users.html                    # NEW: HTML shell
├── src/
│   ├── verify-users.jsx                     # NEW: Entry point
│   ├── islands/
│   │   └── pages/
│   │       ├── VerifyUsersPage.jsx          # NEW: Hollow component
│   │       └── useVerifyUsersPageLogic.js   # NEW: All logic
│   └── routes.config.js                     # MODIFY: Add route

supabase/
└── functions/
    └── verify-users/                        # NEW: Edge Function
        └── index.ts
```

---

## Implementation Steps

### Phase 1: Frontend Foundation

#### Step 1.1: Create HTML Shell
**File**: `app/public/verify-users.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Verify Users | Admin | Split Lease</title>
  <link rel="icon" type="image/png" href="/favicon.png" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/verify-users.jsx"></script>
</body>
</html>
```

#### Step 1.2: Create Entry Point
**File**: `app/src/verify-users.jsx`

```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import VerifyUsersPage from './islands/pages/VerifyUsersPage';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<VerifyUsersPage />);
```

#### Step 1.3: Add Route Configuration
**File**: `app/src/routes.config.js` (ADD entry)

```javascript
{
  path: '/_internal/verify-users',
  file: 'verify-users.html',
  aliases: ['/_internal/verify-users.html', '/verify-users'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: true,
  internalName: 'verify-users-view',
  hasDynamicSegment: false
}
```

### Phase 2: Logic Hook (Core Migration)

#### Step 2.1: Create Page Logic Hook
**File**: `app/src/islands/pages/useVerifyUsersPageLogic.js`

**State to migrate from App.tsx**:
- `selectedUser` → `selectedUser`
- `users` → `users`
- `loading` → `isLoading`
- `error` → `error`

**Additional state needed**:
- `searchQuery` - For user search input
- `searchResults` - Filtered search results
- `isDropdownOpen` - Dropdown visibility
- `isImageModalOpen` - Modal state
- `activeImage` - Currently viewed image
- `isProcessing` - Verification toggle loading

**Handlers to implement**:
- `fetchUsers()` - Load users from API
- `searchUsers(query)` - Search users by email/name
- `selectUser(user)` - Select user for verification
- `clearSelection()` - Deselect user
- `toggleVerification()` - Toggle verification status (API call)
- `openImageModal(imageUrl, title)` - Open image viewer
- `closeImageModal()` - Close image viewer

### Phase 3: Hollow Page Component

#### Step 3.1: Create Page Component
**File**: `app/src/islands/pages/VerifyUsersPage.jsx`

Convert from TypeScript to JavaScript:
- Remove all type annotations
- Add JSDoc comments for documentation
- Use inline style objects instead of Tailwind
- Delegate ALL logic to hook

### Phase 4: Edge Function

#### Step 4.1: Create Edge Function
**File**: `supabase/functions/verify-users/index.ts`

**Actions to implement**:

| Action | Description | Payload |
|--------|-------------|---------|
| `list_users` | Get paginated users | `{ limit, offset, filter }` |
| `search_users` | Search by email/name | `{ query }` |
| `get_user` | Get single user details | `{ userId }` |
| `toggle_verification` | Update verification status | `{ userId, isVerified, notes }` |
| `get_documents` | Get user's verification documents | `{ userId }` |

### Phase 5: Style Conversion

Convert all Tailwind classes to inline styles. Example:

**Before (Tailwind)**:
```jsx
<div className="bg-blue-600 text-white p-4 rounded-lg shadow-md">
```

**After (Inline Styles)**:
```jsx
<div style={{
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '16px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
}}>
```

---

## Component Mapping

| Source Component | Target Component | Conversion Notes |
|-----------------|------------------|------------------|
| `App.tsx` | `VerifyUsersPage.jsx` | Extract logic to hook, hollow component |
| `Header.tsx` | Use Split Lease admin header or inline | Replace entirely |
| `UserSelect.tsx` | Inline in VerifyUsersPage or extract to shared | Convert styles |
| `IdentityVerificationContainer.tsx` | Inline in VerifyUsersPage | Core UI to preserve |
| `ImageModal.tsx` | `ImageModal` inline component | Convert styles |
| `VerificationToggle.tsx` | `VerificationToggle` inline component | Convert styles |
| `mockUsers.ts` | DELETE - replaced by API | Not needed |
| `types/user.ts` | JSDoc types in hook | Convert to comments |

---

## API Integration Points

### Frontend → Edge Function

```javascript
// In useVerifyUsersPageLogic.js
import { supabase } from '../../lib/supabase';

async function callVerifyUsersApi(action, payload) {
  const { data, error } = await supabase.functions.invoke('verify-users', {
    body: { action, payload }
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error);

  return data.data;
}

// Usage
const users = await callVerifyUsersApi('list_users', { limit: 50, offset: 0 });
const results = await callVerifyUsersApi('search_users', { query: 'john@' });
await callVerifyUsersApi('toggle_verification', { userId: '123', isVerified: true });
```

---

## Testing Checklist

### Functional Tests
- [ ] Admin can access page (auth check)
- [ ] Non-admin is redirected (auth check)
- [ ] User search returns results
- [ ] User selection displays documents
- [ ] Image modal opens/closes correctly
- [ ] Verification toggle updates database
- [ ] Success/error states display correctly
- [ ] Loading states show during API calls

### Visual Tests
- [ ] Matches Split Lease admin styling
- [ ] Responsive on desktop (minimum)
- [ ] Modal overlays correctly
- [ ] Document grid displays properly

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing document URLs in existing users | High | Medium | Add null checks, placeholder images |
| No existing verification data | High | Low | Initialize with defaults |
| Style conversion errors | Medium | Low | Test each component visually |
| Edge Function auth issues | Medium | High | Test with admin and non-admin users |

---

## Dependencies

### Files to Create (NEW)
1. `app/public/verify-users.html`
2. `app/src/verify-users.jsx`
3. `app/src/islands/pages/VerifyUsersPage.jsx`
4. `app/src/islands/pages/useVerifyUsersPageLogic.js`
5. `supabase/functions/verify-users/index.ts`

### Files to Modify (EXISTING)
1. `app/src/routes.config.js` - Add route entry

### Database Migrations (PENDING DECISION)
1. Either extend `public.user` OR create `user_verification` table

---

## Reference Files

### Split Lease Architecture
- [routes.config.js](../../../app/src/routes.config.js) - Route registry
- [ManageInformationalTextsPage.jsx](../../../app/src/islands/pages/ManageInformationalTextsPage.jsx) - Admin page reference
- [useManageInformationalTextsPageLogic.js](../../../app/src/islands/pages/useManageInformationalTextsPageLogic.js) - Logic hook reference
- [auth.js](../../../app/src/lib/auth.js) - Authentication utilities
- [supabase.js](../../../app/src/lib/supabase.js) - Supabase client

### Source Repository
- [_verify-users GitHub](https://github.com/splitleasesharath/_verify-users.git) - Source prototype

### Edge Function References
- [auth-user/index.ts](../../../supabase/functions/auth-user/index.ts) - Edge Function pattern
- [_shared/cors.ts](../../../supabase/functions/_shared/cors.ts) - CORS headers
- [_shared/errors.ts](../../../supabase/functions/_shared/errors.ts) - Error handling

---

## Open Questions (Require User Decision)

1. **Database Schema**: Option A (extend user table) or Option B (separate table)?
2. **Document Storage**: Where are verification documents currently stored? Supabase Storage? Bubble?
3. **Notification Services**: Should verification trigger emails/SMS? Which service?
4. **Mobile Support**: Is this admin tool desktop-only or needs responsive design?
5. **Audit Trail**: Do we need to track verification history (who verified, when, previous status)?

---

## Estimated Effort

| Phase | Effort | Description |
|-------|--------|-------------|
| Phase 1: Frontend Foundation | 1-2 hours | HTML, entry, route config |
| Phase 2: Logic Hook | 3-4 hours | State management, API integration |
| Phase 3: Page Component | 2-3 hours | UI conversion, style migration |
| Phase 4: Edge Function | 2-3 hours | API actions, database queries |
| Phase 5: Style Conversion | 2-3 hours | Tailwind → inline styles |
| Testing & Polish | 2-3 hours | Bug fixes, edge cases |

**Total Estimated**: 12-18 hours

---

**Plan Status**: Ready for Review
**Next Action**: Answer open questions, then proceed to implementation
