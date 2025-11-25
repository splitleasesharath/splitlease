# Supabase Secrets Configuration

This document describes the secrets that must be configured in Supabase for the Edge Functions to work.

## Required Secrets

The following secrets must be set in Supabase before deploying the Edge Functions:

### 1. BUBBLE_API_BASE_URL
- **Value:** `https://app.split.lease/version-test/api/1.1`
- **Purpose:** Base URL for Bubble.io workflow API calls
- **Used by:** bubble-proxy, bubble-auth-proxy

### 2. BUBBLE_API_KEY
- **Value:** `5dbb448f9a6bbb043cb56ac16b8de109`
- **Purpose:** API key for authenticating with Bubble.io workflows
- **Used by:** bubble-proxy, bubble-auth-proxy
- **⚠️ SECURITY:** This key will be removed from client-side code and stored server-side only

### 3. BUBBLE_AUTH_BASE_URL
- **Value:** `https://upgradefromstr.bubbleapps.io/api/1.1`
- **Purpose:** Base URL for Bubble.io authentication workflows (different domain)
- **Used by:** bubble-auth-proxy

### 4. SUPABASE_SERVICE_ROLE_KEY
- **Value:** Get from Supabase Dashboard → Settings → API → service_role key
- **Purpose:** Service role key for bypassing RLS when syncing data
- **Used by:** bubble-proxy (via BubbleSyncService)
- **⚠️ SECURITY:** Never log or expose this key. It bypasses all RLS policies.

## How to Set Secrets

### Option 1: Using Supabase CLI

```bash
# Set secrets one by one
npx supabase secrets set BUBBLE_API_BASE_URL="https://app.split.lease/version-test/api/1.1"
npx supabase secrets set BUBBLE_API_KEY="5dbb448f9a6bbb043cb56ac16b8de109"
npx supabase secrets set BUBBLE_AUTH_BASE_URL="https://upgradefromstr.bubbleapps.io/api/1.1"

# Get service role key from Supabase Dashboard, then set it
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"

# Verify secrets are set
npx supabase secrets list
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions → Secrets
3. Add each secret using the UI
4. Deploy your Edge Functions after setting secrets

## Environment-Specific Secrets

### Development/Testing
For local testing, use the values shown above.

### Production
For production deployment, update the secrets to use production URLs:

```bash
# Production secrets (to be set when deploying to prod)
npx supabase secrets set --env production BUBBLE_API_BASE_URL="https://app.split.lease/api/1.1"
npx supabase secrets set --env production BUBBLE_API_KEY="[production_key_here]"
npx supabase secrets set --env production BUBBLE_AUTH_BASE_URL="https://upgradefromstr.bubbleapps.io/api/1.1"
npx supabase secrets set --env production SUPABASE_SERVICE_ROLE_KEY="[production_service_role_key]"
```

## Verifying Secrets

After setting secrets, verify they are configured correctly:

```bash
# List all secrets (shows names, not values)
npx supabase secrets list

# Test Edge Function (will fail if secrets are missing)
npx supabase functions serve bubble-proxy
```

## Security Notes

1. **Never commit secrets to version control**
   - All secret values are stored server-side in Supabase
   - This file only documents what secrets are needed, not their values

2. **API Key Rotation**
   - If the Bubble API key needs to be rotated, update the secret:
     ```bash
     npx supabase secrets set BUBBLE_API_KEY="new_key_here"
     ```
   - Redeploy Edge Functions after updating secrets

3. **Service Role Key**
   - This key bypasses all Row Level Security (RLS) policies
   - Only use it in Edge Functions, never in client code
   - Rotate quarterly for security
   - If compromised, regenerate immediately in Supabase Dashboard

## Troubleshooting

### Error: "Missing required configuration"
- **Cause:** One or more secrets are not set
- **Solution:** Set all required secrets using `supabase secrets set`

### Error: "Unauthorized" when calling Edge Functions
- **Cause:** BUBBLE_API_KEY is incorrect or expired
- **Solution:** Verify the API key in Bubble.io and update the secret

### Error: "Supabase sync failed"
- **Cause:** SUPABASE_SERVICE_ROLE_KEY is incorrect
- **Solution:** Get the service role key from Supabase Dashboard → Settings → API

## Next Steps

After setting secrets:
1. Deploy Edge Functions: `npx supabase functions deploy bubble-proxy`
2. Deploy Edge Functions: `npx supabase functions deploy bubble-auth-proxy`
3. Test workflows end-to-end
4. Remove VITE_BUBBLE_API_KEY from client-side .env files
