# Messaging System Architecture Plan

**Created**: 2026-01-08 14:30:00
**Status**: New
**Complexity**: High
**Classification**: BUILD

---

## Overview

This plan details the architecture and implementation steps for building a comprehensive in-app messaging system that mirrors the functionality from Bubble's messaging workflows. The system will handle:

1. **Thread creation tied to proposals** (with CTAs based on proposal status)
2. **SplitBot automated messages** triggered by proposal events
3. **Call-to-Action (CTA) system** for guided user flows
4. **Foundation for multi-channel delivery** (SMS + Email in future phases)

---

## Current State Analysis

### What Exists

| Component | Status | Location |
|-----------|--------|----------|
| `_message` table | Complete | `supabase/migrations/20251217_add_message_foreign_keys.sql` |
| `thread` table | Complete | Same migration |
| `os_messaging_cta` reference table | Complete (34 CTAs) | `reference_table.os_messaging_cta` |
| `notification_preferences` table | Complete | `supabase/migrations/20251214_create_notification_preferences.sql` |
| `messages/` edge function | Partial | `supabase/functions/messages/` |
| MessagingPage UI | Complete | `app/src/islands/pages/MessagingPage/` |
| Real-time subscriptions | Complete | `useMessagingPageLogic.js` |

### What's Missing

| Component | Priority | Description |
|-----------|----------|-------------|
| Thread creation for proposals | P0 | Create thread when proposal is created/updated |
| SplitBot message automation | P0 | Send CTA-based messages on proposal events |
| CTA template rendering | P0 | Replace `[Host name]`, `[Listing name]` placeholders |
| Proposal → Thread linking | P0 | Associate threads with proposals |
| Message visibility rules | P1 | Host/Guest visibility based on CTA type |
| Multi-channel delivery | P2 | SMS/Email delivery (future phase) |

---

## Architecture Decision: Extend `messages/` Edge Function

**Chosen Approach**: Add new actions to existing `messages/` function

**Rationale**:
1. Matches existing codebase patterns (action-based routing)
2. Shared helpers already exist in `_shared/messagingHelpers.ts`
3. Single deployment unit for all messaging logic
4. No extra network hops between functions

**New Actions to Add**:
- `create_proposal_thread` - Create thread for a proposal with initial SplitBot message
- `send_splitbot_message` - Send automated message with CTA to thread
- `get_cta_options` - Fetch available CTAs for a proposal status (optional, for UI)

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROPOSAL CREATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Frontend                      proposal/create                              │
│  (CreateProposal) ──────────────────────────────────────────────────────►  │
│                                     │                                       │
│                                     │ 1. Create proposal                    │
│                                     │ 2. Return proposalId                  │
│                                     ▼                                       │
│                               [Success Response]                            │
│                                     │                                       │
│  Frontend                           │ 3. Call messages/create_proposal_thread
│  (Post-submit) ─────────────────────┼──────────────────────────────────────►│
│                                     │                                       │
│                              messages/                                      │
│                      create_proposal_thread                                 │
│                                     │                                       │
│                                     │ 4. Find or create thread              │
│                                     │ 5. Get CTA for status                 │
│                                     │ 6. Render CTA template                │
│                                     │ 7. Create SplitBot message            │
│                                     │ 8. Broadcast via Realtime             │
│                                     ▼                                       │
│                               [Thread + Message]                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core In-App Messaging (This Plan)

**Goal**: Create threads and send SplitBot messages when proposals are created/updated

#### Step 1.1: Add CTA Helper Functions

**File**: `supabase/functions/_shared/ctaHelpers.ts` (new)

```typescript
// Functions to implement:
- getCTAForProposalStatus(status: string, recipientRole: 'guest' | 'host'): CTA
- renderCTATemplate(cta: CTA, context: TemplateContext): string
- getCTAButtonUrl(cta: CTA, proposalId: string): string
```

**Template Variables** (from Bubble workflows):
- `[Host name]` → Host's first name
- `[Guest name]` → Guest's first name
- `[Listing name]` → Listing title/name
- `[proposal's Listing's Name]` → Same as above

#### Step 1.2: Extend messagingHelpers.ts

**File**: `supabase/functions/_shared/messagingHelpers.ts`

Add functions:
```typescript
// Find thread by proposal ID
export async function findThreadByProposal(
  supabase: SupabaseClient,
  proposalId: string
): Promise<string | null>

// Create thread with proposal link
export async function createThreadForProposal(
  supabase: SupabaseClient,
  params: CreateProposalThreadParams
): Promise<string>

// Create SplitBot message with CTA
export async function createSplitBotMessage(
  supabase: SupabaseClient,
  params: CreateSplitBotMessageParams
): Promise<string>
```

#### Step 1.3: Add New Handler - createProposalThread

**File**: `supabase/functions/messages/handlers/createProposalThread.ts` (new)

**Input Payload**:
```typescript
interface CreateProposalThreadPayload {
  proposalId: string;
  guestId: string;
  hostId: string;
  listingId: string;
  proposalStatus: string;
  // Optional: override CTA
  ctaOverride?: string;
}
```

**Logic** (mirrors `CORE-create-new-thread-as-splitbot-after-proposal`):
1. Check if thread already exists for proposal
2. If not, create new thread with proposal link
3. Get appropriate CTA based on proposal status and recipient
4. Fetch user names and listing name for template rendering
5. Create message for GUEST (visible to guest only)
6. Create message for HOST (visible to host only)
7. Return thread_id and message_ids

#### Step 1.4: Add New Handler - sendSplitBotMessage

**File**: `supabase/functions/messages/handlers/sendSplitBotMessage.ts` (new)

**Input Payload**:
```typescript
interface SendSplitBotMessagePayload {
  threadId: string;
  ctaName: string;
  recipientRole: 'guest' | 'host' | 'both';
  proposalId?: string;
  // Template overrides
  customMessage?: string;
  splitBotWarning?: string;
}
```

**Logic** (mirrors `CORE-send-new-message (in app only)`):
1. Validate thread exists
2. Get CTA from reference table
3. Render template with context
4. Create message with:
   - `is Split Bot` = true
   - `is Forwarded` = true
   - Appropriate visibility flags
   - `Call to Action` = CTA display name
5. Add recipient to Unread Users
6. Return message_id

#### Step 1.5: Update messages/index.ts Router

**File**: `supabase/functions/messages/index.ts`

Changes:
1. Add to ALLOWED_ACTIONS: `'create_proposal_thread'`, `'send_splitbot_message'`
2. Add to handlers map
3. Update executeHandler switch

#### Step 1.6: Frontend Integration

**File**: `app/src/islands/pages/CreateProposalPage/useCreateProposalLogic.js`

After successful proposal creation, call:
```javascript
await createProposalThread({
  proposalId: result.proposalId,
  guestId: result.guestId,
  hostId: result.hostId,
  listingId: result.listingId,
  proposalStatus: result.status,
});
```

---

### Phase 2: Status Change Messaging (Future)

When proposal status changes, send appropriate messages:

| Status Transition | Guest CTA | Host CTA |
|-------------------|-----------|----------|
| → Host Review | View Proposal (Guest View) | View Proposal (Host View) |
| → Counteroffer | Respond to Counter Offer | - |
| → Accepted | (Guest view) Host accepted... | (Host view) Host accepted... |
| → Lease Docs Sent | Sign Lease Documents (Guest) | Sign Lease Documents (Host) |
| → Lease Activated | (Guest view) Lease activated | (Host view) Lease activated |

---

### Phase 3: Multi-Channel Delivery (Future)

Add SMS and Email delivery using:
- `notification_preferences` table for user opt-ins
- Twilio/SendGrid integrations
- `Multi Message` pattern from Bubble

---

## CTA Status Mapping

Based on Bubble's `CORE-create-new-thread-as-splitbot-after-proposal`:

| Proposal Status | Guest CTA | Host CTA |
|-----------------|-----------|----------|
| `Proposal Submitted by guest - Awaiting Rental Application` | Fill out Rental Application | - |
| `Host Review` | View Proposal (Guest View) | View Proposal (Host View) |
| `Host Counteroffer Submitted / Awaiting Guest Review` | Respond to Counter Offer | - |
| `Proposal or Counteroffer Accepted / Drafting Lease Documents` | (Guest view) Host accepted... | (Host view) Host accepted... |
| `Lease Documents Sent for Review` | Review Documents (Guest) | Review Documents (Host) |
| `Lease Documents Sent for Signatures` | Sign Lease Documents (Guest) | Sign Lease Documents (Host) |
| `Lease Documents Signed / Awaiting Initial payment` | - | - |
| `Initial Payment Submitted / Lease activated ` | (Guest view) Lease activated | (Host view) Lease activated |

---

## Database Considerations

### Existing Schema (No Changes Needed)

The `_message` table already has all required columns:
- `Call to Action` (FK to `os_messaging_cta.display`)
- `is Split Bot` (boolean)
- `Split Bot Warning` (text)
- `is Visible to Host` / `is Visible to Guest` (booleans)
- `Unread Users` (text[] array)

The `thread` table already has:
- `Proposal` (FK to proposal._id)
- `-Host User` / `-Guest User` (FK to user._id)
- `Listing` (FK to listing._id)

### CTA Table Population

Some CTAs need `message` and `button_text` populated. Currently only 3 have full data:
- `Fill out Rental Application`
- `View Proposal (Guest View)`
- `View Proposal (Host View)`

**Action Required**: Update `os_messaging_cta` reference table with message templates for remaining CTAs.

---

## Testing Strategy

1. **Unit Tests**: Pure functions for CTA rendering, template replacement
2. **Integration Tests**: Edge function handlers with test Supabase instance
3. **E2E Tests**: Full proposal creation → thread creation → message display flow

---

## Files Concerned

### New Files to Create
- `supabase/functions/_shared/ctaHelpers.ts`
- `supabase/functions/messages/handlers/createProposalThread.ts`
- `supabase/functions/messages/handlers/sendSplitBotMessage.ts`

### Files to Modify
- `supabase/functions/messages/index.ts` (add new actions)
- `supabase/functions/_shared/messagingHelpers.ts` (add proposal thread functions)
- `app/src/islands/pages/CreateProposalPage/useCreateProposalLogic.js` (call thread creation)

### Reference Files (Read-Only Context)
- `supabase/functions/proposal/actions/create.ts` (proposal creation flow)
- `supabase/functions/proposal/lib/status.ts` (status definitions)
- `app/src/islands/pages/MessagingPage/` (existing UI)

---

## Estimated Implementation Order

1. **ctaHelpers.ts** - Pure functions, no dependencies
2. **messagingHelpers.ts updates** - New thread/message functions
3. **createProposalThread.ts handler** - Main orchestration
4. **sendSplitBotMessage.ts handler** - Reusable message sender
5. **messages/index.ts updates** - Wire up new handlers
6. **Frontend integration** - Call from proposal creation
7. **CTA table population** - Update reference data

---

## Recommendations

### Architecture Choice Confirmed

**Extend `messages/` edge function** is the right choice because:
1. Centralized messaging logic
2. Reuses existing auth and error handling
3. Shared helpers reduce code duplication
4. Single deployment artifact

### Best Starting Point

Start with **Phase 1, Step 1.1 (ctaHelpers.ts)** because:
1. Pure functions with no side effects
2. Easy to test in isolation
3. Foundation for all subsequent steps
4. Reveals any gaps in CTA reference data

### CTA Data Quality

Before implementation, audit `os_messaging_cta` table:
1. Populate `message` templates for all CTAs used in proposal flows
2. Verify `button_text` for interactive CTAs
3. Ensure `visible_to_guest_only` / `visible_to_host_only` flags are correct

---

## Resolved Questions

1. **SplitBot User ID**: `1634177189464x117577733821174320` (email: splitbot@leasesplit.com)
2. **Message Timing**: Synchronous - thread creation happens after proposal creation succeeds
3. **CTA Templates**: Use `message` column from `os_messaging_cta`, apply find & replace for `[Host name]`, `[Guest name]`, `[Listing name]`

## Open Questions

1. **Error Handling**: If thread creation fails, should proposal creation rollback? (Likely no - non-blocking)
2. **Real-time**: Confirm database triggers broadcast new messages to Realtime channels

---

**Next Step**: Implement `ctaHelpers.ts` with pure functions for CTA lookup and template rendering.
