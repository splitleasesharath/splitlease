# 404 Not Found Page - Quick Reference

**GENERATED**: 2026-01-20
**PAGE_URL**: `/404` or `/404.html` (also served for any non-existent route)
**ENTRY_POINT**: `app/src/404.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
404.html (Static HTML)
    |
    +-- 404.jsx (Entry Point)
            |
            +-- NotFoundPage.jsx (Simple Component)
                    |
                    +-- UI Components
                        +-- Header.jsx (Site navigation)
                        +-- Button.jsx (Action buttons)
                        |       +-- "Go Home" - Primary variant
                        |       +-- "Search Listings" - Outline variant
                        +-- Navigation Links
                        |       +-- FAQ link
                        |       +-- List With Us link
                        |       +-- Why Split Lease link
                        +-- Footer.jsx (Site footer)
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/404.jsx` | Mounts NotFoundPage to #not-found-page |

### HTML Template
| File | Purpose |
|------|---------|
| `app/public/404.html` | Static HTML entry with meta tags, noindex/nofollow |

### Page Component
| File | Purpose |
|------|---------|
| `app/src/islands/pages/NotFoundPage.jsx` | Main presentational component |

### Shared Components Used
| File | Purpose |
|------|---------|
| `app/src/islands/shared/Header.jsx` | Site header navigation |
| `app/src/islands/shared/Footer.jsx` | Site footer |
| `app/src/islands/shared/Button.jsx` | Primary and outline action buttons |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/components/not-found.css` | Complete page styling (176 lines) |

### Configuration
| File | Purpose |
|------|---------|
| `app/src/routes.config.js` | Route registry (path: `/404`) |
| `app/public/_redirects` | Cloudflare Pages routing rules (auto-generated) |

---

## ### URL_ROUTING ###

```
/404                    # Direct access to 404 page
/404.html               # Alias for direct access
/any-non-existent-url   # Auto-served by Cloudflare Pages
```

### Route Configuration (`routes.config.js`)
```javascript
{
  path: '/404',
  file: '404.html',
  aliases: ['/404.html'],
  protected: false,
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

### Cloudflare Native 404 Support
```
# From _redirects (auto-generated)
/404  /404.html  200
/404/  /404.html  200
/404.html  /404.html  200

# Note: Cloudflare Pages automatically serves /404.html for not found routes
# No explicit catch-all rule needed - native 404.html support handles this
```

---

## ### HTML_TEMPLATE_STRUCTURE ###

### Meta Tags (SEO)
| Tag | Value | Purpose |
|-----|-------|---------|
| `<title>` | Page Not Found - Split Lease | Browser tab title |
| `description` | The page you're looking for doesn't exist. | Meta description |
| `robots` | noindex, nofollow | Prevent search engine indexing |

### HTML Entry
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page Not Found - Split Lease</title>
  <meta name="description" content="The page you're looking for doesn't exist." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" type="image/png" href="/assets/images/split-lease-purple-circle.png" />
  <link rel="stylesheet" href="/src/styles/main.css" />

  <!-- Load environment config FIRST - required for Hotjar -->
  <script type="module" src="/src/lib/config.js"></script>
  <script type="module" src="/src/lib/hotjar.js"></script>
</head>
<body>
  <div id="not-found-page"></div>
  <script type="module" src="/src/404.jsx"></script>
</body>
</html>
```

---

## ### ENTRY_POINT ###

### 404.jsx
```javascript
import { createRoot } from 'react-dom/client';
import NotFoundPage from './islands/pages/NotFoundPage.jsx';
import './styles/main.css';

createRoot(document.getElementById('not-found-page')).render(<NotFoundPage />);
```

**Mount Target**: `#not-found-page`
**CSS Import**: `styles/main.css` (global styles)

---

## ### COMPONENT_STRUCTURE ###

### NotFoundPage.jsx
```jsx
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import Button from '../shared/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="page-container">
      <Header />

      <main className="not-found-container">
        <div className="not-found-content">
          {/* Large 404 number display */}
          <h1 className="not-found-title" aria-label="Error 404">404</h1>

          {/* Error heading */}
          <h2 className="not-found-heading">Page Not Found</h2>

          {/* Descriptive text */}
          <p className="not-found-text">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Primary action buttons */}
          <div className="not-found-actions">
            <Button
              variant="primary"
              size="large"
              onClick={() => window.location.href = '/'}
              aria-label="Return to homepage"
            >
              Go Home
            </Button>
            <Button
              variant="outline"
              size="large"
              onClick={() => window.location.href = '/search'}
              aria-label="Browse available listings"
            >
              Search Listings
            </Button>
          </div>

          {/* Helpful navigation links */}
          <nav className="not-found-links" aria-label="Additional navigation">
            <a href="/faq.html">FAQ</a>
            <span className="separator" aria-hidden="true">&#8226;</span>
            <a href="/list-with-us.html">List With Us</a>
            <span className="separator" aria-hidden="true">&#8226;</span>
            <a href="/why-split-lease.html">Why Split Lease</a>
          </nav>
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

---

## ### UI_LAYOUT ###

```
+-------------------------------------------------------------+
| HEADER (Site Navigation)                                    |
+-------------------------------------------------------------+
|                                                             |
|                                                             |
|                         404                                 |
|                   (Large purple number)                     |
|                                                             |
|                   Page Not Found                            |
|                   (Heading text)                            |
|                                                             |
|     The page you're looking for doesn't exist or            |
|                    has been moved.                          |
|                   (Description)                             |
|                                                             |
|          [Go Home]    [Search Listings]                     |
|          (Primary)       (Outline)                          |
|                                                             |
|           FAQ  *  List With Us  *  Why Split Lease          |
|                   (Navigation links)                        |
|                                                             |
+-------------------------------------------------------------+
| FOOTER (Site Footer)                                        |
+-------------------------------------------------------------+
```

---

## ### BUTTON_CONFIGURATION ###

### Primary Button: Go Home
| Prop | Value |
|------|-------|
| `variant` | `"primary"` |
| `size` | `"large"` |
| `onClick` | `() => window.location.href = '/'` |
| `aria-label` | `"Return to homepage"` |

### Secondary Button: Search Listings
| Prop | Value |
|------|-------|
| `variant` | `"outline"` |
| `size` | `"large"` |
| `onClick` | `() => window.location.href = '/search'` |
| `aria-label` | `"Browse available listings"` |

### Button Component Props Reference
```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';  // default: 'primary'
  size?: 'small' | 'medium' | 'large';                       // default: 'medium'
  loading?: boolean;                                          // default: false
  disabled?: boolean;                                         // default: false
  fullWidth?: boolean;                                        // default: false
  icon?: React.ReactElement;
  iconPosition?: 'left' | 'right';                           // default: 'left'
  onClick?: () => void;
  className?: string;                                         // default: ''
  type?: 'button' | 'submit' | 'reset';                      // default: 'button'
}
```

---

## ### CSS_CLASSES ###

### Container Classes
| Class | Purpose | Key Styles |
|-------|---------|------------|
| `.not-found-container` | Main container | min-height calc, flex center, purple gradient bg |
| `.not-found-content` | Content wrapper | max-width 600px, text-center, fadeInUp animation |

### Typography Classes
| Class | Purpose | Key Styles |
|-------|---------|------------|
| `.not-found-title` | "404" number | 120px font, bold, purple color, 0.9 opacity |
| `.not-found-heading` | "Page Not Found" | var(--text-3xl), 600 weight |
| `.not-found-text` | Description paragraph | var(--text-lg), medium gray, 1.6 line-height |

### Action Classes
| Class | Purpose | Key Styles |
|-------|---------|------------|
| `.not-found-actions` | Button container | flex row, gap, center, wrap |
| `.not-found-links` | Nav links container | flex row, gap, center, var(--text-sm) |
| `.not-found-links a` | Individual links | purple color, 500 weight, no decoration |
| `.not-found-links .separator` | Bullet separator | light gray, user-select: none |

---

## ### CSS_VARIABLES_USED ###

### Colors
| Variable | Usage |
|----------|-------|
| `--primary-purple` | 404 title color, link colors |
| `--text-dark` | Heading color |
| `--text-medium` | Description text |
| `--text-light-gray` | Separator bullets |

### Spacing
| Variable | Usage |
|----------|-------|
| `--spacing-lg` | Container padding, title margin-bottom |
| `--spacing-md` | Heading margin-bottom |
| `--spacing-2xl` | Container padding, description/actions margin |
| `--spacing-3xl` | Container top/bottom padding |
| `--gap-md` | Button gap, links gap |
| `--gap-sm` | Tablet/mobile button and links gap |

### Typography
| Variable | Usage |
|----------|-------|
| `--text-3xl` | Heading font-size (desktop) |
| `--text-2xl` | Heading font-size (tablet) |
| `--text-xl` | Heading font-size (mobile) |
| `--text-lg` | Description font-size (desktop) |
| `--text-base` | Description font-size (tablet) |
| `--text-sm` | Links font-size (desktop) |
| `--text-xs` | Links font-size (mobile) |

### Border Radius
| Variable | Usage |
|----------|-------|
| `--rounded-sm` | Focus outline border-radius |

---

## ### ANIMATION ###

### fadeInUp Animation
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.not-found-content {
  animation: fadeInUp 0.6s ease-out;
}
```

**Duration**: 0.6 seconds
**Easing**: ease-out
**Applied to**: `.not-found-content`

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `<= 768px` (Tablet) | Container padding reduced, 404 title 80px, heading --text-2xl, text --text-base, buttons stack vertically full-width, links wrap with --gap-sm |
| `<= 480px` (Mobile) | 404 title 64px, heading --text-xl, links --text-xs |

### Tablet Styles (max-width: 768px)
```css
.not-found-container {
  padding: var(--spacing-2xl) var(--spacing-md);
}

.not-found-title {
  font-size: 80px;
}

.not-found-heading {
  font-size: var(--text-2xl);
}

.not-found-text {
  font-size: var(--text-base);
}

.not-found-actions {
  flex-direction: column;
  width: 100%;
  gap: var(--gap-sm);
}

.not-found-actions button {
  width: 100%;
  justify-content: center;
}

.not-found-links {
  flex-wrap: wrap;
  gap: var(--gap-sm);
}
```

### Mobile Styles (max-width: 480px)
```css
.not-found-title {
  font-size: 64px;
}

.not-found-heading {
  font-size: var(--text-xl);
}

.not-found-links {
  font-size: var(--text-xs);
}
```

---

## ### ACCESSIBILITY ###

### ARIA Attributes
| Element | Attribute | Value |
|---------|-----------|-------|
| `<h1>` (404 title) | `aria-label` | "Error 404" |
| `<nav>` (links) | `aria-label` | "Additional navigation" |
| Go Home button | `aria-label` | "Return to homepage" |
| Search button | `aria-label` | "Browse available listings" |
| `.separator` spans | `aria-hidden` | "true" |

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  .not-found-content {
    animation: none;
  }
}
```

### High Contrast Support
```css
@media (prefers-contrast: high) {
  .not-found-title {
    opacity: 1;
  }
}
```

### Focus Styles
```css
.not-found-links a:focus-visible {
  outline: 2px solid var(--primary-purple);
  outline-offset: 4px;
  border-radius: var(--rounded-sm);
}
```

---

## ### VITE_BUILD_CONFIG ###

### Rollup Input
```javascript
// vite.config.js
build: {
  rollupOptions: {
    input: {
      '404': resolve(__dirname, 'public/404.html'),
      // ... other pages
    }
  }
}
```

### Build Output
After build, `404.html` is placed in `dist/` root for Cloudflare Pages native 404 support.

---

## ### CLOUDFLARE_PAGES_BEHAVIOR ###

### How 404 is Served
1. User visits non-existent URL (e.g., `/random-page`)
2. Cloudflare checks `_redirects` file - no match found
3. Cloudflare automatically serves `404.html` from dist root
4. React app mounts and displays NotFoundPage

### Direct 404 Access
1. User visits `/404` or `/404.html`
2. Cloudflare matches `_redirects` rule: `/404  /404.html  200`
3. Returns 200 status (not 404) for direct access

---

## ### KEY_IMPORTS ###

```javascript
// Entry point
import { createRoot } from 'react-dom/client';
import NotFoundPage from './islands/pages/NotFoundPage.jsx';

// Component dependencies
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import Button from '../shared/Button.jsx';
```

---

## ### NAVIGATION_FLOW ###

### From 404 Page
| Action | Destination |
|--------|-------------|
| Go Home button | `/` (Homepage) |
| Search Listings button | `/search` (Search page) |
| FAQ link | `/faq.html` |
| List With Us link | `/list-with-us.html` |
| Why Split Lease link | `/why-split-lease.html` |
| Header navigation | Various site pages |
| Footer navigation | Various site pages |

### Navigation Method
All navigation uses `window.location.href` for full page navigation (not React Router):
```javascript
onClick={() => window.location.href = '/'}
onClick={() => window.location.href = '/search'}
```

---

## ### DESIGN_SPECIFICATIONS ###

### Background Gradient
```css
background: linear-gradient(
  135deg,
  rgba(49, 19, 93, 0.02) 0%,      /* primary-purple with 2% opacity */
  rgba(140, 104, 238, 0.05) 100%  /* accent-purple with 5% opacity */
);
```

### 404 Title Typography
| Property | Value |
|----------|-------|
| Font Size | 120px (desktop) / 80px (tablet) / 64px (mobile) |
| Font Weight | 700 |
| Color | var(--primary-purple) |
| Opacity | 0.9 |
| Letter Spacing | -0.02em |
| Line Height | 1 |

### Content Container
| Property | Value |
|----------|-------|
| Max Width | 600px |
| Text Align | center |
| Animation | fadeInUp 0.6s ease-out |

### Description Text
| Property | Value |
|----------|-------|
| Max Width | 480px |
| Line Height | 1.6 |
| Margin | auto (centered) |

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| 404 page not showing for invalid routes | Verify `404.html` exists in `dist/` root after build |
| Styling broken | Check `main.css` import in 404.jsx |
| Buttons not working | Verify `window.location.href` navigation |
| Animation not playing | Check `prefers-reduced-motion` setting |
| Header/Footer missing | Verify imports in NotFoundPage.jsx |
| Page shows 404 status on direct access | Expected - Cloudflare serves with 200 for direct `/404` access |
| Hotjar not loading | Verify config.js loads before hotjar.js |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Styles CLAUDE.md | `app/src/styles/CLAUDE.md` |
| Islands Pages CLAUDE.md | `app/src/islands/pages/CLAUDE.md` |
| Route Registry | `app/src/routes.config.js` |
| Cloudflare Redirects | `app/public/_redirects` |
| CSS Variables | `app/src/styles/variables.css` |
| Button Component | `app/src/islands/shared/Button.jsx` |
| Vite Config | `app/vite.config.js` |

---

## ### COMPARISON_WITH_OTHER_ERROR_PAGES ###

The 404 page follows the same architectural pattern as other simple static pages in the application:

| Pattern | 404 Page | Other Static Pages |
|---------|----------|-------------------|
| Entry Point | Single JSX file | Single JSX file |
| Component | No business logic hook | Varies (some use hooks) |
| Layout | Header + Main + Footer | Same structure |
| CSS | Dedicated component CSS | Dedicated component CSS |
| Navigation | window.location.href | Mix of methods |

---

**VERSION**: 1.1
**LAST_UPDATED**: 2026-01-20
**STATUS**: Complete documentation updated to match current implementation
