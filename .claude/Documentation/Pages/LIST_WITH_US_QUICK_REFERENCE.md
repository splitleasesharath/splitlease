# List With Us Page - Quick Reference

**GENERATED**: 2025-12-11
**PAGE_URL**: `/list-with-us.html`
**ENTRY_POINT**: `app/src/list-with-us.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
list-with-us.jsx (Entry Point)
    |
    +-- ListWithUsPage.jsx (Page Component)
            |
            +-- State Management
            |       +-- showCreateListingModal (boolean)
            |       +-- showImportListingModal (boolean)
            |       +-- isImporting (boolean)
            |
            +-- UI Sections
            |   +-- Header.jsx (Site navigation)
            |   +-- Hero Section (CTA buttons)
            |   +-- How It Works Section (3 steps)
            |   +-- Lease Styles Section (Nightly/Weekly/Monthly)
            |   +-- Pricing Policy Section (Payment structure)
            |   +-- CTA Section (Final call to action)
            |   +-- Footer.jsx (Site footer)
            |
            +-- Modals
                +-- CreateDuplicateListingModal.jsx
                |       +-- Create new listing flow
                |       +-- Duplicate existing listing flow
                |       +-- Redirects to /self-listing.html
                |
                +-- ImportListingModal.jsx
                        +-- Import from Airbnb/VRBO
                        +-- URL + Email form submission
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/list-with-us.jsx` | Mounts ListWithUsPage to #list-with-us-page |

### HTML Shell
| File | Purpose |
|------|---------|
| `app/public/list-with-us.html` | Static HTML with CSS imports, Hotjar, and module script |

### Page Component
| File | Purpose |
|------|---------|
| `app/src/islands/pages/ListWithUsPage.jsx` | Main page component with inline state management |

### Shared Components
| File | Purpose |
|------|---------|
| `app/src/islands/shared/Header.jsx` | Site navigation header |
| `app/src/islands/shared/Footer.jsx` | Site footer |

### Modals
| File | Purpose |
|------|---------|
| `app/src/islands/shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx` | Create/duplicate listing modal |
| `app/src/islands/shared/ImportListingModal/ImportListingModal.jsx` | Import listing from external platforms |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/list-with-us.css` | Main page styling (661 lines) |
| `app/src/styles/components/create-listing-modal.css` | Create modal styling (304 lines) |
| `app/src/styles/components/import-listing-modal.css` | Import modal styling (281 lines) |

### Constants
| File | Key Export |
|------|------------|
| `app/src/lib/constants.js` | `SIGNUP_LOGIN_URL` = 'https://app.split.lease/signup-login' |

---

## ### URL_ROUTING ###

```
/list-with-us.html    # Direct access
/list-with-us         # Cloudflare Pages rewrite to .html
```

### Related URLs (Navigation Targets)
```
/self-listing.html    # After "Create New" - redirect destination
/faq.html             # "General Questions" link in CTA section
```

---

## ### PAGE_SECTIONS ###

### 1. Hero Section
| Element | Content |
|---------|---------|
| Badge | "Turn Unused Nights Into Income" |
| Title | "List Your Property / Start Earning Today" |
| Subtitle | Join Split Lease and transform your unused property into a reliable income stream. Flexible lease terms, transparent pricing, and comprehensive support. |
| CTA Primary | "Start New Listing" - Opens CreateDuplicateListingModal |
| CTA Secondary | "Import My Listing" - Opens ImportListingModal |
| Visual Elements | 3 floating person images with hover animations |

### 2. How It Works Section
| Step | Title | Description |
|------|-------|-------------|
| 1 | Property Details | Provide comprehensive information about your property, including the full address, name, and bedrooms. Highlight amenities and unique features. |
| 2 | Rental Period & Pricing Strategy | Specify your preferred rental model: Nightly, Weekly, or Monthly. Set a competitive price reflecting your property's value. |
| 3 | House Rules & Photo Portfolio | Set clear expectations for guests. Include at least three high-quality photos showcasing key areas like the living room, bedroom, and bathroom. |

### 3. Lease Styles Section
| Style | Pattern | Example | Key Features |
|-------|---------|---------|--------------|
| Nightly | Nights-of-the-week | every Thurs-Sun from August to December | Certain nights designated for Guest use weekly; host may lease unused nights; host defines $/night |
| Weekly | Weeks-of-the-month | two weeks on, two weeks off August to December | Certain weeks designated for Guest use monthly; host may lease unused weeks; host defines $/wk |
| Monthly | Month-to-month | continuous stay from August to December | All nights available for Guest use; Split Lease can sublease unused nights; host defines $/month |

**Section Header Note**: "We offer lease terms ranging from 6 to 52 weeks, with a minimum stay of 30 nights."

### 4. Pricing Policy Section
| Card | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | $ (SVG) | Guest Payment | Guest always pays Nightly, regardless of the Rental Style selected |
| 2 | checkmark (SVG) | No Charges to Host | Hosts incur no charges. Compensation is received as YOU define in your Listing |
| 3 | calendar (SVG) | Payment Schedule | Nightly or Weekly Rental Style: Every 28 days; Monthly Rental Style: Every 31 days |
| Highlight | - | Additional Costs | Split Lease adds an 8-14% markup to cover: Credit Card Processing Fees, Insurance, and other applicable expenses |

### 5. CTA Section
| Element | Content |
|---------|---------|
| Title | "Start New Listing" |
| Subtitle | "Takes less than a minute to do!" |
| CTA Primary | "Create Your Listing" - Opens CreateDuplicateListingModal |
| CTA Secondary | "General Questions" - Links to /faq.html |
| Note | "Need help? Our support team is here to assist you every step of the way." |

---

## ### MODAL_FLOWS ###

### CreateDuplicateListingModal

**Two View Modes:**

#### Create Mode (Default)
```
1. User enters listing title
2. Clicks "Create New"
3. Title stored in localStorage as 'pendingListingName'
4. Modal closes
5. Toast: "Redirecting to listing form..."
6. Redirect to /self-listing.html (500ms delay)
```

#### Copy Mode (Logged-in users only)
```
1. User clicks "Copy Existing"
2. View switches to copy mode
3. User selects listing from dropdown
4. Name auto-fills as "{Original Name} copy"
5. User can customize name
6. Clicks "Duplicate"
7. Supabase insert to zat_listings table
8. Profile completeness update (if applicable)
9. Toast: "Listing duplicated successfully!"
10. Callback: onSuccess(newListing), onNavigateToListing(id)
```

**Props:**
```jsx
<CreateDuplicateListingModal
  isVisible={showCreateListingModal}
  onClose={() => setShowCreateListingModal(false)}
  onSuccess={(newListing) => { ... }}
  currentUser={null}                 // Enables copy mode when logged in
  existingListings={[]}              // User's existing listings for duplication
  onNavigateToListing={(listingId) => { ... }}
/>
```

**State:**
| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `viewMode` | string | 'create' | Current mode: 'create' or 'copy' |
| `listingName` | string | '' | User-entered listing title |
| `selectedListingId` | string | '' | ID of listing to duplicate |
| `isLoading` | boolean | false | Submit button loading state |

**Effects:**
- Reset state when modal opens (isVisible changes to true)
- Update listing name when switching to copy mode with selected listing
- Escape key closes modal

### ImportListingModal

**Single View Flow:**
```
1. User enters listing URL (Airbnb, VRBO, etc.)
2. User enters email address
3. Form validates:
   - URL not empty
   - Valid email format (regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
4. Clicks "Import Listing"
5. Parent onSubmit callback handles API call
6. Loading state during submission
7. Alert on success/error
8. Modal closes on success
```

**Props:**
```jsx
<ImportListingModal
  isOpen={showImportListingModal}
  onClose={() => setShowImportListingModal(false)}
  onSubmit={async (data) => { ... }}
  currentUserEmail=""                // Pre-fill email if logged in
  isLoading={isImporting}
/>
```

**Form Data Returned:**
```javascript
{
  listingUrl: "https://airbnb.com/...",
  emailAddress: "user@example.com"
}
```

**State:**
| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `listingUrl` | string | '' | Platform listing URL |
| `emailAddress` | string | currentUserEmail | Contact email |
| `errors` | object | {} | Form validation errors |

**Effects:**
- Reset form when modal opens/closes
- Escape key closes modal
- Prevent body scroll when modal is open

---

## ### CSS_THEME ###

### CSS Variables (list-with-us.css)
```css
:root {
  --gradient-purple-blue: linear-gradient(135deg, #31135D 0%, #4A2F7C 50%, #5B21B6 100%);
  --gradient-purple-pink: linear-gradient(135deg, #31135D 0%, #6B21A8 50%, #A855F7 100%);
  --brand-purple: #31135D;
}
```

### Color Palette
| Purpose | Color | Usage |
|---------|-------|-------|
| Brand Purple | #31135D | Titles, badges, buttons, lease types |
| Primary Hover | #4A2F7C | Gradient midpoints |
| Accent Purple | #5B21B6 | Gradient endpoints |
| Light Accent | #A855F7 | Pink gradient endpoint |
| Text Dark | #111827 | Main headings |
| Text Gray | #6B7280 | Subtitles, descriptions |
| Text Light | #9CA3AF | Helper text, notes |
| Border | #E5E7EB | Card borders |
| Background Alt | #f7f8f9 | Section backgrounds (How It Works, Pricing) |
| Success Green | #10B981, #059669, #047857 | Pricing highlight box |
| Info Purple | #f3f0ff | Import modal info box background |
| Error Red | #ef4444 | Form validation errors |

---

## ### CSS_CLASSES ###

### Hero Section
| Class | Purpose |
|-------|---------|
| `.list-hero-section` | Hero container with white bg, 180px top padding (80px header + 100px spacing) |
| `.list-hero-container` | Content wrapper, max-width 1200px, centered |
| `.list-hero-badge` | Purple outline badge pill with 500px border-radius |
| `.list-hero-title` | 56px bold headline, -1px letter-spacing |
| `.list-hero-title .highlight` | Purple highlight text (#31135D) |
| `.list-hero-subtitle` | 20px gray subtitle, max-width 700px, line-height 1.7 |
| `.list-hero-cta` | Flex container for CTA buttons with 16px gap |
| `.floating-person` | Absolute positioned circular images with box-shadow |
| `.hero-person-1/2/3` | Individual floating person positions and sizes |

### CTA Buttons
| Class | Style |
|-------|-------|
| `.cta-button` | Base: 16px 40px padding, 500px radius, 16px font, 600 weight |
| `.cta-primary` | Purple gradient bg, white text |
| `.cta-primary:hover` | Pink gradient, box-shadow, lift -2px |
| `.cta-secondary` | White bg, 2px purple border, purple text |
| `.cta-secondary:hover` | Light gray bg (#F9FAFB), shadow, lift -2px |

### How It Works Section
| Class | Purpose |
|-------|---------|
| `.list-how-it-works` | Gray background (#f7f8f9) section, 100px padding |
| `.list-how-it-works-container` | Max-width 1200px container |
| `.list-how-header` | Centered header with 64px bottom margin |
| `.list-how-title` | 42px title, -0.5px letter-spacing |
| `.list-how-subtitle` | 18px gray subtitle |
| `.list-steps-grid` | 3-column grid with 48px gap |
| `.list-step-card` | White card with border, 16px radius, 40px 32px padding |
| `.list-step-number` | 72px purple gradient circle with number |
| `.list-step-title` | 20px bold step heading |
| `.list-step-description` | 15px gray description, line-height 1.7 |
| `.gradient-blob` | Decorative blurred background circles |

### Lease Styles Section
| Class | Purpose |
|-------|---------|
| `.list-lease-styles-section` | White background section, 100px padding |
| `.list-lease-styles-container` | Max-width 1200px container |
| `.list-lease-header` | Centered header with 48px bottom margin |
| `.list-lease-eyebrow` | 12px uppercase label, 0.1em letter-spacing |
| `.list-lease-title` | 42px title |
| `.list-lease-description` | 18px description, max-width 900px |
| `.list-lease-grid` | 3-column grid with 32px gap |
| `.list-lease-card` | Card with 2px border, hover lift effect (-8px) |
| `.list-lease-type` | 28px bold purple type name |
| `.list-lease-pattern` | 14px gray pattern description |
| `.list-lease-example` | 13px italic example in gray background |
| `.list-lease-separator` | 48px purple gradient divider line |
| `.list-lease-features` | Left-aligned feature list |
| `.list-lease-feature` | Bullet point feature item with purple bullet |
| `.outlined-bubble` | Decorative outline circles (3px border, 0.12 opacity) |

### Pricing Policy Section
| Class | Purpose |
|-------|---------|
| `.list-pricing-policy-section` | Gray background section, 100px padding |
| `.list-pricing-container` | Max-width 1200px container |
| `.list-pricing-header` | Centered header with 64px bottom margin |
| `.list-pricing-title` | 42px title |
| `.list-pricing-formula` | 24px purple formula text |
| `.list-pricing-grid` | 3-column grid with 32px gap |
| `.list-pricing-card` | White card with hover effects |
| `.list-pricing-card-icon` | 64px purple gradient icon container with 16px radius |
| `.list-pricing-card-title` | 22px bold title |
| `.list-pricing-card-content` | 15px gray content |
| `.list-pricing-highlight` | Green highlight box (#ECFDF5 bg, #10B981 border) |
| `.list-pricing-highlight-title` | 20px green title (#059669) |
| `.list-pricing-highlight-text` | 15px green text (#047857) |
| `.circle-accent` | Decorative solid purple circles |

### CTA Section
| Class | Purpose |
|-------|---------|
| `.list-cta-section` | White background section, 100px padding |
| `.list-cta-container` | Max-width 800px centered container |
| `.list-cta-title` | 42px title |
| `.list-cta-subtitle` | 18px subtitle |
| `.list-cta-buttons` | Flex container with 16px gap |
| `.list-cta-note` | 14px italic support message |

---

## ### MODAL_CSS_CLASSES ###

### CreateDuplicateListingModal
| Class | Purpose |
|-------|---------|
| `.create-listing-modal-overlay` | Fixed fullscreen backdrop, z-index 9999 |
| `.create-listing-modal-container` | Centered modal card, max 500px, 10px radius |
| `.create-listing-header` | Header with black bottom border |
| `.create-listing-header-top` | Flex container for icon and title |
| `.create-listing-close-btn` | 32x32 X button, absolute positioned |
| `.create-listing-icon` | 24px emoji icon |
| `.create-listing-title` | 18px Inter font title |
| `.create-listing-subtitle` | 14px gray subtitle |
| `.create-listing-section` | Form section with dotted border |
| `.create-listing-label` | 14px bold label |
| `.create-listing-input` | Text input with purple border (#4B47CE) |
| `.create-listing-select` | Dropdown for listing selection |
| `.create-listing-helper` | 12px gray helper text |
| `.create-listing-buttons` | Footer with gray background (#F7F8F9) |
| `.create-listing-btn` | Base button: 36px height, 20px radius |
| `.create-listing-btn-primary` | Dark purple button (#31133D) |
| `.create-listing-btn-secondary` | Dark purple button (same as primary) |
| `.create-listing-btn-back` | Outline back button with transparent bg |

### ImportListingModal
| Class | Purpose |
|-------|---------|
| `.import-listing-modal-overlay` | Fixed fullscreen backdrop, z-index 9999 |
| `.import-listing-modal-container` | Centered modal card, max 500px |
| `.import-listing-header` | Header with icon and title |
| `.import-listing-header-top` | Flex container for icon and title |
| `.import-listing-close-btn` | 32x32 X button |
| `.import-listing-icon` | 24px emoji icon |
| `.import-listing-title` | 18px title |
| `.import-listing-section` | Form section with dotted border |
| `.import-listing-label` | 14px bold label |
| `.import-listing-input` | Text/email input with purple border |
| `.import-listing-input.input-error` | Red border on validation error (#ef4444) |
| `.error-message` | Red error text, 12px |
| `.import-listing-helper` | 12px gray helper text |
| `.import-listing-info` | Purple info box (#f3f0ff bg) |
| `.info-icon` | 20px info icon |
| `.import-listing-info-text` | 14px info text |
| `.import-listing-buttons` | Footer with gray background |
| `.import-listing-btn` | Base button: 36px height, 20px radius |
| `.import-listing-btn-primary` | Dark purple submit button |

---

## ### ANIMATIONS ###

### Hero Floating Persons
```css
@keyframes hero-float-1 {
  0%, 100% { transform: translateY(0px) translateX(0px); }
  50% { transform: translateY(-18px) translateX(12px); }
}

@keyframes hero-float-2 {
  0%, 100% { transform: translateY(0px) translateX(0px); }
  50% { transform: translateY(20px) translateX(-10px); }
}

@keyframes hero-float-3 {
  0%, 100% { transform: translateY(0px) translateX(0px); }
  50% { transform: translateY(-22px) translateX(-8px); }
}
```

### Modal Animations
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

### Hover Effects
- Floating persons: `transform: scale(1.08)` on hover
- Step cards: `transform: translateY(-4px)` on hover
- Lease cards: `transform: translateY(-8px)` on hover
- Pricing cards: `transform: translateY(-4px)` on hover
- CTA buttons: `transform: translateY(-2px)` on hover

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `< 768px` | Hero padding reduced (60px 32px, 140px top), title 36px, grids stack to 1 column, floating persons hidden |
| `< 700px` | Modal buttons 13px font, modal title 16px, modal full width |
| `< 480px` | Modal padding reduced (10px overlay, 16px sections), buttons stack vertically, full-width buttons |

---

## ### DATA_DEPENDENCIES ###

### LocalStorage
| Key | Purpose | Set By | Read By |
|-----|---------|--------|---------|
| `pendingListingName` | Stores new listing title | CreateDuplicateListingModal | SelfListingPage |

### Supabase Tables (Copy Mode Only)
| Table | Purpose |
|-------|---------|
| `zat_listings` | Insert duplicated listing |
| `zat_user` | Update profile completeness (tasksCompleted array) |

### External CDN Images
```
https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/...
- brad circle.png (Hero person 1, 120x120)
- arvind-image-success-story.jpg (Hero person 2, 90x90)
- Emily Johnson - Fake Profile Photo.jfif (Hero person 3, 110x110)
```

---

## ### KEY_IMPORTS ###

```javascript
// Page Component
import { useState } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import CreateDuplicateListingModal from '../shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx';
import ImportListingModal from '../shared/ImportListingModal/ImportListingModal.jsx';
import { SIGNUP_LOGIN_URL } from '../../lib/constants.js';

// Modal - CreateDuplicateListingModal
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { showToast } from '../Toast.jsx';
import '../../../styles/components/create-listing-modal.css';

// Modal - ImportListingModal
import { useState, useEffect } from 'react';
import '../../../styles/components/import-listing-modal.css';
```

---

## ### WORKFLOW_DIAGRAMS ###

### New Listing Creation Flow
```
     List With Us Page
  Click "Start New Listing"
            |
            v
  CreateDuplicateListingModal
  (viewMode: 'create')

  Enter listing title
  Click "Create New"
            |
            v
  localStorage.setItem(
    'pendingListingName',
    title
  )
            |
            v
  onClose() - Modal closes
  Toast: "Redirecting..."
            |
            v (500ms delay)
  window.location.href =
  '/self-listing.html'
```

### Import Listing Flow
```
     List With Us Page
  Click "Import My Listing"
            |
            v
     ImportListingModal

  1. Enter listing URL
  2. Enter email address
  3. Click "Import Listing"
            |
            v
  Form Validation
  - URL not empty
  - Valid email format
            |
            v (if valid)
  Parent onSubmit callback

  Currently:
  - console.log data
  - 2s simulated delay
  - alert success message
            |
            v
  Close modal
```

---

## ### COMPONENT_PATTERN ###

**Note:** ListWithUsPage does NOT use the Hollow Component Pattern.
- Business logic is minimal (modal state toggling)
- No separate useListWithUsPageLogic hook
- State managed inline with useState
- Primary purpose is content display with CTA modals

---

## ### ACCESSIBILITY ###

### ImportListingModal A11y Attributes
| Element | Attribute | Value |
|---------|-----------|-------|
| Modal overlay | `role` | "dialog" |
| Modal overlay | `aria-modal` | "true" |
| Modal overlay | `aria-labelledby` | "modal-title" |
| Title | `id` | "modal-title" |
| Form | `aria-label` | "Import listing form" |
| Input | `aria-invalid` | "true"/"false" based on error |
| Input | `aria-describedby` | error ID or help ID |
| Error message | `role` | "alert" |
| Close button | `aria-label` | "Close modal" |
| Submit button | `aria-label` | Loading state description |
| Info box | `role` | "note" |
| Info box | `aria-label` | "Import information" |

### CreateDuplicateListingModal A11y Attributes
| Element | Attribute | Value |
|---------|-----------|-------|
| Close button | `aria-label` | "Close modal" |

### Keyboard Navigation
- **Escape**: Closes both modals
- **Tab**: Navigate form fields
- **Enter**: Submit form (ImportListingModal)
- **Click outside**: Closes both modals (overlay click)

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Modal not opening | Verify state handler: `setShowCreateListingModal(true)` |
| Redirect not working | Check localStorage 'pendingListingName' is set |
| Copy option not showing | User must be logged in (`currentUser` not null) AND have existing listings |
| Import not submitting | Check form validation, email format regex |
| Floating persons missing | Check media query (< 768px hides them) |
| Styling broken | Verify CSS imports in list-with-us.html |
| Toast not appearing | Check `showToast` import from Toast.jsx |
| Body scroll locked | ImportListingModal sets `document.body.style.overflow = 'hidden'` |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| Self-Listing Page | `app/src/islands/pages/SelfListingPage/` |
| App CLAUDE.md | `app/CLAUDE.md` |
| Constants | `app/src/lib/constants.js` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Routing Guide | `.claude/Documentation/Routing/ROUTING_GUIDE.md` |
| Toast Component | `app/src/islands/shared/Toast.jsx` |
| Supabase Client | `app/src/lib/supabase.js` |

---

## ### FUTURE_ENHANCEMENTS ###

### TODO Items in Code
1. **ImportListingModal onSubmit**: Currently uses simulated delay + alert
   - Location: `ListWithUsPage.jsx:240-253`
   - Needs: Actual API integration for listing import (currently sends to Slack for processing)

2. **Bubble Integration**: `createListingInCode` commented out
   - Location: `CreateDuplicateListingModal.jsx:20-21`
   - Needs: Re-enable when Bubble integration restored

### Potential Improvements
- Add authentication check before showing modals
- Pre-fill email in ImportListingModal when logged in (prop exists but not used in ListWithUsPage)
- Add listing import status tracking
- Connect duplicate flow to actual user's listings
- Add loading state spinner to Create New flow
- Implement proper API call for import instead of console.log + alert

---

**VERSION**: 2.0
**LAST_UPDATED**: 2025-12-11
**STATUS**: Updated to match current implementation
