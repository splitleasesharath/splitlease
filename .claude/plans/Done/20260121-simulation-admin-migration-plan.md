# Simulation Admin Internal Tool - Migration Plan

**Created**: 2026-01-21
**Source Repository**: https://github.com/splitleasesharath/_simulation-admin.git
**Target Location**: `app/src/islands/pages/SimulationAdminPage/`
**Route**: `/_internal/simulation-admin`

---

## Executive Summary

This plan migrates the standalone `_simulation-admin` React application into the Split Lease monorepo as an internal admin tool. The tool allows administrators to:

1. **Select testers** from a filterable dropdown
2. **View tester progress** through the 8-stage usability testing workflow
3. **Reset testers** back to "not_started" state (Day 1 restart)
4. **Advance testers** to Day 2 testing phase

---

## Architecture Mapping

### Source vs Target Comparison

| Aspect | Source (_simulation-admin) | Target (Split Lease) |
|--------|---------------------------|----------------------|
| **Framework** | React 19 + TypeScript | React 18 + JavaScript (JSX) |
| **Build** | Standalone Vite app | Islands Architecture (multi-entry Vite) |
| **Styling** | CSS Modules (`.module.css`) | Plain CSS files (`.css`) |
| **State** | Local useState in page component | Hollow component + `useXxxPageLogic` hook |
| **API** | In-memory mock data | Supabase Edge Functions |
| **Data Types** | TypeScript interfaces | JSDoc comments (optional) |
| **User Schema** | Custom `User` type with `usabilityStep` string | Existing `user` table with `Usability Step` integer |

---

## Database Schema Analysis

### Existing User Table Columns (Relevant)

The `user` table already has these columns for usability testing:

| Column | Type | Purpose |
|--------|------|---------|
| `is usability tester` | boolean | Flags users as testers |
| `Usability Step` | integer | Current progress step (0-7) |
| `override tester?` | boolean | Override flag for tester status |
| `Name - First` | text | First name |
| `Name - Last` | text | Last name |
| `email` | text | Email address |
| `Modified Date` | timestamp | Last update timestamp |

### Usability Step Mapping

The source uses string-based steps; the database uses integers. Here's the mapping:

| Integer | Source String | Display Label |
|---------|---------------|---------------|
| 0 | `not_started` | Not Started |
| 1 | `day_1_intro` | Day 1 - Introduction |
| 2 | `day_1_tasks` | Day 1 - Tasks |
| 3 | `day_1_complete` | Day 1 - Complete |
| 4 | `day_2_intro` | Day 2 - Introduction |
| 5 | `day_2_tasks` | Day 2 - Tasks |
| 6 | `day_2_complete` | Day 2 - Complete |
| 7 | `completed` | Completed |

**No database migration required** - the existing schema supports all functionality.

---

## Discrepancies & Required Changes

### 1. TypeScript → JavaScript Conversion

**Source** (TypeScript):
```typescript
interface User {
  id: string;
  email: string;
  name: { first: string; last: string };
  aiCredits: number;
  type: 'tester' | 'admin' | 'standard';
  usabilityStep: UsabilityStep;
  createdAt: string;
  updatedAt: string;
}
```

**Target** (JavaScript with JSDoc):
```javascript
/**
 * @typedef {Object} TesterUser
 * @property {string} id - User ID (_id from database)
 * @property {string} email - User email
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {number} usabilityStep - Current step (0-7)
 * @property {string} modifiedDate - Last modified timestamp
 */
```

### 2. CSS Modules → Plain CSS

**Source**: `SimulationAdmin.module.css` with scoped classes
```css
.page { /* scoped to component */ }
.container { /* scoped */ }
```

**Target**: `SimulationAdminPage.css` with BEM-style naming
```css
.simulation-admin-page { /* global but namespaced */ }
.simulation-admin-page__container { /* BEM naming */ }
```

### 3. Mock Data → Edge Function API

**Source** (`userService.ts`):
```typescript
export async function fetchUsers(): Promise<User[]> {
  await simulateNetworkDelay();
  return mockUsers.filter(u => u.type === 'tester');
}
```

**Target** (Edge Function call in hook):
```javascript
async function callEdgeFunction(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/simulation-admin`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    }
  );
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Request failed');
  }
  return result.data;
}
```

### 4. Component Architecture

**Source**: Logic embedded in page component
```typescript
// SimulationAdmin.tsx - 6,459 bytes with mixed logic & JSX
const [users, setUsers] = useState<User[]>([]);
// ... all logic inline
```

**Target**: Hollow component pattern
```javascript
// SimulationAdminPage.jsx - Pure rendering, ~150 lines
import useSimulationAdminPageLogic from './useSimulationAdminPageLogic.js';

export default function SimulationAdminPage() {
  const { testers, selectedTester, ...handlers } = useSimulationAdminPageLogic();
  return (/* JSX only */);
}

// useSimulationAdminPageLogic.js - All business logic, ~300 lines
export default function useSimulationAdminPageLogic() {
  // All state, effects, handlers here
  return { /* all exports */ };
}
```

### 5. Usability Step Type Conversion

**Source**: String enum
```typescript
type UsabilityStep = 'not_started' | 'day_1_intro' | ...;
```

**Target**: Integer with display mapping
```javascript
const USABILITY_STEP_CONFIG = {
  0: { key: 'not_started', label: 'Not Started', canAdvance: true, canReset: false },
  1: { key: 'day_1_intro', label: 'Day 1 - Introduction', canAdvance: true, canReset: true },
  2: { key: 'day_1_tasks', label: 'Day 1 - Tasks', canAdvance: true, canReset: true },
  3: { key: 'day_1_complete', label: 'Day 1 - Complete', canAdvance: true, canReset: true },
  4: { key: 'day_2_intro', label: 'Day 2 - Introduction', canAdvance: true, canReset: true },
  5: { key: 'day_2_tasks', label: 'Day 2 - Tasks', canAdvance: true, canReset: true },
  6: { key: 'day_2_complete', label: 'Day 2 - Complete', canAdvance: false, canReset: true },
  7: { key: 'completed', label: 'Completed', canAdvance: false, canReset: true },
};
```

### 6. No `aiCredits` Field

The source displays `aiCredits` for each user. This field does not exist in the Split Lease user schema. **Decision**: Remove this display element entirely.

### 7. URL Parameter Handling

**Source**: Direct window.location access
```typescript
const params = new URLSearchParams(window.location.search);
const testerId = params.get('tester');
```

**Target**: Same pattern works, but should be in hook
```javascript
// In useSimulationAdminPageLogic.js
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const testerId = params.get('tester');
  if (testerId && testers.length > 0) {
    const tester = testers.find(t => t.id === testerId);
    if (tester) setSelectedTester(tester);
  }
}, [testers]);
```

---

## Files to Create

### Frontend (app/src/)

```
app/
├── public/
│   └── simulation-admin.html                    # HTML entry point
├── src/
│   ├── simulation-admin.jsx                     # React mount entry
│   └── islands/pages/SimulationAdminPage/
│       ├── index.jsx                            # Re-export
│       ├── SimulationAdminPage.jsx              # Hollow page component
│       ├── SimulationAdminPage.css              # Page styles
│       ├── useSimulationAdminPageLogic.js       # Logic hook
│       └── components/
│           ├── TesterSelector.jsx               # Dropdown selector
│           ├── TesterSelector.css
│           ├── TesterInfoDisplay.jsx            # Selected tester details
│           ├── TesterInfoDisplay.css
│           ├── ActionButton.jsx                 # Styled button component
│           ├── ActionButton.css
│           ├── ConfirmationModal.jsx            # Reset confirmation
│           └── ConfirmationModal.css
```

### Backend (supabase/functions/)

```
supabase/functions/
└── simulation-admin/
    ├── index.ts                                 # Main handler
    └── deno.json                                # Deno config (if needed)
```

---

## Route Registration

Add to `app/src/routes.config.js`:

```javascript
{
  path: '/_internal/simulation-admin',
  file: 'simulation-admin.html',
  aliases: ['/_internal/simulation-admin.html', '/simulation-admin'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'simulation-admin-view',
  hasDynamicSegment: false
}
```

---

## Edge Function Implementation

### Actions Required

| Action | Description | Input | Output |
|--------|-------------|-------|--------|
| `listTesters` | Get all usability testers | `{ limit?, offset?, search? }` | `{ testers: TesterUser[], total: number }` |
| `getTester` | Get single tester by ID | `{ testerId: string }` | `{ tester: TesterUser }` |
| `resetToDay1` | Reset tester to step 0 | `{ testerId: string }` | `{ tester: TesterUser }` |
| `advanceToDay2` | Advance tester to step 4 | `{ testerId: string }` | `{ tester: TesterUser }` |
| `getStatistics` | Get step distribution | `{}` | `{ stats: StepStats[] }` |

### Edge Function Skeleton

```typescript
// supabase/functions/simulation-admin/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, handleCorsOptions, createJsonResponse, createErrorResponse } from "../_shared/cors.ts";

const USABILITY_STEP_CONFIG = {
  0: { key: 'not_started', label: 'Not Started' },
  1: { key: 'day_1_intro', label: 'Day 1 - Introduction' },
  2: { key: 'day_1_tasks', label: 'Day 1 - Tasks' },
  3: { key: 'day_1_complete', label: 'Day 1 - Complete' },
  4: { key: 'day_2_intro', label: 'Day 2 - Introduction' },
  5: { key: 'day_2_tasks', label: 'Day 2 - Tasks' },
  6: { key: 'day_2_complete', label: 'Day 2 - Complete' },
  7: { key: 'completed', label: 'Completed' },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions();
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Missing authorization header', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return createErrorResponse('Authentication failed', 401);
    }

    // Check admin status
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('"Toggle - Is Admin", "Toggle - Is Corporate User"')
      .eq('authentication->>id', user.id)
      .single();

    if (userError || (!userData?.['Toggle - Is Admin'] && !userData?.['Toggle - Is Corporate User'])) {
      return createErrorResponse('Admin access required', 403);
    }

    const { action, payload } = await req.json();

    switch (action) {
      case 'listTesters':
        return await handleListTesters(supabase, payload);
      case 'getTester':
        return await handleGetTester(supabase, payload);
      case 'resetToDay1':
        return await handleResetToDay1(supabase, payload);
      case 'advanceToDay2':
        return await handleAdvanceToDay2(supabase, payload);
      case 'getStatistics':
        return await handleGetStatistics(supabase);
      default:
        return createErrorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error('[simulation-admin] Error:', error);
    return createErrorResponse(error.message || 'Internal server error', 500);
  }
});

async function handleListTesters(supabase, payload) {
  const { limit = 50, offset = 0, search = '' } = payload || {};

  let query = supabase
    .from('user')
    .select('_id, email, "Name - First", "Name - Last", "Usability Step", "Modified Date"', { count: 'exact' })
    .eq('is usability tester', true)
    .order('"Name - First"', { ascending: true });

  if (search) {
    query = query.or(`"Name - First".ilike.%${search}%,"Name - Last".ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  const testers = data.map(formatTester);

  return createJsonResponse({
    success: true,
    data: { testers, total: count, stepConfig: USABILITY_STEP_CONFIG }
  });
}

async function handleGetTester(supabase, payload) {
  const { testerId } = payload;

  const { data, error } = await supabase
    .from('user')
    .select('_id, email, "Name - First", "Name - Last", "Usability Step", "Modified Date"')
    .eq('_id', testerId)
    .single();

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  return createJsonResponse({
    success: true,
    data: { tester: formatTester(data) }
  });
}

async function handleResetToDay1(supabase, payload) {
  const { testerId } = payload;

  const { data, error } = await supabase
    .from('user')
    .update({
      'Usability Step': 0,
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', testerId)
    .select('_id, email, "Name - First", "Name - Last", "Usability Step", "Modified Date"')
    .single();

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  return createJsonResponse({
    success: true,
    data: { tester: formatTester(data) }
  });
}

async function handleAdvanceToDay2(supabase, payload) {
  const { testerId } = payload;

  const { data, error } = await supabase
    .from('user')
    .update({
      'Usability Step': 4, // day_2_intro
      'Modified Date': new Date().toISOString()
    })
    .eq('_id', testerId)
    .select('_id, email, "Name - First", "Name - Last", "Usability Step", "Modified Date"')
    .single();

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  return createJsonResponse({
    success: true,
    data: { tester: formatTester(data) }
  });
}

async function handleGetStatistics(supabase) {
  const { data, error } = await supabase
    .from('user')
    .select('"Usability Step"')
    .eq('is usability tester', true);

  if (error) {
    return createErrorResponse(error.message, 500);
  }

  // Count by step
  const stepCounts = {};
  for (let i = 0; i <= 7; i++) {
    stepCounts[i] = 0;
  }
  data.forEach(user => {
    const step = user['Usability Step'] ?? 0;
    if (stepCounts[step] !== undefined) {
      stepCounts[step]++;
    }
  });

  const stats = Object.entries(USABILITY_STEP_CONFIG).map(([step, config]) => ({
    step: parseInt(step),
    ...config,
    count: stepCounts[parseInt(step)] || 0
  }));

  return createJsonResponse({
    success: true,
    data: { stats, total: data.length }
  });
}

function formatTester(dbUser) {
  return {
    id: dbUser._id,
    email: dbUser.email || '',
    firstName: dbUser['Name - First'] || '',
    lastName: dbUser['Name - Last'] || '',
    usabilityStep: dbUser['Usability Step'] ?? 0,
    modifiedDate: dbUser['Modified Date'] || null
  };
}
```

---

## Implementation Steps

### Phase 1: Backend Setup (Estimated: 1 hour)

1. **Create Edge Function**
   - Create `supabase/functions/simulation-admin/index.ts`
   - Implement all 5 actions
   - Test locally with `supabase functions serve simulation-admin`

2. **Deploy Edge Function**
   - Deploy to development: `supabase functions deploy simulation-admin`
   - Test via curl/Postman

### Phase 2: Frontend Structure (Estimated: 2 hours)

1. **Create HTML Entry Point**
   - Create `app/public/simulation-admin.html`

2. **Create React Mount Entry**
   - Create `app/src/simulation-admin.jsx`

3. **Register Route**
   - Add route to `app/src/routes.config.js`
   - Run `bun run generate-routes`

4. **Create Page Structure**
   - Create `app/src/islands/pages/SimulationAdminPage/` directory
   - Create hollow component `SimulationAdminPage.jsx`
   - Create logic hook `useSimulationAdminPageLogic.js`

### Phase 3: Component Migration (Estimated: 3 hours)

1. **TesterSelector Component**
   - Convert from TypeScript
   - Convert CSS Modules to plain CSS
   - Adapt props interface

2. **TesterInfoDisplay Component**
   - Remove `aiCredits` display
   - Convert to JavaScript
   - Adapt to integer step values

3. **ActionButton Component**
   - Simple conversion to JavaScript
   - Convert CSS Modules

4. **ConfirmationModal Component**
   - Convert to JavaScript
   - Match existing modal patterns in codebase

### Phase 4: Integration (Estimated: 1 hour)

1. **Wire Up API Calls**
   - Replace mock service calls with Edge Function calls
   - Implement error handling

2. **Add Success/Error Notifications**
   - Match existing toast/notification patterns

3. **Test Full Flow**
   - Select tester
   - View details
   - Reset to Day 1
   - Advance to Day 2

### Phase 5: Polish (Estimated: 1 hour)

1. **URL Parameter Support**
   - Support `?tester=<id>` for direct links

2. **Statistics Dashboard**
   - Show tester distribution by step

3. **Search/Filter**
   - Filter testers by name/email

---

## Removed Features (Source → Target)

| Feature | Reason |
|---------|--------|
| AI Credits display | Field doesn't exist in database |
| User type filter | All users are testers (filtered by `is usability tester`) |
| CorporateHeader navigation | Use existing Split Lease header instead |

---

## Testing Checklist

- [ ] Admin-only access enforced (non-admins get 403)
- [ ] Tester list loads with correct data
- [ ] Search filters testers correctly
- [ ] URL parameter `?tester=id` auto-selects tester
- [ ] Reset to Day 1 works (sets step to 0)
- [ ] Advance to Day 2 works (sets step to 4)
- [ ] Confirmation modal appears before reset
- [ ] Success messages display correctly
- [ ] Error handling works (network failures)
- [ ] Statistics show correct distribution

---

## File References

### Source Repository Files
- `src/pages/SimulationAdmin/SimulationAdmin.tsx` - Main component (~6.5KB)
- `src/components/UserSelector/UserSelector.tsx` - Dropdown component (~5.5KB)
- `src/components/UserInfoDisplay/UserInfoDisplay.tsx` - Info display
- `src/components/ActionButton/ActionButton.tsx` - Button component
- `src/components/ConfirmationModal/ConfirmationModal.tsx` - Modal
- `src/services/userService.ts` - Service layer (~2KB)
- `src/types/index.ts` - Type definitions (~1KB)

### Target Architecture References
- [app/src/islands/pages/CoHostRequestsPage/CoHostRequestsPage.jsx](../../../app/src/islands/pages/CoHostRequestsPage/CoHostRequestsPage.jsx) - Pattern reference for hollow component
- [app/src/islands/pages/CoHostRequestsPage/useCoHostRequestsPageLogic.js](../../../app/src/islands/pages/CoHostRequestsPage/useCoHostRequestsPageLogic.js) - Pattern reference for logic hook
- [app/src/routes.config.js](../../../app/src/routes.config.js) - Route registration
- [supabase/functions/co-host-requests/index.ts](../../../supabase/functions/co-host-requests/index.ts) - Edge Function pattern reference

### Database Schema
- `user` table: `_id`, `email`, `Name - First`, `Name - Last`, `Usability Step`, `is usability tester`, `Modified Date`

---

## Notes

1. **No database migrations needed** - existing schema supports all functionality
2. **Edge Function deployment reminder** - after creating, run `supabase functions deploy simulation-admin`
3. **Route generation** - after adding route, run `bun run generate-routes`
4. **TypeScript optional** - converting to JavaScript for consistency with codebase, but TypeScript would also work with existing Vite config
