/**
 * Upload Screenshot to Slack
 *
 * Usage: bun run scripts/upload-screenshot.ts <filepath> [channel] [comment]
 *
 * Arguments:
 *   filepath - Path to the screenshot file
 *   channel  - Slack channel (optional, uses SLACK_DEFAULT_CHANNEL)
 *   comment  - Comment to accompany the screenshot (optional)
 */

import { SlackClient } from '../src/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

async function uploadScreenshot() {
  const [, , filepath, channel, ...commentParts] = process.argv;
  const comment = commentParts.join(' ');

  // Validate filepath
  if (!filepath) {
    console.error('❌ Usage: bun run upload-screenshot.ts <filepath> [channel] [comment]');
    process.exit(1);
  }

  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    process.exit(1);
  }

  // Get config from environment
  const botToken = process.env.SLACK_BOT_TOKEN;
  const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL;
  const targetChannel = channel || defaultChannel;

  if (!botToken) {
    console.error('❌ SLACK_BOT_TOKEN not set in environment');
    process.exit(1);
  }

  if (!targetChannel) {
    console.error('❌ No channel specified and SLACK_DEFAULT_CHANNEL not set');
    process.exit(1);
  }

  // Initialize client
  const slack = new SlackClient({ botToken });

  console.log(`📤 Uploading screenshot to ${targetChannel}...`);

  try {
    // Read file
    const fileBuffer = fs.readFileSync(filepath);
    const filename = path.basename(filepath);

    // Use sendMessageWithScreenshot - it works with channel names
    // because chat.postMessage accepts names, then attaches file to that thread
    const messageText = comment || `📸 Screenshot: ${filename}`;
    const result = await slack.sendMessageWithScreenshot(
      targetChannel,
      messageText,
      fileBuffer,
      {
        filename,
        title: filename,
      }
    );

    if (result.message.ok) {
      console.log(`✅ Screenshot uploaded successfully!`);
      if (result.file.file?.permalink) {
        console.log(`🔗 ${result.file.file.permalink}`);
      }

      // Output JSON for programmatic use
      console.log(JSON.stringify({
        success: true,
        channel: targetChannel,
        filename,
        messageTs: result.message.ts,
        permalink: result.file.file?.permalink,
      }));
    } else {
      console.error(`❌ Upload failed: ${result.message.error || result.file.error}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);

    if (error.message.includes('not_in_channel')) {
      console.error(`   → Bot not in channel. Run: /invite @YourBotName in ${targetChannel}`);
    } else if (error.message.includes('channel_not_found')) {
      console.error(`   → Channel "${targetChannel}" not found. Check the channel name.`);
    }

    process.exit(1);
  }
}

uploadScreenshot();
