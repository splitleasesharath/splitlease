# Assets Directory - Static Assets Root

**GENERATED**: 2025-11-27
**SCOPE**: Static media assets for the application
**OPTIMIZATION**: Semantic Searchability + Digestibility

---

## QUICK_STATS

[TOTAL_SUBDIRECTORIES]: 5
[ASSET_TYPES]: SVG, PNG, JPG, WebP, JSON (Lottie), PDF
[URL_PATH]: `/assets/*`

---

## DIRECTORY_INTENT

[PURPOSE]: Root directory for all static media assets served directly
[PATTERN]: Assets referenced via absolute paths from `/assets/`
[SERVED]: Directly by Cloudflare Pages static hosting

---

## SUBDIRECTORY_INVENTORY

### fonts/
[INTENT]: Web font files
[FORMATS]: WOFF, WOFF2, TTF
[STATUS]: Empty - may use Google Fonts CDN instead

### icons/
[INTENT]: SVG icon assets for UI elements
[FORMAT]: SVG
[EXAMPLES]: calendar, user, message, logout, proposals icons
[USAGE]: `<img src="/assets/icons/icon-name.svg" />`

### images/
[INTENT]: UI images, branding, and illustrations
[FORMATS]: PNG, JPG, WebP, SVG
[EXAMPLES]: logo, hero images, property icons (bed, bath, car)
[USAGE]: `<img src="/assets/images/image-name.png" />`

### lotties/
[INTENT]: Lottie animation JSON files
[FORMAT]: JSON (Lottie format)
[USAGE]: Rendered via lottie-react or similar library

### resources/
[INTENT]: Downloadable resources and documents
[FORMAT]: PDF
[EXAMPLES]: House manual templates, rental agreements

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

| Pattern | Example |
|---------|---------|
| `{name}.svg` | `calendar.svg`, `user.svg` |
| `{name}-{color}.svg` | `heart-purple.svg`, `key-purple.svg` |

---

## OPTIMIZATION_GUIDELINES

- SVGs: Remove unnecessary metadata, optimize paths
- Images: Compress before committing, prefer WebP
- Fonts: Use WOFF2 for best compression
- Lotties: Minify JSON, remove unused properties

---

**SUBDIRECTORY_COUNT**: 5
