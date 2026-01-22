# Migration Plan: _quick-threads-manage → Split Lease Architecture

**Created**: 2026-01-22 19:00:00
**Status**: Planning
**Classification**: BUILD

---

## Executive Summary

Migrate the `_quick-threads-manage` Next.js administrative dashboard into the Split Lease codebase as an **internal admin page** for managing messaging threads. This involves converting Next.js App Router patterns to Vite Islands Architecture, replacing mock API calls with Supabase Edge Function integrations, and aligning data types with existing Bubble-replicated schemas.

---

## Source Repository Analysis

**Repository**: `https://github.com/splitleasesharath/_quick-threads-manage.git`

### Technology Stack (Source)
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| UI | React 18 + Tailwind CSS |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Dates | date-fns 3.0.0 |

### Components to Migrate
| Component | Purpose | Lines |
|-----------|---------|-------|
| `Header.tsx` | Corporate navigation header | ~60 |
| `FilterBar.tsx` | 4-field search/filter UI | ~80 |
| `ThreadList.tsx` | Thread list wrapper with loading state | ~40 |
| `ThreadCard.tsx` | Individual thread display with actions | ~200 |
| `MessageColumn.tsx` | Filtered message display by sender type | ~60 |

### Data Types (Source)
```typescript
User, Listing, Proposal, Message, Thread, ThreadFilters, ReminderOptions, AlertConfig
```

### API Functions (Source)
```typescript
fetchThreads(filters?)  // GET /threads
deleteThread(threadId)  // DELETE /threads/{id}
sendReminder(options)   // POST /reminders
getMockThreads()        // Mock data for development
```

---

## Target Architecture Analysis

### Existing Messaging Infrastructure

Split Lease already has a **complete messaging system**:

| Component | Location | Status |
|-----------|----------|--------|
| Edge Function | `supabase/functions/messages/` | ✅ Production |
| Database Tables | `thread`, `_message` | ✅ Production |
| User Page | `app/src/islands/pages/MessagingPage/` | ✅ Production |
| Shared Panel | `app/src/islands/shared/HeaderMessagingPanel/` | ✅ Production |

### Key Differences: Admin vs User View

| Aspect | Existing MessagingPage | New AdminThreadsPage |
|--------|------------------------|----------------------|
| **Audience** | End users (hosts/guests) | Internal admin staff |
| **Scope** | User's own threads only | ALL threads across platform |
| **Actions** | Send messages, view CTA | Delete threads, send reminders |
| **Filtering** | None | Guest email, host email, proposal ID, thread ID |
| **Layout** | 3-column messaging | List view with expanded cards |
| **Auth** | User authentication | Admin authentication required |

---

## Migration Discrepancies & Fixes

### 1. Data Type Alignment

**Problem**: Source types don't match Bubble-replicated schema field names.

| Source Field | Target Field (Bubble) | Fix Required |
|--------------|----------------------|--------------|
| `user.nameFullname` | `user."Name - Full"` | Rename in queries |
| `user.profilePhoto` | `user."Profile Photo"` | Rename in queries |
| `message.messageBody` | `_message."Message Body"` | Rename in queries |
| `message.createdDate` | `_message."Created Date"` | Rename in queries |
| `message.sender` | `_message."is Split Bot"` + origin logic | Transform logic |
| `thread.uniqueId` | `thread._id` | Use `_id` directly |
| `proposal.status` | `proposal."Status"` | Rename in queries |

**Sender Type Transformation**:
```javascript
// Source: message.sender = 'host' | 'guest' | 'bot-to-host' | 'bot-to-guest'
// Target: Derived from multiple fields

function deriveSenderType(message, threadHostId, threadGuestId) {
  if (message['"is Split Bot"']) {
    // Bot message - determine target by visibility
    if (message['"is Visible to Host"'] && !message['"is Visible to Guest"']) {
      return 'bot-to-host';
    }
    if (message['"is Visible to Guest"'] && !message['"is Visible to Host"']) {
      return 'bot-to-guest';
    }
    return 'bot-to-both'; // Visible to both
  }

  const originatorId = message['"-Originator User"'];
  if (originatorId === threadHostId) return 'host';
  if (originatorId === threadGuestId) return 'guest';
  return 'unknown';
}
```

### 2. Architecture Conversion

**Problem**: Next.js App Router → Vite Islands Architecture

| Next.js Pattern | Vite Islands Equivalent |
|-----------------|-------------------------|
| `src/app/page.tsx` (client component) | `app/src/islands/pages/AdminThreadsPage/AdminThreadsPage.jsx` |
| `src/app/layout.tsx` | `app/public/admin-threads.html` + entry mount |
| `'use client'` directive | All islands are client by default |
| `next/font` (Inter) | Already using Inter via CSS |
| `react-hot-toast` | Keep (already in package.json) |

**File Structure Conversion**:
```
# Source (Next.js)
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx
│   ├── FilterBar.tsx
│   ├── ThreadList.tsx
│   ├── ThreadCard.tsx
│   └── MessageColumn.tsx
├── types/
│   └── index.ts
└── utils/
    └── api.ts

# Target (Vite Islands)
app/
├── public/
│   └── admin-threads.html          # NEW: HTML entry point
├── src/
│   ├── admin-threads.jsx           # NEW: React mount entry
│   ├── islands/
│   │   └── pages/
│   │       └── AdminThreadsPage/
│   │           ├── AdminThreadsPage.jsx
│   │           ├── useAdminThreadsPageLogic.js
│   │           └── components/
│   │               ├── AdminHeader.jsx
│   │               ├── FilterBar.jsx
│   │               ├── ThreadList.jsx
│   │               ├── ThreadCard.jsx
│   │               └── MessageColumn.jsx
│   └── types/
│       └── adminThreads.ts         # NEW: Admin-specific types
└── routes.config.js                # UPDATE: Add admin route
```

### 3. API Integration

**Problem**: Mock API → Supabase Edge Functions

**Option A: Extend Existing Edge Function** (Recommended)
Add admin-specific actions to `supabase/functions/messages/`:

```typescript
// New handlers to add
case 'admin_get_all_threads':    // Fetch ALL threads (admin only)
case 'admin_delete_thread':      // Delete thread + messages
case 'admin_send_reminder':      // Send reminder email/SMS
```

**Option B: Create New Edge Function**
Create `supabase/functions/admin-threads/` for separation of concerns.

**Recommendation**: Option A - keeps thread logic centralized.

**New Handler: admin_get_all_threads**
```typescript
// supabase/functions/messages/handlers/adminGetAllThreads.ts

export async function adminGetAllThreads(
  supabase: SupabaseClient,
  payload: { filters: ThreadFilters }
): Promise<Thread[]> {
  // ADMIN ONLY - verify admin role first

  let query = supabase
    .from('thread')
    .select(`
      *,
      hostUser:"-Host User"(*, "Name - Full", email, "Profile Photo", phone),
      guestUser:"-Guest User"(*, "Name - Full", email, "Profile Photo", phone),
      listing:Listing(*),
      proposal:Proposal(*, "Status")
    `)
    .order('"Modified Date"', { ascending: false });

  // Apply filters
  if (payload.filters?.guestEmail) {
    query = query.ilike('guestUser.email', `%${payload.filters.guestEmail}%`);
  }
  if (payload.filters?.hostEmail) {
    query = query.ilike('hostUser.email', `%${payload.filters.hostEmail}%`);
  }
  if (payload.filters?.threadId) {
    query = query.ilike('_id', `%${payload.filters.threadId}%`);
  }
  if (payload.filters?.proposalId) {
    query = query.ilike('proposal._id', `%${payload.filters.proposalId}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data;
}
```

**New Handler: admin_delete_thread**
```typescript
// supabase/functions/messages/handlers/adminDeleteThread.ts

export async function adminDeleteThread(
  supabase: SupabaseClient,
  payload: { threadId: string }
): Promise<void> {
  // ADMIN ONLY - verify admin role first

  // Delete all messages in thread first (FK constraint)
  const { error: msgError } = await supabase
    .from('_message')
    .delete()
    .eq('"Associated Thread/Conversation"', payload.threadId);

  if (msgError) throw msgError;

  // Delete thread
  const { error: threadError } = await supabase
    .from('thread')
    .delete()
    .eq('_id', payload.threadId);

  if (threadError) throw threadError;
}
```

### 4. Authentication & Authorization

**Problem**: Source has no auth, target needs admin-only access.

**Solution**: Add admin role check in Edge Function handlers.

```typescript
// In each admin handler:
async function verifyAdminRole(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check admin role in user table or custom claims
  const { data: userData } = await supabase
    .from('user')
    .select('"Is Admin"')
    .eq('auth_user_id', user.id)
    .single();

  return userData?.['"Is Admin"'] === true;
}
```

**Frontend Route Protection**:
```javascript
// In useAdminThreadsPageLogic.js
useEffect(() => {
  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login?redirect=/admin-threads';
      return;
    }
    // Additional admin check...
  };
  checkAdmin();
}, []);
```

### 5. Styling Alignment

**Problem**: Source uses custom Tailwind config, target has established design system.

| Source Style | Target Alignment |
|--------------|------------------|
| `bg-primary (#6D31C2)` | Keep - matches Split Lease purple |
| `text-error (#FF1356)` | Keep - matches Split Lease red |
| Custom `.btn-primary` | Use existing button patterns |
| Custom `.card` | Use existing card patterns |

**Action**: Import source's `globals.css` component classes into target's Tailwind config or create scoped styles.

### 6. Notification System

**Problem**: Source uses `react-hot-toast`, need to verify target compatibility.

**Status**: ✅ `react-hot-toast` already in `app/package.json` - no changes needed.

**Toast Configuration** (align with existing):
```javascript
// Already configured in Split Lease
toast.success('Message', { duration: 5000 });
toast.error('Error', { style: { background: '#FF1356' } });
```

### 7. Icon Library

**Problem**: Source uses `lucide-react`, target may use different icons.

**Status**: Check existing icon usage in Split Lease.

**Action**: If `lucide-react` not present, either:
1. Add `lucide-react` to dependencies, OR
2. Replace with existing icon library (e.g., Heroicons)

### 8. Date Formatting

**Problem**: Source uses `date-fns 3.0.0`, target version may differ.

**Check**: Verify `app/package.json` for `date-fns` version.

**Existing Pattern** (from `dayUtils.js`):
```javascript
import { format, parseISO } from 'date-fns';

export const formatDate = (dateString) => {
  return format(parseISO(dateString), 'MMM d, yyyy');
};
```

**Action**: Use existing date utilities, don't add new patterns.

### 9. Reminder Functionality

**Problem**: Source has reminder buttons but no backend implementation.

**Required**: New Edge Function action or separate function.

```typescript
// supabase/functions/messages/handlers/adminSendReminder.ts

interface ReminderPayload {
  threadId: string;
  recipientType: 'host' | 'guest' | 'both';
  method: 'email' | 'sms' | 'both';
}

export async function adminSendReminder(
  supabase: SupabaseClient,
  payload: ReminderPayload
): Promise<void> {
  // 1. Fetch thread with user details
  const { data: thread } = await supabase
    .from('thread')
    .select(`
      *,
      hostUser:"-Host User"(email, phone, "Name - Full"),
      guestUser:"-Guest User"(email, phone, "Name - Full")
    `)
    .eq('_id', payload.threadId)
    .single();

  // 2. Send via existing notification infrastructure
  // (Integrate with existing email/SMS services)

  // 3. Log reminder sent
}
```

---

## Implementation Plan

### Phase 1: Route & Entry Point Setup
1. Add route to `app/src/routes.config.js`:
   ```javascript
   { path: '/admin-threads', entry: 'admin-threads', title: 'Admin Threads | Split Lease' }
   ```
2. Create `app/public/admin-threads.html`
3. Create `app/src/admin-threads.jsx` (mount point)
4. Run `bun run generate-routes`

### Phase 2: Component Migration
1. Create `app/src/islands/pages/AdminThreadsPage/` folder structure
2. Convert `Header.tsx` → `AdminHeader.jsx` (adapt to existing header patterns)
3. Convert `FilterBar.tsx` → `FilterBar.jsx`
4. Convert `ThreadList.tsx` → `ThreadList.jsx`
5. Convert `ThreadCard.tsx` → `ThreadCard.jsx`
6. Convert `MessageColumn.tsx` → `MessageColumn.jsx`
7. Convert TypeScript types → JSDoc annotations (or keep `.ts` if preferred)

### Phase 3: Logic Hook Creation
1. Create `useAdminThreadsPageLogic.js` following Hollow Component pattern
2. Implement state management (threads, filters, loading)
3. Implement filter logic (client-side, matching source behavior)
4. Add admin authentication check

### Phase 4: Edge Function Extensions
1. Add `adminGetAllThreads.ts` handler
2. Add `adminDeleteThread.ts` handler
3. Add `adminSendReminder.ts` handler
4. Update `messages/index.ts` action routing
5. Add admin role verification

### Phase 5: Integration & Testing
1. Wire frontend to Edge Function
2. Test all CRUD operations
3. Test filter combinations
4. Test delete confirmation flow
5. Test reminder sending (if email/SMS infrastructure exists)
6. Test admin-only access restrictions

### Phase 6: Polish
1. Align toast notification styling
2. Responsive design verification
3. Error handling (no fallbacks - surface errors)
4. Loading states

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/public/admin-threads.html` | HTML entry point |
| `app/src/admin-threads.jsx` | React mount |
| `app/src/islands/pages/AdminThreadsPage/AdminThreadsPage.jsx` | Page component (UI only) |
| `app/src/islands/pages/AdminThreadsPage/useAdminThreadsPageLogic.js` | Business logic hook |
| `app/src/islands/pages/AdminThreadsPage/components/AdminHeader.jsx` | Navigation header |
| `app/src/islands/pages/AdminThreadsPage/components/FilterBar.jsx` | Search filters |
| `app/src/islands/pages/AdminThreadsPage/components/ThreadList.jsx` | Thread list container |
| `app/src/islands/pages/AdminThreadsPage/components/ThreadCard.jsx` | Thread display card |
| `app/src/islands/pages/AdminThreadsPage/components/MessageColumn.jsx` | Message column |
| `supabase/functions/messages/handlers/adminGetAllThreads.ts` | Fetch all threads |
| `supabase/functions/messages/handlers/adminDeleteThread.ts` | Delete thread |
| `supabase/functions/messages/handlers/adminSendReminder.ts` | Send reminder |

## Files to Modify

| File | Changes |
|------|---------|
| `app/src/routes.config.js` | Add admin-threads route |
| `supabase/functions/messages/index.ts` | Add admin action routing |
| `app/package.json` | Add `lucide-react` if not present |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Admin bypass (unauthorized access) | Medium | High | Strict server-side auth checks |
| Accidental thread deletion | Medium | High | Confirmation modal + soft-delete option |
| Filter query performance | Low | Medium | Index on email, _id fields |
| Type mismatches | Medium | Low | Thorough field mapping |

---

## Success Criteria

1. ✅ Admin can view ALL threads across platform
2. ✅ Admin can filter by guest email, host email, proposal ID, thread ID
3. ✅ Admin can delete threads (with confirmation)
4. ✅ Admin can send reminders to host/guest
5. ✅ Non-admin users cannot access the page
6. ✅ UI matches Split Lease design system
7. ✅ No console errors, proper loading states
8. ✅ Mobile responsive

---

## Questions for Stakeholder

1. **Soft Delete vs Hard Delete**: Should deleted threads be permanently removed or soft-deleted (recoverable)?
2. **Reminder Templates**: What email/SMS templates should be used for reminders?
3. **Admin Role Definition**: Is there an existing admin flag in the `user` table, or should we add one?
4. **Audit Logging**: Should admin actions (delete, remind) be logged for accountability?
5. **Pagination**: Should we add pagination for large thread lists, or keep infinite scroll?

---

## References

### Source Repository
- GitHub: `https://github.com/splitleasesharath/_quick-threads-manage.git`

### Existing Split Lease Files
- [supabase/functions/messages/index.ts](../../../supabase/functions/messages/index.ts)
- [supabase/functions/messages/handlers/](../../../supabase/functions/messages/handlers/)
- [app/src/islands/pages/MessagingPage/](../../../app/src/islands/pages/MessagingPage/)
- [app/src/routes.config.js](../../../app/src/routes.config.js)
- [supabase/migrations/20251217_add_message_foreign_keys.sql](../../../supabase/migrations/20251217_add_message_foreign_keys.sql)

### Documentation
- [CLAUDE.md](../../../.claude/CLAUDE.md) - Architecture guidelines
- [app/CLAUDE.md](../../../app/CLAUDE.md) - Frontend patterns
- [supabase/CLAUDE.md](../../../supabase/CLAUDE.md) - Edge Function patterns
