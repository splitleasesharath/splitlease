# Implementation Plan: Junction Tables & Realtime Optimization

**Created**: 2025-12-17T10:00:00Z
**Status**: NEW
**Type**: BUILD (Database + Backend + Frontend optimization)

---

## Executive Summary

This plan optimizes the messaging system by leveraging the newly created junction tables (`thread_message`, `thread_participant`, `user_thread`) while maintaining the current Broadcast-based Realtime architecture. The focus is on security, normalization benefits, and cleaning up redundancy.

---

## Current State Analysis

### Junction Tables Discovered

| Table | Schema | Purpose | Status |
|-------|--------|---------|--------|
| `thread_message` | junctions | Links messages to threads with type categorization | ✅ Exists, ❌ No RLS |
| `thread_participant` | junctions | Links users to threads with role | ✅ Exists |
| `user_thread` | junctions | Duplicate of thread_participant | ⚠️ REDUNDANT |

### Critical Findings

1. **Realtime Publication EMPTY** - No tables added to `supabase_realtime` publication
   - This is actually CORRECT for our Broadcast approach (uses `realtime.send()`)

2. **RLS Missing on `junctions.thread_message`** - Security gap
   - Users could potentially access message-thread relationships they shouldn't see

3. **Redundancy: `thread_participant` vs `user_thread`**
   - Both tables serve the same purpose
   - Recommendation: Consolidate to `thread_participant` (has `role` column)

4. **`thread_message.message_type` Enum**
   - Values: `all`, `slbot_to_host`, `slbot_to_guest`, `host_sent`, `guest_sent`
   - Enables efficient filtering of messages by visibility/type

### Current Realtime Architecture (KEEP)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROADCAST ARCHITECTURE                        │
│                    (KEEP - More Efficient)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  _message INSERT → trigger_broadcast_new_message                │
│                   ↓                                             │
│              realtime.send() → Broadcast channel                │
│                                ↓                                │
│                           Frontend subscribed                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why NOT Postgres Changes?**
- Broadcast is more efficient (no RLS evaluation per subscriber)
- Trigger can transform data before broadcast
- Better for high-frequency messaging workloads
- Already working in current implementation

---

## Implementation Phases

### Phase 1: Security - Enable RLS on Junction Tables

**Migration: `enable_rls_junction_tables`**

```sql
-- Enable RLS on thread_message junction
ALTER TABLE junctions.thread_message ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see message-thread links for threads they participate in
CREATE POLICY "thread_message_select_policy"
ON junctions.thread_message
FOR SELECT
USING (
  thread_id IN (
    SELECT _id FROM public.thread
    WHERE "-Host User" = public.get_user_bubble_id()
       OR "-Guest User" = public.get_user_bubble_id()
  )
);

-- Policy: Users can insert message-thread links for threads they participate in
CREATE POLICY "thread_message_insert_policy"
ON junctions.thread_message
FOR INSERT
WITH CHECK (
  thread_id IN (
    SELECT _id FROM public.thread
    WHERE "-Host User" = public.get_user_bubble_id()
       OR "-Guest User" = public.get_user_bubble_id()
  )
);

-- Enable RLS on thread_participant (if not already)
ALTER TABLE junctions.thread_participant ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own thread participations
CREATE POLICY "thread_participant_select_policy"
ON junctions.thread_participant
FOR SELECT
USING (
  user_id = public.get_user_bubble_id()
  OR thread_id IN (
    SELECT _id FROM public.thread
    WHERE "-Host User" = public.get_user_bubble_id()
       OR "-Guest User" = public.get_user_bubble_id()
  )
);
```

---

### Phase 2: Junction Table Population Trigger

When messages are created, automatically populate `junctions.thread_message` with the correct `message_type`.

**Migration: `add_thread_message_junction_trigger`**

```sql
-- Function to populate thread_message junction on _message insert
CREATE OR REPLACE FUNCTION populate_thread_message_junction()
RETURNS TRIGGER AS $$
DECLARE
  v_message_type junctions.message_type;
  v_thread RECORD;
BEGIN
  -- Get thread info
  SELECT "-Host User", "-Guest User"
  INTO v_thread
  FROM public.thread
  WHERE _id = NEW."Associated Thread/Conversation";

  -- Determine message type based on sender and visibility
  IF NEW."is Split Bot" = true THEN
    -- SplitBot messages
    IF NEW."is Visible to Host" = true AND NEW."is Visible to Guest" = false THEN
      v_message_type := 'slbot_to_host';
    ELSIF NEW."is Visible to Guest" = true AND NEW."is Visible to Host" = false THEN
      v_message_type := 'slbot_to_guest';
    ELSE
      v_message_type := 'all';
    END IF;
  ELSIF NEW."-Originator User" = v_thread."-Host User" THEN
    v_message_type := 'host_sent';
  ELSIF NEW."-Originator User" = v_thread."-Guest User" THEN
    v_message_type := 'guest_sent';
  ELSE
    v_message_type := 'all';
  END IF;

  -- Insert into junction table
  INSERT INTO junctions.thread_message (thread_id, message_id, message_type)
  VALUES (NEW."Associated Thread/Conversation", NEW._id, v_message_type)
  ON CONFLICT (thread_id, message_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on _message insert
CREATE TRIGGER trigger_populate_thread_message_junction
AFTER INSERT ON public._message
FOR EACH ROW
EXECUTE FUNCTION populate_thread_message_junction();
```

---

### Phase 3: Thread Participant Junction Auto-Population

**Migration: `add_thread_participant_junction_trigger`**

```sql
-- Function to populate thread_participant on thread creation
CREATE OR REPLACE FUNCTION populate_thread_participant_junction()
RETURNS TRIGGER AS $$
BEGIN
  -- Add host participant
  INSERT INTO junctions.thread_participant (thread_id, user_id, role)
  VALUES (NEW._id, NEW."-Host User", 'host')
  ON CONFLICT (thread_id, user_id) DO NOTHING;

  -- Add guest participant
  INSERT INTO junctions.thread_participant (thread_id, user_id, role)
  VALUES (NEW._id, NEW."-Guest User", 'guest')
  ON CONFLICT (thread_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on thread insert
CREATE TRIGGER trigger_populate_thread_participant_junction
AFTER INSERT ON public.thread
FOR EACH ROW
EXECUTE FUNCTION populate_thread_participant_junction();
```

---

### Phase 4: Remove Redundant Junction Table

The `user_thread` table duplicates `thread_participant`. Since `thread_participant` has the `role` column, it's the better choice.

**Migration: `drop_redundant_user_thread`**

```sql
-- Drop the redundant user_thread table
-- First, ensure thread_participant has all the data
INSERT INTO junctions.thread_participant (thread_id, user_id, role, created_at)
SELECT
  ut.thread_id,
  ut.user_id,
  COALESCE(
    (SELECT tp.role FROM junctions.thread_participant tp
     WHERE tp.thread_id = ut.thread_id AND tp.user_id = ut.user_id),
    'guest'
  ),
  ut.created_at
FROM junctions.user_thread ut
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- Now safe to drop
DROP TABLE IF EXISTS junctions.user_thread;
```

---

### Phase 5: Backend - Add Junction Helpers

**File: `supabase/functions/_shared/junctionHelpers.ts`**

Add new helper functions for thread/message junctions:

```typescript
// ============================================
// THREAD MESSAGE JUNCTION
// ============================================

export type MessageType = 'all' | 'slbot_to_host' | 'slbot_to_guest' | 'host_sent' | 'guest_sent';

/**
 * Add a message to thread junction
 * Usually auto-populated by trigger, but available for manual use
 */
export async function addThreadMessage(
  supabase: SupabaseClient,
  threadId: string,
  messageId: string,
  messageType: MessageType = 'all'
): Promise<void> {
  const { error } = await supabase
    .schema('junctions')
    .from('thread_message')
    .insert({
      thread_id: threadId,
      message_id: messageId,
      message_type: messageType,
    })
    .select()
    .single();

  if (error && error.code !== '23505') {
    console.error('[junctionHelpers] Failed to add thread_message:', error);
  }
}

/**
 * Get messages for a thread filtered by type
 * Useful for visibility-filtered queries
 */
export async function getThreadMessagesByType(
  supabase: SupabaseClient,
  threadId: string,
  messageTypes: MessageType[]
): Promise<string[]> {
  const { data, error } = await supabase
    .schema('junctions')
    .from('thread_message')
    .select('message_id')
    .eq('thread_id', threadId)
    .in('message_type', messageTypes);

  if (error) {
    console.error('[junctionHelpers] Failed to get thread_messages:', error);
    return [];
  }

  return data?.map(row => row.message_id) || [];
}

// ============================================
// THREAD PARTICIPANT JUNCTION
// ============================================

/**
 * Add a participant to thread junction
 * Usually auto-populated by trigger, but available for manual use
 */
export async function addThreadParticipant(
  supabase: SupabaseClient,
  threadId: string,
  userId: string,
  role: 'host' | 'guest'
): Promise<void> {
  const { error } = await supabase
    .schema('junctions')
    .from('thread_participant')
    .insert({
      thread_id: threadId,
      user_id: userId,
      role: role,
    })
    .select()
    .single();

  if (error && error.code !== '23505') {
    console.error('[junctionHelpers] Failed to add thread_participant:', error);
  }
}

/**
 * Get all threads for a user via junction table
 * More efficient than OR queries on thread table
 */
export async function getUserThreadIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .schema('junctions')
    .from('thread_participant')
    .select('thread_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[junctionHelpers] Failed to get user threads:', error);
    return [];
  }

  return data?.map(row => row.thread_id) || [];
}
```

---

### Phase 6: Update messagingHelpers.ts

**File: `supabase/functions/_shared/messagingHelpers.ts`**

Remove the manual junction table calls in `createThread()` since triggers now handle this:

```typescript
// In createThread function, REMOVE these lines:
// try {
//   await supabase.rpc('add_user_to_thread', {...});
// } catch (junctionError) {...}

// The new trigger_populate_thread_participant_junction handles this automatically
```

---

### Phase 7: Frontend Optimization (Optional)

**File: `app/src/islands/pages/MessagingPage/useMessagingPageLogic.js`**

The current direct query approach works well. The junction table benefit is primarily for:
1. **Filtering by message type** - If we want to show only host messages or only SplitBot messages
2. **Efficient thread lookup** - Using `thread_participant` instead of OR queries

**Optional optimization in `fetchThreadsWithBubbleId`:**

```javascript
// CURRENT (OR query on thread table):
.or(`"-Host User".eq.${bubbleId},"-Guest User".eq.${bubbleId}`)

// ALTERNATIVE (junction join - consider if performance becomes an issue):
// First get thread IDs from junction, then fetch thread details
// This separates the authorization check from the data fetch
```

For now, the current approach is fine since the thread table has proper indexes.

---

## Migration Execution Order

1. `enable_rls_junction_tables` - Security first
2. `add_thread_message_junction_trigger` - Auto-populate message links
3. `add_thread_participant_junction_trigger` - Auto-populate thread participants
4. `backfill_existing_data` - Populate junctions for existing data (optional)
5. `drop_redundant_user_thread` - Clean up redundancy (after verification)

---

## Backfill Migration (Optional)

If existing data needs to be populated in junction tables:

```sql
-- Backfill thread_participant from existing threads
INSERT INTO junctions.thread_participant (thread_id, user_id, role, created_at)
SELECT _id, "-Host User", 'host', COALESCE(created_at, now())
FROM public.thread
WHERE "-Host User" IS NOT NULL
ON CONFLICT (thread_id, user_id) DO NOTHING;

INSERT INTO junctions.thread_participant (thread_id, user_id, role, created_at)
SELECT _id, "-Guest User", 'guest', COALESCE(created_at, now())
FROM public.thread
WHERE "-Guest User" IS NOT NULL
ON CONFLICT (thread_id, user_id) DO NOTHING;

-- Backfill thread_message from existing messages
INSERT INTO junctions.thread_message (thread_id, message_id, message_type, created_at)
SELECT
  "Associated Thread/Conversation",
  _id,
  CASE
    WHEN "is Split Bot" = true AND "is Visible to Host" = true AND "is Visible to Guest" = false THEN 'slbot_to_host'::junctions.message_type
    WHEN "is Split Bot" = true AND "is Visible to Guest" = true AND "is Visible to Host" = false THEN 'slbot_to_guest'::junctions.message_type
    WHEN "is Split Bot" = true THEN 'all'::junctions.message_type
    ELSE 'all'::junctions.message_type
  END,
  COALESCE(created_at, now())
FROM public._message
WHERE "Associated Thread/Conversation" IS NOT NULL
ON CONFLICT (thread_id, message_id) DO NOTHING;
```

---

## Files Referenced

| File | Action |
|------|--------|
| [supabase/functions/_shared/junctionHelpers.ts](supabase/functions/_shared/junctionHelpers.ts) | UPDATE - Add thread/message junction helpers |
| [supabase/functions/_shared/messagingHelpers.ts](supabase/functions/_shared/messagingHelpers.ts) | UPDATE - Remove manual junction calls |
| [app/src/islands/pages/MessagingPage/useMessagingPageLogic.js](app/src/islands/pages/MessagingPage/useMessagingPageLogic.js) | NO CHANGE (optional future optimization) |

---

## Summary

| Phase | Description | Priority |
|-------|-------------|----------|
| 1 | Enable RLS on junction tables | HIGH (Security) |
| 2 | Add thread_message auto-population trigger | MEDIUM |
| 3 | Add thread_participant auto-population trigger | MEDIUM |
| 4 | Drop redundant user_thread table | LOW (After verification) |
| 5 | Add junction helpers to backend | MEDIUM |
| 6 | Update messagingHelpers.ts | LOW |
| 7 | Frontend optimization | LOW (Future) |

**Recommendation**: Execute Phases 1-3 first, then evaluate if Phases 4-7 are needed based on performance and usage patterns.

---

## Decision: Keep Broadcast vs Postgres Changes

**Decision: KEEP BROADCAST**

| Factor | Broadcast (Current) | Postgres Changes |
|--------|---------------------|------------------|
| RLS Evaluation | Once (at trigger) | Per subscriber |
| Data Transform | In trigger | Client-side |
| Scalability | Better for high-freq | Heavier server load |
| Complexity | Moderate | Simpler setup |
| Current State | Working | Would need rebuild |

The current Broadcast architecture via `realtime.send()` in the database trigger is the correct choice for a messaging system. No changes needed.
