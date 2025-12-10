# Slack Edge Function - Modular Webhook Routing System

## Overview

Design a modular, extensible webhook routing system that allows selective channel targeting with clean separation of concerns.

## Current State

- **Version**: 20
- **Webhooks**: `SLACK_WEBHOOK_DATABASE_WEBHOOK` (single)
- **Actions**: `faq_inquiry`, `diagnose`

## Proposed Webhooks

| Environment Variable | Channel Purpose | Use Cases |
|---------------------|-----------------|-----------|
| `SLACK_WEBHOOK_DATABASE_WEBHOOK` | Database/system alerts | Legacy, system notifications |
| `SLACK_WEBHOOK_DB_ACQUISITION` | User acquisition team | FAQ inquiries, lead notifications |
| `SLACK_WEBHOOK_DB_GENERAL` | General team notifications | General updates, announcements |

---

## Architecture Design

### 1. Channel Registry Pattern

```typescript
// Channel definitions with metadata
const WEBHOOK_CHANNELS = {
  database: {
    envVar: 'SLACK_WEBHOOK_DATABASE_WEBHOOK',
    description: 'Database and system alerts',
    defaultFor: ['system_alert', 'error_notification'],
  },
  acquisition: {
    envVar: 'SLACK_WEBHOOK_DB_ACQUISITION',
    description: 'User acquisition team',
    defaultFor: ['faq_inquiry', 'lead_notification'],
  },
  general: {
    envVar: 'SLACK_WEBHOOK_DB_GENERAL',
    description: 'General team notifications',
    defaultFor: ['announcement', 'general_update'],
  },
} as const;

type WebhookChannel = keyof typeof WEBHOOK_CHANNELS;
```

### 2. Request Interface

```typescript
interface SlackRequest {
  action: string;
  payload: Record<string, any>;
  options?: {
    channel?: WebhookChannel;           // Explicit channel override
    channels?: WebhookChannel[];        // Send to multiple channels
    broadcast?: boolean;                // Send to ALL channels
  };
}
```

### 3. Usage Examples

#### A. Default Channel (based on action type)
```json
{
  "action": "faq_inquiry",
  "payload": { "name": "John", "email": "john@example.com", "inquiry": "..." }
}
// Automatically routes to "acquisition" channel
```

#### B. Explicit Single Channel
```json
{
  "action": "faq_inquiry",
  "payload": { ... },
  "options": { "channel": "general" }
}
// Routes to "general" instead of default
```

#### C. Multiple Channels
```json
{
  "action": "announcement",
  "payload": { "message": "New feature released!" },
  "options": { "channels": ["acquisition", "general"] }
}
// Sends to both channels
```

#### D. Broadcast to All
```json
{
  "action": "critical_alert",
  "payload": { "message": "System maintenance" },
  "options": { "broadcast": true }
}
// Sends to all configured channels
```

---

## Implementation Structure

```
slack/index.ts
├── Types & Interfaces
│   ├── WebhookChannel
│   ├── ChannelConfig
│   ├── SlackRequest
│   └── SlackMessage
│
├── Channel Registry
│   ├── WEBHOOK_CHANNELS (config)
│   ├── getWebhookUrl(channel)
│   ├── getDefaultChannel(action)
│   └── getAvailableChannels()
│
├── Message Formatters
│   ├── formatFaqInquiry()
│   ├── formatSystemAlert()
│   └── formatGenericMessage()
│
├── Core Functions
│   ├── sendToChannel(channel, message)
│   ├── sendToChannels(channels[], message)
│   └── broadcast(message)
│
├── Action Handlers
│   ├── handleFaqInquiry()
│   ├── handleDiagnose()
│   └── handleGenericNotification()
│
└── Main Router
    └── Deno.serve()
```

---

## Key Features

### 1. Backward Compatibility
- Existing `faq_inquiry` calls work without changes
- Default channel routing preserves current behavior

### 2. Flexible Targeting
- Single channel, multiple channels, or broadcast
- Explicit override or smart defaults

### 3. Self-Documenting
- `diagnose` action shows all available channels and their status
- Channel descriptions explain purpose

### 4. Fail-Safe Delivery
- `Promise.allSettled` for multi-channel sends
- Partial success reporting
- Graceful degradation if channels unavailable

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/functions/slack/index.ts` | Main Edge Function implementation |
| `.claude/plans/Documents/SLACK_WEBHOOK_CHANNELS.md` | Channel documentation (to create) |

---

## Next Steps

1. Implement channel registry and types
2. Add channel resolution logic
3. Update handlers to use new routing
4. Enhance diagnose to show all channels
5. Deploy and test each channel

