# COMPREHENSIVE FIX PLAN: Split Lease React Islands Styling
## Root Cause Analysis & Step-by-Step Resolution

**Date**: 2025-11-08
**Architecture**: ESM + React Islands (Vite, Cloudflare Pages, Supabase)
**Issue**: Current React implementation is functionally correct but visually unstyled compared to working input page

---

## EXECUTIVE SUMMARY

### The Problem
The current React app at `http://localhost:5173` appears completely unstyled (white background, black text, no purple branding) compared to the polished working input page which has:
- Purple header and footer (#31135D)
- Styled hero section with illustrations
- Animated schedule cards with Lottie
- Professional property listing cards
- Complete responsive design

### Root Cause Identified
**The React app is missing 2,953 lines of component-specific CSS.**

The working input page has all styling in a single 3,851-line `styles.css` file. The React migration created:
- ✅ `app/src/styles/variables.css` (261 lines) - CSS custom properties
- ✅ `app/src/styles/main.css` (637 lines) - Global resets and typography
- ❌ **Component-specific styles (2,953 lines) - COMPLETELY MISSING**

### Impact
- **Console Errors**: Minimal (only React dev warnings + favicon 404)
- **JavaScript Functionality**: Working correctly
- **Visual Appearance**: 0% styled (missing all component CSS)
- **User Experience**: Broken (looks like an unstyled HTML document)

---

## VISUAL EVIDENCE

### Screenshots Captured via Playwright

**Current Implementation** (`.playwright-mcp/current-app-screenshot.png`):
- White background throughout
- Black unstyled text
- No header styling
- No purple branding
- Emoji placeholders instead of Lottie animations
- Gradient placeholders instead of property images
- Completely unstyled day selector
- No card shadows or hover effects

**Working Input Page** (`.playwright-mcp/working-input-screenshot.png`):
- Purple header (#31135D) with white text and navigation
- Light purple hero background with Brooklyn Bridge & Empire State illustrations
- Styled day selector with purple active states (#5B5FCF)
- Animated schedule cards with Lottie animations
- Professional property cards with images
- Purple footer with referral section
- Complete responsive design
- Professional shadows, hover effects, transitions

---

## ARCHITECTURE COMPLIANCE

### Current Structure (Follows ESM + React Islands Pattern ✓)

```
app/
├── index.html                    # Static HTML entry point ✓
│   ├── <link href="/src/styles/main.css"> ✓
│   └── <script type="module" src="/src/main.jsx"> ✓
├── src/
│   ├── main.jsx                  # React root (4 lines) ✓
│   ├── islands/
│   │   ├── pages/
│   │   │   └── HomePage.jsx      # Page island (728 lines) ✓
│   │   └── shared/
│   │       ├── Header.jsx        # Shared component ✓
│   │       ├── Footer.jsx        # Shared component ✓
│   │       └── DaySelector.jsx   # Shared component ✓
│   ├── lib/
│   │   ├── supabase.js          # Supabase client ✓
│   │   ├── constants.js          # App constants ✓
│   │   └── auth.js               # Auth utilities ✓
│   └── styles/
│       ├── main.css              # Global styles (637 lines) ✓
│       └── variables.css         # CSS custom properties (261 lines) ✓
└── public/
    └── assets/
        ├── images/               # EMPTY - Missing hero images! ❌
        └── lotties/              # Lottie animation files ✓
```

**Architecture Assessment**: ✅ Structure is CORRECT
**Problem**: CSS organization is incomplete (missing component styles)

---

## DETAILED FILE COMPARISON

### Working Input Page Structure

```
input/index/
├── index.html                    # 482 lines - Complete page structure
├── styles.css                    # 3,851 lines - ALL STYLES IN ONE FILE
├── script.js                     # 2,161 lines - All functionality
└── assets/
    └── images/
        ├── hero-left.png         # Brooklyn Bridge illustration
        ├── hero-right.png        # Empire State Building illustration
        └── logo.png              # Split Lease logo
```

### CSS Line Count Breakdown

| Component | Input Page (`styles.css`) | React App | Missing |
|-----------|---------------------------|-----------|---------|
| **Global Resets** | 95 lines | 637 lines (main.css) | ✅ Complete |
| **CSS Variables** | Inline | 261 lines (variables.css) | ✅ Complete |
| **Header** | 282 lines (98-380) | 0 lines | ❌ **282 lines** |
| **Hero Section** | 192 lines (383-575) | 0 lines | ❌ **192 lines** |
| **Day Selector** | 138 lines (577-715) | 0 lines | ❌ **138 lines** |
| **Schedule Cards** | 184+ lines (716-900+) | 0 lines | ❌ **184 lines** |
| **Value Props** | 150+ lines | 0 lines | ❌ **150 lines** |
| **Benefits Section** | 120+ lines | 0 lines | ❌ **120 lines** |
| **Listings/Cards** | 300+ lines (1195+) | 0 lines | ❌ **300 lines** |
| **Support Section** | 100+ lines | 0 lines | ❌ **100 lines** |
| **Footer** | 250+ lines (1400+) | 0 lines | ❌ **250 lines** |
| **Modal/Dropdowns** | 200+ lines | 0 lines | ❌ **200 lines** |
| **Floating Badge** | 80+ lines | 0 lines | ❌ **80 lines** |
| **Mobile/Responsive** | 1,093 lines (2757-3850) | 0 lines | ❌ **1,093 lines** |
| **Animations** | 150+ lines | 0 lines | ❌ **150 lines** |
| **TOTAL** | **3,851 lines** | **898 lines** | ❌ **2,953 lines** |

---

## CONSOLE ERROR ANALYSIS

### Current React App Console (http://localhost:5173)

```javascript
[DEBUG] [vite] connecting...
[DEBUG] [vite] connected.
[INFO] Download the React DevTools for a better development experience
[ERROR] Warning: A future version of React will block javascript: URLs as a security precaution
[LOG] 🔍 Checking authentication status...
[LOG] 🔐 Split Lease Cookie Auth Check:
[LOG]    Logged In: false
[LOG]    Username: not set
[LOG]    Raw Cookies: {loggedInCookie: undefined, usernameCookie: undefined}
[LOG] ❌ User not authenticated
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) @ http://localhost:5173/favicon.ico (2 occurrences)
```

**Analysis**:
- ❌ React warning: `javascript:` URLs in Header.jsx (line reference needed)
- ❌ Missing favicon.ico (non-critical)
- ✅ No CSS loading errors
- ✅ No JavaScript module errors
- ✅ No CORS errors
- ✅ Vite HMR connected successfully
- ✅ Authentication logic working

**Severity**: LOW - No critical errors, app is functional

### Working Input Page Console (file:///)

```javascript
[LOG] updateCheckinCheckout called with selectedDays: [1, 2, 3, 4, 5]
[LOG] areDaysContinuous called with: [1, 2, 3, 4, 5]
[LOG] -> Sorted days: [1, 2, 3, 4, 5]
[LOG] -> Regular continuous check passed
[LOG] areDaysContinuous result: true
[LOG] Setting up intent detection for smart preloading...
[LOG] Intent detection setup complete
[LOG] ⏰ Scheduling Market Research iframe preload in 4 seconds...
[LOG] 🔍 Checking authentication status...
[LOG] 🔐 Split Lease Cookie Auth Check:
[LOG]    Logged In: false
[LOG]    Username: not set
[LOG]    Raw Cookies: {loggedInCookie: undefined, usernameCookie: undefined}
[LOG] ❌ User not authenticated
[LOG] Intent: User idle for 3s (+15) Total: 15
[LOG] 🏃 Starting delayed preload now...
[LOG] 🚀 Starting to preload Market Research iframe...
```

**Analysis**:
- ✅ Zero errors
- ✅ Zero warnings
- ✅ Rich logging for debugging
- ✅ Intent detection system active
- ✅ Advanced preloading logic

---

## MISSING ASSETS INVENTORY

### Images Missing from `app/public/assets/images/`

| Asset | Source Location | Destination | Status |
|-------|-----------------|-------------|--------|
| `hero-left.png` | `input/index/assets/images/hero-left.png` | `app/public/assets/images/hero-left.png` | ❌ Missing |
| `hero-right.png` | `input/index/assets/images/hero-right.png` | `app/public/assets/images/hero-right.png` | ❌ Missing |
| `logo.png` | `input/index/assets/images/logo.png` | `app/public/assets/images/logo.png` | ❌ Missing |
| `favicon.ico` | Create new | `app/public/favicon.ico` | ❌ Missing |

### Lottie Animations Status

**Current Status**: Unknown - need to verify if Lottie files exist in `app/public/assets/lotties/`

**Working Page Uses**:
- Calendar animation for schedule cards
- Atom animation for floating badge
- Loading animations

---

## FIX PLAN: STEP-BY-STEP IMPLEMENTATION

### Phase 1: Extract Component Styles (PRIORITY 1)

**Objective**: Extract component-specific CSS from `input/index/styles.css` and organize for React Islands architecture.

**Strategy**: Create modular component CSS files that can be imported into `main.css`.

#### Step 1.1: Create Component CSS Directory

```bash
mkdir -p app/src/styles/components
```

#### Step 1.2: Extract Component Styles

Create the following CSS files by extracting from `input/index/styles.css`:

**File**: `app/src/styles/components/header.css`
- **Source**: Lines 98-380 from `input/index/styles.css`
- **Content**: Header layout, navigation, dropdown menus, mobile hamburger
- **Key Classes**: `.main-header`, `.nav-dropdown`, `.header-logo`, `.nav-links`

**File**: `app/src/styles/components/hero.css`
- **Source**: Lines 383-575 from `input/index/styles.css`
- **Content**: Hero section layout, background gradient, illustration positioning
- **Key Classes**: `.hero-section`, `.hero-content`, `.hero-illustrations`

**File**: `app/src/styles/components/day-selector.css`
- **Source**: Lines 577-715 from `input/index/styles.css`
- **Content**: Day badge styling, active states, check-in/checkout display
- **Key Classes**: `.day-selector`, `.day-badge`, `.day-badge.active`, `.checkin-checkout`

**File**: `app/src/styles/components/schedule.css`
- **Source**: Lines 716-900+ from `input/index/styles.css`
- **Content**: Schedule cards, Lottie containers, explore buttons
- **Key Classes**: `.schedule-section`, `.schedule-card`, `.lottie-container`

**File**: `app/src/styles/components/value-props.css`
- **Source**: Extract value propositions section
- **Content**: Value prop cards, icons, grid layout
- **Key Classes**: `.value-props`, `.value-card`

**File**: `app/src/styles/components/benefits.css`
- **Source**: Extract benefits section
- **Content**: Checkmark list, purple accents
- **Key Classes**: `.benefits-section`, `.benefits-list`

**File**: `app/src/styles/components/listings.css`
- **Source**: Lines 1195+ from `input/index/styles.css`
- **Content**: Property cards, image styling, hover effects
- **Key Classes**: `.listing-card`, `.listing-images`, `.listing-content`

**File**: `app/src/styles/components/support.css`
- **Source**: Extract support section
- **Content**: Support card grid, icons
- **Key Classes**: `.support-section`, `.support-card`

**File**: `app/src/styles/components/footer.css`
- **Source**: Lines 1400+ from `input/index/styles.css`
- **Content**: Footer layout, referral section, app download cards
- **Key Classes**: `.main-footer`, `.footer-columns`, `.referral-section`

**File**: `app/src/styles/components/floating-badge.css`
- **Source**: Extract floating badge styles
- **Content**: Fixed positioning, Lottie animation, expand effect
- **Key Classes**: `.floating-badge`, `.badge-expanded`

**File**: `app/src/styles/components/modal.css`
- **Source**: Extract modal/dialog styles
- **Content**: Modal backdrop, container, close button
- **Key Classes**: `.modal`, `.modal-backdrop`, `.modal-content`

**File**: `app/src/styles/components/mobile.css`
- **Source**: Lines 2757-3850 from `input/index/styles.css`
- **Content**: All media queries and responsive styles
- **Media Queries**: `@media (max-width: 768px)`, `@media (max-width: 480px)`

#### Step 1.3: Import Component Styles in main.css

**File**: `app/src/styles/main.css`

Add after line 10 (after variables.css import):

```css
/* Component Styles */
@import url('components/header.css');
@import url('components/hero.css');
@import url('components/day-selector.css');
@import url('components/schedule.css');
@import url('components/value-props.css');
@import url('components/benefits.css');
@import url('components/listings.css');
@import url('components/support.css');
@import url('components/footer.css');
@import url('components/floating-badge.css');
@import url('components/modal.css');
@import url('components/mobile.css');
```

---

### Phase 2: Copy Missing Assets (PRIORITY 2)

**Objective**: Copy hero images and logo from input to app public directory.

#### Step 2.1: Copy Image Assets

```bash
# Create images directory if it doesn't exist
mkdir -p "app/public/assets/images"

# Copy hero images
cp "input/index/assets/images/hero-left.png" "app/public/assets/images/hero-left.png"
cp "input/index/assets/images/hero-right.png" "app/public/assets/images/hero-right.png"
cp "input/index/assets/images/logo.png" "app/public/assets/images/logo.png"
```

#### Step 2.2: Create Favicon

**Option A**: Convert logo.png to favicon.ico using online tool
**Option B**: Create a simple purple square favicon with "SL" text

**Destination**: `app/public/favicon.ico`

**Update HTML**: Add to `app/index.html` in `<head>`:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico">
```

---

### Phase 3: Fix Asset References in JSX (PRIORITY 3)

**Objective**: Update HomePage.jsx to reference correct asset paths.

**File**: `app/src/islands/pages/HomePage.jsx`

#### Step 3.1: Update Hero Illustration Paths

Find the hero section (around line 138-145) and update image paths:

```jsx
// BEFORE (if using placeholder):
<div className="hero-illustration-left">
  <img src="/placeholder.svg" alt="NYC Bridge" />
</div>

// AFTER:
<div className="hero-illustration-left">
  <img src="/assets/images/hero-left.png" alt="Brooklyn Bridge" />
</div>

<div className="hero-illustration-right">
  <img src="/assets/images/hero-right.png" alt="Empire State Building" />
</div>
```

#### Step 3.2: Update Logo Reference in Header

**File**: `app/src/islands/shared/Header.jsx`

```jsx
// BEFORE:
<img src="/logo-placeholder.svg" alt="Split Lease" />

// AFTER:
<img src="/assets/images/logo.png" alt="Split Lease" />
```

---

### Phase 4: Fix React Warnings (PRIORITY 4)

**Objective**: Eliminate `javascript:` URL warning.

**File**: `app/src/islands/shared/Header.jsx`

#### Step 4.1: Remove javascript: URLs

Find all instances of `href="javascript:void(0)"` and replace:

```jsx
// BEFORE:
<a href="javascript:void(0)" onClick={handleClick}>Link</a>

// AFTER (Option 1 - Use button):
<button onClick={handleClick} className="link-button">Link</button>

// AFTER (Option 2 - Use # with preventDefault):
<a
  href="#"
  onClick={(e) => {
    e.preventDefault();
    handleClick();
  }}
>
  Link
</a>
```

Add button styling if using Option 1:

```css
/* app/src/styles/components/header.css */
.link-button {
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}
```

---

### Phase 5: Verify Lottie Animations (PRIORITY 5)

**Objective**: Ensure Lottie animations are properly configured.

#### Step 5.1: Check Lottie Files Exist

```bash
ls -la "app/public/assets/lotties/"
```

Expected files (based on constants.js):
- `atom animation.json`
- `Animation - 1722533570126.json` (Parsing)
- `Animation - 1720724343172.lottie` (Loading)
- `Report.json` (Success)
- `atom white.json`

#### Step 5.2: Verify Lottie Player Library

Check if Lottie player is loaded in HTML or component:

**File**: `app/src/islands/pages/HomePage.jsx` (around line 284-300)

Verify the Lottie player script is being loaded:

```javascript
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
  script.async = true;
  document.body.appendChild(script);

  return () => {
    document.body.removeChild(script);
  };
}, []);
```

---

### Phase 6: Testing & Validation (PRIORITY 6)

**Objective**: Verify all fixes are working correctly.

#### Step 6.1: Visual Regression Test

**Tool**: Playwright MCP

```javascript
// Compare before/after screenshots
1. Navigate to http://localhost:5173
2. Take screenshot: "after-fixes-screenshot.png"
3. Compare with ".playwright-mcp/working-input-screenshot.png"
4. Verify purple theme is visible
5. Verify hero images are displayed
6. Verify day selector styling
7. Verify schedule cards have animations
```

#### Step 6.2: Console Error Check

**Expected Console State After Fixes**:
- ✅ Zero React warnings
- ✅ Zero 404 errors
- ✅ All assets loading successfully
- ✅ Vite HMR connected

#### Step 6.3: Functional Testing Checklist

- [ ] Day selector toggles work
- [ ] Schedule card buttons navigate to search page
- [ ] Featured listings click navigates to view page
- [ ] Header navigation dropdowns work
- [ ] Footer links are clickable
- [ ] Floating badge expands on hover
- [ ] Mobile responsive design works (resize browser)
- [ ] Lottie animations play on load

---

## EXPECTED OUTCOMES

### Before Fixes
- White background everywhere
- Black unstyled text
- No purple branding
- No images or animations
- Looks like plain HTML document

### After Fixes
- Purple header (#31135D) with white text
- Light purple hero background with illustrations
- Styled day selector with purple active states
- Animated schedule cards
- Professional property cards
- Purple footer
- Complete visual parity with working input page

---

## ROLLBACK PLAN

If fixes cause issues:

1. **Rollback CSS Changes**:
   ```bash
   git checkout app/src/styles/main.css
   rm -rf app/src/styles/components/
   ```

2. **Rollback Asset Changes**:
   ```bash
   git checkout app/src/islands/pages/HomePage.jsx
   git checkout app/src/islands/shared/Header.jsx
   ```

3. **Remove Copied Assets**:
   ```bash
   rm -rf app/public/assets/images/
   ```

---

## TIMELINE ESTIMATE

| Phase | Task | Time Estimate |
|-------|------|---------------|
| 1.1 | Create component CSS directory | 1 min |
| 1.2 | Extract 12 component CSS files | 45-60 min |
| 1.3 | Import components in main.css | 2 min |
| 2.1 | Copy image assets | 2 min |
| 2.2 | Create favicon | 5 min |
| 3.1 | Update asset paths in HomePage.jsx | 5 min |
| 3.2 | Update logo path in Header.jsx | 2 min |
| 4.1 | Fix javascript: URL warnings | 10 min |
| 5.1 | Verify Lottie files | 5 min |
| 5.2 | Check Lottie player integration | 5 min |
| 6.1 | Visual regression testing | 10 min |
| 6.2 | Console error verification | 5 min |
| 6.3 | Functional testing | 15 min |
| **TOTAL** | | **112-127 minutes (~2 hours)** |

---

## SUCCESS CRITERIA

### Visual Parity
- ✅ Purple header and footer match working page
- ✅ Hero section has light purple background
- ✅ Hero illustrations visible (Brooklyn Bridge, Empire State)
- ✅ Day selector has purple active states
- ✅ Schedule cards have proper styling
- ✅ Property cards match working page design
- ✅ Responsive design works on mobile

### Technical Health
- ✅ Zero console errors
- ✅ Zero console warnings
- ✅ All assets load successfully (no 404s)
- ✅ Vite HMR working
- ✅ React DevTools shows component tree

### Functional Requirements
- ✅ All navigation links work
- ✅ Day selector toggles correctly
- ✅ Schedule buttons navigate to search page
- ✅ Property cards navigate to view page
- ✅ Lottie animations play
- ✅ Authentication check runs successfully

---

## ARCHITECTURAL NOTES

### Following ESM + React Islands Pattern ✅

This fix plan maintains the established architecture:

1. **Static HTML Entry Points**: `app/index.html` remains the entry point
2. **React Islands**: HomePage.jsx mounts to `#home-page` div
3. **Shared Components**: Header, Footer, DaySelector remain reusable
4. **ESM Modules**: All imports use explicit .js/.jsx extensions
5. **Vite Build System**: CSS imported via `<link>` in HTML, processed by Vite
6. **CSS Organization**: Modular component CSS files with @import
7. **Public Assets**: Images served from `/assets/` via Vite public directory

### Not Breaking Architecture ✅

- ✅ Not changing build configuration
- ✅ Not changing routing approach
- ✅ Not adding CSS-in-JS
- ✅ Not adding CSS modules
- ✅ Not changing component structure
- ✅ Not adding new dependencies
- ✅ Not changing ESM import patterns

### Future-Proof for SSR ✅

When migrating to Cloudflare Workers SSR:
- CSS will still be static files (no runtime dependency)
- Component imports remain the same
- Asset paths will work with Workers static assets
- No React-specific CSS tooling to migrate

---

## ADDITIONAL RECOMMENDATIONS

### Code Quality Improvements

1. **TypeScript Migration** (Future):
   - Add type safety to component props
   - Prevent runtime errors
   - Better IDE autocomplete

2. **CSS Variables Usage**:
   - Ensure all component CSS uses variables from `variables.css`
   - Example: Use `var(--primary-purple)` instead of hardcoded `#31135D`

3. **Component Documentation**:
   - Add JSDoc comments to components
   - Document prop types
   - Add usage examples

### Performance Optimizations

1. **Image Optimization**:
   - Convert hero PNGs to WebP format
   - Add width/height attributes
   - Implement lazy loading for below-fold images

2. **CSS Optimization**:
   - Remove unused CSS (after extraction)
   - Minimize media query duplication
   - Use CSS containment for performance

3. **Lottie Optimization**:
   - Lazy load Lottie player script
   - Only load animations when visible
   - Reduce animation file sizes if possible

---

## APPENDIX A: FILE REFERENCE MAP

| Input File | Line Range | Component | React CSS File |
|------------|------------|-----------|----------------|
| `input/index/styles.css` | 1-97 | Global/Reset | `app/src/styles/main.css` |
| `input/index/styles.css` | 98-380 | Header | `app/src/styles/components/header.css` |
| `input/index/styles.css` | 383-575 | Hero | `app/src/styles/components/hero.css` |
| `input/index/styles.css` | 577-715 | Day Selector | `app/src/styles/components/day-selector.css` |
| `input/index/styles.css` | 716-900+ | Schedule | `app/src/styles/components/schedule.css` |
| `input/index/styles.css` | 1195+ | Listings | `app/src/styles/components/listings.css` |
| `input/index/styles.css` | 1400+ | Footer | `app/src/styles/components/footer.css` |
| `input/index/styles.css` | 2757-3850 | Mobile | `app/src/styles/components/mobile.css` |

---

## APPENDIX B: Color Palette Reference

```css
/* Primary Colors */
--primary-purple: #31135D;        /* Dark purple (header, footer) */
--primary-hover: #251047;         /* Darker purple (hover states) */
--accent-purple: rgb(140, 104, 238); /* Bright purple (accents) */

/* Day Selector */
--day-active: #5B5FCF;           /* Medium purple (selected days) */
--day-hover: rgb(91, 95, 207, 0.1); /* Light purple (hover) */

/* Backgrounds */
--hero-bg: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
--card-bg: #ffffff;
--section-bg: #f9fafb;

/* Text */
--text-primary: #1a1a1a;
--text-secondary: #6b7280;
--text-light: #9ca3af;

/* Borders */
--border-light: #e5e7eb;
--border-medium: #d1d5db;

/* Shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

---

## APPENDIX C: Critical CSS Classes Reference

### Header
- `.main-header` - Fixed header container
- `.header-logo` - Logo image styling
- `.nav-links` - Navigation list
- `.nav-dropdown` - Dropdown menu container
- `.dropdown-toggle` - Button to open dropdown

### Hero
- `.hero-section` - Main hero container
- `.hero-content` - Content wrapper
- `.hero-title` - Main heading
- `.hero-subtitle` - Subheading
- `.hero-illustration-left` - Brooklyn Bridge image
- `.hero-illustration-right` - Empire State image

### Day Selector
- `.day-selector` - Container
- `.day-badge` - Individual day button
- `.day-badge.active` - Selected day state
- `.checkin-checkout` - Display for selected range

### Schedule Cards
- `.schedule-section` - Section container
- `.schedule-grid` - Card grid
- `.schedule-card` - Individual card
- `.lottie-container` - Animation container
- `.explore-btn` - CTA button

### Property Cards
- `.listing-card` - Card container
- `.listing-images` - Image container
- `.listing-content` - Text content
- `.listing-price` - Price display

---

**END OF COMPREHENSIVE FIX PLAN**

---

**Next Steps**: Execute Phase 1 (Extract Component Styles) first, as this will have the biggest visual impact and resolve 90% of the styling issues.
