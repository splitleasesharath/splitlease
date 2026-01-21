# Rental Application Edge Function

**GENERATED**: 2026-01-20
**VERSION**: 1.0
**LOCATION**: `supabase/functions/rental-application/index.ts`
**ENDPOINT**: `POST /functions/v1/rental-application`

---

## Overview

Handles rental application processing including form submission, data retrieval, and document uploads. Operates **Supabase-only** (no Bubble sync).

---

## Actions

| Action | Purpose | Auth Required |
|--------|---------|---------------|
| `submit` | Submit rental application form data | Public* |
| `get` | Get existing application data | Public* |
| `upload` | Upload supporting documents | Public* |

> **Note**: "Public*" indicates actions support legacy Bubble auth (user_id in payload) for backward compatibility.

---

## Authentication

Supports dual authentication:

```typescript
/**
 * Get user ID from JWT or payload
 * Public actions allow user_id from payload for legacy support
 */
const getUserId = async (
  headers: Headers,
  payload: Record<string, unknown>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  requireAuth: boolean
): Promise<Result<string, AuthenticationError>> => {
  // For public actions, try payload first
  if (!requireAuth) {
    const payloadUserId = payload.user_id as string | undefined;
    if (payloadUserId) {
      return ok(payloadUserId);
    }
  }
  // Try JWT authentication
  // ...
};
```

---

## Request Format

### Submit Application

```json
{
  "action": "submit",
  "payload": {
    "user_id": "uuid",             // Optional if JWT auth
    "proposal_id": "uuid",
    "personal_info": {
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "date_of_birth": "1990-01-15"
    },
    "employment": {
      "employer": "Acme Corp",
      "job_title": "Software Engineer",
      "annual_income": 120000,
      "employment_status": "employed"
    },
    "rental_history": {
      "current_address": "123 Main St, NYC",
      "landlord_name": "Jane Smith",
      "landlord_phone": "+0987654321",
      "monthly_rent": 2500,
      "move_in_date": "2023-01-01"
    },
    "references": [
      {
        "name": "Bob Jones",
        "relationship": "Former Landlord",
        "phone": "+1112223333"
      }
    ]
  }
}
```

### Get Application

```json
{
  "action": "get",
  "payload": {
    "user_id": "uuid",
    "proposal_id": "uuid"
  }
}
```

### Upload Document

```json
{
  "action": "upload",
  "payload": {
    "user_id": "uuid",
    "application_id": "uuid",
    "document_type": "id_photo" | "pay_stub" | "bank_statement" | "reference_letter",
    "file_url": "https://storage.../document.pdf"
  }
}
```

---

## Response Format

### Submit Response

```json
{
  "success": true,
  "data": {
    "application_id": "uuid",
    "status": "submitted",
    "submitted_at": "2026-01-20T..."
  }
}
```

### Get Response

```json
{
  "success": true,
  "data": {
    "application_id": "uuid",
    "status": "submitted",
    "personal_info": {...},
    "employment": {...},
    "rental_history": {...},
    "references": [...],
    "documents": [
      {
        "type": "id_photo",
        "url": "https://storage.../id.jpg",
        "uploaded_at": "2026-01-20T..."
      }
    ]
  }
}
```

---

## FP Architecture

```typescript
const ALLOWED_ACTIONS = ["submit", "get", "upload"] as const;

// All actions public for legacy support
const PUBLIC_ACTIONS: ReadonlySet<string> = new Set(["submit", "get", "upload"]);

// Handler map (immutable record)
const handlers: Readonly<Record<Action, Function>> = {
  submit: handleSubmit,
  get: handleGet,
  upload: handleUpload,
};
```

---

## Application Status Flow

```
draft → submitted → under_review → approved
                         ↓
                    rejected
```

| Status | Description |
|--------|-------------|
| `draft` | Started but not submitted |
| `submitted` | Application submitted |
| `under_review` | Host reviewing application |
| `approved` | Application approved |
| `rejected` | Application rejected |

---

## Document Types

| Type | Purpose |
|------|---------|
| `id_photo` | Government-issued ID |
| `pay_stub` | Income verification |
| `bank_statement` | Financial verification |
| `reference_letter` | Reference from landlord/employer |
| `proof_of_employment` | Employment letter |

---

## Pre-fill Feature

Applications can be pre-filled from user profile data (commit `10501376`):

```javascript
// Frontend pre-fills form from user profile
const prefillData = {
  full_name: user.name,
  email: user.email,
  phone: user.phone,
  job_title: user.job_title // Synced for business owners
};
```

---

## Related Tables

| Table | Purpose |
|-------|---------|
| `rental_application` | Application records |
| `rental_application_document` | Uploaded documents |
| `proposal` | Associated proposal |

---

## Related Files

- Handler: `rental-application/handlers/submit.ts`
- Handler: `rental-application/handlers/get.ts`
- Handler: `rental-application/handlers/upload.ts`

---

**LAST_UPDATED**: 2026-01-20
