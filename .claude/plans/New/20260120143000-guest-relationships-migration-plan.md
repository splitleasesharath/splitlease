# Guest Relationships Dashboard Migration Plan

**Date:** 2026-01-20
**Source Repository:** https://github.com/splitleasesharath/_guest-relationships-overview.git
**Target Project:** Split Lease Monorepo
**Migration Type:** Full Architectural Transformation
**Estimated Complexity:** High

---

## Executive Summary

This plan outlines the migration of the Guest Relationships Dashboard from a standalone React TypeScript SPA into Split Lease's Islands Architecture. The dashboard is an **internal corporate tool** for managing guest relationships, sending communications, and managing proposals/listings.

### Source Analysis Summary

| Aspect | Source (Guest Relationships) | Target (Split Lease) |
|--------|------------------------------|----------------------|
| **Framework** | React 18 + TypeScript | React 18 + JavaScript |
| **Architecture** | Single-Page Application | Islands Architecture |
| **State Management** | useState only | useState + usePageLogic hooks |
| **Data Source** | Mock data (hardcoded) | Supabase + Bubble API |
| **Routing** | React Router (unused) | routes.config.js + HTML files |
| **Styling** | Component-scoped CSS | Shared CSS + component CSS |
| **Backend** | None | Supabase Edge Functions |
| **Email/SMS** | Not implemented | send-email/send-sms functions |

---

## Phase 1: File Structure Mapping

### 1.1 Source Repository Structure

```
_guest-relationships-overview/
├── src/
│   ├── main.tsx                    → app/src/guest-relationships.jsx (entry)
│   ├── App.tsx                     → (not needed - islands don't use App wrapper)
│   ├── types/index.ts              → app/src/types/guestRelationships.js (or .d.ts)
│   ├── pages/
│   │   └── GuestRelationshipsDashboard.tsx → app/src/islands/pages/GuestRelationshipsDashboard/
│   ├── components/
│   │   ├── CorporateHeader.tsx     → app/src/islands/shared/CorporateHeader/
│   │   ├── CreateCustomerForm.tsx  → app/src/islands/shared/CreateCustomerForm/
│   │   ├── GuestSearch.tsx         → app/src/islands/shared/GuestSearch/
│   │   ├── HistorySection.tsx      → app/src/islands/shared/HistorySection/
│   │   ├── KnowledgeBaseSection.tsx→ app/src/islands/shared/KnowledgeBaseSection/
│   │   ├── ListingsSection.tsx     → app/src/islands/shared/ListingsSection/
│   │   ├── MessagingSection.tsx    → app/src/islands/shared/MessagingSection/
│   │   └── ProposalsSection.tsx    → app/src/islands/shared/ProposalsSection/
│   └── styles/
│       ├── index.css               → app/src/styles/pages/guest-relationships.css
│       └── *.css                   → app/src/styles/components/*.css
```

### 1.2 New Files to Create

```
Split Lease/
├── app/
│   ├── public/
│   │   └── guest-relationships.html              # New HTML entry point
│   ├── src/
│   │   ├── guest-relationships.jsx               # React root mount
│   │   ├── types/
│   │   │   └── guestRelationships.js             # Type definitions (JSDoc or keep .ts)
│   │   ├── islands/
│   │   │   └── pages/
│   │   │       └── GuestRelationshipsDashboard/
│   │   │           ├── GuestRelationshipsDashboard.jsx   # Hollow component (UI only)
│   │   │           └── useGuestRelationshipsDashboardLogic.js  # All business logic
│   │   ├── logic/
│   │   │   ├── processors/
│   │   │   │   └── guestRelationships/
│   │   │   │       ├── adaptGuestFromSupabase.js
│   │   │   │       ├── formatMessageForSend.js
│   │   │   │       └── processProposalCards.js
│   │   │   └── rules/
│   │   │       └── guestRelationships/
│   │   │           ├── canSendEmail.js
│   │   │           ├── canSendSMS.js
│   │   │           └── isValidCustomerForm.js
│   │   ├── lib/
│   │   │   └── guestRelationshipsApi.js          # API client for Edge Functions
│   │   └── styles/
│   │       ├── pages/
│   │       │   └── guest-relationships.css
│   │       └── components/
│   │           ├── corporate-header.css
│   │           ├── create-customer-form.css
│   │           ├── guest-search.css
│   │           ├── history-section.css
│   │           ├── knowledge-base-section.css
│   │           ├── listings-section.css
│   │           ├── messaging-section.css
│   │           └── proposals-section.css
├── supabase/
│   └── functions/
│       ├── guest-management/                     # New Edge Function
│       │   ├── index.ts
│       │   ├── actions/
│       │   │   ├── createGuest.ts
│       │   │   ├── searchGuests.ts
│       │   │   ├── getGuestHistory.ts
│       │   │   ├── assignKnowledgeArticle.ts
│       │   │   └── removeKnowledgeArticle.ts
│       │   └── handlers.ts
│       └── knowledge-base/                       # New Edge Function (if needed)
│           ├── index.ts
│           └── actions/
│               ├── listArticles.ts
│               └── getArticle.ts
```

---

## Phase 2: Discrepancy Analysis & Required Fixes

### 2.1 TypeScript → JavaScript Conversion

**Issue:** Source uses TypeScript (`.tsx`), Split Lease uses JavaScript (`.jsx`)

**Options:**
1. **Convert to JavaScript** (Recommended) - Maintain consistency with existing codebase
2. **Keep TypeScript** - Would require updating Vite config and adding tsconfig

**Conversion Steps:**
- Remove type annotations from function parameters and return types
- Convert interfaces to JSDoc `@typedef` comments (for IDE support)
- Remove TypeScript-specific syntax (`as`, `!`, `?:` optionals)
- Rename `.tsx` → `.jsx`, `.ts` → `.js`

**Example Conversion:**
```typescript
// BEFORE (TypeScript)
interface User {
  id: string;
  firstName: string;
  lastName: string;
}

const getUser = (id: string): User | null => {
  // ...
}
```

```javascript
// AFTER (JavaScript with JSDoc)
/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 */

/**
 * @param {string} id
 * @returns {User|null}
 */
const getUser = (id) => {
  // ...
}
```

### 2.2 Architecture Pattern Transformation

**Issue:** Source uses monolithic page component with embedded logic

**Required Transformation:**

| Source Pattern | Target Pattern |
|----------------|----------------|
| `GuestRelationshipsDashboard.tsx` (378 lines with logic) | `GuestRelationshipsDashboard.jsx` (UI only) + `useGuestRelationshipsDashboardLogic.js` (all logic) |
| Inline state management | Hook-based state extraction |
| Mock data arrays | API fetch calls |
| Direct event handlers | Delegated handler functions from hook |

**Hollow Component Pattern Application:**

```jsx
// BEFORE (monolithic)
function GuestRelationshipsDashboard() {
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guests, setGuests] = useState(MOCK_GUESTS);

  const handleGuestSelect = (guest) => {
    setSelectedGuest(guest);
    // ... more logic
  };

  return <div>...</div>;
}

// AFTER (hollow component)
function GuestRelationshipsDashboard() {
  const {
    selectedGuest,
    guests,
    isLoading,
    error,
    handlers: {
      handleGuestSelect,
      handleCreateCustomer,
      handleSendEmail,
      handleSendSMS,
      // ...
    }
  } = useGuestRelationshipsDashboardLogic();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return <div>...</div>;
}
```

### 2.3 Mock Data → Real Data Integration

**Issue:** Source uses hardcoded mock data arrays

**Required Backend Integrations:**

| Mock Data | Supabase Table | Edge Function | Action |
|-----------|----------------|---------------|--------|
| `MOCK_GUESTS` | `user` + `guest_account` | `guest-management` | `search_guests` |
| `MOCK_LISTINGS` | `listing` | `listing` | `get` (with filters) |
| `MOCK_PROPOSALS` | `proposal` | `proposal` | `get` (with filters) |
| `MOCK_MESSAGES` | `message` | `messages` | `get_messages` |
| `MOCK_ARTICLES` | New: `knowledge_article` | `knowledge-base` | `list_articles` |

**New Database Tables Required:**

```sql
-- Knowledge Base Articles (if not exists)
CREATE TABLE IF NOT EXISTS knowledge_article (
  _id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  page_headline TEXT NOT NULL,
  page_headline_subtext TEXT,
  content TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest-Article Assignments (many-to-many)
CREATE TABLE IF NOT EXISTS guest_knowledge_assignment (
  _id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  guest_id TEXT NOT NULL REFERENCES user(_id),
  article_id TEXT NOT NULL REFERENCES knowledge_article(_id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT,
  UNIQUE(guest_id, article_id)
);

-- Guest Activity History
CREATE TABLE IF NOT EXISTS guest_activity_history (
  _id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  guest_id TEXT NOT NULL REFERENCES user(_id),
  page_path TEXT NOT NULL,
  page_title TEXT,
  action_type TEXT, -- 'view', 'click', 'submit', etc.
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 Email/SMS Integration

**Issue:** Source has UI but no actual email/SMS sending capability

**Integration with Existing Functions:**

The Split Lease codebase already has `send-email` and `send-sms` Edge Functions. The MessagingSection component needs to call these:

```javascript
// app/src/lib/guestRelationshipsApi.js

export async function sendEmailToGuest({ to, subject, body, bcc }) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SENDGRID_BEARER_TOKEN}` // From env
    },
    body: JSON.stringify({
      action: 'send',
      payload: {
        to,
        subject,
        body,
        bcc: bcc || undefined
      }
    })
  });
  return response.json();
}

export async function sendSMSToGuest({ to, body }) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TWILIO_BEARER_TOKEN}` // From env
    },
    body: JSON.stringify({
      action: 'send',
      payload: {
        to, // Must be E.164 format: +1XXXXXXXXXX
        body
      }
    })
  });
  return response.json();
}
```

### 2.5 Styling Discrepancies

**Issue:** Source uses different color variables and class naming conventions

**Color Mapping:**
| Source Color | Usage | Split Lease Equivalent |
|--------------|-------|------------------------|
| `#E1E1EF` | Background | `var(--color-background-light)` |
| `#3b82f6` | Links/buttons | `var(--color-primary)` |
| `#1a1a2e` | Text | `var(--color-text-primary)` |
| `#10b981` | Success | `var(--color-success)` |
| `#ef4444` | Error | `var(--color-error)` |

**CSS Class Alignment:**
- Source uses `.btn`, `.btn-primary` → Split Lease uses same
- Source uses `.form-field`, `.form-input` → Split Lease uses similar (verify)
- Source uses custom grid classes → May need to import or convert

### 2.6 Routing Integration

**Issue:** Source uses React Router (unused), Split Lease uses routes.config.js

**Required Updates to `app/src/routes.config.js`:**

```javascript
// Add to routes array
{
  path: '/guest-relationships',
  name: 'guest-relationships',
  title: 'Guest Relationships Dashboard',
  protected: true,  // Requires auth
  cloudflareInternal: true,  // Corporate internal page
  allowedRoles: ['admin', 'corporate']  // Role-based access
}
```

**Required HTML Entry Point:**

```html
<!-- app/public/guest-relationships.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Guest Relationships Dashboard - Split Lease</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/guest-relationships.jsx"></script>
</body>
</html>
```

### 2.7 Icon Library Alignment

**Issue:** Source uses `lucide-react`, Split Lease may use different icons

**Options:**
1. **Add lucide-react** to dependencies (if not already present)
2. **Convert to existing icon system** (if Split Lease uses different library)
3. **Use inline SVGs** (most portable)

**Check existing icon usage:**
```bash
# Search for existing icon imports in Split Lease
grep -r "import.*Icon" app/src/
grep -r "lucide" app/src/
```

### 2.8 Day Indexing Consideration

**Issue:** Source doesn't handle day indexing, but proposals/listings involve days

**Required:** Any proposal or listing display that shows days must use the Split Lease day conversion utilities:

```javascript
import { adaptDaysFromBubble } from '../logic/processors/external/adaptDaysFromBubble';
import { getDayName } from '../lib/dayUtils';

// When displaying days from database
const displayDays = adaptDaysFromBubble(proposal.daysSelected);
const dayNames = displayDays.map(getDayName);
```

---

## Phase 3: New Edge Function Development

### 3.1 guest-management Function

**Location:** `supabase/functions/guest-management/`

**Actions:**
| Action | Description | Auth Required |
|--------|-------------|---------------|
| `search_guests` | Search guests by name/email/phone | Yes (admin/corporate) |
| `get_guest` | Get single guest with full details | Yes |
| `create_guest` | Create new guest account | Yes (admin/corporate) |
| `update_guest` | Update guest details | Yes |
| `get_guest_history` | Get activity history for guest | Yes |
| `assign_article` | Assign knowledge article to guest | Yes |
| `remove_article` | Remove article assignment | Yes |

**File Structure:**
```
guest-management/
├── index.ts           # Entry point with CORS and routing
├── handlers.ts        # Action router
├── actions/
│   ├── searchGuests.ts
│   ├── getGuest.ts
│   ├── createGuest.ts
│   ├── updateGuest.ts
│   ├── getGuestHistory.ts
│   ├── assignArticle.ts
│   └── removeArticle.ts
└── types.ts           # TypeScript interfaces
```

### 3.2 knowledge-base Function (if needed)

**Actions:**
| Action | Description | Auth Required |
|--------|-------------|---------------|
| `list_articles` | List all knowledge articles | Yes |
| `get_article` | Get single article content | Yes |
| `create_article` | Create new article | Yes (admin) |
| `update_article` | Update article | Yes (admin) |

---

## Phase 4: Implementation Sequence

### Step 1: Database Setup (Day 1)
1. Create `knowledge_article` table migration
2. Create `guest_knowledge_assignment` table migration
3. Create `guest_activity_history` table migration
4. Apply migrations to development database

### Step 2: Edge Functions (Day 2-3)
1. Create `guest-management` Edge Function skeleton
2. Implement `search_guests` action
3. Implement `get_guest` action with history
4. Implement `create_guest` action
5. Implement `assign_article` and `remove_article` actions
6. Create `knowledge-base` Edge Function (if separate)
7. Test all endpoints via Postman/curl

### Step 3: Frontend Foundation (Day 4)
1. Add route to `routes.config.js`
2. Create `guest-relationships.html` entry point
3. Create `guest-relationships.jsx` React root
4. Run `bun run generate-routes`
5. Verify page loads at `/guest-relationships`

### Step 4: Component Migration (Day 5-7)
1. Create `useGuestRelationshipsDashboardLogic.js` hook
2. Create hollow `GuestRelationshipsDashboard.jsx` component
3. Migrate each child component:
   - CorporateHeader (shared, may already exist)
   - GuestSearch
   - CreateCustomerForm
   - HistorySection
   - MessagingSection
   - ProposalsSection
   - ListingsSection
   - KnowledgeBaseSection
4. Convert TypeScript → JavaScript
5. Apply styling fixes

### Step 5: API Integration (Day 8-9)
1. Create `guestRelationshipsApi.js` with all fetch calls
2. Wire `useGuestRelationshipsDashboardLogic` to real APIs
3. Replace mock data with fetched data
4. Add loading states and error handling
5. Integrate with existing `send-email` and `send-sms` functions

### Step 6: Testing & Polish (Day 10)
1. Test all user flows end-to-end
2. Test email/SMS sending (staging)
3. Verify role-based access control
4. Fix any styling inconsistencies
5. Add toast notifications for actions

---

## Phase 5: Risk Assessment

### High Risk Items
| Risk | Impact | Mitigation |
|------|--------|------------|
| Email/SMS sending to real users | Could spam users | Use test recipients, add confirmation dialogs |
| Database schema conflicts | Could break existing features | Review FK relationships, test on dev branch first |
| Authentication gaps | Unauthorized access to guest data | Verify JWT validation on all new endpoints |

### Medium Risk Items
| Risk | Impact | Mitigation |
|------|--------|------------|
| Styling conflicts | Visual inconsistencies | Prefix all new CSS classes with `gr-` namespace |
| Type conversion errors | Runtime errors | Add JSDoc types, test thoroughly |
| Day indexing bugs | Wrong day display | Use existing `dayUtils.js` consistently |

### Low Risk Items
| Risk | Impact | Mitigation |
|------|--------|------------|
| Icon library mismatch | Missing icons | Use lucide-react or convert to inline SVG |
| Route conflicts | 404 errors | Verify uniqueness in routes.config.js |

---

## Phase 6: File Reference Appendix

### Source Files to Migrate

| Source File | Lines | Target Location |
|-------------|-------|-----------------|
| `src/types/index.ts` | ~150 | `app/src/types/guestRelationships.js` |
| `src/pages/GuestRelationshipsDashboard.tsx` | 378 | `app/src/islands/pages/GuestRelationshipsDashboard/` |
| `src/components/CorporateHeader.tsx` | ~120 | `app/src/islands/shared/CorporateHeader/` |
| `src/components/CreateCustomerForm.tsx` | ~180 | `app/src/islands/shared/CreateCustomerForm/` |
| `src/components/GuestSearch.tsx` | ~150 | `app/src/islands/shared/GuestSearch/` |
| `src/components/HistorySection.tsx` | ~80 | `app/src/islands/shared/HistorySection/` |
| `src/components/KnowledgeBaseSection.tsx` | ~120 | `app/src/islands/shared/KnowledgeBaseSection/` |
| `src/components/ListingsSection.tsx` | ~200 | `app/src/islands/shared/ListingsSection/` |
| `src/components/MessagingSection.tsx` | ~250 | `app/src/islands/shared/MessagingSection/` |
| `src/components/ProposalsSection.tsx` | ~180 | `app/src/islands/shared/ProposalsSection/` |
| `src/styles/*.css` | ~1300 | `app/src/styles/components/` |

### Existing Split Lease Files to Modify

| File | Modification |
|------|--------------|
| [routes.config.js](../../app/src/routes.config.js) | Add `/guest-relationships` route |
| [vite.config.js](../../app/vite.config.js) | Verify includes new HTML entry (auto via routes) |
| [package.json](../../app/package.json) | Add `lucide-react` if not present |

### New Edge Functions to Create

| Function | Purpose |
|----------|---------|
| `supabase/functions/guest-management/` | Guest CRUD, search, history, article assignments |
| `supabase/functions/knowledge-base/` | Article management (optional - could be part of guest-management) |

### New Database Migrations

| Migration | Purpose |
|-----------|---------|
| `YYYYMMDD_create_knowledge_article.sql` | Knowledge base articles table |
| `YYYYMMDD_create_guest_knowledge_assignment.sql` | Guest-article assignments |
| `YYYYMMDD_create_guest_activity_history.sql` | Activity tracking |

---

## Summary Checklist

- [ ] Database migrations created and applied
- [ ] `guest-management` Edge Function deployed
- [ ] Route added to `routes.config.js`
- [ ] HTML entry point created
- [ ] React root entry point created
- [ ] `useGuestRelationshipsDashboardLogic.js` hook created
- [ ] All 8 components migrated to JSX
- [ ] Styling migrated and aligned with Split Lease design system
- [ ] API integration complete (replacing mock data)
- [ ] Email/SMS integration tested
- [ ] Role-based access control verified
- [ ] End-to-end testing complete
- [ ] Documentation updated

---

**Plan Version:** 1.0
**Created By:** Claude
**Review Required By:** Development Lead
