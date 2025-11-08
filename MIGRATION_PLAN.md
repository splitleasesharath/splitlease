# Split Lease Pages Migration Plan

## Overview
This document outlines the systematic migration of three static pages (index, search, view-split-lease) from the `input/` directory into the React Islands architecture in the `app/` directory.

---

## Current State Analysis

### Input Structure
```
input/
├── index/                  # Landing page (vanilla HTML/CSS/JS)
│   ├── index.html         # 482 lines - hero, schedule, listings
│   ├── styles.css         # Complete styling with CSS variables
│   ├── script.js          # Day selector, modals, auth, animations
│   └── assets/images/     # Logo, hero illustrations
│
├── search/                # Search page (React CDN + Tailwind)
│   ├── index.html         # Filters, schedule selector, listings
│   ├── css/               # styles.css, responsive.css, ai-signup.css
│   ├── js/                # database-optimized.js, load-database-data.js
│   ├── components/        # AiSignup, ContactHost (React)
│   └── assets/            # Images, Lottie animations
│
└── view-split-lease/      # Property detail page
    ├── index.html         # Property gallery, details, booking
    ├── header/            # Header component (HTML/CSS/JS)
    ├── footer/            # Footer component (React/TypeScript)
    └── styles.css         # Main styles
```

### Target Structure
```
app/
├── public/
│   ├── index.html         # Entry point for HomePage
│   ├── search.html        # Entry point for SearchPage
│   ├── view-split-lease.html  # Entry point for ViewSplitLeasePage
│   └── assets/            # Images, fonts, icons, lottie files
│
├── src/
│   ├── islands/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── SearchPage.jsx
│   │   │   └── ViewSplitLeasePage.jsx
│   │   │
│   │   ├── shared/        # Shared components
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── DaySelector.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── PropertyCard.jsx
│   │   │
│   │   └── components/    # Page-specific components
│   │       ├── home/
│   │       │   ├── Hero.jsx
│   │       │   ├── ValueProps.jsx
│   │       │   ├── ScheduleSection.jsx
│   │       │   └── ListingsPreview.jsx
│   │       │
│   │       ├── search/
│   │       │   ├── FilterPanel.jsx
│   │       │   ├── ScheduleSelector.jsx
│   │       │   ├── ListingCard.jsx
│   │       │   └── AiSignup.jsx
│   │       │
│   │       └── property/
│   │           ├── ImageGallery.jsx
│   │           ├── PropertyDetails.jsx
│   │           └── ContactHost.jsx
│   │
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── constants.js
│   │   ├── auth.js        # Auth management utilities
│   │   └── utils.js       # Helper functions
│   │
│   └── styles/
│       ├── main.css       # Global styles
│       ├── variables.css  # CSS custom properties
│       ├── components/    # Component-specific styles
│       └── pages/         # Page-specific styles
│
├── package.json
└── vite.config.js
```

---

## Migration Strategy

### Phase 1: Foundation Setup

#### 1.1 Asset Migration
**Location:** `input/*/assets/` → `app/public/assets/`

**Tasks:**
- [ ] Copy all images from `input/index/assets/images/` to `app/public/assets/images/`
- [ ] Copy logo.png from all three input directories (consolidate to one)
- [ ] Copy Lottie animations from `input/search/assets/lotties/` to `app/public/assets/lotties/`
- [ ] Verify all image URLs and update paths

**Key Files:**
```
app/public/assets/
├── images/
│   ├── logo.png
│   ├── hero-left.png
│   ├── hero-right.png
│   └── [other images]
│
└── lotties/
    ├── atom-animation.json
    └── atom-white.json
```

#### 1.2 CSS Architecture
**Location:** `app/src/styles/`

**Tasks:**
- [ ] Extract CSS variables from `input/index/styles.css` to `app/src/styles/variables.css`
- [ ] Create `app/src/styles/main.css` with global resets and base styles
- [ ] Migrate responsive breakpoints and media queries
- [ ] Create component-specific CSS modules

**Design Tokens to Extract:**
```css
:root {
  --primary-color: #31135D;
  --primary-hover: #251047;
  --text-dark: #1a1a1a;
  --bg-light: #f9fafb;
  --font-inter: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  /* ... all other tokens */
}
```

#### 1.3 Dependencies Update
**Location:** `app/package.json`

**Tasks:**
- [ ] Add `lottie-react` (replace lottie-web CDN)
- [ ] Add `framer-motion` (replace CDN)
- [ ] Add `styled-components` or use CSS modules (replace CDN)
- [ ] Ensure `@supabase/supabase-js` is installed
- [ ] Add `lucide-react` for icons (replace CDN)

**New package.json dependencies:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.38.0",
    "lottie-react": "^2.4.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.294.0"
  }
}
```

---

### Phase 2: Shared Components

#### 2.1 Header Component
**Source:** `input/view-split-lease/header/`
**Target:** `app/src/islands/shared/Header.jsx`

**Features to Migrate:**
- Logo with image and text
- Navigation dropdowns (Host with Us, Stay with Us)
- Mobile hamburger menu
- Sign In / Sign Up buttons
- Explore Rentals button
- Sticky behavior with scroll hide/show

**Component Structure:**
```jsx
export default function Header() {
  // State for mobile menu, dropdowns
  // Scroll behavior logic
  // Auth modal triggers
  return (
    <header className="main-header">
      {/* Navigation content */}
    </header>
  );
}
```

#### 2.2 Footer Component
**Source:** `input/view-split-lease/footer/`, `input/index/index.html` (footer section)
**Target:** `app/src/islands/shared/Footer.jsx`

**Features to Migrate:**
- Four footer columns (Hosts, Guests, Company, Referral)
- Referral form with radio buttons
- Import listing form
- Social links
- Copyright and terms
- App download section
- Alexa card section

#### 2.3 Reusable Components

**DaySelector.jsx**
- Interactive day badges (S M T W T F S)
- Selected state management
- URL parameter sync
- Check-in/check-out display

**Modal.jsx**
- Generic modal wrapper
- Auth modal screens (Welcome, Login, Signup)
- Market research modal
- Close on ESC and overlay click

**Button.jsx**
- Primary, secondary, ghost variants
- Loading states
- Icon support

**PropertyCard.jsx**
- Image display
- Property details
- Click to navigate
- Responsive layout

---

### Phase 3: Index Page Migration

#### 3.1 HomePage.jsx Structure
**Source:** `input/index/index.html`
**Target:** `app/src/islands/pages/HomePage.jsx`

**Component Breakdown:**
```jsx
export default function HomePage() {
  return (
    <>
      <Header />
      <Hero />
      <ValuePropositions />
      <ScheduleSelection />
      <BenefitsSection />
      <ListingsPreview />
      <SupportSection />
      <Footer />
      <FloatingBadge />
      <ModalsContainer />
    </>
  );
}
```

#### 3.2 Hero Component
**File:** `app/src/islands/components/home/Hero.jsx`

**Features:**
- Background illustrations (Brooklyn Bridge, Empire State)
- Mobile floating Empire State image
- Hero title and subtitle
- Day selector integration
- Check-in/check-out display
- "Explore Rentals" CTA button

**State Management:**
```jsx
const [selectedDays, setSelectedDays] = useState([1,2,3,4,5]); // Default weeknight
const [showCheckinCheckout, setShowCheckinCheckout] = useState(false);
```

#### 3.3 Schedule Section Component
**File:** `app/src/islands/components/home/ScheduleSection.jsx`

**Features:**
- Three schedule cards (Weeknight, Weekend, Monthly)
- Lottie animations using `lottie-react`
- Animation controls (play/pause, stop, seek, loop)
- Explore buttons with URL parameter passing

**Lottie Integration:**
```jsx
import Lottie from 'lottie-react';
import weeknightAnimation from '/assets/lotties/weeknight.json';

<Lottie
  animationData={weeknightAnimation}
  loop={isLooping}
  autoplay={isPlaying}
  style={{ width: '100%', maxWidth: 650 }}
/>
```

#### 3.4 JavaScript Functionality Migration

**From `input/index/script.js` to React hooks:**

| Vanilla JS Function | React Equivalent |
|---------------------|------------------|
| `toggleDay(dayIndex)` | `handleDayToggle` with `useState` |
| `exploreRentals()` | `handleExploreClick` with `useNavigate` |
| `openAuthModal()` | `setAuthModalOpen(true)` |
| `showToast(message)` | Toast component with `useState` |
| `setupNavigation()` | `useEffect` with scroll listeners |
| `setupDaySelectors()` | Event handlers in DaySelector component |

**URL Parameter Management:**
```jsx
const updateURLParams = (days) => {
  const url = new URL(window.location);
  url.searchParams.set('days-selected', days.join(','));
  window.history.pushState({}, '', url);
};
```

---

### Phase 4: Search Page Migration

#### 4.1 SearchPage.jsx Structure
**Source:** `input/search/index.html`
**Target:** `app/src/islands/pages/SearchPage.jsx`

**Component Breakdown:**
```jsx
export default function SearchPage() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({});
  const [selectedDays, setSelectedDays] = useState([]);

  return (
    <>
      <Header />
      <MobileFilterBar />
      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
      />
      <ListingsSection
        listings={listings}
        selectedDays={selectedDays}
      />
      <Footer />
    </>
  );
}
```

#### 4.2 Filter Panel Component
**File:** `app/src/islands/components/search/FilterPanel.jsx`

**Features:**
- Schedule selector (React component from CDN → local)
- Borough select (dynamic from Supabase)
- Week pattern dropdown
- Price tier filter
- Sort by dropdown
- Neighborhood multi-select with chips

**Supabase Integration:**
```jsx
useEffect(() => {
  async function loadBoroughs() {
    const { data } = await supabase
      .from('neighborhoods')
      .select('borough')
      .distinct();
    setBoroughs(data);
  }
  loadBoroughs();
}, []);
```

#### 4.3 Schedule Selector Migration
**Source:** `input/search/dist/schedule-selector.js` (CDN React component)
**Target:** `app/src/islands/components/search/ScheduleSelector.jsx`

**Current Implementation:** Uses CDN React, styled-components, framer-motion
**Migration Strategy:**
1. Convert from CDN to npm package imports
2. Replace `React.createElement` with JSX
3. Use local styled-components or CSS modules
4. Integrate framer-motion from npm

#### 4.4 Listings Section
**File:** `app/src/islands/components/search/ListingCard.jsx`

**Features:**
- Property image with lazy loading
- Property details (title, beds, baths)
- Price calculation based on selected days
- Click to navigate to property detail
- Responsive card layout

**Data Fetching:**
```jsx
useEffect(() => {
  async function loadListings() {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    setListings(data);
  }
  loadListings();
}, [filters]);
```

---

### Phase 5: View-Split-Lease Page Migration

#### 5.1 ViewSplitLeasePage.jsx Structure
**Source:** `input/view-split-lease/index.html`
**Target:** `app/src/islands/pages/ViewSplitLeasePage.jsx`

**Component Breakdown:**
```jsx
export default function ViewSplitLeasePage() {
  const [property, setProperty] = useState(null);
  const propertyId = new URLSearchParams(window.location.search).get('id');

  return (
    <>
      <Header />
      <div className="content-wrapper">
        <div className="left-column">
          <ImageGallery images={property?.images} />
          <PropertyDetails property={property} />
        </div>
        <div className="right-column">
          <BookingWidget property={property} />
          <ContactHost property={property} />
        </div>
      </div>
      <Footer />
    </>
  );
}
```

#### 5.2 Image Gallery Component
**File:** `app/src/islands/components/property/ImageGallery.jsx`

**Features:**
- Main large image display
- Thumbnail grid below
- "+N more images" overlay
- Click to open lightbox
- Keyboard navigation

#### 5.3 Property Details Component
**File:** `app/src/islands/components/property/PropertyDetails.jsx`

**Features:**
- Property title
- Location pill with icon
- Capacity pill
- Feature icons (kitchen, wifi, etc.)
- Amenities list
- Description text
- House rules

#### 5.4 Contact Host Component
**Source:** `input/search/components/ContactHost/ContactHostMessaging.jsx`
**Target:** `app/src/islands/components/property/ContactHost.jsx`

**Features:**
- Message textarea
- Send button
- Character count
- Success/error states
- Integration with messaging backend

---

### Phase 6: Configuration & Environment

#### 6.1 Environment Variables
**File:** `app/.env.local`

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BUBBLE_API_URL=https://app.split.lease
```

#### 6.2 Supabase Client Setup
**File:** `app/src/lib/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 6.3 Authentication Utilities
**File:** `app/src/lib/auth.js`

**Functions to migrate from `input/index/script.js`:**
- `checkAuthStatus()` - Check localStorage/cookies
- `getUsernameFromCookies()` - Parse username
- `handleLoggedInUser()` - Update UI for logged-in state
- `checkSplitLeaseCookies()` - Cross-domain auth check

#### 6.4 Vite Configuration
**File:** `app/vite.config.js`

**Current setup is correct:**
```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './public/index.html',
        search: './public/search.html',
        viewSplitLease: './public/view-split-lease.html'
      }
    }
  }
});
```

---

## Migration Execution Order

### Step-by-Step Checklist

#### Preparation
- [x] Analyze all three input pages
- [x] Create migration plan document
- [ ] Set up git branch for migration work

#### Phase 1: Foundation (Days 1-2)
- [ ] Copy all assets to `app/public/assets/`
- [ ] Create CSS variables file
- [ ] Update package.json with new dependencies
- [ ] Run `npm install`
- [ ] Verify Vite build works

#### Phase 2: Shared Components (Days 3-4)
- [ ] Create Header.jsx component
- [ ] Create Footer.jsx component
- [ ] Create DaySelector.jsx component
- [ ] Create Modal.jsx component
- [ ] Create Button.jsx component
- [ ] Test shared components in isolation

#### Phase 3: Index Page (Days 5-7)
- [ ] Migrate Hero section
- [ ] Migrate ValueProps section
- [ ] Migrate ScheduleSection with Lottie
- [ ] Migrate BenefitsSection
- [ ] Migrate ListingsPreview
- [ ] Integrate all sections into HomePage.jsx
- [ ] Test full index page

#### Phase 4: Search Page (Days 8-10)
- [ ] Migrate FilterPanel
- [ ] Migrate ScheduleSelector from CDN to local
- [ ] Migrate ListingCard component
- [ ] Set up Supabase data fetching
- [ ] Integrate all sections into SearchPage.jsx
- [ ] Test filtering and listing display

#### Phase 5: View-Split-Lease Page (Days 11-12)
- [ ] Migrate ImageGallery
- [ ] Migrate PropertyDetails
- [ ] Migrate ContactHost component
- [ ] Set up URL parameter parsing for property ID
- [ ] Test property detail display

#### Phase 6: Integration & Testing (Days 13-14)
- [ ] Set up environment variables
- [ ] Configure Supabase connection
- [ ] Test navigation between pages
- [ ] Test authentication flow
- [ ] Test responsive design on mobile/tablet/desktop
- [ ] Fix any bugs or issues

#### Phase 7: Optimization (Days 15-16)
- [ ] Optimize images (lazy loading, webp format)
- [ ] Code splitting for better performance
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Run Lighthouse audits
- [ ] Fix performance issues

---

## Key Considerations

### 1. URL Parameter Compatibility
All URL parameters must match the original site format:
- Days: `?days-selected=1,2,3,4,5` (with commas, Sunday=1)
- Weekly frequency: `?weekly-frequency=every-week`
- Property ID: `?id=1586447992720x748691103167545300`

### 2. Authentication Flow
- Check Split Lease cookies first (`.split.lease` domain)
- Fallback to localStorage tokens
- Redirect to `https://app.split.lease/signup-login` for sign-in
- No delays or toast messages on redirect

### 3. External Dependencies Replacement
| Current (CDN) | Replace With (npm) |
|---------------|-------------------|
| `unpkg.com/react@18` | `npm i react@18` |
| `unpkg.com/lottie-web` | `npm i lottie-react` |
| `unpkg.com/framer-motion` | `npm i framer-motion` |
| `unpkg.com/styled-components` | `npm i styled-components` OR use CSS modules |
| `cdn.tailwindcss.com` | `npm i tailwindcss` OR use custom CSS |
| `unpkg.com/lucide` | `npm i lucide-react` |

### 4. Responsive Design Breakpoints
Maintain consistent breakpoints across all pages:
```css
/* Mobile: < 768px */
/* Tablet: 768px - 1024px */
/* Desktop: > 1024px */
```

### 5. Asset Path Updates
All asset paths need updating:
- `assets/images/logo.png` → `/assets/images/logo.png`
- `header/assets/images/logo.png` → `/assets/images/logo.png`
- CDN URLs remain unchanged (Bubble CDN for property images)

---

## Testing Strategy

### Manual Testing
1. **Navigation Flow**
   - [ ] Index → Search (with day params)
   - [ ] Search → Property Detail
   - [ ] Property → Contact Host
   - [ ] All header/footer links

2. **Interactive Features**
   - [ ] Day selector toggles
   - [ ] Schedule animations
   - [ ] Filter changes
   - [ ] Modal open/close
   - [ ] Form submissions

3. **Responsive Design**
   - [ ] Mobile (375px, 414px)
   - [ ] Tablet (768px, 1024px)
   - [ ] Desktop (1280px, 1920px)

4. **Authentication**
   - [ ] Logged out state
   - [ ] Logged in state
   - [ ] Cookie detection
   - [ ] Sign in redirect

### Automated Testing (Optional)
- Unit tests for utility functions
- Component tests with React Testing Library
- E2E tests with Playwright

---

## Success Criteria

### Functional Requirements
✅ All three pages render correctly
✅ Navigation between pages works
✅ URL parameters are preserved
✅ Authentication state is detected
✅ Supabase data loads properly
✅ All interactive features function
✅ Responsive design works on all devices

### Performance Requirements
✅ Lighthouse score > 90 (Performance)
✅ First Contentful Paint < 2s
✅ Time to Interactive < 4s
✅ No console errors or warnings

### Code Quality Requirements
✅ No hardcoded fallback data
✅ Proper component structure
✅ CSS follows design system
✅ No duplicate code
✅ Clean, readable code

---

## Migration Timeline

**Total Estimated Time:** 16 days (3-4 weeks at normal pace)

- **Week 1:** Foundation + Shared Components + Index Page
- **Week 2:** Search Page + View-Split-Lease Page
- **Week 3:** Integration + Testing + Optimization
- **Week 4:** Buffer for bug fixes and polish

---

## Next Steps

Once this migration plan is approved:

1. **Create a new git branch** for migration work
2. **Start with Phase 1** - Foundation setup
3. **Work sequentially** through each phase
4. **Commit frequently** with descriptive messages
5. **Test each component** before moving to next
6. **Update this document** with actual progress

---

## Questions to Resolve

Before starting migration, confirm:

1. Should we use Tailwind CSS or custom CSS?
2. Do we want styled-components or CSS modules?
3. What's the Supabase project URL and anon key?
4. Are there any API endpoints we need to integrate?
5. Should we implement dark mode from index/styles.css?
6. Do we need the chat widget integration?
7. What's the priority order if timeline is tight?

---

**Last Updated:** 2025-11-08
**Created By:** Claude Code Migration Assistant
