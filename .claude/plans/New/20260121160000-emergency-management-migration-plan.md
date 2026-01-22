# Emergency Management Dashboard Migration Plan

**Date**: 2026-01-21
**Source**: https://github.com/splitleasesharath/_internal-emergency
**Target**: Split Lease Monorepo (Islands Architecture + Supabase Edge Functions)
**Classification**: BUILD

---

## Executive Summary

This plan migrates a standalone Express/React emergency management dashboard into the Split Lease codebase architecture. The external repository uses:

- **Backend**: Express + Prisma ORM + PostgreSQL + TypeScript
- **Frontend**: React SPA with Material-UI + React Query
- **External Services**: Twilio SMS, Nodemailer, Slack Web API

The migration requires:
1. Converting Prisma schema → Supabase migrations
2. Rewriting Express controllers → Supabase Edge Functions (action-based pattern)
3. Converting React SPA → Islands Architecture page
4. Adapting Material-UI components → Split Lease component patterns
5. Migrating external service integrations → Edge Function utilities

---

## Architecture Analysis

### External Repository Structure

```
_internal-emergency/
├── backend/
│   ├── src/
│   │   ├── controllers/        # Express route handlers
│   │   │   ├── emergency.controller.ts
│   │   │   ├── communication.controller.ts
│   │   │   ├── preset.controller.ts
│   │   │   └── team.controller.ts
│   │   ├── services/           # Business logic
│   │   │   ├── emergency.service.ts
│   │   │   ├── communication.service.ts
│   │   │   ├── twilio.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── slack.service.ts
│   │   │   ├── preset.service.ts
│   │   │   └── team.service.ts
│   │   ├── routes/             # Express routes
│   │   ├── middleware/         # Auth, validation, error handling
│   │   └── index.ts            # Express server
│   └── prisma/
│       ├── schema.prisma       # Database schema
│       └── seed.ts             # Sample data
└── frontend/
    ├── src/
    │   ├── components/         # React components
    │   │   ├── EmergencyList.tsx
    │   │   ├── EmergencyDetails.tsx
    │   │   └── CommunicationPanel.tsx
    │   ├── pages/
    │   │   └── EmergencyDashboard.tsx
    │   ├── services/           # API client services
    │   │   ├── emergencyService.ts
    │   │   ├── communicationService.ts
    │   │   └── teamService.ts
    │   └── types/
    │       └── index.ts        # TypeScript types
```

### Split Lease Target Architecture

```
Split Lease/
├── supabase/
│   ├── migrations/             # Database schema (PostgreSQL)
│   │   └── [new] 20260121_create_emergency_tables.sql
│   └── functions/
│       ├── emergency/          # New Edge Function (action-based)
│       │   └── index.ts
│       └── _shared/
│           ├── twilio.ts       # SMS utility (shared)
│           ├── email.ts        # Email utility (shared)
│           └── slack.ts        # Slack utility (existing)
└── app/
    ├── public/
    │   └── internal-emergency.html
    ├── src/
    │   ├── internal-emergency.jsx                    # Entry point
    │   ├── islands/
    │   │   └── pages/
    │   │       └── InternalEmergencyPage/
    │   │           ├── InternalEmergencyPage.jsx     # Hollow component
    │   │           ├── useInternalEmergencyPageLogic.js
    │   │           ├── EmergencyList.jsx
    │   │           ├── EmergencyDetails.jsx
    │   │           └── CommunicationPanel.jsx
    │   ├── lib/
    │   │   └── emergencyService.js                   # Edge Function client
    │   └── routes.config.js                          # Add route entry
```

---

## Database Schema Migration

### Tables to Create

#### 1. `emergency_report`

**External (Prisma)**:
```prisma
model EmergencyReport {
  id                    String                  @id @default(uuid())
  reservationId         String                  @map("reservation_id")
  reportedById          String                  @map("reported_by_id")
  emergencyType         String                  @map("emergency_type")
  description           String                  @db.Text
  photo1Url             String?                 @map("photo1_url")
  photo2Url             String?                 @map("photo2_url")
  status                EmergencyStatus         @default(REPORTED)
  guidanceInstructions  String?                 @map("guidance_instructions")
  assignedToId          String?                 @map("assigned_to_id")
  assignedAt            DateTime?               @map("assigned_at")
  resolvedAt            DateTime?               @map("resolved_at")
  isHidden              Boolean                 @default(false)
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
}
```

**Target (Supabase SQL)** - Adaptations Required:
```sql
CREATE TABLE emergency_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK to existing Split Lease tables (text-based IDs)
  proposal_id TEXT,  -- Maps to proposal._id (NOT reservation)
  reported_by_user_id TEXT,  -- Maps to "user"._id

  emergency_type TEXT NOT NULL,
  description TEXT NOT NULL,
  photo1_url TEXT,
  photo2_url TEXT,

  status TEXT NOT NULL DEFAULT 'REPORTED'
    CHECK (status IN ('REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),

  guidance_instructions TEXT,

  assigned_to_user_id TEXT,  -- Maps to "user"._id (staff member)
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_status ON emergency_report(status);
CREATE INDEX idx_emergency_created_at ON emergency_report(created_at);
CREATE INDEX idx_emergency_assigned_to ON emergency_report(assigned_to_user_id);
CREATE INDEX idx_emergency_proposal_id ON emergency_report(proposal_id);
```

**Key Adaptations**:
- ❌ **NO `reservation` table** in Split Lease → Use `proposal` table instead
- ❌ **NO `listing` relation** needed (get listing via `proposal.Listing`)
- ✅ Use text-based FKs matching existing Split Lease schema (no UUID for FKs)
- ✅ Keep guest info via `proposal.Guest` and `proposal.Guest email`
- ✅ Store emergency on the **proposal**, not a separate reservation concept

#### 2. `emergency_message` (SMS/Call logs)

**External**:
```prisma
model Message {
  id                  String              @id @default(uuid())
  emergencyReportId   String
  direction           MessageDirection    // OUTBOUND | INBOUND
  recipientPhone      String
  senderPhone         String
  messageBody         String              @db.Text
  twilioSid           String?
  status              MessageStatus       // PENDING | SENT | DELIVERED | FAILED
  sentAt              DateTime?
  deliveredAt         DateTime?
  errorMessage        String?
  createdAt           DateTime            @default(now())
}
```

**Target**:
```sql
CREATE TABLE emergency_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_report_id UUID NOT NULL REFERENCES emergency_report(id) ON DELETE CASCADE,

  direction TEXT NOT NULL CHECK (direction IN ('OUTBOUND', 'INBOUND')),
  recipient_phone TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,

  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED')),

  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_message_report_id ON emergency_message(emergency_report_id);
CREATE INDEX idx_emergency_message_created_at ON emergency_message(created_at DESC);
```

**Key Adaptations**:
- ✅ Proper FK to `emergency_report(id)` with CASCADE delete
- ✅ Uses UUID for internal IDs (standard Supabase pattern)

#### 3. `emergency_email_log`

**External**:
```prisma
model EmailLog {
  id                  String              @id @default(uuid())
  emergencyReportId   String
  recipientEmail      String
  ccEmails            String[]
  bccEmails           String[]
  subject             String
  bodyHtml            String              @db.Text
  bodyText            String              @db.Text
  status              EmailStatus         // PENDING | SENT | FAILED
  sentAt              DateTime?
  errorMessage        String?
  createdAt           DateTime            @default(now())
}
```

**Target**:
```sql
CREATE TABLE emergency_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_report_id UUID NOT NULL REFERENCES emergency_report(id) ON DELETE CASCADE,

  recipient_email TEXT NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',
  bcc_emails TEXT[] DEFAULT '{}',

  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'FAILED')),

  sent_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_email_report_id ON emergency_email_log(emergency_report_id);
CREATE INDEX idx_emergency_email_created_at ON emergency_email_log(created_at DESC);
```

#### 4. `emergency_preset_message`

**External**:
```prisma
model PresetMessage {
  id          String    @id @default(uuid())
  label       String
  content     String    @db.Text
  category    String
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Target**:
```sql
CREATE TABLE emergency_preset_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_preset_message_category ON emergency_preset_message(category);
CREATE INDEX idx_preset_message_active ON emergency_preset_message(is_active) WHERE is_active = TRUE;
```

#### 5. `emergency_preset_email`

**External**:
```prisma
model PresetEmail {
  id          String    @id @default(uuid())
  label       String
  subject     String
  bodyHtml    String    @map("body_html") @db.Text
  bodyText    String    @map("body_text") @db.Text
  category    String
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Target**:
```sql
CREATE TABLE emergency_preset_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_preset_email_category ON emergency_preset_email(category);
CREATE INDEX idx_preset_email_active ON emergency_preset_email(is_active) WHERE is_active = TRUE;
```

#### Tables NOT Needed (Already Exist in Split Lease)

- ❌ `User` - Use existing `"user"` table
- ❌ `Listing` - Use existing `listing` table
- ❌ `Reservation` - Use existing `proposal` table (Split Lease doesn't have separate reservation concept)

---

## Edge Function Migration

### New Edge Function: `emergency/`

**File**: `supabase/functions/emergency/index.ts`

**Action-Based API Pattern**:
```typescript
// External uses REST endpoints like:
// GET /api/emergencies
// POST /api/emergencies/:id/sms
// PUT /api/emergencies/:id/assign

// Split Lease uses action-based pattern:
POST /functions/v1/emergency
{
  "action": "getAll",
  "payload": { "status": "REPORTED", "limit": 50 }
}

POST /functions/v1/emergency
{
  "action": "sendSMS",
  "payload": {
    "emergencyId": "uuid",
    "recipientPhone": "+1234567890",
    "messageBody": "..."
  }
}

POST /functions/v1/emergency
{
  "action": "assignEmergency",
  "payload": {
    "emergencyId": "uuid",
    "assignedToUserId": "user_text_id",
    "guidanceInstructions": "..."
  }
}
```

**Actions to Implement**:

| Action | External Equivalent | Description |
|--------|---------------------|-------------|
| `getAll` | `GET /api/emergencies` | Fetch all emergencies with filters |
| `getById` | `GET /api/emergencies/:id` | Fetch single emergency with relations |
| `create` | `POST /api/emergencies` | Create new emergency report |
| `update` | `PUT /api/emergencies/:id` | Update emergency fields |
| `assignEmergency` | `PUT /api/emergencies/:id/assign` | Assign to team member + Slack notify |
| `updateStatus` | `PUT /api/emergencies/:id/status` | Update status (REPORTED → ASSIGNED → etc.) |
| `updateVisibility` | `PUT /api/emergencies/:id/visibility` | Hide/show emergency |
| `sendSMS` | `POST /api/emergencies/:id/sms` | Send SMS via Twilio + log |
| `sendEmail` | `POST /api/emergencies/:id/email` | Send email via SMTP + log |
| `getMessages` | `GET /api/emergencies/:id/messages` | Fetch SMS history |
| `getEmails` | `GET /api/emergencies/:id/emails` | Fetch email history |
| `getPresetMessages` | `GET /api/preset-messages` | Fetch preset SMS templates |
| `getPresetEmails` | `GET /api/preset-emails` | Fetch preset email templates |
| `getTeamMembers` | `GET /api/team-members` | Fetch staff users (role = STAFF/ADMIN) |

**Service Layer Refactoring**:

External separates controllers + services. Split Lease Edge Functions combine both:

```typescript
// External pattern (2 files):
// controllers/emergency.controller.ts
export const getAllEmergencies = async (req, res, next) => {
  const emergencies = await emergencyService.getAllEmergencies(filters);
  res.json(emergencies);
};

// services/emergency.service.ts
export const getAllEmergencies = async (filters) => {
  return prisma.emergencyReport.findMany({ ... });
};

// Split Lease pattern (1 file):
// functions/emergency/index.ts
const actionHandlers = {
  getAll: async (payload, supabase) => {
    const { data, error } = await supabase
      .from('emergency_report')
      .select(`
        *,
        proposal:proposal_id(
          *,
          listing:Listing(*),
          guest:Guest(*)
        ),
        reportedBy:reported_by_user_id(*),
        assignedTo:assigned_to_user_id(*)
      `)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data };
  }
};
```

---

## External Service Integration

### 1. Twilio SMS Service

**External**: `backend/src/services/twilio.service.ts`
```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async (to: string, body: string) => {
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
  return message;
};
```

**Target**: `supabase/functions/_shared/twilio.ts` (NEW)
```typescript
export interface SendSMSParams {
  to: string;
  body: string;
}

export interface TwilioResponse {
  sid: string;
  status: string;
  errorMessage?: string;
}

export async function sendSMS({ to, body }: SendSMSParams): Promise<TwilioResponse> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Missing Twilio credentials');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', fromNumber);
  formData.append('Body', body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Twilio error: ${error.message}`);
  }

  const data = await response.json();
  return {
    sid: data.sid,
    status: data.status,
  };
}
```

**Environment Variables** (add to Supabase secrets):
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 2. Email Service (Nodemailer)

**External**: `backend/src/services/email.service.ts`
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (options) => {
  await transporter.sendMail(options);
};
```

**Target**: `supabase/functions/_shared/email.ts` (NEW)

Deno doesn't have nodemailer. Use native `fetch` with SMTP API or SendGrid/Mailgun:

**Option A: SMTP via AWS SES API**
```typescript
export interface SendEmailParams {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  // Use AWS SES HTTP API or SendGrid API
  const apiKey = Deno.env.get('SENDGRID_API_KEY');

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: params.to }],
        cc: params.cc?.map(email => ({ email })),
        bcc: params.bcc?.map(email => ({ email })),
      }],
      from: { email: Deno.env.get('FROM_EMAIL') },
      subject: params.subject,
      content: [
        { type: 'text/plain', value: params.textBody },
        { type: 'text/html', value: params.htmlBody },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Email send failed: ${error.errors?.[0]?.message}`);
  }
}
```

**Option B: Use existing Supabase email** (if available):
Check if Split Lease already has email sending utilities in `_shared/`.

### 3. Slack Service

**External**: `backend/src/services/slack.service.ts`
```typescript
import { WebClient } from '@slack/web-api';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

export const notifyEmergencyAssignment = async (emergency) => {
  await client.chat.postMessage({
    channel: process.env.SLACK_DYNAMIC_TASKS_CHANNEL,
    text: `Emergency assigned to ${emergency.assignedTo.fullName}`,
    blocks: [ ... ]
  });
};
```

**Target**: Use existing `supabase/functions/_shared/slack.ts`

Split Lease already has Slack integration. Check if webhook-based (simpler) or bot-token-based:

```typescript
// If webhook-based (existing pattern):
import { postToSlack } from '../_shared/slack.ts';

await postToSlack({
  text: `🚨 Emergency Assigned to ${assignedToName}`,
  blocks: [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🚨 Emergency Assigned` },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Agreement #:* ${agreementNumber}\n*Type:* ${emergencyType}\n*Assigned To:* ${assignedToName}`,
      },
    },
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View Emergency' },
        url: `https://splitlease.com/internal-emergency?id=${emergencyId}`,
        style: 'primary',
      }],
    },
  ],
});
```

**Note**: Check existing `_shared/slack.ts` for function signature and adapt accordingly.

---

## Frontend Migration

### 1. Route Registration

**File**: `app/src/routes.config.js`

Add new route entry:

```javascript
export const routes = {
  // ... existing routes

  'internal-emergency': {
    path: '/internal-emergency',
    title: 'Emergency Management Dashboard',
    description: 'Internal staff dashboard for managing guest-reported emergencies',
    component: 'internal-emergency',
    meta: {
      internal: true,  // Staff-only page
      requiresAuth: true,
      allowedRoles: ['STAFF', 'ADMIN'],
    },
  },
};
```

### 2. HTML Entry Point

**File**: `app/public/internal-emergency.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency Management Dashboard | Split Lease</title>
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/internal-emergency.jsx"></script>
</body>
</html>
```

### 3. Entry Point Script

**File**: `app/src/internal-emergency.jsx`

```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import InternalEmergencyPage from './islands/pages/InternalEmergencyPage/InternalEmergencyPage';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <InternalEmergencyPage />
  </React.StrictMode>
);
```

### 4. Page Component (Hollow Pattern)

**File**: `app/src/islands/pages/InternalEmergencyPage/InternalEmergencyPage.jsx`

```javascript
import React from 'react';
import useInternalEmergencyPageLogic from './useInternalEmergencyPageLogic';
import EmergencyList from './EmergencyList';
import EmergencyDetails from './EmergencyDetails';
import CommunicationPanel from './CommunicationPanel';

export default function InternalEmergencyPage() {
  const {
    emergencies,
    selectedEmergency,
    isLoading,
    error,
    handleSelectEmergency,
    handleRefresh,
    alertMessage,
    showAlert,
  } = useInternalEmergencyPageLogic();

  if (error) {
    return (
      <div className="error-container">
        <p>Failed to load emergencies. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="internal-emergency-page">
      <h1>Emergencies Dashboard</h1>

      {alertMessage && (
        <div className="alert alert-success">
          {alertMessage}
        </div>
      )}

      <div className="dashboard-layout">
        <div className="main-content">
          {selectedEmergency ? (
            <>
              <EmergencyDetails
                emergency={selectedEmergency}
                onUpdate={handleRefresh}
                onAlert={showAlert}
              />
              <CommunicationPanel
                emergency={selectedEmergency}
                onRefresh={handleRefresh}
                onAlert={showAlert}
              />
            </>
          ) : (
            <div className="empty-state">
              <p>Select an emergency from the list to view details</p>
            </div>
          )}
        </div>

        <aside className="sidebar">
          <EmergencyList
            emergencies={emergencies}
            selectedEmergency={selectedEmergency}
            onSelectEmergency={handleSelectEmergency}
            isLoading={isLoading}
          />
        </aside>
      </div>
    </div>
  );
}
```

### 5. Page Logic Hook

**File**: `app/src/islands/pages/InternalEmergencyPage/useInternalEmergencyPageLogic.js`

```javascript
import { useState, useEffect } from 'react';
import { fetchEmergencies, fetchEmergencyById } from '../../../lib/emergencyService';

export default function useInternalEmergencyPageLogic() {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');

  // Fetch all emergencies on mount
  useEffect(() => {
    loadEmergencies();
  }, []);

  async function loadEmergencies() {
    setIsLoading(true);
    try {
      const data = await fetchEmergencies({ status: null, limit: 100 });
      setEmergencies(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectEmergency(emergency) {
    setSelectedEmergency(emergency);

    // Optionally fetch full details with messages/emails
    try {
      const fullDetails = await fetchEmergencyById(emergency.id);
      setSelectedEmergency(fullDetails);
    } catch (err) {
      console.error('Failed to load emergency details:', err);
    }
  }

  async function handleRefresh() {
    await loadEmergencies();

    if (selectedEmergency) {
      try {
        const updated = await fetchEmergencyById(selectedEmergency.id);
        setSelectedEmergency(updated);
      } catch (err) {
        console.error('Failed to refresh selected emergency:', err);
      }
    }
  }

  function showAlert(message) {
    setAlertMessage(message);
    setTimeout(() => setAlertMessage(''), 5000);
  }

  return {
    emergencies,
    selectedEmergency,
    isLoading,
    error,
    handleSelectEmergency,
    handleRefresh,
    alertMessage,
    showAlert,
  };
}
```

### 6. Emergency Service Client

**File**: `app/src/lib/emergencyService.js`

```javascript
import { supabase } from './supabase';

const EDGE_FUNCTION_URL = '/functions/v1/emergency';

async function callEdgeFunction(action, payload) {
  const { data, error } = await supabase.functions.invoke('emergency', {
    body: { action, payload },
  });

  if (error) throw error;
  return data;
}

export async function fetchEmergencies({ status, assignedTo, limit = 50, offset = 0 }) {
  return callEdgeFunction('getAll', { status, assignedTo, limit, offset });
}

export async function fetchEmergencyById(id) {
  return callEdgeFunction('getById', { id });
}

export async function createEmergency(data) {
  return callEdgeFunction('create', data);
}

export async function updateEmergency(id, data) {
  return callEdgeFunction('update', { id, ...data });
}

export async function assignEmergency(id, assignedToUserId, guidanceInstructions) {
  return callEdgeFunction('assignEmergency', {
    emergencyId: id,
    assignedToUserId,
    guidanceInstructions,
  });
}

export async function updateEmergencyStatus(id, status) {
  return callEdgeFunction('updateStatus', { emergencyId: id, status });
}

export async function sendSMS(emergencyId, recipientPhone, messageBody) {
  return callEdgeFunction('sendSMS', { emergencyId, recipientPhone, messageBody });
}

export async function sendEmail(emergencyId, emailData) {
  return callEdgeFunction('sendEmail', { emergencyId, ...emailData });
}

export async function fetchMessages(emergencyId) {
  return callEdgeFunction('getMessages', { emergencyId });
}

export async function fetchEmails(emergencyId) {
  return callEdgeFunction('getEmails', { emergencyId });
}

export async function fetchPresetMessages() {
  return callEdgeFunction('getPresetMessages', {});
}

export async function fetchPresetEmails() {
  return callEdgeFunction('getPresetEmails', {});
}

export async function fetchTeamMembers() {
  return callEdgeFunction('getTeamMembers', {});
}
```

### 7. Component Migration Strategy

**Material-UI → Plain HTML/CSS or Minimal Library**

External uses:
- `@mui/material` components (Paper, Grid, Typography, Button, etc.)
- `@tanstack/react-query` for data fetching
- `react-hook-form` for forms

Split Lease patterns:
- ✅ Use plain HTML/CSS with Tailwind utility classes (if available)
- ✅ Use `useState`/`useEffect` instead of React Query (simpler for islands)
- ✅ Use `react-hook-form` IF already in dependencies, otherwise use plain controlled inputs

**Adaptation Example**:

```javascript
// External (Material-UI):
<Paper elevation={2} sx={{ p: 3 }}>
  <Typography variant="h6">Emergency Details</Typography>
  <Grid container spacing={2}>
    <Grid item xs={12} md={6}>
      <TextField label="Status" value={status} />
    </Grid>
  </Grid>
</Paper>

// Split Lease (Plain HTML + CSS):
<div className="card p-6 shadow-md">
  <h2 className="text-xl font-semibold mb-4">Emergency Details</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="label">Status</label>
      <input type="text" value={status} readOnly className="input" />
    </div>
  </div>
</div>
```

---

## Discrepancies & Required Fixes

### 1. **No `reservation` Table**

**Issue**: External schema has `Reservation` table with `agreementNumber`. Split Lease uses `proposal` table.

**Fix**:
- Replace all `reservationId` FKs → `proposal_id`
- Access listing via `proposal.Listing` (FK to `listing._id`)
- Access guest via `proposal.Guest` (FK to `"user"._id`)
- Agreement number: `proposal.["Agreement #"]`

**Migration**:
```sql
-- External:
emergency_report.reservation_id → reservation.id → reservation.listing_id

-- Split Lease:
emergency_report.proposal_id → proposal._id → proposal.Listing → listing._id
```

### 2. **Text-Based IDs vs UUIDs**

**Issue**: External uses UUID for all IDs. Split Lease uses text-based IDs for `user`, `listing`, `proposal`.

**Fix**:
- Emergency tables use UUID (internal only)
- FKs to existing tables use TEXT:
  - `proposal_id TEXT` (not UUID)
  - `reported_by_user_id TEXT` (not UUID)
  - `assigned_to_user_id TEXT` (not UUID)

### 3. **No Team Members Table**

**Issue**: External has `User` with `role` enum. Split Lease has `"user"` table.

**Fix**:
- Query `"user"` table filtering by role field
- Verify Split Lease user table has a `role` column
- If not, check Supabase Auth metadata or create custom role column

### 4. **Express REST → Edge Function Action Pattern**

**Issue**: External uses traditional REST:
```
GET /api/emergencies
POST /api/emergencies
PUT /api/emergencies/:id/assign
```

Split Lease uses action-based:
```
POST /functions/v1/emergency
{ "action": "getAll", "payload": {} }

POST /functions/v1/emergency
{ "action": "assignEmergency", "payload": { ... } }
```

**Fix**: Implement action router in Edge Function (standard pattern for Split Lease).

### 5. **Prisma ORM → Supabase Client**

**Issue**: External uses Prisma with relations:
```typescript
prisma.emergencyReport.findMany({
  include: {
    reservation: {
      include: { listing: true, guest: true }
    }
  }
})
```

Split Lease uses Supabase client:
```typescript
const { data } = await supabase
  .from('emergency_report')
  .select(`
    *,
    proposal:proposal_id(
      *,
      listing:Listing(*),
      guest:Guest(*)
    )
  `)
```

**Fix**: Rewrite all Prisma queries to Supabase PostgREST query syntax.

### 6. **React Query → Plain State Management**

**Issue**: External uses `@tanstack/react-query` for data fetching:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['emergencies'],
  queryFn: () => emergencyService.getAll(),
});
```

Split Lease islands use simple `useState` + `useEffect`:
```javascript
const [emergencies, setEmergencies] = useState([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  loadEmergencies();
}, []);
```

**Fix**: Remove React Query dependency, use plain hooks in page logic.

### 7. **Twilio SDK → Fetch-Based Implementation**

**Issue**: External uses `twilio` npm package. Deno Edge Functions don't support Node.js packages.

**Fix**: Implement Twilio REST API calls using native `fetch`.

### 8. **Nodemailer → SendGrid/SES API**

**Issue**: External uses `nodemailer` (SMTP). Deno doesn't support SMTP libraries well.

**Fix**: Use HTTP-based email service (SendGrid, AWS SES, Mailgun) via `fetch`.

### 9. **Slack Web API → Webhook or Fetch-Based**

**Issue**: External uses `@slack/web-api` package.

**Fix**: Check existing Split Lease Slack integration pattern (likely webhook-based). Use same approach.

### 10. **No User Authentication in External Repo**

**Issue**: External uses JWT auth middleware but doesn't implement login flow.

**Fix**:
- Integrate with Split Lease's existing Supabase Auth
- Protect route with `requiresAuth: true` in `routes.config.js`
- Edge Function checks `supabase.auth.getUser()` for staff role validation

---

## Implementation Checklist

### Phase 1: Database Setup

- [ ] Create migration file: `supabase/migrations/20260121_create_emergency_tables.sql`
  - [ ] `emergency_report` table with text-based FKs
  - [ ] `emergency_message` table
  - [ ] `emergency_email_log` table
  - [ ] `emergency_preset_message` table
  - [ ] `emergency_preset_email` table
  - [ ] All indexes
  - [ ] Seed preset messages/emails

- [ ] Verify existing Split Lease schema:
  - [ ] Confirm `proposal` table has `["Agreement #"]` field
  - [ ] Confirm `"user"` table has `role` or equivalent field
  - [ ] Confirm `listing` table structure

### Phase 2: Edge Function Implementation

- [ ] Create `supabase/functions/emergency/index.ts`
  - [ ] Action router setup
  - [ ] `getAll` action (with proposal/listing/guest joins)
  - [ ] `getById` action (with messages/emails)
  - [ ] `create` action
  - [ ] `update` action
  - [ ] `assignEmergency` action (+ Slack notification)
  - [ ] `updateStatus` action
  - [ ] `updateVisibility` action
  - [ ] `sendSMS` action (+ Twilio integration + log to DB)
  - [ ] `sendEmail` action (+ email service + log to DB)
  - [ ] `getMessages` action
  - [ ] `getEmails` action
  - [ ] `getPresetMessages` action
  - [ ] `getPresetEmails` action
  - [ ] `getTeamMembers` action (query `"user"` with role filter)

- [ ] Create shared utilities:
  - [ ] `supabase/functions/_shared/twilio.ts`
  - [ ] `supabase/functions/_shared/email.ts` (or adapt existing)
  - [ ] Verify `supabase/functions/_shared/slack.ts` exists and adapt

- [ ] Set Supabase environment secrets:
  ```bash
  supabase secrets set TWILIO_ACCOUNT_SID=ACxxx...
  supabase secrets set TWILIO_AUTH_TOKEN=xxx...
  supabase secrets set TWILIO_PHONE_NUMBER=+1...
  supabase secrets set SENDGRID_API_KEY=SG.xxx...  # or AWS SES credentials
  supabase secrets set FROM_EMAIL=noreply@splitlease.com
  ```

### Phase 3: Frontend Implementation

- [ ] Add route to `app/src/routes.config.js`
  - [ ] Set `internal: true`, `requiresAuth: true`, `allowedRoles: ['STAFF', 'ADMIN']`

- [ ] Create HTML entry: `app/public/internal-emergency.html`

- [ ] Create entry script: `app/src/internal-emergency.jsx`

- [ ] Create page component structure:
  - [ ] `app/src/islands/pages/InternalEmergencyPage/InternalEmergencyPage.jsx` (hollow)
  - [ ] `app/src/islands/pages/InternalEmergencyPage/useInternalEmergencyPageLogic.js`
  - [ ] `app/src/islands/pages/InternalEmergencyPage/EmergencyList.jsx`
  - [ ] `app/src/islands/pages/InternalEmergencyPage/EmergencyDetails.jsx`
  - [ ] `app/src/islands/pages/InternalEmergencyPage/CommunicationPanel.jsx`

- [ ] Create service client: `app/src/lib/emergencyService.js`

- [ ] Create styles: `app/src/styles/internal-emergency.css` (or Tailwind)

- [ ] Remove Material-UI components:
  - [ ] Replace with HTML/CSS equivalents
  - [ ] Use existing Split Lease component library if available

- [ ] Remove React Query:
  - [ ] Replace with `useState` + `useEffect` in page logic hook

### Phase 4: Testing & Deployment

- [ ] Test Edge Function locally:
  ```bash
  supabase functions serve emergency
  # Test each action via curl or Postman
  ```

- [ ] Test frontend locally:
  ```bash
  bun run dev
  # Navigate to http://localhost:8000/internal-emergency
  ```

- [ ] Test Twilio SMS integration (use test credentials first)

- [ ] Test email sending (use test recipient)

- [ ] Test Slack notifications (use test channel)

- [ ] Deploy Edge Function:
  ```bash
  supabase functions deploy emergency
  ```

- [ ] Deploy frontend:
  ```bash
  bun run build
  /deploy  # or manual Cloudflare deploy
  ```

- [ ] Production secrets verification

- [ ] End-to-end testing:
  - [ ] Create emergency report
  - [ ] Assign to team member (verify Slack notification)
  - [ ] Send SMS to guest
  - [ ] Send email to guest
  - [ ] Update status
  - [ ] View message/email history

### Phase 5: Documentation & Cleanup

- [ ] Document new route in Split Lease docs

- [ ] Document Edge Function actions in API docs

- [ ] Update environment setup guide with Twilio/Email credentials

- [ ] Delete external repository clone: `rm -rf _temp_emergency_analysis`

- [ ] Move this plan to `.claude/plans/Done/`

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| No `reservation` table → using `proposal` instead | **HIGH** | Verify proposal table has all required fields (agreement #, guest, listing). Test joins carefully. |
| Text-based IDs vs UUID mismatch | **MEDIUM** | Use TEXT for FKs to existing tables, UUID only for new internal tables. |
| Deno Edge Runtime limitations (no Node.js packages) | **MEDIUM** | Implement Twilio/Email via native `fetch` instead of SDKs. |
| Email service choice (no nodemailer in Deno) | **MEDIUM** | Use SendGrid or AWS SES HTTP API. Verify credentials before deployment. |
| Material-UI component migration effort | **LOW** | Replace with plain HTML/CSS. Keep same UI structure. |
| React Query removal | **LOW** | Simple useState/useEffect replacement in page logic. |
| Slack integration compatibility | **LOW** | Use existing Split Lease Slack utility pattern. |

---

## File References

### External Repository (Source)

**Database Schema**:
- `_temp_emergency_analysis/backend/prisma/schema.prisma`

**Backend Services**:
- `_temp_emergency_analysis/backend/src/services/emergency.service.ts`
- `_temp_emergency_analysis/backend/src/services/communication.service.ts`
- `_temp_emergency_analysis/backend/src/services/twilio.service.ts`
- `_temp_emergency_analysis/backend/src/services/email.service.ts`
- `_temp_emergency_analysis/backend/src/services/slack.service.ts`

**Backend Controllers**:
- `_temp_emergency_analysis/backend/src/controllers/emergency.controller.ts`
- `_temp_emergency_analysis/backend/src/controllers/communication.controller.ts`

**Frontend Components**:
- `_temp_emergency_analysis/frontend/src/pages/EmergencyDashboard.tsx`
- `_temp_emergency_analysis/frontend/src/components/EmergencyList.tsx`
- `_temp_emergency_analysis/frontend/src/components/EmergencyDetails.tsx`
- `_temp_emergency_analysis/frontend/src/components/CommunicationPanel.tsx`

**Frontend Services**:
- `_temp_emergency_analysis/frontend/src/services/emergencyService.ts`
- `_temp_emergency_analysis/frontend/src/services/communicationService.ts`

**Types**:
- `_temp_emergency_analysis/frontend/src/types/index.ts`

### Split Lease Codebase (Target)

**Architecture Documentation**:
- `.claude/CLAUDE.md`
- `.claude/Documentation/miniCLAUDE.md`
- `.claude/Documentation/largeCLAUDE.md`

**Database Reference**:
- `.claude/plans/Documents/20260120000000-quick-match-database-schema-audit.md`
- `supabase/migrations/` (all existing migrations)

**Route Configuration**:
- `app/src/routes.config.js`

**Existing Services**:
- `app/src/lib/supabase.js`
- `app/src/lib/auth.js`
- `supabase/functions/_shared/` (all shared utilities)

**Example Edge Functions**:
- `supabase/functions/proposal/index.ts`
- `supabase/functions/listing/index.ts`
- `supabase/functions/messages/index.ts`

**Example Page Components**:
- `app/src/islands/pages/` (any existing page for pattern reference)

---

## Questions for User

Before proceeding with implementation:

1. **Email Service**: Which email service should be used?
   - SendGrid (recommended for Deno)
   - AWS SES
   - Mailgun
   - Other existing Split Lease email service?

2. **Slack Integration**: Confirm existing Slack utility location and pattern:
   - Is `supabase/functions/_shared/slack.ts` available?
   - Webhook-based or Bot Token-based?

3. **User Roles**: Confirm user role structure:
   - Does `"user"` table have a `role` column?
   - What are the allowed roles? (GUEST, HOST, STAFF, ADMIN?)
   - Should staff access be restricted to specific team members?

4. **UI Library**: Styling approach for components?
   - Use Tailwind CSS?
   - Use existing Split Lease component library?
   - Plain HTML + CSS modules?

5. **Photo Upload**: How to handle emergency photo uploads?
   - External repo has `photo1Url` and `photo2Url` fields
   - Should we integrate with Supabase Storage?
   - Or assume photos are uploaded externally and URLs provided?

6. **Guest Submission Flow**: Should guests submit emergencies via this dashboard or a separate form?
   - External repo focuses on staff dashboard only
   - Need a guest-facing emergency submission page?

---

**END OF MIGRATION PLAN**
