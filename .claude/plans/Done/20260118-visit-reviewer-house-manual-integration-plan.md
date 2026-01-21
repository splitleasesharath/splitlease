# Visit Reviewer House Manual - Integration Plan

**Date:** 2026-01-18
**Type:** Feature Integration
**Source Repository:** https://github.com/splitleasesharath/visit-reviewer-house-manual.git
**Target:** Split Lease Islands Architecture + Supabase Backend

---

## Executive Summary

This plan outlines the integration of the **Visit Reviewer House Manual** component library into the Split Lease codebase. The external library is a TypeScript/React component for displaying house manuals to guests after a visit, with magic link access, collapsible sections, and guest signup flows.

**Key Challenge:** The external library assumes a different API structure (Bubble.io workflows) and uses patterns that conflict with Split Lease's established architecture. Significant adaptation is required.

---

## 1. Architecture Comparison

### External Library Architecture

| Aspect | External Library | Split Lease |
|--------|------------------|-------------|
| **Language** | TypeScript | JavaScript (JSX) |
| **Component Pattern** | Self-contained with internal state | Hollow Components + Logic Hooks |
| **Styling** | Tailwind CSS classes | Co-located CSS files |
| **API Layer** | Direct fetch to Bubble workflows | Edge Functions with action-based routing |
| **State Management** | Internal hooks (useHouseManual, etc.) | Separated logic hooks + pure functions |
| **Authentication** | Magic link tokens in components | Supabase Auth + secure storage |
| **Data Models** | Custom TypeScript interfaces | Existing Supabase tables (housemanual, visit) |

### Split Lease Patterns to Follow

```
app/src/islands/shared/VisitReviewerHouseManual/
├── index.js                           # Barrel export
├── VisitReviewerHouseManual.jsx       # Hollow component (UI only)
├── VisitReviewerHouseManual.css       # Co-located styles
├── useVisitReviewerHouseManualLogic.js # All state + handlers
├── visitReviewerService.js            # Supabase/Edge Function calls
├── README.md                          # Usage documentation
└── components/                        # Sub-components
    ├── HeaderSection.jsx
    ├── ContentSection.jsx
    ├── CollapsibleSection.jsx
    ├── MediaGallery.jsx
    ├── RulesDisplay.jsx
    ├── ChecklistDisplay.jsx
    ├── GuestSignupForm.jsx
    ├── ShareModal.jsx
    └── AccessStates/
        ├── LoadingState.jsx
        ├── AccessDenied.jsx
        ├── ExpiredContent.jsx
        └── SignupRequired.jsx
```

---

## 2. Breaking Changes & Required Modifications

### 2.1 API Endpoint Incompatibility (CRITICAL)

**Problem:** External library expects Bubble.io workflow endpoints:
```typescript
// External library expects:
POST /workflows/CORE-create-each-visit-house-manual
POST /workflows/core-create-magic-login-link-for-house-manual
POST /workflows/core-create-short-link-for-house-manual
POST /workflows/core-signup-guest-from-house-manual
```

**Split Lease Pattern:**
```javascript
// Split Lease uses Edge Functions with action-based routing:
POST /functions/v1/house-manual { action: 'get_visit_manual', payload: {...} }
POST /functions/v1/auth-user { action: 'validate_magic_link', payload: {...} }
```

**Required Modification:**
- Create new `visitReviewerService.js` that maps to existing Edge Functions
- Extend `house-manual` Edge Function with new actions:
  - `get_visit_manual` - Fetch manual for guest view
  - `validate_access_token` - Validate magic link
  - `mark_visit_engagement` - Track guest interactions
- Extend `auth-user` Edge Function:
  - `signup_guest_from_manual` - Guest registration from house manual

### 2.2 Data Model Mismatch (CRITICAL)

**Problem:** External library expects normalized data structure:
```typescript
// External expects:
interface HouseManualSection {
  id: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'rules' | 'checklist';
  content: string;
  mediaItems?: MediaItem[];
  visibility: 'all' | 'reviewer' | 'visitor' | 'host';
}
```

**Split Lease Reality:** The `housemanual` table has 102 columns with flat structure:
```sql
-- Actual structure (subset):
"WiFi Name" text,
"WiFi Password" text,
"Check-In Instructions" text,
"Check-Out Instructions" text,
"House Rules" jsonb,
"Departure Checklist" jsonb,
-- etc. (102 columns total)
```

**Required Modification:**
Create processor layer to transform flat DB structure to component-expected format:

```javascript
// app/src/logic/processors/houseManual/adaptHouseManualForViewer.js
export function adaptHouseManualForViewer({ dbRow, visitRow }) {
  return {
    id: dbRow._id,
    title: dbRow['House manual Name'],
    propertyAddress: extractAddressText(dbRow['Address (geo)']),
    sections: [
      buildSection('wifi', 'WiFi & Internet', dbRow),
      buildSection('checkin', 'Check-In Instructions', dbRow),
      buildSection('checkout', 'Check-Out Instructions', dbRow),
      buildSection('rules', 'House Rules', dbRow),
      buildSection('amenities', 'Amenities & Tips', dbRow),
      buildSection('safety', 'Safety & Security', dbRow),
      buildSection('neighborhood', 'Local Area', dbRow),
      buildSection('checklist', 'Departure Checklist', dbRow),
    ].filter(s => s.hasContent),
    visit: visitRow ? adaptVisitData(visitRow) : null,
  };
}
```

### 2.3 Magic Link System Gap (CRITICAL)

**Problem:** External library expects a `magic_link` table that **does not exist** in Supabase.

**Current State:** The `visit` table has a `Short URL` column but no dedicated magic link management.

**Required Modification - Option A (Recommended):** Use existing `visit.Short URL` + new columns:
```sql
-- Migration: add magic link fields to visit table
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "access_token" text;
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "token_expires_at" timestamp with time zone;
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "token_used_at" timestamp with time zone;
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "is_single_use" boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_visit_access_token ON visit ("access_token");
```

**Required Modification - Option B:** Create dedicated `magic_link` table:
```sql
-- Migration: create magic_link table
CREATE TABLE magic_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  visit_id text REFERENCES visit(_id),
  house_manual_id text REFERENCES housemanual(_id),
  recipient_email text,
  recipient_phone text,
  expires_at timestamp with time zone NOT NULL,
  is_single_use boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
```

### 2.4 TypeScript to JavaScript Conversion (MODERATE)

**Problem:** External library is TypeScript; Split Lease frontend is JavaScript.

**Required Modification:**
- Strip TypeScript syntax (interfaces, type annotations)
- Convert `.tsx` files to `.jsx`
- Add JSDoc comments for type documentation
- Maintain prop validation via PropTypes or runtime checks

### 2.5 Styling System Mismatch (MODERATE)

**Problem:** External library uses Tailwind CSS classes inline:
```tsx
<div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
```

**Split Lease Pattern:** Co-located CSS with BEM-like naming:
```jsx
<div className="vrhm-section vrhm-section--wifi">
```

**Required Modification:**
- Convert Tailwind classes to semantic CSS classes
- Create `VisitReviewerHouseManual.css` with equivalent styles
- Maintain visual parity while following project conventions

### 2.6 Authentication Flow Differences (MODERATE)

**Problem:** External library has its own auth hooks:
```typescript
const { user, isAuthenticated } = useCurrentUser();
const { hasAccess, validateAccess } = useHouseManualAccess(manualId, token);
```

**Split Lease Pattern:** Use existing auth system:
```javascript
import { checkAuthStatus, getSecureAuthToken } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';
```

**Required Modification:**
- Remove external auth hooks
- Integrate with existing `auth.js` utilities
- Add magic link validation to Edge Function layer

### 2.7 Event Tracking Gaps (MINOR)

**Problem:** External library tracks:
- `link_saw` - Guest viewed the link
- `map_saw` - Guest viewed the map
- `narration_heard` - Guest listened to audio

**Current State:** The `visit` table already has these columns:
```sql
"link saw?" boolean NOT NULL,
"map saw?" boolean,
"narration heard?" boolean,
"time guest logged in" text,
```

**Required Modification:**
- Create service method to update visit engagement
- Call from component on relevant user interactions

---

## 3. Component Mapping

### External → Split Lease Component Mapping

| External Component | Split Lease Equivalent | Modification |
|--------------------|------------------------|--------------|
| `VisitReviewerHouseManual.tsx` | `VisitReviewerHouseManual.jsx` | Convert to hollow component |
| `HeaderSection.tsx` | `components/HeaderSection.jsx` | Adapt props, remove TS |
| `ContentDisplaySection.tsx` | `components/ContentSection.jsx` | Major refactor for data model |
| `UserInfoSection.tsx` | `components/GuestInfoCard.jsx` | Integrate with auth system |
| `InteractionButtons.tsx` | `components/ActionBar.jsx` | Connect to service layer |
| `SignupForm.tsx` | `components/GuestSignupForm.jsx` | Use existing form patterns |
| `useHouseManual.ts` | `useVisitReviewerHouseManualLogic.js` | Complete rewrite |
| `useHouseManualAccess.ts` | (merged into main logic hook) | N/A |
| `houseManualService.ts` | `visitReviewerService.js` | Complete rewrite |
| `magicLinkService.ts` | (merged into service) | N/A |

---

## 4. Database Schema Changes

### Required Migrations

**Migration 1: Magic Link Support on Visit Table**
```sql
-- 20260118000001_add_visit_magic_link_fields.sql
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "access_token" text;
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "token_expires_at" timestamp with time zone;
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "token_used_at" timestamp with time zone;
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "is_single_use" boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_access_token ON visit ("access_token") WHERE "access_token" IS NOT NULL;

COMMENT ON COLUMN visit."access_token" IS 'Magic link token for guest access';
COMMENT ON COLUMN visit."token_expires_at" IS 'When the magic link expires';
```

**Migration 2: Guest Review Field**
```sql
-- 20260118000002_add_visit_review_fields.sql
-- The "Review from Guest" column already exists
-- Add structured review data if needed:
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "review_rating" integer CHECK ("review_rating" >= 1 AND "review_rating" <= 5);
ALTER TABLE visit ADD COLUMN IF NOT EXISTS "review_submitted_at" timestamp with time zone;
```

---

## 5. Edge Function Extensions

### Extend `house-manual/index.ts`

Add new actions to the existing Edge Function:

```typescript
// New actions to add:
const ALLOWED_ACTIONS = [
  // Existing actions:
  "parse_text",
  "transcribe_audio",
  "extract_wifi",
  "parse_document",
  "parse_google_doc",
  "initiate_call",
  // NEW: Guest viewer actions
  "get_visit_manual",      // Fetch manual for guest view
  "validate_access_token", // Validate magic link
  "track_engagement",      // Track guest interactions
  "submit_review",         // Submit guest review
] as const;
```

**New Handler: `handlers/getVisitManual.ts`**
```typescript
export async function handleGetVisitManual(context: HandlerContext) {
  const { visitId, accessToken } = context.payload;

  // 1. Validate access (either auth token or magic link)
  // 2. Fetch visit with joined housemanual data
  // 3. Transform to viewer format
  // 4. Return structured response
}
```

### Extend `auth-user/index.ts`

Add guest signup from house manual:

```typescript
// New action:
case 'signup_guest_from_manual':
  return handleSignupGuestFromManual(payload, supabase);
```

---

## 6. Logic Layer Additions

### New Files Required

```
app/src/logic/
├── processors/
│   └── houseManual/
│       ├── adaptHouseManualForViewer.js    # DB → Component format
│       ├── buildManualSections.js          # Section builder helpers
│       └── extractMediaFromManual.js       # Media extraction
├── rules/
│   └── houseManual/
│       ├── canAccessManual.js              # Access validation rules
│       ├── isManualExpired.js              # Expiration check
│       └── shouldShowSection.js            # Section visibility
└── workflows/
    └── houseManual/
        ├── validateManualAccessWorkflow.js # Access validation orchestration
        └── submitGuestReviewWorkflow.js    # Review submission
```

### Example: `adaptHouseManualForViewer.js`

```javascript
/**
 * Transform flat database row to structured viewer format
 *
 * NO FALLBACK PRINCIPLE: Missing required fields throw errors
 */
export function adaptHouseManualForViewer({ dbRow, visitRow }) {
  if (!dbRow) {
    throw new Error('House manual data is required');
  }

  return {
    id: dbRow._id,
    title: dbRow['House manual Name'] || 'House Manual',
    hostName: dbRow['Host Name'],
    propertyAddress: extractAddress(dbRow['Address (geo)']),
    createdAt: dbRow['Created Date'],
    updatedAt: dbRow['Modified Date'],

    // Build sections from flat columns
    sections: buildAllSections(dbRow),

    // Visit-specific data (if available)
    visit: visitRow ? {
      id: visitRow._id,
      guestId: visitRow['User shared with (guest)'],
      arrivalDate: visitRow['Arrival/Checkin Date'],
      language: visitRow.Language,
      shortUrl: visitRow['Short URL'],
      hasReviewed: Boolean(visitRow['Review from Guest']),
    } : null,
  };
}

function buildAllSections(dbRow) {
  const sections = [];

  // WiFi Section
  if (dbRow['WiFi Name'] || dbRow['WiFi Password']) {
    sections.push({
      id: 'wifi',
      title: 'WiFi & Internet',
      type: 'wifi',
      content: {
        networkName: dbRow['WiFi Name'],
        password: dbRow['WiFi Password'],
        photo: dbRow['WiFi Photo'],
      },
      order: 1,
    });
  }

  // Check-In Section
  if (dbRow['Check-In Instructions']) {
    sections.push({
      id: 'checkin',
      title: 'Check-In Instructions',
      type: 'text',
      content: dbRow['Check-In Instructions'],
      order: 2,
    });
  }

  // ... continue for all section types

  return sections.filter(s => s.content);
}
```

---

## 7. Implementation Phases

### Phase 1: Core Infrastructure (2-3 days)

1. **Database Migration**
   - Add magic link fields to visit table
   - Test migration on dev environment

2. **Edge Function Extensions**
   - Add `get_visit_manual` action
   - Add `validate_access_token` action
   - Add `track_engagement` action

3. **Logic Layer**
   - Create `adaptHouseManualForViewer.js` processor
   - Create `canAccessManual.js` rule
   - Create `validateManualAccessWorkflow.js`

### Phase 2: Component Development (3-4 days)

1. **Create Shared Island Structure**
   ```
   app/src/islands/shared/VisitReviewerHouseManual/
   ```

2. **Hollow Component + Logic Hook**
   - `VisitReviewerHouseManual.jsx`
   - `useVisitReviewerHouseManualLogic.js`

3. **Sub-Components**
   - Convert and adapt all sub-components
   - Create CSS file with equivalent Tailwind styles

4. **Service Layer**
   - `visitReviewerService.js` with all API calls

### Phase 3: Integration & Testing (2-3 days)

1. **Page Integration**
   - Create entry point page (or modal trigger)
   - Add route to `routes.config.js` if needed

2. **Magic Link Flow**
   - Generate magic links from host side
   - Test guest access flow end-to-end

3. **Guest Signup Flow**
   - Integrate with existing auth system
   - Test phone verification if enabled

### Phase 4: Polish & Review (1-2 days)

1. **Accessibility Audit**
   - ARIA labels
   - Keyboard navigation
   - Screen reader testing

2. **Mobile Responsiveness**
   - Test on various screen sizes
   - Adjust CSS as needed

3. **Error Handling**
   - Test all error states
   - Verify no fallback mechanisms

---

## 8. Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Magic link security | Unauthorized access | Use short-lived tokens, single-use option |
| Data model mismatch | Incomplete information | Thorough mapping of all 102 columns |
| Auth system conflicts | Login failures | Test both magic link and authenticated flows |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance with large manuals | Slow load times | Lazy load sections, optimize queries |
| TypeScript conversion errors | Runtime bugs | Comprehensive testing |
| Styling inconsistencies | Visual bugs | Side-by-side comparison testing |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Event tracking gaps | Missing analytics | Verify all tracking calls |
| Mobile UX issues | Poor experience | Device testing matrix |

---

## 9. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `app/src/islands/shared/VisitReviewerHouseManual/VisitReviewerHouseManual.jsx` | Main hollow component |
| `app/src/islands/shared/VisitReviewerHouseManual/VisitReviewerHouseManual.css` | Component styles |
| `app/src/islands/shared/VisitReviewerHouseManual/useVisitReviewerHouseManualLogic.js` | Logic hook |
| `app/src/islands/shared/VisitReviewerHouseManual/visitReviewerService.js` | API service |
| `app/src/islands/shared/VisitReviewerHouseManual/components/*.jsx` | Sub-components |
| `app/src/logic/processors/houseManual/adaptHouseManualForViewer.js` | Data transformer |
| `app/src/logic/rules/houseManual/canAccessManual.js` | Access rules |
| `supabase/functions/house-manual/handlers/getVisitManual.ts` | Edge Function handler |
| `supabase/functions/house-manual/handlers/validateAccessToken.ts` | Token validation |
| `supabase/functions/house-manual/handlers/trackEngagement.ts` | Engagement tracking |

### Files to Modify

| File | Modification |
|------|--------------|
| `supabase/functions/house-manual/index.ts` | Add new actions to router |
| `supabase/functions/auth-user/index.ts` | Add guest signup action |
| `app/src/routes.config.js` | Add route if creating standalone page |

---

## 10. Testing Checklist

### Unit Tests

- [ ] `adaptHouseManualForViewer` transforms all section types correctly
- [ ] `canAccessManual` validates tokens and permissions
- [ ] `buildManualSections` handles missing data without fallbacks

### Integration Tests

- [ ] Magic link generation creates valid tokens
- [ ] Guest can access manual via magic link
- [ ] Expired tokens are rejected
- [ ] Engagement events are recorded
- [ ] Guest signup creates account correctly

### E2E Tests

- [ ] Full flow: Host shares → Guest receives link → Guest views manual
- [ ] Guest signup from house manual
- [ ] Guest submits review
- [ ] Mobile responsive behavior

---

## 11. Related Files Reference

### Existing Split Lease Files

- [ReminderHouseManual](../../app/src/islands/shared/ReminderHouseManual/) - Similar feature module pattern
- [house-manual Edge Function](../../supabase/functions/house-manual/index.ts) - Existing backend
- [auth.js](../../app/src/lib/auth.js) - Authentication utilities
- [supabase.js](../../app/src/lib/supabase.js) - Database client
- [reminderAdapter.js](../../app/src/logic/processors/reminders/reminderAdapter.js) - Processor example

### External Library Files (from GitHub)

- `src/components/VisitReviewerHouseManual/VisitReviewerHouseManual.tsx` - Main component
- `src/hooks/useHouseManual.ts` - Data fetching hook
- `src/services/houseManualService.ts` - API service
- `src/types/index.ts` - Type definitions

---

## 12. Open Questions

1. **Magic Link Expiration Policy:** How long should magic links be valid? (Suggestion: 30 days)

2. **Single-Use vs Multi-Use:** Should links be single-use by default? (Suggestion: Multi-use with optional single-use)

3. **Guest Signup Requirements:** Should guests be required to sign up to view, or can they view anonymously? (Suggestion: Allow anonymous view, require signup for review)

4. **Review System:** What review fields are needed beyond the existing "Review from Guest" text column?

5. **Notification Integration:** Should hosts be notified when guests view the manual?

---

## Conclusion

The Visit Reviewer House Manual integration requires significant adaptation to fit Split Lease's architecture. The external library's direct Bubble API calls, TypeScript codebase, and Tailwind styling all need conversion to match project patterns.

**Estimated Total Effort:** 8-12 days

**Critical Path:**
1. Database migration for magic links
2. Edge Function extensions
3. Data transformer (processor)
4. Main component + logic hook
5. End-to-end testing

The most complex part is the data model transformation—converting 102 flat columns into a structured section-based format while maintaining the "no fallback" principle.
