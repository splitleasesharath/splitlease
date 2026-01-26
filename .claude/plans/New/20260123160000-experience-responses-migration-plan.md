# Implementation Plan: Experience Responses Page Migration

## Overview

Migrate the `_experience-responses` GitHub repository (vanilla JS survey response viewer) into the Split Lease monorepo as a React Islands Architecture page with Supabase integration. The page displays survey responses from guests and hosts in a master-detail interface with filtering capabilities.

## Success Criteria

- [ ] Experience Responses page accessible at `/_internal/experience-responses`
- [ ] Admin-only authentication (Gold Standard Auth Pattern)
- [ ] Master-detail layout: survey list on left, detail panel on right
- [ ] Name search filter across respondents
- [ ] Type filter checkboxes (Guest/Host)
- [ ] Dynamic response counter
- [ ] All 11 survey questions displayed in detail panel
- [ ] Direct Supabase client calls for data fetching
- [ ] Hollow Component Pattern: all logic in `useExperienceResponsesPageLogic.js`
- [ ] Route registry updated and `bun run generate-routes` executed
- [ ] CSS prefixed with `er-` to avoid conflicts

---

## Context & References

### Source Application (Vanilla JS)

| Source File | Purpose |
|-------------|---------|
| `app.js` | State management, filtering logic, rendering functions |
| `index.html` | Two-panel layout structure |
| `styles.css` | Corporate dashboard styling with purple gradient theme |

### Target Files to Create

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/public/experience-responses.html` | HTML shell for React mount | Create new |
| `app/src/experience-responses.jsx` | Entry point mounting React root | Create new |
| `app/src/islands/pages/ExperienceResponsesPage/index.jsx` | Hollow page component | Create new |
| `app/src/islands/pages/ExperienceResponsesPage/useExperienceResponsesPageLogic.js` | All business logic | Create new |
| `app/src/islands/pages/ExperienceResponsesPage/FilterSection.jsx` | Search + type filters | Create new |
| `app/src/islands/pages/ExperienceResponsesPage/ResponseItem.jsx` | Survey list item | Create new |
| `app/src/islands/pages/ExperienceResponsesPage/ResponseDetail.jsx` | Detail panel | Create new |
| `app/src/islands/pages/ExperienceResponsesPage/ExperienceResponsesPage.css` | Page styles | Create new |
| `app/src/islands/pages/ExperienceResponsesPage/constants.js` | Survey types, field labels | Create new |
| `app/src/routes.config.js` | Route registry | Add new route |

### Reference Implementation

| File | Why It's Relevant |
|------|-------------------|
| `app/src/islands/pages/ProposalManagePage/index.jsx` | Admin page template with list + filters |
| `app/src/islands/pages/ProposalManagePage/useProposalManagePageLogic.js` | Auth pattern, data loading, filtering |
| `app/src/islands/pages/ProposalManagePage/FilterSection.jsx` | Filter component pattern |
| `app/src/islands/pages/ProposalManagePage/ProposalItem.jsx` | List item component pattern |
| `app/src/islands/pages/ProposalManagePage/ProposalManagePage.css` | CSS naming convention with prefix |

### Existing Patterns to Follow

| Pattern | Description | Where Used |
|---------|-------------|------------|
| Hollow Component Pattern | Page = pure JSX, logic = custom hook | All page components |
| Gold Standard Auth Pattern | checkAuthStatus + validateTokenAndFetchUser + Admin check | ProposalManagePage |
| CSS Prefix Convention | `{prefix}-` for all classes | `pm-` in ProposalManagePage |
| Error/Loading/Empty States | Reusable state components | ProposalManagePage |
| Native HTML Controls | No react-select dependency | FilterSection in ProposalManagePage |

---

## Database Schema Requirements

### Option A: Use Existing Table (Preferred if exists)

Check if `experience_survey` or similar table exists in Supabase. Query fields needed:
- `_id` (PK)
- `name` (respondent name)
- `type` (Guest/Host)
- `date` or `Created Date`
- Survey response fields (experience, challenge, etc.)

### Option B: Create New Table (If table doesn't exist)

```sql
CREATE TABLE experience_survey (
  _id TEXT PRIMARY KEY DEFAULT generate_bubble_id(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Guest', 'Host')),
  date TIMESTAMPTZ DEFAULT NOW(),

  -- Survey responses (all nullable for partial responses)
  experience TEXT,           -- Q1: Overall experience
  challenge TEXT,            -- Q2: Challenges faced
  challenge_experience TEXT, -- Q3: How challenge felt
  change TEXT,               -- Q4: What would you change
  service TEXT,              -- Q5: Service quality
  additional_service TEXT,   -- Q6: Additional services wanted
  share TEXT,                -- Q7: Sharing preference
  recommend INTEGER CHECK (recommend >= 0 AND recommend <= 10), -- Q8: NPS score
  staff TEXT,                -- Q9: Staff feedback
  questions TEXT,            -- Q10: Follow-up questions

  -- Metadata
  "Created Date" TIMESTAMPTZ DEFAULT NOW(),
  "Modified Date" TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE experience_survey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view all surveys" ON experience_survey
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "user" u
      WHERE u._id = auth.uid()::text
      AND u."Admin?" = true
    )
  );
```

**IMPORTANT**: Do NOT apply this migration until explicitly instructed. First verify if table exists.

---

## Component Architecture Breakdown

### 1. Entry Point (`experience-responses.jsx`)

```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import ExperienceResponsesPage from './islands/pages/ExperienceResponsesPage/index.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<ExperienceResponsesPage />);
```

### 2. Page Component (`index.jsx`) - Hollow Pattern

```jsx
// Imports Header, Footer, child components
// Uses useExperienceResponsesPageLogic hook
// Contains ONLY JSX rendering
// Delegates ALL state and handlers to hook
```

**Hook API Surface**:
```js
const {
  // Auth state
  authState,

  // Data
  responses,
  selectedResponse,
  filters,
  totalCount,
  filteredCount,

  // UI state
  isLoading,
  error,

  // Handlers
  handleFilterChange,
  handleClearFilters,
  handleSelectResponse,
  handleRetry
} = useExperienceResponsesPageLogic();
```

### 3. Logic Hook (`useExperienceResponsesPageLogic.js`)

**State Management**:
```js
// Auth state (matches ProposalManagePage pattern)
const [authState, setAuthState] = useState({
  isChecking: true,
  isAuthenticated: false,
  isAdmin: false,
  shouldRedirect: false
});

// Filter state
const [filters, setFilters] = useState({
  nameSearch: '',
  showGuest: true,
  showHost: true
});

// Data state
const [responses, setResponses] = useState([]);
const [selectedResponseId, setSelectedResponseId] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);
```

**Data Flow**:
1. Auth check on mount (Gold Standard Pattern)
2. Fetch all responses from Supabase
3. Apply filters client-side (small dataset)
4. Track selected response for detail panel

### 4. FilterSection Component

```jsx
// Props: filters, onFilterChange, onClearAll
// Contains:
// - Name search input with clear button
// - Guest checkbox
// - Host checkbox
// - Response count display
```

### 5. ResponseItem Component

```jsx
// Props: response, isSelected, onSelect
// Displays:
// - Respondent name
// - Type badge (Guest/Host)
// - Date formatted
// - Click handler for selection
```

### 6. ResponseDetail Component

```jsx
// Props: response (can be null)
// Displays when response selected:
// - Header with name, type, date
// - 11 question/answer pairs
// - Empty state when no selection
```

---

## Logic Migration Strategy

### Vanilla JS State → React Hooks

| Vanilla JS | React Equivalent |
|------------|------------------|
| `state.surveys = [...]` | `useState([])` |
| `state.filteredSurveys = [...]` | `useMemo()` derived state |
| `state.selectedSurveyId = null` | `useState(null)` |
| `state.filters.nameSearch = ''` | `useState({ nameSearch: '', ... })` |
| `applyFilters()` function | `useMemo()` with filter deps |
| `renderSurveyList()` function | React component rendering |
| `selectSurvey(id)` function | Event handler via `useCallback()` |

### Filtering Logic (from app.js)

```javascript
// Original vanilla JS filtering
function applyFilters() {
  state.filteredSurveys = state.surveys.filter(survey => {
    const matchesName = state.filters.nameSearch === '' ||
      survey.name.toLowerCase().includes(state.filters.nameSearch.toLowerCase());

    const matchesType =
      (state.filters.showGuest && survey.type === 'Guest') ||
      (state.filters.showHost && survey.type === 'Host');

    return matchesName && matchesType;
  });
}

// React equivalent with useMemo
const filteredResponses = useMemo(() => {
  return responses.filter(response => {
    const matchesName = !filters.nameSearch ||
      response.name.toLowerCase().includes(filters.nameSearch.toLowerCase());

    const matchesType =
      (filters.showGuest && response.type === 'Guest') ||
      (filters.showHost && response.type === 'Host');

    return matchesName && matchesType;
  });
}, [responses, filters]);
```

---

## Styling Migration Approach

### CSS Prefix Convention

All classes prefixed with `er-` (experience-responses):

| Vanilla CSS Class | React CSS Class |
|-------------------|-----------------|
| `.survey-list-container` | `.er-survey-list` |
| `.survey-item` | `.er-response-item` |
| `.survey-item.active` | `.er-response-item.active` |
| `.detail-content` | `.er-detail-content` |
| `.type-badge` | `.er-type-badge` |
| `.filter-section` | `.er-filter-section` |

### Key Styles to Preserve

1. **Two-column layout**: Grid with `400px` left panel, flexible right panel
2. **Purple gradient header**: Matches Split Lease corporate theme (already in Header component)
3. **Active item highlight**: Left border accent + light background
4. **Scrollable panels**: Max-height with overflow-y auto
5. **Type badges**: Color-coded Guest (blue) / Host (green)
6. **Responsive breakpoints**: 1024px and 768px

### CSS Structure

```css
/* Layout */
.er-main-content { ... }
.er-page { ... }
.er-container { display: grid; grid-template-columns: 400px 1fr; }

/* Filter Section */
.er-filter-section { ... }
.er-search-input { ... }
.er-type-filters { ... }
.er-response-count { ... }

/* Response List */
.er-response-list { ... }
.er-response-item { ... }
.er-response-item.active { ... }

/* Detail Panel */
.er-detail-panel { ... }
.er-detail-empty { ... }
.er-question-group { ... }

/* States */
.er-loading-state { ... }
.er-error-state { ... }
.er-empty-state { ... }
```

---

## Implementation Steps

### Step 1: Add Route to Registry

**Files:** `app/src/routes.config.js`

**Purpose:** Register the new admin page route

**Details:**
- Add route entry in CORPORATE INTERNAL TOOLS section
- Path: `/_internal/experience-responses`
- Set `protected: true` and `adminOnly: true`
- File: `experience-responses.html`
- No dynamic segments

**Validation:** Route definition matches pattern of other admin routes

---

### Step 2: Create HTML Shell

**Files:** `app/public/experience-responses.html`

**Purpose:** Static HTML that loads the React app

**Details:**
- Standard HTML5 boilerplate
- Meta robots: noindex, nofollow (internal page)
- Title: "Experience Responses - Split Lease Admin"
- Script src: `/src/experience-responses.jsx`
- Single `<div id="root"></div>`

**Validation:** File exists and follows pattern of `proposal-manage.html`

---

### Step 3: Create Entry Point

**Files:** `app/src/experience-responses.jsx`

**Purpose:** Mount React root for the page

**Details:**
```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import ExperienceResponsesPage from './islands/pages/ExperienceResponsesPage/index.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<ExperienceResponsesPage />);
```

**Validation:** Standard entry point pattern

---

### Step 4: Create Constants File

**Files:** `app/src/islands/pages/ExperienceResponsesPage/constants.js`

**Purpose:** Define survey types and question labels

**Details:**
```javascript
export const RESPONSE_TYPES = ['Guest', 'Host'];

export const SURVEY_QUESTIONS = [
  { key: 'experience', label: 'Overall Experience' },
  { key: 'challenge', label: 'Challenges Faced' },
  { key: 'challengeExperience', label: 'How Challenge Felt' },
  { key: 'change', label: 'What Would You Change' },
  { key: 'service', label: 'Service Quality' },
  { key: 'additionalService', label: 'Additional Services Wanted' },
  { key: 'share', label: 'Sharing Preference' },
  { key: 'recommend', label: 'Recommendation Score (0-10)' },
  { key: 'staff', label: 'Staff Feedback' },
  { key: 'questions', label: 'Follow-up Questions' }
];
```

**Validation:** Constants are importable

---

### Step 5: Create Logic Hook

**Files:** `app/src/islands/pages/ExperienceResponsesPage/useExperienceResponsesPageLogic.js`

**Purpose:** All business logic for the page

**Details:**
- Auth check with Gold Standard Pattern (from ProposalManagePage)
- Admin verification via `user."Admin?"` column
- Fetch responses from Supabase on auth success
- Filter state and handlers
- Selected response state
- Error handling

**Key Functions:**
- `loadResponses()` - Fetch from Supabase
- `handleFilterChange(filterName, value)` - Update filter state
- `handleClearFilters()` - Reset all filters
- `handleSelectResponse(id)` - Select response for detail view
- `handleRetry()` - Retry after error

**Validation:** Hook returns expected API surface

---

### Step 6: Create FilterSection Component

**Files:** `app/src/islands/pages/ExperienceResponsesPage/FilterSection.jsx`

**Purpose:** Search and filter controls

**Details:**
- Name search input with clear button
- Guest checkbox (checked by default)
- Host checkbox (checked by default)
- Response count display: "Showing X of Y responses"

**Props:**
```typescript
{
  filters: { nameSearch: string, showGuest: boolean, showHost: boolean },
  totalCount: number,
  filteredCount: number,
  onFilterChange: (filterName: string, value: any) => void,
  onClearAll: () => void
}
```

**Validation:** Filters update parent state correctly

---

### Step 7: Create ResponseItem Component

**Files:** `app/src/islands/pages/ExperienceResponsesPage/ResponseItem.jsx`

**Purpose:** Individual survey list item

**Details:**
- Respondent name
- Type badge with color coding
- Formatted date
- Active state styling
- Click handler

**Props:**
```typescript
{
  response: { _id: string, name: string, type: string, date: string },
  isSelected: boolean,
  onSelect: (id: string) => void
}
```

**Validation:** Click triggers selection, active state applies correctly

---

### Step 8: Create ResponseDetail Component

**Files:** `app/src/islands/pages/ExperienceResponsesPage/ResponseDetail.jsx`

**Purpose:** Detailed survey response view

**Details:**
- Empty state when no selection
- Header with name, type badge, date
- 11 question/answer sections
- Recommend score display (0-10)
- Scrollable content area

**Props:**
```typescript
{
  response: SurveyResponse | null
}
```

**Validation:** All 11 questions display correctly

---

### Step 9: Create CSS Styles

**Files:** `app/src/islands/pages/ExperienceResponsesPage/ExperienceResponsesPage.css`

**Purpose:** Page-specific styles

**Details:**
- Two-column grid layout (400px / 1fr)
- Filter section styling
- Response list with scroll
- Detail panel with scroll
- Loading/error/empty states
- Type badges (Guest: blue, Host: green)
- Active item highlight
- Responsive breakpoints (1024px, 768px)

**Validation:** Layout matches original design

---

### Step 10: Create Page Component

**Files:** `app/src/islands/pages/ExperienceResponsesPage/index.jsx`

**Purpose:** Hollow component that renders UI

**Details:**
- Import Header, Footer, child components
- Import and use logic hook
- Render loading state while checking auth
- Render error state if load fails
- Render empty state if no responses
- Two-column layout with list and detail
- Pass all handlers to child components

**Validation:** Follows Hollow Component Pattern strictly

---

### Step 11: Generate Routes

**Files:** `app/public/_redirects`, `app/public/_routes.json`

**Purpose:** Update Cloudflare routing files

**Details:**
- Run `bun run generate-routes` from `app/` directory
- Verify new route appears in generated files

**Validation:** Route accessible at `/_internal/experience-responses`

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| No responses in database | Show empty state with message |
| All responses filtered out | Show empty state: "No responses match filters" |
| Selected response deleted (if refresh) | Clear selection, show detail empty state |
| Network error fetching data | Show error state with retry button |
| Non-admin user access | Redirect to home (handled by auth check) |
| Unauthenticated user | Redirect to home with loading state |

---

## Testing Considerations

### Manual Testing Checklist

1. **Authentication**
   - [ ] Non-admin user redirected to home
   - [ ] Non-authenticated user redirected to home
   - [ ] Admin user can access page

2. **Data Display**
   - [ ] All responses load from database
   - [ ] Response count shows correctly
   - [ ] All 11 questions display in detail panel

3. **Filtering**
   - [ ] Name search filters in real-time
   - [ ] Guest checkbox toggles Guest responses
   - [ ] Host checkbox toggles Host responses
   - [ ] Both unchecked shows empty state
   - [ ] Clear filters resets all

4. **Selection**
   - [ ] Click response shows in detail panel
   - [ ] Active state highlights selected item
   - [ ] Scrolling list doesn't lose selection

5. **Responsive**
   - [ ] Layout stacks on mobile (< 768px)
   - [ ] Panels adjust at 1024px breakpoint

---

## Rollback Strategy

If issues arise during implementation:

1. **Route rollback**: Remove route from `routes.config.js`, run `bun run generate-routes`
2. **File cleanup**: Delete all files in `ExperienceResponsesPage/` directory
3. **Entry point cleanup**: Delete `app/src/experience-responses.jsx`
4. **HTML cleanup**: Delete `app/public/experience-responses.html`
5. **Git revert**: `git checkout -- .` to revert all changes

---

## Dependencies & Blockers

### Prerequisites

1. **Database table**: Confirm if `experience_survey` table exists in Supabase
   - If exists: Verify column names match expected schema
   - If not exists: Need explicit instruction to create table with migration

2. **Test data**: Seed data needed for development testing
   - Can use mock data initially (from original app.js)
   - Replace with real Supabase queries when table confirmed

### Blockers

- Cannot fetch real data until database table is confirmed/created
- Admin authentication requires valid admin user account for testing

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database table doesn't exist | Medium | High | Start with mock data, create table when confirmed |
| Auth pattern mismatch | Low | Medium | Copy directly from ProposalManagePage |
| CSS conflicts | Low | Low | Unique `er-` prefix prevents conflicts |
| Missing survey fields | Medium | Medium | Make all fields nullable in display |
| Performance with large dataset | Low | Low | Client-side filtering, no pagination needed initially |

---

## Open Questions for User

Before implementation:

1. **Database**: Does an `experience_survey` or similar table exist in Supabase? If so, what are the column names?

2. **Data Access**: Should this use direct Supabase client calls (preferred for read-only) or create an Edge Function wrapper?

3. **Additional Features**: Beyond viewing, are there any actions needed (export CSV, delete responses, edit)?

4. **Real-time**: Do responses need real-time updates or is initial load sufficient?

5. **Pagination**: The original app shows all responses. Is pagination needed for scale?

---

## File References

### Files to Create
- `app/public/experience-responses.html`
- `app/src/experience-responses.jsx`
- `app/src/islands/pages/ExperienceResponsesPage/index.jsx`
- `app/src/islands/pages/ExperienceResponsesPage/useExperienceResponsesPageLogic.js`
- `app/src/islands/pages/ExperienceResponsesPage/FilterSection.jsx`
- `app/src/islands/pages/ExperienceResponsesPage/ResponseItem.jsx`
- `app/src/islands/pages/ExperienceResponsesPage/ResponseDetail.jsx`
- `app/src/islands/pages/ExperienceResponsesPage/ExperienceResponsesPage.css`
- `app/src/islands/pages/ExperienceResponsesPage/constants.js`

### Files to Modify
- `app/src/routes.config.js` (add route)

### Reference Files (Read-Only)
- `app/src/islands/pages/ProposalManagePage/index.jsx`
- `app/src/islands/pages/ProposalManagePage/useProposalManagePageLogic.js`
- `app/src/islands/pages/ProposalManagePage/FilterSection.jsx`
- `app/src/islands/pages/ProposalManagePage/ProposalItem.jsx`
- `app/src/islands/pages/ProposalManagePage/ProposalManagePage.css`
- `app/src/islands/pages/ProposalManagePage/constants.js`
- `app/src/lib/auth.js`
- `app/src/lib/supabase.js`
- `app/public/proposal-manage.html`
- `app/src/proposal-manage.jsx`

### Documentation
- `.claude/Documentation/miniCLAUDE.md`
- `app/CLAUDE.md`
- `app/src/CLAUDE.md`
- `app/src/islands/pages/CLAUDE.md`

---

**Plan Version**: 1.0
**Created**: 2026-01-23
**Author**: Claude (Implementation Planning Architect)
