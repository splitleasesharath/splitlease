/**
 * Quick test to verify Slack API connection
 * Run: bun run test-connection.ts
 */

import { SlackClient } from './src/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function testConnection() {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL;

  console.log('🔍 Checking environment...');
  console.log(`   SLACK_BOT_TOKEN: ${botToken ? '✅ Set (' + botToken.slice(0, 10) + '...)' : '❌ Missing'}`);
  console.log(`   SLACK_DEFAULT_CHANNEL: ${defaultChannel || '(not set)'}`);

  if (!botToken) {
    console.error('\n❌ SLACK_BOT_TOKEN is required. Add it to your .env file.');
    process.exit(1);
  }

  const slack = new SlackClient({ botToken, defaultChannel });

  console.log('\n📡 Testing API connection...');

  try {
    // Test: Send a test message if default channel is set
    if (defaultChannel) {
      console.log(`\n📤 Sending test message to ${defaultChannel}...`);
      const result = await slack.sendMessage({
        channel: defaultChannel,
        text: '✅ *Slack API Test*\n\nConnection successful! The Split Lease Slack API is working.',
      });

      if (result.ok) {
        console.log(`   ✅ Message sent successfully! (ts: ${result.ts})`);
      } else {
        console.log(`   ❌ Failed to send: ${result.error}`);
      }
    }

    console.log('\n🎉 All tests passed! Your Slack API is ready to use.');
  } catch (error: any) {
    console.error('\n❌ API Error:', error.message);

    if (error.message.includes('invalid_auth')) {
      console.error('   → Your SLACK_BOT_TOKEN is invalid. Check it at api.slack.com/apps');
    } else if (error.message.includes('not_in_channel')) {
      console.error(`   → Bot is not in channel ${defaultChannel}. Run: /invite @YourBotName`);
    } else if (error.message.includes('channel_not_found')) {
      console.error(`   → Channel "${defaultChannel}" not found. Use channel ID (C...) or invite bot first.`);
    }

    process.exit(1);
  }
}

testConnection();
