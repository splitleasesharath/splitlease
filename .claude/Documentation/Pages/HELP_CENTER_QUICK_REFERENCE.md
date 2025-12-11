# Help Center Page - Quick Reference

**GENERATED**: 2025-12-04
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
    |       |               +-- Inquiry modal (FAQ API)
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

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/help-center.css` | React Help Center page styling (~775 lines) |
| `app/public/help-center-articles/css/style.css` | Static article page styling (~1467 lines) |

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
/help-center-category?category=slug   # Alternative category URL pattern
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
// In HelpCenterPage.jsx
if (cat.slug === 'guests') return 'https://split.lease/faq?section=travelers';
if (cat.slug === 'hosts') return '/faq?section=hosts';
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
| No Results | Results empty | "No results found" message |

---

## ### INQUIRY_MODAL ###

### Form Fields
| Field | Type | Validation |
|-------|------|------------|
| `name` | text | Required |
| `email` | email | Required, RFC 5322 regex |
| `inquiry` | textarea | Required |

### API Endpoint
```javascript
fetch('/api/faq-inquiry', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, inquiry })
});
```

### States
| State | Variable | Display |
|-------|----------|---------|
| Form | `!submitSuccess` | Input form |
| Submitting | `submitting` | "Sending..." button |
| Success | `submitSuccess` | Checkmark + thank you |
| Error | `submitError` | Error message |

---

## ### STATIC_ARTICLES_STRUCTURE ###

### Article Directory Tree
```
/help-center-articles/
    +-- css/
    |   +-- style.css                    # Main stylesheet
    |   +-- split-lease-header-footer.css
    +-- js/
    |   +-- split-lease-nav.js           # Navigation JS
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

### Article HTML Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="stylesheet" href="/help-center-articles/css/style.css">
    <script src="https://unpkg.com/feather-icons"></script>
</head>
<body>
    <!-- Fixed Split Lease Header -->
    <header class="sl-main-header">...</header>

    <!-- Breadcrumb -->
    <div class="container">
        <div class="breadcrumb">
            <a href="/help-center">All Collections</a>
            <i data-feather="chevron-right"></i>
            <a href="/help-center/guests">For Guests</a>
            <i data-feather="chevron-right"></i>
            <span class="current">Article Title</span>
        </div>
    </div>

    <!-- Two-Column Layout -->
    <main class="container-narrow">
        <div class="article-layout">
            <article class="article-content">
                <div class="article-header"><h1>Title</h1></div>
                <div class="article-body">Content...</div>
                <section class="feedback-section">...</section>
            </article>
            <aside class="article-sidebar">
                <nav class="sidebar-nav">...</nav>
            </aside>
        </div>
    </main>

    <!-- Footer -->
    <footer class="main-footer">...</footer>

    <script src="/help-center-articles/js/split-lease-nav.js"></script>
    <script>feather.replace();</script>
</body>
</html>
```

---

## ### CSS_CLASSES ###

### React Help Center (hc- prefix)
| Class | Purpose |
|-------|---------|
| `.hc-search-banner` | Purple header with search input |
| `.hc-container` | Max-width 900px centered container |
| `.hc-categories-grid` | 2-3 column category card grid |
| `.hc-category-card` | Individual category card |
| `.hc-category-card-icon` | 40x40px purple gradient icon |
| `.hc-search-input` | Search input with icon |
| `.hc-search-results` | Search results container |
| `.hc-article-list` | Article listing ul |
| `.hc-article-list-item` | Article link with hover |
| `.hc-info-box` | Info/success callout box |
| `.hc-breadcrumb` | Breadcrumb navigation |
| `.hc-back-link` | Back navigation link |
| `.hc-loading` | Loading spinner state |

### Static Articles (no prefix)
| Class | Purpose |
|-------|---------|
| `.sl-main-header` | Fixed site header (matches React) |
| `.sl-nav-container` | Header navigation wrapper |
| `.sl-nav-dropdown` | Dropdown menu container |
| `.sl-hamburger` | Mobile menu toggle |
| `.container` | 1200px max-width |
| `.container-narrow` | 900px max-width |
| `.article-layout` | Two-column grid (1fr 280px) |
| `.article-content` | Main article area |
| `.article-sidebar` | Sticky sidebar (top: 100px) |
| `.sidebar-nav` | Related articles navigation |
| `.info-box.success` | Green success callout |
| `.info-box.info` | Purple info callout |
| `.feedback-section` | Emoji feedback buttons |
| `.breadcrumb` | Hierarchical navigation |

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
  --hc-info-bg: #F3E5F5;
  --hc-info-border: #31135d;
  --hc-text-primary: #2C2C2C;
  --hc-text-secondary: #666666;
  --hc-border-light: #E0E0E0;
  --hc-radius-md: 8px;
  --hc-transition-base: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Static Articles
```css
:root {
  --brand-primary: #31135d;
  --brand-white: #ffffff;
  --success-bg: #E8F5E9;
  --info-bg: #F3E5F5;
  --text-primary: #2C2C2C;
  --border-light: #E0E0E0;
  --shadow-hover: 0 8px 20px rgba(49,19,93,0.15);
  --radius-lg: 12px;
  --transition-base: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## ### ICON_SYSTEM ###

### React Pages (Lucide React)
```javascript
import { User, Users, Info, LifeBuoy, BookOpen, Search, HelpCircle,
         ChevronRight, ArrowRight, ArrowLeft, MessageCircle, Heart,
         DollarSign, FileText } from 'lucide-react';

const iconMap = {
  User, Users, Info, LifeBuoy, BookOpen, MessageCircle, Heart, DollarSign
};

// Dynamic icon rendering
const Icon = iconMap[category.icon] || HelpCircle;
<Icon />
```

### Static Articles (Feather Icons)
```html
<script src="https://unpkg.com/feather-icons"></script>
<i data-feather="chevron-right"></i>
<i data-feather="check-circle"></i>
<i data-feather="info"></i>
<i data-feather="heart"></i>
<i data-feather="message-circle"></i>
<script>feather.replace();</script>
```

---

## ### RESPONSIVE_BREAKPOINTS ###

### React Help Center
| Breakpoint | Categories Grid | Container Padding |
|------------|-----------------|-------------------|
| `< 768px` | 1 column | 16px |
| `768px - 1023px` | 2 columns | 24px |
| `>= 1024px` | 3 columns | 32px |

### Static Articles
| Breakpoint | Article Layout | Header Behavior |
|------------|----------------|-----------------|
| `< 768px` | Single column, sidebar below | Hamburger menu |
| `>= 768px` | Sidebar visible | Desktop dropdowns |
| `>= 1024px` | Two-column (1fr 280px) | Full nav |
| `>= 1440px` | Max-width 1280px | Full nav |

---

## ### NAVIGATION_PATTERNS ###

### Header Structure (Static Articles)
```html
<header class="sl-main-header">
    <nav class="sl-nav-container">
        <div class="sl-nav-left">
            <a href="/" class="sl-logo">...</a>
        </div>
        <button class="sl-hamburger">...</button>
        <div class="sl-nav-center">
            <div class="sl-nav-dropdown">Host with Us</div>
            <div class="sl-nav-dropdown">Stay with Us</div>
        </div>
        <div class="sl-nav-right">
            <a href="/search" class="sl-explore-btn">Explore Rentals</a>
            <a href="/" class="sl-nav-link">Sign In</a>
        </div>
    </nav>
</header>
```

### Mobile Menu Toggle
```javascript
function toggleMobileMenu() {
    document.getElementById('navCenter').classList.toggle('mobile-active');
    document.getElementById('navRight').classList.toggle('mobile-active');
}
```

### Dropdown Behavior
- **Desktop**: Hover to open, click-outside to close
- **Mobile**: Click to toggle, static positioning

---

## ### INFO_BOX_VARIANTS ###

### Success Box (Green)
```html
<div class="info-box success">
    <div class="info-box-icon"><i data-feather="check-circle"></i></div>
    <div class="info-box-content">
        <p><strong>Title</strong></p>
        <p>Content text...</p>
    </div>
</div>
```

### Info Box (Purple)
```html
<div class="info-box info">
    <div class="info-box-icon"><i data-feather="info"></i></div>
    <div class="info-box-content">...</div>
</div>
```

### React Version (hc- prefix)
```jsx
<div className="hc-info-box success">
    <div className="hc-info-box-icon"><MessageCircle /></div>
    <div className="hc-info-box-content">...</div>
</div>
```

---

## ### FEEDBACK_SECTION ###

### Static Article Implementation
```html
<section class="feedback-section">
    <h3>Did this answer your question?</h3>
    <div class="feedback-buttons">
        <button class="feedback-btn" data-feedback="no">
            <span class="feedback-emoji">:(</span>
            <span class="feedback-label">No</span>
        </button>
        <button class="feedback-btn" data-feedback="somewhat">
            <span class="feedback-emoji">:|</span>
            <span class="feedback-label">Somewhat</span>
        </button>
        <button class="feedback-btn" data-feedback="yes">
            <span class="feedback-emoji">:)</span>
            <span class="feedback-label">Yes</span>
        </button>
    </div>
</section>
```

### JavaScript Handler
```javascript
const feedbackButtons = document.querySelectorAll('.feedback-btn');
feedbackButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        feedbackButtons.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        console.log('User feedback:', this.dataset.feedback);
        setTimeout(() => alert('Thank you for your feedback!'), 300);
    });
});
```

---

## ### GUEST_ARTICLE_SECTIONS ###

| Section | Articles | Topics |
|---------|----------|--------|
| Getting Started | 6 | What is Split Lease, who benefits, how to start, hybrid worker info |
| Before You Book | 7 | Market report, customize space, contact host, storage, host verification |
| Trial Nights | 4 | Who benefits, how it works, why trial, key benefits |
| Booking Process | 5 | Best price, approval time, timeline, periodic tenancy, guarantee |
| Pricing & Payments | 2 | Saving money, credit card approval |
| During Your Stay | 3 | Self-cleaning, cancellation, expectations |

---

## ### HOST_ARTICLE_SECTIONS ###

| Section | Articles | Topics |
|---------|----------|--------|
| Getting Started | 4 | Listing costs, host fees, rental license, advantages |
| Listing Your Space | 5 | Multiple properties, live-in listing, public info, storage, deposit |
| Legal, Taxes & Agreements | 4 | Legal responsibilities, tax benefits, lease agreements, tenant rights |
| Managing Bookings | 4 | See renters, notifications, verify traveler, payments |
| Listing Management | 3 | Update listing, visibility, cancellation policy |

---

## ### KNOWLEDGE_BASE_SECTIONS ###

| Section | Articles | Focus |
|---------|----------|-------|
| Airbnb vs. Split Lease | 3 | Platform comparison articles |
| Hybrid Work & Commuting | 3 | Commuting tips, remote work |
| Success Stories | 2 | Customer testimonials |
| Family & Lifestyle | 2 | Family scenarios, safety |
| Platform Insights | 1 | iOS app info |
| Legal & Rental Fees | 2 | Fee explanations |

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

// Icons
import { User, Users, Info, LifeBuoy, BookOpen, Search,
         HelpCircle, ChevronRight, ArrowRight, ArrowLeft,
         MessageCircle, Heart, DollarSign, FileText } from 'lucide-react';

// Styles
import '../../styles/help-center.css';
import '../../styles/faq.css'; // For inquiry modal
```

---

## ### CATEGORY_PAGE_LOGIC ###

### URL Detection
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
}, []);
```

### Article Link Generation
```jsx
// External articles (blog posts, policies)
{article.external ? (
    <a href={article.external} target="_blank" rel="noopener noreferrer">
        <ArrowRight />
        {article.title}
    </a>
) : (
    <a href={`/help-center-articles/${category.slug}/${article.slug}.html`}>
        <ArrowRight />
        {article.title}
    </a>
)}
```

---

## ### CONDITIONAL_INFO_BOXES ###

```jsx
// Guest/Host pages get support contact box
{(category.slug === 'guests' || category.slug === 'hosts') && (
    <div className="hc-info-box success">
        <MessageCircle />
        <p><strong>Need more help?</strong></p>
        <p>Contact us at support@split.lease</p>
    </div>
)}

// Host pages get tax benefits info
{category.slug === 'hosts' && (
    <div className="hc-info-box info">
        <DollarSign />
        <p><strong>Did you know? Hosting can offer tax benefits</strong></p>
    </div>
)}

// About page uses infoBoxes from data
{articles.infoBoxes?.map((box, index) => (
    <div className={`hc-info-box ${box.type}`}>
        <BoxIcon />
        <p><strong>{box.title}</strong></p>
        <p>{box.content}</p>
    </div>
))}
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Category not loading | Verify URL format `/help-center/{slug}` |
| Search not working | Query must be >= 2 characters |
| Static articles 404 | Check `/help-center-articles/{path}` exists |
| Inquiry form failing | Verify `/api/faq-inquiry` endpoint |
| Icons not rendering | Ensure `feather.replace()` called |
| Mobile menu broken | Check `toggleMobileMenu()` function |
| Breadcrumb incorrect | Verify article HTML href paths |
| Sidebar not sticky | Check viewport >= 1024px |
| Dropdown not working | Verify `sl-nav-dropdown` structure |

---

## ### EXTERNAL_DEPENDENCIES ###

| Dependency | Version | Purpose |
|------------|---------|---------|
| Feather Icons | Latest (CDN) | Static article icons |
| Lottie Player | Latest (CDN) | Optional animations |
| Lucide React | (via npm) | React page icons |
| Google Fonts | DM Sans, Lato, Martel | Typography |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Source CLAUDE.md | `app/src/CLAUDE.md` |
| Islands CLAUDE.md | `app/src/islands/CLAUDE.md` |
| Data CLAUDE.md | `app/src/data/CLAUDE.md` |
| Help Articles CLAUDE.md | `app/public/help-center-articles/CLAUDE.md` |
| FAQ Page | `app/src/islands/pages/FAQPage.jsx` |
| faq-inquiry API | `app/functions/api/faq-inquiry.js` |

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Comprehensive initial documentation
