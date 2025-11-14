# Split Lease Codebase Inconsistencies Report

**Generated:** 2025-11-14
**Status:** Active Codebase Analysis
**Scope:** Dual index page implementations, build processes, shared components, URL patterns

---

## Executive Summary

The Split Lease codebase contains **two separate and parallel index page implementations** that serve different purposes but create significant inconsistencies. This report documents these discrepancies and provides recommendations for consolidation.

### Key Findings:
1. **Two Index Implementations:** Vanilla HTML/CSS/JS in `input/index/` vs React in `app/src/islands/pages/HomePage.jsx`
2. **Different Deployment Targets:** `input/` appears to be a GitHub Pages clone, `app/` is the Cloudflare Pages production build
3. **Inconsistent Features:** Hamburger menu, day selector, listing card layouts differ between versions
4. **URL Pattern Conflicts:** `/view-split-lease/${id}` vs `/view-split-lease.html/${id}`
5. **Domain Hardcoding:** Mixed use of `app.split.lease` absolute URLs vs relative paths

---

## 1. Duplicate Index Page Implementations

### 1.1 Location and Purpose

| Aspect | `input/index/` | `app/src/islands/pages/HomePage.jsx` |
|--------|----------------|--------------------------------------|
| **Location** | `C:/Users/Split Lease/.../input/index/` | `C:/Users/Split Lease/.../app/src/islands/pages/` |
| **Technology** | Vanilla HTML/CSS/JS | React (JSX) with Vite build |
| **File Size** | index.html: 482 lines | HomePage.jsx: 522 lines |
| **Deployment** | GitHub Pages (likely) | Cloudflare Pages (confirmed) |
| **Git Status** | Force-tracked despite `.gitignore` | Normal tracking in `app/` |
| **Documentation** | Extensive CLAUDE.md (32KB) | Standard React component |

### 1.2 Header Navigation Differences

#### **Hamburger Menu**

**`input/index/index.html`** (Lines 36-40):
```html
<button class="hamburger-menu" aria-label="Toggle navigation menu" onclick="toggleMobileMenu()">
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
</button>
```

**`app/src/islands/shared/Header.jsx`** (Lines 85-94):
```jsx
<button
  className={`hamburger-menu ${mobileMenuActive ? 'active' : ''}`}
  aria-label="Toggle navigation menu"
  onClick={toggleMobileMenu}
>
  <span className="hamburger-line"></span>
  <span className="hamburger-line"></span>
  <span className="hamburger-line"></span>
</button>
```

**Differences:**
- ✅ Both implementations have hamburger menus
- **State Management:** React version uses state (`mobileMenuActive`), vanilla uses DOM manipulation
- **Event Handling:** `onclick` vs `onClick` (React)
- **Class Binding:** React version has dynamic `active` class based on state

#### **Dropdown Menus**

Both versions have "Host with Us" and "Stay with Us" dropdowns, but with different implementations:

**Input Version:**
- Uses inline `onclick` handlers
- Manual DOM manipulation via `script.js`
- Dropdown state managed through CSS classes

**React Version:**
- State-driven (`activeDropdown` state)
- Event handlers as React props
- Automatic re-rendering on state change

### 1.3 Listing Card Layout Differences

#### **Click Handlers**

**`input/index/index.html`** (Lines 285-291):
```html
<div class="listing-card" data-property-id="1">
    <div class="listing-image" style="background-image: url('...')"></div>
    <div class="listing-details">
        <h3>One Platt | Studio</h3>
        <p>Studio - 1 bed - 1 bathroom - Free Storage</p>
    </div>
</div>
```

**`app/src/islands/pages/HomePage.jsx`** (Lines 275-293):
```jsx
<div
  key={index}
  className="listing-card"
  data-property-id={listing.id}
  onClick={() => handleListingClick(listing.id)}
>
  <div
    className="listing-image"
    style={{
      backgroundImage: `url('${listing.image}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  ></div>
  <div className="listing-details">
    <h3>{listing.title}</h3>
    <p>{listing.description}</p>
  </div>
</div>
```

**Differences:**
- **Click Handling:** Vanilla version likely uses event delegation, React has direct `onClick` handler
- **Property IDs:** Vanilla uses hardcoded "1", React uses dynamic `PROPERTY_IDS` constants
- **Data Structure:** React maps over array, vanilla has static HTML
- **Styling:** React has inline style object, vanilla has inline string

### 1.4 CSS Styling Approaches

#### **Variable Definitions**

**`input/index/styles.css`** (Lines 2-20):
```css
:root {
    --primary-color: #31135D;
    --primary-hover: #251047;
    --text-dark: #1a1a1a;
    --text-gray: #6b7280;
    --bg-light: #f9fafb;
    /* ... more variables ... */
}
```

**`app/src/styles/variables.css`** (Similar structure but in separate file):
```css
/* CSS custom properties managed in dedicated variables.css */
@import url('variables.css');
```

**Differences:**
- **Organization:** React version splits into multiple CSS files (header.css, hero.css, etc.)
- **Monolithic vs Modular:** Vanilla has 80KB single file, React has component-based CSS
- **Build Process:** React CSS goes through Vite bundler, vanilla is direct

#### **Header Positioning**

**Input Version** (`styles.css` line 98-100):
```css
.main-header {
    position: fixed !important;
    top: 0 !important;
    /* ... */
}
```

**React Version** (`app/src/styles/components/header.css` lines 2-12):
```css
.main-header {
    position: fixed !important;
    top: 0 !important;
    left: 0;
    right: 0;
    background: #31135D;
    /* ... */
}
```

**Differences:**
- Both use `position: fixed` with `!important` flags
- React version explicitly sets `left: 0; right: 0`

### 1.5 JavaScript Functionality Differences

#### **Day Selector**

**Input Version** (`input/index/script.js` - has complex day selection logic):
```javascript
const URL_LOCK = {
    AUTHORIZED_DOMAIN: 'app.split.lease',
    LOCKED: true,
    LOCK_MESSAGE: '🔒 URL modifications are locked.',
    // ... validation methods
};
```

**React Version** (`app/src/islands/pages/HomePage.jsx`):
- Uses `SearchScheduleSelector` React component (imported from shared)
- State-driven day selection: `const [selectedDays, setSelectedDays] = useState([])`
- No URL_LOCK mechanism visible

**Differences:**
- **URL Lock:** Input version has hardcoded URL protection mechanism
- **Component Reuse:** React uses shared `SearchScheduleSelector` component
- **State Management:** React uses hooks, vanilla uses global variables

#### **Authentication Check**

**Input Version** (`script.js` lines 70-100):
```javascript
function checkAuthStatus() {
    console.log('🔍 Checking authentication status...');
    const splitLeaseAuth = checkSplitLeaseCookies();

    if (splitLeaseAuth.isLoggedIn) {
        console.log('✅ User authenticated via Split Lease cookies');
        isUserLoggedIn = true;
        handleLoggedInUser(splitLeaseAuth.username);
        return true;
    }
    // Fallback to localStorage...
}
```

**React Version** (`app/src/islands/pages/HomePage.jsx` lines 438-440):
```jsx
useEffect(() => {
    checkAuthStatus();
}, []);
```

**Differences:**
- **Implementation:** Input has full auth logic inline, React imports from `lib/auth.js`
- **Execution:** React uses `useEffect` hook, vanilla uses DOMContentLoaded
- **Scope:** Input has localStorage + cookie fallbacks, React delegates to auth module

### 1.6 URL Redirect Patterns

#### **Property Listing Redirects**

**Input Version** (hardcoded in `script.js`):
```javascript
// Links to original Split Lease site
window.location.href = `https://app.split.lease/view-split-lease/${propertyId}?days-selected=${days}`;
```

**React Version** (`HomePage.jsx` line 261):
```javascript
// Links to LOCAL page
const propertyUrl = `/view-split-lease.html/${propertyId}`;
window.location.href = propertyUrl;
```

**Critical Difference:**
- **Input:** Redirects to **external** `app.split.lease` domain
- **React:** Navigates to **local** `/view-split-lease.html/` route
- **Implication:** Input is a "marketing page" that funnels to main app, React is integrated app

---

## 2. Build/Deployment Discrepancies

### 2.1 Build Configuration

#### **Cloudflare Pages (.pages.toml)**

```toml
[build]
command = "npm run build"
cwd = "app"
publish = "dist"

[build.environment]
NODE_VERSION = "20"
```

**Analysis:**
- Builds from `app/` directory only
- Output to `app/dist/`
- `input/` directory **not involved** in production build

#### **Build Script (build.sh)**

```bash
#!/bin/bash
cd app || exit 1
npm install
npm run build
# Output: app/dist/
```

**Analysis:**
- Only processes `app/` directory
- Confirms `input/` is separate project

### 2.2 Git Tracking Analysis

```bash
# Git shows input/ is force-tracked despite .gitignore
$ git ls-files "input/"
input/index/.gitignore
input/index/index.html
input/index/script.js
input/index/styles.css
# ... 20+ files tracked
```

**`.gitignore` contains:**
```
input/
.playwright-mcp/
dump/
```

**Analysis:**
- `input/` directory is in `.gitignore`
- Files are tracked anyway (force-added with `git add -f`)
- Suggests intentional parallel development

### 2.3 Deployment Targets

| Directory | Deployment | URL | Purpose |
|-----------|-----------|-----|---------|
| `app/` | **Cloudflare Pages** | `https://split.lease` (likely) | Production app |
| `input/index/` | **GitHub Pages** | `https://splitleasesharath.github.io/index_lite` | Clone/prototype |

**Evidence:**
- `input/index/CLAUDE.md` references GitHub Pages deployment
- `input/index/.nojekyll` file (GitHub Pages config)
- Build process only touches `app/`

---

## 3. Shared Components Analysis

### 3.1 Header Component

#### **Input Version**
- **File:** `input/index/index.html` (inline HTML, lines 27-105)
- **Styling:** `input/index/styles.css` (lines 98-382)
- **JavaScript:** `input/index/script.js` (lines 1990-2010)

#### **React Version**
- **File:** `app/src/islands/shared/Header.jsx` (287 lines)
- **Styling:** `app/src/styles/components/header.css` (dedicated file)
- **State:** React hooks (`useState`, `useEffect`)

#### **Differences:**

| Feature | Input | React |
|---------|-------|-------|
| Logo link | `https://splitlease.app` | `https://splitlease.app` |
| Dropdown URLs | `app.split.lease` | Mix of relative + `app.split.lease` |
| Mobile menu | Vanilla JS toggle | React state |
| Auth buttons | Inline onclick | Event handlers |

### 3.2 Footer Component

#### **Input Version**
- **File:** `input/index/index.html` (lines 349-430)
- **Features:** Referral form, import listing, app download

#### **React Version**
- **File:** `app/src/islands/shared/Footer.jsx` (282 lines)
- **Features:** Same as input + state-driven forms

#### **Differences:**

| Feature | Input | React |
|---------|-------|-------|
| Form validation | JavaScript functions | React state + handlers |
| Submit handling | `onclick="handleImportListing()"` | `onClick={handleImportSubmit}` |
| Loading states | DOM manipulation | State-driven rendering |
| API calls | `fetch()` in script.js | `fetch()` in component |

### 3.3 Styling Inconsistencies

#### **Color Variables**

Both use same color scheme (`#31135D` purple), but different organization:

**Input:** Single 80KB `styles.css` file
**React:** Modular approach with `variables.css` + component files

#### **Responsive Breakpoints**

**Input:**
```css
@media (max-width: 768px) {
    .hamburger-menu {
        display: none; /* Hide hamburger at line 2676 */
    }
}
```

**React:**
```css
@media (max-width: 768px) {
    .hamburger-menu {
        display: block; /* Show hamburger */
    }
}
```

**Critical Inconsistency:** Input hides hamburger on mobile, React shows it!

---

## 4. URL Routing Pattern Conflicts

### 4.1 View Listing Page Patterns

#### **Input Version**

Always redirects to **external** app.split.lease:
```javascript
// From script.js (property card click)
window.location.href = `https://app.split.lease/view-split-lease/${propertyId}?days-selected=${days}`;
```

#### **React Version**

Multiple pattern support via Vite config:

**`app/vite.config.js`** (lines 17-30):
```javascript
// Handles BOTH patterns:
if (url.startsWith('/view-split-lease/')) {
    req.url = '/public/view-split-lease.html' + queryString;
}
else if (url.startsWith('/view-split-lease.html')) {
    req.url = '/public/view-split-lease.html' + queryString;
}
```

**Cloudflare Functions** (`app/functions/view-split-lease/[id].js`):
```javascript
// Catches /view-split-lease/[any-id]
url.pathname = '/view-split-lease.html';
```

**Redirects** (`app/public/_redirects`):
```
/view-split-lease/*  /view-split-lease.html  200!
/view-split-lease.html/:id  /view-split-lease/:id  301
```

### 4.2 Pattern Summary

| Pattern | Input | React | Cloudflare |
|---------|-------|-------|------------|
| `/view-split-lease/${id}` | External redirect | ✅ Supported | ✅ Rewrite |
| `/view-split-lease.html/${id}` | ❌ Not used | ✅ Legacy support | ✅ Redirect to clean |
| `/view-split-lease?days=1,2,3` | External | ✅ Supported | ✅ Rewrite |

### 4.3 Domain Hardcoding Issues

#### **Absolute URLs to app.split.lease**

**Input version** (script.js has 50+ instances):
```javascript
const SEARCH_URL = 'https://app.split.lease/search';
const SIGNUP_URL = 'https://app.split.lease/signup-login';
const FAQ_URL = 'https://app.split.lease/faq';
// ... many more
```

**React version** (`app/src/lib/constants.js`):
```javascript
export const AUTHORIZED_DOMAIN = 'app.split.lease';
export const BUBBLE_API_URL = 'https://app.split.lease';
export const SIGNUP_LOGIN_URL = 'https://app.split.lease/signup-login';
export const SEARCH_URL = 'https://app.split.lease/search';
// ... 10+ constants
```

**Inconsistency:**
- Some links are relative (`/faq.html`)
- Others are absolute (`https://app.split.lease/faq`)
- Creates confusion about local vs remote resources

#### **Search Page URLs**

**Input:**
```javascript
// Always external
window.location.href = `https://app.split.lease/search?days-selected=${days}`;
```

**React:**
```javascript
// Relative local navigation
window.location.href = `/search.html?days-selected=${days}`;
```

---

## 5. Recommendations for Consolidation

### 5.1 Immediate Actions (High Priority)

#### **A. Clarify Project Purpose**

**Decision Point:** Is `input/index/` a...
1. **Prototype/Development Version?** → Deprecate and remove after migration
2. **Marketing Landing Page?** → Rename to `landing/` and document clearly
3. **GitHub Pages Clone?** → Keep separate with clear documentation

**Recommendation:**
- Add `README.md` to `input/` explaining its purpose
- If obsolete, create `MIGRATION.md` and archive

#### **B. URL Pattern Standardization**

**Current State:**
- Input: `/view-split-lease/${id}` → external
- React: `/view-split-lease/${id}` → local

**Recommended Standard:**
```
/listings/${id}          - Clean, semantic URL
/listings/${id}/book     - Booking flow
/listings/${id}/details  - Full details
```

**Action Items:**
1. Update Vite config to support new pattern
2. Add redirects for legacy patterns
3. Update all internal links
4. Document in `URL_PATTERNS.md`

#### **C. Component Consolidation**

**Header Component:**
```
Current:
- input/index/index.html (inline HTML)
- app/src/islands/shared/Header.jsx (React)

Recommended:
- app/src/islands/shared/Header.jsx (single source of truth)
- Generate static HTML for non-React pages if needed
```

**Footer Component:**
```
Current:
- input/index/index.html (inline HTML)
- app/src/islands/shared/Footer.jsx (React)

Recommended:
- Same as Header - single React component
```

### 5.2 Medium-Term Actions

#### **D. CSS Architecture Refactor**

**Current Issues:**
- `input/index/styles.css` - 80KB monolith
- `app/src/styles/` - Modular but duplicates some rules

**Recommended:**
```
app/src/styles/
├── variables.css         (shared design tokens)
├── reset.css            (normalization)
├── utilities.css        (utility classes)
├── components/
│   ├── header.css
│   ├── footer.css
│   ├── listings.css
│   └── ...
└── main.css             (imports all)
```

**Action Items:**
1. Audit both CSS files for duplicates
2. Extract shared variables
3. Remove `!important` flags where possible
4. Document responsive breakpoints

#### **E. Hamburger Menu Standardization**

**Inconsistency:**
- Input: Hides hamburger on mobile (line 2676)
- React: Shows hamburger on mobile

**Recommended Behavior:**
```css
/* Desktop (>768px) */
.hamburger-menu { display: none; }
.nav-center { display: flex; }

/* Mobile (<768px) */
.hamburger-menu { display: block; }
.nav-center { display: none; }
.nav-center.mobile-active { display: flex; }
```

**Implementation:**
- Update both versions to match
- Test on iPhone, Android, tablet
- Document mobile navigation flow

### 5.3 Long-Term Improvements

#### **F. Domain URL Strategy**

**Current Confusion:**
- Some URLs relative: `/search.html`
- Some absolute: `https://app.split.lease/search`
- No clear pattern

**Recommended Strategy:**
```javascript
// Environment-aware configuration
const ENV = {
  isDevelopment: window.location.hostname === 'localhost',
  isProduction: window.location.hostname === 'split.lease',

  // Base URLs
  APP_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:5173'
    : 'https://app.split.lease',

  // API URLs
  API_URL: 'https://app.split.lease/api/1.1',

  // Helper functions
  url(path) {
    return this.isProduction
      ? path  // Relative in production
      : `${this.APP_URL}${path}`; // Absolute in dev
  }
};

// Usage
window.location.href = ENV.url('/search?days=1,2,3');
```

**Benefits:**
- Works in development and production
- Single source of truth
- Easy to switch environments

#### **G. Build Process Unification**

**Current:**
- `app/` builds to `app/dist/`
- `input/` is static files

**Recommended:**
```bash
# Single build command
npm run build

# Outputs:
dist/
├── index.html          (React build)
├── search.html         (React build)
├── view-split-lease.html (React build)
├── assets/             (bundled CSS/JS)
└── landing/            (static marketing page if needed)
```

**Implementation:**
1. Migrate `input/index/` content into React app
2. Use SSG (Static Site Generation) if needed
3. Single build script in root
4. Update Cloudflare Pages config

#### **H. Documentation**

Create these documentation files:

**`ARCHITECTURE.md`**
```markdown
# Split Lease Architecture

## Directory Structure
- `/app` - Main React application
- `/input` - [Legacy/Marketing/Prototype] - TO BE REMOVED

## URL Patterns
- `/listings/${id}` - Listing detail page
- `/search` - Search page
...
```

**`MIGRATION.md`** (if deprecating input/)
```markdown
# Migration from input/index to app/

## What Changed
- Day selector now uses SearchScheduleSelector component
- URLs changed from .html extensions to clean routes
...
```

**`URL_PATTERNS.md`**
```markdown
# URL Patterns Reference

## Internal Routes (Local Navigation)
/                      → Home page
/search                → Search listings
/listings/${id}        → View listing

## External Routes (app.split.lease)
/signup-login          → Authentication
/api/1.1/wf/*         → Workflow endpoints
...
```

---

## 6. Risk Assessment

### 6.1 Breaking Changes Risk

| Change | Risk Level | Impact | Mitigation |
|--------|-----------|--------|------------|
| Remove `input/` | 🟡 Medium | GitHub Pages site breaks | Add redirect, notify users |
| Change URL patterns | 🔴 High | Bookmarks break | 301 redirects, transition period |
| Merge components | 🟢 Low | No external impact | Thorough testing |
| CSS refactor | 🟢 Low | Visual regressions possible | Screenshot tests |

### 6.2 Development Workflow Impact

**Current Workflow:**
- Developers may edit `input/` thinking it's production
- Changes to `input/` don't deploy to Cloudflare
- Confusion about which version is "canonical"

**After Consolidation:**
- Single source of truth in `app/`
- Clear deployment pipeline
- Reduced maintenance burden

---

## 7. Testing Checklist

Before consolidating, test these scenarios:

### Functional Tests
- [ ] Day selector works on both versions
- [ ] Hamburger menu toggles correctly on mobile
- [ ] Dropdown menus open/close properly
- [ ] Listing cards redirect to correct URLs
- [ ] Auth status checks work
- [ ] Form submissions (referral, import) function

### Visual Tests
- [ ] Header renders identically (desktop)
- [ ] Header renders identically (mobile)
- [ ] Footer layout matches
- [ ] Listing cards have same spacing
- [ ] Color scheme consistent (#31135D purple)
- [ ] Font sizes match

### URL Tests
- [ ] `/view-split-lease/123` redirects correctly
- [ ] `/view-split-lease.html/123` redirects correctly
- [ ] Query params preserved: `?days-selected=1,2,3`
- [ ] External links open in new tabs
- [ ] Relative links navigate within app

### Cross-Browser Tests
- [ ] Chrome (desktop + mobile)
- [ ] Firefox (desktop + mobile)
- [ ] Safari (iOS)
- [ ] Edge

---

## 8. Conclusion

The Split Lease codebase currently maintains **two parallel index page implementations** that serve different purposes but create confusion and maintenance overhead.

### Summary of Issues:
1. **Dual Implementations:** `input/index/` (vanilla) and `app/HomePage.jsx` (React)
2. **Deployment Confusion:** `input/` may deploy to GitHub Pages, `app/` to Cloudflare
3. **URL Inconsistencies:** Mix of relative and absolute URLs, different redirect targets
4. **Component Duplication:** Header and Footer exist in both versions
5. **Styling Conflicts:** Monolithic vs modular CSS, hamburger menu behavior differs

### Recommended Path Forward:

**Phase 1 (1-2 weeks):**
- Document purpose of `input/` directory
- Audit URL patterns and create mapping
- Fix hamburger menu inconsistency

**Phase 2 (2-4 weeks):**
- Consolidate Header/Footer components
- Refactor CSS architecture
- Implement environment-aware URL strategy

**Phase 3 (4-6 weeks):**
- Migrate `input/` content to React app (if needed)
- Remove duplicate implementation
- Update deployment pipeline

**Success Metrics:**
- Single source of truth for index page
- Zero URL redirect errors
- Consistent user experience across all entry points
- Reduced codebase complexity (estimate: -40% code)

---

## Appendix A: File Locations

### Input Version
```
input/index/
├── index.html          (482 lines)
├── styles.css          (80KB, 2677 lines)
├── script.js           (79KB, 2010+ lines)
├── assets/images/
│   ├── logo.png
│   ├── hero-left.png
│   └── hero-right.png
└── CLAUDE.md           (32KB - extensive documentation)
```

### React Version
```
app/
├── public/
│   └── index.html      (15 lines - just mount point)
├── src/
│   ├── islands/
│   │   ├── pages/
│   │   │   └── HomePage.jsx (522 lines)
│   │   └── shared/
│   │       ├── Header.jsx   (287 lines)
│   │       └── Footer.jsx   (282 lines)
│   └── styles/
│       ├── main.css         (imports)
│       ├── variables.css
│       └── components/
│           ├── header.css
│           ├── footer.css
│           └── ... (10+ files)
└── vite.config.js      (9.7KB - routing config)
```

---

## Appendix B: Code Snippets

### URL_LOCK Mechanism (Input Only)

```javascript
// input/index/script.js (lines 10-28)
const URL_LOCK = {
    AUTHORIZED_DOMAIN: 'app.split.lease',
    LOCKED: true,
    LOCK_MESSAGE: '🔒 URL modifications are locked.',

    validateURL: function(url) {
        if (!this.LOCKED) return true;
        return url.includes(this.AUTHORIZED_DOMAIN);
    },

    getBaseURL: function() {
        return `https://${this.AUTHORIZED_DOMAIN}`;
    }
};
Object.freeze(URL_LOCK);
```

**Purpose:** Prevent accidental URL modifications
**Location:** Only in `input/`, not in React version
**Recommendation:** Port to React as environment variable

### React Day Selector Integration

```jsx
// app/src/islands/pages/HomePage.jsx (lines 443-475)
useEffect(() => {
    const mountPoint = document.createElement('div');
    mountPoint.id = 'home-schedule-selector-mount';

    const heroContent = document.querySelector('.hero-content');
    const exploreButton = document.querySelector('.hero-cta-button');

    if (heroContent && exploreButton) {
        heroContent.insertBefore(mountPoint, exploreButton);

        const root = createRoot(mountPoint);
        root.render(
            <SearchScheduleSelector
                onSelectionChange={(days) => {
                    setSelectedDays(days.map(d => d.index));
                }}
            />
        );
    }
}, []);
```

**Purpose:** Mount shared day selector component
**Approach:** React Portal-like pattern
**Benefit:** Component reuse across pages

---

**Report End**

For questions or clarification, contact the development team.
