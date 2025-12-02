# CSS - Help Center Styles

**GENERATED**: 2025-11-27
**PARENT**: app/public/help-center-articles/

---

## DIRECTORY_INTENT

[PURPOSE]: Stylesheet for the static help center article pages
[PATTERN]: Standalone CSS with CSS custom properties
[CONSUMED_BY]: All HTML files in help-center-articles/

---

## FILE_INVENTORY

### style.css
[INTENT]: Complete styling for help center articles
[SIZE]: ~1500 lines
[FEATURES]: Responsive design, accessibility, print styles

---

## CSS_ARCHITECTURE

### CSS Custom Properties (Root Variables)
```css
--brand-primary: #31135d;     /* Deep Purple */
--brand-primary-dark: #1e0a37;
--brand-primary-light: #4a1f8f;
--success-bg: #E8F5E9;
--success-border: #4CAF50;
--info-bg: #F3E5F5;
```

### Spacing Scale
`--space-1` (4px) through `--space-20` (80px)

### Typography Scale
`--font-xs` (12px) through `--font-5xl` (36px)

---

## KEY_COMPONENTS

### Layout
- `.container` / `.container-narrow` - Max-width containers
- `.article-layout` - Two-column article + sidebar grid

### Navigation
- `.sl-main-header` - Fixed site header matching React Header
- `.breadcrumb` - Hierarchical navigation
- `.sidebar-nav` - In-page section navigation

### Content
- `.article-content` / `.article-body` - Article text styling
- `.info-box.success` / `.info-box.info` - Callout boxes
- `.category-card` - Hub page category cards

### Interactive
- `.feedback-btn` - Emoji feedback buttons
- `.search-input` - Search banner input

---

## RESPONSIVE_BREAKPOINTS

- Mobile: < 640px
- Tablet: 768px - 1023px
- Desktop: >= 1024px
- Large: >= 1440px

---

## ACCESSIBILITY

- Focus-visible outlines with brand color
- Reduced motion support
- Print styles hide non-essential elements

---

**FILE_COUNT**: 1
