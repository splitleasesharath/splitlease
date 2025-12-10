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

// Types
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

// Webhook Configuration
export type SlackChannel = 'database' | 'acquisition' | 'general';

const CHANNEL_ENV_MAP: Record<SlackChannel, string> = {
  database: 'SLACK_WEBHOOK_DATABASE_WEBHOOK',
  acquisition: 'SLACK_WEBHOOK_ACQUISITION',
  general: 'SLACK_WEBHOOK_GENERAL',
};

function getWebhookUrl(channel: SlackChannel): string | null {
  const envVar = CHANNEL_ENV_MAP[channel];
  return Deno.env.get(envVar) || null;
}

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

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  }).catch((e) => {
    console.error('[slack] Failed to send message:', e.message);
  });
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

    const message = this.formatConsolidatedMessage();
    sendToSlack('database', message);
  }

  private formatConsolidatedMessage(): SlackMessage {
    const primaryError = this.errors[0].error;
    const emoji = this.getErrorEmoji(primaryError);
    const severity = this.getErrorSeverity(primaryError);
    const errorCount = this.errors.length;

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${this.functionName}/${this.action} - ${errorCount} error${errorCount > 1 ? 's' : ''}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Function:*\n\`${this.functionName}\`` },
          { type: 'mrkdwn', text: `*Action:*\n\`${this.action}\`` },
          { type: 'mrkdwn', text: `*Severity:*\n${severity}` },
          { type: 'mrkdwn', text: `*Request ID:*\n\`${this.requestId}\`` },
        ],
      },
      { type: 'divider' },
    ];

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

    if (this.errors.length > 5) {
      blocks.push({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `_+ ${this.errors.length - 5} more errors (check Supabase logs)_` },
        ],
      });
    }

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

export function createErrorCollector(functionName: string, action: string): ErrorCollector {
  return new ErrorCollector(functionName, action);
}
