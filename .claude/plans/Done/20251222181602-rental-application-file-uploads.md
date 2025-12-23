# Rental Application File Uploads Implementation Plan

## Problem Statement

The rental application form allows users to upload files (proof of employment, alternate guarantee, credit score, etc.) but these files are:
1. Only stored in React state (transient)
2. Never uploaded to Supabase Storage
3. Never saved to the database
4. Lost on page reload or after submission

## Current State

### What Exists
- **Database columns** for file references:
  - `proof of employment` (text)
  - `State ID - Front` (text)
  - `State ID - Back` (text)
  - `government ID` (text)
  - `alternate guarantee` (text)
  - `credit score` (text - likely)

- **React state** for file uploads in `useRentalApplicationPageLogic.js`:
  ```javascript
  const [uploadedFiles, setUploadedFiles] = useState({
    employmentProof: null,
    alternateGuarantee: null,
    altGuarantee: null,
    creditScore: null,
    references: []
  });
  ```

- **UI components** for file selection in `RentalApplicationPage.jsx`

### What's Missing
1. File upload to Supabase Storage
2. Saving file URLs to database on submit
3. Fetching file URLs on page load
4. Displaying existing files for submitted applications

## Implementation Steps

### Step 1: Create Supabase Storage Bucket

Create a private bucket for rental application documents:

```sql
-- Run in Supabase SQL editor or create migration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rental-applications',
  'rental-applications',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- RLS policy: Users can only access their own files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rental-applications' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rental-applications' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Note**: For legacy Bubble users without Supabase Auth, we may need to use service role key in Edge Function instead.

### Step 2: Create File Upload Edge Function Handler

Add `upload` action to `rental-application` Edge Function:

**File**: `supabase/functions/rental-application/handlers/upload.ts`

```typescript
export async function handleUpload(
  payload: { fileType: string; fileName: string; fileData: string }, // base64
  supabase: SupabaseClient,
  userId: string
): Promise<{ url: string }> {
  // 1. Validate file type (employmentProof, alternateGuarantee, etc.)
  // 2. Decode base64 file data
  // 3. Upload to storage bucket: `rental-applications/{userId}/{fileType}/{fileName}`
  // 4. Get signed URL or public URL
  // 5. Return URL
}
```

### Step 3: Update Submit Handler to Save File URLs

**File**: `supabase/functions/rental-application/handlers/submit.ts`

Add file URL fields to `rentalAppData`:

```typescript
const rentalAppData: Record<string, unknown> = {
  // ... existing fields ...
  'proof of employment': input.proofOfEmploymentUrl || null,
  'alternate guarantee': input.alternateGuaranteeUrl || null,
  // ... other file fields ...
};
```

### Step 4: Update Get Handler to Return File URLs

**File**: `supabase/functions/rental-application/handlers/get.ts`

Add file fields to SELECT query:

```typescript
.select(`
  // ... existing fields ...
  "proof of employment",
  "alternate guarantee",
  "State ID - Front",
  "State ID - Back"
`)
```

### Step 5: Update Field Mapper for File URLs

**File**: `app/src/islands/pages/RentalApplicationPage/utils/rentalApplicationFieldMapper.ts`

Add mappings for file URLs:

```typescript
const formData: Partial<RentalApplicationFormData> = {
  // ... existing mappings ...
  proofOfEmploymentUrl: db['proof of employment'] || '',
  alternateGuaranteeUrl: db['alternate guarantee'] || '',
};
```

### Step 6: Update Local Store for File URLs

**File**: `app/src/islands/pages/RentalApplicationPage/store/rentalApplicationLocalStore.ts`

Add file URL fields to `RentalApplicationFormData`:

```typescript
export interface RentalApplicationFormData {
  // ... existing fields ...
  proofOfEmploymentUrl: string;
  alternateGuaranteeUrl: string;
  // etc.
}
```

### Step 7: Update handleFileUpload to Upload Immediately

**File**: `app/src/islands/pages/useRentalApplicationPageLogic.js`

Modify `handleFileUpload` to:
1. Convert file to base64
2. Call Edge Function `upload` action
3. Store returned URL in formData (not just React state)
4. Show upload progress/status

```javascript
const handleFileUpload = useCallback(async (fieldName, files) => {
  if (!files || files.length === 0) return;

  const file = files[0];
  setUploadProgress({ [fieldName]: 0 });

  // Convert to base64
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];

    // Upload via Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rental-application`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'upload',
        payload: {
          fileType: fieldName,
          fileName: file.name,
          fileData: base64,
          user_id: userId
        }
      })
    });

    const result = await response.json();
    if (result.success) {
      // Store URL in form data
      updateFormData({ [`${fieldName}Url`]: result.data.url });
      // Keep file reference for UI
      setUploadedFiles(prev => ({ ...prev, [fieldName]: file }));
    }
  };
  reader.readAsDataURL(file);
}, [userId, updateFormData]);
```

### Step 8: Update UI to Display Existing Files

**File**: `app/src/islands/pages/RentalApplicationPage.jsx`

When `formData.proofOfEmploymentUrl` exists, show:
- Download/view link for the file
- Option to replace with new upload

```jsx
{formData.proofOfEmploymentUrl ? (
  <div className="existing-file">
    <a href={formData.proofOfEmploymentUrl} target="_blank" rel="noopener">
      View uploaded document
    </a>
    <button onClick={() => handleFileRemove('employmentProof')}>
      Replace
    </button>
  </div>
) : (
  <div className="upload-box" onClick={() => ...}>
    {/* existing upload UI */}
  </div>
)}
```

## File Mapping Reference

| React State | Form Data Field | DB Column | Storage Path |
|-------------|-----------------|-----------|--------------|
| `employmentProof` | `proofOfEmploymentUrl` | `proof of employment` | `{userId}/employmentProof/{filename}` |
| `alternateGuarantee` | `alternateGuaranteeUrl` | `alternate guarantee` | `{userId}/alternateGuarantee/{filename}` |
| `creditScore` | `creditScoreUrl` | (needs column check) | `{userId}/creditScore/{filename}` |

## Edge Cases to Handle

1. **Legacy Bubble users** - No Supabase Auth session, use service role in Edge Function
2. **File size limits** - Enforce 10MB max in frontend and backend
3. **File type validation** - Only allow images and PDFs
4. **Upload failures** - Show error, allow retry
5. **Existing files on re-submit** - Don't re-upload unchanged files

## Testing Checklist

- [ ] Upload file as new user (no existing application)
- [ ] Upload file and submit application
- [ ] Reload page - file URL should be restored from DB
- [ ] View submitted application - file should be viewable/downloadable
- [ ] Replace existing file with new upload
- [ ] Test with legacy Bubble user (no Supabase Auth)
- [ ] Test file size limits
- [ ] Test invalid file types

## Files to Create

1. `supabase/functions/rental-application/handlers/upload.ts`

## Files to Modify

1. `supabase/functions/rental-application/index.ts` - Add `upload` action
2. `supabase/functions/rental-application/handlers/submit.ts` - Include file URLs
3. `supabase/functions/rental-application/handlers/get.ts` - Return file URLs
4. `app/src/islands/pages/RentalApplicationPage/store/rentalApplicationLocalStore.ts` - Add file URL fields
5. `app/src/islands/pages/RentalApplicationPage/utils/rentalApplicationFieldMapper.ts` - Map file URLs
6. `app/src/islands/pages/useRentalApplicationPageLogic.js` - Async file upload
7. `app/src/islands/pages/RentalApplicationPage.jsx` - Display existing files

## Estimated Effort

Medium - 4-6 hours

## Dependencies

- Supabase Storage bucket setup
- RLS policies for storage access
