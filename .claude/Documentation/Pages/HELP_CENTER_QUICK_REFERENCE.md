# Help Center Page - Quick Reference

**GENERATED**: 2025-12-11
**PAGE_URL**: `/help-center` (hub), `/help-center/{category}` (category), `/help-center-articles/{category}/{slug}.html` (articles)
**ENTRY_POINTS**: `app/src/help-center.jsx`, `app/src/help-center-category.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
Help Center System
    |
    +-- React Pages (Dynamic Hub & Category)
    |       |
    |       +-- help-center.jsx (Entry Point)
    |       |       +-- HelpCenterPage.jsx
    |       |               +-- Search functionality
    |       |               +-- Category grid display
    |       |               +-- Inquiry modal (Slack via Cloudflare)
    |       |
    |       +-- help-center-category.jsx (Entry Point)
    |               +-- HelpCenterCategoryPage.jsx
    |                       +-- URL-based category detection
    |                       +-- Article list sections
    |                       +-- Info boxes (context-aware)
    |
    +-- Static HTML Articles (SEO-Optimized)
            +-- /help-center-articles/guests/
            +-- /help-center-articles/hosts/
            +-- /help-center-articles/about/
            +-- /help-center-articles/knowledge-base/
            +-- Shared CSS & JS infrastructure
```

---

## ### FILE_INVENTORY ###

### Entry Points
| File | Purpose |
|------|---------|
| `app/src/help-center.jsx` | Mounts HelpCenterPage to #help-center-page |
| `app/src/help-center-category.jsx` | Mounts HelpCenterCategoryPage to #help-center-category-page |

### React Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/HelpCenterPage.jsx` | Main help center hub with search and categories |
| `app/src/islands/pages/HelpCenterCategoryPage.jsx` | Category view with article listings |

### Data Module
| File | Purpose |
|------|---------|
| `app/src/data/helpCenterData.js` | Categories, articles, sections, search function |

### Services
| File | Purpose |
|------|---------|
| `app/src/lib/slackService.js` | sendFaqInquiry() - Cloudflare Pages Function proxy |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/help-center.css` | React Help Center page styling (~775 lines) |
| `app/src/styles/faq.css` | Inquiry modal styling (shared with FAQ page) |
| `app/public/help-center-articles/css/style.css` | Static article page styling |

### Static Articles Infrastructure
| File | Purpose |
|------|---------|
| `app/public/help-center-articles/js/split-lease-nav.js` | Navigation, dropdowns, mobile menu |
| `app/public/help-center-articles/css/split-lease-header-footer.css` | Header/footer consistency |

### HTML Entry Pages
| File | Purpose |
|------|---------|
| `app/public/help-center.html` | React hub page mount point |
| `app/public/help-center-category.html` | React category page mount point |
| `app/public/help-center-articles/index.html` | Static knowledge base index |

---

## ### URL_ROUTING ###

### React Pages (Dynamic)
```
/help-center                          # Main hub page
/help-center/{category}               # Category page (guests, hosts, about, etc.)
```

### Static Articles (SEO)
```
/help-center-articles/{category}/{section}/{slug}.html    # Individual article
/help-center-articles/guests/getting-started/what-is-split-lease.html
/help-center-articles/hosts/legal/tax-benefits.html
/help-center-articles/knowledge-base/airbnb-vs-split-lease.html
```

### Special Redirects
```javascript
// In HelpCenterPage.jsx - getCategoryHref()
if (cat.slug === 'guests') return 'https://split.lease/faq?section=travelers';
if (cat.slug === 'hosts') return '/faq?section=hosts';
return `/help-center/${cat.slug}`;
```

---

## ### COMPONENT_ANALYSIS ###

### HelpCenterPage.jsx

#### Imports
```javascript
import { useState, useEffect } from 'react';
import { User, Users, Info, LifeBuoy, BookOpen, FileText, Search, HelpCircle, ChevronRight, ArrowRight } from 'lucide-react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { helpCenterCategories, searchHelpCenter } from '../../data/helpCenterData.js';
import { sendFaqInquiry } from '../../lib/slackService.js';
import '../../styles/help-center.css';
import '../../styles/faq.css';
```

#### State Management
| State Variable | Type | Purpose |
|----------------|------|---------|
| `searchQuery` | string | Current search input value |
| `searchResults` | array | Filtered articles matching query |
| `isSearching` | boolean | Whether search mode is active (query >= 2 chars) |
| `showInquiryModal` | boolean | Inquiry modal visibility |
| `inquiryForm` | object | `{ name, email, inquiry }` form values |
| `submitting` | boolean | Form submission in progress |
| `submitSuccess` | boolean | Submission completed successfully |
| `submitError` | string/null | Error message if submission failed |

#### Icon Map
```javascript
const iconMap = {
  User,      // For Guests category
  Users,     // For Hosts category
  Info,      // About Split Lease category
  LifeBuoy,  // Support category
  BookOpen   // Knowledge Base category
};
```

#### Key Functions
| Function | Purpose |
|----------|---------|
| `handleSearch(e)` | Updates searchQuery state from input |
| `handleKeyPress(e)` | Handles Enter key (currently no-op, search is reactive) |
| `handleInquirySubmit(e)` | Validates and submits inquiry via sendFaqInquiry() |
| `handleFormChange(field, value)` | Updates inquiryForm state |
| `openInquiryModal(e)` | Opens modal, resets states |
| `closeInquiryModal()` | Closes modal, clears form |
| `getCategoryHref(cat)` | Returns category URL with FAQ redirects for guests/hosts |

---

### HelpCenterCategoryPage.jsx

#### Imports
```javascript
import { useState, useEffect } from 'react';
import { User, Users, Info, LifeBuoy, BookOpen, ArrowRight, ArrowLeft, ChevronRight, MessageCircle, Heart, DollarSign, HelpCircle } from 'lucide-react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { helpCenterArticles, getCategoryBySlug } from '../../data/helpCenterData.js';
import '../../styles/help-center.css';
```

#### State Management
| State Variable | Type | Purpose |
|----------------|------|---------|
| `category` | object/null | Category metadata from getCategoryBySlug() |
| `articles` | object/null | Category articles from helpCenterArticles |
| `loading` | boolean | Initial load state |

#### Icon Map (Extended)
```javascript
const iconMap = {
  User,
  Users,
  Info,
  LifeBuoy,
  BookOpen,
  MessageCircle,  // Contact info box
  Heart,          // Mission info box
  DollarSign      // Tax benefits info box
};
```

#### URL Detection Logic
```javascript
useEffect(() => {
  const path = window.location.pathname;
  const pathParts = path.split('/').filter(Boolean);

  let categorySlug = null;

  // /help-center/{category}
  if (pathParts.length >= 2 && pathParts[0] === 'help-center') {
    categorySlug = pathParts[1];
  }
  // /{category} direct access
  else if (pathParts.length === 1) {
    categorySlug = pathParts[0];
  }

  if (categorySlug) {
    const categoryData = getCategoryBySlug(categorySlug);
    const articlesData = helpCenterArticles[categorySlug];
    if (categoryData && articlesData) {
      setCategory(categoryData);
      setArticles(articlesData);
    }
  }
  setLoading(false);
}, []);
```

---

## ### DATA_STRUCTURE ###

### helpCenterCategories (Array)
```javascript
{
  id: 'guests',
  title: 'For Guests',
  description: 'Complete guide for finding spaces, booking, pricing...',
  icon: 'User',           // Lucide icon name
  articleCount: 25,       // Display count
  slug: 'guests'          // URL segment
}
```

### helpCenterArticles (Object)
```javascript
{
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
            slug: 'getting-started/what-is-split-lease',
            external: null  // Optional external URL
          }
        ]
      }
    ],
    infoBoxes: [...]  // Optional category-specific info boxes
  }
}
```

### Categories
| ID | Title | Article Count | Icon |
|----|-------|---------------|------|
| `guests` | For Guests | 25 | User |
| `hosts` | For Hosts | 20 | Users |
| `about` | About Split Lease | 7 | Info |
| `support` | Support | 2 | LifeBuoy |
| `knowledge-base` | Knowledge Base | 15 | BookOpen |

---

## ### SEARCH_FUNCTIONALITY ###

### Search Implementation
```javascript
// In helpCenterData.js
export function searchHelpCenter(query) {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const results = [];

  Object.entries(helpCenterArticles).forEach(([categoryId, category]) => {
    category.sections.forEach(section => {
      section.articles.forEach(article => {
        const titleMatch = article.title.toLowerCase().includes(normalizedQuery);
        if (titleMatch) {
          results.push({
            ...article,
            categoryId,
            categoryTitle: category.title,
            sectionTitle: section.title
          });
        }
      });
    });
  });

  return results;
}
```

### Search UI States
| State | Condition | Display |
|-------|-----------|---------|
| Idle | `searchQuery.length < 2` | Category grid |
| Searching | `searchQuery.length >= 2` | Search results list |
| No Results | Results empty | "No results found" message with Search icon |

### Search Results Display
```jsx
<ul className="hc-article-list">
  {searchResults.map((article) => (
    <li key={article.id} className="hc-article-list-item">
      <a href={`/help-center-articles/${article.categoryId}/${article.slug}.html`}>
        <ArrowRight />
        <div>
          <strong>{article.title}</strong>
          <span>{article.categoryTitle} > {article.sectionTitle}</span>
        </div>
      </a>
    </li>
  ))}
</ul>
```

---

## ### INQUIRY_MODAL ###

### Form Fields
| Field | Type | Validation |
|-------|------|------------|
| `name` | text | Required |
| `email` | email | Required, `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `inquiry` | textarea | Required |

### API Integration
```javascript
// Uses Cloudflare Pages Function (NOT Supabase Edge Function)
// Reason: Supabase secrets bug (GitHub issue #38329)
import { sendFaqInquiry } from '../../lib/slackService.js';

await sendFaqInquiry({ name, email, inquiry });
// Endpoint: POST /api/faq-inquiry
```

### States
| State | Variable | Display |
|-------|----------|---------|
| Form | `!submitSuccess` | Input form with name, email, inquiry |
| Submitting | `submitting` | "Sending..." button (disabled) |
| Success | `submitSuccess` | Checkmark icon + "Thank you!" message |
| Error | `submitError` | Error message in `.error-message-form` |

### Auto-Close Behavior
```javascript
// On success, modal closes after 2 seconds
setTimeout(() => {
  setShowInquiryModal(false);
  setSubmitSuccess(false);
}, 2000);
```

---

## ### STATIC_ARTICLES_STRUCTURE ###

### Article Directory Tree
```
/help-center-articles/
    +-- css/
    |   +-- style.css
    |   +-- split-lease-header-footer.css
    +-- js/
    |   +-- split-lease-nav.js
    +-- about/
    |   +-- what-is-split-lease.html
    +-- guests/
    |   +-- getting-started/             # 6 articles
    |   +-- before-booking/              # 7 articles
    |   +-- trial-nights/                # 4 articles
    |   +-- booking/                     # 5 articles
    |   +-- pricing/                     # 2 articles
    |   +-- during-stay/                 # 3 articles
    +-- hosts/
    |   +-- getting-started/             # 4 articles
    |   +-- listing/                     # 5 articles
    |   +-- legal/                       # 4 articles
    |   +-- managing/                    # 4 articles
    |   +-- management/                  # 3 articles
    +-- knowledge-base/                  # 15+ blog-style articles
    +-- index.html                       # Knowledge base landing
```

---

## ### CSS_CLASSES ###

### React Help Center (hc- prefix)
| Class | Purpose |
|-------|---------|
| `.hc-search-banner` | Purple header with search input |
| `.hc-container` | Max-width 900px centered container |
| `.hc-categories-grid` | Responsive category card grid |
| `.hc-category-card` | Individual category card with hover |
| `.hc-category-card-icon` | 40x40px gradient icon container |
| `.hc-category-card-meta` | Article count with FileText icon |
| `.hc-search-input-wrapper` | Search input with icon |
| `.hc-search-results` | Search results container |
| `.hc-search-results-header` | Results count header |
| `.hc-no-results` | Empty search state |
| `.hc-article-list` | Article listing ul |
| `.hc-article-list-item` | Article link with hover slide |
| `.hc-article-section` | Category page section container |
| `.hc-article-header` | Category page title with icon |
| `.hc-info-box` | Info/success callout box |
| `.hc-info-box.info` | Purple info variant |
| `.hc-info-box.success` | Green success variant |
| `.hc-breadcrumb` | Breadcrumb navigation |
| `.hc-back-link` | Back navigation link |
| `.hc-loading` | Loading spinner state |
| `.hc-page-content` | Top spacing for fixed header |
| `.hc-text-muted` | Secondary text color |

---

## ### CSS_VARIABLES ###

### React Help Center
```css
:root {
  --hc-brand-primary: #31135d;
  --hc-brand-primary-dark: #1e0a37;
  --hc-brand-primary-light: #4a1f8f;

  --hc-success-bg: #E8F5E9;
  --hc-success-border: #4CAF50;
  --hc-success-text: #2E7D32;

  --hc-info-bg: #F3E5F5;
  --hc-info-border: #31135d;
  --hc-info-text: #31135d;

  --hc-text-primary: #2C2C2C;
  --hc-text-secondary: #666666;
  --hc-text-tertiary: #999999;

  --hc-bg-light-gray: #F5F5F5;
  --hc-bg-hover: #F9F9F9;
  --hc-border-light: #E0E0E0;

  --hc-shadow-hover: 0 8px 20px rgba(49,19,93,0.15);
  --hc-radius-sm: 6px;
  --hc-radius-md: 8px;
  --hc-radius-lg: 12px;

  --hc-transition-base: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## ### ICON_SYSTEM ###

### React Pages (Lucide React)
```javascript
import {
  User, Users, Info, LifeBuoy, BookOpen,  // Category icons
  FileText,                                 // Article count meta
  Search, HelpCircle,                       // Search/fallback
  ChevronRight, ArrowRight, ArrowLeft,      // Navigation
  MessageCircle, Heart, DollarSign          // Info box icons
} from 'lucide-react';

// Dynamic icon rendering via iconMap
const Icon = iconMap[category.icon] || HelpCircle;
<Icon />
```

### Static Articles (Feather Icons)
```html
<script src="https://unpkg.com/feather-icons"></script>
<i data-feather="chevron-right"></i>
<i data-feather="check-circle"></i>
<script>feather.replace();</script>
```

---

## ### RESPONSIVE_BREAKPOINTS ###

### React Help Center
| Breakpoint | Categories Grid | Container Padding | Banner Padding |
|------------|-----------------|-------------------|----------------|
| `< 768px` | 1 column (auto-fit) | 16px | 32px 16px 40px |
| `768px - 1023px` | 2 columns | 24px | 40px 16px 48px |
| `>= 1024px` | 3 columns | 32px | 40px 16px 48px |

### Category Page Layout
| Breakpoint | Article Layout | Sidebar |
|------------|----------------|---------|
| `< 1024px` | Single column | Below content |
| `>= 1024px` | Two-column (1fr 280px) | Sticky (top: 100px) |

---

## ### CONDITIONAL_INFO_BOXES ###

```jsx
// Guest/Host pages get support contact box
{(category.slug === 'guests' || category.slug === 'hosts') && (
  <div className="hc-info-box success" style={{ marginTop: '48px' }}>
    <div className="hc-info-box-icon">
      <MessageCircle />
    </div>
    <div className="hc-info-box-content">
      <p><strong>Need more help?</strong></p>
      <p>Our support team is here to help. Contact us via live chat or email at <a href="mailto:support@split.lease">support@split.lease</a></p>
    </div>
  </div>
)}

// Host pages get tax benefits info
{category.slug === 'hosts' && (
  <div className="hc-info-box info" style={{ marginTop: '24px' }}>
    <div className="hc-info-box-icon">
      <DollarSign />
    </div>
    <div className="hc-info-box-content">
      <p><strong>Did you know? Hosting with Split Lease can offer tax benefits</strong></p>
      <p>By hosting periodic tenancy guests, you generate passive income which may be federally non-taxable. Learn more at <a href="https://www.split.lease/why-host-with-us" target="_blank" rel="noopener noreferrer">split.lease/why-host-with-us</a></p>
    </div>
  </div>
)}

// About page uses infoBoxes from data
{articles.infoBoxes?.map((box, index) => (
  <div key={index} className={`hc-info-box ${box.type}`}>
    <BoxIcon />
    <p><strong>{box.title}</strong></p>
    {box.content.split('\n').map((line, i) => (
      <p key={i}>{line}</p>
    ))}
  </div>
))}
```

---

## ### ARTICLE_SECTIONS_BY_CATEGORY ###

### Guest Article Sections
| Section | Articles | Topics |
|---------|----------|--------|
| Getting Started | 6 | What is Split Lease, who benefits, how to start, hybrid worker info, vs Airbnb |
| Before You Book | 7 | Market report, customize space, contact host, express interest, storage, host verification |
| Trial Nights | 4 | Who benefits, how it works, why trial, key benefits |
| Booking Process | 5 | Best price, approval time, timeline, periodic tenancy, guarantee |
| Pricing & Payments | 2 | Saving money, credit card approval |
| During Your Stay | 3 | Self-cleaning, cancellation, expectations |

### Host Article Sections
| Section | Articles | Topics |
|---------|----------|--------|
| Getting Started with Split Lease | 4 | Listing costs, host fees, rental license, advantages |
| Listing Your Space | 5 | Multiple properties, live-in listing, public info, storage, deposit |
| Legal, Taxes & Agreements | 4 | Legal responsibilities, tax benefits, lease agreements, tenant rights |
| Managing Bookings & Guests | 4 | See renters, notifications, verify traveler, payments |
| Listing Management | 3 | Update listing, visibility, cancellation policy |

### Knowledge Base Sections
| Section | Articles | Focus |
|---------|----------|-------|
| Airbnb vs. Split Lease | 3 | Platform comparison articles |
| Hybrid Work & Commuting | 3 | Commuting tips, remote work |
| Success Stories | 2 | Customer testimonials |
| Family & Lifestyle | 2 | Family scenarios, safety |
| Platform Insights | 1 | iOS app info |
| Legal & Rental Fees | 2 | Fee explanations |

### About Sections
| Section | Articles |
|---------|----------|
| About Us | 1 (What is Split Lease) |
| Blog Posts | 6 (external links to knowledge-base) |

### Support Sections
| Section | Articles |
|---------|----------|
| Policies & Legal | 2 (Terms of Use - external, Privacy Policy - external) |

---

## ### KEY_IMPORTS ###

```javascript
// Entry Point
import { createRoot } from 'react-dom/client';
import HelpCenterPage from './islands/pages/HelpCenterPage.jsx';
import HelpCenterCategoryPage from './islands/pages/HelpCenterCategoryPage.jsx';

// Page Components
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { helpCenterCategories, helpCenterArticles,
         searchHelpCenter, getCategoryBySlug } from '../../data/helpCenterData.js';
import { sendFaqInquiry } from '../../lib/slackService.js';

// Icons
import { User, Users, Info, LifeBuoy, BookOpen, FileText, Search,
         HelpCircle, ChevronRight, ArrowRight, ArrowLeft,
         MessageCircle, Heart, DollarSign } from 'lucide-react';

// Styles
import '../../styles/help-center.css';
import '../../styles/faq.css';
```

---

## ### HELPER_FUNCTIONS ###

### getCategoryBySlug (helpCenterData.js)
```javascript
export function getCategoryBySlug(slug) {
  return helpCenterCategories.find(cat => cat.slug === slug) || null;
}
```

### getArticlesByCategory (helpCenterData.js)
```javascript
export function getArticlesByCategory(categoryId) {
  return helpCenterArticles[categoryId] || null;
}
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Category not loading | Verify URL format `/help-center/{slug}` matches category slug |
| Search not working | Query must be >= 2 characters |
| Static articles 404 | Check `/help-center-articles/{path}` exists |
| Inquiry form failing | Verify `/api/faq-inquiry` Cloudflare function deployed |
| Icons not rendering | Ensure lucide-react imported correctly |
| Guest/Host cards redirect to FAQ | This is intentional - check getCategoryHref() |
| Info boxes missing | Check category.slug matches 'guests'/'hosts'/'about' |
| Breadcrumb incorrect | Verify article HTML href paths |
| Sidebar not sticky | Check viewport >= 1024px |

---

## ### EXTERNAL_DEPENDENCIES ###

| Dependency | Version | Purpose |
|------------|---------|---------|
| Lucide React | (via npm) | React page icons |
| Feather Icons | Latest (CDN) | Static article icons |
| Google Fonts | DM Sans, Lato, Martel | Typography |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Source CLAUDE.md | `app/src/CLAUDE.md` |
| Islands CLAUDE.md | `app/src/islands/CLAUDE.md` |
| Pages CLAUDE.md | `app/src/islands/pages/CLAUDE.md` |
| Data CLAUDE.md | `app/src/data/CLAUDE.md` |
| Styles CLAUDE.md | `app/src/styles/CLAUDE.md` |
| Help Articles CLAUDE.md | `app/public/help-center-articles/CLAUDE.md` |
| FAQ Page | `app/src/islands/pages/FAQPage.jsx` |
| Slack Service | `app/src/lib/slackService.js` |
| faq-inquiry API | `app/functions/api/faq-inquiry.js` (Cloudflare Pages Function) |

---

**VERSION**: 2.0
**LAST_UPDATED**: 2025-12-11
**STATUS**: Updated to reflect current implementation (Slack service, modal states, data exports)
