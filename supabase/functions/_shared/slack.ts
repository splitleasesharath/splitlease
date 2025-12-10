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

    const message = this.formatConsolidatedMessage();
    sendToSlack('database', message);
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
          text: `Started: ${this.startTime}${this.userId ? ` | User: \`${this.userId}\`` : ''}`,
        },
      ],
    });

    return {
      text: `${emoji} Error in ${this.functionName}/${this.action}`,
      blocks,
    };
  }

  private getErrorEmoji(error: Error): string {
    switch (error.name) {
      case 'ValidationError':
        return '⚠️';
      case 'AuthenticationError':
        return '🔐';
      case 'BubbleApiError':
        return '🫧';
      case 'SupabaseSyncError':
        return '🔄';
      case 'OpenAIError':
        return '🤖';
      default:
        return '🚨';
    }
  }

  private getErrorSeverity(error: Error): string {
    switch (error.name) {
      case 'ValidationError':
        return '🟡 Low (User Input)';
      case 'AuthenticationError':
        return '🟠 Medium (Auth)';
      default:
        return '🔴 High (System)';
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
