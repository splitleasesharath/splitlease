# Virtual Meeting Messaging Integration Plan

**Created**: 2026-01-09 17:55:00
**Status**: New
**Type**: Feature Implementation

---

## Overview

Add in-app messaging, email, and SMS notification capabilities to the virtual meeting edge function. When a virtual meeting is **requested** or **accepted**, both the guest and host should receive appropriate notifications through all channels.

### Current State
- Virtual meeting `create` and `accept` handlers work correctly for database operations
- `send_splitbot_message` action in messages edge function is fully built and ready
- `findOrCreateProposalThread` can locate or create threads for proposals
- CTA reference table (`os_messaging_cta`) exists but lacks VM-specific entries

### Missing Pieces
1. CTA records for virtual meeting events (8 records)
2. Messaging orchestration in VM handlers (call to messages function)
3. Thread lookup integration in VM handlers

---

## Implementation Steps

### Step 1: Add CTA Records (Database Migration)

Insert 8 new CTA records into `os_messaging_cta` table:

```sql
-- Virtual Meeting Request CTAs
INSERT INTO os_messaging_cta (name, display, message, button_text, is_proposal_cta, visible_to_guest_only, visible_to_host_only) VALUES
-- When GUEST requests (Guest sees confirmation)
('vm_request_confirmation_guest', 'View Virtual Meeting (Guest View)',
 'Your virtual meeting request has been sent. [Host name] will respond when they are able.',
 'View Meeting', true, true, false),

-- When GUEST requests (Host sees notification)
('vm_request_notification_host', 'See Virtual Meeting (Host View)',
 'A virtual meeting request from [Guest name] has been sent. Please respond as soon as you can.',
 'Respond', true, false, true),

-- When HOST requests (Host sees confirmation)
('vm_request_confirmation_host', 'See Virtual Meeting (Host View)',
 'Your virtual meeting request has been sent. [Guest name] will respond as soon as possible.',
 'View Meeting', true, false, true),

-- When HOST requests (Guest sees notification)
('vm_request_notification_guest', 'View Virtual Meeting (Guest View)',
 'A virtual meeting request from [Host name] has been sent. Please respond as soon as you can.',
 'Respond', true, true, false);

-- Virtual Meeting Accept CTAs (SL Confirmed)
INSERT INTO os_messaging_cta (name, display, message, button_text, is_proposal_cta, visible_to_guest_only, visible_to_host_only) VALUES
-- When meeting is confirmed (Guest view)
('vm_accepted_confirmed_guest', 'View Virtual Meeting (Guest View)',
 'The virtual meeting has been confirmed. The meeting will be hosted via Google Meet and we will be sharing the link as soon as it is ready.',
 'View Meeting', true, true, false),

-- When meeting is confirmed (Host view)
('vm_accepted_confirmed_host', 'See Virtual Meeting (Host View)',
 'The virtual meeting has been confirmed. The meeting will be hosted via Google Meet and we will be sharing the link as soon as it is ready.',
 'View Meeting', true, false, true),

-- When meeting is pending SL confirmation (Guest view)
('vm_accepted_pending_guest', 'View Virtual Meeting (Guest View)',
 'The virtual meeting date has been agreed. Now you are waiting for Split Lease confirmation. The meeting will be hosted via Google Meet and we will be sharing the link as soon as the meeting is confirmed.',
 'View Meeting', true, true, false),

-- When meeting is pending SL confirmation (Host view)
('vm_accepted_pending_host', 'See Virtual Meeting (Host View)',
 'The virtual meeting date has been agreed. Now you are waiting for Split Lease confirmation. The meeting will be hosted via Google Meet and we will be sharing the link as soon as the meeting is confirmed.',
 'View Meeting', true, false, true);
```

**Location**: Run via `mcp__supabase__apply_migration` or Supabase dashboard

---

### Step 2: Add Helper Function for VM Messaging

Create a new shared helper: `supabase/functions/_shared/vmMessagingHelpers.ts`

```typescript
/**
 * VM Messaging Helpers
 * Orchestrates in-app messaging for virtual meeting events
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  findOrCreateProposalThread,
  createSplitBotMessage,
  updateThreadLastMessage,
  getUserProfile,
  getListingName,
} from './messagingHelpers.ts';
import {
  getCTAByName,
  renderTemplate,
  buildTemplateContext,
  getVisibilityForRole,
} from './ctaHelpers.ts';

interface VMMessageContext {
  proposalId: string;
  hostUserId: string;
  guestUserId: string;
  listingId?: string;
  listingName?: string;
  hostName?: string;
  guestName?: string;
  bookedDate?: string; // ISO 8601 for accept messages
  isAlternativeTime?: boolean;
}

interface SendVMMessagesResult {
  threadId: string;
  guestMessageId?: string;
  hostMessageId?: string;
}

/**
 * Send in-app messages when a virtual meeting is REQUESTED
 *
 * @param supabase - Supabase client
 * @param context - VM message context
 * @param requesterIsHost - true if host initiated, false if guest initiated
 */
export async function sendVMRequestMessages(
  supabase: SupabaseClient,
  context: VMMessageContext,
  requesterIsHost: boolean
): Promise<SendVMMessagesResult> {
  console.log('[vmMessaging] Sending VM request messages, requesterIsHost:', requesterIsHost);

  // Step 1: Find or create thread for this proposal
  const { threadId } = await findOrCreateProposalThread(supabase, {
    proposalId: context.proposalId,
    hostUserId: context.hostUserId,
    guestUserId: context.guestUserId,
    listingId: context.listingId,
    listingName: context.listingName,
  });

  // Step 2: Fetch user names if not provided
  const [hostProfile, guestProfile] = await Promise.all([
    context.hostName ? null : getUserProfile(supabase, context.hostUserId),
    context.guestName ? null : getUserProfile(supabase, context.guestUserId),
  ]);

  const hostName = context.hostName || hostProfile?.firstName || 'Host';
  const guestName = context.guestName || guestProfile?.firstName || 'Guest';

  // Step 3: Build template context
  const templateContext = buildTemplateContext(hostName, guestName, context.listingName);

  // Step 4: Determine which CTAs to use based on requester
  const requesterCTAName = requesterIsHost ? 'vm_request_confirmation_host' : 'vm_request_confirmation_guest';
  const recipientCTAName = requesterIsHost ? 'vm_request_notification_guest' : 'vm_request_notification_host';

  const [requesterCTA, recipientCTA] = await Promise.all([
    getCTAByName(supabase, requesterCTAName),
    getCTAByName(supabase, recipientCTAName),
  ]);

  const result: SendVMMessagesResult = { threadId };
  const splitBotWarning = 'Split Lease will confirm your chosen time slot';

  // Step 5: Send message to REQUESTER (confirmation)
  if (requesterCTA) {
    const requesterMessage = renderTemplate(requesterCTA.message || '', templateContext);
    const requesterRole = requesterIsHost ? 'host' : 'guest';
    const visibility = getVisibilityForRole(requesterRole);

    const messageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody: requesterMessage,
      callToAction: requesterCTA.display,
      visibleToHost: visibility.visibleToHost,
      visibleToGuest: visibility.visibleToGuest,
      splitBotWarning,
      recipientUserId: requesterIsHost ? context.hostUserId : context.guestUserId,
    });

    if (requesterIsHost) {
      result.hostMessageId = messageId;
    } else {
      result.guestMessageId = messageId;
    }
  }

  // Step 6: Send message to RECIPIENT (notification)
  if (recipientCTA) {
    const recipientMessage = renderTemplate(recipientCTA.message || '', templateContext);
    const recipientRole = requesterIsHost ? 'guest' : 'host';
    const visibility = getVisibilityForRole(recipientRole);

    const messageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody: recipientMessage,
      callToAction: recipientCTA.display,
      visibleToHost: visibility.visibleToHost,
      visibleToGuest: visibility.visibleToGuest,
      splitBotWarning,
      recipientUserId: requesterIsHost ? context.guestUserId : context.hostUserId,
    });

    if (requesterIsHost) {
      result.guestMessageId = messageId;
    } else {
      result.hostMessageId = messageId;
    }
  }

  // Step 7: Update thread last message
  await updateThreadLastMessage(supabase, threadId, 'Virtual meeting request sent');

  console.log('[vmMessaging] VM request messages sent:', result);
  return result;
}

/**
 * Send in-app messages when a virtual meeting is ACCEPTED
 *
 * @param supabase - Supabase client
 * @param context - VM message context (must include bookedDate)
 * @param isConfirmedBySL - true if Split Lease has confirmed the meeting
 */
export async function sendVMAcceptMessages(
  supabase: SupabaseClient,
  context: VMMessageContext,
  isConfirmedBySL: boolean
): Promise<SendVMMessagesResult> {
  console.log('[vmMessaging] Sending VM accept messages, confirmed:', isConfirmedBySL);

  // Step 1: Find thread for this proposal (should exist)
  const { threadId } = await findOrCreateProposalThread(supabase, {
    proposalId: context.proposalId,
    hostUserId: context.hostUserId,
    guestUserId: context.guestUserId,
    listingId: context.listingId,
    listingName: context.listingName,
  });

  // Step 2: Fetch user names if not provided
  const [hostProfile, guestProfile] = await Promise.all([
    context.hostName ? null : getUserProfile(supabase, context.hostUserId),
    context.guestName ? null : getUserProfile(supabase, context.guestUserId),
  ]);

  const hostName = context.hostName || hostProfile?.firstName || 'Host';
  const guestName = context.guestName || guestProfile?.firstName || 'Guest';

  // Step 3: Build template context
  const templateContext = buildTemplateContext(hostName, guestName, context.listingName);

  // Step 4: Determine CTAs based on SL confirmation status
  const guestCTAName = isConfirmedBySL ? 'vm_accepted_confirmed_guest' : 'vm_accepted_pending_guest';
  const hostCTAName = isConfirmedBySL ? 'vm_accepted_confirmed_host' : 'vm_accepted_pending_host';

  const [guestCTA, hostCTA] = await Promise.all([
    getCTAByName(supabase, guestCTAName),
    getCTAByName(supabase, hostCTAName),
  ]);

  const result: SendVMMessagesResult = { threadId };

  // Format booked date for message (if provided)
  let dateString = '';
  if (context.bookedDate) {
    const date = new Date(context.bookedDate);
    dateString = date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    }) + ' (EST)';
  }

  const splitBotWarning = isConfirmedBySL ? undefined : 'Split Lease will confirm the booked date already agreed';

  // Step 5: Send message to GUEST
  if (guestCTA) {
    let guestMessage = renderTemplate(guestCTA.message || '', templateContext);
    if (dateString) {
      guestMessage = guestMessage.replace(/The virtual meeting/i, `The virtual meeting scheduled for ${dateString}`);
    }

    const guestMessageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody: guestMessage,
      callToAction: guestCTA.display,
      visibleToHost: false,
      visibleToGuest: true,
      splitBotWarning,
      recipientUserId: context.guestUserId,
    });
    result.guestMessageId = guestMessageId;
  }

  // Step 6: Send message to HOST
  if (hostCTA) {
    let hostMessage = renderTemplate(hostCTA.message || '', templateContext);
    if (dateString) {
      hostMessage = hostMessage.replace(/The virtual meeting/i, `The virtual meeting scheduled for ${dateString}`);
    }

    const hostMessageId = await createSplitBotMessage(supabase, {
      threadId,
      messageBody: hostMessage,
      callToAction: hostCTA.display,
      visibleToHost: true,
      visibleToGuest: false,
      splitBotWarning,
      recipientUserId: context.hostUserId,
    });
    result.hostMessageId = hostMessageId;
  }

  // Step 7: Update thread last message
  const statusText = isConfirmedBySL ? 'Virtual meeting confirmed' : 'Virtual meeting accepted - pending confirmation';
  await updateThreadLastMessage(supabase, threadId, statusText);

  console.log('[vmMessaging] VM accept messages sent:', result);
  return result;
}
```

---

### Step 3: Update VM Create Handler

Modify [create.ts](supabase/functions/virtual-meeting/handlers/create.ts) to call messaging after successful VM creation.

**Add import at top:**
```typescript
import { sendVMRequestMessages } from '../../_shared/vmMessagingHelpers.ts';
```

**Add messaging step after Bubble sync (around line 256):**
```typescript
  // ================================================
  // SEND IN-APP MESSAGES
  // ================================================

  try {
    const messageResult = await sendVMRequestMessages(supabase, {
      proposalId: input.proposalId,
      hostUserId: hostUserData._id,
      guestUserId: guestUserData._id,
      listingId: proposalData.Listing,
      hostName: hostUserData["Name - First"],
      guestName: guestUserData["Name - First"],
    }, requesterIsHost);

    console.log(`[virtual-meeting:create] In-app messages sent, thread: ${messageResult.threadId}`);
  } catch (msgError) {
    // Non-blocking - log and continue
    console.error(`[virtual-meeting:create] Failed to send in-app messages (non-blocking):`, msgError);
  }
```

---

### Step 4: Update VM Accept Handler

Modify [accept.ts](supabase/functions/virtual-meeting/handlers/accept.ts) to:
1. Fetch additional VM data (host, guest, listing, SL confirmation status)
2. Call messaging after successful acceptance

**Add import at top:**
```typescript
import { sendVMAcceptMessages } from '../../_shared/vmMessagingHelpers.ts';
```

**Expand VM fetch to get more fields (around line 74):**
```typescript
  const { data: existingVM, error: vmFetchError } = await supabase
    .from("virtualmeetingschedulesandlinks")
    .select(`
      _id,
      "meeting declined",
      "booked date",
      host,
      guest,
      proposal,
      "host name",
      "guest name",
      "Listing (for Co-Host feature)"
    `)
    .eq("_id", virtualMeetingId)
    .single();
```

**Add messaging step after Bubble sync (around line 170):**
```typescript
  // ================================================
  // SEND IN-APP MESSAGES
  // ================================================

  try {
    // Fetch listing name for context
    let listingName: string | undefined;
    if (existingVM["Listing (for Co-Host feature)"]) {
      const { data: listing } = await supabase
        .from("listing")
        .select('"Name"')
        .eq("_id", existingVM["Listing (for Co-Host feature)"])
        .single();
      listingName = listing?.Name;
    }

    const messageResult = await sendVMAcceptMessages(supabase, {
      proposalId: input.proposalId,
      hostUserId: existingVM.host,
      guestUserId: existingVM.guest,
      listingId: existingVM["Listing (for Co-Host feature)"],
      listingName,
      hostName: existingVM["host name"],
      guestName: existingVM["guest name"],
      bookedDate: input.bookedDate,
    }, vmUpdateData.confirmedBySplitLease);

    console.log(`[virtual-meeting:accept] In-app messages sent, thread: ${messageResult.threadId}`);
  } catch (msgError) {
    // Non-blocking - log and continue
    console.error(`[virtual-meeting:accept] Failed to send in-app messages (non-blocking):`, msgError);
  }
```

---

### Step 5: SMS/Email Integration (Future Enhancement)

The current implementation sends **in-app messages only**. SMS and Email currently route through Bubble's `L2-sms-in-app-email-message!` workflow.

**Options for native SMS/Email:**
1. **Keep Bubble integration** (short-term): Call existing `notify_participants` handler
2. **Add Supabase Email** (medium-term): Use Supabase Edge Function with Resend/SendGrid
3. **Add SMS via Twilio** (medium-term): Direct Twilio API integration

For now, in-app messaging is the priority. The external notification system can be added incrementally.

---

## Testing Checklist

- [ ] Run CTA migration and verify 8 records exist in `os_messaging_cta`
- [ ] Test VM create by guest → Guest receives confirmation, Host receives notification
- [ ] Test VM create by host → Host receives confirmation, Guest receives notification
- [ ] Test VM accept (SL confirmed) → Both parties receive confirmed message
- [ ] Test VM accept (SL not confirmed) → Both parties receive pending message with warning
- [ ] Verify thread is found (not duplicated) for existing proposals
- [ ] Verify messages appear in correct chat threads
- [ ] Verify CTA buttons render correctly

---

## File References

### Files to Create
- [supabase/functions/_shared/vmMessagingHelpers.ts](supabase/functions/_shared/vmMessagingHelpers.ts) - New messaging orchestration helper

### Files to Modify
- [supabase/functions/virtual-meeting/handlers/create.ts](supabase/functions/virtual-meeting/handlers/create.ts) - Add messaging after VM creation
- [supabase/functions/virtual-meeting/handlers/accept.ts](supabase/functions/virtual-meeting/handlers/accept.ts) - Add messaging after VM acceptance

### Database Changes
- `os_messaging_cta` table - Add 8 new CTA records via migration

### Reference Files (Read-Only)
- [supabase/functions/_shared/messagingHelpers.ts](supabase/functions/_shared/messagingHelpers.ts) - findOrCreateProposalThread, createSplitBotMessage
- [supabase/functions/_shared/ctaHelpers.ts](supabase/functions/_shared/ctaHelpers.ts) - getCTAByName, renderTemplate
- [supabase/functions/messages/handlers/sendSplitBotMessage.ts](supabase/functions/messages/handlers/sendSplitBotMessage.ts) - Reference implementation

---

## Deployment Notes

After implementation:
1. Run CTA migration in Supabase
2. Deploy virtual-meeting edge function: `supabase functions deploy virtual-meeting`
3. Test in staging before production
