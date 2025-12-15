# NotificationSettingsIsland - LLM Reference

**GENERATED**: 2025-12-14
**SCOPE**: Notification preferences management shared island component
**PARENT**: app/src/islands/shared/

---

## QUICK_STATS

[TOTAL_FILES]: 7
[PRIMARY_LANGUAGE]: JavaScript/JSX
[KEY_PATTERNS]: Shared Island Component, Optimistic Updates, Supabase Direct Query
[ARCHITECTURE_TYPE]: Leaf node component
[STYLING_APPROACH]: Inline JavaScript styles (compatible with non-Tailwind pages)

---

## FILES

### NotificationSettingsIsland.jsx
[INTENT]: Main shared island component for managing notification preferences
[EXPORTS]: default NotificationSettingsIsland
[DEPENDS_ON]: useNotificationSettings, NOTIFICATION_CATEGORIES, NotificationCategoryRow
[PROPS_REQUIRED]: userId (string)
[STATES]: loading, error, content
[FEATURES]: Loading spinner, error state with retry button, 11 category rows with SMS/Email toggles
[STYLING]: Inline JavaScript style objects for compatibility

### useNotificationSettings.js
[INTENT]: Custom hook for notification preferences data management
[EXPORTS]: useNotificationSettings (named), default
[DEPENDS_ON]: supabase client, getDefaultPreferences
[PARAMETERS]: userId (string)
[RETURNS]: { preferences, loading, error, togglePreference, isTogglePending, refetch }
[FEATURES]: Fetch on mount, create row for new users, optimistic toggle updates, rollback on error
[API_PATTERN]: Direct Supabase queries (no Edge Function proxy needed)

### notificationCategories.js
[INTENT]: Category configuration mapping UI labels to database columns
[EXPORTS]: NOTIFICATION_CATEGORIES (array), getAllPreferenceColumns(), getDefaultPreferences()
[CATEGORY_COUNT]: 11
[COLUMNS_PER_CATEGORY]: 2 (SMS + Email)
[TOTAL_PREFERENCE_COLUMNS]: 22

### NotificationToggle.jsx
[INTENT]: iOS-style switch toggle component
[EXPORTS]: default NotificationToggle
[PROPS]: checked, onChange, disabled, ariaLabel
[FEATURES]: Animated state transitions, keyboard accessibility, disabled state styling
[DIMENSIONS]: 51px x 31px (iOS standard)
[COLOR_ON]: #8B5CF6 (Royal Purple)
[COLOR_OFF]: #E0E0E0

### NotificationCategoryRow.jsx
[INTENT]: Single category row with SMS and Email toggle columns
[EXPORTS]: default NotificationCategoryRow
[DEPENDS_ON]: NotificationToggle
[PROPS]: category, smsEnabled, emailEnabled, onToggleSms, onToggleEmail, smsPending, emailPending, isLast
[LAYOUT]: Label section (left) + Toggle section (right with SMS/Email columns)

### index.js
[INTENT]: Barrel exports for the module
[EXPORTS]: NotificationSettingsIsland (default + named), NotificationCategoryRow, NotificationToggle, useNotificationSettings, NOTIFICATION_CATEGORIES, getAllPreferenceColumns, getDefaultPreferences

### CLAUDE.md
[INTENT]: LLM-optimized documentation for the module

---

## DATABASE_SCHEMA

### Table: notification_preferences
[PRIMARY_KEY]: id (UUID)
[USER_KEY]: user_id (TEXT, NOT NULL)
[CREATED]: created_at (TIMESTAMPTZ)
[UPDATED]: updated_at (TIMESTAMPTZ)
[DEFAULT_VALUES]: All boolean columns default to false

### Preference Columns (22 total)
| Category | SMS Column | Email Column |
|----------|------------|--------------|
| Message Forwarding | message_forwarding_sms | message_forwarding_email |
| Payment Reminders | payment_reminders_sms | payment_reminders_email |
| Promotional | promotional_sms | promotional_email |
| Reservation Updates | reservation_updates_sms | reservation_updates_email |
| Lease Requests | lease_requests_sms | lease_requests_email |
| Proposal Updates | proposal_updates_sms | proposal_updates_email |
| Check-in/Check-out | checkin_checkout_sms | checkin_checkout_email |
| Reviews | reviews_sms | reviews_email |
| Tips / Market Insights | tips_insights_sms | tips_insights_email |
| Account Assistance | account_assistance_sms | account_assistance_email |
| Virtual Meetings | virtual_meetings_sms | virtual_meetings_email |

---

## NOTIFICATION_CATEGORIES

| ID | Label | Description |
|----|-------|-------------|
| message_forwarding | Message Forwarding | Receive forwarded messages via your preferred channel |
| payment_reminders | Payment Reminders | Billing and payment notifications |
| promotional | Promotional | Marketing and promotional content |
| reservation_updates | Reservation Updates | Changes to your bookings |
| lease_requests | Lease Requests | Lease-related inquiries |
| proposal_updates | Proposal Updates | Changes to proposals |
| checkin_checkout | Check-in/Check-out Reminders | Guest arrival and departure alerts |
| reviews | Reviews | Rating and feedback notifications |
| tips_insights | Tips / Market Insights | Educational content and market analysis |
| account_assistance | Account Access Assistance | Help with account login and permissions |
| virtual_meetings | Virtual Meetings | Video and online meeting notifications |

---

## USAGE_PATTERNS

### In Modal Context
```jsx
import NotificationSettingsModal from 'islands/modals/NotificationSettingsModal';

function MyPage({ userId }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>Settings</button>
      <NotificationSettingsModal
        isOpen={showModal}
        userId={userId}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
```

### Embedded in Page Section
```jsx
import { NotificationSettingsIsland } from 'islands/shared/NotificationSettingsIsland';

function AccountPage({ userId }) {
  return (
    <section>
      <h2>Notification Preferences</h2>
      <NotificationSettingsIsland userId={userId} />
    </section>
  );
}
```

### Using Hook Directly
```jsx
import { useNotificationSettings } from 'islands/shared/NotificationSettingsIsland';

function CustomUI({ userId }) {
  const {
    preferences,
    loading,
    error,
    togglePreference,
    isTogglePending,
    refetch
  } = useNotificationSettings(userId);

  // Build custom UI with preferences data
}
```

---

## OPTIMISTIC_UPDATE_FLOW

```
User clicks toggle
    │
    ├──→ Add column to pendingToggles Set
    │
    ├──→ Immediately update local state (optimistic)
    │
    ├──→ Send Supabase update request
    │
    │    ┌── Success ──┐
    │    │             │
    │    │  Show success toast
    │    │  Remove from pendingToggles
    │    │
    │    └── Failure ──┘
    │         │
    │         │  Rollback to previous value
    │         │  Show error toast
    │         │  Remove from pendingToggles
    │
    └──→ Return { success, error? }
```

---

## CRITICAL_RULES

[RULE_1]: userId prop is REQUIRED for NotificationSettingsIsland
[RULE_2]: All Supabase queries use direct client (no Edge Function needed for this table)
[RULE_3]: Toast notifications use window.showToast (global function from Toast.jsx)
[RULE_4]: Row is auto-created for new users on first access
[RULE_5]: All boolean preferences default to false
[RULE_6]: Toggle state is optimistic - UI updates before server confirmation
[RULE_7]: Rollback occurs automatically on server error
[RULE_8]: Multiple toggles can be pending simultaneously (tracked independently)

---

## ERROR_HANDLING

### New User (No Preferences Row)
- PGRST116 error code indicates no rows found
- Hook automatically creates default preferences row
- All values initialized to false

### Network Failure During Toggle
- Optimistic update shows immediate feedback
- Server error triggers automatic rollback
- Toast notification explains the error
- Previous value restored in local state

### User Not Authenticated
- If userId is null/undefined, hook sets loading=false and returns
- Component can show empty state based on this

---

## TOAST_INTEGRATION

```javascript
// Success message on toggle
if (window.showToast) {
  window.showToast('Preference updated', 'success');
}

// Error message on failure
if (window.showToast) {
  window.showToast('Failed to update preference', 'error');
}
```

[TOAST_TYPES]: 'success', 'error', 'warning', 'info'
[GLOBAL_FUNCTION]: window.showToast set by Toast.jsx ToastProvider

---

## STYLING_NOTES

[APPROACH]: All styles are inline JavaScript objects
[REASON]: Compatible with pages that don't use Tailwind CSS
[COLOR_SCHEME]: Purple (#8B5CF6) for active state, gray (#E0E0E0) for inactive
[TOGGLE_SIZE]: 51px x 31px (iOS standard)
[KNOB_SIZE]: 27px diameter
[ANIMATION]: 0.3s ease transitions for toggle state changes
[SPINNER]: CSS keyframe animation injected dynamically

---

## DEPENDENCIES

[LOCAL_IMPORTS]: ../../../lib/supabase.js
[EXTERNAL_PACKAGES]: react
[SUPABASE_TABLE]: notification_preferences
[TOAST_SYSTEM]: window.showToast (optional, graceful degradation)

---

## COMPONENT_SIZE_ESTIMATES

| File | Lines | Type |
|------|-------|------|
| NotificationSettingsIsland.jsx | ~140 | Component |
| useNotificationSettings.js | ~130 | Hook |
| notificationCategories.js | ~95 | Config |
| NotificationToggle.jsx | ~100 | Component |
| NotificationCategoryRow.jsx | ~80 | Component |
| index.js | ~15 | Exports |
| CLAUDE.md | (this file) | Documentation |

[TOTAL_LINES]: ~560
[COMPONENT_COUNT]: 3
[HOOK_COUNT]: 1
[CONFIG_COUNT]: 1

---

## RELATED_FILES

[MODAL_WRAPPER]: app/src/islands/modals/NotificationSettingsModal.jsx
[SUPABASE_CLIENT]: app/src/lib/supabase.js
[TOAST_SYSTEM]: app/src/islands/shared/Toast.jsx
[CONSUMER_PAGE]: app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx

---

**VERSION**: 1.0
**UPDATED**: 2025-12-14
**MAINTAINER**: Split Lease Development Team
