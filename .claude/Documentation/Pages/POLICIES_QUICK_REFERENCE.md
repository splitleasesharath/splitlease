# Policies Page - Quick Reference

**GENERATED**: 2026-01-20
**PAGE_URL**: `/policies.html#{policy-slug}`
**ENTRY_POINT**: `app/src/policies.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
policies.jsx (Entry Point)
    |
    +-- PoliciesPage.jsx (Functional Component - 241 lines)
            |
            +-- Internal State Management
            |       +-- policies (array of policy documents)
            |       +-- currentPolicy (selected policy)
            |       +-- loading/error states
            |       +-- showBackToTop (scroll visibility)
            |
            +-- Data Fetching
            |       +-- Supabase query to zat_policiesdocuments
            |       +-- transformSupabaseDocument() data mapper
            |
            +-- Hash Navigation
            |       +-- URL hash sync (#policy-slug)
            |       +-- Hash change listener
            |
            +-- UI Components
                +-- Header.jsx (Site navigation)
                +-- Sidebar Navigation (Contents menu)
                +-- Main Content Area
                |       +-- Policy title + download link
                |       +-- PDF iframe viewer
                +-- Back to Top Button
                +-- Footer.jsx (Site footer)
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/policies.jsx` | Mounts PoliciesPage to #policies-page |

### Page Component
| File | Purpose |
|------|---------|
| `app/src/islands/pages/PoliciesPage.jsx` | Main functional component (241 lines) |

### Shared Components (Imported)
| File | Purpose |
|------|---------|
| `app/src/islands/shared/Header.jsx` | Site navigation header |
| `app/src/islands/shared/Footer.jsx` | Site footer |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/components/policies.css` | Complete page styling (237 lines) |
| `app/src/styles/main.css` | Imports policies.css via @import |

### HTML Template
| File | Purpose |
|------|---------|
| `app/public/policies.html` | Static HTML entry with #policies-page mount point |

---

## ### URL_ROUTING ###

```
/policies.html                          # Default loads first policy
/policies.html#terms-of-service         # Direct link to Terms of Service
/policies.html#privacy-policy           # Direct link to Privacy Policy
/policies.html#cancellation-policy      # Direct link to Cancellation Policy
```

### Hash Navigation
```javascript
// Get current policy from URL hash
const hash = window.location.hash.substring(1)
const policy = policies.find(p => p.slug === hash)

// Update URL when policy selected
window.location.hash = policy.slug
```

### Hash Change Listener
```javascript
// Listens for browser back/forward navigation
useEffect(() => {
  function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash && policies.length > 0) {
      const policy = policies.find(p => p.slug === hash);
      if (policy) {
        setCurrentPolicy(policy);
      }
    }
  }

  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, [policies]);
```

---

## ### DATABASE_TABLE ###

### Table: `zat_policiesdocuments`

| Field | Type | Description |
|-------|------|-------------|
| `_id` | UUID | Primary key |
| `Name` | Text | Policy document name (e.g., "Terms of Service") |
| `Slug` | Text | URL-friendly identifier |
| `Type` | Text | Document type (default: 'policy') |
| `PDF Version` | URL | Link to PDF file |
| `Active` | Boolean | Whether policy is visible on page |
| `visible on logged out?` | Boolean | Visibility for logged-out users |
| `Created Date` | Timestamp | Document creation date |
| `Modified Date` | Timestamp | Last modification date |
| `Created By` | UUID | FK to user who created document |

### Supabase Query
```javascript
const { data, error } = await supabase
  .from('zat_policiesdocuments')
  .select('*')
  .eq('Active', true)
  .order('Name', { ascending: true });
```

---

## ### DATA_TRANSFORMATION ###

### transformSupabaseDocument()
```javascript
function transformSupabaseDocument(supabaseDoc) {
  return {
    id: supabaseDoc._id,
    name: supabaseDoc.Name,
    slug: supabaseDoc.Slug || generateSlug(supabaseDoc.Name),
    type: supabaseDoc.Type || 'policy',
    pdfUrl: supabaseDoc['PDF Version'],
    visible_on_policies_page: supabaseDoc.Active,
    visible_on_logged_out: supabaseDoc['visible on logged out?'],
    createdDate: supabaseDoc['Created Date'],
    modifiedDate: supabaseDoc['Modified Date'],
    createdBy: supabaseDoc['Created By']
  };
}
```

### generateSlug()
```javascript
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

---

## ### STATE_MANAGEMENT ###

### Component State
| State Variable | Type | Initial | Purpose |
|----------------|------|---------|---------|
| `policies` | Array | `[]` | All active policy documents |
| `currentPolicy` | Object | `null` | Currently selected/displayed policy |
| `loading` | Boolean | `true` | Loading state for initial fetch |
| `error` | String | `null` | Error message if fetch fails |
| `showBackToTop` | Boolean | `false` | Back to top button visibility |

### State Flow
```
1. Component mounts
2. Fetch policies from Supabase (loading=true)
3. Transform data with transformSupabaseDocument()
4. Check URL hash for specific policy
5. If hash exists and matches a policy -> setCurrentPolicy(matching policy)
6. Else if no hash -> setCurrentPolicy(first policy), set hash
7. loading=false
8. User clicks sidebar -> handlePolicyClick()
9. Hash change -> listener updates currentPolicy
```

---

## ### USEEFFECT_HOOKS ###

### 1. Fetch Policies (Mount)
```javascript
useEffect(() => {
  async function fetchPolicies() {
    try {
      setLoading(true);
      console.log('Fetching policies from Supabase...');

      const { data, error } = await supabase
        .from('zat_policiesdocuments')
        .select('*')
        .eq('Active', true)
        .order('Name', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched policies:', data);
      const transformedPolicies = data.map(transformSupabaseDocument);
      setPolicies(transformedPolicies);

      // Load policy based on URL hash or default to first
      const hash = window.location.hash.substring(1);
      if (hash) {
        const policy = transformedPolicies.find(p => p.slug === hash);
        if (policy) {
          setCurrentPolicy(policy);
          return;
        }
      }

      // Load first policy by default ONLY if no hash was provided
      if (!hash && transformedPolicies.length > 0) {
        setCurrentPolicy(transformedPolicies[0]);
        window.location.hash = transformedPolicies[0].slug;
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError('Failed to load policies. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  fetchPolicies();
}, []);
```

### 2. Hash Change Listener
```javascript
useEffect(() => {
  function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash && policies.length > 0) {
      const policy = policies.find(p => p.slug === hash);
      if (policy) {
        setCurrentPolicy(policy);
      }
    }
  }

  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, [policies]);
```

### 3. Scroll Handler (Back to Top)
```javascript
useEffect(() => {
  function handleScroll() {
    setShowBackToTop(window.pageYOffset > 300);
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

### 4. Document Title Update
```javascript
useEffect(() => {
  if (currentPolicy) {
    document.title = `${currentPolicy.name} | Split Lease`;
  }
}, [currentPolicy]);
```

---

## ### EVENT_HANDLERS ###

### handlePolicyClick()
```javascript
const handlePolicyClick = (policy) => {
  setCurrentPolicy(policy);
  window.location.hash = policy.slug;

  // Only scroll if the document header is not visible
  const header = document.querySelector('.policies-content-header');
  if (header) {
    const rect = header.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.top < window.innerHeight;
    if (!isVisible) {
      header.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};
```

### scrollToTop()
```javascript
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};
```

---

## ### COMPONENT_STRUCTURE ###

### Page Layout
```
+------------------------------------------------------------------+
| HEADER (Site Navigation)                                         |
+------------------------------------------------------------------+
| POLICIES PAGE CONTAINER (margin-top: header-height, padding: 40px)|
|                                                                   |
| +------------------+  +----------------------------------------+ |
| | SIDEBAR (25%)    |  | MAIN CONTENT (70%)                     | |
| | +-------------+  |  | +------------------------------------+ | |
| | | Contents    |  |  | | CONTENT HEADER                     | | |
| | | ----------- |  |  | | Title (centered)  [Download Icon]  | | |
| | | > Policy 1  |  |  | +------------------------------------+ | |
| | |   Policy 2  |  |  |                                        | |
| | |   Policy 3  |  |  | +------------------------------------+ | |
| | |   ...       |  |  | | PDF CONTAINER (95% width)          | | |
| | +-------------+  |  | |                                    | | |
| | (sticky)         |  | | [iframe - 700px height]            | | |
| |                  |  | |                                    | | |
| +------------------+  | |                                    | | |
|                       | +------------------------------------+ | |
|                       +----------------------------------------+ |
|                                                                   |
| +--------------------------------------------------------------+ |
| | BACK TO TOP BUTTON (visible when scrollY > 300)              | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
| FOOTER                                                           |
+------------------------------------------------------------------+
```

### JSX Structure
```jsx
<>
  <Header />

  <div className="policies-page-container">
    <div className="policies-content-wrapper">

      {/* Sidebar Navigation */}
      <aside className="policies-sidebar">
        <h2 className="policies-sidebar-title">Contents</h2>
        <nav className="policies-sidebar-nav">
          {policies.map((policy) => (
            <a
              key={policy.id}
              href={`#${policy.slug}`}
              className={`policies-nav-item ${
                currentPolicy?.slug === policy.slug ? 'active' : ''
              }`}
              onClick={(e) => {
                e.preventDefault();
                handlePolicyClick(policy);
              }}
            >
              {policy.name}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <section className="policies-main-content">
        <div className="policies-content-header">
          <h1 className="policies-page-title">
            {currentPolicy?.name || 'Policy Document'}
          </h1>
          {currentPolicy?.pdfUrl && (
            <a
              href={currentPolicy.pdfUrl}
              className="policies-download-link"
              download={`${currentPolicy.slug}.pdf`}
              title="Download PDF"
            >
              <i className="fa fa-download"></i>
            </a>
          )}
        </div>

        <div className="policies-pdf-container">
          {currentPolicy?.pdfUrl ? (
            <iframe
              src={currentPolicy.pdfUrl}
              width="100%"
              height="700px"
              frameBorder="0"
              title={`${currentPolicy.name} - Policy Document Viewer`}
            />
          ) : (
            <div className="policies-loading">No policy selected</div>
          )}
        </div>
      </section>
    </div>

    {/* Back to Top Button */}
    <button
      className={`policies-back-to-top ${showBackToTop ? 'visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Back to top"
    >
      <i className="fa fa-chevron-up"></i>
      <span>Back to Top</span>
    </button>
  </div>

  <Footer />
</>
```

---

## ### CSS_CLASS_INVENTORY ###

### Layout Classes
| Class | Purpose | Key Styles |
|-------|---------|------------|
| `.policies-page-container` | Page container | `flex column`, `min-height: 100vh`, `margin-top: var(--header-height, 70px)` |
| `.policies-content-wrapper` | Two-column wrapper | `flex row`, `width: 80%`, `gap: 40px`, `padding: 0 24px` |

### Sidebar Classes
| Class | Purpose | Key Styles |
|-------|---------|------------|
| `.policies-sidebar` | Sidebar container | `width: 25%`, `position: sticky`, `top: calc(var(--header-height, 70px) + 30px)`, `border: 1px solid var(--border-color)` |
| `.policies-sidebar-title` | "Contents" heading | `font-size: 24px`, `font-weight: 700`, `border-bottom: 2px solid` |
| `.policies-sidebar-nav` | Navigation container | `flex column` |
| `.policies-nav-item` | Nav link default | `font-size: 18px`, `color: #868E96`, `padding: 12.5px 0`, `letter-spacing: -1px` |
| `.policies-nav-item:hover` | Nav link hover | `color: var(--primary-purple, #4A2B6B)` |
| `.policies-nav-item.active` | Nav link active | `color: var(--primary-purple, #4A2B6B)`, `font-weight: 600`, `text-decoration: underline` |

### Main Content Classes
| Class | Purpose | Key Styles |
|-------|---------|------------|
| `.policies-main-content` | Main content area | `width: 70%`, `padding: 40px`, `border: 1px solid var(--border-color)` |
| `.policies-content-header` | Title + download row | `flex space-between`, `margin-bottom: 30px` |
| `.policies-page-title` | Policy title | `font-size: 36px`, `text-align: center`, `flex: 1` |
| `.policies-download-link` | PDF download icon | `font-size: 24px`, `color: var(--primary-purple, #4A2B6B)`, `padding: 12px` |
| `.policies-pdf-container` | PDF viewer wrapper | `width: 95%`, `margin: 0 auto`, `box-shadow`, `border-radius: var(--rounded-md)` |

### Utility Classes
| Class | Purpose | Key Styles |
|-------|---------|------------|
| `.policies-back-to-top` | Back to top button | `opacity: 0`, `visibility: hidden`, `margin: 40px auto` |
| `.policies-back-to-top.visible` | Visible state | `opacity: 1`, `visibility: visible` |
| `.policies-loading` | Loading state | `min-height: 400px`, `flex center`, `color: var(--text-gray)` |
| `.policies-error` | Error state | `color: var(--error, #EF4444)`, `text-align: center`, `padding: 40px` |

---

## ### RESPONSIVE_BREAKPOINTS ###

### 1200px (Large Tablets)
```css
@media (max-width: 1200px) {
  .policies-content-wrapper {
    width: 85%;
  }
}
```

### 900px (Tablets - Stacked Layout)
```css
@media (max-width: 900px) {
  .policies-content-wrapper {
    flex-direction: column;
    width: 95%;
    gap: 24px;
  }

  .policies-sidebar {
    position: static;
    width: 100%;
    margin-bottom: 24px;
  }

  .policies-main-content {
    width: 100%;
  }

  .policies-page-title {
    font-size: 28px;
  }

  .policies-pdf-container iframe {
    height: 600px;
  }
}
```

### 480px (Mobile)
```css
@media (max-width: 480px) {
  .policies-main-content {
    padding: 24px;
  }

  .policies-page-title {
    font-size: 24px;
  }

  .policies-sidebar-title {
    font-size: 20px;
  }

  .policies-nav-item {
    font-size: 16px;
  }
}
```

---

## ### LOADING_ERROR_STATES ###

### Loading State
```jsx
if (loading) {
  return (
    <div className="policies-page-container">
      <div className="policies-content-wrapper">
        <div className="policies-loading">Loading policies...</div>
      </div>
    </div>
  );
}
```

### Error State
```jsx
if (error) {
  return (
    <div className="policies-page-container">
      <div className="policies-content-wrapper">
        <div className="policies-error">{error}</div>
      </div>
    </div>
  );
}
```

### Empty Policy State
```jsx
{currentPolicy?.pdfUrl ? (
  <iframe ... />
) : (
  <div className="policies-loading">No policy selected</div>
)}
```

---

## ### KEY_IMPORTS ###

```javascript
// React hooks
import { useState, useEffect } from 'react';

// Shared components
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';

// Supabase client
import { supabase } from '../../lib/supabase.js';
```

---

## ### EXTERNAL_DEPENDENCIES ###

### Font Awesome Icons (via CDN)
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

### Icons Used
| Icon | Usage |
|------|-------|
| `fa fa-download` | PDF download link |
| `fa fa-chevron-up` | Back to top button |

---

## ### DATA_DEPENDENCIES ###

### Supabase Tables
- `zat_policiesdocuments` - Policy document metadata and PDF URLs

### Key Document Fields Used
| Field | UI Location |
|-------|-------------|
| `Name` | Sidebar nav items, page title |
| `Slug` | URL hash, sidebar links |
| `PDF Version` | iframe src, download link href |
| `Active` | Filter query (only show active) |

---

## ### ACCESSIBILITY ###

| Feature | Implementation |
|---------|----------------|
| Semantic HTML | `<aside>`, `<nav>`, `<section>`, `<button>` |
| ARIA Labels | `aria-label="Back to top"` on button |
| Keyboard Navigation | Native anchor navigation via `href` |
| Focus States | CSS transitions on `:hover` |
| Dynamic Title | `document.title` updates with policy name |
| Smooth Scroll | `scrollIntoView({ behavior: 'smooth' })` |
| Iframe Title | Descriptive `title` attribute for screen readers |

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Policies not loading | Verify Supabase connection, check RLS policies |
| PDF not displaying | Check `PDF Version` URL validity in database |
| Hash navigation broken | Verify `Slug` field is populated |
| Sidebar not sticky | Check viewport height, header offset calculation |
| Back to top not showing | Check scroll position > 300px |
| Download not working | Verify PDF URL is accessible (CORS) |
| Wrong policy on load | Check URL hash matches a slug |
| Styles not applied | Verify `@import url('components/policies.css')` in main.css |

---

## ### COMPARISON_TO_HOLLOW_PATTERN ###

**Note**: Unlike `GuestProposalsPage.jsx` which uses the Hollow Component Pattern with `useGuestProposalsPageLogic.js`, `PoliciesPage.jsx` is a **simpler functional component** with:

- All logic defined inline (no separate hook file)
- Direct Supabase queries in `useEffect`
- No complex state machines or workflows
- Simpler data transformation (just `transformSupabaseDocument`)

This is appropriate given the page's simpler requirements:
- Read-only data display
- No user authentication required
- No form submissions
- No complex business rules

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Pages CLAUDE.md | `app/src/islands/pages/CLAUDE.md` |
| Styles CLAUDE.md | `app/src/styles/components/CLAUDE.md` |
| Database Tables | `Documentation/Database/DATABASE_TABLES_DETAILED.md` |
| CSS Variables | `app/src/styles/variables.css` |
| Supabase Client | `app/src/lib/supabase.js` |

---

**VERSION**: 1.1
**LAST_UPDATED**: 2026-01-20
**STATUS**: Updated to match current implementation
