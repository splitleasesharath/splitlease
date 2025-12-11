# VirtualMeetingManager - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Virtual meeting management system with 4-view modal workflow
**PARENT**: app/src/islands/shared/

---

## QUICK_STATS

[TOTAL_FILES]: 12
[PRIMARY_LANGUAGE]: JavaScript/JSX
[KEY_PATTERNS]: Multi-view modal, State machine, EST timezone handling, Edge Function proxy
[ARCHITECTURE_TYPE]: Leaf node component
[STYLING_APPROACH]: Regular CSS with vm-* prefix namespace

---

## FILES

### VirtualMeetingManager.jsx
[INTENT]: Orchestrate 4 virtual meeting workflow views with modal overlay and state management
[EXPORTS]: default VirtualMeetingManager
[DEPENDS_ON]: virtualMeetingService, RespondToVMRequest, BookVirtualMeeting, CancelVirtualMeetings, DetailsOfProposalAndVM
[PROPS_REQUIRED]: proposal (object), currentUser (object with _id/typeUserSignup), onClose (function)
[PROPS_OPTIONAL]: initialView (string: 'respond'|'request'|'cancel'|'details'|''), onSuccess (function)
[STATE_MACHINE]: Empty string hides modal, initialView prop controls starting view
[BEHAVIOR]: Backdrop click closes modal, 5-second auto-dismiss for error/success messages
[KEY_HANDLERS]: handleConfirmTime, handleDecline, handleSuggestAlternatives, handleSubmitRequest, handleCancelMeeting
[VIEW_TRANSITIONS]: respond → request (suggest alternatives), respond → details (confirm), request → respond (back)

### RespondToVMRequest.jsx
[INTENT]: Allow user to select from proposed meeting times or decline/suggest alternatives
[EXPORTS]: default RespondToVMRequest
[DEPENDS_ON]: dateUtils (formatTimeEST)
[PROPS_REQUIRED]: proposal (object with availableTimes array), onConfirm (function), onDecline (function), onSuggestAlt (function)
[UI_PATTERN]: Radio button time slot selection with inline confirmation dialog
[BEHAVIOR]: Parse availableTimes (Date objects or strings), show confirmation before confirming selection
[KEY_SECTIONS]: Time slot selection radio list, alternative times prompt with Decline/Suggest buttons, inline confirmation

### BookVirtualMeeting.jsx
[INTENT]: Request new meeting or suggest 3 alternative time slots using calendar picker
[EXPORTS]: default BookVirtualMeeting
[DEPENDS_ON]: BookTimeSlot
[PROPS_REQUIRED]: proposal (object), isSuggesting (boolean), onSubmit (function), onBack (function), currentUser (object)
[VALIDATION]: Requires exactly 3 time slots before submission
[BEHAVIOR]: Shows back button when suggesting alternatives, determines participant name based on currentUser type
[KEY_LOGIC]: getOtherParticipantName() determines display name based on isSuggesting flag and user type

### CancelVirtualMeetings.jsx
[INTENT]: Confirmation dialog for canceling existing virtual meeting
[EXPORTS]: default CancelVirtualMeetings
[DEPENDS_ON]: dateUtils (formatTimeEST)
[PROPS_REQUIRED]: meeting (object with bookedDate), participantName (string), listingName (string), onCancel (function), onClose (function)
[FIELD_VARIANTS]: Handles bookedDate/booked date/booked_date, googleMeetLink/meeting link/meetingLink
[UI_PATTERN]: Warning card with meeting details and Yes/No action buttons
[BEHAVIOR]: Displays meeting info card with formatted date, listing name, participant name, optional meeting link

### DetailsOfProposalAndVM.jsx
[INTENT]: Display confirmed meeting details with Google Calendar integration
[EXPORTS]: default DetailsOfProposalAndVM
[DEPENDS_ON]: dateUtils (formatTimeEST, generateGoogleCalendarUrl)
[PROPS_REQUIRED]: proposal (object with guest/listing), meeting (object with bookedDate/googleMeetLink), onClose (function)
[FEATURES]: Guest profile photo display, formatted booked date, Add to Calendar button, Google Meet link
[FIELD_VARIANTS]: Handles multiple field name variations (firstName/name, profilePhoto/profile photo, nights/Nights, reservationSpan/reservation span)
[UI_SECTIONS]: Header with close button, profile photo, booked date display, details list, calendar button, meeting link

### BookTimeSlot.jsx
[INTENT]: Calendar-based time slot picker with EST timezone support
[EXPORTS]: default BookTimeSlot
[DEPENDS_ON]: dateUtils (generateTimeSlots, generateCalendarDays, formatTimeEST, isPastDate, isSameDateTime, isSameDate, getPreviousMonth, getNextMonth, getMonthNames, getDayNames)
[PROPS_OPTIONAL]: initialStartTime (number, default: 8), initialEndTime (number, default: 20), interval (number, default: 30), maxSelections (number, default: 3), onSelectionChange (function), timezone (string, default: 'America/New_York'), disabledDates (Date[]), selectedSlots (Date[])
[BEHAVIOR]: Month navigation with dropdown, day selection opens inline time picker, toggle selection up to maxSelections
[STATE]: timesSelected, selectedDate, showTimePicker, availableTimeSlots, currentMonth
[KEY_FEATURES]: Calendar grid with day buttons, inline time slot picker for selected date, selected slots display with remove buttons, clear all button
[DISABLED_LOGIC]: Past dates disabled, dates with max selections reached disabled (unless already has selected slots)
[CSS_CLASSES]: vm-date-button-active (currently viewing), vm-date-button-has-slots (has selected times)

### virtualMeetingService.js
[INTENT]: API service layer proxying Bubble workflows via Supabase Edge Functions
[EXPORTS]: default virtualMeetingService (object), named functions
[DEPENDS_ON]: lib/supabase, dateUtils (toISOString)
[EDGE_FUNCTION]: bubble-proxy
[API_FUNCTIONS]: acceptVirtualMeeting, createVirtualMeetingRequest, declineVirtualMeeting, cancelVirtualMeeting, sendGoogleCalendarInvite, notifyVirtualMeetingParticipants, updateVirtualMeetingDirect, retryApiCall
[RESPONSE_FORMAT]: {status: 'success'|'error', data?: any, message?: string}
[PROXY_PATTERN]: All Bubble workflow calls go through proxyRequest() helper
[ERROR_HANDLING]: Try-catch with console.error logging, returns standardized error response
[RETRY_LOGIC]: retryApiCall() wrapper with exponential backoff
[DIRECT_UPDATE]: updateVirtualMeetingDirect() bypasses Bubble for simple Supabase updates

### dateUtils.js
[INTENT]: Date manipulation, timezone conversion, and formatting utilities for EST timezone
[EXPORTS]: Named functions and constants
[DEPENDS_ON]: date-fns, date-fns-tz
[TIMEZONE]: America/New_York (EST)
[KEY_FUNCTIONS]: toEST, toUTC, formatTimeEST, generateTimeSlots, generateCalendarDays, getPreviousMonth, getNextMonth, isPastDate, isSameDate, isSameDateTime, toISOString, generateGoogleCalendarUrl, getMonthNames, getDayNames
[FORMATTING]: formatTimeEST adds (EST) suffix, default format: 'MMM d, yyyy h:mm a'
[TIME_SLOTS]: generateTimeSlots() creates array of Date objects for given range with interval
[CALENDAR_GRID]: generateCalendarDays() returns array with null for empty cells before month start
[GOOGLE_CALENDAR]: generateGoogleCalendarUrl() creates calendar.google.com URL with 1-hour default duration

### index.js
[INTENT]: Barrel export file for VirtualMeetingManager module
[EXPORTS]: All components (VirtualMeetingManager, RespondToVMRequest, BookVirtualMeeting, CancelVirtualMeetings, DetailsOfProposalAndVM, BookTimeSlot), virtualMeetingService, all dateUtils functions
[PATTERN]: Default export is VirtualMeetingManager, all other exports are named

### VirtualMeetingManager.css
[INTENT]: Main stylesheet for all VirtualMeetingManager components
[NAMESPACE]: vm-* prefix to avoid conflicts
[KEY_CLASSES]: vm-overlay (modal backdrop), vm-container (modal box), vm-header (header with title/close), vm-button-* (button variants), vm-error/vm-success (message banners), vm-time-slot-* (time slot selection), vm-calendar-* (calendar grid)
[BUTTON_VARIANTS]: vm-button-primary, vm-button-decline, vm-button-danger, vm-button-outline, vm-button-success
[ESTIMATED_LINES]: ~350

### BookTimeSlot.css
[INTENT]: Stylesheet specifically for BookTimeSlot calendar component
[NAMESPACE]: vm-* prefix
[KEY_CLASSES]: vm-calendar-grid, vm-date-button, vm-date-button-active, vm-date-button-has-slots, vm-time-slot-button, vm-time-slot-selected
[ESTIMATED_LINES]: ~250

### CLAUDE.md
[INTENT]: LLM-optimized documentation for the VirtualMeetingManager module
[FORMAT]: Structured reference with [KEY]: value pattern for semantic searchability

---

## VIEW_STATE_MACHINE

```
'' (hidden/unmounted)
    ↓ (initialView prop)
┌─────────────────────────────────────────────┐
│ 'respond' ──(suggest alt)──→ 'request'      │
│     │                              │         │
│     │ (confirm time)               │ (submit)│
│     ↓                              ↓         │
│ 'details'                       onClose()    │
│     │                                        │
│     │ (close)                                │
│     ↓                                        │
│ onClose()                                    │
│                                              │
│ 'cancel' ────(confirm/cancel)───→ onClose() │
└─────────────────────────────────────────────┘
```

[STATE_CONTROL]: Parent controls visibility via initialView prop (empty string hides modal)
[VIEW_NAVIGATION]: Internal state transitions handled by VirtualMeetingManager component

---

## BUBBLE_WORKFLOWS

[WORKFLOW]: accept-virtual-meeting
[ENDPOINT]: /wf/accept-virtual-meeting
[PARAMS]: proposal (string), booked_date_sel (ISO string), user_accepting (string)
[DESCRIPTION]: Accept meeting request and set booked date

[WORKFLOW]: CORE-create-virtual-meeting
[ENDPOINT]: /wf/CORE-create-virtual-meeting
[PARAMS]: proposal (string), times_selected (ISO string[]), requested_by (string), is_alternative_times (boolean), timezone_string (string)
[DESCRIPTION]: Create new virtual meeting request with 3 proposed time slots

[WORKFLOW]: decline-virtual-meeting
[ENDPOINT]: /wf/decline-virtual-meeting
[PARAMS]: proposal (string)
[DESCRIPTION]: Decline meeting request

[WORKFLOW]: cancel-virtual-meeting
[ENDPOINT]: /wf/cancel-virtual-meeting
[PARAMS]: meeting_id (string), proposal (string)
[DESCRIPTION]: Cancel existing scheduled meeting

[WORKFLOW]: l3-trigger-send-google-calend
[ENDPOINT]: /wf/l3-trigger-send-google-calend
[PARAMS]: proposal (string), user (string)
[DESCRIPTION]: Send Google Calendar invite via Zapier integration

[WORKFLOW]: notify-virtual-meeting-partici
[ENDPOINT]: /wf/notify-virtual-meeting-partici
[PARAMS]: host (string), guest (string), virtual_meeting (string)
[DESCRIPTION]: Send SMS/Email notifications to participants

---

## USAGE_PATTERN

```jsx
import { VirtualMeetingManager } from 'islands/shared/VirtualMeetingManager';

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

  const openDetailsView = () => {
    setVmView('details');
    setShowVM(true);
  };

  const openCancelView = () => {
    setVmView('cancel');
    setShowVM(true);
  };

  return (
    <>
      <button onClick={openRespondView}>Respond to Meeting Request</button>
      <button onClick={openRequestView}>Request Virtual Meeting</button>
      <button onClick={openDetailsView}>View Meeting Details</button>
      <button onClick={openCancelView}>Cancel Meeting</button>

      {showVM && (
        <VirtualMeetingManager
          proposal={proposal}
          initialView={vmView}
          currentUser={currentUser}
          onClose={() => setShowVM(false)}
          onSuccess={() => {
            // Refresh data after successful operation
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
```

---

## CRITICAL_RULES

[RULE_1]: currentUser MUST have _id (or id) and typeUserSignup (or type_user_signup) fields
[RULE_2]: proposal MUST have _id (or id) for API calls
[RULE_3]: virtualMeeting field can be virtualMeeting, 'virtual meeting', or virtual_meeting (handle all variants)
[RULE_4]: ALL times displayed in EST timezone with (EST) suffix
[RULE_5]: Exactly 3 time slots REQUIRED for request/suggest views
[RULE_6]: Parent controls visibility via initialView prop (empty string '' hides component entirely)
[RULE_7]: Handle field name variations throughout (camelCase, snake_case, 'space case', Pascal Case)
[RULE_8]: All Bubble API calls MUST go through Supabase Edge Function proxy (never direct)
[RULE_9]: Component returns null if initialView is empty string (unmounted state)
[RULE_10]: Success/error messages auto-dismiss after 5 seconds

---

## FIELD_NAME_VARIANTS

[VIRTUAL_MEETING]: virtualMeeting | 'virtual meeting' | virtual_meeting
[BOOKED_DATE]: bookedDate | 'booked date' | booked_date
[MEETING_LINK]: googleMeetLink | 'meeting link' | meetingLink
[USER_TYPE]: typeUserSignup | type_user_signup
[GUEST_NAME]: guest.firstName | guest.name | guest.['firstName']
[HOST_NAME]: host.name | host.firstName
[LISTING_NAME]: listing.name | _listing.name
[PROFILE_PHOTO]: guest.profilePhoto | guest.['profile photo']
[NIGHTS]: proposal.nights | proposal.Nights
[RESERVATION_SPAN]: proposal.reservationSpan | proposal['reservation span'] | proposal.reservationspan

---

## API_CALL_PATTERN

```javascript
import virtualMeetingService from './virtualMeetingService.js';

// All API calls return standardized response
const result = await virtualMeetingService.acceptMeeting(proposalId, bookedDate, userId);

if (result.status === 'success') {
  // Handle success
  console.log(result.data);
} else {
  // Handle error
  console.error(result.message);
}

// With retry logic
const resultWithRetry = await virtualMeetingService.retry(
  () => virtualMeetingService.acceptMeeting(proposalId, bookedDate, userId),
  3, // max retries
  1000 // delay in ms
);
```

---

## TIMEZONE_HANDLING

[TIMEZONE]: America/New_York (EST)
[DISPLAY_FORMAT]: All times shown with (EST) suffix
[CONVERSION]: toEST() converts UTC to EST, toUTC() converts EST to UTC
[API_FORMAT]: ISO string format for all API requests (toISOString())
[CALENDAR_GENERATION]: generateTimeSlots() creates slots in local time, assumes EST context
[GOOGLE_CALENDAR]: URL includes ctz=America/New_York parameter

---

## DEPENDENCIES

[LOCAL_IMPORTS]: ../../../lib/supabase.js
[EXTERNAL_PACKAGES]: date-fns, date-fns-tz, react
[EDGE_FUNCTIONS]: bubble-proxy (all Bubble workflow calls)
[SUPABASE_TABLE]: virtualmeetingschedulesandlinks (for direct updates)
[CSS_FILES]: ./VirtualMeetingManager.css, ./BookTimeSlot.css

---

## TESTING_CONSIDERATIONS

[NULL_SAFETY]: All field accessors handle null/undefined with optional chaining
[FIELD_VARIANTS]: Test all field name variations (camelCase, snake_case, 'space case')
[DATE_PARSING]: Handle both Date objects and ISO string dates in availableTimes
[TIMEZONE]: All operations assume EST, verify timezone conversions
[API_ERRORS]: Service layer returns standardized error responses, never throws
[STATE_TRANSITIONS]: Verify view state machine transitions work correctly
[LOADING_STATES]: All async operations have isLoading state to prevent duplicate submissions
[MAX_SELECTIONS]: BookTimeSlot enforces maxSelections limit (default: 3)

---

## COMPONENT_SIZE_ESTIMATES

| File | Lines | Type |
|------|-------|------|
| VirtualMeetingManager.jsx | ~265 | Component |
| RespondToVMRequest.jsx | ~177 | Component |
| BookVirtualMeeting.jsx | ~125 | Component |
| CancelVirtualMeetings.jsx | ~118 | Component |
| DetailsOfProposalAndVM.jsx | ~171 | Component |
| BookTimeSlot.jsx | ~305 | Component |
| virtualMeetingService.js | ~216 | Service |
| dateUtils.js | ~219 | Utils |
| VirtualMeetingManager.css | ~350 | Styles |
| BookTimeSlot.css | ~250 | Styles |
| index.js | ~23 | Exports |
| CLAUDE.md | (this file) | Documentation |

[TOTAL_LINES]: ~2219
[COMPONENT_COUNT]: 6
[UTILITY_COUNT]: 2
[STYLE_COUNT]: 2

---

**VERSION**: 2.0
**UPDATED**: 2025-12-11
**MAINTAINER**: Split Lease Development Team
