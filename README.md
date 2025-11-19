# Split Lease Platform

A modern, high-performance multi-page web application for flexible shared accommodations with weekly scheduling. Built with Vite, React Islands Architecture, Supabase, and Google Maps, deployed on Cloudflare Pages.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Pages & Routes](#pages--routes)
- [Core Technologies](#core-technologies)
- [Database Schema](#database-schema)
- [Development](#development)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Contributing](#contributing)

---

## 🎯 Overview

Split Lease is a comprehensive web platform enabling users to find, filter, and book shared accommodations across NYC and New Jersey with flexible weekly scheduling. The application features advanced filtering, dynamic pricing, interactive maps, multi-step booking flows, and real-time data synchronization.

### What Makes It Special

- **No Fallback Mechanisms**: 100% truthful data - returns real data or null/empty values, never hardcoded demo data
- **Islands Architecture**: Multi-page app with selective React hydration for optimal performance
- **Intelligent Pricing**: Real-time calculations based on 2-7 night selections with dynamic rate adjustment
- **Advanced Schedule System**: Contiguous day validation, check-in/check-out logic, and week-wrap handling
- **Database-Driven Everything**: All location data, amenities, policies loaded dynamically from Supabase
- **0-Based Day Indexing**: Internally uses 0-based (0=Sunday), converts to 1-based only for Bubble API
- **URL Parameter Sync**: Shareable search URLs with filter persistence
- **Mobile-First Design**: Fully responsive with optimized mobile/tablet/desktop experiences

### Application Scale

- **12 Pages**: Homepage, Search, View Listing, FAQ, Policies, List With Us, Success pages, Careers, and more
- **30+ React Components**: Shared components with isolated state management
- **20+ Utility Modules**: Centralized business logic and data transformation
- **15+ Database Tables**: Listings, photos, reviews, geographic data, feature lookups
- **~15,000 Lines**: JavaScript/JSX codebase with modular architecture
- **~8,000 Lines**: CSS with variables, components, responsive design

---

## 🏗️ Architecture

### Islands Architecture Pattern

**Philosophy**: Static HTML pages with selective React hydration for interactive components only.

```
┌─────────────────────────────────────────────────┐
│          Multi-Page Application (MPA)           │
├─────────────────────────────────────────────────┤
│  12 Static HTML Pages                           │
│  ├── public/index.html                          │
│  ├── public/search.html                         │
│  ├── public/view-split-lease.html               │
│  └── ... (9 more pages)                         │
├─────────────────────────────────────────────────┤
│  React Islands (Selective Hydration)            │
│  ├── src/main.jsx → HomePage                    │
│  ├── src/search.jsx → SearchPage                │
│  ├── src/view-split-lease.jsx → ViewListing     │
│  └── ... (9 more entry points)                  │
├─────────────────────────────────────────────────┤
│  Shared Components (30+)                        │
│  ├── Header, Footer, Modal, GoogleMap           │
│  ├── SearchScheduleSelector                     │
│  ├── ListingScheduleSelector                    │
│  ├── CreateProposalFlowV2                       │
│  └── ContactHostMessaging                       │
├─────────────────────────────────────────────────┤
│  Core Library Modules (20+)                     │
│  ├── supabase.js, auth.js, constants.js         │
│  ├── dataLookups.js, priceCalculations.js       │
│  ├── dayUtils.js, urlParams.js, mapUtils.js     │
│  └── sanitize.js, availabilityValidation.js     │
├─────────────────────────────────────────────────┤
│  API Layer                                      │
│  ├── Supabase Client (PostgreSQL via PostgREST) │
│  ├── Bubble.io Workflows (Messaging, AI)        │
│  └── Google Maps JavaScript API                 │
└─────────────────────────────────────────────────┘
         ↓                    ↓                ↓
┌──────────────────┐  ┌─────────────────┐  ┌─────────────┐
│    Supabase      │  │   Bubble.io     │  │Google Maps  │
│   (PostgreSQL)   │  │   Workflows     │  │     API     │
│  - Listings      │  │  - Messaging    │  │ - Maps JS   │
│  - Photos        │  │  - Proposals    │  │ - Places    │
│  - Reviews       │  │  - AI Research  │  │ - Markers   │
│  - Locations     │  │  - Referrals    │  └─────────────┘
│  - Lookups       │  │  - Auth         │
└──────────────────┘  └─────────────────┘
```

### Build System

**Tool**: Vite 5.0

**Key Features**:
- 12 HTML entry points (multi-page configuration)
- Custom routing middleware for clean URLs
- Post-build file organization plugin
- Asset fingerprinting with hash
- Hot Module Replacement (HMR) in development

**Custom Plugins**:
1. **Multi-page routing plugin**: Rewrites URLs like `/view-split-lease/123` to `/view-split-lease.html`
2. **Post-build organization**: Moves HTML files, copies assets, handles Cloudflare configuration

---

## ✨ Key Features

### 🔍 Advanced Search & Filtering

**6-Dimension Filter System** (`SearchPage.jsx`):

1. **Borough Filter** - 6 NYC/NJ boroughs (dynamic from `zat_geo_borough_toplevel`)
2. **Neighborhood Filter** - 293+ neighborhoods with search (from `zat_geo_hood_mediumlevel`)
3. **Week Pattern Filter** - Every week, alternating weeks, every 3rd/4th week
4. **Price Tier Filter** - <$200, $200-$350, $350-$500, $500+
5. **Sort Options** - Recommended, price (low→high, high→low), recent
6. **Schedule Selector** - Interactive 7-day picker with 2-7 contiguous day constraint

**Filter Persistence**:
- URL parameter sync (shareable search links)
- Browser back/forward support
- Clean URLs (only non-default values)

**Example URL**:
```
/search.html?borough=manhattan&days-selected=2,3,4,5,6&pricetier=200-350&sort=price-asc
```

### 🗺️ Interactive Google Maps

**Features** (`GoogleMap.jsx`, `mapUtils.js`):
- Custom price markers for each listing
- Click marker to view listing card overlay
- Auto-fit bounds to show all filtered results
- Borough-specific center/zoom configurations
- No fallback coordinates (shows error if invalid location)

**Borough Zoom Levels**:
- Manhattan: 40.7580, -73.9855, zoom 13
- Brooklyn: 40.6782, -73.9442, zoom 12
- Queens, Bronx, Staten Island, Hudson County: Custom configs

### 💰 Dynamic Pricing Engine

**Multi-Tier Pricing** (`priceCalculations.js`):

```javascript
// 1. Get nightly rate (varies by nights selected: 2, 3, 4, 5, 7)
const nightlyPrice = listing['💰Nightly Host Rate for 5 nights']; // If 5 nights

// 2. Calculate 4-week rent
const fourWeekRent = nightlyPrice × nightsPerWeek × 4;

// 3. Scale for reservation span
const reservationTotal = fourWeekRent × (reservationWeeks / 4);

// 4. Add fees
const grandTotal = reservationTotal + cleaningFee + damageDeposit;
```

**Price Fields** (database columns):
- `💰Nightly Host Rate for 2 nights`
- `💰Nightly Host Rate for 3 nights`
- `💰Nightly Host Rate for 4 nights`
- `💰Nightly Host Rate for 5 nights`
- `💰Nightly Host Rate for 7 nights`
- `💰Price Override` (overrides all other prices)

### 📅 Schedule Selector System

**Two Implementations**:

1. **SearchScheduleSelector** (`SearchScheduleSelector.jsx`) - For search page
   - Multi-select day picker
   - Updates URL parameters
   - Triggers listing price recalculation

2. **ListingScheduleSelector** (`ListingScheduleSelector.jsx`) - For listing detail page
   - Availability constraints enforcement
   - Min/max nights validation
   - Real-time price updates
   - Check-in/check-out display

**Custom Hook** (`useScheduleSelector.js`):
- Manages selected days state
- Calculates nights, check-in/check-out
- Validates contiguity
- Handles price breakdown
- Optimized with `useMemo` for performance

**Validation Rules** (`availabilityValidation.js`):
- Days must be contiguous (handles week-wrap: Sat→Sun)
- Must meet listing's min/max night requirements
- Days must be in listing's "Days Available" array
- Cannot overlap with blocked dates

### 📝 Proposal Creation Flow

**Multi-Step Modal** (`CreateProposalFlowV2.jsx`):

**4 Steps**:
1. **User Details** - Name, email, phone with validation
2. **Days Selection** - Review/adjust schedule with ListingScheduleSelector
3. **Move-In Date** - Calendar picker (minimum 2 weeks from today)
4. **Review** - Summary with pricing breakdown and submit

**Components** (`CreateProposalFlowV2Components/`):
- `UserDetailsSection.jsx` - Form inputs with sanitization
- `DaysSelectionSection.jsx` - Embedded schedule selector
- `MoveInSection.jsx` - Date picker with smart defaults
- `ReviewSection.jsx` - Confirmation UI with all details

**Submission**:
- Validates all fields (email regex, phone format, required fields)
- Creates proposal in database
- Shows success/error states
- Redirects to proposals dashboard on success

### 💬 Contact Host Messaging

**Modal Component** (`ContactHostMessaging.jsx`):

**Features**:
- Message textarea with character count
- Validation (required message, max length)
- API integration with Bubble.io messaging endpoint
- Loading states during submission
- Success/error feedback

**API Endpoint**:
```javascript
POST https://app.split.lease/api/1.1/wf/core-contact-host-send-message
Body: {
  listingId,
  message,
  guestName,
  guestEmail
}
```

### 🔐 Authentication System

**Architecture**: Cookie-based cross-domain auth from Bubble.io

**Auth Flow**:
1. User clicks "Sign In/Up" → Redirect to `https://app.split.lease/signup-login`
2. User authenticates on Bubble app
3. Bubble sets cookies with `domain=.split.lease` (cross-subdomain)
4. User returns to main site
5. Main site checks auth via `checkAuthStatus()` (`auth.js`)

**Auth Priority** (`auth.js`):
1. Cross-domain cookies (`.split.lease` domain)
2. LocalStorage tokens (`splitlease_auth_token`, `splitlease_session_id`)
3. Session age validation (24-hour timeout)
4. Legacy auth cookie fallback

**Protected Actions**:
- Contact host
- Submit proposal
- View proposals dashboard
- Save favorites

**No Fallback**: Returns `false` or `null` on auth failure, no simulated/demo auth

### 🗃️ Data Lookup System

**Architecture** (`dataLookups.js`): Initialize once on app startup, then synchronous lookups from in-memory cache

**Cached Lookups**:
- `getNeighborhoodName(id)` - Returns neighborhood name or ID (no fallback)
- `getBoroughName(id)` - Borough display name
- `getPropertyTypeLabel(id)` - Property type from `zat_features_listingtype`
- `getAmenity(id)` / `getAmenities(ids)` - Returns `{name, icon}`
- `getSafetyFeature(id)` / `getSafetyFeatures(ids)` - Safety features with icons
- `getHouseRule(id)` / `getHouseRules(ids)` - House rules with icons
- `getParkingOption(id)` - Parking type
- `getCancellationPolicy(id)` - Full policy object
- `getStorageOption(id)` - Storage option details

**Initialization**:
```javascript
// Call once on app startup
await initializeLookups();

// Then use synchronously throughout app
const neighborhoodName = getNeighborhoodName(listing['Location - Hood']);
```

**No Fallback**: Returns empty arrays or original IDs when cache miss, never hardcoded data

### 🔄 Day Indexing System

**Critical Concept** (`dayUtils.js`):
- **Internal (JavaScript)**: 0-based (0=Sunday, 1=Monday, ..., 6=Saturday)
- **Bubble API**: 1-based (1=Sunday, 2=Monday, ..., 7=Saturday)
- **URL Parameters**: 1-based for readability

**Conversion Functions**:
```javascript
// Internal → Bubble API
const internalDays = [1, 2, 3, 4, 5]; // Mon-Fri (0-based)
const bubbleDays = toBubbleDays(internalDays); // [2, 3, 4, 5, 6]

// Bubble API → Internal
const bubbleResponse = [2, 3, 4, 5, 6];
const internalDays = fromBubbleDays(bubbleResponse); // [1, 2, 3, 4, 5]
```

**Always**:
- Store days as 0-based in state
- Convert to 1-based when calling Bubble API
- Convert from 1-based when receiving Bubble data
- Convert to 1-based for URL display

### ⚡ Performance Optimizations

**Lazy Loading** (`SearchPage.jsx`):
- Load 6 listings initially
- Load 6 more on scroll (IntersectionObserver)
- Progressive rendering for fast initial paint

**Batch Fetching** (`supabaseUtils.js`):
- `fetchPhotoUrls(photoIds)` - Single query for all photos
- `fetchHostData(hostIds)` - Batch fetch host information
- Reduces N+1 query problems

**Optimized Queries**:
- Select only required fields (60+ fields available, select ~40)
- Use `.in()` for batch queries instead of loops
- Index-optimized filters (borough, neighborhood)

**Asset Optimization**:
- Vite asset fingerprinting (cache-busting)
- Image lazy loading (native `loading="lazy"`)
- Code splitting per page (12 entry points)

### 🛡️ Security Features

**Input Sanitization** (`sanitize.js`):
- `sanitizeText()` - Removes script tags, event handlers, dangerous protocols
- `sanitizeSearchQuery()` - Search input (max 200 chars)
- `isValidEmail()` - RFC 5322 compliant email regex
- `isValidPhone()` - US phone format validation
- `sanitizeListingId()` - UUID/alphanumeric ID validation
- `checkRateLimit()` - In-memory rate limiter

**XSS Protection**:
- `escapeHtml()` - Escape &, <, >, ", ', /
- Never use `innerHTML` with user input
- Always sanitize before rendering

**URL Parameter Validation**:
- `sanitizeUrlParam(param, type)` - Validate and sanitize URL params
- Types: string, number, array, boolean

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18+ (for development)
- **npm**: 9+ (comes with Node.js)
- **API Keys**: Supabase, Google Maps (see [Configuration](#configuration))

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd SL18

# 2. Navigate to app directory
cd app

# 3. Install dependencies
npm install

# 4. Create environment file
cp .env.example .env

# 5. Edit .env with your API keys
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# 6. Start development server
npm run dev

# 7. Open browser
# Navigate to http://localhost:5173
```

---

## 📁 Project Structure

```
SL18/
└── app/                                    # Main application directory
    ├── public/                             # Static HTML pages and assets
    │   ├── index.html                      # Homepage entry
    │   ├── search.html                     # Search page entry
    │   ├── view-split-lease.html           # Listing detail entry
    │   ├── faq.html, policies.html         # Info pages
    │   ├── list-with-us.html               # Host onboarding
    │   ├── guest-success.html              # Guest success page
    │   ├── host-success.html               # Host success page
    │   ├── why-split-lease.html            # Product explainer
    │   ├── guest-proposals.html            # Proposal dashboard
    │   ├── careers.html                    # Careers page
    │   ├── search-test.html                # Test version
    │   ├── _redirects                      # Cloudflare Pages routing
    │   ├── _headers                        # Cloudflare security headers
    │   └── assets/                         # Images, lotties, resources
    │
    ├── src/                                # Source code
    │   ├── main.jsx                        # Homepage entry point
    │   ├── search.jsx                      # Search entry point
    │   ├── view-split-lease.jsx            # Listing detail entry point
    │   ├── (9 more entry points)           # Other page entries
    │   │
    │   ├── lib/                            # Core library modules (20+ files)
    │   │   ├── supabase.js                 # Supabase client initialization
    │   │   ├── config.js                   # Environment config bridge
    │   │   ├── constants.js                # App constants (439 lines)
    │   │   ├── auth.js                     # Authentication utilities
    │   │   ├── dataLookups.js              # Cached data lookups
    │   │   ├── supabaseUtils.js            # Data fetching utilities
    │   │   ├── priceCalculations.js        # Pricing logic
    │   │   ├── dayUtils.js                 # Day indexing conversion
    │   │   ├── listingDataFetcher.js       # Listing data fetcher
    │   │   ├── urlParams.js                # URL parameter management
    │   │   ├── mapUtils.js                 # Google Maps helpers
    │   │   ├── sanitize.js                 # Input sanitization (XSS protection)
    │   │   ├── availabilityValidation.js   # Schedule validation
    │   │   └── scheduleSelector/           # Schedule selector logic
    │   │       ├── nightCalculations.js
    │   │       ├── validators.js
    │   │       ├── dayHelpers.js
    │   │       └── priceCalculations.js
    │   │
    │   ├── islands/                        # React components
    │   │   ├── pages/                      # Page components (12 files)
    │   │   │   ├── HomePage.jsx
    │   │   │   ├── SearchPage.jsx
    │   │   │   ├── ViewSplitLeasePage.jsx
    │   │   │   ├── FAQPage.jsx
    │   │   │   ├── PoliciesPage.jsx
    │   │   │   ├── ListWithUsPage.jsx
    │   │   │   ├── WhySplitLeasePage.jsx
    │   │   │   ├── GuestSuccessPage.jsx
    │   │   │   ├── HostSuccessPage.jsx
    │   │   │   ├── GuestProposalsPage.jsx
    │   │   │   ├── CareersPage.jsx
    │   │   │   └── SearchPageTest.jsx
    │   │   │
    │   │   └── shared/                     # Shared components (30+ files)
    │   │       ├── Header.jsx              # Site header with navigation
    │   │       ├── Footer.jsx              # Site footer
    │   │       ├── Modal.jsx               # Reusable modal component
    │   │       ├── Button.jsx              # Button component
    │   │       ├── Toast.jsx               # Toast notifications
    │   │       ├── GoogleMap.jsx           # Google Maps integration
    │   │       ├── SearchScheduleSelector.jsx       # Search schedule picker
    │   │       ├── ListingScheduleSelector.jsx      # Listing schedule picker
    │   │       ├── useScheduleSelector.js           # Schedule selector hook
    │   │       ├── ListingCard/
    │   │       │   └── ListingCardForMap.jsx        # Listing card component
    │   │       ├── CreateProposalFlowV2.jsx         # Proposal modal (4 steps)
    │   │       ├── CreateProposalFlowV2Components/  # Proposal flow sections
    │   │       │   ├── UserDetailsSection.jsx
    │   │       │   ├── DaysSelectionSection.jsx
    │   │       │   ├── MoveInSection.jsx
    │   │       │   └── ReviewSection.jsx
    │   │       ├── ContactHostMessaging.jsx         # Contact host modal
    │   │       ├── AiSignupMarketReport/            # Advanced AI signup modal
    │   │       ├── PriceDisplay.jsx                 # Price display component
    │   │       ├── InformationalText.jsx            # Info callouts
    │   │       ├── ErrorOverlay.jsx                 # Error display
    │   │       └── DayButton.jsx                    # Day button component
    │   │
    │   └── styles/                         # CSS files (25+ files)
    │       ├── variables.css               # CSS custom properties
    │       ├── main.css                    # Global base styles
    │       ├── faq.css                     # FAQ page styles
    │       ├── careers.css                 # Careers page styles
    │       ├── list-with-us.css            # List with us page
    │       ├── why-split-lease.css         # Why Split Lease page
    │       ├── listing-schedule-selector.css  # Schedule selector
    │       ├── create-proposal-flow-v2.css    # Proposal flow modal
    │       └── components/                 # Component-specific styles
    │           ├── header.css              # Header navigation
    │           ├── footer.css              # Footer
    │           ├── hero.css                # Hero section
    │           ├── listings.css            # Listing cards
    │           ├── modal.css               # Modal overlay
    │           ├── search-page.css         # Search page layout
    │           ├── schedule.css            # Schedule selector
    │           ├── toast.css               # Toast notifications
    │           ├── utilities.css           # Utility classes
    │           ├── policies.css            # Policies page
    │           ├── testimonials.css        # Testimonials
    │           ├── value-props.css         # Value propositions
    │           ├── support.css             # Support section
    │           ├── benefits.css            # Benefits section
    │           ├── mobile.css              # Mobile responsive
    │           ├── floating-badge.css      # Floating UI elements
    │           ├── guest-success.css       # Success pages
    │           └── host-success.css        # Host success page
    │
    ├── functions/                          # Cloudflare Pages Functions
    │   └── view-split-lease/
    │       └── [id].js                     # Dynamic route handler
    │
    ├── dist/                               # Build output (generated)
    │   ├── assets/                         # Bundled JS/CSS with hashes
    │   ├── (12 HTML files)                 # Processed HTML
    │   ├── _redirects                      # Copied from public/
    │   ├── _headers                        # Copied from public/
    │   └── functions/                      # Copied from functions/
    │
    ├── package.json                        # Dependencies and scripts
    ├── vite.config.js                      # Vite build configuration
    ├── tsconfig.json                       # TypeScript configuration
    ├── .env.example                        # Environment variables template
    └── .env                                # Local environment (git-ignored)
```

### Key Files by Function

**Entry Points** (12 pages):
- `src/main.jsx` → `public/index.html` (Homepage)
- `src/search.jsx` → `public/search.html` (Search)
- `src/view-split-lease.jsx` → `public/view-split-lease.html` (Listing detail)
- 9 more entry points for other pages

**Core Business Logic** (`src/lib/`):
- `constants.js:439` - Application constants (price tiers, days, patterns)
- `priceCalculations.js` - Multi-tier pricing formulas
- `dayUtils.js` - 0-based ↔ 1-based conversion
- `dataLookups.js` - In-memory cached lookups
- `listingDataFetcher.js` - Complete listing enrichment

**Authentication** (`src/lib/auth.js`):
- `checkAuthStatus()` - Primary auth check
- `redirectToLogin()` - Redirect to auth page
- `checkSplitLeaseCookies()` - Cross-domain cookie parsing

**Search & Filtering** (`src/islands/pages/SearchPage.jsx`):
- Filter panel with 6 filter types
- URL parameter sync
- Lazy loading with IntersectionObserver
- Map integration

**Listing Detail** (`src/islands/pages/ViewSplitLeasePage.jsx`):
- Complete listing data display
- Interactive booking widget
- Multi-step proposal creation
- Host messaging

**Schedule Selector** (`src/islands/shared/`):
- `SearchScheduleSelector.jsx` - For search page
- `ListingScheduleSelector.jsx` - For listing page
- `useScheduleSelector.js` - Custom hook with validation

**Styling** (`src/styles/`):
- `variables.css` - CSS custom properties (colors, spacing)
- `main.css` - Global base styles and reset
- `components/` - Component-specific styles (15+ files)

---

## 🗺️ Pages & Routes

### Page Overview (12 pages)

| Route | Entry Point | Page Component | Purpose |
|-------|-------------|----------------|---------|
| `/` or `/index.html` | `main.jsx` | `HomePage.jsx` | Landing page with hero, value props, featured listings |
| `/search.html` | `search.jsx` | `SearchPage.jsx` | Main listing search with filters and map |
| `/search-test.html` | `search-test.jsx` | `SearchPageTest.jsx` | Experimental search version |
| `/view-split-lease/[id]` | `view-split-lease.jsx` | `ViewSplitLeasePage.jsx` | Single listing detail with booking widget |
| `/faq.html` | `faq.jsx` | `FAQPage.jsx` | Frequently Asked Questions |
| `/policies.html` | `policies.jsx` | `PoliciesPage.jsx` | Terms of Service, Privacy Policy |
| `/list-with-us.html` | `list-with-us.jsx` | `ListWithUsPage.jsx` | Host onboarding information |
| `/why-split-lease.html` | `why-split-lease.jsx` | `WhySplitLeasePage.jsx` | Product explainer and value prop |
| `/guest-success.html` | `guest-success.jsx` | `GuestSuccessPage.jsx` | Post-signup success for guests |
| `/host-success.html` | `host-success.jsx` | `HostSuccessPage.jsx` | Post-signup success for hosts |
| `/guest-proposals.html` | `guest-proposals.jsx` | `GuestProposalsPage.jsx` | Guest proposal management dashboard |
| `/careers.html` | `careers.jsx` | `CareersPage.jsx` | Job listings and company culture |

### Dynamic Routes (Cloudflare Functions)

**View Listing**: `/view-split-lease/[id]`

**Handler**: `functions/view-split-lease/[id].js`

**Rewrite Rule** (`public/_redirects`):
```
/view-split-lease/*  /view-split-lease.html  200
```

**JavaScript** (client-side):
```javascript
// Parse listing ID from URL
const listingId = getListingIdFromUrl(); // Checks query string and path segments

// Fetch complete listing data
const listing = await fetchListingComplete(listingId);
```

### URL Parameter Examples

**Search Page**:
```
/search.html?borough=manhattan&days-selected=2,3,4,5,6&pricetier=200-350&sort=price-asc&neighborhoods=id1,id2
```

**View Listing** (legacy support):
```
/view-split-lease.html?id=abc123
```

**View Listing** (clean URL):
```
/view-split-lease/abc123
```

---

## 💻 Core Technologies

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vite** | 5.0 | Build tool, dev server, HMR |
| **React** | 18.2 | UI library for interactive components |
| **React DOM** | 18.2 | React renderer for browser |
| **JavaScript/JSX** | ES2020 | Primary language (not TypeScript compiled) |
| **CSS3** | Modern | Custom properties, Flexbox, Grid |
| **Framer Motion** | 12.23 | Animation library |
| **Lottie React** | 2.4 | JSON-based animations |
| **Lucide React** | 0.553 | Icon library |
| **Styled Components** | 6.1 | CSS-in-JS (limited use) |

### Backend & Database

| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database with PostgREST API |
| **@supabase/supabase-js** | Supabase client library (v2.38.0) |
| **Bubble.io** | No-code backend for workflows (messaging, AI, auth) |

### External Services

| Service | APIs Used | Purpose |
|---------|-----------|---------|
| **Google Maps Platform** | Maps JavaScript API, Places API | Interactive maps, location search |
| **Cloudflare Pages** | Hosting, Functions, CDN | Deployment and edge functions |

### Build & Development Tools

- **Vite**: Fast build tool with ES modules support
- **TypeScript**: Type checking (JavaScript codebase with TS config)
- **ESLint**: Code linting (optional)
- **Playwright**: End-to-end testing (optional)

---

## 🗄️ Database Schema

### Core Tables (Supabase PostgreSQL)

#### **listing** (Main Listings Table)

**60+ Fields** including:

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | UUID | Primary key |
| `Name` | Text | Listing title |
| `Description` | Text | Main description |
| `"Features - Qty Bedrooms"` | Number | Bedroom count |
| `"Features - Qty Bathrooms"` | Number | Bathroom count |
| `"Features - Type of Space"` | UUID | Property type ID (FK) |
| `"Features - Amenities In-Unit"` | JSONB | Array of amenity IDs |
| `"Features - Safety"` | JSONB | Array of safety feature IDs |
| `"Location - Hood"` | UUID | Neighborhood ID (FK) |
| `"Location - Borough"` | UUID | Borough ID (FK) |
| `"Location - Address"` | JSONB | Address with lat/lng |
| `"💰Nightly Host Rate for 2 nights"` | Number | Price for 2 nights |
| `"💰Nightly Host Rate for 3 nights"` | Number | Price for 3 nights |
| `"💰Nightly Host Rate for 4 nights"` | Number | Price for 4 nights |
| `"💰Nightly Host Rate for 5 nights"` | Number | Price for 5 nights |
| `"💰Nightly Host Rate for 7 nights"` | Number | Price for 7 nights |
| `"💰Cleaning Cost / Maintenance Fee"` | Number | Cleaning fee |
| `"💰Damage Deposit"` | Number | Security deposit |
| `"Days Available (List of Days)"` | JSONB | Array of 1-based day numbers |
| `"Minimum Nights"` | Number | Min nights constraint |
| `"Maximum Nights"` | Number | Max nights constraint |
| `"Host / Landlord"` | UUID | Host ID (FK to account_host) |
| `Active` | Boolean | Listing active status |

**Note**: Some fields have quirks:
- Trailing spaces: `"Nights Available (List of Nights) "`
- Leading spaces: `" First Available"`
- Emoji prefixes: `💰` in price fields

#### **listing_photo**

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | UUID | Primary key |
| `Listing` | UUID | FK to listing._id |
| `Photo` | Text | Full-size photo URL |
| `"Photo (thumbnail)"` | Text | Thumbnail URL |
| `SortOrder` | Number | Display order |
| `toggleMainPhoto` | Boolean | Is main photo flag |
| `Caption` | Text | Photo caption |

**Sorting**: Main photo first (`toggleMainPhoto=true`), then by `SortOrder`, then by `_id`

#### **account_host** & **user**

**account_host**:
- `_id` - UUID primary key
- `User` - FK to user._id

**user**:
- `_id` - UUID primary key
- `"Name - Full"` - Full name
- `"Profile Photo"` - Profile photo URL
- `"email as text"` - Email address

#### **mainreview**

| Field | Type | Purpose |
|-------|------|---------|
| `_id` | UUID | Primary key |
| `Comment` | Text | Review text |
| `"Overall Score"` | Number | Rating score |
| `"Is Published?"` | Boolean | Published status |

### Lookup Tables (ZAT prefix)

#### **zat_geo_borough_toplevel** (Boroughs)

- Manhattan
- Brooklyn
- Queens
- Bronx
- Staten Island
- Hudson (Hudson County, NJ)

#### **zat_geo_hood_mediumlevel** (Neighborhoods)

293+ neighborhoods across NYC/NJ boroughs

#### **zat_features_listingtype** (Property Types)

- Entire Place
- Private Room
- Shared Room
- Studio
- 1 Bedroom
- 2 Bedroom
- 3+ Bedroom

**Note**: `Label` field has trailing space: `"Label "` (column name quirk)

#### **zat_features_amenity** (Amenities)

Examples: WiFi, Kitchen, Washer/Dryer, Air Conditioning, etc.

Fields: `Name`, `Icon`

#### **zfut_safetyfeatures** (Safety Features)

Examples: Smoke Detector, Carbon Monoxide Detector, Fire Extinguisher, etc.

#### **zat_features_houserule** (House Rules)

Examples: No Smoking, No Pets, No Parties, etc.

#### **zat_features_parkingoptions** (Parking)

Examples: Street Parking, Garage, No Parking, etc.

#### **zat_features_cancellationpolicy** (Cancellation Policies)

Fields: `Display`, `"Best Case Text"`, `"Medium Case Text"`, `"Worst Case Text"`, `"Summary Texts"`

#### **zat_features_storageoptions** (Storage Options)

Examples: Closet, Shelves, Under Bed, etc.

#### **zat_priceconfiguration** (Global Pricing Config)

Single-row table with:
- `"Overall Site Markup"` - Site-wide markup %
- `"Unused Nights Discount Multiplier"` - Discount for unused nights
- Min/max price constraints

### JSONB Field Handling

**Problem**: Supabase JSONB fields can be returned as:
1. Native JavaScript arrays: `["id1", "id2"]`
2. Stringified JSON: `'["id1", "id2"]'`

**Solution** (`supabaseUtils.js`):
```javascript
export const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};
```

**Usage**:
```javascript
const amenityIds = parseJsonArray(listing['Features - Amenities In-Unit']);
const daysAvailable = parseJsonArray(listing['Days Available (List of Days)']);
```

---

## 🛠️ Development

### Setup

```bash
# 1. Install dependencies
cd app
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Initialize data lookups (optional - check if needed)
# Lookups are initialized automatically on first app load
```

### Available Scripts

```bash
# Development server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking (optional)
npx tsc --noEmit

# Linting (if configured)
npm run lint
```

### Development Workflow

**1. Start Dev Server**:
```bash
npm run dev
```

**2. Access Pages**:
- Homepage: `http://localhost:5173/`
- Search: `http://localhost:5173/search.html`
- View Listing: `http://localhost:5173/view-split-lease.html?id=test-id`
- Other pages: `http://localhost:5173/[page-name].html`

**3. Make Changes**:
- **JavaScript/JSX**: Instant HMR (Hot Module Replacement)
- **CSS**: Instant HMR
- **HTML**: Manual refresh required

**4. Check Browser Console**:
- Look for errors
- Check network requests
- Inspect state in React DevTools

### Adding New Features

#### Add a New Filter

**1. Update Constants** (`src/lib/constants.js`):
```javascript
export const MY_NEW_FILTER_OPTIONS = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' }
];
```

**2. Add Filter UI** (`src/islands/pages/SearchPage.jsx`):
```jsx
<select value={myNewFilter} onChange={(e) => setMyNewFilter(e.target.value)}>
  {MY_NEW_FILTER_OPTIONS.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
```

**3. Apply Filter** (in `SearchPage.jsx` filter logic):
```javascript
let query = supabase.from('listing').select('*');

if (myNewFilter) {
  query = query.eq('MyNewField', myNewFilter);
}
```

**4. Add to URL Sync** (`src/lib/urlParams.js`):
```javascript
export const serializeFiltersToUrl = (filters) => {
  const params = new URLSearchParams();
  if (filters.myNewFilter) params.set('my-filter', filters.myNewFilter);
  // ... other filters
  return params.toString();
};
```

#### Add a New Page

**1. Create HTML Entry** (`public/my-new-page.html`):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My New Page - Split Lease</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/my-new-page.jsx"></script>
</body>
</html>
```

**2. Create Entry Point** (`src/my-new-page.jsx`):
```jsx
import { createRoot } from 'react-dom/client';
import MyNewPage from './islands/pages/MyNewPage.jsx';

const root = createRoot(document.getElementById('root'));
root.render(<MyNewPage />);
```

**3. Create Page Component** (`src/islands/pages/MyNewPage.jsx`):
```jsx
import React from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';

const MyNewPage = () => {
  return (
    <>
      <Header />
      <main>
        <h1>My New Page</h1>
        {/* Page content */}
      </main>
      <Footer />
    </>
  );
};

export default MyNewPage;
```

**4. Update Vite Config** (`vite.config.js`):
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // ... existing entries
        myNewPage: resolve(__dirname, 'public/my-new-page.html')
      }
    }
  }
});
```

**5. Add Styles** (`src/styles/my-new-page.css`):
```css
/* Page-specific styles */
```

**6. Link from Navigation** (`src/islands/shared/Header.jsx`):
```jsx
<a href="/my-new-page.html">My New Page</a>
```

#### Modify Schedule Selector

**1. Edit Component** (`src/islands/shared/ListingScheduleSelector.jsx`):
```jsx
// Make your changes to the component
```

**2. Test Locally**:
```bash
npm run dev
# Navigate to a listing page to test
```

**3. Check Validation** (`src/lib/scheduleSelector/validators.js`):
```javascript
// Update validation rules if needed
```

### Testing

**Manual Testing**:
1. Start dev server
2. Navigate through pages
3. Test filters, schedule selector, modals
4. Check mobile responsive design (DevTools)
5. Test authentication flow (if integrated)

**Browser Console Debugging**:
```javascript
// Check global state
console.log(window.ENV);
console.log(window.supabase);

// Check data lookups
console.log(await initializeLookups());
console.log(getNeighborhoodName('some-id'));

// Check auth
console.log(checkAuthStatus());
console.log(getAuthState());
```

**Playwright E2E Testing** (optional):
```bash
# Install Playwright (if not already)
npm install -D @playwright/test

# Run tests
npx playwright test

# Run in headed mode
npx playwright test --headed

# Run specific test
npx playwright test tests/search.spec.js
```

### Common Development Tasks

**Clear Data Lookup Cache**:
```javascript
// In browser console
await refreshLookups();
```

**Test Pricing Calculation**:
```javascript
// In browser console
import { calculatePricingBreakdown } from './src/lib/priceCalculations.js';
const listing = { /* ... */ };
const breakdown = calculatePricingBreakdown(listing, [1, 2, 3, 4, 5], 13);
console.log(breakdown);
```

**Test Day Conversion**:
```javascript
// In browser console
import { toBubbleDays, fromBubbleDays } from './src/lib/dayUtils.js';
console.log(toBubbleDays([1, 2, 3, 4, 5])); // [2, 3, 4, 5, 6]
console.log(fromBubbleDays([2, 3, 4, 5, 6])); // [1, 2, 3, 4, 5]
```

---

## 🚀 Deployment

### Cloudflare Pages

**Platform**: Cloudflare Pages with automatic builds from GitHub

#### Initial Setup

**1. Connect Repository**:
- Go to Cloudflare Pages dashboard
- Click "Create a project"
- Connect GitHub account
- Select repository

**2. Configure Build**:
```
Build command: npm run build
Build output directory: app/dist
Root directory: app
Node version: 18
```

**3. Set Environment Variables** (in Cloudflare dashboard):
```
VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

**4. Deploy**:
- Push to `main` branch
- Cloudflare auto-builds and deploys
- Preview URL available immediately
- Production URL updates after manual confirmation (or auto-deploy if configured)

#### Deployment Flow

```
1. Developer pushes to GitHub
       ↓
2. Cloudflare detects commit
       ↓
3. Cloudflare runs: npm install && npm run build
       ↓
4. Vite builds to app/dist/
       ↓
5. Custom Vite plugins:
   - Move HTML files to dist root
   - Copy assets/ directory
   - Copy _redirects and _headers
   - Copy functions/ directory
       ↓
6. Cloudflare deploys dist/ to CDN
       ↓
7. Preview URL available: [branch].[project].pages.dev
       ↓
8. Production URL (if main): [project].pages.dev or custom domain
```

#### Cloudflare Configuration Files

**`public/_redirects`**:
```
# Dynamic listing routes
/view-split-lease/*  /view-split-lease.html  200

# Legacy redirects
/view-split-lease.html/:id  /view-split-lease/:id  301

# Other HTML pages (rewrites)
/search  /search.html  200
/faq  /faq.html  200
/policies  /policies.html  200
# ... etc
```

**`public/_headers`**:
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

**`functions/view-split-lease/[id].js`**:
```javascript
export async function onRequest(context) {
  const { id } = context.params;

  // Could add server-side rendering, OG tags, etc.
  // Currently just returns the static HTML
  return context.env.ASSETS.fetch(context.request);
}
```

#### Custom Domain Setup

**1. Add Custom Domain** (in Cloudflare dashboard):
- Go to project → Custom domains
- Add your desired domain
- Cloudflare auto-configures DNS if domain on Cloudflare

**2. SSL**:
- Automatic HTTPS with Cloudflare Universal SSL
- Auto-redirects HTTP → HTTPS

**3. DNS Configuration** (if external DNS):
```
Type: CNAME
Name: @ (or subdomain)
Value: [project].pages.dev
```

#### Branch Previews

**Feature**: Every branch gets a preview URL

**URL Format**: `[branch].[project].pages.dev`

**Use Cases**:
- Feature branches: Test before merging
- Pull requests: Review changes live
- Staging: Dedicated staging branch

**Example**:
- `main` → `splitlease.pages.dev` (production)
- `develop` → `develop.splitlease.pages.dev` (staging)
- `feature-xyz` → `feature-xyz.splitlease.pages.dev` (preview)

### Alternative Deployment Platforms

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd app
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_GOOGLE_MAPS_API_KEY
```

**vercel.json**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/view-split-lease/:id", "destination": "/view-split-lease.html" }
  ]
}
```

#### Netlify

**netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/view-split-lease/*"
  to = "/view-split-lease.html"
  status = 200

[[redirects]]
  from = "/view-split-lease.html/:id"
  to = "/view-split-lease/:id"
  status = 301
```

---

## ⚙️ Configuration

### Environment Variables

**Required** (`.env` file):

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Optional** (for specific features):

```bash
# Bubble.io API (for contact/messaging features)
VITE_BUBBLE_API_KEY=your_bubble_api_key_here
```

### Obtaining API Keys

#### Supabase

**1. Create Project**:
- Go to [supabase.com](https://supabase.com)
- Create account and new project
- Or use existing project

**2. Get Credentials**:
- Go to **Settings → API**
- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon/public key** → `VITE_SUPABASE_ANON_KEY`

**3. Security Note**:
- Anon key is safe for frontend use
- Row Level Security (RLS) policies protect data
- Never expose service_role key in frontend

#### Google Maps

**1. Create Project**:
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create new project or select existing

**2. Enable APIs**:
- Enable **Maps JavaScript API**
- Enable **Places API**

**3. Create API Key**:
- Go to **Credentials → Create Credentials → API Key**
- Copy key → `VITE_GOOGLE_MAPS_API_KEY`

**4. Restrict Key** (recommended):
- **Application restrictions**: HTTP referrers
- Add your domain(s): `yourdomain.com/*`, `*.pages.dev/*`
- **API restrictions**: Select only Maps JavaScript API and Places API

**5. Billing**:
- Enable billing for production use
- First $200/month free with Google Cloud credits

#### Bubble.io

**For Read-Only Features**: No setup needed - existing endpoints work

**For Contact/Messaging Features**:
- Contact Split Lease team for API key
- Add to `.env` as `VITE_BUBBLE_API_KEY`

### Application Constants

**Configured in** `src/lib/constants.js` (439 lines):

**Days** (0-based internally):
```javascript
export const DAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
};
```

**Bubble API Days** (1-based for API):
```javascript
export const BUBBLE_DAY_NUMBERS = {
  SUNDAY: 1,
  MONDAY: 2,
  // ... etc
};
```

**Price Tiers**:
```javascript
export const PRICE_TIERS = [
  { value: 'all', label: 'All Prices', min: null, max: null },
  { value: '<200', label: 'Under $200', min: 0, max: 200 },
  { value: '200-350', label: '$200 - $350', min: 200, max: 350 },
  { value: '350-500', label: '$350 - $500', min: 350, max: 500 },
  { value: '500+', label: '$500+', min: 500, max: null }
];
```

**Schedule Patterns**:
```javascript
export const SCHEDULE_PATTERNS = {
  weeknight: [1, 2, 3, 4], // Mon-Thu (0-based)
  weekend: [5, 6, 0], // Fri-Sun
  weekly: [0, 1, 2, 3, 4, 5, 6] // Full week
};
```

**Map Configurations** (per borough):
```javascript
export const BOROUGH_MAP_CONFIG = {
  'manhattan': {
    center: { lat: 40.7580, lng: -73.9855 },
    zoom: 13
  },
  'brooklyn': {
    center: { lat: 40.6782, lng: -73.9442 },
    zoom: 12
  }
  // ... other boroughs
};
```

### Vite Configuration

**File**: `vite.config.js`

**Key Features**:

**1. Multi-Page Setup**:
```javascript
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'public/index.html'),
      search: resolve(__dirname, 'public/search.html'),
      viewSplitLease: resolve(__dirname, 'public/view-split-lease.html'),
      // ... 9 more entries
    }
  }
}
```

**2. Custom Routing Plugin**:
```javascript
plugins: [
  react(),
  {
    name: 'multi-page-routing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Rewrite /view-split-lease/123 to /view-split-lease.html
        if (req.url.startsWith('/view-split-lease/')) {
          req.url = '/view-split-lease.html';
        }
        next();
      });
    }
  }
]
```

**3. Post-Build Organization**:
```javascript
{
  name: 'post-build-organization',
  closeBundle() {
    // Move HTML files from dist/public to dist root
    // Copy assets/ directory
    // Copy _redirects and _headers
    // Copy functions/ directory
  }
}
```

---

## 🤝 Contributing

### Development Principles

**1. No Fallback Mechanisms**:
- Return real data or `null`/empty arrays
- Never use hardcoded demo data
- No compatibility layers or workarounds
- Let errors surface to find real problems

**Example** (❌ Bad):
```javascript
const getNeighborhood = (id) => {
  const name = cache.get(id);
  return name || 'Upper West Side'; // Fallback!
};
```

**Example** (✅ Good):
```javascript
const getNeighborhood = (id) => {
  const name = cache.get(id);
  return name || id; // Show ID if missing, revealing the gap
};
```

**2. Match Solution to Scale**:
- Don't over-engineer for hypothetical needs
- Build for current requirements
- Simple, direct solutions over clever abstractions

**3. Work Within Constraints**:
- If something is hard, it's often a design signal
- Don't fight the architecture
- Embrace natural boundaries

**4. Be Direct**:
- Code should clearly express intent
- Prefer explicit over implicit
- Future maintainers (including yourself) will thank you

### Code Style

**JavaScript/JSX**:
```javascript
// Use modern ES6+ features
const myFunction = async (param) => {
  // Prefer const over let, avoid var
  const result = await fetchData();

  // Use template literals
  console.log(`Result: ${result}`);

  // Use destructuring
  const { data, error } = result;

  // Use optional chaining
  const value = data?.field?.subfield;

  // Use nullish coalescing
  const finalValue = value ?? defaultValue;
};
```

**React Components**:
```jsx
// Functional components with hooks
const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  return (
    <div className="my-component">
      {/* JSX content */}
    </div>
  );
};

export default MyComponent;
```

**CSS**:
```css
/* Use CSS custom properties */
:root {
  --color-primary: #5B21B6;
  --spacing-unit: 8px;
}

/* Use BEM naming for component-specific styles */
.listing-card__title {
  color: var(--color-primary);
  margin-bottom: calc(var(--spacing-unit) * 2);
}

/* Use modern layout (Flexbox, Grid) */
.search-page__layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--spacing-unit);
}
```

### Git Workflow

**1. Create Feature Branch**:
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

**2. Make Changes and Commit**:
```bash
git add .
git commit -m "feat: Add new feature description"
```

**3. Push and Create PR**:
```bash
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring (no feature/bug change)
- `perf:` - Performance improvements
- `test:` - Test additions/changes
- `chore:` - Build process, dependencies, tooling

**Examples**:
```
feat: Add neighborhood search filter to SearchPage
fix: Resolve day indexing bug in schedule selector
docs: Update README with deployment instructions
refactor: Extract price calculation logic to separate module
perf: Implement lazy loading for listing photos
```

### Pull Request Guidelines

**1. Title**: Use conventional commit format
```
feat: Add AI market research signup modal
```

**2. Description**:
```markdown
## Summary
Adds a new AI market research signup modal that allows users to request personalized market reports.

## Changes
- Created AiSignupMarketReport component (advanced modal with AI parsing)
- Added Bubble.io API integration for AI workflow
- Implemented email validation and sanitization
- Added Lottie animations for loading states

## Testing
- Tested modal open/close
- Validated email input formats
- Confirmed API integration with Bubble workflow
- Tested on mobile and desktop

## Screenshots
[Include screenshots if UI changes]
```

**3. Checklist**:
- [ ] Code follows style guidelines
- [ ] No console errors
- [ ] Tested on Chrome, Firefox, Safari
- [ ] Tested on mobile
- [ ] No hardcoded fallback data
- [ ] Environment variables documented if new ones added

---

## 📞 Contact & Support

**Split Lease**
- Website: [app.split.lease](https://app.split.lease)

**For Developers**:
- Check GitHub Issues for known bugs and feature requests
- Create new issue for bugs or feature proposals

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Supabase** - Database and authentication
- **Google Maps Platform** - Interactive maps
- **Bubble.io** - No-code workflow backend
- **Cloudflare Pages** - Fast global deployment
- **Vite** - Lightning-fast build tool
- **React** - UI component library
- **Lottie** - Beautiful animations

---

**Last Updated**: 2025-01-16
**Version**: 2.0.0
**Status**: Active Development

---

## 🗂️ Additional Documentation

For more detailed technical reference:
- Database schema details: See "Database Schema" section above
- API integration: See "Core Technologies" section
- Component API: See component files for JSDoc comments
- Vite configuration: See `vite.config.js` inline comments
