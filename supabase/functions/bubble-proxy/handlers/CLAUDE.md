# Bubble Proxy Handlers

**GENERATED**: 2025-11-26
**RUNTIME**: Deno (Edge Function)
**PARENT**: supabase/functions/bubble-proxy/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: API request handlers proxying various operations to Bubble.io
[RUNTIME]: Deno Edge Runtime
[PATTERN]: Each handler processes a specific domain operation

---

## ### FILE_INVENTORY ###

### listing.ts
[INTENT]: Handle listing-related API calls including fetch, create, update, and search via Bubble.io
[EXPORTS]: handleListing
[IMPORTS]: _shared/bubbleSync, _shared/validation
[OPERATIONS]: GET (fetch), POST (create), PUT (update), SEARCH (query)
[RETURNS]: Listing object or array

### messaging.ts
[INTENT]: Handle messaging API calls enabling guest-host communication through Bubble.io
[EXPORTS]: handleMessaging
[IMPORTS]: _shared/bubbleSync, _shared/validation
[OPERATIONS]: SEND, GET_THREAD, LIST_THREADS
[RETURNS]: Message object or conversation thread

### photos.ts
[INTENT]: Handle photo upload API calls managing listing image uploads to Bubble.io storage
[EXPORTS]: handlePhotos
[IMPORTS]: _shared/bubbleSync
[OPERATIONS]: UPLOAD, DELETE, REORDER
[RETURNS]: Photo URLs or success confirmation

### referral.ts
[INTENT]: Handle referral system API calls for referral codes, tracking, and reward attribution
[EXPORTS]: handleReferral
[IMPORTS]: _shared/bubbleSync, _shared/validation
[OPERATIONS]: CREATE_CODE, VALIDATE_CODE, TRACK_USAGE
[RETURNS]: Referral data or validation result

### signup.ts
[INTENT]: Handle signup-related API calls during guest/host registration flow
[EXPORTS]: handleSignup
[IMPORTS]: _shared/bubbleSync, _shared/validation
[OPERATIONS]: CREATE_PROFILE, UPDATE_PREFERENCES
[RETURNS]: User profile object

---

## ### REQUEST_ROUTING ###

```
POST /bubble-proxy
Body: { action: string, type: string, payload: object }
    │
    ├─► action: "listing" → listing.ts
    ├─► action: "messaging" → messaging.ts
    ├─► action: "photos" → photos.ts
    ├─► action: "referral" → referral.ts
    └─► action: "signup" → signup.ts
```

---

## ### REQUIRED_SECRETS ###

[BUBBLE_API_BASE_URL]: https://app.split.lease/version-test/api/1.1
[BUBBLE_API_KEY]: Configured in Supabase Dashboard

---

**FILE_COUNT**: 5
**EXPORTS_COUNT**: 5
