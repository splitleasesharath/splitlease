/**
 * Slack API Types for Split Lease
 */

export interface SlackConfig {
  /** Bot User OAuth Token (xoxb-...) */
  botToken: string;
  /** Default channel for messages */
  defaultChannel?: string;
}

export interface SendMessageOptions {
  /** Channel ID or name (e.g., #general or C1234567890) */
  channel: string;
  /** Message text (supports markdown) */
  text: string;
  /** Optional thread timestamp to reply in thread */
  threadTs?: string;
  /** Optional blocks for rich formatting */
  blocks?: SlackBlock[];
}

export interface UploadFileOptions {
  /** Channel(s) to share the file to */
  channels: string | string[];
  /** File content as Buffer or path to file */
  file: Buffer | string;
  /** Filename to display in Slack */
  filename: string;
  /** Optional title for the file */
  title?: string;
  /** Optional initial comment */
  initialComment?: string;
  /** Optional thread timestamp to upload in thread */
  threadTs?: string;
}

export interface UploadScreenshotOptions {
  /** Channel(s) to share the screenshot to */
  channels: string | string[];
  /** Screenshot as Buffer (PNG/JPEG) or file path */
  screenshot: Buffer | string;
  /** Optional custom filename (defaults to timestamp) */
  filename?: string;
  /** Optional title */
  title?: string;
  /** Optional comment to accompany the screenshot */
  comment?: string;
  /** Optional thread timestamp */
  threadTs?: string;
}

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export interface SlackResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  file?: {
    id: string;
    name: string;
    permalink: string;
  };
}
