# Submit Listing Photos Component

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Photo upload and management component for listing creation/editing
[FEATURES]: Drag-drop upload, thumbnail preview, reordering, deletion

---

## ### FILE_INVENTORY ###

### index.js
[INTENT]: Barrel export providing SubmitListingPhotos component
[EXPORTS]: SubmitListingPhotos

### SubmitListingPhotos.jsx
[INTENT]: Main photo upload component with drag-drop and preview grid
[IMPORTS]: react
[DEPENDENCIES]: supabase/functions/bubble-proxy/handlers/photos
[PROPS]: listingId, photos, onPhotosChange

### SubmitListingPhotos.css
[INTENT]: Styles for upload zone, photo grid, and drag handles

### DeletePhotoModal.jsx
[INTENT]: Confirmation modal for photo deletion with preview
[IMPORTS]: react, ../Button
[PROPS]: photo, onConfirm, onCancel

### DeletePhotoModal.css
[INTENT]: Styles for delete confirmation modal

### README.md
[INTENT]: Component usage documentation

---

## ### UPLOAD_FLOW ###

```
Drag files or click upload
    │
    ▼
Validate file type/size
    │
    ▼
Upload to Bubble storage via Edge Function
    │
    ▼
Add to photo grid
    │
    ▼
Drag to reorder
```

---

## ### PHOTO_CONSTRAINTS ###

[MAX_SIZE]: 10MB per photo
[FORMATS]: JPEG, PNG, WebP
[MIN_COUNT]: 5 photos required
[MAX_COUNT]: 20 photos maximum

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { SubmitListingPhotos } from 'islands/shared/SubmitListingPhotos'
[CONSUMED_BY]: SelfListingPage photos section

---

**FILE_COUNT**: 6
**EXPORTS_COUNT**: 1
