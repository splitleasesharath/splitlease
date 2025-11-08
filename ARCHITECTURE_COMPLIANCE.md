# Architecture Compliance Checklist
## Migration Alignment with ESM + React Islands Architecture

This document ensures the migration plan complies with the strict architectural principles defined in `ARCHITECTURE_GUIDE_ESM+REACT_ISLAND.md`.

---

## Critical Compliance Rules

### ✅ ESM Module System
- **All imports MUST have explicit .js or .jsx extensions**
- **No CommonJS (require/module.exports)**
- **No barrel exports**
- **Import directly from source files**

**Migration Impact:**
```javascript
// ✅ CORRECT Migration Pattern
import Header from '../shared/Header.jsx';
import { supabase } from '../../lib/supabase.js';
import Button from '../shared/Button.jsx';

// ❌ FORBIDDEN - Will break in migration
import Header from '../shared/Header';
import { supabase } from '../../lib/supabase';
```

### ✅ React Islands Pattern
- **Static HTML shells in `app/public/`**
- **React components in `app/src/islands/`**
- **Mount islands using `createRoot` in inline `<script type="module">`**
- **No server-side rendering (yet)**

**Migration Impact:**
All three pages must follow this pattern:
```html
<!-- public/index.html -->
<div id="home-page"></div>

<script type="module">
  import { createRoot } from 'react-dom/client';
  import HomePage from '/src/islands/pages/HomePage.jsx';

  createRoot(document.getElementById('home-page'))
    .render(<HomePage />);
</script>
```

### ✅ Directory Structure
```
app/
├── src/
│   ├── islands/
│   │   ├── shared/          # Reusable components
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── DaySelector.jsx
│   │   │   └── Modal.jsx
│   │   └── pages/           # Page-specific islands
│   │       ├── HomePage.jsx
│   │       ├── SearchPage.jsx
│   │       └── ViewSplitLeasePage.jsx
│   ├── lib/                 # Utilities
│   │   ├── supabase.js
│   │   ├── constants.js
│   │   └── auth.js
│   └── styles/              # CSS
│       └── main.css
├── public/
│   ├── index.html
│   ├── search.html
│   ├── view-split-lease.html
│   └── assets/
└── vite.config.js
```

**Migration Impact:**
- ❌ No `src/islands/components/home/` subdirectories
- ✅ Only `src/islands/shared/` and `src/islands/pages/`
- ✅ Page-specific components go in the page island file itself

### ✅ No Fallback Mechanisms
From `CLAUDE.md` and `NO_FALLBACK_IMPLEMENTATION.md`:
- **No hardcoded sample data**
- **No placeholder fallbacks**
- **Fail gracefully with proper error messages**

**Migration Impact:**
```javascript
// ❌ FORBIDDEN
const listings = data || FALLBACK_LISTINGS;

// ✅ CORRECT
if (!data) {
  return <ErrorMessage>Unable to load listings</ErrorMessage>;
}
```

---

## Migration Plan Corrections

### Original Plan Issues
The original `MIGRATION_PLAN.md` violated several architecture principles:

1. **❌ Nested component directories**
   ```
   src/islands/components/home/Hero.jsx  # FORBIDDEN
   src/islands/components/search/FilterPanel.jsx  # FORBIDDEN
   ```

2. **❌ Missing .jsx extensions in examples**
   ```javascript
   import Header from '../shared/Header';  # FORBIDDEN
   ```

3. **❌ Suggested fallback patterns**
   ```javascript
   const images = property?.images || [];  # VIOLATES NO_FALLBACK rule
   ```

### Corrected Structure

#### ✅ Shared Components (src/islands/shared/)
These are the ONLY shared components allowed. Keep them minimal:

1. **Header.jsx** - Navigation header
2. **Footer.jsx** - Site footer
3. **Button.jsx** - Reusable button component
4. **DaySelector.jsx** - Day selection widget
5. **Modal.jsx** - Generic modal wrapper

#### ✅ Page Islands (src/islands/pages/)
All page-specific logic and components stay within the page island:

1. **HomePage.jsx** - Contains Hero, ValueProps, Schedule, Listings sections as internal components
2. **SearchPage.jsx** - Contains FilterPanel, ScheduleSelector, ListingCard as internal components
3. **ViewSplitLeasePage.jsx** - Contains ImageGallery, PropertyDetails, ContactHost as internal components

**Example of proper page island structure:**
```javascript
// src/islands/pages/HomePage.jsx
import { useState } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import DaySelector from '../shared/DaySelector.jsx';

// Internal components - NOT separate files
function Hero({ selectedDays, onDaysChange }) {
  return (
    <section className="hero-section">
      <h1>Ongoing Rentals for Repeat Stays</h1>
      <DaySelector
        selected={selectedDays}
        onChange={onDaysChange}
      />
    </section>
  );
}

function ValueProps() {
  return <section className="value-props">...</section>;
}

function ScheduleSection() {
  return <section className="schedule-section">...</section>;
}

// Main export - composes internal components
export default function HomePage() {
  const [selectedDays, setSelectedDays] = useState([1,2,3,4,5]);

  return (
    <>
      <Header />
      <Hero selectedDays={selectedDays} onDaysChange={setSelectedDays} />
      <ValueProps />
      <ScheduleSection />
      <Footer />
    </>
  );
}
```

---

## Revised Migration Checklist

### Phase 1: Foundation ✅
- [ ] Verify `package.json` has `"type": "module"`
- [ ] Verify all imports in existing files have `.js`/`.jsx` extensions
- [ ] Copy assets to `app/public/assets/`
- [ ] Extract CSS variables to `app/src/styles/main.css`

### Phase 2: Shared Components ✅
- [ ] Create `src/islands/shared/Header.jsx`
- [ ] Create `src/islands/shared/Footer.jsx`
- [ ] Create `src/islands/shared/Button.jsx`
- [ ] Create `src/islands/shared/DaySelector.jsx`
- [ ] Create `src/islands/shared/Modal.jsx`
- [ ] **Ensure all imports use .jsx extensions**

### Phase 3: Page Islands ✅
- [ ] Create `src/islands/pages/HomePage.jsx` with internal components
- [ ] Create `src/islands/pages/SearchPage.jsx` with internal components
- [ ] Create `src/islands/pages/ViewSplitLeasePage.jsx` with internal components
- [ ] **No separate component files for page-specific logic**
- [ ] **All imports use .jsx/.js extensions**

### Phase 4: HTML Entry Points ✅
- [ ] Update `public/index.html` with island mount pattern
- [ ] Update `public/search.html` with island mount pattern
- [ ] Update `public/view-split-lease.html` with island mount pattern
- [ ] **Verify script tags use `type="module"`**
- [ ] **Verify imports in inline scripts use /src/ paths**

### Phase 5: Utilities ✅
- [ ] Create `src/lib/supabase.js` with explicit .js extension
- [ ] Create `src/lib/auth.js` with explicit .js extension
- [ ] Create `src/lib/constants.js` with explicit .js extension
- [ ] **All lib files export with named exports**
- [ ] **All lib imports use .js extensions**

### Phase 6: Vite Configuration ✅
- [ ] Verify `vite.config.js` imports use .js extensions
- [ ] Add all three HTML entry points to rollupOptions.input
- [ ] Test build with `npm run build`
- [ ] Verify dist/ output structure

---

## File Extension Matrix

| Import Type | Extension | Example |
|-------------|-----------|---------|
| React component | `.jsx` | `import Header from './Header.jsx'` |
| Utility module | `.js` | `import { supabase } from './supabase.js'` |
| Constants module | `.js` | `import { API_URL } from './constants.js'` |
| External package | none | `import { createClient } from '@supabase/supabase-js'` |

---

## Component Reuse Pattern

### ❌ WRONG: Separate files for everything
```
src/islands/components/home/Hero.jsx
src/islands/components/home/ValueProps.jsx
src/islands/components/home/ScheduleSection.jsx
```

### ✅ CORRECT: Internal components in page island
```javascript
// src/islands/pages/HomePage.jsx
function Hero() { /* ... */ }
function ValueProps() { /* ... */ }
function ScheduleSection() { /* ... */ }

export default function HomePage() {
  return (
    <>
      <Hero />
      <ValueProps />
      <ScheduleSection />
    </>
  );
}
```

### ✅ CORRECT: Shared component used across multiple pages
```javascript
// src/islands/shared/DaySelector.jsx
export default function DaySelector({ selected, onChange }) {
  /* ... */
}

// Used in HomePage.jsx AND SearchPage.jsx
import DaySelector from '../shared/DaySelector.jsx';
```

---

## Import Path Reference

From any page island (`src/islands/pages/*.jsx`):
```javascript
// Shared components (up one, into shared/)
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';

// Utilities (up two, into lib/)
import { supabase } from '../../lib/supabase.js';
import { API_URL } from '../../lib/constants.js';

// External packages (no extension)
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
```

From a shared component (`src/islands/shared/*.jsx`):
```javascript
// Other shared components (same directory)
import Button from './Button.jsx';

// Utilities (up two, into lib/)
import { supabase } from '../../lib/supabase.js';

// External packages
import { useState } from 'react';
```

---

## Data Fetching Pattern

### ✅ CORRECT: No fallback, proper error handling
```javascript
export default function SearchPage() {
  const [listings, setListings] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadListings() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*');

        if (error) throw error;

        setListings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!listings || listings.length === 0) {
    return <EmptyState>No listings found</EmptyState>;
  }

  return <ListingsGrid listings={listings} />;
}
```

### ❌ FORBIDDEN: Fallback data
```javascript
const FALLBACK_LISTINGS = [/* hardcoded data */];
const listings = data || FALLBACK_LISTINGS;  // FORBIDDEN
```

---

## Vite Config Compliance

### ✅ CORRECT Configuration
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './public/index.html',
        search: './public/search.html',
        viewSplitLease: './public/view-split-lease.html'
      }
    }
  }
});
```

**Key points:**
- ✅ Uses `import` (ESM)
- ✅ Explicit .js extension on import
- ✅ Three entry points matching our pages
- ✅ outDir: 'dist'

---

## Final Validation Checklist

Before considering migration complete:

- [ ] Run `npm run build` successfully
- [ ] No "missing extension" errors in console
- [ ] All three pages render correctly
- [ ] No CommonJS syntax anywhere
- [ ] No barrel exports (index.js files)
- [ ] No fallback data or placeholder content
- [ ] All imports have explicit .js/.jsx extensions
- [ ] Directory structure matches architecture guide
- [ ] Only 5 shared components max
- [ ] Page-specific logic stays in page islands

---

**Last Updated:** 2025-11-08
**Compliance Status:** Ready for Migration
