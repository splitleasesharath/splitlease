# Assets Directory - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Static media assets for the application

---

## QUICK_STATS

[TOTAL_FILES]: 48
[FILE_TYPES]: SVG, PNG, JSON, PDF
[URL_PATH]: `/assets/*`
[SUBDIRECTORIES]: 7

---

## DIRECTORY_INTENT

[PURPOSE]: Root directory for all static media assets served directly
[PATTERN]: Assets referenced via absolute paths from `/assets/`
[SERVED]: Directly by Cloudflare Pages static hosting

---

## SUBDIRECTORY_INVENTORY

### fonts/
[INTENT]: Web font files
[STATUS]: Directory exists for custom fonts if needed

### games/
[INTENT]: Game-related assets
[STATUS]: Available for interactive features

### icons/
[INTENT]: SVG icon assets for UI elements
[FORMAT]: SVG
[FILE_COUNT]: 25
[USAGE]: `<img src="/assets/icons/icon-name.svg" />`

### images/
[INTENT]: UI images, branding, and illustrations
[FORMATS]: PNG, SVG
[FILE_COUNT]: 13 (including team subdirectory)
[USAGE]: `<img src="/assets/images/image-name.png" />`

### lotties/
[INTENT]: Lottie animation JSON files
[FORMAT]: JSON (Lottie format)
[FILE_COUNT]: 2
[USAGE]: Rendered via lottie-react or lottie-player library

### resources/
[INTENT]: Downloadable resources and documents
[FORMAT]: PDF
[FILE_COUNT]: 2
[EXAMPLES]: Refactoring-UI.pdf, What-Is-MultiLocal.pdf

### videos/
[INTENT]: Video assets for UI
[STATUS]: Available for promotional or instructional content

---

## ASSET_REFERENCE_PATTERNS

```html
<!-- In HTML/JSX -->
<img src="/assets/icons/calendar.svg" alt="Calendar" />
<img src="/assets/images/logo.png" alt="Split Lease" />
```

```css
/* In CSS */
background-image: url('/assets/images/hero-bg.jpg');
```

```javascript
// In React component
import Lottie from 'lottie-react';
// Then fetch from /assets/lotties/animation.json
```

---

## ICON_NAMING_CONVENTION

[PATTERN]: `{name}.svg` or `{name}-{color}.svg`
[EXAMPLES]: `calendar.svg`, `user-purple.svg`, `heart-purple.svg`

---

## OPTIMIZATION_GUIDELINES

[SVG]: Remove unnecessary metadata, optimize paths
[IMAGES]: Compress before committing, prefer WebP for web
[FONTS]: Use WOFF2 for best compression
[LOTTIES]: Minify JSON, remove unused properties
