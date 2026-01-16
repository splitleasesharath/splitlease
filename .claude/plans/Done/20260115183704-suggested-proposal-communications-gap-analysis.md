# Suggested Proposal Communications - Gap Analysis

**Date**: 2026-01-15
**Status**: Analysis Complete - Awaiting Implementation
**Type**: BUILD (Feature Enhancement)

---

## Executive Summary

The current `create_suggested.ts` implementation handles **in-app messaging** well but is **missing critical communication channels** that the Bubble workflow (CORE-create-suggested-proposal-NEW) provides:

| Channel | Bubble Workflow | Current Implementation | Gap |
|---------|-----------------|----------------------|-----|
| In-App Thread | ✅ Creates thread | ✅ Creates thread | ✅ Parity |
| SplitBot Messages | ✅ Guest + Host messages | ✅ Guest + Host messages | ✅ Parity |
| Email to Guest | ✅ Celebratory email | ❌ Not implemented | **GAP** |
| Email to Host | ✅ Notification by rental type | ❌ Not implemented | **GAP** |
| SMS to Guest | ✅ Confirmation text | ❌ Not implemented | **GAP** |
| SMS to Host | ✅ Notification text | ❌ Not implemented | **GAP** |
| Slack Notification | ✅ Activation channel | ❌ Not implemented | **GAP** |
| Magic Link Generation | ✅ For dashboard access | ❌ Not implemented | **GAP** |
| Expiration Reminder | ✅ Scheduled 3hrs before | ❌ Not implemented | **GAP** |

---

## Current Implementation Analysis

### What's Already Working

**File**: [create_suggested.ts](../../supabase/functions/proposal/actions/create_suggested.ts)

1. **Proposal Creation** (Lines 401-483)
   - Full proposal record with all fields
   - Status set to "Proposal Submitted for guest by Split Lease - Pending Confirmation"

2. **Thread Creation** (Lines 491-512)
   - Creates thread linked to proposal
   - Links guest and host users

3. **SplitBot Messages** (Lines 519-583)
   - Sends CTA-based messages to guest and host
   - Uses [ctaHelpers.ts](../../supabase/functions/_shared/ctaHelpers.ts) for template rendering
   - Updates thread's last message preview

4. **User Updates** (Lines 590-660)
   - Updates guest's Proposals List and Favorited Listings
   - Updates host's Proposals List
   - Saves guest profile fields (aboutMe, needForSpace, specialNeeds)

### What's Missing (The Gaps)

#### GAP 1: Email Notifications

**Bubble Workflow Steps 11-19** send emails based on:
- Guest celebratory email (proposal submission confirmation)
- Host notification email (varies by rental type: Nightly/Weekly/Monthly)

**Infrastructure Available**:
- [send-email](../../supabase/functions/send-email/index.ts) Edge Function exists
- [SendGrid integration](../../supabase/functions/send-email/lib/sendgridClient.ts) working
- Email templates stored in `reference_table.zat_email_html_template_eg_sendbasicemailwf_`

**Missing**: Call to `send-email` function from `create_suggested.ts`

#### GAP 2: SMS Notifications

**Bubble Workflow Steps 7-8, 20** send SMS:
- Guest confirmation text (with/without rental app)
- Host notification text

**Infrastructure Available**:
- [send-sms](../../supabase/functions/send-sms/index.ts) Edge Function exists
- [Twilio integration](../../supabase/functions/send-sms/lib/twilioClient.ts) working

**Missing**: Call to `send-sms` function from `create_suggested.ts`

#### GAP 3: Notification Preferences Check

**Bubble Workflow** checks user's notification settings before sending:
```
Only when proposalâs Guestâs Notification Settingâs Proposal Updates contains Email
```

**Infrastructure Available**:
- [notification_preferences](../../supabase/migrations/20251214_create_notification_preferences.sql) table exists
- Fields: `proposal_updates_sms`, `proposal_updates_email`

**Missing**: Query to check preferences before sending emails/SMS

#### GAP 4: Magic Link Generation

**Bubble Workflow Steps 4, 6, 10, 13** create magic login links for:
- Guest dashboard page
- Host proposals page
- Account page

**Infrastructure Available**:
- [auth-user/generateMagicLink](../../supabase/functions/auth-user/handlers/generateMagicLink.ts) likely exists

**Missing**: Generation and inclusion in emails/SMS

#### GAP 5: Slack Activation Channel

**Bubble Workflow Steps 1-2** post to Slack:
- Live activation channel (production)
- Test channel (staging/test users)

**Infrastructure Available**:
- [slack.ts](../../supabase/functions/_shared/slack.ts) helper exists

**Missing**: Post to activation channel on proposal creation

#### GAP 6: Scheduled Expiration Reminders

**Bubble Workflow Steps 21-23** schedule:
- Expiration reminder 3 hours before expiration
- Store scheduled workflow ID for cancellation

**Missing**: Scheduling mechanism and expiration tracking

---

## Recommended Implementation Plan

### Phase 1: Add Notification Preferences Check

Add helper function to check user's notification preferences:

```typescript
// In _shared/notificationHelpers.ts
async function shouldSendEmail(supabase, userId, category: 'proposal_updates'): Promise<boolean>
async function shouldSendSms(supabase, userId, category: 'proposal_updates'): Promise<boolean>
```

### Phase 2: Add Email Notifications to Guest

After thread creation, call send-email if guest has email enabled:

```typescript
// Check notification preferences
const guestPrefs = await getNotificationPreferences(supabase, input.guestId);
if (guestPrefs?.proposal_updates_email) {
  // Generate magic link
  const magicLink = await generateMagicLink(supabase, guestData.email, '/guest/proposals');

  // Send celebratory email
  await sendProposalEmail({
    templateId: 'guest_proposal_confirmation',
    toEmail: guestData.email,
    toName: guestFirstName,
    variables: { magic_link: magicLink, listing_name: listingName }
  });
}
```

### Phase 3: Add Email Notifications to Host

Send host notification based on rental type:

```typescript
const hostPrefs = await getNotificationPreferences(supabase, hostUserData._id);
if (hostPrefs?.proposal_updates_email) {
  const templateId = getHostEmailTemplate(listingData['rental type']); // nightly/weekly/monthly
  const magicLink = await generateMagicLink(supabase, hostUserData.email, '/host/proposals');

  await sendProposalEmail({
    templateId,
    toEmail: hostUserData.email,
    variables: { magic_link: magicLink, guest_name: guestFirstName }
  });
}
```

### Phase 4: Add SMS Notifications

Similar pattern for SMS:

```typescript
if (guestPrefs?.proposal_updates_sms && guestPhone) {
  await sendSms({
    to: guestPhone,
    from: SPLIT_LEASE_SMS_NUMBER,
    body: `Your proposal for ${listingName} has been submitted! View details: ${shortLink}`
  });
}
```

### Phase 5: Add Slack Notification

Post to activation channel:

```typescript
await postToSlack('acquisition', {
  text: `New Suggested Proposal Created`,
  fields: [
    { title: 'Guest', value: guestData.email },
    { title: 'Listing', value: listingName },
    { title: 'Status', value: status }
  ]
});
```

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/_shared/notificationHelpers.ts` | CREATE | Helper for notification preference checks |
| `supabase/functions/proposal/actions/create_suggested.ts` | MODIFY | Add email/SMS/Slack calls |
| `supabase/functions/proposal/lib/emailTemplates.ts` | CREATE | Template ID mappings |
| `supabase/functions/send-email/index.ts` | REVIEW | May need internal call support |

---

## Database Templates Required

Need to verify these templates exist in `reference_table.zat_email_html_template_eg_sendbasicemailwf_`:

1. Guest Proposal Confirmation (celebratory)
2. Host Notification - Nightly Listing
3. Host Notification - Weekly Listing
4. Host Notification - Monthly Listing

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Email/SMS failures block proposal | Make communications fire-and-forget (non-blocking) |
| Missing templates cause errors | Validate template existence at startup or skip gracefully |
| Rate limiting by SendGrid/Twilio | Already isolated in separate Edge Functions |
| User has no notification preferences | Default to NOT sending (privacy-first) |

---

## References

- Bubble Requirements: [Backend Workflow Requirements Document](../../Backend%20Workflow%20Requirements%20Document_%20CORE-create-suggested-proposal-NEW.md)
- Current Implementation: [create_suggested.ts](../../supabase/functions/proposal/actions/create_suggested.ts)
- Email Function: [send-email/index.ts](../../supabase/functions/send-email/index.ts)
- SMS Function: [send-sms/index.ts](../../supabase/functions/send-sms/index.ts)
- CTA Helpers: [ctaHelpers.ts](../../supabase/functions/_shared/ctaHelpers.ts)
- Messaging Helpers: [messagingHelpers.ts](../../supabase/functions/_shared/messagingHelpers.ts)
- Notification Preferences: [20251214_create_notification_preferences.sql](../../supabase/migrations/20251214_create_notification_preferences.sql)
