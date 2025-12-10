# Edge Function Error Logging to Slack - Feasibility Analysis & Implementation Plan

**Created**: 2025-12-10 22:00:00
**Status**: Analysis Complete
**Objective**: Forward errors from Supabase Edge Functions to Slack for real-time error tracking

---

## Executive Summary

**FEASIBILITY: HIGHLY FEASIBLE**

The existing Slack Edge Function infrastructure already supports webhook-based messaging to Slack channels. Implementing error forwarding requires:
1. A new action (`error_report`) in the Slack Edge Function
2. A shared utility function that Edge Functions can call to report errors
3. A dedicated Slack webhook for error notifications

---

## Current State Analysis

### Edge Functions Inventory (9 Total)

| # | Edge Function | Error Handling Pattern | Console Logging |
|---|--------------|----------------------|-----------------|
| 1 | `slack` | `formatErrorResponse()` inline | `console.error('[slack]')` |
| 2 | `bubble-proxy` | `formatErrorResponse()` from `_shared/errors.ts` | `console.error('[bubble-proxy]')` |
| 3 | `auth-user` | `formatErrorResponse()` from `_shared/errors.ts` | `console.error('[auth-user]')` |
| 4 | `ai-gateway` | `formatErrorResponse()` from `_shared/errors.ts` | `console.error('[ai-gateway]')` |
| 5 | `bubble_sync` | Inline error handling | `console.error('[bubble_sync]')` |
| 6 | `proposal` | `formatErrorResponse()` from `_shared/errors.ts` | `console.error('[proposal]')` |
| 7 | `listing` | `formatErrorResponse()` from `_shared/errors.ts` | `console.error('[listing]')` |
| 8 | `communications` | `formatErrorResponse()` inline (placeholder) | `console.error('[communications]')` |
| 9 | `pricing` | `formatErrorResponse()` inline (placeholder) | `console.error('[pricing]')` |

### Current Error Classes (from `_shared/errors.ts`)

```typescript
- BubbleApiError (statusCode, bubbleResponse)
- SupabaseSyncError (originalError)
- ValidationError
- AuthenticationError
- OpenAIError (statusCode, openaiResponse)
```

### Current Slack Edge Function Capabilities

- **Actions**: `faq_inquiry`, `diagnose`
- **Webhooks**: `SLACK_WEBHOOK_ACQUISITION`, `SLACK_WEBHOOK_GENERAL`
- **Pattern**: Action-based routing with `Promise.allSettled` for multi-channel delivery

---

## Feasibility Assessment

### Technical Feasibility: HIGH

| Criterion | Assessment | Notes |
|-----------|------------|-------|
| Webhook Infrastructure | **Ready** | Slack Edge Function already handles webhooks |
| Error Context Capture | **Available** | All functions log errors with function prefix and stack |
| Cross-Function Communication | **Possible** | Via direct fetch to Slack Edge Function URL |
| Environment Secrets | **Established** | Pattern exists for Slack webhooks |
| Deno Runtime Support | **Yes** | fetch() available in Deno |

### Implementation Complexity: LOW-MEDIUM

| Component | Complexity | Effort |
|-----------|------------|--------|
| New Slack action (`error_report`) | Low | 1-2 hours |
| Error reporter utility | Low | 1 hour |
| Integration into Edge Functions | Medium | 2-3 hours |
| Testing | Medium | 2 hours |
| **Total** | **Low-Medium** | **6-8 hours** |

### Risk Assessment: LOW

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Circular error loops | Low | Don't report errors from error reporting |
| Slack rate limits | Low | Batch errors, add cooldown |
| Missing webhook secret | Low | Graceful fallback to console.log only |
| Performance impact | Low | Async fire-and-forget pattern |

---

## Architecture Design

### Option A: Direct Webhook Call (Recommended)

```
Edge Function (error)
    → Slack Webhook (direct fetch)
    → Slack Channel
```

**Pros**: Simple, no dependencies on other Edge Functions
**Cons**: Each function needs webhook URL secret

### Option B: Via Slack Edge Function

```
Edge Function (error)
    → fetch('/functions/v1/slack', {action: 'error_report'})
    → Slack Channel
```

**Pros**: Centralized logic, consistent formatting
**Cons**: Extra hop, potential for circular errors

### Option C: Hybrid (Recommended Final)

```
Shared utility (_shared/errorReporter.ts)
    → Direct webhook call (primary)
    → Console.error (fallback)
```

**Pros**: Best of both worlds, single source of truth for error formatting

---

## Implementation Plan

### Phase 1: Slack Webhook Setup

1. Create new Slack webhook for `#errors` or `#engineering-alerts` channel
2. Add secret: `SLACK_WEBHOOK_ERRORS`
3. Update Slack Edge Function `diagnose` to show new webhook

### Phase 2: Error Reporter Utility

Create `supabase/functions/_shared/errorReporter.ts`:

```typescript
/**
 * Error Reporter - Sends errors to Slack for monitoring
 *
 * FAIL-SAFE: Never throws, always returns
 * Fire-and-forget pattern to avoid blocking main request
 */

interface ErrorReport {
  functionName: string;
  action: string;
  error: Error;
  payload?: Record<string, unknown>;
  userId?: string;
  timestamp?: string;
}

interface SlackErrorMessage {
  text: string;
  blocks: SlackBlock[];
}

/**
 * Report error to Slack channel
 * Fire-and-forget - does not await response
 */
export function reportError(report: ErrorReport): void {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_ERRORS');

  if (!webhookUrl) {
    console.warn('[errorReporter] SLACK_WEBHOOK_ERRORS not configured, skipping Slack notification');
    return;
  }

  // Fire and forget - don't await
  sendErrorToSlack(webhookUrl, report).catch((e) => {
    // Log but don't throw - we don't want error reporting to cause more errors
    console.error('[errorReporter] Failed to send to Slack:', e.message);
  });
}

async function sendErrorToSlack(webhookUrl: string, report: ErrorReport): Promise<void> {
  const message = formatErrorMessage(report);

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

function formatErrorMessage(report: ErrorReport): SlackErrorMessage {
  const emoji = getErrorEmoji(report.error);
  const severity = getErrorSeverity(report.error);

  return {
    text: `${emoji} Error in ${report.functionName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Edge Function Error`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Function:*\n${report.functionName}` },
          { type: 'mrkdwn', text: `*Action:*\n${report.action || 'N/A'}` },
          { type: 'mrkdwn', text: `*Error Type:*\n${report.error.name}` },
          { type: 'mrkdwn', text: `*Severity:*\n${severity}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message:*\n\`\`\`${report.error.message}\`\`\``,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Timestamp: ${report.timestamp || new Date().toISOString()}`,
          },
        ],
      },
    ],
  };
}

function getErrorEmoji(error: Error): string {
  switch (error.name) {
    case 'ValidationError': return '⚠️';
    case 'AuthenticationError': return '🔐';
    case 'BubbleApiError': return '🫧';
    case 'SupabaseSyncError': return '🔄';
    case 'OpenAIError': return '🤖';
    default: return '🚨';
  }
}

function getErrorSeverity(error: Error): string {
  switch (error.name) {
    case 'ValidationError': return 'Low (User Input)';
    case 'AuthenticationError': return 'Medium (Auth)';
    default: return 'High (System)';
  }
}
```

### Phase 3: Integration into Edge Functions

Update the `catch` block pattern in each Edge Function:

```typescript
// Before
} catch (error) {
  console.error('[function-name] ========== ERROR ==========');
  console.error('[function-name] Error:', error);
  console.error('[function-name] Error stack:', error.stack);

  const statusCode = getStatusCodeFromError(error as Error);
  const errorResponse = formatErrorResponse(error as Error);

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// After
import { reportError } from '../_shared/errorReporter.ts';

} catch (error) {
  console.error('[function-name] ========== ERROR ==========');
  console.error('[function-name] Error:', error);
  console.error('[function-name] Error stack:', error.stack);

  // Report to Slack (fire-and-forget)
  reportError({
    functionName: 'function-name',
    action: action, // from parsed request body
    error: error as Error,
    payload: body?.payload, // sanitized
    userId: user?.id,
  });

  const statusCode = getStatusCodeFromError(error as Error);
  const errorResponse = formatErrorResponse(error as Error);

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### Phase 4: Enhanced Error Reporting (Optional)

Add severity filtering and batching:

```typescript
// Only report system errors (skip validation errors for noise reduction)
const shouldReport = !(error instanceof ValidationError);
if (shouldReport) {
  reportError({ ... });
}
```

---

## Files to Modify/Create

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/errorReporter.ts` | Shared error reporting utility |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/bubble-proxy/index.ts` | Add error reporting to catch block |
| `supabase/functions/auth-user/index.ts` | Add error reporting to catch block |
| `supabase/functions/ai-gateway/index.ts` | Add error reporting to catch block |
| `supabase/functions/bubble_sync/index.ts` | Add error reporting to catch block |
| `supabase/functions/proposal/index.ts` | Add error reporting to catch block |
| `supabase/functions/listing/index.ts` | Add error reporting to catch block |
| `supabase/functions/communications/index.ts` | Add error reporting to catch block |
| `supabase/functions/pricing/index.ts` | Add error reporting to catch block |
| `supabase/functions/slack/index.ts` | Add `error_report` action (optional) |

### Secrets to Add

| Secret | Value |
|--------|-------|
| `SLACK_WEBHOOK_ERRORS` | Slack webhook URL for #errors channel |

---

## Slack Message Format (Example Output)

```
🚨 Edge Function Error
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Function:     bubble-proxy
Action:       upload_photos
Error Type:   BubbleApiError
Severity:     High (System)

Message:
```
Failed to upload photos: Bubble API returned 500
```

Timestamp: 2025-12-10T22:15:30.000Z
```

---

## Testing Plan

1. **Unit Test**: Mock `fetch` and verify message format
2. **Integration Test**: Deploy to staging and trigger known error
3. **End-to-End Test**: Verify Slack channel receives message
4. **Failure Test**: Remove webhook secret, verify graceful degradation

---

## Success Criteria

- [ ] All 9 Edge Functions integrated with error reporter
- [ ] Slack channel receives formatted error messages
- [ ] No impact on main request latency (fire-and-forget)
- [ ] Graceful fallback when webhook not configured
- [ ] No circular error loops

---

## Dependencies

- Slack workspace admin access (for webhook creation)
- Supabase dashboard access (for secrets)
- Deploy access for Edge Functions

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Webhook Setup | 30 min | Slack admin |
| Phase 2: Error Reporter | 2 hours | None |
| Phase 3: Integration | 3 hours | Phase 2 |
| Phase 4: Testing | 2 hours | Phase 3 |
| **Total** | **~8 hours** | |

---

## Conclusion

This implementation is **highly feasible** and leverages existing infrastructure. The fire-and-forget pattern ensures no performance impact on user requests, while the shared utility provides consistent formatting across all Edge Functions.

**Recommendation**: Proceed with implementation using Option C (Hybrid approach with shared utility).
