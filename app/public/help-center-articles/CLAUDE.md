# Help Center Articles - Static Content

**GENERATED**: 2025-11-27
**PARENT**: app/public/

---

## DIRECTORY_INTENT

[PURPOSE]: Pre-rendered static HTML pages for the Help Center
[PATTERN]: SEO-friendly articles with shared CSS/JS infrastructure
[BENEFIT]: Fast loading, search engine indexable, works without JavaScript

---

## SUBDIRECTORIES

### about/
[INTENT]: Platform explainer articles (What is Split Lease?)
[FILES]: 1 article

### css/
[INTENT]: Shared stylesheet for all help center pages
[FILES]: style.css (~1500 lines)

### js/
[INTENT]: Shared JavaScript for navigation and interactivity
[FILES]: split-lease-nav.js

### guests/
[INTENT]: Help articles for guests
[SUBDIRS]: before-booking/, booking/, during-stay/, getting-started/, pricing/, trial-nights/

### hosts/
[INTENT]: Help articles for hosts
[SUBDIRS]: getting-started/, legal/, listing/, management/, managing/

### knowledge-base/
[INTENT]: Educational and comparison articles
[FILES]: Platform comparisons (Airbnb vs Split Lease)

---

## ARTICLE_TEMPLATE

All articles share a consistent structure:
1. **Fixed Header** - Split Lease navigation (matches React Header)
2. **Breadcrumb** - Hierarchical navigation
3. **Article Content** - Main content with info boxes
4. **Sidebar** - Related article navigation
5. **Feedback Section** - User satisfaction survey
6. **Footer** - Site links

---

## STYLING

### Brand Colors
- Primary: #31135d (Deep Purple)
- Success: #4CAF50 (Green)
- Info background: #F3E5F5 (Light Purple)

### CSS Custom Properties
All styling uses CSS variables defined in `css/style.css`

---

## ICONS

Uses [Feather Icons](https://feathericons.com/) via CDN:
```html
<script src="https://unpkg.com/feather-icons"></script>
<i data-feather="chevron-right"></i>
<script>feather.replace();</script>
```

---

## ANIMATIONS

Uses [Lottie](https://lottiefiles.com/) for some articles:
```html
<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
<lottie-player src="/assets/lotties/animation.json" loop autoplay></lottie-player>
```

---

## URL_PATTERN

Articles are accessible at:
- `/help-center-articles/guests/getting-started/how-to-get-started.html`
- `/help-center-articles/hosts/managing/payments.html`
- `/help-center-articles/knowledge-base/airbnb-vs-split-lease.html`

---

**SUBDIRECTORY_COUNT**: 6
**TOTAL_ARTICLES**: 20+
