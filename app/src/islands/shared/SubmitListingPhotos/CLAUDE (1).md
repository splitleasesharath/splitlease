# Submit Listing Photos Context

**TYPE**: LEAF NODE
**PARENT**: app/src/islands/shared/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Photo upload and management component for listing creation/editing
[FEATURES]: Drag-drop upload, thumbnail preview, reordering, deletion

---

## ### COMPONENT_CONTRACTS ###

### SubmitListingPhotos.jsx
[PATH]: ./SubmitListingPhotos.jsx
[INTENT]: Main photo upload component with drag-drop and preview grid
[PROPS]:
  - listingId: string (req) - Listing ID for photo association
  - photos: Photo[] (req) - Current photos array
  - onPhotosChange: (photos: Photo[]) => void (req) - Photos update callback
[BEHAVIOR]:
  - Drag-drop file upload
  - Thumbnail preview grid
  - Drag to reorder
  - Click to delete (with confirmation)
[DEPENDS_ON]: lib/supabase
[ASYNC]: Yes (upload)

---

### DeletePhotoModal.jsx
[PATH]: ./DeletePhotoModal.jsx
[INTENT]: Confirmation modal for photo deletion with preview
[PROPS]:
  - photo: Photo (req) - Photo to delete
  - onConfirm: () => void (req) - Confirm deletion
  - onCancel: () => void (req) - Cancel deletion
[DEPENDS_ON]: ../Button

---

### index.js
[PATH]: ./index.js
[INTENT]: Barrel export
[EXPORTS]: { SubmitListingPhotos }

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
Drag to reorder (optional)
```

---

## ### PHOTO_CONSTRAINTS ###

| Constraint | Value |
|------------|-------|
| MAX_SIZE | 10MB per photo |
| FORMATS | JPEG, PNG, WebP |
| MIN_COUNT | 5 photos required |
| MAX_COUNT | 20 photos maximum |

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Minimum 5 photos required for listing submission
[RULE_2]: First photo becomes primary/cover photo
[RULE_3]: Reorder via drag-drop updates array order
[RULE_4]: Delete requires confirmation modal

---

## ### DEPENDENCIES ###

[LOCAL]: lib/supabase, shared/Button
[EXTERNAL]: None
[EDGE_FUNCTION]: bubble-proxy (photos handler)

---

**FILE_COUNT**: 6
**EXPORTS_COUNT**: 1
