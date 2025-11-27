# Styles - CSS Architecture

**GENERATED**: 2025-11-26
**PARENT**: app/src/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Global and component-level CSS styles
[PATTERN]: CSS Variables + Component CSS
[ARCHITECTURE]: No CSS-in-JS, plain CSS with variables

---

## ### SUBDIRECTORIES ###

### components/
[INTENT]: Component-specific CSS files
[FILES]: 10+ CSS files for shared components

---

## ### FILE_INVENTORY ###

### variables.css
[INTENT]: CSS custom properties (design tokens)
[EXPORTS]: --color-*, --spacing-*, --font-*, --radius-*
[USAGE]: var(--color-primary)

### listing-schedule-selector.css
[INTENT]: Styles for schedule selector component

---

## ### COMPONENTS_DIRECTORY ###

### components/benefits.css
[INTENT]: Styles for benefits/value proposition sections

### components/floating-badge.css
[INTENT]: Styles for floating badges and labels

### components/footer.css
[INTENT]: Site footer styles

### components/guest-success.css
[INTENT]: Guest success page styles

### components/hero.css
[INTENT]: Hero section styles

### components/mobile.css
[INTENT]: Mobile-specific responsive styles

### components/modal.css
[INTENT]: Base modal styles (overlay, container, header, body, footer)

### components/not-found.css
[INTENT]: 404 page styles

### components/policies.css
[INTENT]: Policies page styles

### components/toast.css
[INTENT]: Toast notification styles

---

## ### CSS_VARIABLES_PATTERN ###

```css
:root {
  /* Colors */
  --color-primary: #6366f1;
  --color-secondary: #22c55e;
  --color-error: #ef4444;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;

  /* Typography */
  --font-family: 'Inter', sans-serif;
  --font-size-base: 16px;
}
```

---

## ### USAGE_PATTERN ###

[IMPORT]: @import 'styles/variables.css';
[USE]: color: var(--color-primary);
[RULE]: Never hardcode color values - use CSS variables

---

**SUBDIRECTORY_COUNT**: 1
**TOTAL_FILES**: 12+
