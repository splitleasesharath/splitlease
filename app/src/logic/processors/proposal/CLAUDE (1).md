# Proposal Processor Context

**TYPE**: LEAF NODE
**PARENT**: app/src/logic/processors/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Transform raw Supabase proposal data with counteroffer merging
[LAYER]: Layer 3 - Processors (data transformation with computed fields)
[PATTERN]: Merge original and counteroffer terms into unified proposal object

---

## ### PROCESSOR_CONTRACTS ###

### processProposalData
[PATH]: ./processProposalData.js
[INTENT]: Convert raw proposal to clean object with merged terms
[SIGNATURE]: ({ rawProposal: object, listing?: object, guest?: object, host?: object }) => ProcessedProposal
[INPUT]:
  - rawProposal: object (req) - Raw proposal from Supabase
  - listing: object (opt) - Pre-processed listing data
  - guest: object (opt) - Pre-processed guest user data
  - host: object (opt) - Pre-processed host user data
[OUTPUT]: Clean proposal object with currentTerms and originalTerms
[THROWS]:
  - Error when rawProposal is null/undefined
  - Error when _id field is missing
  - Error when Listing reference is missing
  - Error when Guest reference is missing

---

## ### OUTPUT_SHAPE ###

```javascript
{
  // Identity
  id: string,
  listingId: string,
  guestId: string,

  // Status and workflow
  status: string,           // 'Host Countered', 'Draft', etc.
  deleted: boolean,
  usualOrder: number | null,

  // Current terms (merged from original or counteroffer)
  currentTerms: {
    moveInDate: string,
    daysOfWeek: number[],    // Bubble format (1-7)
    weeks: number,
    totalRent: number,
    cleaningFee: number,
    securityDeposit: number,
    houseRules: array,
    moveOutDate: string
  },

  // Original terms (for Compare Terms modal)
  originalTerms: { ... same shape ... },
  hasCounteroffer: boolean,

  // Additional details
  virtualMeetingId: string | null,
  houseManualAccessed: boolean,
  cancellationReason: string | null,

  // Timestamps
  createdDate: string,
  modifiedDate: string,

  // Enriched data (if provided)
  _listing: object | null,
  _guest: object | null,
  _host: object | null
}
```

---

## ### COUNTEROFFER_LOGIC ###

[DETECTION]: status === 'Host Countered'
[MERGE_RULE]: If hasHostCounteroffer AND hc_field exists, use hc_field; else use original
[FIELDS_MERGED]:
  - Move-In Date → hc Move-In Date
  - Days of Week → hc Days of Week
  - Weeks → hc Weeks
  - Total Rent → hc Total Rent
  - Cleaning Fee → hc Cleaning Fee
  - Security Deposit → hc Security Deposit
  - House Rules → hc House Rules
  - Move-Out Date → hc Move-Out Date

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Always use currentTerms for display (auto-merges counteroffer)
[RULE_2]: Use originalTerms only in "Compare Terms" modal
[RULE_3]: Check hasCounteroffer to show counteroffer indicators in UI
[RULE_4]: Days in currentTerms are Bubble format (1-7) - convert for UI

---

## ### COMMON_PATTERNS ###

### Loading Proposal for Display
```javascript
import { processProposalData } from 'logic/processors/proposal/processProposalData'
import { adaptDaysFromBubble } from 'logic/processors/external/adaptDaysFromBubble'

const rawProposal = await fetchProposalFromSupabase(proposalId)
const processed = processProposalData({ rawProposal })

// Convert days for UI display
const displayDays = adaptDaysFromBubble({
  bubbleDays: processed.currentTerms.daysOfWeek
})
```

---

## ### DEPENDENCIES ###

[LOCAL]: None
[EXTERNAL]: None (day conversion done by caller)
[EXPORTS]: processProposalData

---

## ### SHARED_CONVENTIONS ###

[NO_FALLBACK]: Throws for missing critical fields
[PURE]: No side effects, deterministic output
[COUNTEROFFER_MERGE]: Automatic merging of host-changed fields

---

**FILE_COUNT**: 1
**EXPORTS_COUNT**: 1
