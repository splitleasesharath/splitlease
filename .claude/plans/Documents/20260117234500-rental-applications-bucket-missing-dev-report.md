# Rental Applications Storage Bucket - Development Environment Gap Report

**Date:** 2026-01-17
**Issue Type:** Infrastructure Drift / Environment Parity
**Severity:** High (Blocking Feature)
**Status:** RESOLVED
**Resolution:** Created bucket via Supabase MCP on development project

---

## Executive Summary

The rental application document upload feature was failing in the development environment with the error "Bucket not found". This was caused by the `rental-applications` storage bucket existing only in production, having been created manually without a corresponding migration file.

---

## Error Observed

```
Failed to load resource: the server responded with a status of 500 ()
Upload error: Error: Failed to upload file: Bucket not found
```

**Location:** Rental Application Wizard → Step 6 (Docs) → Any file upload attempt

**User Impact:** Users could not upload supporting documents (financial guarantees, credit scores, government IDs) during the rental application process.

---

## Root Cause Analysis

### The Infrastructure Gap

| Environment | `rental-applications` Bucket | RLS Policies |
|-------------|------------------------------|--------------|
| Production | ✅ Exists (created 2025-12-23) | ✅ 4 policies |
| Development | ❌ Missing | ❌ Missing |

### Why This Happened

1. **Manual Creation in Production**: The bucket was created directly via the Supabase Dashboard in production on **2025-12-23**, bypassing the migration system.

2. **No Migration File**: Unlike database tables, there was no migration file in `supabase/migrations/` that would automatically create this bucket when setting up new environments.

3. **Development Environment Isolation**: The development Supabase project (`supabase-dev`) is completely separate from production (`supabase-live`), so manual changes in one don't propagate to the other.

### Timeline

| Date | Event |
|------|-------|
| 2025-12-23 | `rental-applications` bucket created manually in production |
| 2025-12-23 → 2026-01-17 | Feature works in production, untested in development |
| 2026-01-17 | Bug discovered when testing rental application flow in dev |
| 2026-01-17 | Bucket created in development via Supabase MCP |

---

## Technical Details

### Bucket Configuration

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rental-applications',
  'rental-applications',
  false,                    -- Private bucket (sensitive documents)
  10485760,                 -- 10 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);
```

### RLS Policies Created

All policies use folder-based access control where the first folder segment must match the authenticated user's ID:

| Policy | Operation | Logic |
|--------|-----------|-------|
| Users can view own rental application files | SELECT | `auth.uid()::text = (storage.foldername(name))[1]` |
| Users can upload own rental application files | INSERT | `auth.uid()::text = (storage.foldername(name))[1]` |
| Users can update own rental application files | UPDATE | `auth.uid()::text = (storage.foldername(name))[1]` |
| Users can delete own rental application files | DELETE | `auth.uid()::text = (storage.foldername(name))[1]` |

### Storage Path Format

Files are stored as: `{supabase_user_id}/{fileType}/{timestamp}_{filename}`

Example: `b0f29d4d-ba94-4ddd-90f1-908ce2e8f324/creditScore/1737153900000_credit-report.pdf`

---

## Code References

### Edge Function Handler

**File:** [supabase/functions/rental-application/handlers/upload.ts](../../../supabase/functions/rental-application/handlers/upload.ts)

```typescript
// Line 137-143
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('rental-applications')  // <-- This bucket was missing in dev
  .upload(storagePath, fileBytes, {
    contentType: fileType,
    upsert: true,
  });
```

### Valid File Types

The upload handler accepts these document types:
- `employmentProof` - Proof of employment
- `alternateGuarantee` / `altGuarantee` - Financial guarantee documents
- `creditScore` - Credit score screenshots
- `references` - Reference letters
- `stateIdFront` / `stateIdBack` - State ID images
- `governmentId` - Government-issued ID

---

## Resolution Applied

**Method:** Supabase MCP (`supabase-dev` server)

1. Created `rental-applications` bucket with identical configuration to production
2. Applied all 4 RLS policies for user-scoped access control

**Verification:** User successfully uploaded documents after fix was applied.

---

## Lessons Learned

### 1. Infrastructure as Code

Storage buckets should be created via migration files, not manually through the dashboard. This ensures:
- Version control of infrastructure changes
- Automatic application to new environments
- Clear audit trail of when/why changes were made

### 2. Environment Parity Checklist

Before deploying features that depend on infrastructure, verify parity across:
- [ ] Database tables and columns
- [ ] RLS policies
- [ ] **Storage buckets** ← This was missed
- [ ] Edge Functions
- [ ] Environment variables/secrets

### 3. Development-First Testing

New features should be developed and tested in the development environment first, which would have caught this issue before production deployment.

---

## Recommendations

### Short-term (Completed)
- ✅ Created bucket in development environment
- ✅ Applied matching RLS policies

### Long-term (Suggested)
1. **Create Migration File**: Add a migration file that creates the bucket so future environments are automatically configured:
   ```bash
   supabase migration new create_rental_applications_bucket
   ```

2. **Document Storage Infrastructure**: Add storage bucket requirements to the main CLAUDE.md or create a dedicated infrastructure document.

3. **CI/CD Environment Check**: Consider adding a pre-deployment check that verifies storage buckets exist before deploying Edge Functions that depend on them.

---

## Related Files

- [upload.ts](../../../supabase/functions/rental-application/handlers/upload.ts) - Upload handler
- [submit.ts](../../../supabase/functions/rental-application/handlers/submit.ts) - References uploaded file URLs
- [get.ts](../../../supabase/functions/rental-application/handlers/get.ts) - Retrieves stored file URLs

---

## Verification

After the fix:
- ✅ Bucket exists in development environment
- ✅ File uploads succeed (no "Bucket not found" error)
- ✅ Signed URLs generated correctly for file access
- ✅ RLS policies restrict access to file owner only
