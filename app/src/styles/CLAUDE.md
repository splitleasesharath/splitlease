# Styles Directory - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Global and page-level CSS styles for Split Lease application

---

## QUICK_STATS

[TOTAL_FILES]: 10 root CSS files + 31 component CSS files
[PRIMARY_LANGUAGE]: CSS
[KEY_PATTERNS]: CSS Variables, Component-scoped styles, Page-specific styles
[ARCHITECTURE]: CSS Variables (variables.css) + Global styles (main.css) + Component/Page styles

---

## ROOT_LEVEL_FILES

### variables.css
[INTENT]: Central design token system for entire application
[DEFINES]: CSS custom properties for colors, typography, spacing, shadows, transitions, breakpoints
[CATEGORIES]: Colors (primary, status, text, background, border, overlay, gradients), Fonts (families, sizes, weights, line-heights), Spacing (padding, margin, gaps), Border radius, Shadows, Transitions, Z-index, Opacity, Sizing (icons, avatars, containers, form inputs)
[USED_BY]: All components and pages via var() references
[CRITICAL]: All color values, spacing units, and design tokens defined here

### main.css
[INTENT]: Global CSS reset, base element styles, utility classes, and central import manifest
[DEFINES]: HTML element resets (*, body, h1-h6, p, a, input, button, etc.), Utility classes (.text-*, .display-*, .mt-*, .mb-*, .flex-*, .sr-only), Dark mode theme overrides, Print styles, Accessibility features
[IMPORTS]: variables.css, all component CSS files, Google Fonts (Inter)
[INCLUDES]: AI Signup Modal styles, Contact Host Messaging Modal, Info Modal, Custom scrollbar
[USED_BY]: All pages as foundational stylesheet

### careers.css
[INTENT]: Styles for careers/jobs page
[DEFINES]: .hero-section, .hero-video-background, .hero-overlay, .content-section, .mission-grid, .example-card, .values-grid, .process-steps, .roles-list, .role-card, .video-section, .modal
[FEATURES]: Video background hero, animated example cards with hover states, floating people avatars, premium gradient buttons, responsive role cards, Typeform modal integration
[COLORS]: Uses --gradient-purple-blue, --gradient-purple-pink, --brand-purple

### create-proposal-flow-v2.css
[INTENT]: Multi-step proposal creation modal wizard
[DEFINES]: .create-proposal-popup, .proposal-container, .proposal-header, .section, .field-group, .day-selector, .day-button, .pricing-section, .navigation-buttons, .review-section, .user-details-section, .move-in-section, .days-selection-section
[FEATURES]: Fixed position modal overlay, sticky header/footer, multi-section form layout, day selection grid, pricing breakdown display, responsive navigation buttons
[USED_BY]: CreateProposalFlowV2 component

### faq.css
[INTENT]: FAQ page with tabbed navigation and accordion
[DEFINES]: .hero, .tabs-container, .tab, .faq-container, .accordion-item, .accordion-header, .accordion-content, .market-research-widget, .ai-chat-widget, .floating-chat-btn, .modal-overlay (for inquiry form)
[FEATURES]: Sticky tabs navigation, smooth accordion expand/collapse, floating market research widget, AI chat widget, inquiry modal form, success animations
[COLORS]: Brand purple (#31135d) throughout

### help-center.css
[INTENT]: Help center page with search banner and knowledge base
[DEFINES]: Custom CSS variables (--hc-*), .hc-search-banner, search and navigation components, knowledge base article styles
[FEATURES]: Brand-colored search banner, help center specific design tokens
[SCOPE]: Help center pages and article views

### list-with-us.css
[INTENT]: Host onboarding/listing creation marketing page
[DEFINES]: .list-hero-section, floating person avatars, premium gradient elements, marketing section layouts
[FEATURES]: Floating animated profile images, hero with overlay, gradient CTAs
[COLORS]: --gradient-purple-blue, --gradient-purple-pink, --brand-purple

### listing-schedule-selector.css
[INTENT]: Standalone day-of-week selection component with pricing
[DEFINES]: .listing-schedule-selector, .day-grid, .day-button, .pattern-buttons, .pattern-button, pricing display elements
[FEATURES]: 7-column day grid, pattern quick-select buttons (Weekdays, Weekends, Every day), selected state styling, responsive grid layout
[USED_BY]: ListingScheduleSelector component, self-listing page, proposal flows

### reset-password.css
[INTENT]: Password reset page layout and form
[DEFINES]: .reset-password-page, .reset-password-container, .loading-state, form states (loading, success, error)
[FEATURES]: Centered card layout, accounts for fixed header spacing (100px + padding), loading spinner, success/error states
[LAYOUT]: Vertical centering with flex-start to prevent content going behind header

### why-split-lease.css
[INTENT]: Marketing page explaining Split Lease value proposition
[DEFINES]: .hero-identity, floating person elements, gradient sections, marketing content layouts
[FEATURES]: Floating animated profile images, premium gradients, hero padding accounting for fixed header
[COLORS]: --gradient-purple-blue, --gradient-purple-pink, --brand-purple

---

## IMPORT_STRUCTURE

```css
/* main.css imports in this order: */
@import url('variables.css');

/* Component Styles */
@import url('components/header.css');
@import url('components/hero.css');
@import url('components/value-props.css');
@import url('components/schedule.css');
@import url('components/local-section.css');
@import url('components/listings.css');
@import url('components/search-page.css');
@import url('components/testimonials.css');
@import url('components/support.css');
@import url('components/footer.css');
@import url('components/floating-badge.css');
@import url('components/modal.css');
@import url('components/mobile.css');
@import url('components/utilities.css');
@import url('components/policies.css');
@import url('components/guest-success.css');
@import url('components/host-success.css');
@import url('components/not-found.css');

/* Map Components */
@import url('../islands/shared/ListingCard/ListingCardForMap.css');

/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

---

## DESIGN_SYSTEM

### Color Palette
[PRIMARY]: --primary-purple (#31135D), --primary-purple-hover (#251047), --primary-purple-dark (#1f0a3d)
[SECONDARY]: --secondary-purple (#6D31C2), --accent-purple (#8C68EE)
[ACCENT]: --accent-blue (#4A90E2), --accent-blue-hover (#357ABD)
[SUCCESS]: --success-green (#22C55E), --success-teal (#10B981)
[TEXT]: --text-dark (#1a1a1a), --text-gray (#6b7280), --text-light-gray (#9ca3af)
[BACKGROUND]: --bg-white (#ffffff), --bg-light (#f9fafb), --bg-light-gray (#f3f4f6)
[GRADIENTS]: --gradient-purple-primary, --gradient-purple-button, --gradient-purple-hover

### Typography
[FONTS]: --font-inter (primary), --font-dm (DM Sans), --font-primary (Helvetica)
[SIZES]: --text-xs (11px) through --text-4xl (36px)
[WEIGHTS]: --font-weight-normal (400), --font-weight-medium (500), --font-weight-semibold (600), --font-weight-bold (700)

### Spacing
[SYSTEM]: --spacing-xs (4px) through --spacing-7xl (3rem)
[GAPS]: --gap-sm (0.5rem) through --gap-3xl (2.5rem)
[PADDING]: --padding-sm (0.5rem) through --padding-2xl (2rem)

### Breakpoints
[MOBILE]: --breakpoint-sm (600px), --breakpoint-md (768px)
[TABLET]: --breakpoint-lg (1024px), --breakpoint-xl (1080px)
[DESKTOP]: --breakpoint-2xl (1200px), --breakpoint-3xl (1280px), --breakpoint-max (1440px)

### Shadows
[LEVELS]: --shadow-sm, --shadow-md, --shadow-lg, --shadow-xl, --shadow-2xl
[PURPLE]: --shadow-purple-sm, --shadow-purple-md, --shadow-purple-lg
[DARK]: --shadow-dark-sm, --shadow-dark-md

---

## NAMING_CONVENTIONS

[PATTERN]: kebab-case for all CSS classes and files
[VARIABLES]: --kebab-case with category prefix (e.g., --color-primary, --spacing-md)
[COMPONENTS]: Match React component name (e.g., create-listing-modal.css for CreateListingModal.jsx)
[PAGES]: Match page name (e.g., careers.css for CareersPage)
[MODIFIERS]: State modifiers like .active, .selected, .disabled, .error

---

## RESPONSIVE_STRATEGY

[APPROACH]: Mobile-first with progressive enhancement
[BASE]: Designed for mobile (< 600px)
[TABLET]: Enhanced at 768px breakpoint
[DESKTOP]: Full features at 1024px+

### Mobile Breakpoints
```css
@media (max-width: 600px) { /* Mobile adjustments */ }
@media (min-width: 601px) and (max-width: 768px) { /* Tablet */ }
@media (min-width: 769px) { /* Desktop */ }
@media (min-width: 1024px) { /* Large desktop */ }
@media (min-width: 1280px) { /* Extra large */ }
```

---

## UTILITY_CLASSES

[TEXT]: .text-left, .text-center, .text-right, .text-muted, .text-bold, .text-uppercase, .text-truncate
[DISPLAY]: .display-none, .display-block, .display-inline, .display-inline-block, .display-flex, .display-grid
[SPACING]: .mt-xs through .mt-2xl, .mb-xs through .mb-2xl, .p-xs through .p-2xl
[FLEX]: .flex-center, .flex-between, .flex-column
[VISIBILITY]: .sr-only (screen reader only)
[OPACITY]: .opacity-50, .opacity-75, .opacity-100

---

## ACCESSIBILITY

[FOCUS]: *:focus-visible gets outline: 2px solid var(--accent-blue)
[SKIP_LINK]: .skip-to-main for keyboard navigation
[SCREEN_READER]: .sr-only class for visually hidden content
[REDUCED_MOTION]: @media (prefers-reduced-motion: reduce) disables animations
[SCROLLBAR]: Custom styled scrollbar (4px width, themed colors)

---

## DARK_MODE

[SUPPORT]: Partial dark mode support via [data-theme="dark"] attribute
[VARIABLES]: Overrides for --text-dark, --text-gray, --bg-light, --bg-white, --border-color
[SCOPE]: Currently applied to basic elements (body, input, textarea, select, links)

---

## SUBDIRECTORIES

### components/
[PATH]: app/src/styles/components/
[FILES]: 31 CSS files
[SCOPE]: Component-specific and feature-specific styles
[DOCUMENTATION]: See components/CLAUDE.md for detailed component file listing

---

## USAGE_PATTERNS

### In HTML/JSX
```jsx
// Import in component or via main entry point
import 'src/styles/main.css'
import 'src/styles/careers.css'  // Page-specific
```

### Using Variables
```css
.my-component {
  color: var(--primary-purple);
  padding: var(--spacing-lg);
  border-radius: var(--rounded-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base) var(--easing-ease-in-out);
}
```

---

## CRITICAL_RULES

[DO]: Use CSS variables from variables.css for all colors, spacing, and tokens
[DO]: Follow mobile-first responsive design patterns
[DO]: Use kebab-case for all class names
[DO]: Scope component styles to avoid global conflicts
[DON'T]: Use inline styles for reusable patterns
[DON'T]: Use !important without strong justification
[DON'T]: Hardcode color values (always use CSS variables)
[DON'T]: Use CSS-in-JS (plain CSS only)

---

**LAST_UPDATED**: 2025-12-11
**TOTAL_CSS_FILES**: 41 (10 root + 31 components)
**DESIGN_SYSTEM_VERSION**: Based on Split Lease brand guidelines
