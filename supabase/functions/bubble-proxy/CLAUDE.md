# Bubble Proxy - Edge Function

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Edge Function)
**PARENT**: supabase/functions/

---

## ### FUNCTION_INTENT ###

[PURPOSE]: General API proxy routing listing, messaging, photos, referral, and signup requests
[ENDPOINT]: POST /bubble-proxy
[BACKEND]: Proxies to Bubble.io main API

---

## ### SUBDIRECTORIES ###

### handlers/
[INTENT]: Request handlers for each domain operation
[FILES]: 5 handlers
[KEY_EXPORTS]: handleListing, handleMessaging, handlePhotos, handleReferral, handleSignup

---

## ### FILE_INVENTORY ###

### deno.json
[INTENT]: Deno runtime configuration with Bubble.io API permissions and rate limiting

### index.ts
[INTENT]: Main entry point routing requests to domain handlers
[IMPORTS]: ./handlers/*, _shared/cors
[EXPORTS]: Deno.serve handler

### .npmrc
[INTENT]: NPM registry configuration

---

## ### REQUEST_ROUTING ###

```typescript
POST /bubble-proxy
{
  "action": "listing" | "messaging" | "photos" | "referral" | "signup",
  "type": "fetch" | "create" | "update" | "delete" | "search",
  "payload": { ... }
}
```

---

## ### DOMAIN_OPERATIONS ###

### Listing
[OPERATIONS]: fetch, create, update, search
[PAYLOAD]: { id?, data?, filters? }

### Messaging
[OPERATIONS]: send, getThread, listThreads
[PAYLOAD]: { threadId?, message?, recipientId? }

### Photos
[OPERATIONS]: upload, delete, reorder
[PAYLOAD]: { listingId, photos?, order? }

### Referral
[OPERATIONS]: createCode, validateCode, trackUsage
[PAYLOAD]: { code?, userId? }

### Signup
[OPERATIONS]: createProfile, updatePreferences
[PAYLOAD]: { userData }

---

## ### REQUIRED_SECRETS ###

[BUBBLE_API_BASE_URL]: https://app.split.lease/version-test/api/1.1
[BUBBLE_API_KEY]: Bubble.io API key

---

## ### SECURITY_NOTES ###

[API_KEY_PROTECTION]: Bubble API key never exposed to frontend
[INPUT_VALIDATION]: All payloads validated before forwarding
[ERROR_HANDLING]: Bubble errors translated to user-friendly messages

---

## ### DEPLOYMENT ###

```bash
supabase functions deploy bubble-proxy
```

---

**SUBDIRECTORY_COUNT**: 1
**TOTAL_FILES**: 7
