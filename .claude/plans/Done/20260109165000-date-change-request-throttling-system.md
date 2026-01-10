# Implementation Plan: Date Change Request Throttling System

## Overview
Implement a comprehensive throttling system for date change requests that provides soft warnings at 5+ requests and hard blocks at 10+ requests within a 24-hour window. The system will include warning popups, "don't show again" preferences, and automatic restoration of request creation ability after 24 hours.

## Success Criteria
- [ ] Soft warning popup appears at 5+ pending requests in 24 hours with dismissible option
- [ ] Hard block popup appears at 10+ pending requests, preventing request creation
- [ ] "Don't show again" checkbox persists preference to lease record
- [ ] Blocked users see restored ability after 24 hours (via scheduled backend workflow)
- [ ] System distinguishes between host and guest throttling states
- [ ] Throttle count only includes "waiting_for_answer" status requests
- [ ] Other participant's name appears dynamically in warning messages

---

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.jsx` | Main component orchestrating date change workflows | Add throttle popup logic, warning state management |
| `app/src/islands/shared/DateChangeRequestManager/ThrottlingWarning.jsx` | Current inline warning display | Replace with new popup-based warning system |
| `app/src/islands/shared/DateChangeRequestManager/dateChangeRequestService.js` | Frontend API service layer | Add enhanced throttle status fetch with lease fields |
| `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.css` | Component styles | Add warning/block popup styles |
| `supabase/functions/date-change-request/index.ts` | Edge function router | Add new actions (check_soft_warning, apply_hard_block, update_warning_preference) |
| `supabase/functions/date-change-request/handlers/getThrottleStatus.ts` | Throttle status handler | Enhance with pending-only filter and soft/hard thresholds |
| `supabase/functions/date-change-request/lib/types.ts` | TypeScript types | Add new throttle types and constants |
| `supabase/functions/date-change-request/handlers/create.ts` | Create request handler | Add hard block enforcement check |

### Database Schema Changes Required
| Table | Field | Type | Default | Description |
|-------|-------|------|---------|-------------|
| `bookings_leases` | `throttling_guest_ability` | boolean | true | Guest can create requests |
| `bookings_leases` | `throttling_host_ability` | boolean | true | Host can create requests |
| `bookings_leases` | `throttling_guest_not_show_warning` | boolean | false | Guest dismissed soft warning |
| `bookings_leases` | `throttling_host_not_show_warning` | boolean | false | Host dismissed soft warning |
| `bookings_leases` | `throttling_guest_blocked_at` | timestamp | null | When guest was blocked |
| `bookings_leases` | `throttling_host_blocked_at` | timestamp | null | When host was blocked |

### Related Documentation
- `supabase/CLAUDE.md` - Edge Functions patterns and architecture
- `app/src/islands/shared/DateChangeRequestManager/` - Component structure
- `.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md` - Table schemas

### Existing Patterns to Follow
- **ThrottlingWarning.jsx** - Current inline warning display (to be replaced with popup)
- **Modal Pattern** - Use DCR-namespaced CSS classes (dcr-*) consistent with existing styles
- **Edge Function Action Pattern** - `{ action, payload }` request format
- **Queue-based Sync** - For Bubble synchronization of throttle fields

---

## Implementation Steps

### Step 1: Database Migration - Add Throttling Fields to bookings_leases
**Files:** New migration file
**Purpose:** Add throttling state fields to the bookings_leases table

**Details:**
- Create migration `20260109_add_lease_throttling_fields.sql`
- Add 6 new columns to `bookings_leases` table:
  - `throttling_guest_ability` (boolean, default true)
  - `throttling_host_ability` (boolean, default true)
  - `throttling_guest_not_show_warning` (boolean, default false)
  - `throttling_host_not_show_warning` (boolean, default false)
  - `throttling_guest_blocked_at` (timestamptz, nullable)
  - `throttling_host_blocked_at` (timestamptz, nullable)

**SQL:**
```sql
-- Migration: Add throttling fields to bookings_leases
ALTER TABLE bookings_leases
ADD COLUMN IF NOT EXISTS "throttling_guest_ability" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "throttling_host_ability" boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS "throttling_guest_not_show_warning" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "throttling_host_not_show_warning" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "throttling_guest_blocked_at" timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "throttling_host_blocked_at" timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN bookings_leases."throttling_guest_ability" IS 'Whether guest can create date change requests (false = blocked)';
COMMENT ON COLUMN bookings_leases."throttling_host_ability" IS 'Whether host can create date change requests (false = blocked)';
COMMENT ON COLUMN bookings_leases."throttling_guest_not_show_warning" IS 'Guest dismissed soft warning checkbox';
COMMENT ON COLUMN bookings_leases."throttling_host_not_show_warning" IS 'Host dismissed soft warning checkbox';
COMMENT ON COLUMN bookings_leases."throttling_guest_blocked_at" IS 'Timestamp when guest was blocked';
COMMENT ON COLUMN bookings_leases."throttling_host_blocked_at" IS 'Timestamp when host was blocked';
```

**Validation:** Run migration locally with `supabase db reset` or apply via Supabase dashboard

---

### Step 2: Update Edge Function Types
**Files:** `supabase/functions/date-change-request/lib/types.ts`
**Purpose:** Add TypeScript types for enhanced throttling system

**Details:**
- Update `THROTTLE_LIMIT` to `SOFT_WARNING_THRESHOLD = 5`
- Add `HARD_BLOCK_THRESHOLD = 10`
- Add `ThrottleLevel` type ('none' | 'soft_warning' | 'hard_block')
- Add `EnhancedThrottleStatusResponse` interface
- Add input types for new actions

**Code Pattern:**
```typescript
// Throttling thresholds
export const SOFT_WARNING_THRESHOLD = 5;
export const HARD_BLOCK_THRESHOLD = 10;
export const THROTTLE_WINDOW_HOURS = 24;

export type ThrottleLevel = 'none' | 'soft_warning' | 'hard_block';

export interface EnhancedThrottleStatusInput {
  leaseId: string;
  userId: string;
}

export interface EnhancedThrottleStatusResponse {
  pendingRequestCount: number;
  throttleLevel: ThrottleLevel;
  isBlocked: boolean;
  showWarning: boolean;
  otherParticipantName: string;
  blockedUntil: string | null;
}

export interface UpdateWarningPreferenceInput {
  leaseId: string;
  userId: string;
  dontShowAgain: boolean;
}
```

**Validation:** TypeScript compilation should pass

---

### Step 3: Enhance getThrottleStatus Handler
**Files:** `supabase/functions/date-change-request/handlers/getThrottleStatus.ts`
**Purpose:** Implement enhanced throttle status with pending-only filter and multi-level thresholds

**Details:**
- Accept `leaseId` in addition to `userId`
- Filter requests by status = 'waiting_for_answer' AND lease = leaseId
- Determine user role (host vs guest) from lease
- Return throttle level, block status, and other participant name
- Check if user has dismissed warning (from lease throttling fields)
- Check if user's ability is currently blocked

**Code Pattern:**
```typescript
export async function handleGetThrottleStatus(
  payload: Record<string, unknown>,
  user: UserContext | null,
  supabase: SupabaseClient
): Promise<EnhancedThrottleStatusResponse> {
  // Validate input
  const { leaseId, userId } = payload as EnhancedThrottleStatusInput;

  // 1. Fetch lease with throttling fields and participant info
  const { data: lease } = await supabase
    .from('bookings_leases')
    .select(`
      _id, "Guest", "Host",
      "throttling_guest_ability", "throttling_host_ability",
      "throttling_guest_not_show_warning", "throttling_host_not_show_warning",
      "throttling_guest_blocked_at", "throttling_host_blocked_at"
    `)
    .eq('_id', leaseId)
    .single();

  // 2. Determine user role and get other participant
  const isHost = userId === lease.Host;
  const otherParticipantId = isHost ? lease.Guest : lease.Host;

  // 3. Fetch other participant name
  const { data: otherUser } = await supabase
    .from('user')
    .select('"Name - First"')
    .eq('_id', otherParticipantId)
    .single();

  // 4. Count PENDING requests in last 24 hours for THIS LEASE
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - THROTTLE_WINDOW_HOURS);

  const { count } = await supabase
    .from('datechangerequest')
    .select('*', { count: 'exact', head: true })
    .eq('Requested by', userId)
    .eq('Lease', leaseId)
    .eq('request status', 'waiting_for_answer')
    .gte('Created Date', windowStart.toISOString());

  // 5. Determine throttle level
  const pendingRequestCount = count || 0;
  const isBlocked = isHost
    ? !lease.throttling_host_ability
    : !lease.throttling_guest_ability;
  const dontShowWarning = isHost
    ? lease.throttling_host_not_show_warning
    : lease.throttling_guest_not_show_warning;

  let throttleLevel: ThrottleLevel = 'none';
  if (isBlocked || pendingRequestCount >= HARD_BLOCK_THRESHOLD) {
    throttleLevel = 'hard_block';
  } else if (pendingRequestCount >= SOFT_WARNING_THRESHOLD) {
    throttleLevel = 'soft_warning';
  }

  return {
    pendingRequestCount,
    throttleLevel,
    isBlocked,
    showWarning: throttleLevel === 'soft_warning' && !dontShowWarning,
    otherParticipantName: otherUser?.['Name - First'] || 'the other party',
    blockedUntil: isBlocked ? calculateBlockedUntil(lease, isHost) : null,
  };
}
```

**Validation:** Test with different request counts to verify threshold logic

---

### Step 4: Add applyHardBlock Handler
**Files:** `supabase/functions/date-change-request/handlers/applyHardBlock.ts` (new file)
**Purpose:** Set user's throttling ability to false and record timestamp

**Details:**
- Accept leaseId and userId
- Determine if user is host or guest
- Set appropriate `throttling_*_ability` to false
- Set `throttling_*_blocked_at` to current timestamp
- Enqueue Bubble sync for the updated lease fields
- Return success response

**Validation:** Verify lease record is updated correctly

---

### Step 5: Add updateWarningPreference Handler
**Files:** `supabase/functions/date-change-request/handlers/updateWarningPreference.ts` (new file)
**Purpose:** Update the "don't show warning again" preference

**Details:**
- Accept leaseId, userId, and dontShowAgain boolean
- Determine if user is host or guest
- Update appropriate `throttling_*_not_show_warning` field
- Enqueue Bubble sync
- Return success response

**Validation:** Toggle preference and verify persistence

---

### Step 6: Add restoreThrottleAbility Handler
**Files:** `supabase/functions/date-change-request/handlers/restoreThrottleAbility.ts` (new file)
**Purpose:** Restore user's ability to create requests (called by scheduled job)

**Details:**
- Accept leaseId and userRole ('host' | 'guest')
- Set appropriate `throttling_*_ability` back to true
- Clear `throttling_*_blocked_at` timestamp
- Enqueue Bubble sync
- Return success response

**Validation:** Manually trigger and verify ability restoration

---

### Step 7: Update Edge Function Router
**Files:** `supabase/functions/date-change-request/index.ts`
**Purpose:** Register new action handlers

**Details:**
- Import new handlers: `handleApplyHardBlock`, `handleUpdateWarningPreference`, `handleRestoreThrottleAbility`
- Add to ALLOWED_ACTIONS: `'apply_hard_block'`, `'update_warning_preference'`, `'restore_throttle_ability'`
- Add to handlers map
- Keep new actions in PUBLIC_ACTIONS (for now, until auth migration complete)

**Validation:** Test each new action via REST client

---

### Step 8: Update create.ts Handler to Enforce Block
**Files:** `supabase/functions/date-change-request/handlers/create.ts`
**Purpose:** Add hard block enforcement before creating request

**Details:**
- After lease fetch, check throttling ability field
- If ability is false, throw ValidationError with appropriate message
- Check pending request count against HARD_BLOCK_THRESHOLD
- If threshold reached, call applyHardBlock logic inline and throw error

**Code Pattern:**
```typescript
// After lease fetch in handleCreate:
const isHost = input.requestedById === lease.Host;
const abilityField = isHost ? 'throttling_host_ability' : 'throttling_guest_ability';

if (lease[abilityField] === false) {
  throw new ValidationError('Your ability to create date change requests has been temporarily suspended. Please try again later.');
}

// After throttle count check:
if (requestCount >= HARD_BLOCK_THRESHOLD) {
  // Apply hard block
  const blockField = isHost ? 'throttling_host_ability' : 'throttling_guest_ability';
  const timestampField = isHost ? 'throttling_host_blocked_at' : 'throttling_guest_blocked_at';

  await supabase
    .from('bookings_leases')
    .update({ [blockField]: false, [timestampField]: new Date().toISOString() })
    .eq('_id', input.leaseId);

  // Enqueue Bubble sync...

  throw new ValidationError('You have reached the maximum number of pending requests. Your ability to create new requests has been suspended for 24 hours.');
}
```

**Validation:** Attempt to create 11th request and verify block

---

### Step 9: Create Scheduled Job for Ability Restoration
**Files:** New migration or pg_cron setup
**Purpose:** Automatically restore throttling ability after 24 hours

**Details:**
- Create pg_cron job that runs every hour
- Find leases where `throttling_*_blocked_at` is > 24 hours ago AND ability is false
- Call the Edge Function `restore_throttle_ability` action for each
- Alternative: Direct SQL update + Bubble sync queue

**SQL Pattern:**
```sql
-- Schedule hourly check for blocked users to restore
SELECT cron.schedule(
  'restore-throttle-abilities',
  '0 * * * *',  -- Every hour
  $$
  WITH blocked_to_restore AS (
    SELECT _id,
           CASE WHEN "throttling_guest_blocked_at" < NOW() - INTERVAL '24 hours' AND "throttling_guest_ability" = false THEN 'guest' END as restore_guest,
           CASE WHEN "throttling_host_blocked_at" < NOW() - INTERVAL '24 hours' AND "throttling_host_ability" = false THEN 'host' END as restore_host
    FROM bookings_leases
    WHERE ("throttling_guest_blocked_at" < NOW() - INTERVAL '24 hours' AND "throttling_guest_ability" = false)
       OR ("throttling_host_blocked_at" < NOW() - INTERVAL '24 hours' AND "throttling_host_ability" = false)
  )
  UPDATE bookings_leases bl
  SET
    "throttling_guest_ability" = CASE WHEN btr.restore_guest = 'guest' THEN true ELSE bl."throttling_guest_ability" END,
    "throttling_host_ability" = CASE WHEN btr.restore_host = 'host' THEN true ELSE bl."throttling_host_ability" END,
    "throttling_guest_blocked_at" = CASE WHEN btr.restore_guest = 'guest' THEN NULL ELSE bl."throttling_guest_blocked_at" END,
    "throttling_host_blocked_at" = CASE WHEN btr.restore_host = 'host' THEN NULL ELSE bl."throttling_host_blocked_at" END
  FROM blocked_to_restore btr
  WHERE bl._id = btr._id;
  $$
);
```

**Validation:** Manually set blocked_at to 25 hours ago, wait for cron, verify restoration

---

### Step 10: Update Frontend Service Layer
**Files:** `app/src/islands/shared/DateChangeRequestManager/dateChangeRequestService.js`
**Purpose:** Add enhanced throttle status and preference update methods

**Details:**
- Update `getThrottleStatus` to pass leaseId and receive enhanced response
- Add `updateWarningPreference(leaseId, userId, dontShowAgain)` method
- Add response transformation for new fields

**Code Pattern:**
```javascript
export async function getEnhancedThrottleStatus(leaseId, userId) {
  const { data, error } = await supabase.functions.invoke('date-change-request', {
    body: {
      action: 'get_throttle_status',
      payload: { leaseId, userId },
    },
  });

  if (error) throw new Error(error.message);

  return {
    status: 'success',
    data: {
      pendingRequestCount: data?.pendingRequestCount,
      throttleLevel: data?.throttleLevel,
      isBlocked: data?.isBlocked,
      showWarning: data?.showWarning,
      otherParticipantName: data?.otherParticipantName,
      blockedUntil: data?.blockedUntil,
    },
  };
}

export async function updateWarningPreference(leaseId, userId, dontShowAgain) {
  const { data, error } = await supabase.functions.invoke('date-change-request', {
    body: {
      action: 'update_warning_preference',
      payload: { leaseId, userId, dontShowAgain },
    },
  });

  if (error) throw new Error(error.message);

  return { status: 'success' };
}
```

**Validation:** Call from browser console and verify responses

---

### Step 11: Create ThrottlingWarningPopup Component
**Files:** `app/src/islands/shared/DateChangeRequestManager/ThrottlingWarningPopup.jsx` (new file)
**Purpose:** Popup modal for soft warning (Warning 1)

**Details:**
- Accept props: `isOpen`, `onClose`, `onContinue`, `otherParticipantName`, `onDontShowAgainChange`
- Display warning title: "Avoid creating too many requests"
- Display message with dynamic other participant name
- Checkbox: "Don't show me this again"
- Buttons: "Continue still" (calls onContinue), "Cancel request" (calls onClose)

**JSX Pattern:**
```jsx
export default function ThrottlingWarningPopup({
  isOpen,
  onClose,
  onContinue,
  otherParticipantName,
  dontShowAgain,
  onDontShowAgainChange,
}) {
  if (!isOpen) return null;

  return (
    <div className="dcr-throttle-popup-overlay" onClick={onClose}>
      <div className="dcr-throttle-popup" onClick={e => e.stopPropagation()}>
        <div className="dcr-throttle-popup-icon">
          <span role="img" aria-label="warning">&#9888;</span>
        </div>
        <h3 className="dcr-throttle-popup-title">Avoid creating too many requests</h3>
        <p className="dcr-throttle-popup-message">
          You created 5 or more requests in 24 hours and {otherParticipantName} hasn't responded yet.
          We advise you to hold on creation until {otherParticipantName} responds to your initial requests.
        </p>
        <label className="dcr-throttle-checkbox">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => onDontShowAgainChange(e.target.checked)}
          />
          <span>Don't show me this again</span>
        </label>
        <div className="dcr-throttle-popup-buttons">
          <button className="dcr-button-secondary" onClick={onClose}>
            Cancel request
          </button>
          <button className="dcr-button-primary" onClick={onContinue}>
            Continue still
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Validation:** Render in isolation, verify layout and interactions

---

### Step 12: Create ThrottlingBlockPopup Component
**Files:** `app/src/islands/shared/DateChangeRequestManager/ThrottlingBlockPopup.jsx` (new file)
**Purpose:** Popup modal for hard block (Warning 2)

**Details:**
- Accept props: `isOpen`, `onClose`, `otherParticipantName`
- Display block title: "We put on hold your ability to create requests"
- Display message explaining 24-hour block
- Single button: "Ok" (calls onClose)
- Link: "See comments guideline" (external or help center link)

**JSX Pattern:**
```jsx
export default function ThrottlingBlockPopup({
  isOpen,
  onClose,
  otherParticipantName,
}) {
  if (!isOpen) return null;

  return (
    <div className="dcr-throttle-popup-overlay" onClick={onClose}>
      <div className="dcr-throttle-popup dcr-throttle-popup-block" onClick={e => e.stopPropagation()}>
        <div className="dcr-throttle-popup-icon dcr-throttle-icon-block">
          <span role="img" aria-label="blocked">&#128683;</span>
        </div>
        <h3 className="dcr-throttle-popup-title">We put on hold your ability to create requests</h3>
        <p className="dcr-throttle-popup-message">
          You created 10 or more requests in 24 hours and {otherParticipantName} hasn't responded yet.
          To keep the integrity of the platform and not overwhelm {otherParticipantName},
          we put on hold your ability to create requests for 24 hours!
        </p>
        <a
          href="/help-center/policies"
          target="_blank"
          rel="noopener noreferrer"
          className="dcr-throttle-guideline-link"
        >
          See comments guideline
        </a>
        <div className="dcr-throttle-popup-buttons">
          <button className="dcr-button-primary" onClick={onClose}>
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Validation:** Render in isolation, verify layout and interactions

---

### Step 13: Add CSS Styles for Throttling Popups
**Files:** `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.css`
**Purpose:** Add styles for warning and block popup modals

**Details:**
- Add `.dcr-throttle-popup-overlay` - fixed overlay matching existing dcr-overlay
- Add `.dcr-throttle-popup` - centered modal card
- Add `.dcr-throttle-popup-icon` - warning/block icon container
- Add `.dcr-throttle-icon-block` - red variant for block popup
- Add `.dcr-throttle-popup-title` - heading style
- Add `.dcr-throttle-popup-message` - message text style
- Add `.dcr-throttle-checkbox` - checkbox with label
- Add `.dcr-throttle-popup-buttons` - button container
- Add `.dcr-throttle-guideline-link` - styled link

**CSS Pattern:**
```css
/* ============================================
   THROTTLING POPUP MODALS
   ============================================ */

.dcr-throttle-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
}

.dcr-throttle-popup {
  background: white;
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.dcr-throttle-popup-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: var(--dcr-orange-pending);
}

.dcr-throttle-icon-block {
  color: var(--dcr-red-remove);
}

.dcr-throttle-popup-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--dcr-text-primary);
  margin: 0 0 12px 0;
}

.dcr-throttle-popup-message {
  font-size: 14px;
  color: var(--dcr-gray-text);
  line-height: 1.6;
  margin: 0 0 20px 0;
}

.dcr-throttle-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  cursor: pointer;
  font-size: 14px;
  color: var(--dcr-text-primary);
}

.dcr-throttle-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--dcr-purple-primary);
}

.dcr-throttle-guideline-link {
  display: inline-block;
  color: var(--dcr-purple-primary);
  font-size: 14px;
  text-decoration: none;
  margin-bottom: 20px;
}

.dcr-throttle-guideline-link:hover {
  text-decoration: underline;
}

.dcr-throttle-popup-buttons {
  display: flex;
  gap: 12px;
}

.dcr-throttle-popup-block .dcr-throttle-popup-buttons {
  justify-content: center;
}

@media (max-width: 440px) {
  .dcr-throttle-popup {
    padding: 20px;
    max-width: 100%;
  }

  .dcr-throttle-popup-buttons {
    flex-direction: column;
  }
}
```

**Validation:** View popups on various screen sizes

---

### Step 14: Update DateChangeRequestManager Component
**Files:** `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.jsx`
**Purpose:** Integrate throttling popup logic into main component

**Details:**
- Import new popup components
- Update `fetchThrottleStatus` to use enhanced endpoint with leaseId
- Add state: `showWarningPopup`, `showBlockPopup`, `dontShowAgain`, `otherParticipantName`
- Update `handleProceedToDetails` to check throttle level before proceeding
- If soft_warning and showWarning=true, show warning popup
- If hard_block, show block popup
- Add handler for "Continue still" to proceed despite warning
- Add handler for "Don't show again" to update preference

**Code Pattern:**
```jsx
// New state
const [showWarningPopup, setShowWarningPopup] = useState(false);
const [showBlockPopup, setShowBlockPopup] = useState(false);
const [dontShowAgain, setDontShowAgain] = useState(false);
const [otherParticipantName, setOtherParticipantName] = useState('');

// Enhanced throttle fetch
const fetchThrottleStatus = async (userId) => {
  const result = await dateChangeRequestService.getEnhancedThrottleStatus(lease._id, userId);
  if (result.status === 'success') {
    setThrottleStatus(result.data);
    setOtherParticipantName(result.data.otherParticipantName);

    // If blocked, show block popup immediately
    if (result.data.isBlocked || result.data.throttleLevel === 'hard_block') {
      setShowBlockPopup(true);
    }
  }
};

// Modified proceed handler
const handleProceedToDetails = () => {
  const validationError = validateRequest();
  if (validationError) {
    setError(validationError);
    return;
  }

  // Check throttle status before proceeding
  if (throttleStatus?.throttleLevel === 'hard_block' || throttleStatus?.isBlocked) {
    setShowBlockPopup(true);
    return;
  }

  if (throttleStatus?.showWarning && !dontShowAgain) {
    setShowWarningPopup(true);
    return;
  }

  // No throttle issues, proceed
  setView('details');
};

// Continue despite warning
const handleContinueAfterWarning = async () => {
  setShowWarningPopup(false);

  // Save preference if checkbox was checked
  if (dontShowAgain) {
    await dateChangeRequestService.updateWarningPreference(
      lease._id,
      getUserId(),
      true
    );
  }

  setView('details');
};

// Handle checkbox change
const handleDontShowAgainChange = (checked) => {
  setDontShowAgain(checked);
};
```

**Validation:** Test full flow with different throttle states

---

### Step 15: Update index.js Exports
**Files:** `app/src/islands/shared/DateChangeRequestManager/index.js`
**Purpose:** Export new popup components

**Details:**
- Add exports for `ThrottlingWarningPopup` and `ThrottlingBlockPopup`

**Validation:** Import in another file to verify exports work

---

### Step 16: Remove/Deprecate Inline ThrottlingWarning
**Files:** `app/src/islands/shared/DateChangeRequestManager/ThrottlingWarning.jsx`
**Purpose:** Replace inline warning with popup-based system

**Details:**
- Keep component for backward compatibility but mark as deprecated
- Remove usage from DateChangeRequestManager.jsx
- The inline warning was showing at 60% of limit (3 requests) - now we only show at 5+

**Validation:** Verify inline warning no longer appears

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| User creates request while warning popup is open | Disable "Continue" button while submission in progress |
| Database update fails for preference | Log error, continue with default behavior (show warnings) |
| Cron job fails to restore ability | Users can contact support; manual restore available |
| User is both host and guest on same lease | Use role-specific fields; track separately |
| Lease record missing new fields | Default to true (ability) / false (don't show warning) |
| Other participant has no name | Fallback to "the other party" |

---

## Testing Considerations

### Unit Tests
- Test throttle level calculation with various request counts (0, 4, 5, 9, 10, 15)
- Test user role determination (host vs guest)
- Test preference update persistence

### Integration Tests
- Create 5 requests, verify soft warning appears
- Dismiss warning with "Continue still", verify proceeds
- Check "Don't show again", create 6th request, verify no warning
- Create 10 requests, verify hard block appears
- Wait 24 hours (or mock), verify ability restored

### Manual Testing Scenarios
1. Guest creates 4 requests - no warning
2. Guest creates 5th request - soft warning popup
3. Guest checks "Don't show again" - preference saved
4. Guest creates 6th request - no warning (preference respected)
5. Guest creates 10th request - hard block popup
6. Guest tries again - still blocked
7. 24 hours pass - ability restored, can create again

---

## Rollback Strategy

1. **Database**: Drop new columns if needed (ALTER TABLE DROP COLUMN)
2. **Edge Functions**: Revert to previous version via Supabase dashboard
3. **Frontend**: Remove popup components, restore inline ThrottlingWarning usage
4. **Cron Job**: Disable via `cron.unschedule('restore-throttle-abilities')`

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Supabase database access | Required | For migration |
| pg_cron extension | Required | For scheduled restoration |
| Bubble sync queue | Existing | For syncing throttle fields to Bubble |
| User table with "Name - First" field | Existing | For other participant name |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cron job fails silently | Low | Medium | Add Slack notification on failure |
| Users bypass throttle via direct API | Low | Low | Server-side enforcement in create handler |
| Bubble sync fails for throttle fields | Medium | Low | Non-blocking; fields are Supabase-native |
| Performance impact of extra DB queries | Low | Low | Add index on lease_id + request_status |

---

## Deployment Notes

**After implementation, remind about manual deployments:**
1. Run database migration via Supabase dashboard or CLI
2. Deploy Edge Function: `supabase functions deploy date-change-request`
3. Set up pg_cron job via Supabase SQL editor
4. Deploy frontend via Cloudflare Pages (automatic on push)

---

## Files Referenced Summary

### Frontend (app/)
| Path | Action |
|------|--------|
| `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.jsx` | MODIFY |
| `app/src/islands/shared/DateChangeRequestManager/DateChangeRequestManager.css` | MODIFY |
| `app/src/islands/shared/DateChangeRequestManager/dateChangeRequestService.js` | MODIFY |
| `app/src/islands/shared/DateChangeRequestManager/ThrottlingWarning.jsx` | DEPRECATE |
| `app/src/islands/shared/DateChangeRequestManager/ThrottlingWarningPopup.jsx` | CREATE |
| `app/src/islands/shared/DateChangeRequestManager/ThrottlingBlockPopup.jsx` | CREATE |
| `app/src/islands/shared/DateChangeRequestManager/index.js` | MODIFY |

### Backend (supabase/)
| Path | Action |
|------|--------|
| `supabase/functions/date-change-request/index.ts` | MODIFY |
| `supabase/functions/date-change-request/lib/types.ts` | MODIFY |
| `supabase/functions/date-change-request/handlers/getThrottleStatus.ts` | MODIFY |
| `supabase/functions/date-change-request/handlers/create.ts` | MODIFY |
| `supabase/functions/date-change-request/handlers/applyHardBlock.ts` | CREATE |
| `supabase/functions/date-change-request/handlers/updateWarningPreference.ts` | CREATE |
| `supabase/functions/date-change-request/handlers/restoreThrottleAbility.ts` | CREATE |

### Database
| Path | Action |
|------|--------|
| `supabase/migrations/20260109_add_lease_throttling_fields.sql` | CREATE |
| `supabase/migrations/20260109_throttle_restore_cron.sql` | CREATE |

---

**Plan Version**: 1.0
**Created**: 2026-01-09T16:50:00
**Author**: Claude Implementation Planning Architect
