/**
 * Slack Web API Client for Split Lease
 *
 * Provides full Slack API access including file uploads and screenshots
 * that are not possible with simple webhooks.
 */

import { WebClient } from '@slack/web-api';
import * as fs from 'fs';
import * as path from 'path';
import type {
  SlackConfig,
  SendMessageOptions,
  UploadFileOptions,
  UploadScreenshotOptions,
  SlackResponse,
} from './types';

export class SlackClient {
  private client: WebClient;
  private defaultChannel?: string;

  constructor(config: SlackConfig) {
    this.client = new WebClient(config.botToken);
    this.defaultChannel = config.defaultChannel;
  }

  /**
   * Send a text message to a channel
   */
  async sendMessage(options: SendMessageOptions): Promise<SlackResponse> {
    const result = await this.client.chat.postMessage({
      channel: options.channel,
      text: options.text,
      thread_ts: options.threadTs,
      blocks: options.blocks,
    });

    return {
      ok: result.ok ?? false,
      error: result.error,
      ts: result.ts,
    };
  }

  /**
   * Upload a file to Slack
   * Supports both Buffer and file path
   */
  async uploadFile(options: UploadFileOptions): Promise<SlackResponse> {
    const channels = Array.isArray(options.channels)
      ? options.channels.join(',')
      : options.channels;

    // Handle file as Buffer or path
    let fileContent: Buffer;
    if (Buffer.isBuffer(options.file)) {
      fileContent = options.file;
    } else {
      fileContent = fs.readFileSync(options.file);
    }

    const result = await this.client.files.uploadV2({
      channel_id: channels,
      file: fileContent,
      filename: options.filename,
      title: options.title,
      initial_comment: options.initialComment,
      thread_ts: options.threadTs,
    });

    const file = result.file ?? (result as any).files?.[0];

    return {
      ok: result.ok ?? false,
      error: result.error,
      file: file
        ? {
            id: file.id,
            name: file.name,
            permalink: file.permalink,
          }
        : undefined,
    };
  }

  /**
   * Upload a screenshot to Slack
   * Convenience method with sensible defaults for screenshots
   */
  async uploadScreenshot(options: UploadScreenshotOptions): Promise<SlackResponse> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = options.filename ?? `screenshot-${timestamp}.png`;

    return this.uploadFile({
      channels: options.channels,
      file: options.screenshot,
      filename,
      title: options.title ?? 'Screenshot',
      initialComment: options.comment,
      threadTs: options.threadTs,
    });
  }

  /**
   * Send a message with an attached screenshot in one call
   */
  async sendMessageWithScreenshot(
    channel: string,
    message: string,
    screenshot: Buffer | string,
    options?: {
      filename?: string;
      title?: string;
      threadTs?: string;
    }
  ): Promise<{ message: SlackResponse; file: SlackResponse }> {
    // Send message first
    const messageResult = await this.sendMessage({
      channel,
      text: message,
      threadTs: options?.threadTs,
    });

    // Upload screenshot in the same thread
    const fileResult = await this.uploadScreenshot({
      channels: channel,
      screenshot,
      filename: options?.filename,
      title: options?.title,
      threadTs: messageResult.ts ?? options?.threadTs,
    });

    return {
      message: messageResult,
      file: fileResult,
    };
  }

  /**
   * Get list of channels the bot has access to
   */
  async listChannels(): Promise<Array<{ id: string; name: string }>> {
    const result = await this.client.conversations.list({
      types: 'public_channel,private_channel',
    });

    return (
      result.channels?.map((ch) => ({
        id: ch.id ?? '',
        name: ch.name ?? '',
      })) ?? []
    );
  }

  /**
   * Get the underlying WebClient for advanced operations
   */
  getWebClient(): WebClient {
    return this.client;
  }
}

/**
 * Create a SlackClient from environment variables
 * Expects SLACK_BOT_TOKEN to be set
 */
export function createSlackClientFromEnv(defaultChannel?: string): SlackClient {
  const botToken = process.env.SLACK_BOT_TOKEN;

  if (!botToken) {
    throw new Error(
      'SLACK_BOT_TOKEN environment variable is required. ' +
        'Get it from https://api.slack.com/apps → Your App → OAuth & Permissions'
    );
  }

  return new SlackClient({
    botToken,
    defaultChannel,
  });
}
