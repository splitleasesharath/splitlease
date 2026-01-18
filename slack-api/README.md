# Slack API Client for Split Lease

Full Slack Web API access for sending messages, uploading files, and sharing screenshots - capabilities beyond simple webhooks.

## Why Not Webhooks?

Slack Incoming Webhooks are limited to:
- Text messages
- Block Kit formatting
- **No file uploads**
- **No screenshots**

The Slack Web API enables:
- File uploads (images, documents, etc.)
- Screenshot sharing
- Thread management
- Channel listing
- And much more

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it (e.g., "Split Lease Bot") and select your workspace

### 2. Configure OAuth Scopes

Navigate to **OAuth & Permissions** and add these Bot Token Scopes:

| Scope | Purpose |
|-------|---------|
| `chat:write` | Send messages |
| `files:write` | Upload files/screenshots |
| `channels:read` | List public channels |
| `groups:read` | List private channels (optional) |

### 3. Install to Workspace

1. Click "Install to Workspace" at the top of OAuth & Permissions
2. Authorize the app
3. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 4. Set Environment Variable

```bash
# Add to your .env file
SLACK_BOT_TOKEN=xoxb-your-token-here
```

### 5. Invite Bot to Channels

The bot must be invited to channels before it can post:
```
/invite @YourBotName
```

## Installation

```bash
cd slack-api
bun install
```

## Usage

### Basic Setup

```typescript
import { SlackClient, createSlackClientFromEnv } from './slack-api';

// From environment variables (recommended)
const slack = createSlackClientFromEnv();

// Or with explicit config
const slack = new SlackClient({
  botToken: 'xoxb-...',
  defaultChannel: '#dev-alerts',
});
```

### Send a Message

```typescript
await slack.sendMessage({
  channel: '#dev-alerts',
  text: 'Deployment complete! :rocket:',
});
```

### Upload a Screenshot

```typescript
// From a Buffer (e.g., from Playwright)
const screenshot = await page.screenshot();
await slack.uploadScreenshot({
  channels: '#dev-alerts',
  screenshot,
  title: 'Current Dashboard State',
  comment: 'After the latest deployment',
});

// From a file path
await slack.uploadScreenshot({
  channels: '#dev-alerts',
  screenshot: './screenshots/error.png',
  title: 'Error Screenshot',
});
```

### Send Message with Screenshot

```typescript
// Combines message + screenshot in a thread
await slack.sendMessageWithScreenshot(
  '#dev-alerts',
  'Found an issue with the checkout flow:',
  screenshotBuffer,
  { title: 'Checkout Error' }
);
```

### Upload Any File

```typescript
await slack.uploadFile({
  channels: '#dev-alerts',
  file: Buffer.from(jsonData),
  filename: 'report.json',
  title: 'Daily Report',
  initialComment: 'Here is today\'s report',
});
```

### List Available Channels

```typescript
const channels = await slack.listChannels();
console.log(channels);
// [{ id: 'C123...', name: 'general' }, ...]
```

## Integration with Playwright MCP

This pairs perfectly with the Playwright MCP for automated screenshot reporting:

```typescript
// In a test or automation script
import { createSlackClientFromEnv } from '../slack-api';

const slack = createSlackClientFromEnv();

// Take screenshot with Playwright MCP
const screenshot = await mcp__playwright__browser_take_screenshot({
  fullPage: true
});

// Send to Slack
await slack.uploadScreenshot({
  channels: '#automated-reports',
  screenshot: Buffer.from(screenshot, 'base64'),
  title: 'Automated Test Result',
  comment: 'Daily E2E test completed',
});
```

## API Reference

### `SlackClient`

| Method | Description |
|--------|-------------|
| `sendMessage(options)` | Send a text message |
| `uploadFile(options)` | Upload any file |
| `uploadScreenshot(options)` | Upload a screenshot (convenience method) |
| `sendMessageWithScreenshot(channel, message, screenshot, options?)` | Send message + screenshot in thread |
| `listChannels()` | List accessible channels |
| `getWebClient()` | Get underlying `@slack/web-api` client |

### `createSlackClientFromEnv(defaultChannel?)`

Creates a client using `SLACK_BOT_TOKEN` environment variable.

## Troubleshooting

| Error | Solution |
|-------|----------|
| `not_in_channel` | Invite the bot with `/invite @BotName` |
| `missing_scope` | Add required scope in Slack App settings |
| `invalid_auth` | Check your `SLACK_BOT_TOKEN` is correct |
| `channel_not_found` | Use channel ID (C123...) instead of name |
