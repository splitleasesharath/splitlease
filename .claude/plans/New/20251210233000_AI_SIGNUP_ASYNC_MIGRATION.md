# AI Signup Async Migration

**Date**: 2025-12-10
**Status**: DEPLOYED via Supabase MCP
**Purpose**: Migrate AI-powered profile parsing from blocking sync to async queue pattern

---

## Problem Statement

The original AI signup flow blocked the user for 10-30+ seconds while:
1. GPT-4 parsed the freeform text
2. Database matching for boroughs/neighborhoods
3. Auto-favoriting listings

Additionally, when email already existed, the flow continued without logging the user in.

---

## Solution Architecture

### Before (Blocking)
```
User Input → signupUser() → ai-signup-guest → parseProfileWithAI() [BLOCKING 10-30s] → Success
```

### After (Async Queue)
```
User Input → signupUser() → ai-signup-guest → queueProfileParsing() [IMMEDIATE] → Success
                                                    ↓
                                          ai_parsing_queue table
                                                    ↓
                                          pg_cron (every 15 min)
                                                    ↓
                                          ai-parse-profile edge function
                                                    ↓
                                          Profile populated by next morning
```

---

## Components Created/Modified

### 1. Database: `ai_parsing_queue` Table

**Location**: Supabase migration `create_ai_parsing_queue_table`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | text | FK to user._id |
| `email` | text | User email |
| `freeform_text` | text | The text to parse |
| `status` | text | pending, processing, completed, failed |
| `attempts` | integer | Retry count |
| `gpt_response` | text | Full GPT response |
| `extracted_data` | jsonb | Parsed structured data |
| `matched_ids` | jsonb | Borough/hood IDs |
| `favorited_listings` | jsonb | Auto-favorited listing IDs |

### 2. Edge Function: `ai-parse-profile`

**Location**: `supabase/functions/ai-parse-profile/index.ts`

**Actions**:
| Action | Description |
|--------|-------------|
| `queue` | Add job to queue (non-blocking) |
| `process` | Process a single job by ID |
| `process_batch` | Process up to N pending jobs |
| `queue_and_process` | Queue and immediately process (backward compat) |

**Prompt**: Replicates Bubble's GPT-4 prompt exactly, extracting:
- Biography, Special Needs, Need for Space
- Reasons to Host Me, Credit Score
- Last Name, Full Name
- Ideal Days Schedule, Preferred Borough
- Transportation Medium, Stored Items
- Preferred Weekly Schedule, Preferred Hoods

### 3. Frontend: `AiSignupMarketReport.jsx`

**Changes**:
1. Added `queueProfileParsing()` function - non-blocking queue call
2. Modified `submitSignup()` to:
   - Return `emailAlreadyExists` flag when email is taken
   - Queue parsing instead of waiting
   - Return `isAsync: true` flag
3. Added `EmailExistsMessage` component with login button
4. Updated `FinalMessage` to show async messaging
5. Added `handleLoginClick` that dispatches `openLoginModal` event

**New State Properties**:
- `emailAlreadyExists` - boolean
- `existingEmail` - string
- `isAsyncProcessing` - boolean

### 4. Database: `pg_cron` Job

**Migration**: `create_ai_parsing_cron_job`

- Runs every 15 minutes
- Checks for pending jobs
- Logs for external processing

**Note**: Actual HTTP call to edge function needs to be set up via:
- Supabase Edge Function Schedules (Dashboard)
- External cron service (e.g., Vercel cron, cron-job.org)

---

## User Flow Changes

### New User (Email Not Exists)
1. User enters freeform text + contact info
2. Account created instantly
3. Toast: "Your account has been created successfully!"
4. Final message: "We're analyzing your preferences in the background. Your personalized market research report will be ready by tomorrow morning!"
5. Page reloads, user is logged in

### Existing User (Email Already Exists)
1. User enters freeform text + contact info
2. Signup fails with "email already exists"
3. Modal shows: "Account Already Exists" with login button
4. User clicks "Log In"
5. Modal closes, login modal opens (via `openLoginModal` event)
6. After login, user can retry market research

---

## Deployment Checklist

### Edge Function
```bash
supabase functions deploy ai-parse-profile
```

### Verify Database
- [ ] `ai_parsing_queue` table exists
- [ ] `get_pending_parsing_jobs()` function exists
- [ ] pg_cron extension enabled

### Set Up Scheduled Processing

**Option A: Supabase Dashboard**
1. Go to Edge Functions
2. Create schedule for `ai-parse-profile`
3. Body: `{"action": "process_batch", "payload": {"limit": 10}}`
4. Cron: `*/15 * * * *` (every 15 min)

**Option B: External Cron**
```bash
curl -X POST \
  "https://qcfifybkaddcoimjroca.supabase.co/functions/v1/ai-parse-profile" \
  -H "Content-Type: application/json" \
  -d '{"action": "process_batch", "payload": {"limit": 10}}'
```

### Header Component (Optional)
Add listener for `openLoginModal` event:
```javascript
useEffect(() => {
  const handleOpenLogin = (e) => {
    setLoginEmail(e.detail?.email || '');
    setShowLoginModal(true);
  };
  window.addEventListener('openLoginModal', handleOpenLogin);
  return () => window.removeEventListener('openLoginModal', handleOpenLogin);
}, []);
```

---

## Files Changed

| File | Change Type |
|------|-------------|
| `supabase/functions/ai-parse-profile/index.ts` | Created |
| `supabase/config.toml` | Added function config |
| `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` | Modified |
| `supabase/migrations/*_create_ai_parsing_queue_table.sql` | Created |
| `supabase/migrations/*_create_ai_parsing_cron_job.sql` | Created |

---

## Monitoring

### Check Pending Jobs
```sql
SELECT status, COUNT(*)
FROM ai_parsing_queue
GROUP BY status;
```

### Check Failed Jobs
```sql
SELECT *
FROM ai_parsing_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Retry Failed Jobs
```sql
UPDATE ai_parsing_queue
SET status = 'pending', attempts = 0
WHERE status = 'failed' AND attempts < max_attempts;
```

---

## Rollback Plan

If issues occur:
1. Revert `AiSignupMarketReport.jsx` to call `parseProfileWithAI()` directly
2. Disable cron job: `SELECT cron.unschedule('process-ai-parsing-queue');`
3. Edge function can remain (no harm if not called)

---

## Future Improvements

1. **Email Notification**: Send email when parsing completes
2. **WebSocket Updates**: Real-time notification when report is ready
3. **Priority Queue**: VIP users get processed first
4. **Retry Logic**: Exponential backoff for failed jobs
5. **Market Report Generation**: Additional AI step to generate comprehensive report

---

**Author**: Claude Code
**Version**: 1.0
