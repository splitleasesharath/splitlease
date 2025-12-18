# Implementation Plan: Import Listing Toast Notification & Slack Webhook Integration

## Overview

This plan covers two interconnected changes:
1. Replace browser `alert()` calls with toast notifications for the import listing success message across `ListWithUsPage.jsx` and `Footer.jsx`
2. The Slack webhook integration is already implemented in `app/functions/api/import-listing.js` - just needs environment variable configuration in Cloudflare Dashboard

## Success Criteria

- [ ] `alert()` calls for import listing success/error replaced with toast notifications in `ListWithUsPage.jsx`
- [ ] `alert()` calls for import listing success/error replaced with toast notifications in `Footer.jsx`
- [ ] Toast notifications display with appropriate types (success/error)
- [ ] Slack webhooks continue to work with existing configuration
- [ ] All changes committed to git

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/ListWithUsPage.jsx` | Page containing import listing modal | Replace `alert()` with toast, add ToastProvider |
| `app/src/islands/shared/Footer.jsx` | Footer with import listing modal | Replace `alert()` with toast, add ToastProvider |
| `app/src/islands/shared/Toast.jsx` | Toast notification system | No changes - already complete |
| `app/src/islands/shared/ImportListingModal/ImportListingModal.jsx` | Import listing modal component | No changes needed |
| `app/functions/api/import-listing.js` | Cloudflare Function for Slack webhooks | Already implemented, no changes needed |
| `app/src/styles/components/toast.css` | Toast styling | No changes needed |
| `app/src/list-with-us.jsx` | Entry point for ListWithUsPage | No changes needed |

### Related Documentation

- `app/src/islands/shared/Toast.jsx` - Shows how to use `useToast()` hook and `ToastProvider`
- `app/functions/api/CLAUDE.md` - Documents Cloudflare Functions pattern
- `app/.env.example` - Shows required environment variables

### Existing Patterns to Follow

**Toast Usage Pattern (from SignUpLoginModal, AiSignupMarketReport):**
```jsx
import { useToast, ToastProvider } from '../../shared/Toast.jsx';
import Toast from '../../shared/Toast.jsx';

// Inside component:
const { toasts, showToast, removeToast } = useToast();

// Show success toast:
showToast({
  title: 'Success!',
  content: 'Message body here.',
  type: 'success'
});

// Show error toast:
showToast({
  title: 'Error',
  content: 'Error message here.',
  type: 'error'
});

// Render toast container (fallback when no ToastProvider):
{toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}
```

**Cloudflare Pages Function Pattern (already implemented in import-listing.js):**
- Environment variables accessed via `context.env.VARIABLE_NAME`
- Variables configured in Cloudflare Dashboard > Pages > Settings > Environment Variables

## Implementation Steps

### Step 1: Update ListWithUsPage.jsx with Toast Notifications

**Files:** `app/src/islands/pages/ListWithUsPage.jsx`
**Purpose:** Replace `alert()` calls with toast notifications

**Details:**
1. Add imports for toast system:
   ```jsx
   import { useToast } from '../shared/Toast.jsx';
   import Toast from '../shared/Toast.jsx';
   ```

2. Inside component, add useToast hook:
   ```jsx
   const { toasts, showToast, removeToast } = useToast();
   ```

3. Replace the success `alert()` on line 258:
   - Before: `alert('Listing import request submitted! We will email you when it is ready.');`
   - After:
   ```jsx
   showToast({
     title: 'Request Submitted!',
     content: 'We will email you when your listing is ready.',
     type: 'success'
   });
   ```

4. Replace the error `alert()` on line 262:
   - Before: `alert('Failed to import listing. Please try again later.');`
   - After:
   ```jsx
   showToast({
     title: 'Import Failed',
     content: 'Please try again later.',
     type: 'error'
   });
   ```

5. Add toast container before the closing `</>` fragment:
   ```jsx
   {/* Toast Notifications */}
   {toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}
   ```

**Validation:**
- Open `/list-with-us` page
- Click "Import My Listing" button
- Submit the form with valid data
- Verify toast appears instead of browser alert
- Test error case by temporarily blocking network

### Step 2: Update Footer.jsx with Toast Notifications

**Files:** `app/src/islands/shared/Footer.jsx`
**Purpose:** Replace `alert()` calls in Footer's import listing and referral handlers

**Details:**
1. Add imports for toast system at top of file:
   ```jsx
   import { useToast } from './Toast.jsx';
   import Toast from './Toast.jsx';
   ```

2. Inside Footer component, add useToast hook after state declarations:
   ```jsx
   const { toasts, showToast, removeToast } = useToast();
   ```

3. Replace import listing success `alert()` on line 131:
   - Before: `alert('Listing import request submitted! We will email you when it is ready.');`
   - After:
   ```jsx
   showToast({
     title: 'Request Submitted!',
     content: 'We will email you when your listing is ready.',
     type: 'success'
   });
   ```

4. Replace import listing error `alert()` on line 136:
   - Before: `alert('Failed to import listing. Please try again later.');`
   - After:
   ```jsx
   showToast({
     title: 'Import Failed',
     content: 'Please try again later.',
     type: 'error'
   });
   ```

5. Replace referral success `alert()` on line 90:
   - Before: `alert(\`Referral sent successfully via ${referralMethod}!\`);`
   - After:
   ```jsx
   showToast({
     title: 'Referral Sent!',
     content: `Your friend will receive your referral via ${referralMethod}.`,
     type: 'success'
   });
   ```

6. Replace referral error alerts (lines 51-53, 56-58, 94):
   - Replace validation alerts with toast errors
   - Replace network error alert with toast error

7. Replace modal import success `alert()` on line 383:
   - Before: `alert('Listing import request submitted! We will email you when it is ready.');`
   - After:
   ```jsx
   showToast({
     title: 'Request Submitted!',
     content: 'We will email you when your listing is ready.',
     type: 'success'
   });
   ```

8. Replace modal import error `alert()` on line 387:
   - Before: `alert('Failed to import listing. Please try again later.');`
   - After:
   ```jsx
   showToast({
     title: 'Import Failed',
     content: 'Please try again later.',
     type: 'error'
   });
   ```

9. Add toast container at the very end, before closing `</>`:
   ```jsx
   {/* Toast Notifications */}
   {toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}
   ```

**Validation:**
- Navigate to any page with Footer
- Test footer import form submission
- Test referral form submission
- Verify toasts appear instead of browser alerts
- Test error cases

### Step 3: Verify Slack Webhook Configuration

**Files:** None (Cloudflare Dashboard configuration)
**Purpose:** Ensure environment variables are set for Slack webhooks

**Details:**
The Slack integration is already implemented in `app/functions/api/import-listing.js`. The function expects these environment variables:
- `SLACK_WEBHOOK_ADDINGLISTINGS` - Webhook for the adding listings channel
- `SLACK_WEBHOOK_GENERAL` - Webhook for the general channel

**Configuration Location:**
Cloudflare Dashboard > Pages > [Your Project] > Settings > Environment Variables

**Required Variables:**
| Variable Name | Description |
|--------------|-------------|
| `SLACK_WEBHOOK_ADDINGLISTINGS` | Slack webhook URL for adding listings channel |
| `SLACK_WEBHOOK_GENERAL` | Slack webhook URL for general channel |

**Validation:**
- Submit an import listing request
- Check Slack channels for the notification message
- Verify message format: "*New Listing Import Request*" with URL, email, and timestamp

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Multiple rapid submissions | Toast stacking handled by Toast.jsx (max 5 toasts) |
| Network failure during submission | Error toast displays, user can retry |
| Invalid email format | Handled by ImportListingModal validation (client-side) |
| Missing webhook URLs | Server returns 500, error toast shown to user |
| Component unmount during toast | Toast system handles cleanup via useEffect |

## Testing Considerations

1. **Unit Testing:**
   - Verify toast calls are made with correct parameters
   - Test success and error paths

2. **Integration Testing:**
   - Test full flow: form submission -> API call -> toast display
   - Test Slack webhook delivery (may need staging environment)

3. **UI Testing:**
   - Toast appears in correct position (top-right)
   - Toast auto-dismisses after 5 seconds
   - Close button works
   - Multiple toasts stack correctly

4. **Cross-page Testing:**
   - Test on ListWithUsPage (modal flow)
   - Test on pages with Footer (inline form + modal)
   - Verify no console warnings about ToastProvider

## Rollback Strategy

1. Revert the two file changes (ListWithUsPage.jsx, Footer.jsx)
2. No database changes to revert
3. No configuration changes to revert (Slack webhooks can remain configured)

## Dependencies & Blockers

- **No blockers**: All required components exist
- **Dependency**: Toast.jsx and toast.css must be present (already exist)
- **Environment**: Cloudflare environment variables must be set for Slack webhooks to work

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Toast system not rendering | Low | Medium | Use fallback pattern from SignUpLoginModal |
| Slack webhook failure | Low | Low | Function returns success to user, logs error server-side |
| Toast CSS conflicts | Very Low | Low | CSS is scoped to toast-* classes |
| Import regression | Very Low | High | Keep alert behavior identical in messaging |

---

## Files Referenced in This Plan

1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\ListWithUsPage.jsx`
2. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\Footer.jsx`
3. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\Toast.jsx`
4. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\ImportListingModal\ImportListingModal.jsx`
5. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\functions\api\import-listing.js`
6. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\toast.css`
7. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\.env.example`
8. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\list-with-us.jsx`

---

**Plan Version:** 1.0
**Created:** 2025-12-16
**Status:** Ready for Implementation
