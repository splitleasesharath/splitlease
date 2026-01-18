# Component Styles - LLM Reference

**GENERATED**: 2025-12-11
**PARENT**: app/src/styles/
**SCOPE**: Component-specific and feature-specific CSS files

---

## QUICK_STATS

[TOTAL_FILES]: 31 CSS files
[PRIMARY_LANGUAGE]: CSS
[KEY_PATTERNS]: Component-scoped styles, BEM-like naming, Feature-specific layouts
[CONVENTION]: Use CSS variables from ../variables.css

---

## FILES

### ai-import-assistant-modal.css
[INTENT]: Styles for AI-powered listing import assistant modal
[DEFINES]: AI import modal overlay, steps, form inputs, progress indicators
[USED_BY]: AI import listing feature

### benefits.css
[INTENT]: Value proposition and benefits sections on marketing pages
[DEFINES]: Benefit cards, icon containers, feature grids
[USED_BY]: HomePage, marketing pages

### create-listing-modal.css
[INTENT]: Modal for creating new listings (quick form)
[DEFINES]: Modal overlay, form layout, input fields, button styles
[USED_BY]: Header "List with us" CTA

### create-listing-modal (1).css
[INTENT]: Duplicate/backup version of create-listing-modal.css
[STATUS]: Likely obsolete, candidate for cleanup
[NOTE]: Should verify if still referenced and remove if not

### edit-listing-details.css
[INTENT]: Styles for editing existing listing details
[DEFINES]: Edit form sections, field layouts, save/cancel buttons
[USED_BY]: Listing dashboard edit mode

### floating-badge.css
[INTENT]: Floating notification badges and status indicators
[DEFINES]: .floating-badge, position variants, color variants, animations
[USED_BY]: Various components for status indicators

### footer.css
[INTENT]: Site footer with links, logo, and social icons
[DEFINES]: .main-footer, footer sections, link grids, social icons, responsive layout
[USED_BY]: All pages (imported in main.css)

### guest-proposals.css
[INTENT]: Guest proposals dashboard page styles
[DEFINES]: Proposal card list, status badges, filter controls, empty states
[USED_BY]: GuestProposalsPage

### guest-success.css
[INTENT]: Guest booking success/confirmation page
[DEFINES]: Success card, confirmation details, next steps section, celebration animations
[USED_BY]: GuestSuccessPage

### header.css
[INTENT]: Fixed site header with navigation and auth controls
[DEFINES]: .main-header (fixed position), .nav-container, .logo, navigation links, auth buttons, mobile menu, dropdown menus
[FEATURES]: Fixed positioning (z-index: 9999), responsive navigation, avatar dropdown
[USED_BY]: All pages (imported in main.css)

### hero.css
[INTENT]: Homepage hero section with search
[DEFINES]: Hero background, headline, search box, CTA buttons
[USED_BY]: HomePage

### host-overview.css
[INTENT]: Host dashboard overview page
[DEFINES]: Dashboard cards, stats widgets, recent activity, quick actions
[USED_BY]: HostOverviewPage

### host-proposals.css
[INTENT]: Host proposals management dashboard
[DEFINES]: Proposal table/cards, action buttons, filters, status indicators, bulk actions
[USED_BY]: HostProposalsPage

### host-success.css
[INTENT]: Host listing creation success page
[DEFINES]: Success confirmation card, next steps, dashboard link, onboarding checklist
[USED_BY]: HostSuccessPage

### import-listing-modal.css
[INTENT]: Manual listing import modal (URL-based)
[DEFINES]: Import form, URL input, platform selector, preview area
[USED_BY]: Import listing feature

### listing-dashboard.css
[INTENT]: Individual listing management dashboard
[DEFINES]: Listing header, stats section, proposal list, calendar view, edit controls
[USED_BY]: ListingDashboardPage

### listings.css
[INTENT]: Listing card layouts for grid and list views
[DEFINES]: .listing-card (horizontal and vertical variants), image container, info section, pricing display, amenity icons, hover states
[FEATURES]: Grid layout for HomePage (4 columns), horizontal cards for search results
[USED_BY]: HomePage listings section, search results

### local-section.css
[INTENT]: "Local area" or neighborhood sections on listing pages
[DEFINES]: Neighborhood info cards, nearby amenities, transport links
[USED_BY]: ViewSplitLeasePage, listing detail views

### mobile.css
[INTENT]: Mobile-specific responsive overrides and touch targets
[DEFINES]: Mobile navigation, touch-friendly buttons, responsive grids, mobile filters
[BREAKPOINT]: Applied at max-width: 768px
[USED_BY]: All pages (imported in main.css)

### modal.css
[INTENT]: Base modal component styles - overlay, container, animations
[DEFINES]: .modal-overlay, .modal-container, .modal-header, .modal-body, .modal-footer, slide-in/fade animations, close button
[USED_BY]: All modal components (login, signup, contact, etc.)

### not-found.css
[INTENT]: 404 error page layout and messaging
[DEFINES]: 404 hero, error message, search suggestions, back to home link
[USED_BY]: NotFoundPage (404.html)

### policies.css
[INTENT]: Terms of service and legal policy pages
[DEFINES]: Policy document layout, section headings, numbered lists, legal text formatting
[USED_BY]: PoliciesPage

### rental-application.css
[INTENT]: Multi-section rental application form
[DEFINES]: Application header, form sections (personal info, employment, references, pets, emergency contacts), file upload areas, social media verification, progress indicator
[FEATURES]: Design system with custom CSS variables (--rental-app-*), color-coded sections, responsive form layout
[COLORS]: --rental-app-header (#31135D), --rental-app-primary (#6D31C2), --rental-app-linkedin (#0077B5), --rental-app-facebook (#1877F2)
[USED_BY]: RentalApplicationPage

### schedule.css
[INTENT]: Schedule visualization components (weekly patterns)
[DEFINES]: Week grid, day blocks, availability indicators, pattern selectors
[USED_BY]: Listing pages, proposal flows

### search-page.css
[INTENT]: Full-screen two-panel search page layout (45% listings, 55% map)
[DEFINES]: .search-page, .two-column-layout, .listings-column, .map-column, .inline-filters, filter dropdowns, listing cards, map container
[FEATURES]: 45-55 split layout, sticky filters, scrollable listing area, fixed map, no header padding (full viewport height)
[BREAKPOINT]: Switches to stacked layout on mobile
[USED_BY]: SearchPage

### search-page-old.css
[INTENT]: Legacy search page styles (previous design)
[STATUS]: Deprecated, kept for reference
[NOTE]: Should be removed after confirming new search-page.css covers all use cases

### support.css
[INTENT]: Customer support and help widgets
[DEFINES]: Support chat button, help widget, contact forms
[USED_BY]: Various pages for support features

### testimonials.css
[INTENT]: Customer testimonial sections and cards
[DEFINES]: Testimonial cards, avatars, quote styling, rating stars, carousel controls
[USED_BY]: HomePage, marketing pages

### toast.css
[INTENT]: Toast notification system (success, error, info, warning)
[DEFINES]: .toast-container (fixed positioning), .toast (variants by type), slide-in animations, auto-dismiss timers
[POSITION]: Fixed top-right corner (z-index for overlay)
[USED_BY]: Global notification system

### utilities.css
[INTENT]: Utility classes for common patterns
[DEFINES]: Visibility (.hidden, .visible), spacing helpers (.mt-*, .mb-*), text utilities (.text-center, .text-bold), flex helpers (.flex, .flex-center)
[USAGE]: Import for reusable utility classes
[USED_BY]: All components (imported in main.css)

### value-props.css
[INTENT]: Value proposition sections with icons and descriptions
[DEFINES]: Value prop grid, icon containers, feature highlights
[USED_BY]: HomePage, marketing pages

---

## NAMING_CONVENTIONS

[FILE_NAMES]: kebab-case matching component or feature name
[CLASS_NAMES]: kebab-case, component-prefixed (e.g., .listing-card, .modal-overlay)
[MODIFIERS]: State classes like .active, .selected, .disabled, .error, .hidden
[EXAMPLE]: guest-proposals.css for GuestProposalsPage component

---

## USAGE_PATTERN

### Import in Components
```jsx
// Option 1: Import directly in component file
import './Header.css'

// Option 2: Imported via main.css (for shared components)
// Most component styles are imported in src/styles/main.css
```

### Scope to Component
```css
/* Prefix classes with component name to avoid conflicts */
.listing-card { /* base styles */ }
.listing-card__image { /* child element */ }
.listing-card__title { /* child element */ }
.listing-card--featured { /* modifier */ }
.listing-card.selected { /* state */ }
```

---

## CSS_VARIABLES_USAGE

### Standard Pattern
```css
.my-component {
  /* Colors */
  background: var(--primary-purple);
  color: var(--text-dark);
  border: 1px solid var(--border-color);

  /* Spacing */
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  gap: var(--gap-md);

  /* Typography */
  font-family: var(--font-inter);
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);

  /* Border & Shadow */
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-md);

  /* Transitions */
  transition: all var(--transition-base) var(--easing-ease-in-out);
}
```

---

## MODAL_COMPONENTS

### Shared Modal Structure
[BASE_STYLES]: modal.css provides foundation
[OVERLAY]: Fixed position with rgba(0, 0, 0, 0.5) background
[CONTAINER]: Centered, max-width, border-radius, box-shadow
[ANIMATIONS]: Fade in overlay, slide up container
[Z_INDEX]: 10000 (var(--z-modal))

### Modal-Specific Files
[IMPORT_ASSISTANT]: ai-import-assistant-modal.css
[CREATE_LISTING]: create-listing-modal.css
[IMPORT_LISTING]: import-listing-modal.css
[CONTACT_HOST]: Inline in main.css (contact-host-messaging styles)
[AI_SIGNUP]: Inline in main.css (ai-signup-modal styles)

---

## RESPONSIVE_PATTERNS

### Mobile Breakpoints
```css
/* Desktop first in some components */
.component { /* Desktop styles */ }

@media (max-width: 768px) {
  .component { /* Tablet/Mobile adjustments */ }
}

@media (max-width: 480px) {
  .component { /* Small mobile adjustments */ }
}
```

### Common Mobile Adjustments
[GRID]: Grid columns reduce from 4 → 2 → 1
[PADDING]: Reduced spacing for smaller screens
[FONT_SIZE]: Slightly smaller text on mobile
[NAVIGATION]: Hamburger menu, full-screen overlays
[MODALS]: Full-width or near-full-width on mobile

---

## SEARCH_PAGE_SPECIFICS

### Layout Architecture
[DESKTOP]: 45% listings (scrollable) + 55% map (fixed)
[MOBILE]: Stacked layout, toggle between list and map
[NO_HEADER_PADDING]: search-page overrides default padding-top
[FILTERS]: Inline horizontal filters, sticky positioning

### Key Classes
[.two-column-layout]: Flex container for 45-55 split
[.listings-column]: Left panel with filters + scrollable cards
[.map-column]: Right panel with fixed Google Map
[.inline-filters]: Horizontal filter bar with dropdowns

---

## LISTING_CARD_VARIANTS

### HomePage Grid Cards
[LAYOUT]: Vertical card (image top, content bottom)
[GRID]: 4 columns on desktop, 2 on tablet, 1 on mobile
[IMAGE]: Aspect ratio 16:9, cover fit
[HOVER]: Scale + shadow + border color change

### Search Horizontal Cards
[LAYOUT]: Horizontal (image left 30%, content right 70%)
[SCROLL]: Vertical scroll within listings-column
[IMAGE]: Fixed width, object-fit cover
[HOVER]: Border color change, shadow increase

---

## CRITICAL_PATTERNS

[FIXED_HEADER]: Header uses position: fixed; top: 0; z-index: 9999
[HEADER_CLEARANCE]: Pages add padding-top to account for fixed header (~80-100px)
[MODAL_OVERLAY]: Always z-index: 10000 to appear above header
[TOAST_POSITION]: Fixed top-right, z-index for visibility
[MOBILE_MENU]: Transforms off-screen, slides in on toggle
[DAY_SELECTOR]: 7-column grid for day-of-week selection
[PRICING_DISPLAY]: Consistent breakdown format across proposal flows

---

## ACCESSIBILITY_FEATURES

[FOCUS_VISIBLE]: Buttons and links have focus-visible outlines
[SCREEN_READER]: .sr-only class for hidden labels
[ARIA_LABELS]: Used in modal close buttons, nav icons
[KEYBOARD_NAV]: Modal ESC key handling, tab order
[CONTRAST]: Text meets WCAG AA standards against backgrounds

---

## DEPRECATED_FILES

[create-listing-modal (1).css]: Duplicate file, likely obsolete
[search-page-old.css]: Legacy search design, replaced by search-page.css
[ACTION]: Verify not referenced, then remove

---

## RELATED_DOCUMENTATION

[PARENT]: C:\Users\Split Lease\Documents\Split Lease\app\src\styles\CLAUDE.md
[VARIABLES]: C:\Users\Split Lease\Documents\Split Lease\app\src\styles\variables.css
[COMPONENTS]: C:\Users\Split Lease\Documents\Split Lease\app\src\islands\CLAUDE.md

---

**LAST_UPDATED**: 2025-12-11
**FILE_COUNT**: 31 CSS files
**TOTAL_LINES**: ~15,000+ lines of CSS across all component files
