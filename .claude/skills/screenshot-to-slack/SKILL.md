---
name: screenshot-to-slack
description: |
  Capture screenshots with Playwright and send them to Slack with context.
  Use this skill when you need to:
  (1) Share visual evidence of a bug, UI state, or test result
  (2) Document the current state of a page for review
  (3) Send automated screenshot reports during E2E testing
  (4) Provide visual context for debugging discussions
  Triggers: "screenshot to slack", "send screenshot", "capture and share", "share this page"
---

# Screenshot to Slack

Capture a screenshot using Playwright MCP and upload it to Slack with an optional comment.

## Usage

```
/screenshot-to-slack <url> [channel] [comment]
```

**Arguments:**
- `url` (required): The URL to capture OR "current" to use the current page
- `channel` (optional): Slack channel (defaults to `SLACK_DEFAULT_CHANNEL` from .env)
- `comment` (optional): Message to accompany the screenshot

## Workflow

### Step 1: Determine Target

Parse the arguments:
- If URL is "current" or empty, use the already-open Playwright page
- Otherwise, navigate to the specified URL first

### Step 2: Capture Screenshot

Use Playwright MCP to take a screenshot. Save to a temp file:

```
Screenshot filename pattern: screenshot-{timestamp}.png
Location: C:/Users/Split Lease/Documents/Split Lease/slack-api/tmp/
```

Use the appropriate Playwright MCP based on context:
- `playwright-host-dev` for development/localhost URLs
- `playwright-host-live` for production URLs
- `playwright-guest-dev` for unauthenticated dev testing
- `playwright-guest-live` for unauthenticated production testing

**MCP Call Pattern:**
```
mcp__playwright-host-dev__browser_take_screenshot({
  filename: "C:/Users/Split Lease/Documents/Split Lease/slack-api/tmp/screenshot-{timestamp}.png",
  fullPage: false
})
```

### Step 3: Upload to Slack

Run the upload script:

```bash
cd "C:/Users/Split Lease/Documents/Split Lease/slack-api" && bun run scripts/upload-screenshot.ts "<filepath>" "<channel>" "<comment>"
```

### Step 4: Report Result

Return the Slack message permalink and confirm success.

## Examples

### Basic - Current Page
```
/screenshot-to-slack current
```
→ Screenshots the current Playwright page, uploads to default channel

### With URL
```
/screenshot-to-slack https://splitlease.com #test-bed "Homepage state"
```
→ Navigates to URL, screenshots, uploads to #test-bed with comment

### Development Testing
```
/screenshot-to-slack http://localhost:8000/search #dev-alerts "Search page after fix"
```
→ Uses playwright-host-dev, screenshots localhost, sends to #dev-alerts

## Environment Requirements

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Slack Bot OAuth token (xoxb-...) |
| `SLACK_DEFAULT_CHANNEL` | No | Fallback channel if not specified |

## Error Handling

| Error | Action |
|-------|--------|
| No URL and no open page | Ask user for URL |
| Invalid channel | Report error, suggest checking channel name |
| Upload failed | Report Slack API error message |
| Screenshot failed | Report Playwright error |

## Notes

- Screenshots are saved temporarily and can be cleaned up after upload
- Full-page screenshots available with `--fullpage` flag
- Bot must be invited to target channel (`/invite @BotName`)
