# Migration Plan: Send Magic Login Links Internal Tool

**Created**: 2026-01-21 14:30:00
**Source Repository**: https://github.com/splitleasesharath/_send-magic-login-links.git
**Classification**: BUILD (New Internal Tool Migration)

---

## Executive Summary

This plan migrates a **Next.js 14 admin tool** for sending magic login links to users into the Split Lease **Vite Islands Architecture**. The source uses Next.js API routes with mock data; the target architecture uses Supabase Edge Functions with real database integration.

### Key Architecture Translations

| Source (Next.js) | Target (Split Lease) |
|------------------|---------------------|
| Next.js API Routes (`/api/*`) | Supabase Edge Functions |
| Server-side rendering | Static HTML + Client-side React |
| TypeScript throughout | JavaScript/JSX for pages |
| Mock data | Real Supabase queries |
| Tailwind CSS direct | CSS co-located with components |
| `axios` for HTTP | Supabase client + `fetch` |

---

## Phase 1: Frontend Files (Islands Architecture)

### 1.1 Create HTML Entry File

**File**: `app/public/send-magic-login-links.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Send Magic Login Links | Admin | Split Lease</title>
  <link rel="icon" type="image/png" href="/favicon.png" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/send-magic-login-links.jsx"></script>
</body>
</html>
```

### 1.2 Create React Entry Point

**File**: `app/src/send-magic-login-links.jsx`

```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import SendMagicLoginLinksPage from './islands/pages/SendMagicLoginLinksPage';
import { ToastProvider } from './islands/shared/Toast';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ToastProvider>
    <SendMagicLoginLinksPage />
  </ToastProvider>
);
```

### 1.3 Create Page Component Directory Structure

```
app/src/islands/pages/SendMagicLoginLinksPage/
├── index.jsx                         (re-export)
├── SendMagicLoginLinksPage.jsx       (hollow component)
├── SendMagicLoginLinksPage.css       (styles)
├── useSendMagicLoginLinksPageLogic.js (all business logic)
└── components/
    ├── UserSearch.jsx                 (Step 1)
    ├── PhoneOverride.jsx              (Step 2)
    ├── PageSelection.jsx              (Step 3)
    ├── DataAttachment.jsx             (Step 4)
    ├── SendButton.jsx                 (Step 5)
    ├── StepIndicator.jsx              (progress UI)
    └── Alert.jsx                      (notifications - or use Toast)
```

### 1.4 Register Route

**File**: `app/src/routes.config.js` (add to CORPORATE INTERNAL TOOLS section)

```javascript
{
  path: '/_internal/send-magic-login-links',
  file: 'send-magic-login-links.html',
  aliases: ['/_internal/send-magic-login-links.html', '/send-magic-login-links'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'send-magic-login-links-view',
  hasDynamicSegment: false
}
```

**After adding route**: Run `bun run generate-routes`

---

## Phase 2: Backend (Edge Function)

### 2.1 Create New Edge Function

**Directory**: `supabase/functions/magic-login-links/`

```
supabase/functions/magic-login-links/
├── index.ts                           (router)
├── deno.json                          (Deno config)
└── handlers/
    ├── listUsers.ts                   (GET users - replaces /api/users)
    ├── getUserData.ts                 (GET user context data)
    ├── sendMagicLink.ts               (POST - generate & send link)
    └── getDestinationPages.ts         (GET available pages from routes)
```

### 2.2 Edge Function Router Pattern

**File**: `supabase/functions/magic-login-links/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
// ... standard orchestration imports

const ALLOWED_ACTIONS = [
  'list_users',
  'get_user_data',
  'send_magic_link',
  'get_destination_pages',
] as const;

// Handler map
const handlers = {
  list_users: handleListUsers,
  get_user_data: handleGetUserData,
  send_magic_link: handleSendMagicLink,
  get_destination_pages: handleGetDestinationPages,
};

// Standard Deno.serve pattern...
```

### 2.3 Handler: List Users

**File**: `supabase/functions/magic-login-links/handlers/listUsers.ts`

**Source discrepancy**: Mock data → Real Supabase query

```typescript
// Source (Next.js) - MOCK DATA
const users = [
  { id: '1', email: 'john@example.com', ... },
  // Hardcoded users
];

// Target (Edge Function) - REAL DATA
export async function handleListUsers(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: { searchText?: string; limit?: number }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, ...);

  let query = supabase
    .from('user')
    .select('id, email, first_name, last_name, phone, user_type, profile_photo')
    .order('first_name', { ascending: true })
    .limit(payload.limit || 50);

  if (payload.searchText) {
    query = query.or(
      `email.ilike.%${payload.searchText}%,` +
      `first_name.ilike.%${payload.searchText}%,` +
      `last_name.ilike.%${payload.searchText}%,` +
      `phone.ilike.%${payload.searchText}%`
    );
  }

  const { data, error } = await query;
  // ... error handling, return formatted users
}
```

### 2.4 Handler: Get User Data (Context)

**File**: `supabase/functions/magic-login-links/handlers/getUserData.ts`

**Source discrepancy**: Mock data → Real Supabase queries across multiple tables

```typescript
// Query each entity type based on user relationships
// - listings: where user_id = payload.userId OR co_host_id = payload.userId
// - proposals: where user_id = payload.userId (guest) OR via listing.user_id (host)
// - leases: similar relationship logic
// - threads: where participant includes userId
// etc.
```

### 2.5 Handler: Send Magic Link

**File**: `supabase/functions/magic-login-links/handlers/sendMagicLink.ts`

**IMPORTANT**: This can **reuse existing handlers** from `auth-user/`:
- `handleGenerateMagicLink` - Already exists!
- `handleSendMagicLinkSms` - Already exists!

**New logic needed**:
1. Look up user by ID (not just email)
2. Build redirect URL with attached data as query params
3. Optionally store audit record in new `magic_link_audit` table

```typescript
export async function handleSendMagicLink(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: SendMagicLinkPayload
) {
  // 1. Look up user email from userId
  const { userId, destinationPage, phoneOverride, attachedData } = payload;
  const user = await getUserById(supabaseUrl, supabaseServiceKey, userId);

  // 2. Build redirect URL
  const redirectUrl = buildRedirectUrl(destinationPage, attachedData);

  // 3. Generate magic link (reuse existing)
  const magicLinkResult = await handleGenerateMagicLink(
    supabaseUrl,
    supabaseServiceKey,
    { email: user.email, redirectTo: redirectUrl }
  );

  // 4. Send via SMS if phone provided
  if (phoneOverride || user.phone) {
    await handleSendMagicLinkSms(
      supabaseUrl,
      supabaseServiceKey,
      {
        email: user.email,
        phoneNumber: phoneOverride || user.phone,
        redirectTo: redirectUrl
      }
    );
  }

  // 5. Log audit record
  await logMagicLinkAudit(supabaseUrl, supabaseServiceKey, {
    userId,
    destinationPage,
    attachedData,
    createdBy: payload.adminUserId, // From auth context
    link: magicLinkResult.action_link,
  });

  return { success: true, link: magicLinkResult.action_link };
}
```

---

## Phase 3: Discrepancies & Required Fixes

### 3.1 Database Schema Changes

**New table needed**: `magic_link_audit`

```sql
-- Migration: create_magic_link_audit_table
CREATE TABLE public.magic_link_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user(id),
  destination_page VARCHAR(100) NOT NULL,
  attached_data JSONB,
  phone_override VARCHAR(20),
  link_generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.user(id),
  sent_via VARCHAR(20), -- 'sms', 'email', 'display_only'
  CONSTRAINT valid_sent_via CHECK (sent_via IN ('sms', 'email', 'display_only'))
);

-- Index for admin queries
CREATE INDEX idx_magic_link_audit_created_by ON public.magic_link_audit(created_by);
CREATE INDEX idx_magic_link_audit_user_id ON public.magic_link_audit(user_id);

-- RLS: Only admins can read/write
ALTER TABLE public.magic_link_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage magic link audit"
  ON public.magic_link_audit
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );
```

### 3.2 Source Code Discrepancies

| Source File | Issue | Fix Required |
|-------------|-------|--------------|
| `app/api/users/route.ts` | Mock data | Replace with Supabase query to `public.user` |
| `app/api/user-data/route.ts` | Mock data | Query actual tables: `listing`, `proposal`, `lease`, `thread`, etc. |
| `app/api/send-magic-link/route.ts` | Token generation only | Integrate with existing `auth-user` handlers |
| `types/index.ts` | TypeScript interfaces | Convert to JSDoc in JS files OR keep .ts for Edge Functions |
| Component styling | Tailwind CSS | Convert to CSS custom properties + co-located CSS files |
| `axios` usage | HTTP client | Replace with `supabase.functions.invoke()` |

### 3.3 Destination Page Mapping

The source has hardcoded destination pages. These should map to **actual routes** from `routes.config.js`:

| Source Page ID | Mapped Route | Notes |
|---------------|--------------|-------|
| `user-account` | `/account-profile/:userId` | Dynamic segment |
| `profile-settings` | `/account-profile/:userId` | Same page, different tab? |
| `guest-dashboard` | `/guest-proposals/:userId` | |
| `host-dashboard` | `/host-proposals/:userId` | |
| `guest-leases` | N/A | Page doesn't exist yet |
| `host-leases` | N/A | Page doesn't exist yet |
| `messages` | `/messages` | |
| `messages-thread` | `/messages?thread=:threadId` | Query param |
| `proposals` | `/guest-proposals/:userId` or `/host-proposals/:userId` | Based on user type |
| `proposals-detail` | Same with `?proposal=:proposalId` | Query param |
| `rental-application` | `/rental-application` | |
| `date-change-requests` | N/A | Page doesn't exist |
| `listing-dashboard` | `/listing-dashboard` | |
| `host-overview` | `/host-overview` | |

**Recommendation**: Create a `destinationPages.js` config that:
1. References `routes.config.js` for valid routes
2. Maps friendly names to actual route patterns
3. Specifies required context data per destination

### 3.4 Authentication & Admin Access

**Source**: No authentication (development mode)
**Target**: Must verify admin access

```javascript
// In useSendMagicLoginLinksPageLogic.js
import { getUserType } from '../../../lib/auth.js';

// On mount, check admin access
useEffect(() => {
  const userType = getUserType();
  if (userType !== 'admin') {
    // Redirect to login or show unauthorized
    setError('Admin access required');
    return;
  }
  // ... continue with data fetching
}, []);
```

### 3.5 Component Pattern Translations

**UserSearch.jsx** (Source → Target):
```javascript
// Source: Uses axios, useState, Tailwind
const [users, setUsers] = useState([]);
useEffect(() => {
  axios.get('/api/users').then(res => setUsers(res.data));
}, []);

// Target: Uses supabase.functions.invoke, co-located CSS
const [users, setUsers] = useState([]);
useEffect(() => {
  const fetchUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/magic-login-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'list_users', payload: {} }),
    });
    const result = await response.json();
    setUsers(result.data.users);
  };
  fetchUsers();
}, []);
```

---

## Phase 4: Implementation Order

### Step 1: Database Migration (if audit table needed)
- [ ] Create `magic_link_audit` table migration
- [ ] Apply to dev database via Supabase MCP

### Step 2: Edge Function
- [ ] Create `supabase/functions/magic-login-links/` directory
- [ ] Implement `index.ts` router
- [ ] Implement `handlers/listUsers.ts`
- [ ] Implement `handlers/getUserData.ts`
- [ ] Implement `handlers/sendMagicLink.ts` (reusing auth-user handlers)
- [ ] Implement `handlers/getDestinationPages.ts`
- [ ] Test locally with `supabase functions serve`

### Step 3: Frontend Files
- [ ] Create `app/public/send-magic-login-links.html`
- [ ] Create `app/src/send-magic-login-links.jsx`
- [ ] Create page directory structure
- [ ] Implement `useSendMagicLoginLinksPageLogic.js`
- [ ] Implement `SendMagicLoginLinksPage.jsx` (hollow component)
- [ ] Convert each source component to Split Lease pattern
- [ ] Create co-located CSS

### Step 4: Route Registration
- [ ] Add route to `routes.config.js`
- [ ] Run `bun run generate-routes`
- [ ] Test in development

### Step 5: Testing & Deployment
- [ ] Test locally with `bun run dev`
- [ ] Test Edge Function with real data
- [ ] Deploy Edge Function: `supabase functions deploy magic-login-links`
- [ ] Deploy frontend via Cloudflare

---

## Phase 5: Files Reference

### Source Repository Files
- `app/page.tsx` - Main wizard UI
- `app/api/users/route.ts` - User list endpoint (mock)
- `app/api/user-data/route.ts` - Context data endpoint (mock)
- `app/api/send-magic-link/route.ts` - Link generation
- `components/UserSearch.tsx`
- `components/PhoneOverride.tsx`
- `components/PageSelection.tsx`
- `components/DataAttachment.tsx`
- `components/SendButton.tsx`
- `components/StepIndicator.tsx`
- `components/Alert.tsx`
- `types/index.ts`

### Target Codebase Files (to create)
- `app/public/send-magic-login-links.html`
- `app/src/send-magic-login-links.jsx`
- `app/src/islands/pages/SendMagicLoginLinksPage/`
- `supabase/functions/magic-login-links/`

### Existing Files to Reference
- [routes.config.js](../../../app/src/routes.config.js) - Route registration pattern
- [auth-user/handlers/generateMagicLink.ts](../../../supabase/functions/auth-user/handlers/generateMagicLink.ts) - Reusable handler
- [auth-user/handlers/sendMagicLinkSms.ts](../../../supabase/functions/auth-user/handlers/sendMagicLinkSms.ts) - Reusable handler
- [CoHostRequestsPage/](../../../app/src/islands/pages/CoHostRequestsPage/) - Reference internal tool pattern

### Database Tables to Query
- `public.user` - User list and lookup
- `public.listing` - For context attachment
- `public.proposal` - For context attachment
- `public.lease` - For context attachment (if exists)
- `public.thread` - For messaging context
- `public.visit` - For visit context (if exists)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Admin access enforcement missing | Add userType check in page logic hook |
| Magic link expiration not tracked | Use existing Supabase Auth expiration (default 1 hour) |
| SMS delivery failures | Reuse existing `sendMagicLinkSms` with Twilio error handling |
| Missing destination pages | Map only to routes that exist in routes.config.js |
| Phone format validation | Reuse E.164 validation from existing handler |

---

## Post-Migration Reminders

1. **Manual Edge Function Deployment**: After implementing `magic-login-links` Edge Function, run:
   ```bash
   supabase functions deploy magic-login-links
   ```

2. **Route Generation**: After adding route to `routes.config.js`, run:
   ```bash
   bun run generate-routes
   ```

3. **Environment Variables**: Ensure Twilio credentials are set in Supabase secrets if using SMS delivery.

4. **Testing**: Test with a real admin user account to verify:
   - Admin access enforcement works
   - User search returns real users
   - Magic link generation succeeds
   - SMS delivery works (if enabled)
