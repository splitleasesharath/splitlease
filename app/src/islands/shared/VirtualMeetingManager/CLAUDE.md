# VirtualMeetingManager Component

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Full-featured virtual meeting management popup with 4 distinct views
[PATTERN]: Multi-view modal with state machine architecture
[STYLING]: Regular CSS with BEM-like naming (vm-* prefix)

---

## ### COMPONENT_CONTRACTS ###

### VirtualMeetingManager (Main)
[PATH]: ./VirtualMeetingManager.jsx
[INTENT]: Orchestrates 4 virtual meeting workflow views
[PROPS]:
  - proposal: object (req) - Proposal with virtualMeeting, host, guest, listing
  - initialView: string (opt) - 'respond' | 'request' | 'cancel' | 'details' | ''
  - currentUser: object (req) - Current user with _id, typeUserSignup
  - onClose: () => void (req) - Modal close handler
  - onSuccess: () => void (opt) - Success callback for parent refresh
[BEHAVIOR]: Modal with backdrop click to close, global error/success messages

### RespondToVMRequest
[PATH]: ./RespondToVMRequest.jsx
[INTENT]: Respond to meeting request by selecting proposed time or declining
[PROPS]:
  - proposal: object (req) - Proposal with availableTimes array
  - onConfirm: (Date) => Promise<void> (req) - Confirm time slot
  - onDecline: () => Promise<void> (req) - Decline meeting
  - onSuggestAlt: () => void (req) - Navigate to suggest alternatives
[BEHAVIOR]: Radio selection with inline confirmation, decline/suggest buttons

### BookVirtualMeeting
[PATH]: ./BookVirtualMeeting.jsx
[INTENT]: Request new meeting or suggest 3 alternative time slots
[PROPS]:
  - proposal: object (req) - Proposal context
  - isSuggesting: boolean (req) - Whether suggesting alternatives
  - onSubmit: (Date[], boolean) => Promise<void> (req) - Submit handler
  - onBack: () => void (req) - Return to previous view
  - currentUser: object (req) - For determining other participant
[BEHAVIOR]: Requires exactly 3 time slots, uses BookTimeSlot calendar

### CancelVirtualMeetings
[PATH]: ./CancelVirtualMeetings.jsx
[INTENT]: Confirmation dialog for canceling existing meeting
[PROPS]:
  - meeting: object (req) - Virtual meeting with bookedDate, googleMeetLink
  - participantName: string (req) - Name of other participant
  - listingName: string (req) - Listing name for display
  - onCancel: () => Promise<void> (req) - Cancel handler
  - onClose: () => void (req) - Dismiss dialog
[BEHAVIOR]: Shows meeting details, warning message, Yes/No buttons

### DetailsOfProposalAndVM
[PATH]: ./DetailsOfProposalAndVM.jsx
[INTENT]: Display confirmed meeting details with Google Calendar integration
[PROPS]:
  - proposal: object (req) - Proposal with guest, listing info
  - meeting: object (req) - Virtual meeting with bookedDate, googleMeetLink
  - onClose: () => void (req) - Close handler
[BEHAVIOR]: Profile photo, booked date display, calendar add button, Meet link

### BookTimeSlot
[PATH]: ./BookTimeSlot.jsx
[INTENT]: Calendar-based time slot picker with EST timezone
[PROPS]:
  - initialStartTime: number (opt) - Start hour (default: 8)
  - initialEndTime: number (opt) - End hour (default: 20)
  - interval: number (opt) - Minutes between slots (default: 30)
  - maxSelections: number (opt) - Max slots (default: 3)
  - onSelectionChange: (Date[]) => void (opt) - Selection callback
  - timezone: string (opt) - Timezone (default: 'America/New_York')
  - disabledDates: Date[] (opt) - Dates to disable
  - selectedSlots: Date[] (opt) - Pre-selected slots
[BEHAVIOR]: Month navigation, day selection, inline time slot picker

---

## ### VIEW_STATE_MACHINE ###

```
'' (hidden)
    ↓ (initialView prop)
'respond' ──────────────────→ 'request' (suggest alternatives)
    │                              │
    │ (confirm)                    │ (submit)
    ↓                              ↓
'details' ←──────────────────── onClose()
    │
    │ (close)
    ↓
onClose()

'cancel' ──────────────────────→ onClose()
```

---

## ### SERVICE_LAYER ###

### virtualMeetingService.js
[INTENT]: API calls via Supabase Edge Function proxy
[METHODS]:
  - acceptMeeting(proposalId, bookedDate, userId) → Promise
  - createRequest(proposalId, slots, userId, isAlt, timezone) → Promise
  - declineMeeting(proposalId) → Promise
  - cancelMeeting(meetingId, proposalId) → Promise
  - sendGoogleCalendar(proposalId, userId) → Promise
  - notifyParticipants(hostId, guestId, vmId) → Promise
[PATTERN]: Returns { status: 'success' | 'error', data?, message? }

### dateUtils.js
[INTENT]: EST timezone handling and date formatting
[EXPORTS]:
  - toEST(date) / toUTC(date) - Timezone conversion
  - formatTimeEST(date, format?) - Format with (EST) suffix
  - generateTimeSlots(date, start, end, interval) - Time slot array
  - generateCalendarDays(month) - Calendar grid generation
  - generateGoogleCalendarUrl(meeting, proposal) - Calendar URL
  - isPastDate(date) / isSameDateTime(d1, d2) - Date comparisons

---

## ### BUBBLE_WORKFLOWS_REFERENCED ###

| Workflow | Description |
|----------|-------------|
| `accept-virtual-meeting` | Accept meeting request (backend handles all logic) |
| `CORE-create-virtual-meeting` | Create new VM request with time slots |
| `decline-virtual-meeting` | Decline meeting request |
| `cancel-virtual-meeting` | Cancel existing meeting |
| `l3-trigger-send-google-calend` | Send Google Calendar invite via Zapier |
| `notify-virtual-meeting-partici` | SMS/Email notifications |

---

## ### USAGE_EXAMPLE ###

```jsx
import { VirtualMeetingManager } from '../shared/VirtualMeetingManager';

function ProposalPage({ proposal, currentUser }) {
  const [showVM, setShowVM] = useState(false);
  const [vmView, setVmView] = useState('');

  const openRespondView = () => {
    setVmView('respond');
    setShowVM(true);
  };

  const openRequestView = () => {
    setVmView('request');
    setShowVM(true);
  };

  return (
    <>
      <button onClick={openRespondView}>Respond to Meeting</button>
      <button onClick={openRequestView}>Request Meeting</button>

      {showVM && (
        <VirtualMeetingManager
          proposal={proposal}
          initialView={vmView}
          currentUser={currentUser}
          onClose={() => setShowVM(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </>
  );
}
```

---

## ### CSS_CLASSES ###

All classes prefixed with `vm-` to avoid conflicts:
- `.vm-overlay` - Modal backdrop
- `.vm-container` - Modal content box
- `.vm-header` - Header with title and close
- `.vm-button-*` - Button variants (primary, decline, danger, outline, success)
- `.vm-error` / `.vm-success` - Message banners
- `.vm-time-slot-*` - Time slot selection styles
- `.vm-calendar-*` - Calendar component styles

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always provide currentUser with _id and typeUserSignup
[RULE_2]: proposal must have _id (or id) for API calls
[RULE_3]: virtualMeeting field can be virtualMeeting, 'virtual meeting', or virtual_meeting
[RULE_4]: All times displayed in EST timezone
[RULE_5]: Exactly 3 time slots required for request/suggest views
[RULE_6]: Parent controls visibility via initialView prop ('' hides component)

---

## ### DEPENDENCIES ###

[LOCAL]: lib/supabase.js
[EXTERNAL]: date-fns, date-fns-tz
[EDGE_FUNCTIONS]: bubble-proxy (for Bubble workflow calls)

---

## ### FILE_MANIFEST ###

| File | Lines | Purpose |
|------|-------|---------|
| VirtualMeetingManager.jsx | ~200 | Main orchestration component |
| RespondToVMRequest.jsx | ~130 | Respond view |
| BookVirtualMeeting.jsx | ~90 | Request/suggest view |
| CancelVirtualMeetings.jsx | ~100 | Cancel confirmation |
| DetailsOfProposalAndVM.jsx | ~130 | Meeting details view |
| BookTimeSlot.jsx | ~160 | Calendar/time picker |
| virtualMeetingService.js | ~150 | API service layer |
| dateUtils.js | ~180 | Date utilities |
| VirtualMeetingManager.css | ~350 | Main styles |
| BookTimeSlot.css | ~250 | Calendar styles |
| index.js | ~20 | Exports |
| CLAUDE.md | (this file) | Documentation |

---

**FILE_COUNT**: 12
**TOTAL_LINES**: ~1760
