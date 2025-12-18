# Monorepo Migration Feasibility Analysis

**Generated**: 2025-12-18
**Scope**: Comprehensive analysis of Split Lease codebase for React-based monorepo transformation
**Status**: Analysis Complete

---

## Executive Summary

The Split Lease codebase is a **mature multi-page React application** using Islands Architecture, deployed on Cloudflare Pages with Supabase Edge Functions backend. Migration to a React Router SPA monorepo is **feasible but substantial**, requiring significant refactoring of routing, state management, and build configuration.

**Key Findings**:
- 32 HTML entry points with independent React roots
- 362 source files (160 JSX + 10 TSX components)
- Well-organized four-layer business logic architecture
- 21 Supabase Edge Functions (Deno/TypeScript)
- Multiple state management patterns (local store, Zustand-like, hooks)
- Strong separation of concerns already exists

**Migration Complexity**: **MEDIUM-HIGH**
**Estimated Files Affected**: ~200+ files
**Estimated Timeline**: 4-8 weeks for experienced team

---

## 1. Current Architecture Overview

### Project Structure

```
Split Lease/
├── app/                          # Frontend application
│   ├── public/                   # Static HTML templates (32 files)
│   ├── src/                      # React source (362 files)
│   │   ├── *.jsx                 # Entry points (30 files)
│   │   ├── islands/              # React components (170 files)
│   │   │   ├── pages/            # Page components (30+ files)
│   │   │   ├── shared/           # Shared components (40+ files)
│   │   │   ├── modals/           # Modal components (17 files)
│   │   │   └── proposals/        # Proposal components (7 files)
│   │   ├── lib/                  # Utilities & API clients (30+ files)
│   │   ├── logic/                # Business logic (57 files)
│   │   │   ├── calculators/      # Pure math (9 files)
│   │   │   ├── rules/            # Boolean predicates (22 files)
│   │   │   ├── processors/       # Data transforms (14 files)
│   │   │   └── workflows/        # Orchestration (12 files)
│   │   ├── styles/               # CSS files (10+ files)
│   │   ├── routes.config.js      # Route registry (single source of truth)
│   │   └── data/                 # Static data
│   ├── functions/                # Cloudflare Pages Functions (deprecated)
│   ├── scripts/                  # Build scripts
│   ├── package.json              # Dependencies
│   └── vite.config.js            # Vite configuration
├── supabase/
│   ├── functions/                # Edge Functions (21 directories)
│   │   ├── _shared/              # Shared utilities (14 files)
│   │   ├── auth-user/            # Authentication
│   │   ├── listing/              # Listing CRUD
│   │   ├── proposal/             # Proposal CRUD
│   │   ├── bubble-proxy/         # Legacy Bubble.io proxy
│   │   ├── ai-gateway/           # OpenAI proxy
│   │   ├── messages/             # Real-time messaging
│   │   └── ...                   # 14 more functions
│   ├── migrations/               # Database migrations
│   └── config.toml               # Supabase configuration
└── .claude/                      # Documentation & plans
```

### File Counts Summary

| Category | Count |
|----------|-------|
| HTML Entry Points (public/*.html) | 32 |
| JSX Entry Point Files (src/*.jsx) | 30 |
| Total Source Files (JS/JSX/TS/TSX) | 362 |
| JSX Components (islands/) | 160 |
| TSX Components (islands/) | 10 |
| Logic Layer Files | 57 |
| Supabase Edge Functions | 21 directories, 94 TS files |
| Routes Defined | 30+ routes |

---

## 2. Islands Architecture Pattern Analysis

### Current Pattern

The application uses **Islands Architecture** where each page is an independent React application:

```
Static HTML (public/*.html)
    └── <div id="page-root"></div>
        └── React Entry (src/*.jsx)
            └── createRoot().render(<PageComponent />)
```

**Example Flow**:
```
1. User visits /search
2. Cloudflare serves public/search.html
3. search.html loads src/search.jsx
4. search.jsx creates React root and mounts SearchPage
5. SearchPage is self-contained React application
```

### HTML Templates (32 files)

Each HTML file is a shell that:
- Sets page metadata (title, description)
- Includes Hotjar tracking
- Loads page-specific assets (Google Maps, Lottie, etc.)
- Provides mount point (`<div id="*-page">`)
- Imports entry JSX file as ES module

**Sample (public/search.html)**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Search Rentals - Split Lease</title>
  <link rel="stylesheet" href="/src/styles/main.css">
  <!-- Google Maps API, Lottie -->
</head>
<body>
  <div id="search-page"></div>
  <script type="module" src="/src/search.jsx"></script>
</body>
</html>
```

### Entry Point Pattern (30 files)

Each JSX entry point follows identical pattern:
```javascript
import { createRoot } from 'react-dom/client';
import PageComponent from './islands/pages/PageComponent.jsx';

createRoot(document.getElementById('page-root')).render(<PageComponent />);
```

### Route Registry (routes.config.js)

Single source of truth for all routing:
```javascript
export const routes = [
  { path: '/', file: 'index.html', protected: false, hasDynamicSegment: false },
  { path: '/search', file: 'search.html', cloudflareInternal: true, internalName: 'search-view' },
  { path: '/view-split-lease', file: 'view-split-lease.html', hasDynamicSegment: true, dynamicPattern: '/view-split-lease/:id' },
  { path: '/guest-proposals', file: 'guest-proposals.html', protected: true, hasDynamicSegment: true },
  // ... 26 more routes
];
```

---

## 3. Frontend Analysis

### React Version & Patterns

**React**: 18.2.0 (modern, Hooks-based)

**Key Patterns**:

1. **Hollow Component Pattern** - Page components contain zero business logic
   - Component: Pure JSX rendering
   - Hook (`use*PageLogic`): All state, effects, handlers
   - Benefits: Testable, focused, reusable

2. **Four-Layer Logic Architecture**:
   - `calculators/`: Pure math functions (`calculate*`, `get*`)
   - `rules/`: Boolean predicates (`is*`, `can*`, `has*`, `should*`)
   - `processors/`: Data transformation (`adapt*`, `format*`, `process*`)
   - `workflows/`: Orchestration (`*Workflow`)

3. **Custom Store Pattern** (SelfListingPage):
   - Singleton store with Pub/Sub
   - React hook adapter
   - localStorage persistence
   - Similar to Zustand but custom-built

### State Management Inventory

| Pattern | Usage | Location |
|---------|-------|----------|
| React useState/useEffect | All pages | Page logic hooks |
| URL Parameters | Search filters, IDs | lib/urlParams.js |
| localStorage | Auth tokens, drafts | lib/secureStorage.js |
| Custom Pub/Sub Store | Listing form | SelfListingPage/store/ |
| React Hook Form | Form validation | RentalApplicationPage |

**No Global State Library** (no Redux, Zustand, Context API for app-wide state)

### Component Inventory

**Page Components (30+)**:
- HomePage, SearchPage, ViewSplitLeasePage
- GuestProposalsPage, HostProposalsPage
- SelfListingPage, ListingDashboardPage
- AccountProfilePage, RentalApplicationPage
- FAQPage, HelpCenterPage, PoliciesPage
- CareersPage, AboutUsPage, ListWithUsPage
- And more...

**Shared Components (40+)**:
- Header, Footer, Button
- GoogleMap, ListingCard, Toast
- SignUpLoginModal, CreateProposalFlowV2
- ScheduleSelectors, FavoriteButton
- LoggedInAvatar, VirtualMeetingManager
- And more...

**Modal Components (17)**:
- ProposalDetailsModal, MapModal
- EditProposalModal, CancelProposalModal
- VirtualMeetingModal, HostProfileModal
- GuestEditingProposalModal, and more...

### Current Navigation

**Full Page Reloads** - No client-side routing:
```javascript
// Navigation via anchor tags
<a href="/search">Browse Listings</a>

// Navigation via JavaScript
window.location.href = '/view-split-lease/' + listingId;
```

---

## 4. Backend / Edge Functions Analysis

### Supabase Edge Functions (21 total)

**Core Functions**:
| Function | Purpose | Actions |
|----------|---------|---------|
| auth-user | Authentication | login, signup, logout, validate, password reset |
| listing | Listing CRUD | create, get, submit, delete |
| proposal | Proposal CRUD | create, update, get, suggest |
| bubble-proxy | Bubble.io proxy | send_message, toggle_favorite, photos |
| ai-gateway | OpenAI proxy | complete, stream |
| messages | Real-time messaging | conversations, threads |
| bubble_sync | Queue processor | sync Supabase -> Bubble |

**Communication Pattern**:
```
Frontend (React)
    └── Supabase Client (lib/supabase.js)
        └── Edge Function (POST /functions/v1/{name})
            └── { action, payload } request body
                └── Handler dispatches to action handler
```

**No Server-Side Rendering** - All Edge Functions are API endpoints.

### Shared Utilities (_shared/)

- `cors.ts` - CORS headers
- `errors.ts` - Custom error classes
- `validation.ts` - Input validation
- `slack.ts` - Error reporting
- `bubbleSync.ts` - Atomic sync service
- `queueSync.ts` - Queue-based sync
- `openai.ts` - OpenAI wrapper

---

## 5. Dependencies & Build Configuration

### package.json (app/)

**Runtime Dependencies**:
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@supabase/supabase-js": "^2.38.0",
  "@react-google-maps/api": "^2.20.7",
  "date-fns": "^4.1.0",
  "framer-motion": "^12.23.24",
  "react-hook-form": "^7.66.1",
  "zod": "^4.1.12",
  "styled-components": "^6.1.19",
  "lucide-react": "^0.553.0",
  "qrcode.react": "^4.2.0",
  "lottie-react": "^2.4.1"
}
```

**Dev Dependencies**:
```json
{
  "vite": "^5.0.0",
  "@vitejs/plugin-react": "^4.2.0",
  "esbuild": "^0.27.0",
  "supabase": "^2.58.5"
}
```

### Vite Configuration

**Multi-Page Build**:
```javascript
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'public/index.html'),
      search: resolve(__dirname, 'public/search.html'),
      // ... 25 more entries
    }
  }
}
```

**Custom Plugins**:
1. `multi-page-routing` - Routes clean URLs to HTML files in dev/preview
2. `move-html-to-root` - Post-build reorganization for Cloudflare

**Post-Build Tasks**:
- Move HTML to dist root
- Copy assets, images, help-center-articles
- Create `_internal/` files for Cloudflare routing
- Copy `_redirects`, `_headers`, `_routes.json`

---

## 6. Migration Complexity Assessment

### What Would Change

#### A. Routing System (HIGH IMPACT)

**Current**:
- 32 HTML files as entry points
- Vite multi-page build
- Full page loads between pages
- Cloudflare `_redirects` for routing

**Required Changes**:
1. Replace 32 HTML files with single `index.html`
2. Replace 30 entry JSX files with React Router routes
3. Implement client-side navigation (Link, useNavigate)
4. Update all `<a href>` and `window.location` calls
5. Remove/simplify Vite multi-page config
6. Update Cloudflare `_redirects` for SPA fallback

**Estimated Files**: 60+ files need navigation updates

#### B. State Management (MEDIUM IMPACT)

**Current Issues**:
- No global app state
- Auth state in localStorage/cookies with no reactivity
- Each page fetches its own data
- No shared state between page loads

**Required Changes**:
1. Implement global state provider (Context or Zustand)
2. Lift auth state to React context for reactivity
3. Consider shared data caching (React Query, SWR)
4. Preserve page state during client-side navigation

**Estimated Files**: 40+ files for state management updates

#### C. Page Components (MEDIUM IMPACT)

**Current**:
- Each page mounts independently
- Header/Footer re-rendered per page
- Pages fetch all data on mount

**Required Changes**:
1. Wrap pages with shared layout (Header/Footer once)
2. Add route-level code splitting (React.lazy)
3. Update data fetching to work with React Router
4. Implement route guards for protected pages

**Estimated Files**: 30+ page components need updates

#### D. Build Configuration (MEDIUM IMPACT)

**Current**:
- Multi-page Vite build with 28 entry points
- Custom post-build plugins
- Cloudflare-specific routing files

**Required Changes**:
1. Simplify to single-page build
2. Remove multi-page routing plugins
3. Update Cloudflare config for SPA
4. Add code-splitting configuration

**Files**: vite.config.js, scripts/generate-redirects.js

### What Can Stay the Same

1. **Business Logic Layer** (57 files) - Completely reusable
   - Calculators, rules, processors, workflows
   - Pure functions, no React dependencies

2. **Supabase Edge Functions** (94 files) - No changes needed
   - API layer is independent of frontend routing
   - Already action-based design

3. **UI Components** (100+ files) - Mostly reusable
   - Shared components (Header, Footer, Cards, Buttons)
   - Modal components
   - Form components

4. **Utilities** (30+ files) - Mostly reusable
   - API clients (supabase.js, bubbleAPI.js)
   - Data fetchers
   - Validation utilities

### Blocking Issues & Risks

1. **Google Maps Integration**
   - Currently loaded per-page in HTML
   - Needs to be loaded once in SPA shell
   - Risk: Map state management across navigation

2. **Third-Party Scripts**
   - Hotjar loaded per-page
   - Lottie animations
   - Need single-load approach

3. **Deep Link Support**
   - Dynamic routes (`/view-split-lease/:id`)
   - Query parameters for search filters
   - Must work with React Router

4. **Authentication Flow**
   - Password reset uses URL hash tokens
   - Cookie-based auth checks
   - Needs React context integration

---

## 7. Monorepo Structure Recommendations

### Recommended Package Breakdown

```
packages/
├── @splitlease/ui/              # Shared UI components
│   ├── components/              # Button, Card, Modal, etc.
│   ├── forms/                   # Form components
│   └── layout/                  # Header, Footer, Layout
│
├── @splitlease/logic/           # Business logic (existing 4-layer)
│   ├── calculators/
│   ├── rules/
│   ├── processors/
│   └── workflows/
│
├── @splitlease/api/             # API clients & types
│   ├── supabase.ts
│   ├── auth.ts
│   └── types/
│
├── @splitlease/utils/           # Shared utilities
│   ├── dayUtils.ts
│   ├── navigation.ts
│   └── validation.ts
│
└── @splitlease/config/          # Shared configuration
    ├── routes.ts
    └── constants.ts

apps/
├── web/                         # Main web application (SPA)
│   ├── src/
│   │   ├── pages/               # Page components
│   │   ├── features/            # Feature-specific code
│   │   ├── hooks/               # App-specific hooks
│   │   └── App.tsx              # Root component with Router
│   └── package.json
│
└── admin/                       # Future admin dashboard
    └── ...
```

### Shared Code Extraction Priority

**Phase 1 - Easy Wins**:
1. `@splitlease/logic` - Already isolated, pure functions
2. `@splitlease/utils` - Utility functions with no React deps
3. `@splitlease/config` - Constants and configuration

**Phase 2 - UI Components**:
1. `@splitlease/ui` - Extract presentational components
   - Start with: Button, Card, Toast, Modal base
   - Then: Header, Footer, ListingCard

**Phase 3 - API Layer**:
1. `@splitlease/api` - Supabase client, auth utilities
   - Requires careful handling of environment variables
   - Need to abstract auth state management

### Monorepo Tooling Recommendations

| Tool | Purpose | Alternative |
|------|---------|-------------|
| **Turborepo** | Build orchestration | Nx |
| **pnpm** | Package management | yarn workspaces |
| **TypeScript** | Type sharing | Keep JS with JSDoc |
| **Changesets** | Version management | semantic-release |

---

## 8. Migration Path Recommendations

### Option A: Big Bang Migration (4-6 weeks)

1. Create React Router app shell
2. Port all pages as route components
3. Update all navigation at once
4. Comprehensive testing
5. Single deployment

**Pros**: Clean break, no hybrid state
**Cons**: High risk, long development pause

### Option B: Incremental Migration (8-12 weeks)

1. Add React Router to existing structure
2. Wrap pages one-by-one in route components
3. Use hybrid routing (some pages SPA, some MPA)
4. Gradual navigation updates
5. Multiple deployments

**Pros**: Lower risk, continuous deployment
**Cons**: Hybrid complexity, longer timeline

### Option C: Parallel Development (6-8 weeks)

1. Create new SPA app alongside existing
2. Share components via internal packages
3. Migrate features to new app
4. Switch DNS when complete

**Pros**: No disruption to existing app
**Cons**: Dual maintenance, package sync complexity

### Recommended Approach: Option B + Monorepo

1. **Week 1-2**: Set up monorepo structure, extract packages
2. **Week 3-4**: Add React Router, create layout wrapper
3. **Week 5-6**: Migrate high-traffic pages (Home, Search, Listing)
4. **Week 7-8**: Migrate auth-protected pages
5. **Week 9-10**: Migrate remaining pages
6. **Week 11-12**: Testing, optimization, cleanup

---

## 9. Key Files Reference

### Critical Files to Understand

| File | Purpose | Migration Impact |
|------|---------|------------------|
| `app/src/routes.config.js` | Route registry | Replace with React Router config |
| `app/vite.config.js` | Build configuration | Simplify for SPA |
| `app/src/lib/auth.js` | Authentication | Wrap in React context |
| `app/src/lib/supabase.js` | Supabase client | Extract to package |
| `app/src/logic/index.js` | Logic layer exports | Extract to package |

### Pages Requiring Special Attention

| Page | Complexity | Notes |
|------|------------|-------|
| SearchPage | HIGH | Google Maps, complex filters |
| ViewSplitLeasePage | HIGH | Largest component (134KB) |
| SelfListingPage | HIGH | Custom store, 7-step wizard |
| GuestProposalsPage | MEDIUM | Real-time updates |
| ResetPasswordPage | LOW | URL token handling |

---

## 10. Conclusion

### Feasibility: YES, but Significant Effort

The codebase is **well-architected** for a migration:
- Clean separation of concerns
- Business logic already isolated
- Modern React patterns (Hooks)
- Comprehensive documentation

The main challenges are:
- Large number of entry points (32)
- No existing client-side routing
- Page-level state isolation
- Third-party script management

### Recommendation

**Proceed with incremental migration** using Option B approach. The existing architecture's strengths (four-layer logic, hollow components) will transfer well to a React Router SPA. Focus on extracting shared packages first to establish monorepo foundation.

### Next Steps

1. Create proof-of-concept with React Router on 2-3 pages
2. Extract `@splitlease/logic` package as first monorepo package
3. Test Cloudflare deployment with SPA configuration
4. Estimate specific page migration effort

---

## Appendix: Metrics Summary

| Metric | Value |
|--------|-------|
| Total Source Files | 362 |
| React Components | 170 |
| Page Components | 30+ |
| HTML Entry Points | 32 |
| Edge Functions | 21 |
| Routes Defined | 30+ |
| Logic Layer Files | 57 |
| Estimated Migration Files | 200+ |
| Recommended Timeline | 8-12 weeks |
| Migration Complexity | MEDIUM-HIGH |

