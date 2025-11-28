# JS - Help Center Scripts

**GENERATED**: 2025-11-27
**PARENT**: app/public/help-center-articles/

---

## DIRECTORY_INTENT

[PURPOSE]: JavaScript functionality for static help center pages
[PATTERN]: Vanilla JS, no build process, global function exports
[CONSUMED_BY]: All HTML files in help-center-articles/

---

## FILE_INVENTORY

### split-lease-nav.js
[INTENT]: Navigation and interactive functionality
[EXPORTS]: toggleMobileMenu(), handleImportListing()
[DEPENDENCIES]: feather-icons (for icon replacement)

---

## FUNCTIONALITY

### Mobile Menu Toggle
```javascript
toggleMobileMenu()
// Toggles .mobile-active class on nav-center and nav-right elements
```

### Dropdown Menus
- Click toggle for dropdown visibility
- Hover support on desktop (> 768px)
- Click-outside to close

### Feather Icons
- Auto-replaces `<i data-feather="icon-name">` on DOMContentLoaded

### Import Listing (Footer)
```javascript
handleImportListing()
// Validates URL and email inputs
// Shows loading state
// Simulates API call for listing import
```

---

## GLOBAL_EXPORTS

Functions exported to `window` object:
- `window.toggleMobileMenu`
- `window.handleImportListing`

---

## USAGE

```html
<script src="/help-center-articles/js/split-lease-nav.js"></script>
```

---

**FILE_COUNT**: 1
