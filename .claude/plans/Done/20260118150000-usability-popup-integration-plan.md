# Usability Popup Integration Plan

**Date:** 2026-01-18
**Status:** PLANNING
**Source Repository:** https://github.com/splitleasesharath/usability-popup.git
**Purpose:** Prompt desktop tester users to continue usability testing on mobile via SMS magic link

---

## Executive Summary

This plan integrates a UsabilityPopup shared island component that:
1. Detects if current user is a **tester** (via `is_usability_tester` flag)
2. Detects if user is on **desktop** when mobile testing is required
3. Prompts user to enter phone number
4. Sends **SMS with magic login link** to continue on mobile device

---

## Architecture Analysis

### Source Component Analysis (GitHub Repository)

The repository contains a React component with:
- `UsabilityPopup.jsx` - Main popup component with phone input
- `UsabilityPopup.css` - Styling with Avenir font, accessibility features
- `api.js` - Service layer for magic link generation + SMS sending
- `phoneValidation.js` - US phone formatting and E.164 conversion

**Key Props:**
```javascript
{
  initialPhoneNumber: string,    // Pre-filled phone (from user profile)
  onLoginLinkSent: () => void,   // Success callback
  onError: (error) => void,      // Error callback
  onClose: () => void,           // Close popup callback
  useMockApi: boolean            // Dev mode toggle (default: true)
}
```

### Split Lease Architecture Alignment

| Repository Pattern | Split Lease Pattern | Adaptation Required |
|--------------------|---------------------|---------------------|
| Standalone React component | Islands Architecture (shared component) | Wrap as shared island |
| Internal Toast system | `ToastProvider` from `Toast.jsx` | Use existing Toast system |
| `api.js` service | Edge Functions (`auth-user`, `send-sms`) | Replace with Edge Function calls |
| `phoneValidation.js` | No existing utility | Create `app/src/lib/phoneUtils.js` |
| CSS with custom font | Global styles + component CSS | Add to `app/src/styles/components/` |

---

## Integration Components

### 1. New Files to Create

```
app/src/
├── lib/
│   └── phoneUtils.js                    # Phone validation utilities (from repo)
├── islands/
│   └── shared/
│       └── UsabilityPopup/
│           ├── UsabilityPopup.jsx       # Main component (adapted)
│           ├── UsabilityPopup.css       # Styles (adapted)
│           └── usabilityPopupService.js # API service layer
└── styles/
    └── components/
        └── usability-popup.css          # Global styles (if needed)

supabase/functions/
└── auth-user/
    └── handlers/
        └── sendMagicLinkSms.ts          # NEW: Generate magic link + send via SMS
```

### 2. Edge Function: `sendMagicLinkSms` Handler

**Location:** `supabase/functions/auth-user/handlers/sendMagicLinkSms.ts`

**Flow:**
```
1. Receive { email, phoneNumber, redirectTo }
2. Generate magic link via Supabase Auth admin.generateLink()
3. Format SMS message with magic link
4. Call send-sms Edge Function internally
5. Return success/failure
```

**Why a new handler vs. direct calls:**
- Atomic operation (link generation + SMS) avoids partial failures
- Server-side validation of phone number
- Single auth check instead of two
- Consistent with existing `generateMagicLink.ts` pattern

### 3. Tester User Detection

**Current State:** Tester flag exists in Bubble as `'is usability tester'` boolean field.

**Required Changes:**

1. **Add column to Supabase `user` table:**
   ```sql
   ALTER TABLE public.user
   ADD COLUMN is_usability_tester BOOLEAN DEFAULT false;
   ```

2. **Update `validateTokenAndFetchUser` response** to include `isUsabilityTester`:
   ```javascript
   // In auth.js validateTokenAndFetchUser()
   isUsabilityTester: userData.isUsabilityTester ?? false
   ```

3. **Update Edge Function `auth-user/validate`** to return the flag.

### 4. Mobile Detection Hook

**Create centralized hook:** `app/src/hooks/useDeviceDetection.js`

```javascript
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export function useIsDesktop() {
  return !useIsMobile();
}
```

---

## Potential Breaking Points & Mitigations

### 1. CSS Conflicts

**Risk:** Repository uses custom Avenir font and specific class names that may conflict.

**Mitigation:**
- Namespace all CSS classes with `.usability-popup-` prefix
- Use CSS modules or scoped styles
- Don't rely on Avenir font (fallback to system fonts matching Split Lease design)

### 2. Toast System Mismatch

**Risk:** Repository has internal Toast; Split Lease uses `ToastProvider`.

**Mitigation:**
- Remove internal Toast from component
- Use `useToast()` hook from `app/src/islands/shared/Toast.jsx`
- Map success/error to appropriate toast types

**Before (Repository):**
```jsx
import { useToast } from '../Toast';
// Internal toast with different API
```

**After (Split Lease):**
```jsx
import { useToast } from '../Toast';
// Use existing showToast({ title, content, type })
showToast({
  title: 'Link Sent!',
  content: 'Check your phone for the login link.',
  type: 'success'
});
```

### 3. API Service Layer

**Risk:** Repository's `api.js` expects `/api/auth/magic-link` and `/api/sms/send` endpoints.

**Mitigation:**
- Replace with Edge Function calls via Supabase client
- Create `usabilityPopupService.js` that wraps Edge Function calls

**New Service Layer:**
```javascript
// usabilityPopupService.js
import { supabase } from '../../../lib/supabase';

export async function sendMagicLinkViaSms(email, phoneNumber, redirectTo) {
  const { data, error } = await supabase.functions.invoke('auth-user', {
    body: {
      action: 'send_magic_link_sms',
      payload: { email, phoneNumber, redirectTo }
    }
  });

  if (error || !data.success) {
    throw new Error(data?.error || 'Failed to send login link');
  }

  return data;
}
```

### 4. Phone Number Validation

**Risk:** Repository's `phoneValidation.js` may have different edge cases than expected.

**Mitigation:**
- Review and adapt for Split Lease's user base (primarily US)
- Validate E.164 format matches `send-sms` Edge Function requirements
- E.164 format required: `+1XXXXXXXXXX` (exactly what repo produces)

**Verification:** `send-sms/index.ts` line 62 validates:
```typescript
const E164_REGEX = /^\+[1-9]\d{1,14}$/;
```
This matches the repository's `toE164Format()` output.

### 5. User Session & Email Resolution

**Risk:** Popup needs user's email to generate magic link, but may only have phone number input.

**Mitigation:**
- Popup should only appear for **authenticated users** (testers must be logged in)
- Retrieve email from current session via `validateTokenAndFetchUser()`
- Pass email to Edge Function along with phone number

### 6. Redirect URL After Magic Link

**Risk:** User clicking magic link on mobile needs to land on correct page.

**Mitigation:**
- Default redirect: Current page URL (preserve context)
- Or: Specific usability test landing page if defined
- Include `redirectTo` in magic link generation

### 7. SMS Delivery & Rate Limiting

**Risk:** Twilio rate limits, phone number validation failures.

**Mitigation:**
- Add loading state during SMS send
- Implement retry with exponential backoff (max 2 retries)
- Clear error messaging for invalid phone numbers
- Log all SMS attempts to Slack via existing `reportErrorLog`

### 8. Tester Flag Sync

**Risk:** `is_usability_tester` flag exists in Bubble but not in Supabase.

**Mitigation Options:**

**Option A (Recommended):** Add column to Supabase `user` table
- Pro: Native Supabase query, faster
- Con: Requires migration + Bubble→Supabase sync update

**Option B:** Fetch flag via Bubble proxy on demand
- Pro: No migration needed
- Con: Additional API call, slower

**Recommendation:** Option A with migration, update `bubble_sync` to propagate the field.

---

## Component Integration Points

### Where to Mount UsabilityPopup

**Option 1: App-level (Recommended)**
Mount in layout/root component, controlled by global state:

```jsx
// In each page's entry point or a shared layout
{isUsabilityTester && isDesktop && <UsabilityPopup ... />}
```

**Option 2: Specific Pages**
Only show on pages where usability testing occurs:
- SearchPage
- ViewSplitLeasePage
- CreateProposalFlow

**Recommendation:** Start with specific pages (SearchPage) for controlled rollout.

### Trigger Logic

```javascript
// useUsabilityPopupLogic.js
export function useUsabilityPopupLogic(userData) {
  const isDesktop = useIsDesktop();
  const [dismissed, setDismissed] = useState(false);

  // Check if popup should show
  const shouldShowPopup =
    userData?.isUsabilityTester &&  // User is a tester
    isDesktop &&                     // Currently on desktop
    !dismissed &&                    // Not dismissed this session
    !sessionStorage.getItem('usability_popup_dismissed');

  return {
    shouldShowPopup,
    dismissPopup: () => {
      setDismissed(true);
      sessionStorage.setItem('usability_popup_dismissed', 'true');
    }
  };
}
```

---

## Implementation Checklist

### Phase 1: Infrastructure (Backend)

- [ ] Create migration: Add `is_usability_tester` column to `public.user` table
- [ ] Update `bubble_sync/lib/fieldMapping.ts` to sync `is_usability_tester`
- [ ] Create `auth-user/handlers/sendMagicLinkSms.ts` handler
- [ ] Register new action in `auth-user/index.ts`
- [ ] Update `auth-user/handlers/validate.ts` to return `isUsabilityTester`

### Phase 2: Frontend Utilities

- [ ] Create `app/src/lib/phoneUtils.js` (adapted from repo)
- [ ] Create `app/src/hooks/useDeviceDetection.js`
- [ ] Update `validateTokenAndFetchUser` to expose `isUsabilityTester`

### Phase 3: Component Development

- [ ] Create `app/src/islands/shared/UsabilityPopup/UsabilityPopup.jsx`
- [ ] Create `app/src/islands/shared/UsabilityPopup/UsabilityPopup.css`
- [ ] Create `app/src/islands/shared/UsabilityPopup/usabilityPopupService.js`
- [ ] Create `app/src/islands/shared/UsabilityPopup/useUsabilityPopupLogic.js`

### Phase 4: Integration

- [ ] Integrate into SearchPage.jsx (initial rollout)
- [ ] Test with mock tester user
- [ ] Verify SMS delivery via Twilio logs
- [ ] Verify magic link login flow on mobile

### Phase 5: Cleanup

- [ ] Remove mock API flag, enable production
- [ ] Document component usage in CLAUDE.md
- [ ] Create E2E test for usability popup flow

---

## Database Migration

```sql
-- Migration: add_is_usability_tester_to_user
-- Add column to track which users are usability testers

ALTER TABLE public.user
ADD COLUMN IF NOT EXISTS is_usability_tester BOOLEAN DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_user_is_usability_tester
ON public.user(is_usability_tester)
WHERE is_usability_tester = true;

COMMENT ON COLUMN public.user.is_usability_tester IS
'Flag indicating user participates in usability testing. Synced from Bubble ''is usability tester'' field.';
```

---

## Testing Strategy

### Unit Tests
- Phone validation utilities (all formats, edge cases)
- E.164 conversion accuracy
- Tester detection logic

### Integration Tests
- Magic link generation via Edge Function
- SMS delivery (mock Twilio in test)
- Full popup flow with mocked user data

### E2E Tests
- Desktop user sees popup
- Mobile user does NOT see popup
- SMS sends successfully
- Magic link redirects correctly

---

## File References

### Existing Files to Modify
- [auth-user/index.ts](../../supabase/functions/auth-user/index.ts) - Register new action
- [auth-user/handlers/validate.ts](../../supabase/functions/auth-user/handlers/validate.ts) - Return tester flag
- [bubble_sync/lib/fieldMapping.ts](../../supabase/functions/bubble_sync/lib/fieldMapping.ts) - Add field mapping
- [app/src/lib/auth.js](../../app/src/lib/auth.js) - Expose tester flag in userData

### Existing Files for Reference
- [Toast.jsx](../../app/src/islands/shared/Toast.jsx) - Toast system to use
- [send-sms/index.ts](../../supabase/functions/send-sms/index.ts) - SMS Edge Function
- [generateMagicLink.ts](../../supabase/functions/auth-user/handlers/generateMagicLink.ts) - Magic link generation

### New Files to Create
- `app/src/lib/phoneUtils.js`
- `app/src/hooks/useDeviceDetection.js`
- `app/src/islands/shared/UsabilityPopup/UsabilityPopup.jsx`
- `app/src/islands/shared/UsabilityPopup/UsabilityPopup.css`
- `app/src/islands/shared/UsabilityPopup/usabilityPopupService.js`
- `app/src/islands/shared/UsabilityPopup/useUsabilityPopupLogic.js`
- `supabase/functions/auth-user/handlers/sendMagicLinkSms.ts`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CSS conflicts | Medium | Low | Namespace all classes |
| Toast API mismatch | Low | Low | Use existing ToastProvider |
| SMS delivery failure | Low | Medium | Retry logic + error logging |
| Tester flag not synced | Medium | High | Add migration + sync update |
| Magic link expiry | Low | Medium | Clear messaging (15 min expiry) |
| Phone validation edge cases | Low | Low | Comprehensive validation |

---

## Open Questions

1. **Redirect destination:** Should mobile magic link redirect to:
   - Same page user was on (preserve context)?
   - Dedicated usability test start page?
   - Current: Recommend same page for seamless experience

2. **Popup dismissal persistence:**
   - Session only (sessionStorage)?
   - Until next test cycle (localStorage with timestamp)?
   - Current: Recommend sessionStorage for single session

3. **Phone number pre-fill:**
   - Should we pre-fill from user profile if available?
   - Current: Yes, if `userData.phoneNumber` exists

---

**VERSION:** 1.0 | **AUTHOR:** Claude | **LAST UPDATED:** 2026-01-18
