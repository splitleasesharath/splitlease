# Reminder House Manual - Shared Island Implementation Plan

**Date:** 2026-01-16
**Type:** BUILD (New Feature)
**Complexity:** High
**Estimated Files:** 15-20 new files

---

## Executive Summary

This plan adapts the `reminders-house-manual` GitHub repository into Split Lease's islands architecture. The source repo contains a Bubble.io migration for scheduling house manual reminders with email/SMS notifications. We need to convert this into:

1. A **shared island component** (`ReminderHouseManual/`)
2. A **Supabase Edge Function** (`reminder-scheduler/`)
3. **Logic layer functions** following the four-layer architecture

---

## Source Repository Analysis

### What Exists in the GitHub Repo

| Component | Location | Status | Issues |
|-----------|----------|--------|--------|
| ReminderModal.js | client/src/components/ | Complete | Uses react-datepicker, needs CSS adaptation |
| ReminderCard.js | client/src/components/ | Complete | Needs styling migration |
| ReminderList.js | client/src/components/ | Complete | Simple list wrapper |
| useReminders.js | client/src/hooks/ | Complete | Uses toast, needs Supabase integration |
| api.js | client/src/services/ | Complete | Axios-based, replace with Supabase client |
| mock-server.js | server/ | Mock only | Real routes/models directories are empty |

### Key Inconsistencies to Fix

| Issue | Source Repo | Split Lease Standard | Fix Required |
|-------|-------------|---------------------|--------------|
| **State management** | Local useState | Context + useXxxPageLogic hooks | Create useReminderHouseManualLogic.js |
| **API calls** | Axios to Express | Supabase Edge Functions | Replace with callEdgeFunction pattern |
| **Data model** | MongoDB schema | PostgreSQL (existing `remindersfromhousemanual` table) | Map fields correctly |
| **Styling** | Separate CSS file | Component-scoped CSS with BEM naming | Create ReminderHouseManual.css |
| **Date handling** | react-datepicker | Native date inputs or existing date utils | Use existing dayUtils.js patterns |
| **Notifications** | Mock scheduler | Real send-email + send-sms Edge Functions | Integrate with existing functions |
| **Toast notifications** | react-hot-toast | Existing Toast.jsx component | Use Split Lease Toast |

---

## Database Schema Mapping

### Existing Table: `remindersfromhousemanual`

The table already exists with 48 rows. Here's the field mapping:

| GitHub Repo Field | Supabase Column | Type | Notes |
|-------------------|-----------------|------|-------|
| `_id` | `_id` | text | Primary key (exists) |
| `houseManualId` | `house manual` | text | FK to housemanual (exists) |
| `guestUserId` | `guest` | text | FK to user (exists) |
| `creatorId` | `Created By` | text | FK to user (exists) |
| `message` | `message to send` | text | Reminder content (exists) |
| `scheduledDateTime` | `scheduled date and time` | timestamptz | When to send (exists) |
| `isEmailReminder` | `is an email reminder?` | boolean | Email flag (exists) |
| `isSmsReminder` | `is a phone reminder?` | boolean | SMS flag (exists) |
| `fallbackPhone` | `phone number (in case no guest attached)` | text | Fallback phone (exists) |
| `fallbackEmail` | **MISSING** | text | **Need to add column** |
| `reminderType` | `type of reminders` | text | Category (exists) |
| `emailSchedulerCode` | `API scheduled code for email` | text | Scheduler ref (exists) |
| `smsSchedulerCode` | `API scheduled code for sms` | text | Scheduler ref (exists) |
| `status` | **MISSING** | text | **Need to add column** (pending/sent/cancelled) |
| `visitId` | **MISSING** | text | **Need to add column** (FK to visit) |

### Required Schema Migration

```sql
-- Migration: add_reminder_columns
ALTER TABLE remindersfromhousemanual
ADD COLUMN IF NOT EXISTS "fallback email" text,
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "visit" text REFERENCES visit(_id);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_reminders_status
ON remindersfromhousemanual(status);

-- Add index for scheduled queries
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled
ON remindersfromhousemanual("scheduled date and time");
```

---

## Architecture Design

### Component Structure

```
app/src/islands/shared/ReminderHouseManual/
├── ReminderHouseManual.jsx          # Main modal component (hollow)
├── ReminderHouseManual.css          # Scoped styles
├── useReminderHouseManualLogic.js   # All business logic hook
├── reminderHouseManualService.js    # Edge Function API calls
├── components/
│   ├── ReminderForm.jsx             # Create/Edit form
│   ├── ReminderCard.jsx             # Single reminder display
│   ├── ReminderList.jsx             # List of reminders
│   └── DeleteConfirmation.jsx       # Delete confirmation view
└── index.js                         # Exports
```

### Logic Layer Structure

```
app/src/logic/
├── calculators/reminders/
│   └── calculateNextSendTime.js     # Date/time calculations
├── rules/reminders/
│   ├── reminderValidation.js        # canCreate, canUpdate, canDelete
│   └── reminderScheduling.js        # isValidScheduleTime, canSchedule
├── processors/reminders/
│   ├── reminderAdapter.js           # adaptForSubmission, adaptFromDatabase
│   └── reminderFormatter.js         # formatScheduledTime, formatReminderType
└── workflows/reminders/
    └── reminderWorkflow.js          # Orchestrates create/update/delete
```

### Edge Function Structure

```
supabase/functions/reminder-scheduler/
├── index.ts                         # Main router
├── handlers/
│   ├── create.ts                    # Create reminder + schedule notifications
│   ├── update.ts                    # Update reminder + reschedule
│   ├── delete.ts                    # Delete + cancel scheduled
│   ├── get.ts                       # Get reminders by house manual
│   └── cancel.ts                    # Cancel scheduled notification
└── lib/
    ├── types.ts                     # TypeScript types
    ├── validators.ts                # Input validation
    └── scheduler.ts                 # Notification scheduling logic
```

---

## Implementation Steps

### Phase 1: Database Schema Update

1. **Create migration** for new columns (`fallback email`, `status`, `visit`)
2. **Update TypeScript types** in Edge Functions

### Phase 2: Edge Function - `reminder-scheduler`

1. **Create index.ts** with action router pattern (matching send-email/send-sms)
2. **Implement handlers**:
   - `create`: Validate, insert to DB, call send-email/send-sms with scheduled time
   - `update`: Cancel existing schedules, create new ones
   - `delete`: Cancel schedules, mark as cancelled or delete row
   - `get`: Fetch reminders by house manual ID with visit/guest joins
3. **Integrate with existing** `send-email` and `send-sms` Edge Functions
4. **Add to cron job** (if needed) for scheduled dispatch

### Phase 3: Logic Layer Functions

1. **Calculators**:
   - `calculateNextSendTime(scheduledDateTime)` - timezone handling

2. **Rules**:
   - `canCreateReminder({ houseManualId, creatorId })`
   - `canUpdateReminder({ reminder, userId })`
   - `canDeleteReminder({ reminder, userId })`
   - `isValidScheduleTime(dateTime)` - must be in future
   - `requiresFallbackContact({ visitId, notificationChannels })`

3. **Processors**:
   - `adaptReminderForSubmission(formData)` - form to API payload
   - `adaptReminderFromDatabase(dbRow)` - DB to UI format
   - `formatScheduledTime(dateTime)` - display formatting
   - `formatReminderType(typeCode)` - type to label

4. **Workflows**:
   - `createReminderWorkflow({ formData, houseManualId })`
   - `updateReminderWorkflow({ reminderId, updates })`
   - `deleteReminderWorkflow({ reminderId })`

### Phase 4: Shared Island Component

1. **ReminderHouseManual.jsx** (Hollow component):
   - Props: `houseManualId`, `creatorId`, `visits`, `isVisible`, `onClose`
   - Delegates ALL logic to `useReminderHouseManualLogic`
   - Modal structure matching HostReviewGuest pattern

2. **useReminderHouseManualLogic.js**:
   - State: `reminders`, `formData`, `section`, `selectedReminder`, `isSubmitting`, `error`
   - Memoized: `canSubmit`, `formattedReminders`
   - Callbacks: `handleCreate`, `handleUpdate`, `handleDelete`, `handleRatingChange`

3. **reminderHouseManualService.js**:
   - `fetchReminders(houseManualId)`
   - `createReminder(data)`
   - `updateReminder(id, data)`
   - `deleteReminder(id)`
   - `cancelNotification(code)`

4. **Child components**:
   - `ReminderForm.jsx` - form fields for create/edit
   - `ReminderCard.jsx` - single reminder display with actions
   - `ReminderList.jsx` - scrollable list of ReminderCards
   - `DeleteConfirmation.jsx` - confirm delete with warning

### Phase 5: Styling

1. **ReminderHouseManual.css** using BEM naming convention:
   - `.rhm-overlay`, `.rhm-container`, `.rhm-header`
   - `.rhm-form`, `.rhm-form__field`, `.rhm-form__input`
   - `.rhm-card`, `.rhm-card__message`, `.rhm-card__time`
   - `.rhm-button-primary`, `.rhm-button-secondary`

### Phase 6: Integration

1. **Add to House Manual Dashboard** (where hosts manage their house manual)
2. **Add to Visit Detail** (where reminders are shown for a specific visit)
3. **Test end-to-end flow**:
   - Create reminder → Schedule notification → Receive email/SMS
   - Update reminder → Cancel old schedule → Create new schedule
   - Delete reminder → Cancel all schedules

---

## Notification Scheduling Strategy

### Option A: Immediate Scheduling (Recommended)

When a reminder is created, immediately call the external scheduling API (if one exists in Bubble) or queue a row in a `scheduled_notifications` table that a cron job processes.

### Option B: Cron-Based Polling

A cron job runs every 5 minutes, queries `remindersfromhousemanual` for records where `scheduled date and time < NOW()` and `status = 'pending'`, then sends the notification.

**Recommendation**: Start with **Option B** (simpler) unless there's an existing scheduling service to integrate with.

### Cron Job Implementation

```sql
-- In pg_cron or Supabase scheduled function
SELECT cron.schedule(
  'process-pending-reminders',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/reminder-scheduler',
    body := '{"action": "process-pending"}'::jsonb
  );
  $$
);
```

---

## Reminder Types (from source repo)

| Type Code | Label | Icon |
|-----------|-------|------|
| `check-in` | Check-in Reminder | 🏠 |
| `check-out` | Check-out Reminder | 🚪 |
| `maintenance` | Maintenance Alert | 🔧 |
| `payment` | Payment Reminder | 💳 |
| `emergency` | Emergency Info | 🚨 |
| `amenity` | Amenity Instructions | ✨ |
| `local-tip` | Local Tip | 📍 |
| `custom` | Custom Message | 💬 |

---

## Props Interface

```typescript
interface ReminderHouseManualProps {
  // Required
  houseManualId: string;
  creatorId: string;

  // Optional
  visits?: Visit[];           // For visit dropdown selection
  isVisible?: boolean;        // Modal visibility (default: false)
  onClose?: () => void;       // Close callback
  onReminderCreated?: (reminder: Reminder) => void;
  onReminderUpdated?: (reminder: Reminder) => void;
  onReminderDeleted?: (reminderId: string) => void;

  // Initial state
  initialSection?: 'list' | 'create' | 'update' | 'delete';
  selectedReminder?: Reminder; // For edit/delete modes
}
```

---

## Testing Checklist

- [ ] Create reminder with email only
- [ ] Create reminder with SMS only
- [ ] Create reminder with both email and SMS
- [ ] Create reminder with guest (contact from user record)
- [ ] Create reminder without guest (fallback contact required)
- [ ] Update reminder message
- [ ] Update reminder scheduled time (reschedule)
- [ ] Update reminder notification channels
- [ ] Delete pending reminder (cancels schedules)
- [ ] Attempt to create reminder with past date (should fail)
- [ ] Attempt to create reminder without message (should fail)
- [ ] Verify email delivery at scheduled time
- [ ] Verify SMS delivery at scheduled time

---

## File References

### Source Repository
- [ReminderModal.js](https://github.com/splitleasesharath/reminders-house-manual/blob/main/client/src/components/ReminderModal.js)
- [ReminderCard.js](https://github.com/splitleasesharath/reminders-house-manual/blob/main/client/src/components/ReminderCard.js)
- [useReminders.js](https://github.com/splitleasesharath/reminders-house-manual/blob/main/client/src/hooks/useReminders.js)
- [mock-server.js](https://github.com/splitleasesharath/reminders-house-manual/blob/main/server/mock-server.js)
- [Requirements Document](https://github.com/splitleasesharath/reminders-house-manual/blob/main/reminder-hm-new%20Reusable%20Element%20-%20COMPREHENSIVE%20REQUIREMENTS%20DOCUMENT.md)

### Split Lease Patterns (Reference)
- [HostReviewGuest.jsx](../../../app/src/islands/shared/HostReviewGuest/HostReviewGuest.jsx) - Hollow component pattern
- [hostReviewGuestService.js](../../../app/src/islands/shared/HostReviewGuest/hostReviewGuestService.js) - Service pattern
- [send-email/index.ts](../../../supabase/functions/send-email/index.ts) - Edge Function pattern
- [send-sms/index.ts](../../../supabase/functions/send-sms/index.ts) - SMS Edge Function
- [VirtualMeetingManager/](../../../app/src/islands/shared/VirtualMeetingManager/) - Multi-view modal pattern

### Existing Database
- Table: `remindersfromhousemanual` (48 existing rows)
- Table: `housemanual` (195 rows)
- Table: `visit` (298 rows)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Notification delivery failures | Medium | High | Add retry logic, fallback to other channel |
| Timezone confusion | High | Medium | Store all times in UTC, convert on display |
| Orphaned scheduled jobs | Medium | Low | Cleanup job to cancel old unfired schedules |
| Guest contact info missing | Medium | Medium | Require fallback fields when no guest selected |

---

## Questions for User

1. **Scheduling Service**: Is there an existing scheduling API in Bubble we should integrate with, or should we build a cron-based system?

2. **Notification Templates**: Should reminders use existing SendGrid templates, or plain text messages?

3. **Visibility**: Should reminders be visible to guests in their Visit view, or only to hosts?

4. **Status Tracking**: Do we need to track if a reminder was successfully delivered (read receipts)?

---

## Summary

This plan converts the GitHub repo's reminder modal into Split Lease's architecture by:

1. Using the **existing `remindersfromhousemanual` table** with 3 new columns
2. Creating a **hollow component** following the HostReviewGuest pattern
3. Building a **new Edge Function** that integrates with existing send-email/send-sms
4. Implementing the **four-layer logic architecture** for business rules
5. Using **cron-based scheduling** for notification dispatch

The implementation preserves the original functionality while adapting to Split Lease's patterns for maintainability and consistency.
