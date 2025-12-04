# Proposals Processors Context (Rich)

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Comprehensive proposal processing with nested data transformation
[LAYER]: Layer 3 - Processors (full data transformation suite)
[PATTERN]: Transform Bubble.io data with nested listing, host, and meeting data
[NOTE]: More comprehensive than proposal/ - includes nested entity processing

---

## ### PROCESSOR_CONTRACTS ###

### processProposalData
[PATH]: ./processProposalData.js
[INTENT]: Transform complete proposal with nested entities
[SIGNATURE]: (rawProposal: object) => ProcessedProposal
[INPUT]: rawProposal: object (req) - Raw proposal from Supabase with nested data
[OUTPUT]: Fully processed proposal with transformed listing, host, virtualMeeting
[THROWS]:
  - Error when rawProposal is null/undefined
  - Error when _id is missing
[INCLUDES]: Nested calls to processListingData, processHostData, processVirtualMeetingData

---

### processUserData
[PATH]: ./processProposalData.js
[INTENT]: Transform raw user data from Bubble format
[SIGNATURE]: (rawUser: object) => ProcessedUser
[INPUT]: rawUser: object (req) - Raw user from Supabase
[OUTPUT]: { id, firstName, lastName, fullName, profilePhoto, bio, linkedInVerified, phoneVerified, userVerified, proposalsList }
[THROWS]: Error when rawUser null or missing _id

---

### processListingData
[PATH]: ./processProposalData.js
[INTENT]: Transform raw listing data from Bubble format
[SIGNATURE]: (rawListing: object) => ProcessedListing | null
[INPUT]: rawListing: object (opt) - Raw listing from Supabase
[OUTPUT]: Processed listing or null if missing
[HANDLES]: JSONB address extraction, photo arrays

---

### processHostData
[PATH]: ./processProposalData.js
[INTENT]: Transform raw host data from Bubble format
[SIGNATURE]: (rawHost: object) => ProcessedHost | null
[INPUT]: rawHost: object (opt) - Raw host from Supabase
[OUTPUT]: Processed host or null if missing

---

### processVirtualMeetingData
[PATH]: ./processProposalData.js
[INTENT]: Transform virtual meeting data
[SIGNATURE]: (rawVirtualMeeting: object) => ProcessedVirtualMeeting | null
[INPUT]: rawVirtualMeeting: object (opt) - Raw meeting from Supabase
[OUTPUT]: { id, bookedDate, confirmedBySplitlease, meetingLink, meetingDeclined, requestedBy, suggestedTimeslots, ... }

---

### getProposalDisplayText
[PATH]: ./processProposalData.js
[INTENT]: Generate dropdown display text for proposal
[SIGNATURE]: (proposal: ProcessedProposal) => string
[OUTPUT]: "{host name} - {listing name}"
[EXAMPLE]: "John - Cozy Brooklyn Studio"

---

### formatPrice
[PATH]: ./processProposalData.js
[INTENT]: Format price for display
[SIGNATURE]: (price: number, includeCents?: boolean) => string | null
[OUTPUT]: "$1,234.00" or "$1,234"

---

### formatDate
[PATH]: ./processProposalData.js
[INTENT]: Format date for display
[SIGNATURE]: (date: string|Date) => string | null
[OUTPUT]: "Nov 15, 2025"

---

### formatDateTime
[PATH]: ./processProposalData.js
[INTENT]: Format datetime for display
[SIGNATURE]: (datetime: string|Date) => string | null
[OUTPUT]: "Friday, November 15, 2025, 3:00 PM EST"

---

### getEffectiveTerms
[PATH]: ./processProposalData.js
[INTENT]: Get current terms (original or counteroffer)
[SIGNATURE]: (proposal: ProcessedProposal) => EffectiveTerms
[OUTPUT]: Terms object with isCounteroffer flag
[THROWS]: Error when proposal is null

---

## ### COUNTEROFFER_FIELDS ###

| Original Field | Counteroffer Field |
|----------------|-------------------|
| daysSelected | hcDaysSelected |
| reservationWeeks | hcReservationWeeks |
| nightsPerWeek | hcNightsPerWeek |
| checkInDay | hcCheckInDay |
| checkOutDay | hcCheckOutDay |
| totalPrice | hcTotalPrice |
| nightlyPrice | hcNightlyPrice |
| cleaningFee | hcCleaningFee |
| damageDeposit | hcDamageDeposit |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Use getEffectiveTerms() to get current active terms
[RULE_2]: Check counterOfferHappened before showing compare UI
[RULE_3]: Nested entities (listing, host) may be null - check before use
[RULE_4]: formatPrice/formatDate return null for invalid input - handle in UI

---

## ### COMMON_PATTERNS ###

### Guest Proposals Page
```javascript
import {
  processProposalData,
  getEffectiveTerms,
  formatPrice,
  formatDate
} from 'logic/processors/proposals/processProposalData'

const processed = processProposalData(rawProposal)
const terms = getEffectiveTerms(processed)

return (
  <ProposalCard
    hostName={processed.host?.firstName || 'Host'}
    listingName={processed.listing?.name}
    totalPrice={formatPrice(terms.totalPrice)}
    checkInDate={formatDate(processed.moveInStart)}
    hasCounteroffer={terms.isCounteroffer}
  />
)
```

---

## ### DEPENDENCIES ###

[LOCAL]: None (self-contained)
[EXTERNAL]: None
[EXPORTS]: processProposalData, processUserData, processListingData, processHostData, processVirtualMeetingData, getProposalDisplayText, formatPrice, formatDate, formatDateTime, getEffectiveTerms

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Required fields throw, optional return null
[PURE]: No side effects
[NESTED_PROCESSING]: Automatically processes nested entities

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 10
