# Split Lease Project Architecture Analysis

**Generated**: 2026-01-04
**Purpose**: Comprehensive architecture exploration and identification of patterns, inconsistencies, and improvement opportunities

---

## 1. Project Structure Overview

### Top-Level Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | React 18 frontend application (Vite build, Cloudflare Pages deployment) |
| `supabase/` | Supabase Edge Functions and database migrations |
| `.claude/` | Claude Code configuration, plans, and documentation |
| `analysis/` | Analysis documents and reports |
| `backups/` | Database and configuration backups |
| `prototypes/` | Experimental features and prototypes |
| `scripts/` | Root-level utility scripts |

### App Directory Structure

```
app/
├── public/           # Static HTML templates (27 files)
│   ├── assets/       # Static media (fonts, icons, images, lotties, videos)
│   ├── help-center-articles/  # Static help content
│   ├── images/       # Public images
│   ├── _headers      # Cloudflare HTTP headers
│   ├── _redirects    # Cloudflare routing (auto-generated)
│   └── _routes.json  # Cloudflare Functions control (auto-generated)
├── src/
│   ├── islands/      # React components (Islands Architecture)
│   │   ├── modals/   # Modal dialogs
│   │   ├── pages/    # Page components
│   │   ├── proposals/# Proposal-related components
│   │   └── shared/   # Shared components
│   ├── lib/          # Utilities, API clients, infrastructure
│   ├── logic/        # Four-layer business logic
│   │   ├── calculators/
│   │   ├── rules/
│   │   ├── processors/
│   │   └── workflows/
│   ├── styles/       # CSS files
│   ├── config/       # Configuration modules
│   ├── data/         # Static data modules
│   └── routes/       # Generated route files
├── functions/        # Cloudflare Pages Functions (legacy)
├── scripts/          # Build scripts (generate-redirects.js)
└── dist/             # Production build output
```

### Supabase Functions Structure

```
supabase/
├── functions/
│   ├── _shared/         # Shared utilities (CORS, errors, validation, etc.)
│   ├── ai-gateway/      # OpenAI proxy
│   ├── ai-parse-profile/
│   ├── ai-signup-guest/
│   ├── auth-user/       # Authentication
│   ├── bubble_sync/     # Bubble.io synchronization
│   ├── bubble-proxy/    # Bubble API proxy
│   ├── cohost-request/
│   ├── cohost-request-slack-callback/
│   ├── communications/
│   ├── listing/         # Listing CRUD
│   ├── messages/        # Messaging
│   ├── pricing/
│   ├── proposal/        # Proposal CRUD
│   ├── rental-application/
│   ├── send-email/
│   ├── send-sms/
│   ├── slack/
│   ├── virtual-meeting/
│   ├── workflow-enqueue/
│   └── workflow-orchestrator/
└── migrations/          # Database migrations
```

---

## 2. Entry Point System

### How the App Bootstraps

The application follows a **Multi-Page Islands Architecture**:

1. **HTML Templates** (`app/public/*.html`): Static HTML shells with minimal markup
2. **JSX Entry Points** (`app/src/*.jsx`): Mount React components to DOM
3. **Page Components** (`app/src/islands/pages/`): React island components

**Flow Example**:
```
index.html → main.jsx → HomePage.jsx
search.html → search.jsx → SearchPage.jsx
view-split-lease.html → view-split-lease.jsx → ViewSplitLeasePage.jsx
```

### Entry Point Pattern

Standard pattern (most pages):
```jsx
import { createRoot } from 'react-dom/client';
import HomePage from './islands/pages/HomePage.jsx';

createRoot(document.getElementById('home-page')).render(<HomePage />);
```

### Inconsistency Identified: Mount Point IDs

**ISSUE**: Inconsistent DOM element IDs across entry points

| Pattern | Files Using | Mount ID |
|---------|-------------|----------|
| `{page}-page` | main.jsx, search.jsx, faq.jsx, view-split-lease.jsx | `home-page`, `search-page`, `faq-page`, `view-split-lease-page` |
| `root` | account-profile.jsx | `root` |

**Entry Point Variations**:

1. **Simple Pattern** (most files):
```jsx
createRoot(document.getElementById('search-page')).render(<SearchPage />);
```

2. **With Conditional Mount** (account-profile.jsx):
```jsx
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<AccountProfilePage />);
}
```

3. **With Documentation Comments** (account-profile.jsx):
```jsx
/**
 * account-profile.jsx
 *
 * Entry point for the Account Profile page.
 * Mounts the AccountProfilePage React component to the DOM.
 */
```

**Recommendation**: Standardize all entry points to use consistent:
- Mount point ID pattern: either all `{page}-page` or all `root`
- Include/exclude conditional mounting consistently
- Include/exclude documentation headers consistently

---

## 3. Routing System

### Route Registry Pattern

The routing system uses a **Single Source of Truth** pattern defined in `app/src/routes.config.js`.

**Key Exports**:
- `routes` - Array of all route definitions
- `apiRoutes` - API route patterns for Cloudflare Functions
- `excludedFromFunctions` - Routes excluded from function processing
- `getInternalRoutes()` - Routes using _internal/ pattern
- `getBasePath()` - Extract base path from route
- `matchRoute()` - URL matching utility
- `findRouteForUrl()` - Find route for given URL
- `buildRollupInputs()` - Generate Vite build inputs

### Route Definition Schema

```javascript
{
  path: '/view-split-lease',           // URL pattern
  file: 'view-split-lease.html',       // HTML file to serve
  aliases: ['/view-split-lease.html'], // Alternative URLs
  protected: false,                     // Auth required?
  cloudflareInternal: true,            // Use _internal/ pattern
  internalName: 'listing-view',        // Name for _internal file
  hasDynamicSegment: true,             // Has :param in path
  dynamicPattern: '/view-split-lease/:id', // Full dynamic pattern
  excludeFromFunctions: false,         // Exclude from CF Functions
  devOnly: false                       // Development only route
}
```

### Current Route Count: 30 Routes

**Route Categories**:
- Public static pages: 15 (homepage, FAQ, policies, careers, etc.)
- Dynamic routes: 6 (view-split-lease, preview-split-lease, guest-proposals, account-profile, host-proposals, help-center/:category)
- Protected pages: 11 (listing-dashboard, host-overview, self-listing, etc.)
- Development only: 2 (index-dev, referral-demo)

### Cloudflare Routing Strategy

The app uses a sophisticated routing approach to handle Cloudflare's "pretty URL" normalization that causes 308 redirects:

1. **_internal/ Directory Pattern**: Most routes use files in `dist/_internal/` without .html extension
2. **_headers File**: Sets `Content-Type: text/html` for paths without extensions
3. **_redirects File**: Auto-generated rewrites from routes.config.js
4. **_routes.json**: Controls which routes invoke Cloudflare Functions

### Build-Time Route Generation

`scripts/generate-redirects.js` runs as a prebuild step:
1. Validates route registry (no duplicates, required fields)
2. Generates `public/_redirects` from route definitions
3. Generates `public/_routes.json` for Functions control

---

## 4. Build System

### Vite Configuration

**Key Features** (`app/vite.config.js`):

1. **Multi-Page Build**: 27 HTML entry points defined in `rollupOptions.input`
2. **Custom Plugins**:
   - `multi-page-routing`: Dev/preview server middleware for route handling
   - `move-html-to-root`: Post-build plugin to restructure dist/

3. **Dev Server**:
   - Port 8000
   - API proxy to wrangler (port 8788)
   - Uses route registry for URL rewriting

4. **Build Output Structure**:
```
dist/
├── index.html              # HTML files at root
├── search.html
├── ...
├── assets/
│   ├── [name]-[hash].js   # Hashed JS bundles
│   └── [name]-[hash].css  # Hashed CSS
├── _internal/
│   ├── search-view        # HTML copies without extension
│   ├── listing-view
│   └── ...
├── _redirects
├── _headers
├── _routes.json
└── functions/              # Cloudflare Pages Functions
```

### Build Commands

```bash
bun run dev              # Start dev server (port 8000)
bun run build            # Production build (runs generate-routes first)
bun run preview          # Preview production build
bun run generate-routes  # Regenerate routing files
```

### Inconsistency Identified: Vite Config vs Route Registry

**ISSUE**: The `vite.config.js` hardcodes rollup inputs instead of using `buildRollupInputs()`:

```javascript
// Current (hardcoded)
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'public/index.html'),
      search: resolve(__dirname, 'public/search.html'),
      // ... 27 more entries
    }
  }
}

// Available but unused
import { buildRollupInputs } from './src/routes.config.js';
```

**Recommendation**: Use `buildRollupInputs()` to derive rollup inputs from route registry, eliminating duplication.

---

## 5. Architectural Patterns

### Islands Architecture

Each page is an independent React root:
- **Benefit**: No shared state between pages, simpler mental model
- **Navigation**: Full page loads (no client-side routing)
- **State Persistence**: URL params, localStorage, Supabase database

### Hollow Component Pattern

Page components delegate ALL logic to custom hooks:

```jsx
// Page Component (UI only)
export default function SearchPage() {
  const {
    listings,
    filters,
    handleFilterChange
  } = useSearchPageLogic();

  return <div>{/* Pure JSX */}</div>;
}

// Logic Hook (business logic)
export function useSearchPageLogic() {
  const [listings, setListings] = useState([]);
  // ... all state, effects, handlers
  return { listings, filters, handleFilterChange };
}
```

**Pages Following Pattern**:
- SearchPage.jsx + useSearchPageLogic.js
- ViewSplitLeasePage.jsx + useViewSplitLeasePageLogic.js
- GuestProposalsPage.jsx + useGuestProposalsPageLogic.js
- RentalApplicationPage.jsx + useRentalApplicationPageLogic.js

**Pages Not Following Pattern** (static content or inline logic):
- HomePage.jsx, FAQPage.jsx, CareersPage.jsx, etc.

### Four-Layer Logic Architecture

```
logic/
├── calculators/    # Pure math: calculate*, get*
│   ├── pricing/
│   └── scheduling/
├── rules/          # Boolean predicates: can*, is*, should*
│   ├── auth/
│   ├── pricing/
│   ├── proposals/
│   ├── scheduling/
│   ├── search/
│   └── users/
├── processors/     # Data transform: adapt*, format*, process*
│   ├── display/
│   ├── external/
│   ├── listing/
│   ├── proposal/
│   ├── proposals/
│   └── user/
└── workflows/      # Orchestration: *Workflow
    ├── auth/
    ├── booking/
    ├── proposals/
    └── scheduling/
```

### Inconsistency Identified: Duplicate Processor Directories

**ISSUE**: Both `processors/proposal/` and `processors/proposals/` exist:
- `logic/processors/proposal/`
- `logic/processors/proposals/`

**Recommendation**: Consolidate into single directory.

---

## 6. Component Organization

### Page Component Patterns

**Pattern A: Simple JSX File** (e.g., FAQPage.jsx)
- Single file with all rendering
- No subdirectory
- Used for: Static content pages

**Pattern B: Hollow Component** (e.g., SearchPage.jsx)
- Page file + logic hook file
- Hook co-located with page
- Used for: Interactive pages with complex logic

**Pattern C: Feature Module** (e.g., SelfListingPage/)
- Subdirectory with multiple files
- TypeScript implementation
- Internal sections/, components/, store/
- Used for: Complex multi-step forms

**Pattern D: Mixed Organization** (e.g., HostProposalsPage/)
- Subdirectory structure
- Separate components directory
- formatters.js, types.js files
- Used for: Feature-rich pages

### Inconsistency Identified: Mixed File Organization

**ISSUE**: Inconsistent page component organization across the codebase:

| Page | Organization | Has Subdirectory | Language |
|------|--------------|------------------|----------|
| HomePage | Single file | No | JavaScript |
| SearchPage | Single file + hook | No | JavaScript |
| SelfListingPage | Feature module | Yes | TypeScript |
| HostProposalsPage | Feature module | Yes | JavaScript |
| AccountProfilePage | Feature module | Yes | JavaScript |
| FAQPage | Single file | No | JavaScript |

**Observations**:
- SelfListingPage uses TypeScript (.tsx), others use JavaScript (.jsx)
- Some hooks are in pages/ directory root, others in subdirectories
- Component extraction varies by complexity without clear guidelines

---

## 7. Identified Inconsistencies Summary

### High Priority

1. **Mount Point ID Inconsistency**
   - Most pages: `document.getElementById('{page}-page')`
   - Some pages: `document.getElementById('root')`
   - Impact: Confusion, potential integration issues

2. **Vite Config Hardcoded Inputs**
   - Route registry exports `buildRollupInputs()` but not used
   - Rollup inputs duplicated manually
   - Impact: Maintenance burden, sync issues

3. **Duplicate Processor Directories**
   - Both `proposal/` and `proposals/` exist
   - Impact: Confusion, potential dead code

### Medium Priority

4. **Mixed Entry Point Styles**
   - Some with conditional mounting, some without
   - Some with documentation headers, some without
   - Impact: Inconsistent code quality

5. **Page Component Organization Variance**
   - No clear guidelines for when to use subdirectories
   - Mixed JavaScript/TypeScript
   - Impact: Developer confusion

6. **HTML Template Variations**
   - Different pages load different scripts in `<head>`
   - Hotjar duplicated across templates
   - Google Maps loading logic only in search.html
   - Impact: Maintenance burden, duplication

### Low Priority

7. **CSS Loading Strategy**
   - Some pages load page-specific CSS in HTML
   - Some load CSS via React imports
   - Impact: Inconsistent loading, potential FOUC

8. **`_headers` File Manual Maintenance**
   - Not auto-generated from routes.config.js
   - Could drift from route definitions
   - Impact: Potential routing/MIME issues

---

## 8. Improvement Recommendations

### Quick Wins

1. **Standardize Entry Point Pattern**
   - Create template: entry point with consistent mount ID, optional comments
   - Update all entry points to match

2. **Use buildRollupInputs() in Vite Config**
   - Replace hardcoded inputs with function call
   - Single source of truth for all routing

3. **Consolidate Processor Directories**
   - Merge `proposal/` and `proposals/` into one

### Medium-Term

4. **Create Page Component Guidelines**
   - When to use subdirectory vs single file
   - When to create logic hook
   - TypeScript vs JavaScript decision criteria

5. **Centralize HTML Template Components**
   - Extract Hotjar into reusable module
   - Create consistent head template

6. **Auto-generate _headers from Route Registry**
   - Add header information to route definitions
   - Generate _headers in generate-redirects.js

### Long-Term

7. **Consider Shared Layout Components**
   - Common HTML structure as React components
   - Reduce HTML template duplication

8. **Evaluate TypeScript Migration**
   - SelfListingPage already TypeScript
   - Consider gradual migration for type safety

---

## 9. Key File References

### Configuration
- `c:/Users/Split Lease/Documents/Split Lease/app/vite.config.js`
- `c:/Users/Split Lease/Documents/Split Lease/app/src/routes.config.js`
- `c:/Users/Split Lease/Documents/Split Lease/app/package.json`

### Routing
- `c:/Users/Split Lease/Documents/Split Lease/app/scripts/generate-redirects.js`
- `c:/Users/Split Lease/Documents/Split Lease/app/public/_redirects`
- `c:/Users/Split Lease/Documents/Split Lease/app/public/_routes.json`
- `c:/Users/Split Lease/Documents/Split Lease/app/public/_headers`

### Entry Points (Examples)
- `c:/Users/Split Lease/Documents/Split Lease/app/src/main.jsx`
- `c:/Users/Split Lease/Documents/Split Lease/app/src/search.jsx`
- `c:/Users/Split Lease/Documents/Split Lease/app/src/account-profile.jsx`

### Page Components (Examples)
- `c:/Users/Split Lease/Documents/Split Lease/app/src/islands/pages/HomePage.jsx`
- `c:/Users/Split Lease/Documents/Split Lease/app/src/islands/pages/SearchPage.jsx`
- `c:/Users/Split Lease/Documents/Split Lease/app/src/islands/pages/SelfListingPage/`

### Business Logic
- `c:/Users/Split Lease/Documents/Split Lease/app/src/logic/`
- `c:/Users/Split Lease/Documents/Split Lease/app/src/lib/constants.js`
- `c:/Users/Split Lease/Documents/Split Lease/app/src/lib/auth.js`

### Edge Functions
- `c:/Users/Split Lease/Documents/Split Lease/supabase/functions/`
- `c:/Users/Split Lease/Documents/Split Lease/supabase/functions/_shared/`

---

## 10. Architecture Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                   CLOUDFLARE PAGES                       │
                    │  ┌─────────────────────────────────────────────────────┐│
                    │  │  _redirects ───► _internal/* (HTML files)          ││
                    │  │  _headers ────► Content-Type: text/html            ││
                    │  │  _routes.json ─► API function routing              ││
                    │  └─────────────────────────────────────────────────────┘│
                    └───────────────────────────┬─────────────────────────────┘
                                                │
                    ┌───────────────────────────▼─────────────────────────────┐
                    │                      FRONTEND                            │
                    │  ┌────────────────────────────────────────────────────┐ │
                    │  │ public/*.html ────► src/*.jsx ────► islands/pages/ │ │
                    │  │    (27 files)         (entry)        (components)  │ │
                    │  └────────────────────────────────────────────────────┘ │
                    │                                                          │
                    │  ┌────────────────────────────────────────────────────┐ │
                    │  │ src/logic/                                         │ │
                    │  │  ├── calculators/ (pure math)                      │ │
                    │  │  ├── rules/ (boolean predicates)                   │ │
                    │  │  ├── processors/ (data transform)                  │ │
                    │  │  └── workflows/ (orchestration)                    │ │
                    │  └────────────────────────────────────────────────────┘ │
                    └───────────────────────────┬─────────────────────────────┘
                                                │
                    ┌───────────────────────────▼─────────────────────────────┐
                    │                    SUPABASE                              │
                    │  ┌────────────────────────────────────────────────────┐ │
                    │  │ Edge Functions (20+ functions)                     │ │
                    │  │  ├── auth-user/      (authentication)              │ │
                    │  │  ├── bubble-proxy/   (legacy API proxy)            │ │
                    │  │  ├── proposal/       (proposal CRUD)               │ │
                    │  │  ├── listing/        (listing CRUD)                │ │
                    │  │  └── _shared/        (CORS, errors, utils)         │ │
                    │  └────────────────────────────────────────────────────┘ │
                    │  ┌────────────────────────────────────────────────────┐ │
                    │  │ PostgreSQL Database                                │ │
                    │  │  └── Tables: listing, proposal, user, zat_*, etc. │ │
                    │  └────────────────────────────────────────────────────┘ │
                    └───────────────────────────┬─────────────────────────────┘
                                                │
                    ┌───────────────────────────▼─────────────────────────────┐
                    │                    BUBBLE.IO (Legacy)                    │
                    │  Source of truth for some data, being migrated away     │
                    └─────────────────────────────────────────────────────────┘
```

---

**VERSION**: 1.0
**AUTHOR**: Claude Code Architecture Explorer
