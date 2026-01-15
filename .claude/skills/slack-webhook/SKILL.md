---
name: slack-webhook
description: |
  Claude's voice for alerting users via Slack. Use this skill to send notifications when:
  (1) A task completes that the user should know about (deployments, builds, long-running operations)
  (2) An error or failure occurs that requires attention
  (3) A security issue, vulnerability, or concerning pattern is discovered
  (4) A warning about potential problems (deprecated APIs, risky patterns, data inconsistencies)
  (5) Anything requiring the user's immediate attention
  Triggers: "notify me", "alert", "let me know", "send to slack", or proactively when encountering issues the user should see immediately.
  IMPORTANT: This skill is designed for external use only. It will refuse to run inside the splitleasesharath GitHub account
  to prevent accidental modifications to the production codebase.
---

# Slack Webhook Notifications

Send 1-line summaries to Slack via `TINYTASKAGENT` webhook.

## End of Task (MANDATORY)

After completing any task, send a brief summary:

```bash
python "C:/Users/Split Lease/Documents/Split Lease/.claude/skills/slack-webhook/scripts/send_slack.py" "<1-line summary>" --type success
```

Keep summaries concise: "Implemented X", "Fixed Y bug", "Deployed Z to staging"

## Message Types

| Type | When to Use |
|------|-------------|
| `success` | Task completed successfully |
| `error` | Task failed or encountered errors |
| `warning` | Potential issues found |
| `urgent` | Security issues, critical failures |
| `info` | General status updates |

## Examples

```bash
# Successful completion
python "...send_slack.py" "Built slack-webhook skill with TINYTASKAGENT support" --type success

# Error encountered
python "...send_slack.py" "Build failed: 3 TypeScript errors in auth.ts" --type error

# Security concern
python "...send_slack.py" "Found hardcoded API key in config.js" --type urgent
```

## Configuration

Webhook URL resolved from (in order):
1. `TINYTASKAGENT` environment variable
2. `.env` file in cwd or home directory
3. `--webhook` argument (override)
