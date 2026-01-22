# Migration Plan: _create-document → Split Lease Architecture

**Created:** 2026-01-22 15:38:55
**Status:** Planning
**Source:** https://github.com/splitleasesharath/_create-document.git
**Target Route:** `/_internal/create-document`

---

## Executive Summary

This plan migrates the `_create-document` Next.js application to Split Lease's Vite Islands + Supabase Edge Functions architecture. The feature allows internal admins to select policy documents, customize their names, and assign them to host users.

### Architectural Transformation Required

| Aspect | Source (Next.js) | Target (Split Lease) |
|--------|------------------|---------------------|
| **Build Tool** | Next.js 14 App Router | Vite + React 18 Islands |
| **Page Architecture** | SPA with client components | Independent page root (full reload between pages) |
| **Backend** | Direct Supabase client in browser | Supabase Edge Function (Deno) |
| **Deployment** | Vercel/Node.js | Cloudflare Pages |
| **Form State** | React useState in page | Hollow component + `useCreateDocumentPageLogic` hook |
| **API Security** | Exposed anon key in client | Secure Edge Function layer |
| **Styling** | Tailwind + shadcn/ui | Existing Split Lease shared components |

---

## Part 1: Database Schema Discrepancies

### Source Tables (from _create-document)

```
ZAT-Policies Documents     Documents Sent           users
├── id (uuid)              ├── id (uuid)            ├── id (uuid)
├── Name (text)            ├── document_on_policies ├── email (text)
├── created_at             ├── document_sent_title  ├── Name (text)
└── updated_at             ├── host_user (FK)       └── created_at
                           ├── host_email (text)
                           ├── host_name (text)
                           ├── created_at
                           └── updated_at
```

### Required Actions

#### Action 1.1: Verify Table Existence in Supabase

**CHECK** if these tables exist in Supabase dev:
- `ZAT-Policies Documents` (unusual naming with hyphen and space)
- `Documents Sent` (space in table name)

**EXPECTED ISSUE:** PostgreSQL prefers snake_case. These table names with spaces/hyphens suggest they were auto-synced from Bubble with preserved naming.

#### Action 1.2: Table Name Mapping Strategy

**Option A (Recommended):** Use existing Bubble-synced tables as-is
- Requires quoting in SQL: `"ZAT-Policies Documents"`
- Maintains Bubble sync compatibility

**Option B:** Create new normalized tables
- `policy_documents` (snake_case)
- `documents_sent`
- Requires data migration and sync configuration

**Decision Required:** Confirm which approach before proceeding.

#### Action 1.3: RLS Policies

**Required RLS for `Documents Sent`:**
```sql
-- Only authenticated admins can insert/select
CREATE POLICY "Admin users can manage documents_sent"
ON "Documents Sent"
FOR ALL
USING (
  auth.jwt() ->> 'role' = 'admin'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

---

## Part 2: Frontend Migration Steps

### Step 2.1: Route Registration

**File:** `app/src/routes.config.js`

```javascript
// Add to routes array
{
  path: '/_internal/create-document',
  file: 'create-document.html',
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'create-document-view',
  hasDynamicSegment: false
}
```

### Step 2.2: HTML Entry Point

**File:** `app/public/create-document.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Create Document | Split Lease Admin</title>
  <link rel="icon" type="image/png" href="/images/favicon.png" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/create-document.jsx"></script>
</body>
</html>
```

### Step 2.3: React Entry Point

**File:** `app/src/create-document.jsx`

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import CreateDocumentPage from './islands/pages/CreateDocumentPage/CreateDocumentPage.jsx';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <CreateDocumentPage />
  </React.StrictMode>
);
```

### Step 2.4: Page Component Structure

**Directory:** `app/src/islands/pages/CreateDocumentPage/`

```
CreateDocumentPage/
├── CreateDocumentPage.jsx              # Hollow component (UI only)
├── useCreateDocumentPageLogic.js       # All business logic
├── components/
│   └── DocumentForm.jsx                # Form inputs component
└── index.js                            # Barrel export
```

### Step 2.5: Hollow Component Implementation

**File:** `CreateDocumentPage.jsx`

```jsx
import React from 'react';
import { useCreateDocumentPageLogic } from './useCreateDocumentPageLogic.js';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import Button from '../../shared/Button.jsx';
import { useToast } from '../../shared/Toast.jsx';
import DocumentForm from './components/DocumentForm.jsx';

export default function CreateDocumentPage() {
  const { showToast } = useToast();
  const logic = useCreateDocumentPageLogic({ showToast });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Create Document</h1>

        {logic.isLoading ? (
          <div>Loading...</div>
        ) : logic.error ? (
          <div className="text-red-500">{logic.error}</div>
        ) : (
          <DocumentForm
            policyDocuments={logic.policyDocuments}
            hostUsers={logic.hostUsers}
            formState={logic.formState}
            formErrors={logic.formErrors}
            onFieldChange={logic.handleFieldChange}
            onSubmit={logic.handleSubmit}
            isSubmitting={logic.isSubmitting}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
```

### Step 2.6: Logic Hook Implementation

**File:** `useCreateDocumentPageLogic.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import { createDocument, fetchPolicyDocuments, fetchHostUsers } from './api.js';
import { validateDocumentForm } from '../../../logic/rules/documents/validateDocumentForm.js';

export function useCreateDocumentPageLogic({ showToast }) {
  // Data state
  const [policyDocuments, setPolicyDocuments] = useState([]);
  const [hostUsers, setHostUsers] = useState([]);

  // Form state
  const [formState, setFormState] = useState({
    selectedDocumentId: '',
    documentName: '',
    selectedHostId: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [docs, users] = await Promise.all([
          fetchPolicyDocuments(),
          fetchHostUsers()
        ]);
        setPolicyDocuments(docs);
        setHostUsers(users);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Auto-populate document name when document selected
  useEffect(() => {
    if (formState.selectedDocumentId) {
      const doc = policyDocuments.find(d => d.id === formState.selectedDocumentId);
      if (doc && !formState.documentName) {
        setFormState(prev => ({ ...prev, documentName: doc.Name }));
      }
    }
  }, [formState.selectedDocumentId, policyDocuments]);

  const handleFieldChange = useCallback((field, value) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [formErrors]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validate
    const errors = validateDocumentForm(formState);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedHost = hostUsers.find(u => u.id === formState.selectedHostId);

      await createDocument({
        document_on_policies: formState.selectedDocumentId,
        document_sent_title: formState.documentName,
        host_user: formState.selectedHostId,
        host_email: selectedHost?.email || '',
        host_name: selectedHost?.Name || ''
      });

      showToast({ type: 'success', message: 'Document created successfully!' });

      // Reset form
      setFormState({
        selectedDocumentId: '',
        documentName: '',
        selectedHostId: ''
      });
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, hostUsers, showToast]);

  return {
    // Data
    policyDocuments,
    hostUsers,
    // Form
    formState,
    formErrors,
    handleFieldChange,
    handleSubmit,
    // UI state
    isLoading,
    isSubmitting,
    error
  };
}
```

---

## Part 3: Edge Function Implementation

### Step 3.1: Create Edge Function Structure

**Directory:** `supabase/functions/document/`

```
document/
├── index.ts                    # Main entry point with action routing
├── handlers/
│   ├── create.ts              # Create document handler
│   ├── list-policies.ts       # List policy documents
│   └── list-hosts.ts          # List host users
├── lib/
│   └── validation.ts          # Request validation
└── deno.json                  # Deno configuration
```

### Step 3.2: Main Entry Point

**File:** `supabase/functions/document/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { errorResponse, successResponse } from "../_shared/responses.ts";
import { ValidationError } from "../_shared/errors.ts";

const ACTION_HANDLERS: Record<string, () => Promise<typeof import("./handlers/create.ts")>> = {
  create: () => import("./handlers/create.ts"),
  list_policies: () => import("./handlers/list-policies.ts"),
  list_hosts: () => import("./handlers/list-hosts.ts"),
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCors();
  }

  try {
    const { action, payload } = await req.json();

    if (!action || !ACTION_HANDLERS[action]) {
      throw new ValidationError(`Invalid action: ${action}`);
    }

    const handler = await ACTION_HANDLERS[action]();
    const result = await handler.default(payload, req);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
});
```

### Step 3.3: Create Document Handler

**File:** `supabase/functions/document/handlers/create.ts`

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";
import { ValidationError } from "../../_shared/errors.ts";
import { sendSlackNotification } from "../../_shared/slack.ts";

interface CreateDocumentPayload {
  document_on_policies: string;
  document_sent_title: string;
  host_user: string;
  host_email: string;
  host_name: string;
}

export default async function createDocument(
  payload: CreateDocumentPayload,
  _req: Request
): Promise<{ id: string; success: boolean }> {
  // Validate required fields
  if (!payload.document_on_policies) {
    throw new ValidationError("document_on_policies is required");
  }
  if (!payload.document_sent_title?.trim()) {
    throw new ValidationError("document_sent_title is required");
  }
  if (!payload.host_user) {
    throw new ValidationError("host_user is required");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Insert into Documents Sent table
  const { data, error } = await supabase
    .from("Documents Sent")
    .insert({
      document_on_policies: payload.document_on_policies,
      document_sent_title: payload.document_sent_title.trim(),
      host_user: payload.host_user,
      host_email: payload.host_email,
      host_name: payload.host_name,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create document:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Database error: ${error.message}`);
  }

  // Optional: Send Slack notification
  await sendSlackNotification({
    channel: "internal-ops",
    message: `Document "${payload.document_sent_title}" created for ${payload.host_email}`,
  }).catch(console.error);

  return { id: data.id, success: true };
}
```

### Step 3.4: List Policy Documents Handler

**File:** `supabase/functions/document/handlers/list-policies.ts`

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

interface PolicyDocument {
  id: string;
  Name: string;
}

export default async function listPolicies(): Promise<PolicyDocument[]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("ZAT-Policies Documents")
    .select("id, Name")
    .order("Name", { ascending: true });

  if (error) {
    console.error("Failed to fetch policy documents:", error);
    throw new Error(`Database error: ${error.message}`);
  }

  return data || [];
}
```

### Step 3.5: List Host Users Handler

**File:** `supabase/functions/document/handlers/list-hosts.ts`

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

interface HostUser {
  id: string;
  email: string;
  Name: string;
}

export default async function listHosts(): Promise<HostUser[]> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Query users table - adjust filter based on how hosts are identified
  const { data, error } = await supabase
    .from("user")
    .select("id, email, Name")
    .eq("is_host", true)  // Adjust field name as needed
    .order("email", { ascending: true });

  if (error) {
    console.error("Failed to fetch host users:", error);
    throw new Error(`Database error: ${error.message}`);
  }

  return data || [];
}
```

---

## Part 4: Frontend API Layer

### Step 4.1: API Functions

**File:** `app/src/islands/pages/CreateDocumentPage/api.js`

```javascript
import { supabase } from '../../../lib/supabase.js';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document`;

async function callEdgeFunction(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Request failed');
  }

  return result.data;
}

export async function fetchPolicyDocuments() {
  return callEdgeFunction('list_policies');
}

export async function fetchHostUsers() {
  return callEdgeFunction('list_hosts');
}

export async function createDocument(documentData) {
  return callEdgeFunction('create', documentData);
}
```

---

## Part 5: Business Logic Layer

### Step 5.1: Form Validation Rules

**File:** `app/src/logic/rules/documents/validateDocumentForm.js`

```javascript
/**
 * Validates the create document form
 * @param {Object} formState - Form data
 * @returns {Object} - Error messages keyed by field name
 */
export function validateDocumentForm(formState) {
  const errors = {};

  if (!formState.selectedDocumentId) {
    errors.selectedDocumentId = 'Please select a policy document';
  }

  if (!formState.documentName?.trim()) {
    errors.documentName = 'Document name is required';
  } else if (formState.documentName.trim().length > 255) {
    errors.documentName = 'Document name must be 255 characters or less';
  }

  if (!formState.selectedHostId) {
    errors.selectedHostId = 'Please select a host';
  }

  return errors;
}

/**
 * Checks if document can be created
 * @param {Object} formState - Form data
 * @returns {boolean}
 */
export function canCreateDocument(formState) {
  return Object.keys(validateDocumentForm(formState)).length === 0;
}
```

---

## Part 6: Component Migration - Discrepancies to Address

### 6.1: Select Component

**Source (shadcn/ui + Radix):**
```tsx
<Select onValueChange={handleChange}>
  <SelectTrigger variant="default" error={hasError}>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="id">Label</SelectItem>
  </SelectContent>
</Select>
```

**Target (Split Lease):**
Check if `app/src/islands/shared/` has a Select component. If not, create one or use native `<select>`:

```jsx
<select
  value={value}
  onChange={(e) => onChange(e.target.value)}
  className={`form-select ${error ? 'border-red-500' : ''}`}
>
  <option value="">Select...</option>
  {options.map(opt => (
    <option key={opt.id} value={opt.id}>{opt.label}</option>
  ))}
</select>
```

### 6.2: Input Component

**Source:**
```tsx
<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}
  error={hasError}
  className="w-[250px]"
/>
```

**Target:** Use existing Input pattern or create thin wrapper.

### 6.3: Button Component

**Source:**
```tsx
<Button variant="purple" type="submit">
  Create Document
</Button>
```

**Target:** Map to Split Lease Button:
```jsx
<Button variant="primary" type="submit">
  Create Document
</Button>
```

### 6.4: CorporateHeader

**Source:** Custom header with Split Lease branding
**Target:** Use existing `Header.jsx` shared component

### 6.5: Crisp Chat

**Source:** Integrated Crisp chat widget
**Target:** **REMOVE** - Not needed for internal admin pages

---

## Part 7: Styling Migration

### 7.1: Color Mapping

| Source (Tailwind Custom) | Target (Split Lease) |
|--------------------------|---------------------|
| `sl-purple` (#6D31C2) | Verify in `tailwind.config.js` or add |
| `sl-aqua` (#52A8EC) | Verify or add |
| `sl-text` (#3D3D3D) | Use existing text color |
| `sl-error` (#FF0000) | Use `text-red-500` or similar |

### 7.2: Form Layout

**Source:** Fixed 250px width inputs
**Target:** Use responsive widths or match existing form patterns in Split Lease

---

## Part 8: Security Considerations

### 8.1: Admin-Only Access

**Route Config:**
```javascript
{
  protected: true,
  adminOnly: true
}
```

**Edge Function:** Verify admin role in JWT:
```typescript
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');
// Decode and verify admin claim
```

### 8.2: Input Sanitization

- Trim whitespace from document name
- Validate UUID format for IDs
- Prevent XSS in document name display

---

## Part 9: Testing Checklist

### 9.1: Unit Tests

- [ ] `validateDocumentForm` with valid/invalid inputs
- [ ] `canCreateDocument` predicate
- [ ] API function error handling

### 9.2: Integration Tests

- [ ] Edge Function `create` action with valid payload
- [ ] Edge Function `create` action with missing fields
- [ ] Edge Function `list_policies` returns sorted data
- [ ] Edge Function `list_hosts` returns host users only

### 9.3: E2E Tests

- [ ] Page loads for admin users
- [ ] Page redirects non-admin users
- [ ] Form validation displays errors
- [ ] Successful document creation shows toast
- [ ] Form resets after successful submission

---

## Part 10: Deployment Steps

### 10.1: Pre-Deployment

1. Run `bun run generate-routes` after adding route config
2. Verify Supabase tables exist and have correct structure
3. Apply any necessary RLS policies

### 10.2: Edge Function Deployment

```bash
# Deploy to development
supabase functions deploy document --project-ref <dev-project-id>

# Test in development
curl -X POST https://<dev-project>.supabase.co/functions/v1/document \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"action": "list_policies", "payload": {}}'

# Deploy to production (after verification)
supabase functions deploy document --project-ref <prod-project-id>
```

### 10.3: Frontend Deployment

```bash
# Build and preview locally
bun run build
bun run preview

# Deploy to Cloudflare
npx wrangler pages deploy dist --project-name splitlease
```

---

## File References

### Source Files (to migrate FROM)
- `_create-document/app/_create-document/page.tsx` - Main page component
- `_create-document/components/ui/` - UI components (select, input, button)
- `_create-document/lib/supabase/client.ts` - Supabase client setup
- `_create-document/types/database.ts` - TypeScript types

### Target Files (to CREATE)
- `app/src/routes.config.js` - Add route entry
- `app/public/create-document.html` - HTML entry point
- `app/src/create-document.jsx` - React entry point
- `app/src/islands/pages/CreateDocumentPage/` - Page directory
- `app/src/logic/rules/documents/` - Validation rules
- `supabase/functions/document/` - Edge Function

### Reference Files (existing patterns)
- [routes.config.js](../../../app/src/routes.config.js) - Route patterns
- [ManageRentalApplicationsPage/](../../../app/src/islands/pages/ManageRentalApplicationsPage/) - Admin page pattern
- [listing/index.ts](../../../supabase/functions/listing/index.ts) - Edge Function pattern
- [Button.jsx](../../../app/src/islands/shared/Button.jsx) - Shared component

---

## Open Questions (Require Clarification)

1. **Table Names:** Confirm exact Supabase table names for `ZAT-Policies Documents` and `Documents Sent`
2. **Host User Filter:** How are host users identified in the `user` table? (`is_host` field? role?)
3. **Existing Components:** Does Split Lease have a Select dropdown component, or should we create one?
4. **Crisp Chat:** Should Crisp chat be included on internal pages, or is it guest-facing only?
5. **Document Workflow:** After creating a `Documents Sent` record, what happens next? (Email sent? Bubble sync?)

---

## Estimated Effort

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Database Setup | Verify tables, add RLS | 0.5 hours |
| Edge Function | Create with 3 handlers | 2 hours |
| Frontend Page | Component + logic hook | 3 hours |
| Styling/Polish | Match Split Lease design | 1 hour |
| Testing | Unit + integration | 2 hours |
| Deployment | Dev + prod | 0.5 hours |
| **Total** | | **~9 hours** |

---

## Next Steps

1. **Confirm database table names** via Supabase MCP
2. **Check for existing Select component** in shared components
3. **Begin implementation** following this plan
4. **Move to `.claude/plans/Done/`** after implementation complete
