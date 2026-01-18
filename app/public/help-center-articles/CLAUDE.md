# Help Center Articles - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Static HTML help center articles

---

## QUICK_STATS

[TOTAL_ARTICLES]: 66
[FILE_TYPES]: HTML, CSS, JS
[URL_PATH]: `/help-center-articles/*`
[SUBDIRECTORIES]: 6

---

## DIRECTORY_INTENT

[PURPOSE]: Pre-rendered static HTML pages for the Help Center
[PATTERN]: SEO-friendly articles with shared CSS/JS infrastructure
[BENEFITS]: Fast loading, search engine indexable, works without JavaScript
[ARCHITECTURE]: Static HTML with shared styling and navigation

---

## SUBDIRECTORY_STRUCTURE

### about/
[INTENT]: Platform explainer articles
[TOPICS]: What is Split Lease, platform overview
[URL_PATTERN]: `/help-center-articles/about/*.html`

### css/
[INTENT]: Shared stylesheet for all help center pages
[FILES]: style.css
[SCOPE]: Brand colors, typography, layout, components

### js/
[INTENT]: Shared JavaScript for navigation and interactivity
[FILES]: split-lease-nav.js
[FEATURES]: Navigation menu, breadcrumbs, Feather icons

### guests/
[INTENT]: Help articles for guests/renters
[SUBDIRECTORIES]: before-booking, booking, during-stay, getting-started, pricing, trial-nights
[URL_PATTERN]: `/help-center-articles/guests/{category}/*.html`

### hosts/
[INTENT]: Help articles for property hosts
[SUBDIRECTORIES]: getting-started, legal, listing, management, managing
[URL_PATTERN]: `/help-center-articles/hosts/{category}/*.html`

### knowledge-base/
[INTENT]: Educational and comparison articles
[TOPICS]: Platform comparisons, general rental knowledge
[URL_PATTERN]: `/help-center-articles/knowledge-base/*.html`

---

## ARTICLE_TEMPLATE_STRUCTURE

[HEADER]: Fixed Split Lease navigation (matches React Header component)
[BREADCRUMB]: Hierarchical navigation trail
[ARTICLE_CONTENT]: Main content with headings, paragraphs, info boxes
[SIDEBAR]: Related article navigation
[FEEDBACK]: User satisfaction survey
[FOOTER]: Site-wide footer links

---

## STYLING_SYSTEM

### Brand Colors
[PRIMARY]: #31135d (Deep Purple)
[SUCCESS]: #4CAF50 (Green)
[INFO_BG]: #F3E5F5 (Light Purple)

### CSS Architecture
[VARIABLES]: CSS custom properties in style.css
[RESPONSIVE]: Mobile-first responsive design
[CONSISTENCY]: Matches main application styling

---

## ICON_SYSTEM

[LIBRARY]: Feather Icons
[DELIVERY]: CDN via unpkg
[USAGE]: `<i data-feather="icon-name"></i>` + `feather.replace()`
[EXAMPLES]: chevron-right, calendar, user, message-circle

---

## ANIMATION_SYSTEM

[LIBRARY]: Lottie Player
[DELIVERY]: CDN via lottiefiles
[USAGE]: `<lottie-player src="/assets/lotties/*.json" loop autoplay>`
[USE_CASES]: Hero animations, loading states

---

## GUEST_ARTICLE_CATEGORIES

### before-booking/
[TOPICS]: Research, virtual meetings, what to expect

### booking/
[TOPICS]: Proposal process, rental applications, approval

### during-stay/
[TOPICS]: Check-in, house rules, host communication

### getting-started/
[TOPICS]: Platform introduction, account setup

### pricing/
[TOPICS]: Pricing structure, payment methods, refunds

### trial-nights/
[TOPICS]: Trial stay program, booking trial nights

---

## HOST_ARTICLE_CATEGORIES

### getting-started/
[TOPICS]: Platform introduction, becoming a host

### legal/
[TOPICS]: Leases, contracts, legal requirements

### listing/
[TOPICS]: Creating listings, photos, pricing

### management/
[TOPICS]: Calendar management, availability

### managing/
[TOPICS]: Guest communication, proposals, approvals

---

## URL_EXAMPLES

[GUEST]: `/help-center-articles/guests/getting-started/how-to-get-started.html`
[HOST]: `/help-center-articles/hosts/listing/create-listing.html`
[KNOWLEDGE]: `/help-center-articles/knowledge-base/airbnb-vs-split-lease.html`
[INDEX]: `/help-center-articles/index.html`

---

## NAVIGATION_INTEGRATION

[HEADER]: Split Lease navigation bar (matches main app)
[BREADCRUMBS]: Dynamic breadcrumb generation via JS
[SIDEBAR]: Category-based article navigation
[FOOTER]: Consistent footer across all pages

---

## NOTES

[SEO]: Pre-rendered HTML optimized for search engines
[PERFORMANCE]: Fast loading via static HTML
[NO_JS_REQUIRED]: Content accessible without JavaScript
[SHARED_ASSETS]: Common CSS/JS reduces redundancy
