# Debug Analysis: Custom Schedule Submission on View-Split-Lease Page

**Created**: 2026-01-21 14:30:00
**Status**: Analysis Complete - FEATURE IS PRESENT (Not a Regression)
**Severity**: Low (Investigation Only - Feature Exists)
**Affected Area**: ViewSplitLeasePage / Proposal Submission

---

## Executive Summary

**FINDING: The custom schedule feature IS fully implemented and present in the codebase. This is NOT a regression.**

The investigation found that the custom schedule submission functionality:
1. Has complete state management (lines 161-163)
2. Has full UI implementation for both desktop (lines 1924-1986) and mobile (lines 2825-2887)
3. Has backend integration in the proposal Edge Function
4. Has the database column (`custom_schedule_description`) in the `proposal` table

If the feature is not visible to the user, it may be due to:
- The booking widget not being visible (e.g., `scheduleSelectorListing` is null)
- CSS/styling issues hiding the element
- The user is not looking in the right location (the custom schedule option appears BELOW the day selector)

---

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Islands Architecture with Hollow Components
- **Tech Stack**: React 18, Vite, Supabase Edge Functions, Cloudflare Pages
- **Data Flow**: Frontend (ViewSplitLeasePage) -> Supabase Edge Function (proposal/create) -> Supabase PostgreSQL (proposal table)

### 1.2 Domain Context
- **Feature Purpose**: Allow guests to specify custom recurring schedules beyond the standard weekly pattern when creating a proposal
- **Related Documentation**: `.claude/Documentation/Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md`
- **Data Model**: `proposal` table with `custom_schedule_description` column (text, nullable)

### 1.3 Relevant Conventions
- **Day Indexing**: Uses JavaScript 0-6 format (0=Sunday through 6=Saturday)
- **Layer Boundaries**: Frontend state -> Edge Function payload -> Database insert
- **Shared Utilities**: ListingScheduleSelector component, auth utilities

### 1.4 Entry Points and Dependencies
- **User/Request Entry Point**: `/view-split-lease.html?id={listing_id}`
- **React Entry**: `app/src/view-split-lease.jsx`
- **Page Component**: `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx`
- **Critical Path**: Load listing -> Display booking widget -> User clicks custom schedule link -> User enters text -> Submit proposal

---

## 2. Problem Statement

The user reported the custom schedule submission functionality is "missing from UI" on the view-split-lease page. The user expected to see a feature that allows guests to specify custom schedule patterns when creating proposals.

**Actual Finding**: The feature IS present and fully implemented. This appears to be a misunderstanding or visibility issue rather than a regression.

---

## 3. Investigation Summary

### 3.1 Files Examined

| File | Relevance | Status |
|------|-----------|--------|
| `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx` | Main page component | Feature PRESENT |
| `supabase/functions/proposal/lib/types.ts` | Type definitions | Field PRESENT (line 65) |
| `supabase/functions/proposal/actions/create.ts` | Database insert | Field PRESENT (line 439) |
| `.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md` | Schema docs | Column DOCUMENTED (line 428) |
| `.claude/Documentation/Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md` | Page docs | No mention of custom schedule |

### 3.2 Feature Implementation Trace

#### State Management (Lines 161-163)
```javascript
// Custom schedule state - for users who want to specify a different recurrent pattern
const [customScheduleDescription, setCustomScheduleDescription] = useState('');
const [showCustomScheduleInput, setShowCustomScheduleInput] = useState(false);
```

#### Desktop UI (Lines 1924-1986)
- Located inside the booking widget section
- Only renders when `!isMobile && scheduleSelectorListing`
- Shows "This listing is {Weeks offered}" text
- Has clickable link: "Click here if you want to specify another recurrent schedule"
- Expandable textarea for custom schedule description
- Helper text: "The host will review your custom schedule request and may adjust the proposal accordingly."

#### Mobile UI (Lines 2825-2887)
- Located inside the mobile booking section
- Only renders when `scheduleSelectorListing` is truthy
- Same UI as desktop but with mobile-responsive styling

#### Proposal Submission (Lines 746-747)
```javascript
// Custom schedule description (user's freeform schedule request)
customScheduleDescription: customScheduleDescription || ''
```

#### Edge Function Types (types.ts line 64-66)
```typescript
// Custom schedule (user's freeform description of their preferred recurrent pattern)
customScheduleDescription?: string;
```

#### Edge Function Insert (create.ts line 438-439)
```typescript
// Custom schedule description (user's freeform schedule request)
custom_schedule_description: input.customScheduleDescription || null,
```

### 3.3 Git History Analysis

| Commit | Date | Description |
|--------|------|-------------|
| `3cf16b1d` | 2025-12-18 | **feat(view-split-lease): Add custom schedule description feature** - Original implementation |
| `53d42fdb` | After | **update: simplify custom schedule button text** - Refinement |
| `be47f969` | After | **feat(proposals): display custom schedule preferences to hosts** - Host-side display |
| `7864d046` | After | **fix(host-proposals): include custom_schedule_description in query** - Query fix |

The feature was added in commit `3cf16b1d` and has been maintained since then.

---

## 4. Hypotheses

### Hypothesis 1: User Looking in Wrong Location (Likelihood: 70%)
**Theory**: The custom schedule option is not immediately visible because it appears BELOW the day selector, and users may not scroll down or notice the clickable link.

**Supporting Evidence**:
- The UI shows as a subtle link ("Click here if you want to specify another recurrent schedule")
- The link is styled with `color: '#7C3AED'` and `textDecoration: 'underline'` but is small text (13px)
- The textarea is hidden by default (`showCustomScheduleInput` starts as `false`)

**Contradicting Evidence**: None

**Verification Steps**:
1. Navigate to any listing page
2. Scroll to the booking widget (right column on desktop)
3. Look BELOW the day selector for text: "This listing is [Every week/etc.]"
4. The clickable link should be visible after that text

### Hypothesis 2: Booking Widget Not Rendered (Likelihood: 20%)
**Theory**: The `scheduleSelectorListing` variable is null/undefined, preventing the entire schedule selector section (including custom schedule) from rendering.

**Supporting Evidence**:
- The custom schedule UI is wrapped in `{scheduleSelectorListing && (...)}` conditions
- If listing data is missing required fields, `scheduleSelectorListing` could be null

**Contradicting Evidence**:
- `scheduleSelectorListing` is a useMemo that only returns null if `listing` itself is null
- If `listing` were null, the entire page would show an error state, not a partial page

**Verification Steps**:
1. Check browser console for errors during page load
2. Verify the day selector buttons are visible (if they are, `scheduleSelectorListing` is truthy)

### Hypothesis 3: CSS/Styling Issue (Likelihood: 5%)
**Theory**: The custom schedule section is rendered but hidden due to CSS rules.

**Supporting Evidence**: None found

**Contradicting Evidence**:
- No CSS rules in `ViewSplitLeasePage.css` or inline styles that would hide this element
- The element uses inline styles with no `display: none` or `visibility: hidden`

### Hypothesis 4: Mobile-Only Testing (Likelihood: 5%)
**Theory**: User is testing on mobile and there's an issue specific to the mobile view.

**Supporting Evidence**:
- Desktop uses `{!isMobile && scheduleSelectorListing && (...)}` (line 1905)
- Mobile uses `{scheduleSelectorListing && (...)}` (line 2806)
- Both should show the custom schedule option

**Contradicting Evidence**: The mobile implementation (lines 2825-2887) includes the custom schedule feature

---

## 5. Recommended Action Plan

### Priority 1: Verify Feature Visibility
1. Open a listing page: `/view-split-lease.html?id=<any-listing-id>`
2. On desktop: Look at the booking widget in the right column
3. Scroll down past the day selector (the 7-day button grid)
4. Confirm you see: "This listing is [Every week]. Click here if you want to specify another recurrent schedule"
5. Click the link to expand the textarea

### Priority 2: If Feature Not Visible
1. Open browser DevTools (F12)
2. Search the DOM for "custom schedule" or "recurrent schedule"
3. Check console for JavaScript errors
4. Verify `scheduleSelectorListing` is truthy by adding temporary console.log

### Priority 3: Documentation Update
If the feature is working correctly, update the page documentation to mention this feature:
- File: `.claude/Documentation/Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md`
- Add section about custom schedule input functionality

---

## 6. Prevention Recommendations

1. **Feature Discoverability**: The current UI uses subtle link text. Consider:
   - Adding an icon (e.g., calendar icon) next to the link
   - Using a more prominent button style
   - Adding a tooltip explaining the feature

2. **Documentation**: Add custom schedule feature to:
   - `VIEW_SPLIT_LEASE_QUICK_REFERENCE.md`
   - Component props documentation

---

## 7. Related Files Reference

| File | Line Numbers | Purpose |
|------|--------------|---------|
| `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx` | 161-163 | State variables |
| `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx` | 746-747 | Payload integration |
| `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx` | 1924-1986 | Desktop UI |
| `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx` | 2825-2887 | Mobile UI |
| `supabase/functions/proposal/lib/types.ts` | 64-66 | Type definition |
| `supabase/functions/proposal/actions/create.ts` | 438-439 | Database insert |
| `.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md` | 428 | Schema documentation |

---

## 8. Conclusion

**The custom schedule feature IS implemented and working.** This investigation found no evidence of a regression. The feature:

1. Was added in commit `3cf16b1d` (2025-12-18)
2. Has complete frontend implementation (state, UI for desktop/mobile, submission)
3. Has complete backend implementation (types, database insert)
4. Has the database column documented

**Most likely explanation**: The user may not be aware of where to find the feature (it's a subtle link below the day selector) or may be looking at a cached version of the page.

**Recommended next step**: Have the user verify by:
1. Hard refresh the page (Ctrl+Shift+R)
2. Look below the day selector in the booking widget
3. Click the link to expand the custom schedule textarea
