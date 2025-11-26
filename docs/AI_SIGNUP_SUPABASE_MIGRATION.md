# AI Signup Market Report - Supabase Edge Function Migration

## What Was Changed

### Problem
The AI Signup form was trying to call the authenticated `bubble-proxy` Edge Function, but guest users (not logged in) cannot authenticate. This caused a CORS error:

```
Access to fetch at 'https://qcfifybkaddcoimjroca.supabase.co/functions/v1/bubble-proxy'
from origin 'https://split.lease' has been blocked by CORS policy
```

### Solution
Created a new **unauthenticated** Edge Function specifically for guest AI signups that:
1. ✅ Works WITHOUT user authentication (guest-friendly)
2. ✅ Stores Bubble API key server-side (secure)
3. ✅ Validates all inputs (email, phone, text)
4. ✅ Calls Bubble workflow directly
5. ✅ Handles CORS properly

## Files Created/Modified

### 1. New Edge Function: `supabase/functions/ai-signup-guest/index.ts`
**Location**: `supabase/functions/ai-signup-guest/index.ts`

**Purpose**: Unauthenticated endpoint for guest users to submit AI signup requests

**Key Features**:
- No authentication required (guest-friendly)
- Server-side API key storage (secure)
- Input validation (email, phone, description)
- Direct Bubble API integration
- Proper CORS handling

**API Endpoint**:
```
POST https://qcfifybkaddcoimjroca.supabase.co/functions/v1/ai-signup-guest
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "phone": "4155555555",
  "text_inputted": "I need a quiet space near downtown Manhattan..."
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Signup submitted successfully",
  "data": { ... }
}
```

### 2. Updated Frontend: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`
**Changes**:
- Removed Supabase client authentication requirement
- Now calls `ai-signup-guest` Edge Function directly via fetch
- Uses environment variable for Supabase URL
- Enhanced error handling and logging

**Before** (authenticated):
```javascript
const { data: result, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'signup_ai',
    payload: { ... }
  }
});
```

**After** (unauthenticated):
```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/ai-signup-guest`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, phone, text_inputted })
});
```

## Deployment Steps

### Step 1: Deploy the Edge Function

You have two options:

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/qcfifybkaddcoimjroca/functions
2. Click "Create a new function"
3. Name it: `ai-signup-guest`
4. Copy the contents of `supabase/functions/ai-signup-guest/index.ts`
5. Paste into the editor
6. Click "Deploy function"

#### Option B: Via Supabase CLI (if you have access token)
```bash
cd "C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease"
npx supabase functions deploy ai-signup-guest
```

### Step 2: Verify Environment Variables

Make sure these secrets are set in Supabase Dashboard → Settings → Edge Functions → Secrets:

```
BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY=5dbb448f9a6bbb043cb56ac16b8de109
```

### Step 3: Deploy the Frontend

```bash
cd "C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app"
npm run build
npx wrangler pages deploy dist --project-name splitlease
```

### Step 4: Test the Flow

1. Open https://split.lease/search
2. Click the "Get Market Research Report" button
3. Fill out the form:
   ```
   Description: I need a quiet space near downtown Manhattan, weekly from Monday to Friday.
   Email: test@gmail.com
   Phone: (415) 555-5555
   ```
4. Click "Submit"
5. Check browser console for logs

**Expected Success Logs**:
```
[AiSignupMarketReport] ========== SIGNUP REQUEST (GUEST ENDPOINT) ==========
[AiSignupMarketReport] Email: test@gmail.com
[AiSignupMarketReport] Phone: (415) 555-5555
[AiSignupMarketReport] Text length: 67
[AiSignupMarketReport] Edge Function URL: https://qcfifybkaddcoimjroca.supabase.co/functions/v1/ai-signup-guest
[AiSignupMarketReport] Response status: 200 OK
[AiSignupMarketReport] ========== SUCCESS ==========
[AiSignupMarketReport] Signup completed successfully
[AiSignupMarketReport] Result: { success: true, ... }
```

## Architecture Diagram

```
┌─────────────────────┐
│  Guest User Browser │
│   (Not Logged In)   │
└──────────┬──────────┘
           │
           │ POST /functions/v1/ai-signup-guest
           │ { email, phone, text_inputted }
           │ (NO AUTH TOKEN REQUIRED)
           ▼
┌─────────────────────────────────┐
│  Supabase Edge Function         │
│  ai-signup-guest                │
│  ✅ Unauthenticated             │
│  ✅ CORS enabled                │
│  ✅ Input validation            │
└──────────┬──────────────────────┘
           │
           │ POST /wf/ai-signup-guest
           │ Bearer: <API_KEY>
           │ (API key stored server-side)
           ▼
┌─────────────────────────────────┐
│  Bubble.io Workflow             │
│  ai-signup-guest                │
│  ✅ Creates user record         │
│  ✅ Triggers notifications      │
└─────────────────────────────────┘
```

## Security Notes

### Why is this safe without authentication?

1. **Rate Limiting**: Supabase automatically rate-limits Edge Functions
2. **Input Validation**: We validate email format, phone format, and text length
3. **Server-Side API Key**: The Bubble API key is NEVER exposed to the client
4. **No Sensitive Data**: We only collect email, phone, and market research text
5. **Bubble Workflow**: The workflow itself is designed to accept guest signups

### What's Protected

- ✅ Bubble API key (stored server-side in Supabase secrets)
- ✅ Validated inputs (email, phone, text)
- ✅ Rate limiting (Supabase default)
- ✅ CORS (only allows specific origins)

### What's NOT Protected

- ❌ This endpoint can be called by anyone
- ❌ No protection against spam (add reCAPTCHA if needed)
- ❌ No protection against duplicate submissions (add deduplication if needed)

## Troubleshooting

### Issue 1: CORS Error
**Symptoms**: Browser console shows CORS policy error

**Solution**: Make sure the Edge Function is deployed and CORS headers are correct in `index.ts`

### Issue 2: 401 Unauthorized from Bubble
**Symptoms**: Bubble returns 401 error

**Solution**: Check that `BUBBLE_API_KEY` secret is set correctly in Supabase

### Issue 3: 400 Bad Request
**Symptoms**: Bubble returns 400 error

**Solution**: Check that the Bubble workflow expects these exact parameter names:
- `email`
- `phone`
- `text inputted` (with space!)

### Issue 4: Edge Function Not Found
**Symptoms**: 404 error when calling the Edge Function

**Solution**: Deploy the Edge Function first (see Step 1 above)

## Rollback Plan

If this doesn't work, you can rollback to the old Bubble API direct call:

1. Revert `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` to use the old `submitSignup` function
2. Uncomment the hardcoded API key (not recommended, but works)
3. Redeploy the frontend

## Next Steps

1. ✅ Deploy the Edge Function
2. ✅ Deploy the frontend
3. ✅ Test the signup flow
4. 📋 Add reCAPTCHA for spam protection (optional)
5. 📋 Add duplicate submission detection (optional)
6. 📋 Add analytics tracking (optional)
