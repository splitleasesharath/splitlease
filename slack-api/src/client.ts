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
  private channelCache: Map<string, string> = new Map();

  constructor(config: SlackConfig) {
    this.client = new WebClient(config.botToken);
    this.defaultChannel = config.defaultChannel;
  }

  /**
   * Resolve a channel name to its ID
   * Accepts: #channel-name, channel-name, or C1234567890 (already an ID)
   */
  private async resolveChannelId(channel: string): Promise<string> {
    // Already a channel ID (starts with C, G, or D and is alphanumeric)
    if (/^[CGD][A-Z0-9]{8,}$/i.test(channel)) {
      return channel;
    }

    // Remove # prefix if present
    const channelName = channel.replace(/^#/, '');

    // Check cache first
    if (this.channelCache.has(channelName)) {
      return this.channelCache.get(channelName)!;
    }

    // Look up channel by posting a test message (most reliable method)
    // This works because chat.postMessage accepts channel names
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 1000,
      });

      const found = result.channels?.find(
        (ch) => ch.name === channelName || ch.id === channel
      );

      if (found?.id) {
        this.channelCache.set(channelName, found.id);
        return found.id;
      }
    } catch {
      // If conversations.list fails (missing scope), try to get channel info directly
    }

    // Fallback: return as-is and let the API handle it
    return channel;
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
      channel: result.channel, // Return channel ID for subsequent operations
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
   * Uses chat.postMessage first (accepts channel names), then uses the
   * returned channel ID for file upload (which requires channel IDs)
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
    // Send message first - chat.postMessage accepts channel names
    const messageResult = await this.sendMessage({
      channel,
      text: message,
      threadTs: options?.threadTs,
    });

    // Use the channel ID from the message response for file upload
    // files.uploadV2 requires actual channel IDs, not names
    const channelId = messageResult.channel ?? channel;

    // Upload screenshot in the same thread
    const fileResult = await this.uploadScreenshot({
      channels: channelId,
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
