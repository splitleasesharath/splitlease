# Virtual Meetings Admin Console Migration Plan

**Date:** 2026-01-20
**Source:** https://github.com/splitleasesharath/_manage-virtual-meetings.git
**Target:** Split Lease Monorepo (Islands Architecture)
**Status:** PLANNING
**Complexity:** HIGH (Multi-file, External Integrations, New Page)

---

## Executive Summary

This plan migrates the `_manage-virtual-meetings` npm package (a TypeScript/React component library for admin management of virtual meeting requests) into the Split Lease monorepo. The source is a standalone Vite library; the target follows Islands Architecture with Hollow Components and Edge Functions.

### Key Migration Challenges

| Challenge | Source Implementation | Target Requirement | Resolution |
|-----------|----------------------|-------------------|------------|
| **Architecture** | Single-page React app (SPA) | Islands Architecture (multi-page) | Create dedicated admin page with full page loads |
| **Language** | TypeScript throughout | JavaScript (frontend) + TypeScript (Edge Functions) | Convert frontend to JSX, keep Edge Functions in TS |
| **State Management** | Custom hooks with reducers | Hollow component pattern (`useXxxPageLogic`) | Restructure hooks to follow hollow pattern |
| **API Layer** | Direct Supabase client calls | Edge Functions with `{action, payload}` pattern | Route all API calls through Edge Functions |
| **Database** | New tables (users, blocked_slots) | Existing tables + extensions | Extend existing schema, add new tables for blocked slots |
| **External Services** | Placeholder implementations | Production integrations needed | Implement real Google Calendar, Zoom/Meet APIs |

---

## Source Repository Analysis

### File Structure Overview

```
_manage-virtual-meetings/
├── src/
│   ├── api/
│   │   ├── backendWorkflows.ts      → Edge Function actions
│   │   ├── database.types.ts        → Already have Supabase types
│   │   ├── supabaseClient.ts        → Use existing app/src/lib/supabase.js
│   │   └── virtualMeetings.ts       → Convert to Edge Function calls
│   ├── components/
│   │   ├── ManageVirtualMeetings/   → Main admin page component
│   │   ├── AvailabilityCalendar/    → Host availability management
│   │   ├── ConfirmedMeetingsSection/→ Confirmed meetings list
│   │   ├── NewRequestsSection/      → Pending requests list
│   │   ├── SearchFilters/           → Filter controls
│   │   ├── TimeZoneComparison/      → Multi-timezone display
│   │   └── modals/                  → Dialog components
│   ├── hooks/
│   │   ├── useVirtualMeetings.ts    → Meeting state management
│   │   └── useBlockedSlots.ts       → Availability state
│   ├── types/
│   │   └── virtualMeeting.ts        → TypeScript interfaces
│   ├── utils/
│   │   └── timezone.ts              → Timezone utilities
│   └── styles/                      → CSS files
```

### Source Technologies

- **React 18** + **Vite 5** (library mode)
- **TypeScript 5.3** (strict mode)
- **date-fns** + **date-fns-tz** for timezone handling
- **Supabase JS Client** (direct database access)

---

## Target Architecture Mapping

### 1. Page Structure (Islands Architecture)

**New Files Required:**

```
app/
├── public/
│   └── manage-virtual-meetings.html     # NEW - HTML entry point
├── src/
│   ├── manage-virtual-meetings.jsx      # NEW - React mount point
│   ├── islands/
│   │   └── pages/
│   │       └── ManageVirtualMeetingsPage/
│   │           ├── ManageVirtualMeetingsPage.jsx    # NEW - Hollow component
│   │           ├── useManageVirtualMeetingsPageLogic.js  # NEW - All logic
│   │           ├── components/
│   │           │   ├── MeetingCard.jsx
│   │           │   ├── ConfirmedMeetingCard.jsx
│   │           │   ├── SearchFilters.jsx
│   │           │   ├── AvailabilityCalendar.jsx
│   │           │   └── TimeZoneComparison.jsx
│   │           └── modals/
│   │               ├── EditMeetingModal.jsx
│   │               ├── ChangeDateModal.jsx
│   │               └── DeleteConfirmationModal.jsx
│   ├── logic/
│   │   ├── rules/
│   │   │   └── admin/
│   │   │       └── virtualMeetingAdminRules.js  # NEW - Admin predicates
│   │   ├── calculators/
│   │   │   └── availability/
│   │   │       └── calculateAvailableSlots.js   # NEW - Time slot math
│   │   └── processors/
│   │       └── meetings/
│   │           └── formatMeetingData.js         # NEW - Data transforms
│   └── styles/
│       └── components/
│           ├── manage-virtual-meetings.css      # NEW - Page styles
│           └── availability-calendar.css        # NEW - Calendar styles
```

### 2. Edge Function Structure

**Extend Existing Function:**

```
supabase/functions/
└── virtual-meeting/
    ├── index.ts                    # MODIFY - Add admin actions
    └── handlers/
        ├── create.ts               # EXISTS
        ├── accept.ts               # EXISTS
        ├── decline.ts              # EXISTS
        ├── delete.ts               # EXISTS
        ├── admin/                  # NEW - Admin-only handlers
        │   ├── fetchNewRequests.ts
        │   ├── fetchConfirmedMeetings.ts
        │   ├── confirmMeeting.ts
        │   ├── updateMeetingDates.ts
        │   └── blockTimeSlot.ts
        └── integrations/           # NEW - External service handlers
            ├── sendGoogleCalendarInvite.ts
            ├── generateMeetingLink.ts
            └── sendSlackNotification.ts
```

### 3. Database Schema Extensions

**New Table: `blocked_time_slots`**

```sql
CREATE TABLE blocked_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  start_time TIME,           -- NULL if full day blocked
  end_time TIME,             -- NULL if full day blocked
  is_full_day_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (
    (is_full_day_blocked = TRUE AND start_time IS NULL AND end_time IS NULL)
    OR
    (is_full_day_blocked = FALSE AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

-- Index for efficient lookups
CREATE INDEX idx_blocked_slots_host_date ON blocked_time_slots(host_id, date);

-- RLS Policies
ALTER TABLE blocked_time_slots ENABLE ROW LEVEL SECURITY;

-- Admins can read all
CREATE POLICY "Admins can read all blocked slots"
  ON blocked_time_slots FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Hosts can manage their own slots
CREATE POLICY "Hosts can manage own blocked slots"
  ON blocked_time_slots FOR ALL
  TO authenticated
  USING (host_id = auth.uid());
```

**Extend Existing Table: `virtualmeetingschedulesandlinks`**

```sql
-- Add missing columns if not present
ALTER TABLE virtualmeetingschedulesandlinks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new_request'
    CHECK (status IN ('new_request', 'confirmed', 'cancelled', 'completed', 'rescheduled')),
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS meeting_provider TEXT DEFAULT 'zoom'
    CHECK (meeting_provider IN ('zoom', 'google_meet', 'teams'));
```

---

## Detailed Migration Steps

### Phase 1: Route & Page Setup

#### Step 1.1: Add Route Configuration

**File:** `app/src/routes.config.js`

```javascript
// Add to routes array
{
  path: '/manage-virtual-meetings',
  file: 'manage-virtual-meetings.html',
  protected: true,
  cloudflareInternal: true,
  internalName: 'manage-virtual-meetings-admin',
  hasDynamicSegment: false,
  adminOnly: true  // Custom flag for admin-only pages
}
```

#### Step 1.2: Create HTML Entry Point

**File:** `app/public/manage-virtual-meetings.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Manage Virtual Meetings | Split Lease Admin</title>
  <link rel="stylesheet" href="/src/styles/global.css" />
  <link rel="stylesheet" href="/src/styles/components/manage-virtual-meetings.css" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/manage-virtual-meetings.jsx"></script>
</body>
</html>
```

#### Step 1.3: Create JSX Mount Point

**File:** `app/src/manage-virtual-meetings.jsx`

```javascript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ManageVirtualMeetingsPage from './islands/pages/ManageVirtualMeetingsPage/ManageVirtualMeetingsPage';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ManageVirtualMeetingsPage />
  </StrictMode>
);
```

---

### Phase 2: Component Migration

#### Step 2.1: Main Page Component (Hollow Pattern)

**Source:** `src/components/ManageVirtualMeetings/ManageVirtualMeetings.tsx`
**Target:** `app/src/islands/pages/ManageVirtualMeetingsPage/ManageVirtualMeetingsPage.jsx`

**Discrepancy Resolution:**

| Source Pattern | Target Pattern | Action |
|---------------|----------------|--------|
| TypeScript with interfaces | JavaScript with JSDoc | Convert to JSX, add JSDoc types |
| Inline state management | Extract to `useXxxPageLogic` hook | Move ALL state/effects to hook |
| Direct component composition | Hollow component (pure render) | Page component returns JSX only |

**Target Structure:**

```javascript
// ManageVirtualMeetingsPage.jsx
import { useManageVirtualMeetingsPageLogic } from './useManageVirtualMeetingsPageLogic';
import SearchFilters from './components/SearchFilters';
import NewRequestsSection from './components/NewRequestsSection';
import ConfirmedMeetingsSection from './components/ConfirmedMeetingsSection';
import AvailabilityCalendar from './components/AvailabilityCalendar';
// ... modal imports

export default function ManageVirtualMeetingsPage() {
  const logic = useManageVirtualMeetingsPageLogic();

  // NO useState, NO useEffect, NO handlers defined here
  // Pure JSX rendering using logic object

  return (
    <div className="manage-vm-page">
      <header className="manage-vm-header">
        <h1>Virtual Meeting Management</h1>
        {logic.error && <div className="error-banner">{logic.error}</div>}
      </header>

      <SearchFilters
        filters={logic.filters}
        onFilterChange={logic.handleFilterChange}
      />

      <div className="manage-vm-content">
        <NewRequestsSection
          meetings={logic.filteredNewRequests}
          onConfirm={logic.handleOpenConfirmModal}
          onEdit={logic.handleOpenEditModal}
          onDelete={logic.handleOpenDeleteModal}
          isLoading={logic.isLoading}
        />

        <ConfirmedMeetingsSection
          meetings={logic.filteredConfirmedMeetings}
          onEdit={logic.handleOpenEditModal}
          onChangeDate={logic.handleOpenChangeDateModal}
          isLoading={logic.isLoading}
        />

        <AvailabilityCalendar
          blockedSlots={logic.blockedSlots}
          selectedHost={logic.selectedHost}
          onBlockSlot={logic.handleBlockSlot}
          onUnblockSlot={logic.handleUnblockSlot}
          onBlockFullDay={logic.handleBlockFullDay}
          onUnblockFullDay={logic.handleUnblockFullDay}
        />
      </div>

      {/* Modals */}
      {logic.modals.delete.isOpen && (
        <DeleteConfirmationModal
          meeting={logic.modals.delete.meeting}
          onConfirm={logic.handleDeleteMeeting}
          onClose={logic.handleCloseDeleteModal}
        />
      )}
      {/* ... other modals */}
    </div>
  );
}
```

#### Step 2.2: Logic Hook Migration

**Source:** `src/hooks/useVirtualMeetings.ts` + `src/hooks/useBlockedSlots.ts`
**Target:** `app/src/islands/pages/ManageVirtualMeetingsPage/useManageVirtualMeetingsPageLogic.js`

**Key Transformations:**

```javascript
// useManageVirtualMeetingsPageLogic.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '../../../lib/toastService';
import { callEdgeFunction } from '../../../lib/api';
import {
  canConfirmMeeting,
  canDeleteMeeting,
  canEditMeetingDates
} from '../../../logic/rules/admin/virtualMeetingAdminRules';

export function useManageVirtualMeetingsPageLogic() {
  // ========== STATE ==========
  const [newRequests, setNewRequests] = useState([]);
  const [confirmedMeetings, setConfirmedMeetings] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [filters, setFilters] = useState({
    guest: '',
    host: '',
    proposalId: ''
  });
  const [selectedHost, setSelectedHost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states (centralized)
  const [modals, setModals] = useState({
    delete: { isOpen: false, meeting: null },
    editGuest: { isOpen: false, meeting: null },
    editHost: { isOpen: false, meeting: null },
    changeDate: { isOpen: false, meeting: null }
  });

  // ========== DERIVED STATE (Memoized) ==========
  const filteredNewRequests = useMemo(() => {
    return filterMeetings(newRequests, filters);
  }, [newRequests, filters]);

  const filteredConfirmedMeetings = useMemo(() => {
    return filterMeetings(confirmedMeetings, filters);
  }, [confirmedMeetings, filters]);

  // ========== EFFECTS ==========
  useEffect(() => {
    loadAllMeetings();
  }, []);

  useEffect(() => {
    if (selectedHost) {
      loadBlockedSlots(selectedHost.id);
    }
  }, [selectedHost]);

  // ========== API CALLS (via Edge Functions) ==========
  const loadAllMeetings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch via Edge Function
      const [newRes, confirmedRes] = await Promise.all([
        callEdgeFunction('virtual-meeting', {
          action: 'admin_fetch_new_requests',
          payload: {}
        }),
        callEdgeFunction('virtual-meeting', {
          action: 'admin_fetch_confirmed',
          payload: {}
        })
      ]);

      if (!newRes.success) throw new Error(newRes.error);
      if (!confirmedRes.success) throw new Error(confirmedRes.error);

      setNewRequests(newRes.data);
      setConfirmedMeetings(confirmedRes.data);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConfirmMeeting = useCallback(async (meetingId, bookedDate, meetingLink) => {
    // Check permission using rules
    const meeting = newRequests.find(m => m._id === meetingId);
    if (!canConfirmMeeting(meeting)) {
      toast.error('Cannot confirm this meeting');
      return;
    }

    try {
      const response = await callEdgeFunction('virtual-meeting', {
        action: 'admin_confirm_meeting',
        payload: { meetingId, bookedDate, meetingLink }
      });

      if (!response.success) throw new Error(response.error);

      // Update local state
      setNewRequests(prev => prev.filter(m => m._id !== meetingId));
      setConfirmedMeetings(prev => [...prev, response.data]);

      toast.success('Meeting confirmed successfully');
      handleCloseConfirmModal();
    } catch (err) {
      toast.error(`Failed to confirm: ${err.message}`);
    }
  }, [newRequests]);

  // ... additional handlers (delete, edit, block/unblock slots)

  // ========== MODAL HANDLERS ==========
  const handleOpenDeleteModal = useCallback((meeting) => {
    setModals(prev => ({
      ...prev,
      delete: { isOpen: true, meeting }
    }));
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setModals(prev => ({
      ...prev,
      delete: { isOpen: false, meeting: null }
    }));
  }, []);

  // ... other modal handlers

  // ========== FILTER HANDLERS ==========
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // ========== RETURN ALL PUBLIC API ==========
  return {
    // State
    newRequests,
    confirmedMeetings,
    blockedSlots,
    filters,
    selectedHost,
    isLoading,
    error,
    modals,

    // Derived
    filteredNewRequests,
    filteredConfirmedMeetings,

    // Actions
    handleConfirmMeeting,
    handleDeleteMeeting,
    handleEditMeetingDates,
    handleBlockSlot,
    handleUnblockSlot,
    handleBlockFullDay,
    handleUnblockFullDay,

    // Filters
    handleFilterChange,
    setSelectedHost,

    // Modals
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleOpenEditModal,
    handleCloseEditModal,
    handleOpenChangeDateModal,
    handleCloseChangeDateModal,
    handleOpenConfirmModal,
    handleCloseConfirmModal
  };
}

// ========== HELPER FUNCTIONS (Pure) ==========
function filterMeetings(meetings, filters) {
  return meetings.filter(meeting => {
    const guestMatch = !filters.guest ||
      meeting.guest?.name_first?.toLowerCase().includes(filters.guest.toLowerCase()) ||
      meeting.guest?.email?.toLowerCase().includes(filters.guest.toLowerCase());

    const hostMatch = !filters.host ||
      meeting.host?.name_first?.toLowerCase().includes(filters.host.toLowerCase()) ||
      meeting.host?.email?.toLowerCase().includes(filters.host.toLowerCase());

    const proposalMatch = !filters.proposalId ||
      meeting.proposal_unique_id?.includes(filters.proposalId);

    return guestMatch && hostMatch && proposalMatch;
  });
}
```

---

### Phase 3: Business Logic Layer

#### Step 3.1: Admin Rules

**Target:** `app/src/logic/rules/admin/virtualMeetingAdminRules.js`

```javascript
/**
 * Virtual Meeting Admin Rules
 * Boolean predicates for admin operations
 */

/**
 * Check if a meeting can be confirmed by admin
 * @param {Object} meeting - The meeting object
 * @returns {boolean}
 */
export function canConfirmMeeting(meeting) {
  if (!meeting) return false;
  return (
    meeting.status === 'new_request' &&
    !meeting.booked_date &&
    meeting.suggested_dates_and_times?.length > 0
  );
}

/**
 * Check if a meeting can be deleted by admin
 * @param {Object} meeting - The meeting object
 * @returns {boolean}
 */
export function canDeleteMeeting(meeting) {
  if (!meeting) return false;
  // Can delete if not yet confirmed or if cancelled
  return meeting.status !== 'confirmed' && meeting.status !== 'completed';
}

/**
 * Check if meeting dates can be edited
 * @param {Object} meeting - The meeting object
 * @returns {boolean}
 */
export function canEditMeetingDates(meeting) {
  if (!meeting) return false;
  // Can edit dates if meeting hasn't been confirmed yet
  return !meeting.booked_date && meeting.status === 'new_request';
}

/**
 * Check if a time slot can be blocked for a host
 * @param {Object} slot - The time slot { date, startTime, endTime }
 * @param {Array} existingBlocks - Existing blocked slots
 * @returns {boolean}
 */
export function canBlockTimeSlot(slot, existingBlocks) {
  if (!slot?.date || !slot?.startTime || !slot?.endTime) return false;

  // Check if slot overlaps with existing blocks
  return !existingBlocks.some(block =>
    block.date === slot.date &&
    ((slot.startTime >= block.start_time && slot.startTime < block.end_time) ||
     (slot.endTime > block.start_time && slot.endTime <= block.end_time))
  );
}

/**
 * Determine meeting status label for display
 * @param {Object} meeting - The meeting object
 * @returns {Object} { status, label, color }
 */
export function getMeetingStatusInfo(meeting) {
  const statusMap = {
    new_request: { label: 'Pending', color: 'warning' },
    confirmed: { label: 'Confirmed', color: 'success' },
    cancelled: { label: 'Cancelled', color: 'error' },
    completed: { label: 'Completed', color: 'info' },
    rescheduled: { label: 'Rescheduled', color: 'warning' }
  };

  return statusMap[meeting?.status] || { label: 'Unknown', color: 'default' };
}
```

#### Step 3.2: Availability Calculator

**Target:** `app/src/logic/calculators/availability/calculateAvailableSlots.js`

```javascript
/**
 * Availability Slot Calculator
 * Pure functions for time slot calculations
 */

import { eachDayOfInterval, format, parseISO, isSameDay } from 'date-fns';

/**
 * Generate hourly time slots for a day
 * @param {number} startHour - Start hour (24h format)
 * @param {number} endHour - End hour (24h format)
 * @returns {Array<{hour: number, label: string}>}
 */
export function getTimeSlots(startHour = 8, endHour = 18) {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push({
      hour,
      label: formatTimeSlot(hour)
    });
  }
  return slots;
}

/**
 * Format hour to 12h display
 * @param {number} hour - 24h hour
 * @returns {string}
 */
export function formatTimeSlot(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

/**
 * Get available slots for a host on a specific date
 * @param {Date} date - The date to check
 * @param {Array} blockedSlots - Host's blocked slots
 * @param {number} startHour - Day start hour
 * @param {number} endHour - Day end hour
 * @returns {Array<{hour: number, available: boolean}>}
 */
export function getAvailableSlotsForDate(date, blockedSlots, startHour = 8, endHour = 18) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const slots = getTimeSlots(startHour, endHour);

  // Check if full day is blocked
  const fullDayBlock = blockedSlots.find(
    slot => slot.date === dateStr && slot.is_full_day_blocked
  );

  if (fullDayBlock) {
    return slots.map(slot => ({ ...slot, available: false }));
  }

  // Check individual slot blocks
  return slots.map(slot => {
    const slotStart = `${String(slot.hour).padStart(2, '0')}:00:00`;
    const slotEnd = `${String(slot.hour + 1).padStart(2, '0')}:00:00`;

    const isBlocked = blockedSlots.some(block =>
      block.date === dateStr &&
      !block.is_full_day_blocked &&
      block.start_time <= slotStart &&
      block.end_time > slotStart
    );

    return { ...slot, available: !isBlocked };
  });
}

/**
 * Calculate calendar grid data for a week
 * @param {Date} weekStart - Start of the week (Sunday)
 * @param {Array} blockedSlots - Host's blocked slots
 * @returns {Array<{date: Date, dayName: string, slots: Array}>}
 */
export function calculateWeeklyCalendarGrid(weekStart, blockedSlots) {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);

    days.push({
      date,
      dayName: dayNames[i],
      dateStr: format(date, 'yyyy-MM-dd'),
      displayDate: format(date, 'MMM d'),
      slots: getAvailableSlotsForDate(date, blockedSlots)
    });
  }

  return days;
}
```

---

### Phase 4: Edge Function Extensions

#### Step 4.1: Add Admin Actions to Virtual Meeting Function

**File:** `supabase/functions/virtual-meeting/index.ts`

**Add to ALLOWED_ACTIONS:**

```typescript
const ALLOWED_ACTIONS = [
  // Existing actions
  "create",
  "delete",
  "accept",
  "decline",
  "send_calendar_invite",
  "notify_participants",
  // NEW Admin actions
  "admin_fetch_new_requests",
  "admin_fetch_confirmed",
  "admin_confirm_meeting",
  "admin_update_meeting_dates",
  "admin_delete_meeting",
  "admin_block_time_slot",
  "admin_unblock_time_slot",
  "admin_block_full_day",
  "admin_unblock_full_day",
  "admin_fetch_blocked_slots"
] as const;
```

**Add to handlers map:**

```typescript
const handlers: Readonly<Record<Action, Handler>> = {
  // ... existing handlers
  admin_fetch_new_requests: handleAdminFetchNewRequests,
  admin_fetch_confirmed: handleAdminFetchConfirmed,
  admin_confirm_meeting: handleAdminConfirmMeeting,
  admin_update_meeting_dates: handleAdminUpdateMeetingDates,
  admin_delete_meeting: handleAdminDeleteMeeting,
  admin_block_time_slot: handleAdminBlockTimeSlot,
  admin_unblock_time_slot: handleAdminUnblockTimeSlot,
  admin_block_full_day: handleAdminBlockFullDay,
  admin_unblock_full_day: handleAdminUnblockFullDay,
  admin_fetch_blocked_slots: handleAdminFetchBlockedSlots,
};
```

#### Step 4.2: Admin Handler Implementations

**File:** `supabase/functions/virtual-meeting/handlers/admin/fetchNewRequests.ts`

```typescript
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AuthenticatedUser } from '../../_shared/fp/orchestration.ts';

interface FetchFilters {
  guest?: string;
  host?: string;
  proposalId?: string;
}

export async function handleAdminFetchNewRequests(
  payload: FetchFilters,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<any> {
  // Verify admin role
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  let query = supabase
    .from('virtualmeetingschedulesandlinks')
    .select(`
      *,
      guest:users!virtualmeetingschedulesandlinks_guest_fkey(
        id, name_first, name_last, email, phone_number, avatar_url, timezone
      ),
      host:users!virtualmeetingschedulesandlinks_host_fkey(
        id, name_first, name_last, email, phone_number, avatar_url, timezone
      )
    `)
    .is('booked_date', null)
    .eq('status', 'new_request')
    .order('created_at', { ascending: false });

  // Apply optional filters
  if (payload.proposalId) {
    query = query.ilike('proposal_unique_id', `%${payload.proposalId}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Fetch new requests error:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  return data || [];
}
```

**File:** `supabase/functions/virtual-meeting/handlers/admin/confirmMeeting.ts`

```typescript
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AuthenticatedUser } from '../../_shared/fp/orchestration.ts';
import { enqueueBubbleSync } from '../../_shared/queueSync.ts';

interface ConfirmPayload {
  meetingId: string;
  bookedDate: string;
  meetingLink?: string;
}

export async function handleAdminConfirmMeeting(
  payload: ConfirmPayload,
  user: AuthenticatedUser | null,
  supabase: SupabaseClient
): Promise<any> {
  // Verify admin role
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  // Validate input
  if (!payload.meetingId || !payload.bookedDate) {
    throw new Error('Missing required fields: meetingId, bookedDate');
  }

  // Generate meeting link if not provided
  const meetingLink = payload.meetingLink || generateMeetingLink();

  // Update meeting in database
  const { data: meeting, error } = await supabase
    .from('virtualmeetingschedulesandlinks')
    .update({
      booked_date: payload.bookedDate,
      meeting_link: meetingLink,
      status: 'confirmed',
      confirmed_by_splitlease: true,
      modified_date: new Date().toISOString()
    })
    .eq('_id', payload.meetingId)
    .select(`
      *,
      guest:users!virtualmeetingschedulesandlinks_guest_fkey(*),
      host:users!virtualmeetingschedulesandlinks_host_fkey(*)
    `)
    .single();

  if (error) {
    console.error('Confirm meeting error:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  // Queue Bubble sync
  await enqueueBubbleSync(supabase, {
    table: 'virtualmeetingschedulesandlinks',
    recordId: meeting._id,
    operation: 'UPDATE',
    payload: {
      booked_date: payload.bookedDate,
      meeting_link: meetingLink,
      confirmed_by_splitlease: true
    }
  });

  // Trigger async notifications (non-blocking)
  triggerNotifications(meeting).catch(err => {
    console.error('Notification error (non-blocking):', err);
  });

  return meeting;
}

function generateMeetingLink(): string {
  // TODO: Integrate with Zoom/Google Meet API
  const meetingId = crypto.randomUUID().replace(/-/g, '').substring(0, 11);
  return `https://zoom.us/j/${meetingId}`;
}

async function triggerNotifications(meeting: any): Promise<void> {
  // Send Google Calendar invite
  // Send email notifications
  // Post to Slack
  // These are fire-and-forget; errors logged but don't fail the main operation
}
```

---

### Phase 5: Timezone Utility Migration

**Source:** `src/utils/timezone.ts`
**Target:** `app/src/lib/timezoneUtils.js`

**Discrepancy:** Source uses `date-fns-tz`, target should use same or native Intl API.

```javascript
// app/src/lib/timezoneUtils.js
import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Get user's timezone from browser
 * @returns {string} IANA timezone identifier
 */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format date in a specific timezone
 * @param {Date|string} date - Date to format
 * @param {string} timezone - IANA timezone
 * @param {string} formatStr - date-fns format string
 * @returns {string}
 */
export function formatDateInTimezone(date, timezone, formatStr = 'PPpp') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, timezone, formatStr);
}

/**
 * Format date in user's local timezone
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateLocal(date) {
  return formatDateInTimezone(date, getUserTimezone());
}

/**
 * Format date in Eastern Standard Time
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateEST(date) {
  return formatDateInTimezone(date, 'America/New_York');
}

/**
 * Get multiple timezone displays for comparison
 * @param {Date|string} date
 * @returns {Object}
 */
export function getMultipleTimezoneDisplays(date) {
  return {
    local: formatDateLocal(date),
    eastern: formatDateEST(date),
    utc: formatDateInTimezone(date, 'UTC'),
    iso: typeof date === 'string' ? date : date.toISOString()
  };
}
```

---

### Phase 6: CSS Migration

**Source Files:**
- `src/styles/*.css`

**Target Files:**
- `app/src/styles/components/manage-virtual-meetings.css`
- `app/src/styles/components/availability-calendar.css`

**CSS Conventions to Follow:**

1. Use existing CSS variable system from `app/src/styles/global.css`
2. Follow BEM naming convention used elsewhere in codebase
3. Ensure responsive design matches existing breakpoints
4. Use existing color tokens (`--color-primary`, `--color-success`, etc.)

---

## Discrepancy Summary Table

| Category | Source | Target | Migration Action |
|----------|--------|--------|-----------------|
| **Language** | TypeScript | JavaScript (JSX) | Convert all .tsx to .jsx, use JSDoc for types |
| **Architecture** | SPA Component Library | Islands Architecture | Create standalone page with full entry point |
| **State Pattern** | useReducer hooks | Hollow components | Extract all logic to `useXxxPageLogic` hook |
| **API Calls** | Direct Supabase client | Edge Functions | Route through `callEdgeFunction()` |
| **Database** | New schema assumed | Existing tables | Extend existing tables, add blocked_time_slots |
| **Auth** | Anonymous Supabase key | Full Supabase Auth + admin role | Add admin role check in handlers |
| **Toast** | Not implemented | `toastService` | Use existing toast system |
| **Modals** | Component-local state | Centralized in logic hook | Manage all modal state in hook |
| **External APIs** | Placeholder functions | Production integrations | Implement Google Calendar, Zoom APIs |
| **Error Handling** | Try-catch returns | Fail fast + Slack logging | Use `reportErrorLog()` pattern |
| **Bubble Sync** | Not present | Queue-based sync | Add `enqueueBubbleSync()` calls |

---

## Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Add route to `routes.config.js`
- [ ] Create `manage-virtual-meetings.html`
- [ ] Create `manage-virtual-meetings.jsx` entry point
- [ ] Run `bun run generate-routes`
- [ ] Create page directory structure

### Phase 2: Frontend Components (Days 2-3)
- [ ] Create `ManageVirtualMeetingsPage.jsx` (hollow component)
- [ ] Create `useManageVirtualMeetingsPageLogic.js`
- [ ] Migrate `SearchFilters` component
- [ ] Migrate `MeetingCard` and `ConfirmedMeetingCard`
- [ ] Migrate `NewRequestsSection` and `ConfirmedMeetingsSection`
- [ ] Migrate `AvailabilityCalendar`
- [ ] Migrate `TimeZoneComparison`
- [ ] Migrate modal components

### Phase 3: Business Logic (Day 3)
- [ ] Create `virtualMeetingAdminRules.js`
- [ ] Create `calculateAvailableSlots.js`
- [ ] Create `formatMeetingData.js` processor
- [ ] Add tests for pure functions

### Phase 4: Edge Functions (Days 4-5)
- [ ] Add admin actions to `virtual-meeting/index.ts`
- [ ] Implement `handleAdminFetchNewRequests`
- [ ] Implement `handleAdminFetchConfirmed`
- [ ] Implement `handleAdminConfirmMeeting`
- [ ] Implement `handleAdminUpdateMeetingDates`
- [ ] Implement `handleAdminDeleteMeeting`
- [ ] Implement blocked slots handlers
- [ ] Add admin role verification

### Phase 5: Database (Day 5)
- [ ] Create migration for `blocked_time_slots` table
- [ ] Add missing columns to `virtualmeetingschedulesandlinks`
- [ ] Create RLS policies
- [ ] Test with existing data

### Phase 6: Integration (Day 6)
- [ ] Implement Google Calendar integration
- [ ] Implement Zoom/Meet link generation
- [ ] Add Slack notifications
- [ ] Test full workflow end-to-end

### Phase 7: Polish (Day 7)
- [ ] Migrate and adapt CSS
- [ ] Add loading states
- [ ] Add error states
- [ ] Responsive testing
- [ ] Cross-browser testing

---

## External Integration Requirements

### Google Calendar API

**Required Scopes:**
- `https://www.googleapis.com/auth/calendar.events`

**Setup Required:**
1. Google Cloud Console project
2. OAuth 2.0 credentials
3. Service account for server-to-server auth
4. Environment variables in Edge Functions

### Zoom API (Optional - for link generation)

**Required Scopes:**
- `meeting:write`

**Alternative:** Use Google Meet links via Calendar API

### Slack Integration

**Existing:** Already implemented in `_shared/slack.ts`
**Action:** Use existing `reportToSlack()` for notifications

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type conversion errors (TS→JS) | Medium | Medium | Add comprehensive JSDoc, test thoroughly |
| State management complexity | Medium | High | Follow hollow pattern strictly, unit test logic hook |
| External API rate limits | Low | Medium | Implement retry logic, queue long-running ops |
| Admin role not in existing auth | Medium | High | Verify auth schema supports roles, add if needed |
| Bubble sync race conditions | Low | High | Use existing queue pattern, add idempotency |

---

## File References

### Source Repository
- Main component: `src/components/ManageVirtualMeetings/ManageVirtualMeetings.tsx`
- State hooks: `src/hooks/useVirtualMeetings.ts`, `src/hooks/useBlockedSlots.ts`
- API layer: `src/api/virtualMeetings.ts`, `src/api/backendWorkflows.ts`
- Types: `src/types/virtualMeeting.ts`
- Utils: `src/utils/timezone.ts`

### Target Codebase
- Route config: [routes.config.js](../../app/src/routes.config.js)
- Existing VM function: [virtual-meeting/index.ts](../../supabase/functions/virtual-meeting/index.ts)
- Existing VM rules: [virtualMeetingRules.js](../../app/src/logic/rules/proposals/virtualMeetingRules.js)
- Existing VM modal: [VirtualMeetingModal.jsx](../../app/src/islands/modals/VirtualMeetingModal.jsx)
- Toast service: [toastService.js](../../app/src/lib/toastService.js)
- API helper: [api.js](../../app/src/lib/api.js)
- Supabase client: [supabase.js](../../app/src/lib/supabase.js)
- Shared Edge utils: [_shared/](../../supabase/functions/_shared/)

---

**Next Steps:** Review this plan and approve for execution, or request modifications.
