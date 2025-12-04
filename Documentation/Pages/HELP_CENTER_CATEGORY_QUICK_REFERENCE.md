# Help Center Category Page - Quick Reference

**GENERATED**: 2025-12-04
**PAGE_URL**: `/help-center/{category}` (e.g., `/help-center/guests`, `/help-center/hosts`)
**ENTRY_POINT**: `app/src/help-center-category.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
help-center-category.jsx (Entry Point)
    |
    +-- HelpCenterCategoryPage.jsx (Self-Contained Component)
            |
            +-- URL Parsing (window.location.pathname)
            |       +-- Extract category slug from path
            |       +-- Format: /help-center/{category}
            |
            +-- Data Loading
            |       +-- getCategoryBySlug(slug)
            |       +-- helpCenterArticles[categorySlug]
            |
            +-- UI Components
                +-- Header.jsx (Site navigation)
                +-- Breadcrumb Navigation
                +-- Article Header (Icon + Title + Description)
                +-- Section List
                |       +-- Section Title (h2)
                |       +-- Article List Items (ul/li)
                |           +-- Internal Links ’ /help-center-articles/{category}/{slug}.html
                |           +-- External Links ’ target="_blank"
                +-- Info Boxes (conditional)
                |       +-- Category-specific infoBoxes from data
                |       +-- Support contact box (guests/hosts only)
                |       +-- Tax benefits box (hosts only)
                +-- Footer.jsx
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/help-center-category.jsx` | Mounts HelpCenterCategoryPage to #help-center-category-page |

### HTML Template
| File | Purpose |
|------|---------|
| `app/public/help-center-category.html` | HTML shell with #help-center-category-page container |

### Page Component
| File | Purpose |
|------|---------|
| `app/src/islands/pages/HelpCenterCategoryPage.jsx` | Main page component (self-contained, no hook) |

### Data Source
| File | Purpose |
|------|---------|
| `app/src/data/helpCenterData.js` | Static content data, categories, articles, helper functions |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/help-center.css` | Complete Help Center styling (~775 lines) |

### Related Pages
| File | Purpose |
|------|---------|
| `app/src/islands/pages/HelpCenterPage.jsx` | Hub page with search and category cards |
| `app/src/help-center.jsx` | Hub page entry point |

### Static Article Files
| Directory | Purpose |
|-----------|---------|
| `app/public/help-center-articles/` | Static HTML article files organized by category |
| `app/public/help-center-articles/guests/` | Guest articles (25+ articles across 6 sections) |
| `app/public/help-center-articles/hosts/` | Host articles (20 articles across 5 sections) |
| `app/public/help-center-articles/knowledge-base/` | Knowledge base articles (15+ articles) |
| `app/public/help-center-articles/about/` | About Split Lease articles |

---

## ### URL_ROUTING ###

### Route Configuration (`routes.config.js`)
```javascript
{
  path: '/help-center/:category',
  file: 'help-center-category.html',
  protected: false,
  cloudflareInternal: true,
  internalName: 'help-center-category-view',
  hasDynamicSegment: true,
  skipFileExtensionCheck: true // Clean URLs without .html
}
```

### URL Patterns
```
/help-center/guests         # For Guests category
/help-center/hosts          # For Hosts category
/help-center/about          # About Split Lease category
/help-center/support        # Support category
/help-center/knowledge-base # Knowledge Base category
```

### Cloudflare Redirect (`_redirects`)
```
/help-center/*  /_internal/help-center-category-view  200
```

### URL Parsing Logic (in component)
```javascript
useEffect(() => {
  const path = window.location.pathname;
  const pathParts = path.split('/').filter(Boolean);

  // Expected: /help-center/{category}
  let categorySlug = null;

  if (pathParts.length >= 2 && pathParts[0] === 'help-center') {
    categorySlug = pathParts[1];
  } else if (pathParts.length === 1) {
    categorySlug = pathParts[0]; // Direct access like /guests
  }

  // Load data
  const categoryData = getCategoryBySlug(categorySlug);
  const articlesData = helpCenterArticles[categorySlug];
}, []);
```

---

## ### DATA_STRUCTURE ###

### Categories Array (`helpCenterCategories`)
```javascript
{
  id: 'guests',           // Unique identifier
  title: 'For Guests',    // Display title
  description: 'Complete guide for finding spaces...',
  icon: 'User',           // Lucide icon name
  articleCount: 25,       // Total articles in category
  slug: 'guests'          // URL slug
}
```

### 5 Main Categories
| Slug | Title | Icon | Articles |
|------|-------|------|----------|
| `guests` | For Guests | User | 25 |
| `hosts` | For Hosts | Users | 20 |
| `about` | About Split Lease | Info | 7 |
| `support` | Support | LifeBuoy | 2 |
| `knowledge-base` | Knowledge Base | BookOpen | 15 |

### Articles Object (`helpCenterArticles`)
```javascript
helpCenterArticles = {
  guests: {
    title: 'For Guests',
    description: '...',
    icon: 'User',
    sections: [
      {
        title: 'Getting Started',
        articles: [
          {
            id: 'what-is-split-lease',
            title: 'What is Split Lease and what do you do?',
            slug: 'getting-started/what-is-split-lease'
          },
          // ... more articles
        ]
      },
      // ... more sections
    ]
  },
  hosts: { /* ... */ },
  about: {
    /* ... */
    infoBoxes: [  // Special for 'about' category
      {
        type: 'success',
        icon: 'Heart',
        title: 'Our Mission',
        content: '...'
      }
    ]
  },
  // ...
}
```

### Article Object Structure
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Display title |
| `slug` | string | URL path (e.g., `getting-started/what-is-split-lease`) |
| `external` | string? | Optional external URL (opens in new tab) |

---

## ### GUESTS_CATEGORY_SECTIONS ###

| Section | Articles |
|---------|----------|
| Getting Started | 6 articles (what-is, who-benefits, how-to-get-started, etc.) |
| Before You Book | 7 articles (market-report, customize-space, contact-host, etc.) |
| Trial Nights | 4 articles (who-benefits, how-it-works, why-trial, key-benefits) |
| Booking Process | 5 articles (best-price, approval-time, booking-timeline, etc.) |
| Pricing & Payments | 2 articles (save-money, credit-card-approval) |
| During Your Stay | 3 articles (self-cleaning, cancel-stay, not-meeting-expectations) |

---

## ### HOSTS_CATEGORY_SECTIONS ###

| Section | Articles |
|---------|----------|
| Getting Started with Split Lease | 4 articles (listing-costs, host-fees, rental-license, advantages) |
| Listing Your Space | 5 articles (multiple-properties, live-in-listing, public-information, etc.) |
| Legal, Taxes & Agreements | 4 articles (legal-responsibilities, tax-benefits, lease-agreements, tenant-rights) |
| Managing Bookings & Guests | 4 articles (see-renters, notifications, verify-traveler, payments) |
| Listing Management | 3 articles (update-listing, listing-visibility, cancellation-policy) |

---

## ### ICON_MAPPING ###

```javascript
const iconMap = {
  User,          // For Guests
  Users,         // For Hosts
  Info,          // About Split Lease
  LifeBuoy,      // Support
  BookOpen,      // Knowledge Base
  MessageCircle, // Contact/Support boxes
  Heart,         // Mission info box
  DollarSign     // Tax benefits info box
};

// Usage: const Icon = iconMap[articles.icon] || HelpCircle;
```

### Lucide Icons Used
| Import | Usage |
|--------|-------|
| `User` | Guests category |
| `Users` | Hosts category |
| `Info` | About category |
| `LifeBuoy` | Support category |
| `BookOpen` | Knowledge Base category |
| `ArrowRight` | Article list item arrows |
| `ArrowLeft` | Back link |
| `ChevronRight` | Breadcrumb separator |
| `MessageCircle` | Support contact box |
| `Heart` | Mission info box |
| `DollarSign` | Tax benefits info box |
| `HelpCircle` | Fallback icon |

---

## ### COMPONENT_STATES ###

### Loading State
```jsx
<div className="hc-loading">
  <div className="spinner"></div>
  <p>Loading...</p>
</div>
```

### Not Found State
```jsx
<main className="hc-container" style={{ padding: '80px 16px', textAlign: 'center' }}>
  <h1>Category Not Found</h1>
  <p>The category you're looking for doesn't exist.</p>
  <a href="/help-center" className="hc-back-link">
    <ArrowLeft />
    Back to Help Center
  </a>
</main>
```

### Success State
- Breadcrumb navigation
- Article header with icon
- Sections with article lists
- Conditional info boxes

---

## ### ARTICLE_LINK_PATTERNS ###

### Internal Article Link
```jsx
<a href={`/help-center-articles/${category.slug}/${article.slug}.html`}>
  <ArrowRight />
  {article.title}
</a>
// Example: /help-center-articles/guests/getting-started/what-is-split-lease.html
```

### External Article Link
```jsx
{article.external ? (
  <a href={article.external} target="_blank" rel="noopener noreferrer">
    <ArrowRight />
    {article.title}
  </a>
) : (
  // Internal link...
)}
```

---

## ### CONDITIONAL_INFO_BOXES ###

### Category-Specific Info Boxes (from data)
```jsx
{articles.infoBoxes && articles.infoBoxes.map((box, index) => {
  const BoxIcon = iconMap[box.icon] || HelpCircle;
  return (
    <div className={`hc-info-box ${box.type}`}>
      <div className="hc-info-box-icon"><BoxIcon /></div>
      <div className="hc-info-box-content">
        <p><strong>{box.title}</strong></p>
        {box.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
      </div>
    </div>
  );
})}
```

### Support Contact Box (guests/hosts only)
```jsx
{(category.slug === 'guests' || category.slug === 'hosts') && (
  <div className="hc-info-box success">
    <div className="hc-info-box-icon"><MessageCircle /></div>
    <div className="hc-info-box-content">
      <p><strong>Need more help?</strong></p>
      <p>Contact us via live chat or email at <a href="mailto:support@split.lease">support@split.lease</a></p>
    </div>
  </div>
)}
```

### Tax Benefits Box (hosts only)
```jsx
{category.slug === 'hosts' && (
  <div className="hc-info-box info">
    <div className="hc-info-box-icon"><DollarSign /></div>
    <div className="hc-info-box-content">
      <p><strong>Did you know? Hosting with Split Lease can offer tax benefits</strong></p>
      <p>By hosting periodic tenancy guests, you generate passive income which may be federally non-taxable.</p>
    </div>
  </div>
)}
```

---

## ### CSS_VARIABLES ###

```css
:root {
  /* Brand Colors */
  --hc-brand-primary: #31135d;
  --hc-brand-primary-dark: #1e0a37;
  --hc-brand-primary-light: #4a1f8f;

  /* Status Colors */
  --hc-success-bg: #E8F5E9;
  --hc-success-border: #4CAF50;
  --hc-success-text: #2E7D32;

  --hc-info-bg: #F3E5F5;
  --hc-info-border: #31135d;
  --hc-info-text: #31135d;

  /* Text Colors */
  --hc-text-primary: #2C2C2C;
  --hc-text-secondary: #666666;
  --hc-text-tertiary: #999999;

  /* Background Colors */
  --hc-bg-light-gray: #F5F5F5;
  --hc-bg-hover: #F9F9F9;

  /* Borders */
  --hc-border-light: #E0E0E0;

  /* Effects */
  --hc-shadow-hover: 0 8px 20px rgba(49,19,93,0.15);
  --hc-radius-sm: 6px;
  --hc-radius-md: 8px;
  --hc-radius-lg: 12px;
  --hc-transition-base: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## ### CSS_CLASS_REFERENCE ###

### Layout Classes
| Class | Purpose |
|-------|---------|
| `.hc-container` | Max-width 900px centered container |
| `.hc-page-content` | Adds padding-top for fixed header (70px) |

### Breadcrumb Classes
| Class | Purpose |
|-------|---------|
| `.hc-breadcrumb` | Flex container with 8px gap |
| `.hc-breadcrumb a` | Gray links with hover to purple |
| `.hc-breadcrumb .current` | Bold current page text |

### Article Header Classes
| Class | Purpose |
|-------|---------|
| `.hc-article-header` | Bottom border, margin bottom 32px |
| `.hc-article-header h1` | Purple title with icon, clamp(26-36px) |
| `.hc-article-header h1 svg` | 32x32px icon beside title |
| `.hc-text-muted` | Secondary color description |

### Article List Classes
| Class | Purpose |
|-------|---------|
| `.hc-article-section` | Section wrapper, margin-bottom 48px |
| `.hc-article-section h2` | Purple title, bottom border |
| `.hc-article-list` | No list style, no padding |
| `.hc-article-list-item` | Bottom border separator |
| `.hc-article-list-item a` | Flex, 16px padding, hover slide effect |
| `.hc-article-list-item svg` | Purple arrow, 18x18px |

### Info Box Classes
| Class | Purpose |
|-------|---------|
| `.hc-info-box` | Flex container, left border, padding 16px |
| `.hc-info-box.info` | Purple theme (--hc-info-*) |
| `.hc-info-box.success` | Green theme (--hc-success-*) |
| `.hc-info-box-icon` | 20x20px flex-shrink-0 |
| `.hc-info-box-content` | Flex-1, 14px font size |

### State Classes
| Class | Purpose |
|-------|---------|
| `.hc-loading` | Centered spinner container |
| `.hc-loading .spinner` | Animated purple spinner |
| `.hc-back-link` | Purple inline-flex link with arrow |

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `< 768px` | Container padding 16px, search banner padding adjusts |
| `>= 768px` | Container padding 24px |
| `>= 1024px` | Container padding 32px, sidebar sticky positioning |

---

## ### HELPER_FUNCTIONS ###

### From helpCenterData.js

```javascript
// Get category metadata by slug
export function getCategoryBySlug(slug) {
  return helpCenterCategories.find(cat => cat.slug === slug) || null;
}

// Get articles for a category
export function getArticlesByCategory(categoryId) {
  return helpCenterArticles[categoryId] || null;
}

// Search all help center content
export function searchHelpCenter(query) {
  // Returns matching articles with categoryId, categoryTitle, sectionTitle
}
```

---

## ### KEY_IMPORTS ###

```javascript
// Entry Point
import { createRoot } from 'react-dom/client';
import HelpCenterCategoryPage from './islands/pages/HelpCenterCategoryPage.jsx';

// Page Component
import { useState, useEffect } from 'react';
import { User, Users, Info, LifeBuoy, BookOpen, ArrowRight, ArrowLeft,
         ChevronRight, MessageCircle, Heart, DollarSign, HelpCircle } from 'lucide-react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { helpCenterArticles, getCategoryBySlug } from '../../data/helpCenterData.js';
import '../../styles/help-center.css';
```

---

## ### RELATIONSHIP_TO_HELP_CENTER_HUB ###

### HelpCenterPage (Hub)
- URL: `/help-center`
- Features: Search bar, category cards grid, inquiry modal
- Links to: Category pages or FAQ page with section param

### HelpCenterCategoryPage (This Page)
- URL: `/help-center/{category}`
- Features: Category-specific article listing, info boxes
- Back link to: `/help-center` (Hub)
- Links to: Individual article HTML files

### Article Files (Static HTML)
- URL: `/help-center-articles/{category}/{section}/{slug}.html`
- Location: `app/public/help-center-articles/`
- Not React components, static HTML with shared CSS

---

## ### HUB_TO_CATEGORY_SPECIAL_ROUTING ###

In HelpCenterPage.jsx, some categories redirect elsewhere:
```javascript
const getCategoryHref = (cat) => {
  if (cat.slug === 'guests') return 'https://split.lease/faq?section=travelers';
  if (cat.slug === 'hosts') return '/faq?section=hosts';
  return `/help-center/${cat.slug}`;  // about, support, knowledge-base
};
```

Note: Guests and Hosts categories in hub redirect to FAQ page, but direct URL access to `/help-center/guests` still works.

---

## ### BUILD_CONFIGURATION ###

### Vite Config Entry
```javascript
'help-center-category': resolve(__dirname, 'public/help-center-category.html')
```

### Dev Server Routing
```javascript
// Special handling for help-center category routes
if (urlPath.startsWith('/help-center/') && !urlPath.includes('.')) {
  req.url = `${publicPrefix}/help-center-category.html${queryString}`;
}
```

### Static Articles Copy (Post-Build)
```javascript
// Copy help-center-articles directory to dist root
const articlesSource = path.resolve(__dirname, 'public/help-center-articles');
const articlesDest = path.join(distDir, 'help-center-articles');
```

---

## ### DATA_DEPENDENCIES ###

### From helpCenterData.js
- `helpCenterCategories` - Array of 5 category objects
- `helpCenterArticles` - Object with category slugs as keys

### No Database Dependencies
- All content is static JavaScript data
- No Supabase queries
- No API calls

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Category not found | Verify slug matches key in helpCenterArticles |
| Articles not showing | Check articles array in section data |
| Icon not rendering | Ensure icon name is in iconMap |
| External links not opening | Verify `external` property format |
| Styling broken | Check help-center.css import |
| 404 on direct access | Verify _redirects rule exists |
| Info boxes not showing | Check conditional slug matching |
| Breadcrumb missing | Ensure category and articles loaded |

---

## ### COMPONENT_PROPS ###

HelpCenterCategoryPage has no props (self-contained component):
- Reads URL from `window.location.pathname`
- Loads data from `helpCenterData.js`
- Manages internal state with `useState`

### Internal State
```javascript
const [category, setCategory] = useState(null);      // Category metadata
const [articles, setArticles] = useState(null);      // Articles for category
const [loading, setLoading] = useState(true);        // Loading state
```

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Data CLAUDE.md | `app/src/data/CLAUDE.md` |
| Pages CLAUDE.md | `app/src/islands/pages/CLAUDE.md` |
| Styles CLAUDE.md | `app/src/styles/CLAUDE.md` |
| Route Registry | `app/src/routes.config.js` |
| Routing Guide | `Documentation/ROUTING_GUIDE.md` |

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Comprehensive initial documentation
