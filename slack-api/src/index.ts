/**
 * Slack API Module for Split Lease
 *
 * Full Slack Web API access for sending messages, uploading files,
 * and sharing screenshots - capabilities beyond simple webhooks.
 *
 * @example
 * ```typescript
 * import { SlackClient, createSlackClientFromEnv } from './slack-api';
 *
 * // From environment variables
 * const slack = createSlackClientFromEnv();
 *
 * // Or with explicit config
 * const slack = new SlackClient({ botToken: 'xoxb-...' });
 *
 * // Send a message
 * await slack.sendMessage({
 *   channel: '#dev-alerts',
 *   text: 'Deployment complete!',
 * });
 *
 * // Upload a screenshot
 * await slack.uploadScreenshot({
 *   channels: '#dev-alerts',
 *   screenshot: screenshotBuffer,
 *   comment: 'Current state of the dashboard',
 * });
 * ```
 */

export { SlackClient, createSlackClientFromEnv } from './client';
export type {
  SlackConfig,
  SendMessageOptions,
  UploadFileOptions,
  UploadScreenshotOptions,
  SlackBlock,
  SlackResponse,
} from './types';
