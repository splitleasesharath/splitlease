# Photo Upload Migration Note

## Current Status: DEFERRED

The photo upload workflow (`SubmitListingPhotos.jsx`) is more complex than other workflows because it uses `multipart/form-data` for file uploads.

## Challenge

**Current Implementation:**
- Files are uploaded as `FormData` with actual File objects
- Bubble workflow expects multipart/form-data
- Edge Functions need special handling for file uploads

**Current Code (lines 68-90):**
```javascript
const formData = new FormData()
formData.append('Listing_id', listingId)
uploadedFiles.forEach((fileData) => {
  formData.append('Photos', fileData.file)
})

const response = await fetch(UPLOAD_ENDPOINT, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${BUBBLE_API_KEY}`
  },
  body: formData
})
```

## Migration Options

### Option 1: Base64 Encoding (Current Handler Implementation)
**Pros:**
- Works with JSON payloads
- Edge Function handler already expects this format

**Cons:**
- Requires converting files to base64 on client
- Increases payload size by ~33%
- May hit payload size limits for large images

**Implementation:**
```javascript
// Convert files to base64
const base64Photos = await Promise.all(
  uploadedFiles.map(fileData =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(fileData.file);
    })
  )
);

// Send to Edge Function
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'upload_photos',
    payload: {
      listing_id: listingId,
      photos: base64Photos
    }
  }
});
```

### Option 2: Direct FormData Support in Edge Function
**Pros:**
- No need to convert files
- Smaller payload size
- More efficient

**Cons:**
- Edge Function needs to handle multipart/form-data parsing
- More complex Edge Function implementation
- Requires updating the handler

**Implementation:**
```typescript
// In Edge Function handler (photos.ts)
const contentType = req.headers.get('content-type');
if (contentType?.includes('multipart/form-data')) {
  const formData = await req.formData();
  // Parse formData and forward to Bubble
}
```

### Option 3: Hybrid Approach (Recommended)
**Pros:**
- Keep existing direct Bubble upload for photos (already works)
- Only migrate the metadata sync to Edge Function
- Simplest migration path

**Cons:**
- Still exposes API key for photo uploads (but photos are less sensitive)

**Implementation:**
```javascript
// Step 1: Upload photos directly to Bubble (existing code)
const formData = new FormData()
formData.append('Listing_id', listingId)
uploadedFiles.forEach((fileData) => {
  formData.append('Photos', fileData.file)
})

const response = await fetch(UPLOAD_ENDPOINT, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${BUBBLE_API_KEY}`  // Still needed
  },
  body: formData
})

// Step 2: Sync photo metadata via Edge Function
const photoIds = extractPhotoIds(response);
await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'sync_photo_metadata',
    payload: { listing_id: listingId, photo_ids: photoIds }
  }
});
```

## Recommendation

**Defer photo upload migration** until we validate the other workflows work correctly.

**Rationale:**
1. Photo uploads are already functional
2. API key exposure for photo uploads is lower risk (no sensitive data)
3. Other workflows are higher priority (listings, auth, messaging)
4. Can revisit after Phase 6 testing is complete

## Alternative: Keep Photo Uploads As-Is

If security is not a critical concern for photo uploads specifically:
- Leave photo upload using direct Bubble API calls
- Focus Edge Function migration on data-sensitive workflows (auth, user data, messages)
- Document this as a known exception

## Next Steps

1. ✅ Complete migration of other workflows first
2. ✅ Test end-to-end with Edge Functions
3. ✅ Remove API key from .env (photo endpoint uses separate handling)
4. 🔄 Revisit photo upload migration in Phase 7 (future enhancement)

---

**Status:** Documented, deferred to future phase
**Last Updated:** 2025-11-24
