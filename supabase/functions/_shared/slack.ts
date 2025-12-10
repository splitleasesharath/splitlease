/**
 * Shared Slack Utilities
 * Split Lease - Edge Functions
 *
 * Centralized Slack webhook operations for all Edge Functions
 *
 * PERFORMANCE: Fire-and-forget pattern - ZERO latency impact
 * CONSOLIDATION: One message per request, not per error
 * WEBHOOK: Uses SLACK_WEBHOOK_DATABASE_WEBHOOK for all error logs
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SlackMessage {
  text: string;
}

interface CollectedError {
  error: Error;
  context?: string;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────
// Webhook Configuration
// ─────────────────────────────────────────────────────────────

export type SlackChannel = 'database' | 'acquisition' | 'general';

const CHANNEL_ENV_MAP: Record<SlackChannel, string> = {
  database: 'SLACK_WEBHOOK_DATABASE_WEBHOOK',
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
 * ONE RUN = ONE LOG (only if errors exist)
 *
 * Usage:
 *   const collector = createErrorCollector('proposal', 'create');
 *
 *   try {
 *     // ... business logic
 *     collector.add(someError, 'During validation');
 *   } catch (error) {
 *     collector.add(error, 'Fatal error');
 *     collector.reportToSlack(); // Fire-and-forget, sends ONE message
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

  constructor(functionName: string, action: string) {
    this.functionName = functionName;
    this.action = action;
    this.requestId = crypto.randomUUID().slice(0, 8);
    this.startTime = new Date().toISOString();
  }

  /**
   * Set optional context for better error reports
   */
  setContext(options: { userId?: string }): void {
    if (options.userId) this.userId = options.userId;
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
   * Get error count
   */
  getErrorCount(): number {
    return this.errors.length;
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
   *
   * Uses SLACK_WEBHOOK_DATABASE_WEBHOOK channel
   */
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
 */
export function createErrorCollector(functionName: string, action: string): ErrorCollector {
  return new ErrorCollector(functionName, action);
}
