# Experience Responses Page Migration Plan

**Created**: 2026-01-23
**Source**: https://github.com/splitleasesharath/_experience-responses.git
**Status**: Ready for Implementation

---

## Executive Summary

Migrate a standalone vanilla JS/HTML/CSS application for visualizing experience survey responses into the Split Lease islands architecture. The source app displays Guest and Host survey responses with filtering capabilities.

---

## Source Application Analysis

### Current Structure (Vanilla JS)
```
_experience-responses/
├── index.html          (165 lines - page shell)
├── app.js              (377 lines - state mgmt, DOM manipulation, filtering)
├── styles.css          (433 lines - grid layout, responsive design)
└── REQUIREMENTS.md     (Bubble.io migration specs)
```

### Data Model (10 survey fields)
```javascript
{
  id: number,
  name: string,              // Respondent name
  type: 'Guest' | 'Host',    // User type
  date: string,              // Submission date (YYYY-MM-DD)
  experience: string,        // Q1: Experience description
  challenge: string,         // Q2: Prior challenges
  challengeExperience: string, // Q3: Emotional response
  change: string,            // Q4: Changes experienced
  service: string,           // Q5: Memorable aspects
  additionalService: string, // Q6: Desired features
  share: 'Yes' | 'No',       // Q7: Permission to share
  recommend: number,         // Q8: NPS score (0-10)
  staff: string,             // Q9: Staff appreciation
  questions: string          // Q10: Follow-up questions
}
```

### Current Features
- ✅ Search by respondent name (case-insensitive partial match)
- ✅ Filter by user type (Guest/Host checkboxes)
- ✅ Response counter (dynamic)
- ✅ Master-detail layout (list left, details right)
- ✅ Loading state with simulated delay
- ✅ Empty state when no matches
- ✅ Responsive design (desktop → tablet → mobile)

### Current Limitations
- ❌ Uses mock data (5 hardcoded surveys)
- ❌ No authentication
- ❌ No Supabase integration
- ❌ No pagination
- ❌ Vanilla JS (no React)

---

## Target Architecture

### File Structure (Split Lease Pattern)
```
app/
├── public/
│   └── experience-responses.html              # HTML shell
├── src/
│   ├── experience-responses.jsx               # React entry point
│   └── islands/pages/
│       └── ExperienceResponsesPage/
│           ├── ExperienceResponsesPage.jsx    # Hollow component (UI only)
│           ├── useExperienceResponsesPageLogic.js  # All business logic
│           ├── types/
│           │   └── experienceResponse.types.ts    # TypeScript types
│           └── components/
│               ├── ResponseList.jsx           # Left panel - survey list
│               ├── ResponseListItem.jsx       # Individual list item
│               ├── ResponseDetail.jsx         # Right panel - survey details
│               ├── FilterBar.jsx              # Search + type checkboxes
│               ├── LoadingState.jsx           # Loading spinner
│               └── EmptyState.jsx             # No results message
```

---

## Discrepancies & Required Changes

### 1. Architecture Transformation

| Source (Vanilla JS) | Target (React Islands) | Change Required |
|---------------------|------------------------|-----------------|
| Global `state` object | React `useState` hooks | Rewrite state management |
| DOM manipulation (`getElementById`) | JSX declarative rendering | Complete rewrite |
| Event listeners (`addEventListener`) | React event handlers (`onClick`) | Syntax change |
| Template literals for HTML | JSX components | Restructure entirely |
| Single file (`app.js`) | Hollow component + logic hook | Split into multiple files |

### 2. Data Layer Changes

| Source | Target | Change Required |
|--------|--------|-----------------|
| Mock data (hardcoded) | Supabase query | Create/identify database table |
| `setTimeout` loading simulation | Real async fetch | Use `useEffect` + Supabase client |
| No authentication | Admin-only route | Add auth check in logic hook |
| No error handling | Try/catch + error state | Add error boundary pattern |

### 3. Database Requirements

**Option A: New Supabase Table** (if data doesn't exist)
```sql
CREATE TABLE experience_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_name TEXT NOT NULL,
  user_type TEXT CHECK (user_type IN ('Guest', 'Host')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  experience TEXT,
  challenge TEXT,
  challenge_experience TEXT,
  change TEXT,
  service TEXT,
  additional_service TEXT,
  share_permission BOOLEAN DEFAULT FALSE,
  recommend_score INTEGER CHECK (recommend_score >= 0 AND recommend_score <= 10),
  staff_appreciation TEXT,
  follow_up_questions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy (admin only)
ALTER TABLE experience_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read access" ON experience_responses
  FOR SELECT USING (auth.jwt() ->> 'is_admin' = 'true');
```

**Option B: Existing Table** (needs investigation)
- Check if survey responses already exist in Supabase
- May need to query Bubble.io via `bubble-proxy` Edge Function

### 4. Styling Migration

| Source | Target | Change Required |
|--------|--------|-----------------|
| Global CSS (`styles.css`) | CSS Modules or scoped styles | Rename/restructure |
| Custom color scheme (`#667eea`) | Match Split Lease design system | Update colors |
| External font (Inter) | Use existing app fonts | Check font imports |
| Independent responsive breakpoints | Match app breakpoints | Align with existing CSS |

### 5. Route Configuration

Add to `app/src/routes.config.js`:
```javascript
{
  path: '/_internal/experience-responses',
  file: 'experience-responses.html',
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'experience-responses-view'
}
```

---

## Implementation Phases

### Phase 1: Scaffold (Files & Routes)
1. Create HTML shell (`public/experience-responses.html`)
2. Create entry point (`src/experience-responses.jsx`)
3. Create folder structure under `islands/pages/ExperienceResponsesPage/`
4. Add route to `routes.config.js`
5. Run `bun run generate-routes`

### Phase 2: Components (UI Layer)
1. Create hollow `ExperienceResponsesPage.jsx`
2. Create sub-components:
   - `FilterBar.jsx` (search + checkboxes)
   - `ResponseList.jsx` (scrollable list)
   - `ResponseListItem.jsx` (individual item)
   - `ResponseDetail.jsx` (10-field detail view)
   - `LoadingState.jsx`
   - `EmptyState.jsx`
3. Migrate styles (scoped CSS or CSS modules)

### Phase 3: Logic Hook (Business Layer)
1. Create `useExperienceResponsesPageLogic.js` with:
   - State: `responses`, `filteredResponses`, `selectedId`, `filters`, `loading`, `error`
   - Auth check (admin only)
   - Data fetching (Supabase or mock initially)
   - Filter logic (name search + type checkboxes)
   - Selection handler

### Phase 4: Data Integration
1. **Investigate**: Does experience response data exist in Supabase?
2. **If yes**: Query existing table
3. **If no**:
   - Option A: Create new table + migration
   - Option B: Keep mock data for now, plan data source later

### Phase 5: Polish & Testing
1. Verify responsive behavior
2. Test auth flow (redirect if not admin)
3. Test filter combinations
4. Verify empty states
5. Add error handling

---

## Key Code Transformations

### State Management (Before → After)

**Before (Vanilla JS):**
```javascript
const state = {
  surveys: [],
  filteredSurveys: [],
  selectedSurveyId: null,
  filters: { name: '', types: ['Guest', 'Host'] }
};

function applyFilters() {
  state.filteredSurveys = state.surveys.filter(/* ... */);
  renderSurveyList();
}
```

**After (React Hook):**
```javascript
export function useExperienceResponsesPageLogic() {
  const [responses, setResponses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState({ name: '', types: ['Guest', 'Host'] });

  const filteredResponses = useMemo(() => {
    return responses.filter(r => {
      const matchesName = filters.name === '' ||
        r.respondent_name.toLowerCase().includes(filters.name.toLowerCase());
      const matchesType = filters.types.length === 0 ||
        filters.types.includes(r.user_type);
      return matchesName && matchesType;
    });
  }, [responses, filters]);

  return { filteredResponses, selectedId, setSelectedId, filters, setFilters };
}
```

### Data Fetching (Before → After)

**Before (Mock):**
```javascript
function loadSurveys() {
  setTimeout(() => {
    state.surveys = mockData;
    renderSurveyList();
  }, 500);
}
```

**After (Supabase):**
```javascript
useEffect(() => {
  async function fetchResponses() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('experience_responses')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setResponses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  fetchResponses();
}, []);
```

---

## Data Source: RESOLVED ✅

### Existing Table: `experiencesurvey`

The experience survey data **already exists** in Supabase, synced from Bubble.io.

**Table Details:**
- **Name**: `experiencesurvey`
- **Current Rows**: 2 (test data)
- **RLS**: Disabled (needs security review)
- **Origin**: Bubble.io sync

**Column Mapping** (Bubble → Application):

| Bubble Column (with spaces) | Application Field | Type |
|-----------------------------|-------------------|------|
| `_id` | id | text (PK) |
| `Name` | name | text |
| `Type` | type | text ('Guest' \| 'Host') |
| `Created Date` | date | timestamptz |
| `Experience` | experience | text |
| `Challenge` | challenge | text |
| `Challenge Experience` | challengeExperience | text |
| `Change` | change | text |
| `Service` | service | text |
| `Additional Service` | additionalService | text |
| `Share` | share | boolean |
| `Recommend` | recommend | integer (0-10) |
| `Split Lease Staff` | staff | text |
| `Questions` | questions | text |

**⚠️ Important**: Bubble columns have spaces, requiring quoted identifiers in SQL:
```javascript
// Supabase query example
const { data } = await supabase
  .from('experiencesurvey')
  .select(`
    "_id",
    "Name",
    "Type",
    "Created Date",
    "Experience",
    "Challenge",
    "Challenge Experience",
    "Change",
    "Service",
    "Additional Service",
    "Share",
    "Recommend",
    "Split Lease Staff",
    "Questions"
  `)
  .order('Created Date', { ascending: false });
```

### Remaining Questions

1. **Auth Pattern**: Use existing admin check pattern from `AdminThreadsPage`?

2. **Styling Approach**:
   - CSS Modules (scoped)?
   - Inline styles?
   - Existing shared CSS classes?

3. **Color Scheme**: Keep source purple (`#667eea`) or adopt Split Lease colors?

---

## Referenced Files

### Source Repository
- `index.html` - Page structure
- `app.js` - State, filtering, event handling
- `styles.css` - Layout, responsive design

### Target Codebase (Patterns to Follow)
- [routes.config.js](app/src/routes.config.js) - Route registration
- [AdminThreadsPage/](app/src/islands/pages/AdminThreadsPage/) - Admin page pattern
- [useAdminThreadsPageLogic.js](app/src/islands/pages/AdminThreadsPage/useAdminThreadsPageLogic.js) - Logic hook pattern
- [supabase.js](app/src/lib/supabase.js) - Supabase client
- [ListingsOverviewPage](app/src/islands/pages/ListingsOverviewPage/) - Table/list pattern

### Documentation
- [app/CLAUDE.md](app/CLAUDE.md) - Frontend architecture details
- [miniCLAUDE.md](.claude/Documentation/miniCLAUDE.md) - Quick reference

---

## Estimated Effort

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 1: Scaffold | 15 min | Boilerplate files |
| Phase 2: Components | 45 min | UI migration |
| Phase 3: Logic Hook | 30 min | State + filtering |
| Phase 4: Data Integration | 30-60 min | Depends on data source |
| Phase 5: Polish | 20 min | Testing + fixes |
| **Total** | **2-3 hours** | |

---

## Next Steps

1. **User Decision**: Confirm data source strategy (Supabase table vs Bubble proxy vs mock)
2. **User Decision**: Confirm styling approach
3. **Execute**: Run Phase 1-5 sequentially
4. **Deploy**: Manual Edge Function deployment if needed

---

**Plan Status**: ✅ Data source confirmed (`experiencesurvey` table). Ready for implementation.
