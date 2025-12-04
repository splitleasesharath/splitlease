# List With Us Page - Quick Reference

**GENERATED**: 2025-12-04
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
| `app/public/list-with-us.html` | Static HTML with CSS imports and module script |

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
| `app/src/styles/list-with-us.css` | Main page styling (660 lines) |
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
/self-listing.html    # After "Create New" ’ redirect destination
/faq.html             # "General Questions" link in CTA section
```

---

## ### PAGE_SECTIONS ###

### 1. Hero Section
| Element | Content |
|---------|---------|
| Badge | "Turn Unused Nights Into Income" |
| Title | "List Your Property / Start Earning Today" |
| Subtitle | Join Split Lease and transform... |
| CTA Primary | "Start New Listing" ’ Opens CreateDuplicateListingModal |
| CTA Secondary | "Import My Listing" ’ Opens ImportListingModal |
| Visual Elements | 3 floating person images with hover animations |

### 2. How It Works Section
| Step | Title | Description |
|------|-------|-------------|
| 1 | Property Details | Address, name, bedrooms, amenities |
| 2 | Rental Period & Pricing Strategy | Nightly/Weekly/Monthly, competitive price |
| 3 | House Rules & Photo Portfolio | Guest expectations, 3+ quality photos |

### 3. Lease Styles Section
| Style | Pattern | Example | Key Features |
|-------|---------|---------|--------------|
| Nightly | Nights-of-the-week | every Thurs-Sun Aug-Dec | Guest uses certain nights weekly, host defines $/night |
| Weekly | Weeks-of-the-month | two weeks on/off Aug-Dec | Guest uses certain weeks monthly, host defines $/wk |
| Monthly | Month-to-month | continuous stay Aug-Dec | All nights for guest, SL subleases unused, host defines $/month |

### 4. Pricing Policy Section
| Card | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | $ | Guest Payment | Guest always pays Nightly, regardless of Rental Style |
| 2 | checkmark | No Charges to Host | Compensation as defined in Listing |
| 3 | calendar | Payment Schedule | Nightly/Weekly: every 28 days; Monthly: every 31 days |
| Highlight | - | Additional Costs | 8-14% markup for CC fees, insurance, platform costs |

### 5. CTA Section
| Element | Content |
|---------|---------|
| Title | "Start New Listing" |
| Subtitle | "Takes less than a minute to do!" |
| CTA Primary | "Create Your Listing" ’ Opens CreateDuplicateListingModal |
| CTA Secondary | "General Questions" ’ Links to /faq.html |
| Note | Support team help message |

---

## ### MODAL_FLOWS ###

### CreateDuplicateListingModal

**Two View Modes:**

#### Create Mode (Default)
```
1. User enters listing title
2. Clicks "Create New"
3. Title stored in localStorage as 'pendingListingName'
4. Toast: "Redirecting to listing form..."
5. Redirect to /self-listing.html (500ms delay)
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

### ImportListingModal

**Single View Flow:**
```
1. User enters listing URL (Airbnb, VRBO, etc.)
2. User enters email address
3. Form validates URL is not empty, email is valid format
4. Clicks "Import Listing"
5. Parent onSubmit callback handles API call
6. Loading state during submission
7. Toast on success/error
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

---

## ### CSS_CLASSES ###

### Hero Section
| Class | Purpose |
|-------|---------|
| `.list-hero-section` | Hero container with white bg, 180px top padding |
| `.list-hero-container` | Content wrapper, max-width 1200px |
| `.list-hero-badge` | Purple outline badge pill |
| `.list-hero-title` | 56px bold headline |
| `.list-hero-title .highlight` | Purple highlight text |
| `.list-hero-subtitle` | 20px gray subtitle |
| `.list-hero-cta` | Flex container for CTA buttons |
| `.floating-person` | Absolute positioned circular images |
| `.hero-person-1/2/3` | Individual floating person positions |

### CTA Buttons
| Class | Style |
|-------|-------|
| `.cta-button` | Base: 16px padding, 500px radius, 16px font |
| `.cta-primary` | Purple gradient bg, white text |
| `.cta-primary:hover` | Pink gradient, shadow, lift -2px |
| `.cta-secondary` | White bg, purple border, purple text |
| `.cta-secondary:hover` | Light gray bg, shadow, lift -2px |

### How It Works Section
| Class | Purpose |
|-------|---------|
| `.list-how-it-works` | Gray background section |
| `.list-steps-grid` | 3-column grid |
| `.list-step-card` | White card with border |
| `.list-step-number` | Purple gradient circle with number |
| `.list-step-title` | Step heading |
| `.list-step-description` | Step body text |
| `.gradient-blob` | Decorative blurred background circles |

### Lease Styles Section
| Class | Purpose |
|-------|---------|
| `.list-lease-styles-section` | White background section |
| `.list-lease-grid` | 3-column grid |
| `.list-lease-card` | Card with hover lift effect |
| `.list-lease-type` | Large purple type name |
| `.list-lease-pattern` | Pattern description |
| `.list-lease-example` | Gray italic example text |
| `.list-lease-separator` | Purple gradient divider line |
| `.list-lease-feature` | Bullet point feature item |
| `.outlined-bubble` | Decorative outline circles |

### Pricing Policy Section
| Class | Purpose |
|-------|---------|
| `.list-pricing-policy-section` | Gray background section |
| `.list-pricing-grid` | 3-column grid |
| `.list-pricing-card` | Pricing info card |
| `.list-pricing-card-icon` | Purple gradient icon container |
| `.list-pricing-formula` | Purple formula text |
| `.list-pricing-highlight` | Green highlight box |
| `.circle-accent` | Decorative solid circles |

### CTA Section
| Class | Purpose |
|-------|---------|
| `.list-cta-section` | Final CTA section |
| `.list-cta-container` | Max-width 800px centered |
| `.list-cta-buttons` | Button container |
| `.list-cta-note` | Italic support message |

---

## ### MODAL_CSS_CLASSES ###

### CreateDuplicateListingModal
| Class | Purpose |
|-------|---------|
| `.create-listing-modal-overlay` | Fixed fullscreen backdrop |
| `.create-listing-modal-container` | Centered modal card, max 500px |
| `.create-listing-header` | Header with icon, title, subtitle |
| `.create-listing-close-btn` | X button, absolute positioned |
| `.create-listing-section` | Form section with dotted border |
| `.create-listing-input` | Text input, purple border |
| `.create-listing-select` | Dropdown for listing selection |
| `.create-listing-buttons` | Footer with gray background |
| `.create-listing-btn-primary` | Purple rounded button |
| `.create-listing-btn-secondary` | Purple rounded button |
| `.create-listing-btn-back` | Outline back button |

### ImportListingModal
| Class | Purpose |
|-------|---------|
| `.import-listing-modal-overlay` | Fixed fullscreen backdrop |
| `.import-listing-modal-container` | Centered modal card, max 500px |
| `.import-listing-header` | Header with icon and title |
| `.import-listing-section` | Form section with dotted border |
| `.import-listing-input` | Text/email input, purple border |
| `.import-listing-input.input-error` | Red border on validation error |
| `.error-message` | Red error text |
| `.import-listing-info` | Purple info box |
| `.import-listing-btn-primary` | Purple submit button |

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

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `< 768px` | Hero padding reduced, title 36px, grids stack to 1 column, floating persons hidden |
| `< 700px` | Modal buttons smaller (13px), modal title 16px, modal full width |
| `< 480px` | Modal padding reduced, buttons stack vertically, full-width buttons |

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
| `zat_user` | Update profile completeness |

### External CDN Images
```
https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/...
- brad circle.png (Hero person 1)
- arvind-image-success-story.jpg (Hero person 2)
- Emily Johnson - Fake Profile Photo.jfif (Hero person 3)
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
import { supabase } from '../../../lib/supabase.js';
import { showToast } from '../Toast.jsx';
import '../../../styles/components/create-listing-modal.css';

// Modal - ImportListingModal
import '../../../styles/components/import-listing-modal.css';
```

---

## ### WORKFLOW_DIAGRAMS ###

### New Listing Creation Flow
```
                                 
     List With Us Page           
  Click "Start New Listing"      
            ,                    
             
             ¼
                                 
  CreateDuplicateListingModal    
  (viewMode: 'create')           
                                 
  Enter listing title            
  Click "Create New"             
            ,                    
             
             ¼
                                 
  localStorage.setItem(          
    'pendingListingName',        
    title                        
  )                              
            ,                    
             
             ¼
                                 
  Toast: "Redirecting..."        
            ,                    
              500ms delay
             ¼
                                 
  Redirect to /self-listing.html 
  (Multi-step listing form)      
                                 
```

### Import Listing Flow
```
                                 
     List With Us Page           
  Click "Import My Listing"      
            ,                    
             
             ¼
                                 
     ImportListingModal          
                                 
  1. Enter listing URL           
  2. Enter email address         
  3. Click "Import Listing"      
            ,                    
             
             ¼
                                 
  Form Validation                
  - URL not empty                
  - Valid email format           
            ,                    
             
             ¼ (if valid)
                                 
  Parent onSubmit callback       
  (TODO: Implement API call)     
                                 
  Currently:                     
  - console.log data             
  - 2s simulated delay           
  - alert success message        
            ,                    
             
             ¼
                                 
  Close modal                    
                                 
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
| Modal container | `role` | "dialog" |
| Modal container | `aria-modal` | "true" |
| Modal container | `aria-labelledby` | "modal-title" |
| Title | `id` | "modal-title" |
| Form | `aria-label` | "Import listing form" |
| Input | `aria-invalid` | "true"/"false" based on error |
| Input | `aria-describedby` | error ID or help ID |
| Error message | `role` | "alert" |
| Close button | `aria-label` | "Close modal" |
| Submit button | `aria-label` | Loading state description |

### Keyboard Navigation
- **Escape**: Closes both modals
- **Tab**: Navigate form fields
- **Enter**: Submit form (ImportListingModal)

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Modal not opening | Verify state handler: `setShowCreateListingModal(true)` |
| Redirect not working | Check localStorage 'pendingListingName' is set |
| Copy option not showing | User must be logged in AND have existing listings |
| Import not submitting | Check form validation, email format |
| Floating persons missing | Check media query (< 768px hides them) |
| Styling broken | Verify CSS imports in list-with-us.html |
| Toast not appearing | Check `showToast` import from Toast.jsx |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| Self-Listing Page | `app/src/islands/pages/SelfListingPage/` |
| App CLAUDE.md | `app/CLAUDE.md` |
| Constants | `app/src/lib/constants.js` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Routing Guide | `Documentation/ROUTING_GUIDE.md` |

---

## ### FUTURE_ENHANCEMENTS ###

### TODO Items in Code
1. **ImportListingModal onSubmit**: Currently uses simulated delay + alert
   - Location: `ListWithUsPage.jsx:240-253`
   - Needs: Actual API integration for listing import

2. **Bubble Integration**: `createListingInCode` commented out
   - Location: `CreateDuplicateListingModal.jsx:20-21`
   - Needs: Re-enable when Bubble integration restored

### Potential Improvements
- Add authentication check before showing modals
- Pre-fill email in ImportListingModal when logged in
- Add listing import status tracking
- Connect duplicate flow to actual user's listings

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Comprehensive initial documentation
