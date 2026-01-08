/**
 * Shared Slack Utilities
 * Split Lease - Edge Functions
 *
 * Centralized Slack webhook operations for all Edge Functions
 *
 * PERFORMANCE: Fire-and-forget pattern - ZERO latency impact
 * CONSOLIDATION: One message per request, not per error
 * WEBHOOK: Uses SLACK_WEBHOOK_DATABASE_WEBHOOK for all error logs
 * BOT API: Uses SLACK_BOT_TOKEN for interactive messages with buttons/modals
 *
 * @module _shared/slack
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const LOG_PREFIX = '[slack]'
const SLACK_API_BASE_URL = 'https://slack.com/api'
const MAX_ERRORS_SHOWN = 5

/**
 * Slack channel types
 * @immutable
 */
export const SLACK_CHANNELS = Object.freeze([
  'database',
  'acquisition',
  'general',
] as const)

export type SlackChannel = typeof SLACK_CHANNELS[number]

/**
 * Channel to environment variable mapping
 * @immutable
 */
const CHANNEL_ENV_MAP = Object.freeze({
  database: 'SLACK_WEBHOOK_DATABASE_WEBHOOK',
  acquisition: 'SLACK_WEBHOOK_ACQUISITION',
  general: 'SLACK_WEBHOOK_DB_GENERAL',
} as const) satisfies Record<SlackChannel, string>

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SlackMessage {
  readonly text: string;
}

interface SlackBlock {
  readonly type: string;
  readonly [key: string]: unknown;
}

interface SlackInteractiveResult {
  readonly ok: boolean;
  readonly ts?: string;
  readonly error?: string;
}

interface CollectedError {
  readonly error: Error;
  readonly context?: string;
  readonly timestamp: string;
}

// ─────────────────────────────────────────────────────────────
// Validation Predicates
// ─────────────────────────────────────────────────────────────

/**
 * Check if webhook URL is configured
 * @pure
 */
const hasWebhookUrl = (url: string | undefined): url is string =>
  url !== undefined && url.length > 0

/**
 * Check if bot token is configured
 * @pure
 */
const hasBotToken = (token: string | undefined): token is string =>
  token !== undefined && token.length > 0

/**
 * Check if there are errors to report
 * @pure
 */
const hasErrorsToReport = (errors: ReadonlyArray<CollectedError>): boolean =>
  errors.length > 0

// ─────────────────────────────────────────────────────────────
// Webhook URL Retrieval
// ─────────────────────────────────────────────────────────────

/**
 * Get webhook URL for a channel
 * @effectful (reads environment)
 */
function getWebhookUrl(channel: SlackChannel): string | null {
  const envVar = CHANNEL_ENV_MAP[channel];
  const url = Deno.env.get(envVar);
  return hasWebhookUrl(url) ? url : null;
}

// ─────────────────────────────────────────────────────────────
// Webhook Functions
// ─────────────────────────────────────────────────────────────

/**
 * Send message to Slack channel
 * Fire-and-forget - does not await, does not throw
 * @effectful (network I/O, console logging)
 */
export function sendToSlack(channel: SlackChannel, message: SlackMessage): void {
  const webhookUrl = getWebhookUrl(channel);

  if (!webhookUrl) {
    console.warn(`${LOG_PREFIX} ${CHANNEL_ENV_MAP[channel]} not configured, skipping notification`);
    return;
  }

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  }).catch((e) => {
    console.error(`${LOG_PREFIX} Failed to send message:`, e.message);
  });
}

// ─────────────────────────────────────────────────────────────
// Bot API Functions (for interactive messages)
// ─────────────────────────────────────────────────────────────

/**
 * Build success result for Slack API
 * @pure
 */
const buildSuccessResult = (ts: string): SlackInteractiveResult =>
  Object.freeze({ ok: true, ts })

/**
 * Build error result for Slack API
 * @pure
 */
const buildErrorResult = (error: string): SlackInteractiveResult =>
  Object.freeze({ ok: false, error })

/**
 * Send interactive message using Slack Bot API
 * Unlike webhooks, this supports buttons/modals and returns message_ts
 *
 * Requires: SLACK_BOT_TOKEN and SLACK_COHOST_CHANNEL_ID secrets
 * @effectful (network I/O, environment reads, console logging)
 */
export async function sendInteractiveMessage(
  channelId: string,
  blocks: SlackBlock[],
  text: string
): Promise<SlackInteractiveResult> {
  const token = Deno.env.get('SLACK_BOT_TOKEN');

  if (!hasBotToken(token)) {
    console.error(`${LOG_PREFIX} SLACK_BOT_TOKEN not configured`);
    return buildErrorResult('Bot token not configured');
  }

  try {
    const response = await fetch(`${SLACK_API_BASE_URL}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        blocks,
        text, // Fallback text for notifications
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error(`${LOG_PREFIX} Bot API error:`, result.error);
      return buildErrorResult(result.error);
    }

    return buildSuccessResult(result.ts);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to send interactive message:`, error);
    return buildErrorResult((error as Error).message);
  }
}

/**
 * Update an existing Slack message
 * Used to update the original request message after admin claims it
 * @effectful (network I/O, environment reads)
 */
export async function updateSlackMessage(
  channelId: string,
  messageTs: string,
  blocks: SlackBlock[],
  text: string
): Promise<SlackInteractiveResult> {
  const token = Deno.env.get('SLACK_BOT_TOKEN');

  if (!hasBotToken(token)) {
    return buildErrorResult('Bot token not configured');
  }

  try {
    const response = await fetch(`${SLACK_API_BASE_URL}/chat.update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        ts: messageTs,
        blocks,
        text,
      }),
    });

    const result = await response.json();
    return result.ok
      ? buildSuccessResult(result.ts)
      : buildErrorResult(result.error);
  } catch (error) {
    return buildErrorResult((error as Error).message);
  }
}

/**
 * ErrorCollector - Accumulates errors during a request lifecycle
 * ONE RUN = ONE LOG (only if errors exist)
 */
export class ErrorCollector {
  private functionName: string;
  private action: string;
  private requestId: string;
  private errors: CollectedError[] = [];
  private startTime: string;
  private userId?: string;

  constructor(functionName: string, action: string) {
    this.functionName = functionName;
    this.action = action;
    this.requestId = crypto.randomUUID().slice(0, 8);
    this.startTime = new Date().toISOString();
  }

  setContext(options: { userId?: string }): void {
    if (options.userId) this.userId = options.userId;
  }

  add(error: Error, context?: string): void {
    this.errors.push({
      error,
      context,
      timestamp: new Date().toISOString(),
    });
    console.error(`[${this.functionName}] Error collected:`, error.message, context || '');
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  getPrimaryError(): Error | null {
    return this.errors.length > 0 ? this.errors[0].error : null;
  }

  reportToSlack(): void {
    if (this.errors.length === 0) {
      return;
    }

    const message = this.formatPlainTextMessage();
    sendToSlack('database', message);
  }

  /**
   * Format all errors into a simple plain text message
   */
  private formatPlainTextMessage(): SlackMessage {
    const errorCount = this.errors.length;
    const lines: string[] = [];

    // Header line
    lines.push(`[Edge Function Error] ${this.functionName}/${this.action}`);
    lines.push('');

    // Basic info
    lines.push(`Request ID: ${this.requestId}`);
    lines.push(`Timestamp: ${this.startTime}`);
    if (this.userId) {
      lines.push(`User ID: ${this.userId}`);
    }
    lines.push('');

    // Errors
    if (errorCount === 1) {
      const err = this.errors[0];
      lines.push(`Error Type: ${err.error.name}`);
      lines.push(`Message: ${err.error.message}`);
      if (err.context) {
        lines.push(`Context: ${err.context}`);
      }
    } else {
      lines.push(`Total Errors: ${errorCount}`);
      lines.push('');

      // Show up to 5 errors
      const errorsToShow = this.errors.slice(0, 5);
      errorsToShow.forEach((err, index) => {
        lines.push(`--- Error ${index + 1} ---`);
        lines.push(`Type: ${err.error.name}`);
        lines.push(`Message: ${err.error.message}`);
        if (err.context) {
          lines.push(`Context: ${err.context}`);
        }
        lines.push('');
      });

      if (errorCount > 5) {
        lines.push(`... and ${errorCount - 5} more errors (check Supabase logs)`);
      }
    }

    return {
      text: lines.join('\n'),
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Convenience Export
// ─────────────────────────────────────────────────────────────

/**
 * Create error collector for a request
 * Convenience function for cleaner imports
 *
 * @deprecated Use createErrorLog() from './fp/errorLog.ts' for new code
 */
export function createErrorCollector(functionName: string, action: string): ErrorCollector {
  return new ErrorCollector(functionName, action);
}

// ─────────────────────────────────────────────────────────────
// Functional API (FP-Friendly)
// ─────────────────────────────────────────────────────────────
//
// Use these functions with the immutable ErrorLog type from './fp/errorLog.ts'
// for pure functional error handling. The ErrorCollector class above is
// maintained for backward compatibility only.

import { ErrorLog, formatForSlack, hasErrors } from './fp/errorLog.ts';

/**
 * Report an immutable ErrorLog to Slack
 * Side effect function - use at effect boundaries only
 *
 * @param log - Immutable ErrorLog to report
 * @effectful (network I/O via sendToSlack)
 */
export function reportErrorLog(log: ErrorLog): void {
  if (!hasErrors(log)) {
    return;
  }

  const message = { text: formatForSlack(log) };
  sendToSlack('database', message);
}

// ─────────────────────────────────────────────────────────────
// Exported Test Constants
// ─────────────────────────────────────────────────────────────

/**
 * Exported for testing purposes
 * @test
 */
export const __test__ = Object.freeze({
  // Constants
  LOG_PREFIX,
  SLACK_API_BASE_URL,
  MAX_ERRORS_SHOWN,
  SLACK_CHANNELS,
  CHANNEL_ENV_MAP,

  // Predicates
  hasWebhookUrl,
  hasBotToken,
  hasErrorsToReport,

  // Builders
  buildSuccessResult,
  buildErrorResult,

  // Functions
  getWebhookUrl,
})
