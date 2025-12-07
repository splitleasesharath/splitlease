# Bubble Data API Sync Design

**Created**: 2025-12-05
**Status**: Design/Review
**Related**: `SUPABASE_TO_BUBBLE_SYNC_DESIGN.md`, `bubble_to_supabase_sync.py`

---

## Overview

This document describes a **direct Data API integration** for syncing Supabase records to Bubble. Unlike the Workflow API (`/wf/`), the Data API (`/obj/`) provides direct CRUD operations on Bubble's database.

### Comparison: Data API vs Workflow API

| Aspect | Data API (`/obj/`) | Workflow API (`/wf/`) |
|--------|-------------------|----------------------|
| **Operations** | Direct CRUD (POST, PATCH, DELETE, GET) | Trigger custom workflows |
| **Complexity** | Simple, RESTful | Complex, business logic |
| **Response** | Returns created ID immediately | Variable, workflow-dependent |
| **Use Case** | Data sync, replication | Business operations |
| **When to Use** | Simple data mirroring | When Bubble-side logic needed |

**Recommendation**: Use **Data API** for straightforward sync operations.

---

## API Specification

### Base Configuration

```typescript
const BUBBLE_CONFIG = {
    BASE_URL: 'https://upgradefromstr.bubbleapps.io/api/1.1',
    DATA_API_PATH: '/obj',
    AUTH_HEADER: 'Bearer <BUBBLE_API_KEY>'
};
```

### Endpoints

| Operation | Method | Endpoint | Body | Response |
|-----------|--------|----------|------|----------|
| **Create** | POST | `/obj/{table_name}` | Field values JSON | `{ status: "success", id: "<bubble_id>" }` |
| **Update** | PATCH | `/obj/{table_name}/{bubble_id}` | Field values JSON | `{ status: "success" }` |
| **Delete** | DELETE | `/obj/{table_name}/{bubble_id}` | None | `{ status: "success" }` |
| **Get One** | GET | `/obj/{table_name}/{bubble_id}` | None | `{ response: { ...fields } }` |
| **Get All** | GET | `/obj/{table_name}` | Query params | `{ response: { results: [...], remaining: N } }` |

### Request Headers

```http
Authorization: Bearer <BUBBLE_API_KEY>
Content-Type: application/json
```

---

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE → BUBBLE FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  CASE 1: NEW RECORD (no bubble_id)                                │   │
│  │                                                                    │   │
│  │  Supabase Record Created                                          │   │
│  │      ↓                                                            │   │
│  │  sync_queue (operation: INSERT, bubble_id: null)                  │   │
│  │      ↓                                                            │   │
│  │  Transform Fields (Supabase → Bubble format)                      │   │
│  │      ↓                                                            │   │
│  │  POST /obj/{table}                                                │   │
│  │      ↓                                                            │   │
│  │  Response: { id: "1234567890x123" }                               │   │
│  │      ↓                                                            │   │
│  │  UPDATE Supabase SET bubble_id = "1234567890x123"                 │   │
│  │                                                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  CASE 2: EXISTING RECORD (has bubble_id)                          │   │
│  │                                                                    │   │
│  │  Supabase Record Updated                                          │   │
│  │      ↓                                                            │   │
│  │  sync_queue (operation: UPDATE, bubble_id: "1234567890x123")      │   │
│  │      ↓                                                            │   │
│  │  Transform Fields (Supabase → Bubble format)                      │   │
│  │      ↓                                                            │   │
│  │  PATCH /obj/{table}/1234567890x123                                │   │
│  │      ↓                                                            │   │
│  │  Response: { status: "success" }                                  │   │
│  │                                                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  CASE 3: DELETE RECORD                                            │   │
│  │                                                                    │   │
│  │  Supabase Record Deleted (with bubble_id)                         │   │
│  │      ↓                                                            │   │
│  │  sync_queue (operation: DELETE, bubble_id: "1234567890x123")      │   │
│  │      ↓                                                            │   │
│  │  DELETE /obj/{table}/1234567890x123                               │   │
│  │      ↓                                                            │   │
│  │  Response: { status: "success" }                                  │   │
│  │                                                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Field Mapping Strategy

### The Challenge

Supabase and Bubble use different field naming conventions:

| Supabase | Bubble |
|----------|--------|
| `_id` | `_id` (same) |
| `created_date` | `Created Date` |
| `features_qty_bedrooms` | `Features - Qty Bedrooms` |
| `💰monthly_host_rate` | `💰Monthly Host Rate` |
| `is_private` | `is private?` |

### Solution: Field Mapping Registry

Create a bidirectional mapping registry per table:

```typescript
// Simplified example
const FIELD_MAPPING = {
    listing: {
        // Supabase field → Bubble field
        tooBubble: {
            '_id': '_id',
            'name': 'Name',
            'features_qty_bedrooms': 'Features - Qty Bedrooms',
            'is_private': 'is private?',
            'monthly_host_rate': '💰Monthly Host Rate',
        },
        // Bubble field → Supabase field (reverse)
        fromBubble: {
            '_id': '_id',
            'Name': 'name',
            'Features - Qty Bedrooms': 'features_qty_bedrooms',
            'is private?': 'is_private',
            '💰Monthly Host Rate': 'monthly_host_rate',
        }
    }
};
```

### Auto-Generation Strategy

Since we have `bubble_to_supabase_sync.py` that already handles the Bubble→Supabase direction, we can:
1. Extract field names from existing sync runs
2. Generate mappings programmatically
3. Store in `sync_config.field_mapping` JSONB column

---

## ID Tracking: `_id` vs `bubble_id`

### Current State (from `bubble_to_supabase_sync.py`)

The pull script uses `_id` as the primary key, which is Bubble's internal ID:
- Format: `"1734012345678x123456789"` (timestamp + random)
- Used for upsert conflict resolution

### Proposed Dual-ID Strategy

| Field | Source | Purpose |
|-------|--------|---------|
| `_id` | Bubble | Bubble's internal ID, used as PK in Supabase |
| `bubble_id` | Bubble | Same as `_id`, explicitly named for clarity |
| `supabase_id` | Supabase | UUID, for Supabase-native operations |

**Recommended Approach**: Use `_id` as the canonical identifier (as it's already the PK).

### Sync Scenarios

#### Scenario A: Record Originates in Bubble (existing flow)
```
Bubble creates record → _id assigned → Pull to Supabase → _id preserved
```

#### Scenario B: Record Originates in Supabase (new flow)
```
Supabase creates record → _id = NULL initially
    ↓
Push to Bubble via POST /obj/{table}
    ↓
Bubble creates record, returns { id: "..." }
    ↓
Update Supabase SET _id = returned id
```

**Important**: For Supabase-originated records, we need a temporary identifier until Bubble assigns the `_id`. Options:
1. Use UUID in `supabase_id` column, leave `_id` NULL until synced
2. Generate a placeholder `_id` locally (not recommended - breaks Bubble's ID format)

---

## API Call Builder

### Request Builder Interface

```typescript
interface BubbleApiRequest {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    endpoint: string;
    headers: Record<string, string>;
    body?: Record<string, unknown>;
}

interface BubbleApiResponse {
    success: boolean;
    status: number;
    data?: {
        id?: string;           // For POST (create)
        response?: unknown;    // For GET
        status?: string;       // "success" for mutations
    };
    error?: string;
}
```

### Builder Functions

```typescript
// Build CREATE request
function buildCreateRequest(
    tableName: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): BubbleApiRequest {
    const transformedData = applyFieldMapping(data, fieldMapping);

    return {
        method: 'POST',
        endpoint: `/obj/${tableName}`,
        headers: {
            'Authorization': `Bearer ${BUBBLE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: transformedData
    };
}

// Build UPDATE request
function buildUpdateRequest(
    tableName: string,
    bubbleId: string,
    data: Record<string, unknown>,
    fieldMapping?: Record<string, string>
): BubbleApiRequest {
    const transformedData = applyFieldMapping(data, fieldMapping);

    return {
        method: 'PATCH',
        endpoint: `/obj/${tableName}/${bubbleId}`,
        headers: {
            'Authorization': `Bearer ${BUBBLE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: transformedData
    };
}

// Build DELETE request
function buildDeleteRequest(
    tableName: string,
    bubbleId: string
): BubbleApiRequest {
    return {
        method: 'DELETE',
        endpoint: `/obj/${tableName}/${bubbleId}`,
        headers: {
            'Authorization': `Bearer ${BUBBLE_API_KEY}`
        }
    };
}
```

---

## Data Transformation Rules

### Supabase → Bubble (Push)

| Supabase Type | Bubble Type | Transformation |
|---------------|-------------|----------------|
| `boolean` | `yes/no` | Keep as `true`/`false` |
| `integer` | `number` | Keep as-is |
| `numeric` | `number` | Keep as-is |
| `text` | `text` | Keep as-is |
| `timestamptz` | `date` | ISO 8601 string |
| `jsonb` (array) | `list` | Parse if string, keep if array |
| `jsonb` (object) | `geographic address` / other | Parse if string |
| Day indices (0-6) | Day indices (1-7) | Add 1 |

### Special Fields

```typescript
// Fields that need day index conversion (JS 0-6 → Bubble 1-7)
const DAY_INDEX_FIELDS = [
    'Days Available (List of Days)',
    'Days Not Available',
    'Nights Available (List of Nights)',
    'Nights Not Available',
    'Nights Available (numbers)'
];

// Fields to NEVER sync (security)
const EXCLUDED_FIELDS = [
    'password_hash',
    'refresh_token',
    'access_token',
    'api_key',
    'Created Date',    // Bubble manages this
    'Modified Date'    // Bubble manages this
];

// Fields that are read-only in Bubble
const READ_ONLY_FIELDS = [
    '_id',
    'Created Date',
    'Modified Date',
    'Created By',
    'Modified By'
];
```

---

## Table Name Mapping

Supabase uses underscores, Bubble uses hyphens:

```typescript
const TABLE_NAME_MAPPING = {
    // Supabase → Bubble
    toBubble: {
        'user': 'user',
        'listing': 'listing',
        'proposal': 'proposal',
        'bookings_stays': 'bookings-stays',
        'bookings_leases': 'bookings-leases',
        'account_host': 'account_host',
        'account_guest': 'account_guest',
        'listing_photo': 'listing-photo',
        'payment_records': 'paymentrecords',
        '_message': '_message',
        'main_review': 'mainreview',
        'house_manual': 'housemanual',
    },
    // Bubble → Supabase (reverse)
    fromBubble: {
        'user': 'user',
        'listing': 'listing',
        'proposal': 'proposal',
        'bookings-stays': 'bookings_stays',
        'bookings-leases': 'bookings_leases',
        // ... etc
    }
};
```

---

## Updated sync_config Schema

Add new columns for Data API integration:

```sql
ALTER TABLE sync_config ADD COLUMN IF NOT EXISTS
    use_data_api BOOLEAN DEFAULT TRUE;  -- Use Data API instead of Workflow API

ALTER TABLE sync_config ADD COLUMN IF NOT EXISTS
    bubble_table_name TEXT;  -- Override table name for Bubble (e.g., 'bookings-stays')

-- Update field_mapping structure:
-- {
--   "toBubble": { "supabase_field": "Bubble Field" },
--   "fromBubble": { "Bubble Field": "supabase_field" }
-- }
```

---

## Implementation Plan

### Phase 1: Core Library
1. Create `bubbleDataApi.ts` - API call builder and executor
2. Create `fieldMapping.ts` - Field transformation utilities
3. Create `tableMapping.ts` - Table name mappings

### Phase 2: Integration
1. Update `processQueue.ts` handler to support Data API
2. Add `bubble_id` update logic after POST
3. Add Data API mode flag to `sync_config`

### Phase 3: Testing
1. Test CREATE flow (POST + update Supabase with returned ID)
2. Test UPDATE flow (PATCH with existing bubble_id)
3. Test DELETE flow (DELETE with bubble_id)

### Phase 4: Field Mapping Generation
1. Extract field names from existing Supabase schema
2. Map to known Bubble field names
3. Populate `sync_config.field_mapping`

---

## Example API Calls

### Create User

**Request:**
```http
POST https://upgradefromstr.bubbleapps.io/api/1.1/obj/user
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
    "Name": "John Doe",
    "Email": "john@example.com",
    "Phone": "+1234567890",
    "Toggle - Is Admin": false,
    "is email confirmed": true
}
```

**Response:**
```json
{
    "status": "success",
    "id": "1734123456789x987654321"
}
```

### Update Listing

**Request:**
```http
PATCH https://upgradefromstr.bubbleapps.io/api/1.1/obj/listing/1734123456789x111111111
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
    "Name": "Cozy Brooklyn Apartment",
    "Features - Qty Bedrooms": 2,
    "Active": true,
    "💰Monthly Host Rate": 2500
}
```

**Response:**
```json
{
    "status": "success"
}
```

### Delete Proposal

**Request:**
```http
DELETE https://upgradefromstr.bubbleapps.io/api/1.1/obj/proposal/1734123456789x222222222
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
    "status": "success"
}
```

---

## Questions for Review

1. **Primary Key Strategy**: Should we keep `_id` as the sole identifier, or add a separate `supabase_uuid` for Supabase-native records?

2. **Field Mapping Source**: Should we manually curate field mappings, or auto-generate from schema introspection?

3. **Conflict Resolution**: If Bubble and Supabase diverge, which is authoritative? (Current assumption: Bubble is source of truth)

4. **Rate Limiting**: Bubble has API rate limits. Should we implement throttling in the sync queue processor?

5. **Partial Updates**: Should PATCH send all fields, or only changed fields? (Recommendation: only changed fields to reduce payload)

---

## Files to Create

```
supabase/functions/bubble_sync/lib/
├── bubbleDataApi.ts      # Data API client
├── fieldMapping.ts       # Field name transformations
├── tableMapping.ts       # Table name mappings
└── transformer.ts        # (existing) Type transformations

supabase/migrations/
└── 20251205_add_data_api_columns.sql
```

---

**Document Version**: 1.0
**Author**: Claude
**Status**: Ready for Review
