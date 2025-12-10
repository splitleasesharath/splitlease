# Proposal Table Schema & Dynamic UI Fields

## Overview
The `proposal` table in Supabase PostgreSQL contains 108 columns that manage the complete proposal lifecycle from initial guest submission through lease document finalization. This document catalogs all fields, identifies those driving dynamic UI behavior, and explains relationships to other tables.

---

## Core Identity & Relationships

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `_id` | text | NO | Primary key - Bubble.io record ID |
| `Guest` | text | YES | Foreign key to guest user |
| `Guest email` | text | NO | Guest contact email |
| `Host - Account` | text | YES | Foreign key to host user account |
| `host email` | text | YES | Host contact email |
| `Listing` | text | YES | Foreign key to listing being proposed |
| `Created By` | text | YES | User who created the proposal |
| `Created Date` | timestamp | NO | Proposal creation timestamp |
| `Modified Date` | timestamp | NO | Last modification timestamp |
| `created_at` | timestamp | YES | Supabase audit timestamp |
| `updated_at` | timestamp | YES | Supabase audit timestamp |

---

## Status Fields - Primary UI Driver

### Main Status Field
| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `Status` | text | NO | **PRIMARY STATUS** - Controls entire proposal state & UI flow |

### Possible Status Values
1. **Pending** - Initial state, awaiting submission
2. **Proposal Submitted by guest - Awaiting Rental Application** - Guest submitted proposal, rental app not completed
3. **Host Review** - Awaiting host review & decision
4. **Host Counteroffer Submitted / Awaiting Guest Review** - Host submitted counter offer
5. **Proposal Rejected by Host** - Host rejected the proposal
6. **Proposal or Counteroffer Accepted / Drafting Lease Documents** - Accepted, documents being prepared
7. **Lease Documents Sent for Review** - Documents sent to parties for review
8. **Lease Documents Sent for Signatures** - Documents ready for e-signatures
9. **Initial Payment Submitted / Lease activated** - Payment received, lease is active
10. **Proposal Cancelled by Guest** - Guest cancelled the proposal
11. **Proposal Cancelled by Split Lease** - Split Lease cancelled the proposal

### Supporting Status Indicators
| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `Is Finalized` | boolean | NO | Whether proposal is finalized & locked |
| `Deleted` | boolean | YES | Soft delete flag for UI filtering |

---

## Counter Offer Related Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `counter offer happened` | boolean | YES | Flag indicating if counter offer was issued |
| `Negotiation Summary` | jsonb | YES | History of negotiation details & changes |

### Context
- When `counter offer happened = true`, shows that host has made a counter offer
- Used to determine if guest needs to review host's counter terms
- `Negotiation Summary` tracks all negotiation rounds and changes

---

## Virtual Meeting Related Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `request virtual meeting` | text | YES | Who requested meeting: 'guest', 'host', or NULL |
| `virtual meeting` | text | YES | Virtual meeting record ID/reference |
| `virtual meeting confirmed ` | boolean | YES | Whether meeting has been confirmed |

### Context
- `request virtual meeting` indicates if guest/host wanted a virtual meeting
- Controls whether virtual meeting section displays in UI
- `virtual meeting confirmed` shows meeting readiness status

---

## Rental Application Related Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `rental app requested` | boolean | NO | Whether rental application was requested |
| `rental application` | text | YES | Foreign key to rental_application record |

### Context
- `rental app requested` gates whether guest must complete rental application
- When true, proposal cannot advance until application is submitted
- Links to separate rental application form/workflow

---

## Lease Document Related Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `Is Finalized` | boolean | NO | Documents finalized & lease ready |
| `guest documents review finalized?` | boolean | YES | Guest completed document review |
| `host documents review finalized?` | boolean | YES | Host completed document review |
| `Drafts List` | jsonb | YES | List of draft documents |
| `Draft Authorization Credit Card` | text | YES | Draft card auth document ID |
| `Draft Host Payout Schedule` | text | YES | Draft payout schedule document ID |
| `Draft Periodic Tenancy Agreement` | text | YES | Draft main lease document ID |
| `Draft Supplemental Agreement` | text | YES | Draft supplemental agreement ID |

### Context
- Controls visibility of document review sections
- Gates progression to signature stage
- Tracks which documents have been reviewed by each party
- `Drafts List` is parent structure containing all draft documents

---

## Payment Related Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `Total Price for Reservation (guest)` | numeric | NO | Total amount guest must pay |
| `Total Compensation (proposal - host)` | numeric | YES | Total amount host will receive |
| `4 week rent` | numeric | NO | Base rent for 4-week period |
| `4 week compensation` | numeric | YES | Host compensation for 4-week period |
| `cleaning fee` | numeric | YES | One-time cleaning/maintenance fee |
| `damage deposit` | numeric | YES | Security deposit amount |
| `proposal nightly price` | numeric | YES | Nightly rate for this proposal |
| `host compensation` | numeric | YES | Per-period host compensation |

### Context
- Payment amounts determine total cost presented to guest
- Used for financial summary displays
- Differ from listing prices when counter offers are made
- `hc_*` prefixed fields are "historical context" versions for tracking changes

---

## Date & Availability Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `Move in range start` | text | NO | Start of flexible move-in window |
| `Move in range end` | text | NO | End of flexible move-in window |
| `move-in range (text)` | text | YES | Human-readable move-in range |
| `End date` | timestamp | YES | Proposal end/checkout date |
| `check in day` | text | YES | Actual check-in day name |
| `check out day` | text | YES | Actual check-out day name |
| `Days Selected` | jsonb | YES | Selected days (0=Sun, 6=Sat) |
| `Days Available` | jsonb | YES | Available days from listing |
| `Nights Selected (Nights list)` | jsonb | YES | Selected nights for stay |
| `Complementary Nights` | jsonb | NO | Trial/complementary nights |
| `Complementary Days` | jsonb | YES | Trial/complementary days |
| `Reservation Span` | text | NO | Human-readable reservation period |
| `Reservation Span (Weeks)` | integer | NO | Duration in weeks |
| `list of dates (actual dates)` | jsonb | YES | Complete list of actual dates |
| `flexible move in?` | boolean | YES | Whether guest has flexible move-in |
| `duration in months` | numeric | YES | Duration expressed in months |
| `week selection` | text | YES | Week selection pattern/text |

### Context
- Controls date selection UI display
- Determines availability calendar constraints
- Tracks both requested and confirmed dates
- Used for lease document date generation

---

## House Rules & Location Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `House Rules` | jsonb | YES | Array of house rules for this proposal |
| `hc house rules` | jsonb | YES | Historical context version |
| `Location - Address` | jsonb | YES | Property address details |
| `Location - Address slightly different` | jsonb | YES | Alternate address if needed |

### Context
- Controls display of house rules section
- Fetched from listing or proposal custom rules
- Used in lease documents

---

## Guest Information Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `Guest flexibility` | text | YES | Flexibility description |
| `need for space` | text | YES | Why guest needs this space |
| `preferred gender` | text | YES | Preferred roommate gender |
| `about_yourself` | text | YES | Guest background/introduction |
| `special_needs` | text | YES | Any special requirements |
| `reason for cancellation` | text | YES | If proposal was cancelled, why |

### Context
- Used in UI displays for host to understand guest
- Helps with decision-making
- Visible in proposal details sections

---

## Workflow Management Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `Scheduled workflow expiration` | text | YES | Workflow ID for expiration scheduler |
| `Scheduled workflow expiration reminder` | text | YES | Workflow ID for reminder notification |
| `proposal update message` | text | YES | Custom message when proposal updated |
| `History` | jsonb | NO | Complete audit log of all changes |
| `viewed proposed proposal` | boolean | YES | Whether guest viewed counter offer |
| `remindersByGuest (number)` | integer | YES | Count of guest reminders sent |
| `reminderByHost` | integer | YES | Count of host reminders sent |

### Context
- Manages automated workflows & notifications
- `History` tracks all field changes for audit trail
- Used to prevent duplicate reminders

---

## Review & Approval Fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `reviewed by frederick` | boolean | YES | Internal review flag |
| `reviewed by igor` | boolean | YES | Internal review flag |
| `reviewed by robert` | boolean | YES | Internal review flag |

### Context
- Internal Split Lease team tracking
- Used for QA/approval workflows

---

## Pricing & Calculation Fields (Supplementary)

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `hc 4 week rent` | numeric | YES | Historical context 4-week rent |
| `hc 4 week compensation` | numeric | YES | Historical context compensation |
| `hc nightly price` | numeric | YES | Historical context nightly rate |
| `hc cleaning fee` | numeric | YES | Historical context cleaning fee |
| `hc damage deposit` | numeric | YES | Historical context damage deposit |
| `hc days selected` | jsonb | YES | Historical context days |
| `hc duration in months` | numeric | YES | Historical context duration |
| `hc host compensation (per period)` | numeric | YES | Historical context per-period comp |
| `hc move in date` | timestamp | YES | Historical context move-in |
| `hc nights per week` | numeric | YES | Historical context nights/week |
| `hc reservation span` | text | YES | Historical context span text |
| `hc reservation span (weeks)` | integer | YES | Historical context span weeks |
| `hc total host compensation` | numeric | YES | Historical context total comp |
| `hc total price` | numeric | YES | Historical context total price |
| `hc weeks schedule` | text | YES | Historical context schedule |
| `nights per week (num)` | numeric | NO | Nights per week pattern |
| `actual weeks during reservation span` | numeric | NO | Actual week count |
| `other weeks` | numeric | YES | Supplementary weeks |
| `Order Ranking` | integer | NO | Ranking/sorting order |
| `nightly price for map (text)` | text | YES | Display nightly price |
| `Comment` | text | YES | Internal comments |
| `rental type` | text | YES | Type of rental arrangement |
| `night after checkin night` | text | YES | Calculated night after check-in |
| `night before checkout night` | text | YES | Calculated night before check-out |

---

## Field Dependencies for Dynamic UI

### Status-Based UI Visibility

| Feature | Show When | Requires |
|---------|-----------|----------|
| **Rental Application Section** | Status = "Submitted by guest - Awaiting Rental Application" | `rental app requested = true` |
| **Counter Offer Section** | Status = "Host Counteroffer..." | `counter offer happened = true` |
| **Virtual Meeting Section** | `request virtual meeting IS NOT NULL` | Either guest or host requested |
| **Document Review Section** | Status = "Lease Documents Sent..." | `guest_documents_review OR host_documents_review` |
| **Payment Section** | Status = "Initial Payment Submitted..." | Lease activated |
| **House Rules Display** | Any status | `House Rules jsonb` present |
| **Cancellation Reason** | Status = "Proposal Cancelled..." | `reason for cancellation` populated |

### State Machine Progression

```
Pending
  ↓
Submitted (awaiting rental app) ← [rental_app_requested=true]
  ↓
Host Review ← [rental application completed]
  ├→ Rejected by Host
  └→ Counter Offer ← [counter_offer_happened=true]
      ↓
      Guest Review [viewed_proposed_proposal=false]
      ↓
      Accepted/Drafting Documents ← [counter_offer_happened accepted]
      ↓
      Documents Sent for Review ← [guest/host_documents_review_finalized? = false]
      ↓
      Documents Sent for Signature ← [guest/host_documents_review_finalized? = true]
      ↓
      Payment Submitted/Lease Activated ← [Is Finalized=true]

Alternative paths:
  → Cancelled by Guest [any status]
  → Cancelled by Split Lease [any status]
```

---

## Field Value Examples from Data

| Field | Example Values |
|-------|-----------------|
| `request virtual meeting` | 'guest', 'host', NULL |
| `Status` | "Host Review", "Proposal Cancelled by Guest", "Initial Payment Submitted / Lease activated" |
| `counter offer happened` | true, false, NULL |
| `rental app requested` | true, false |
| `Is Finalized` | true, false |
| `Days Selected` | `[1,2,3,4,5]` (0-6 indexing) |
| `Negotiation Summary` | JSONB with negotiation rounds |
| `History` | JSONB audit log of all changes |

---

## Related Tables

### Direct References (Foreign Keys)
- **rental_application** - Referenced by `rental application` field
- **virtual meeting** (co_hostrequest) - Referenced by `virtual meeting` field
- **file** - Stores documents referenced in `Drafts List`
- **bookings_leases** - Proposal converts to lease record

### Related Data Tables
- **listing** - Source of pricing & house rules
- **account_host** & **account_guest** - User accounts
- **housemanual** - House rules source
- **negotiationsummary** - Extended negotiation records

---

## Summary: Fields Driving Dynamic UI Behavior

### Critical Status Fields (Must Check)
1. **`Status`** - PRIMARY: Controls entire UI flow & visibility
2. **`Is Finalized`** - Whether proposal is locked/complete
3. **`counter offer happened`** - Shows counter offer section
4. **`rental app requested`** - Gates rental application flow
5. **`request virtual meeting`** - Triggers virtual meeting section

### Document Status Fields
6. **`guest documents review finalized?`** - Gates signature stage
7. **`host documents review finalized?`** - Gates signature stage
8. **`Drafts List`** - Controls document display

### Supporting Fields
9. **`Deleted`** - Filters out deleted proposals
10. **`House Rules`** - Shows rules section
11. **`Days Selected`** / **`Nights Selected`** - Drive date selection UI
12. **`Negotiation Summary`** - Shows negotiation history

All other fields are primarily data containers used for calculations, document generation, or display content.
