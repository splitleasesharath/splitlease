# Edge Function Error Logging to Slack - Feasibility Analysis & Implementation Plan

**Created**: 2025-12-10 22:00:00
**Updated**: 2025-12-10 22:30:00
**Status**: Analysis Complete (v2 - Consolidated Error Pattern)
**Objective**: Forward errors from Supabase Edge Functions to Slack for real-time error tracking

---

## Executive Summary

**FEASIBILITY: HIGHLY FEASIBLE**

The existing Slack Edge Function infrastructure already supports webhook-based messaging to Slack channels. Implementing error forwarding requires:
1. A shared Slack utility in `_shared/slack.ts` for all webhook operations
2. An error collector pattern that accumulates errors during a request lifecycle
3. **ONE consolidated Slack message per Edge Function invocation** (not per error)
4. A dedicated Slack webhook for error notifications

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
| Shared Utilities Pattern | **Established** | `_shared/` folder already contains cors.ts, errors.ts, etc. |
| Environment Secrets | **Established** | Pattern exists for Slack webhooks |
| Deno Runtime Support | **Yes** | fetch() available in Deno |

### Implementation Complexity: LOW-MEDIUM

| Component | Complexity | Effort |
|-----------|------------|--------|
| Shared Slack utility (`_shared/slack.ts`) | Low | 1-2 hours |
| Error collector class | Low | 1 hour |
| Integration into Edge Functions | Medium | 2-3 hours |
| Testing | Medium | 2 hours |
| **Total** | **Low-Medium** | **6-8 hours** |

### Risk Assessment: LOW

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Circular error loops | Low | Don't report errors from error reporting |
| Slack rate limits | Very Low | One message per request (consolidated) |
| Missing webhook secret | Low | Graceful fallback to console.log only |
| Performance impact | **None** | Async fire-and-forget pattern |

---

## Architecture Design

### Final Architecture: Shared Slack Utility with Error Collector

```
┌─────────────────────────────────────────────────────────────────┐
│                     Edge Function Request                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Create ErrorCollector at request start                       │
│     const collector = new ErrorCollector('proposal', 'create');  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. During request, errors are collected (not sent immediately)  │
│     collector.add(error1);                                       │
│     collector.add(error2);  // Multiple errors possible          │
│     collector.add(error3);                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. At request end (in catch block), send ONE consolidated msg   │
│     collector.reportToSlack();  // Fire-and-forget               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Slack receives ONE message with all errors summarized        │
│     🚨 proposal/create - 3 errors                                │
└─────────────────────────────────────────────────────────────────┘
```

### Performance Guarantee

```typescript
// Fire-and-forget pattern - ZERO impact on response time
collector.reportToSlack(); // Does NOT await
return new Response(...);  // Returns immediately
```

The `reportToSlack()` method:
1. Does NOT use `await`
2. Catches its own errors internally
3. Never blocks the main response
4. Edge Function worker continues after response is sent

---

## Implementation Plan

### Phase 1: Slack Webhook Setup

1. Create new Slack webhook for `#errors` or `#engineering-alerts` channel
2. Add secret: `SLACK_WEBHOOK_ERRORS`

### Phase 2: Shared Slack Utility

Create `supabase/functions/_shared/slack.ts`:

```typescript
/**
 * Shared Slack Utilities
 * Split Lease - Edge Functions
 *
 * Centralized Slack webhook operations for all Edge Functions
 *
 * PERFORMANCE: Fire-and-forget pattern - ZERO latency impact
 * CONSOLIDATION: One message per request, not per error
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: { type: string; text: string }[];
}

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
}

interface CollectedError {
  error: Error;
  context?: string;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────
// Webhook Channels
// ─────────────────────────────────────────────────────────────

export type SlackChannel = 'errors' | 'acquisition' | 'general';

const CHANNEL_ENV_MAP: Record<SlackChannel, string> = {
  errors: 'SLACK_WEBHOOK_ERRORS',
  acquisition: 'SLACK_WEBHOOK_ACQUISITION',
  general: 'SLACK_WEBHOOK_GENERAL',
};

/**
 * Get webhook URL for a channel
 * Returns null if not configured (graceful degradation)
 */
function getWebhookUrl(channel: SlackChannel): string | null {
  const envVar = CHANNEL_ENV_MAP[channel];
  return Deno.env.get(envVar) || null;
}

// ─────────────────────────────────────────────────────────────
// Core Send Function
// ─────────────────────────────────────────────────────────────

/**
 * Send message to Slack channel
 * Fire-and-forget - does not await, does not throw
 */
export function sendToSlack(channel: SlackChannel, message: SlackMessage): void {
  const webhookUrl = getWebhookUrl(channel);

  if (!webhookUrl) {
    console.warn(`[slack] ${CHANNEL_ENV_MAP[channel]} not configured, skipping notification`);
    return;
  }

  // Fire and forget - intentionally not awaited
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  }).catch((e) => {
    // Log but never throw - error reporting must not cause errors
    console.error('[slack] Failed to send message:', e.message);
  });
}

// ─────────────────────────────────────────────────────────────
// Error Collector Class
// ─────────────────────────────────────────────────────────────

/**
 * ErrorCollector - Accumulates errors during a request lifecycle
 *
 * Usage:
 *   const collector = new ErrorCollector('proposal', 'create');
 *
 *   try {
 *     // ... business logic
 *     collector.add(someError, 'During validation');
 *   } catch (error) {
 *     collector.add(error, 'Fatal error');
 *     collector.reportToSlack(); // Fire-and-forget
 *     return errorResponse;
 *   }
 */
export class ErrorCollector {
  private functionName: string;
  private action: string;
  private requestId: string;
  private errors: CollectedError[] = [];
  private startTime: string;
  private userId?: string;
  private payload?: Record<string, unknown>;

  constructor(functionName: string, action: string) {
    this.functionName = functionName;
    this.action = action;
    this.requestId = crypto.randomUUID().slice(0, 8);
    this.startTime = new Date().toISOString();
  }

  /**
   * Set optional context for better error reports
   */
  setContext(options: { userId?: string; payload?: Record<string, unknown> }): void {
    if (options.userId) this.userId = options.userId;
    if (options.payload) this.payload = this.sanitizePayload(options.payload);
  }

  /**
   * Add an error to the collection
   */
  add(error: Error, context?: string): void {
    this.errors.push({
      error,
      context,
      timestamp: new Date().toISOString(),
    });
    // Also log to console for Supabase logs
    console.error(`[${this.functionName}] Error collected:`, error.message, context || '');
  }

  /**
   * Check if any errors were collected
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get the primary (first) error for response formatting
   */
  getPrimaryError(): Error | null {
    return this.errors.length > 0 ? this.errors[0].error : null;
  }

  /**
   * Report all collected errors to Slack as ONE consolidated message
   * Fire-and-forget - does not await, does not throw
   */
  reportToSlack(): void {
    if (this.errors.length === 0) {
      return;
    }

    const message = this.formatConsolidatedMessage();
    sendToSlack('errors', message);
  }

  /**
   * Format all errors into a single Slack message
   */
  private formatConsolidatedMessage(): SlackMessage {
    const primaryError = this.errors[0].error;
    const emoji = this.getErrorEmoji(primaryError);
    const severity = this.getErrorSeverity(primaryError);
    const errorCount = this.errors.length;

    const blocks: SlackBlock[] = [
      // Header
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${this.functionName}/${this.action} - ${errorCount} error${errorCount > 1 ? 's' : ''}`,
          emoji: true,
        },
      },
      // Summary section
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Function:*\n\`${this.functionName}\`` },
          { type: 'mrkdwn', text: `*Action:*\n\`${this.action}\`` },
          { type: 'mrkdwn', text: `*Severity:*\n${severity}` },
          { type: 'mrkdwn', text: `*Request ID:*\n\`${this.requestId}\`` },
        ],
      },
      // Divider
      { type: 'divider' },
    ];

    // Add each error (max 5 to avoid message size limits)
    const errorsToShow = this.errors.slice(0, 5);
    errorsToShow.forEach((collected, index) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error ${index + 1}:* \`${collected.error.name}\`\n${collected.context ? `_Context: ${collected.context}_\n` : ''}\`\`\`${collected.error.message}\`\`\``,
        },
      });
    });

    // If more than 5 errors, add note
    if (this.errors.length > 5) {
      blocks.push({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `_+ ${this.errors.length - 5} more errors (check Supabase logs)_` },
        ],
      });
    }

    // Footer with metadata
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Started: ${this.startTime}${this.userId ? ` | User: ${this.userId}` : ''}`
        },
      ],
    });

    return {
      text: `${emoji} Error in ${this.functionName}/${this.action}`,
      blocks,
    };
  }

  /**
   * Remove sensitive data from payload
   */
  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'credit_card'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(k => lowerKey.includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[Object]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private getErrorEmoji(error: Error): string {
    switch (error.name) {
      case 'ValidationError': return '⚠️';
      case 'AuthenticationError': return '🔐';
      case 'BubbleApiError': return '🫧';
      case 'SupabaseSyncError': return '🔄';
      case 'OpenAIError': return '🤖';
      default: return '🚨';
    }
  }

  private getErrorSeverity(error: Error): string {
    switch (error.name) {
      case 'ValidationError': return '🟡 Low (User Input)';
      case 'AuthenticationError': return '🟠 Medium (Auth)';
      default: return '🔴 High (System)';
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Convenience Export
// ─────────────────────────────────────────────────────────────

/**
 * Create error collector for a request
 * Convenience function for cleaner imports
 */
export function createErrorCollector(functionName: string, action: string): ErrorCollector {
  return new ErrorCollector(functionName, action);
}
```

### Phase 3: Integration into Edge Functions

Update each Edge Function with the new pattern:

```typescript
// Example: proposal/index.ts

import { createErrorCollector } from '../_shared/slack.ts';
import { formatErrorResponse, getStatusCodeFromError } from '../_shared/errors.ts';

Deno.serve(async (req: Request) => {
  // 1. Parse action first (needed for collector)
  let action = 'unknown';
  let collector: ErrorCollector | null = null;

  try {
    const body = await req.json();
    action = body.action || 'unknown';

    // 2. Create collector at request start
    collector = createErrorCollector('proposal', action);

    // 3. Set context when available
    collector.setContext({
      userId: user?.id,
      payload: body.payload
    });

    // ... rest of business logic ...

    // If non-fatal errors occurred during processing, still report them
    if (collector.hasErrors()) {
      collector.reportToSlack(); // Fire-and-forget
    }

    return new Response(JSON.stringify({ success: true, data: result }), { ... });

  } catch (error) {
    console.error(`[proposal] ========== ERROR ==========`);
    console.error(`[proposal]`, error);

    // 4. Add final error and report to Slack
    if (collector) {
      collector.add(error as Error, 'Fatal error in main handler');
      collector.reportToSlack(); // Fire-and-forget - does NOT block response
    }

    const statusCode = getStatusCodeFromError(error as Error);
    const errorResponse = formatErrorResponse(error as Error);

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Phase 4: Update Existing Slack Edge Function

Update `slack/index.ts` to use the shared utility for its own webhook operations:

```typescript
// Import from shared
import { sendToSlack } from '../_shared/slack.ts';

// In handleFaqInquiry:
sendToSlack('acquisition', slackMessage);
sendToSlack('general', slackMessage);
```

---

## Files to Modify/Create

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/slack.ts` | **Shared Slack utility with ErrorCollector class** |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/bubble-proxy/index.ts` | Add ErrorCollector integration |
| `supabase/functions/auth-user/index.ts` | Add ErrorCollector integration |
| `supabase/functions/ai-gateway/index.ts` | Add ErrorCollector integration |
| `supabase/functions/bubble_sync/index.ts` | Add ErrorCollector integration |
| `supabase/functions/proposal/index.ts` | Add ErrorCollector integration |
| `supabase/functions/listing/index.ts` | Add ErrorCollector integration |
| `supabase/functions/communications/index.ts` | Add ErrorCollector integration |
| `supabase/functions/pricing/index.ts` | Add ErrorCollector integration |
| `supabase/functions/slack/index.ts` | Use shared `sendToSlack()` function |

### Secrets to Add

| Secret | Value |
|--------|-------|
| `SLACK_WEBHOOK_ERRORS` | Slack webhook URL for #errors channel |

---

## Slack Message Format (Example Output)

### Single Error Case
```
🫧 proposal/create - 1 error
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Function:     proposal
Action:       create
Severity:     🔴 High (System)
Request ID:   a1b2c3d4

───────────────────────────────────────

Error 1: BubbleApiError
Context: During Bubble sync
```
Failed to sync proposal to Bubble: API returned 500
```

Started: 2025-12-10T22:15:30.000Z | User: user_abc123
```

### Multiple Errors Case
```
🚨 bubble_sync/process_queue - 3 errors
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Function:     bubble_sync
Action:       process_queue
Severity:     🔴 High (System)
Request ID:   e5f6g7h8

───────────────────────────────────────

Error 1: SupabaseSyncError
Context: Fetching queue items
```
Failed to query sync_queue table
```

Error 2: BubbleApiError
Context: Processing item #1
```
Bubble API timeout after 30s
```

Error 3: BubbleApiError
Context: Processing item #2
```
Bubble API returned 429 (rate limited)
```

Started: 2025-12-10T22:20:00.000Z
```

---

## Performance Analysis

### Why Fire-and-Forget Has ZERO Impact

```typescript
// This is what happens:
collector.reportToSlack();  // Initiates fetch, does NOT await
return new Response(...);   // Returns immediately to client

// The fetch continues in the background after response is sent
// Edge Function worker handles completion asynchronously
```

### Timing Comparison

| Approach | Added Latency |
|----------|---------------|
| Synchronous (await) | +100-500ms ❌ |
| Fire-and-forget | +0ms ✅ |

### Memory Impact

- ErrorCollector holds error references (minimal)
- Errors are typically < 1KB each
- Max 5 errors shown in Slack (rest truncated)
- Garbage collected after request ends

---

## Testing Plan

1. **Unit Test**: Mock `fetch` and verify consolidated message format
2. **Integration Test**: Deploy to staging and trigger multiple errors
3. **End-to-End Test**: Verify Slack channel receives ONE message
4. **Failure Test**: Remove webhook secret, verify graceful degradation
5. **Performance Test**: Verify no added latency to response time

---

## Success Criteria

- [x] Shared `_shared/slack.ts` utility created
- [ ] All 9 Edge Functions integrated with ErrorCollector
- [ ] Slack channel receives **ONE** formatted message per request
- [ ] **ZERO** impact on response latency (fire-and-forget)
- [ ] Graceful fallback when webhook not configured
- [ ] No circular error loops (slack function doesn't report its own errors to slack)

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
| Phase 2: Shared Slack Utility | 2 hours | None |
| Phase 3: Integration | 3 hours | Phase 2 |
| Phase 4: Testing | 2 hours | Phase 3 |
| **Total** | **~8 hours** | |

---

## Key Design Decisions

### 1. Why Consolidated Messages?

- **Noise Reduction**: One message per request, not per error
- **Context Preservation**: All errors from a request shown together
- **Slack Rate Limits**: Fewer messages = no rate limit concerns
- **Readability**: Easier to understand error context

### 2. Why Fire-and-Forget?

- **Zero Latency Impact**: User response is not delayed
- **Fail-Safe**: If Slack is down, main functionality works
- **Non-Critical**: Error logging is monitoring, not business logic

### 3. Why Shared Utility in `_shared/`?

- **Single Source of Truth**: All webhook logic in one place
- **Consistent Formatting**: Same message structure everywhere
- **Easy Updates**: Change format once, applies everywhere
- **Follows Existing Pattern**: Matches `_shared/errors.ts`, `_shared/cors.ts`

---

## Conclusion

This implementation is **highly feasible** and addresses all requirements:
- **Shared Slack utility** in `_shared/slack.ts`
- **Zero performance impact** via fire-and-forget pattern
- **One consolidated error message** per Edge Function invocation

**Recommendation**: Proceed with implementation.

---

## Files Reference

| File | Line | Purpose |
|------|------|---------|
| `supabase/functions/_shared/errors.ts` | 58-84 | Current error formatting |
| `supabase/functions/slack/index.ts` | 209-234 | Existing webhook pattern |
| `supabase/functions/proposal/index.ts` | 183-193 | Example catch block to update |
