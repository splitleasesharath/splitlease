# Home Page - Quick Reference Guide

**GENERATED**: 2026-01-20
**PAGE_TYPE**: Landing Page
**ENTRY_POINT**: `app/src/main.jsx`
**COMPONENT**: `app/src/islands/pages/HomePage.jsx`
**HTML_FILE**: `app/public/index.html`

---

## Page Overview

The Home page is the **main landing page** for Split Lease, introducing users to the flexible rental marketplace concept. It features:
- Hero section with interactive day schedule selector
- Value proposition cards highlighting key benefits
- **Inverted Schedule Cards** - Three Lottie-animated cards for browsing by schedule type (Weeknight, Weekend, Monthly)
- "Choose When to Be a Local" marketing section
- Featured property listings (real properties from database)
- Support options with contact cards
- AI-powered Market Research floating badge (only visible to non-logged-in users)

---

## Architecture

### Islands Pattern

```
index.html (static HTML)
    |
    +-- <div id="home-page">
            |
            v
        main.jsx (entry point)
            |
            +-- HomePage (React island)
                    +-- Header
                    +-- Hero
                    |       +-- SearchScheduleSelector (mounted via useEffect)
                    +-- ValuePropositions
                    +-- InvertedScheduleCards (NEW - Lottie schedule cards)
                    +-- LocalSection
                    +-- ListingsPreview
                    +-- SupportSection
                    +-- FloatingBadge (conditional - only when !isLoggedIn)
                    |       +-- AiSignupMarketReport (modal)
                    +-- Footer
```

### Entry Point

```jsx
// app/src/main.jsx
import { createRoot } from 'react-dom/client';
import HomePage from './islands/pages/HomePage.jsx';

createRoot(document.getElementById('home-page')).render(<HomePage />);
```

---

## File Inventory

### Core Files

| File | Purpose |
|------|---------|
| `app/src/main.jsx` | Entry point that mounts HomePage to DOM |
| `app/src/islands/pages/HomePage.jsx` | Main page component with internal sub-components |
| `app/public/index.html` | HTML template with `home-page` div |

### Shared Components Used

| Component | Location | Purpose |
|-----------|----------|---------|
| `Header` | `islands/shared/Header.jsx` | Site navigation, auth modals |
| `Footer` | `islands/shared/Footer.jsx` | Site footer, referral, app download |
| `SearchScheduleSelector` | `islands/shared/SearchScheduleSelector.jsx` | Day selection UI with URL sync |
| `AiSignupMarketReport` | `islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx` | AI market research modal with account creation |

### CSS Files

| File | Section |
|------|---------|
| `styles/main.css` | Global styles, imports |
| `styles/components/hero.css` | Hero section, day selector |
| `styles/components/value-props.css` | Value proposition cards |
| `styles/components/local-section.css` | "Choose When to Be a Local" |
| `styles/components/floating-badge.css` | AI floating badge |
| `styles/components/listings.css` | Featured listings grid |
| `styles/components/support.css` | Support options section |
| `styles/components/header.css` | Header navigation |
| `styles/components/footer.css` | Footer layout |
| `styles/components/mobile.css` | Mobile responsive overrides |
| `styles/components/schedule.css` | Schedule cards styling |

---

## Internal Components

HomePage contains the following internal components defined within the same file:

### 1. Hero Component

```jsx
function Hero({ onExploreRentals })
```

**Purpose**: Primary CTA area with headline and day schedule selector

**Key Elements**:
- NYC illustrations (Brooklyn Bridge left, Empire State Building right)
- Mobile-only floating Empire State Building image
- Headline: "Ongoing Rentals for Repeat Stays"
- Subheadline: "Discover flexible rental options in NYC. Only pay for the nights you need."
- `SearchScheduleSelector` component (mounted dynamically via useEffect)
- "Explore Rentals" CTA button

**CSS Classes**:
```css
.hero-section
.hero-content-wrapper
.hero-content
.hero-title
.hero-subtitle
.hero-cta-button
.hero-illustration
.hero-illustration-left
.hero-illustration-right
.mobile-empire-state
.mobile-break
```

**Responsive Behavior**:
- Desktop: Side-by-side NYC illustrations
- Mobile: Stacked layout, mobile Empire State image visible

### 2. ValuePropositions Component

```jsx
function ValuePropositions()
```

**Purpose**: Four-column grid showcasing key benefits

**Value Props Data**:
```javascript
const valueProps = [
  { icon: '...Icon-OnlineSelect...', title: '100s of Split Leases, or source off market' },
  { icon: '...Icon-Skyline...', title: 'Financially optimal. 45% less than Airbnb' },
  { icon: '...Icon-Backpack...', title: 'Safely store items while you\'re away.' },
  { icon: '...Layer 9...', title: 'Same room, same bed. Unlike a hotel.' }
];
```

**CSS Classes**:
```css
.value-props
.value-container
.value-card
.value-icon
```

### 3. InvertedScheduleCards Component (NEW)

```jsx
function InvertedScheduleCards()
```

**Purpose**: Three interactive Lottie-animated cards for browsing listings by schedule type

**Schedule Types**:
```javascript
const schedules = [
  { id: 'weeknight', title: 'Weeknight Listings', days: '2,3,4,5,6' },  // Mon-Fri
  { id: 'weekend', title: 'Weekend Listings', days: '6,7,1,2' },        // Fri-Sun+Mon
  { id: 'monthly', title: 'Monthly Listings', days: '1,2,3,4,5,6,7' }   // All days
];
```

**Key Features**:
- Lottie animations play on hover
- Progress bar tracks animation progress
- "Explore listings" button navigates to search with pre-selected days
- Loads `@lottiefiles/lottie-player` script dynamically

**CSS Classes**:
```css
.inverted-schedule-section
.schedule-header
.inverted-schedule-grid
.lottie-card-v11
.visual-section
.lottie-animation
.lottie-progress-bar
.lottie-progress-line
.content-section
.card-footer
.btn-primary
```

**Lottie Animation URLs**:
```javascript
weeknight: 'https://...Days-of-the-week-lottie.json'
weekend: 'https://...weekend-lottie.json'
monthly: 'https://...Weeks-of-the-month-lottie.json'
```

### 4. LocalSection Component

```jsx
function LocalSection({ onExploreRentals })
```

**Purpose**: Marketing section explaining the flexible rental concept

**Key Elements**:
- Two-column layout (text left, features right)
- "Choose when to be a local" heading
- Description paragraph
- Three numbered feature items:
  1. Move-in Ready - Fully-furnished spaces
  2. Everything You Need - Store items like toiletries, monitors, work attire
  3. Total Flexibility - Forget HOAs, switch neighborhoods seasonally
- Primary ("Explore Rentals") and secondary ("Learn More" -> /why-split-lease.html) CTA buttons

**CSS Classes**:
```css
.local-section
.local-container
.local-content-wrapper
.local-left-section
.local-right-section
.local-description
.local-cta-group
.local-primary-button
.local-secondary-button
.local-feature-item
.local-feature-number
.local-feature-content
```

### 5. ListingsPreview Component

```jsx
function ListingsPreview({ selectedDays = [] })
```

**Purpose**: Showcase real properties from the database

**Key Elements**:
- Section heading: "Check Out Some Listings"
- 4-column grid of listing cards
- Real property data via `PROPERTY_IDS`
- Each card displays: image, location, title, meta info (bedrooms, beds, bathrooms, storage)
- "Show me more Rentals" button navigates to search page

**Property IDs Used** (from `lib/constants.js`):
```javascript
PROPERTY_IDS = {
  ONE_PLATT_STUDIO: '1586447992720x748691103167545300',
  PIED_A_TERRE: '1701107772942x447054126943830000',
  FURNISHED_1BR: '1701115344294x620453327586984000',
  FURNISHED_STUDIO: '1701196985127x160157906679627780'
}
```

**Hardcoded Listing Data**:
```javascript
const listings = [
  { id: PROPERTY_IDS.ONE_PLATT_STUDIO, title: 'One Platt | Studio', location: 'Financial District, Manhattan', ... },
  { id: PROPERTY_IDS.PIED_A_TERRE, title: 'Perfect 2 BR Apartment', location: 'Upper East Side, Manhattan', ... },
  { id: PROPERTY_IDS.FURNISHED_1BR, title: 'Fully furnished 1bdr apartment', location: 'Harlem, Manhattan', ... },
  { id: PROPERTY_IDS.FURNISHED_STUDIO, title: 'Furnished Studio Apt for Rent', location: "Hell's Kitchen, Manhattan", ... }
];
```

**Navigation**:
- Listing click: `/view-split-lease/{propertyId}` (clean URL path)
- Show More button: `/search.html` with optional `?days-selected=` parameter

**CSS Classes**:
```css
.listings-section
.listings-container
.listings-grid
.listing-card
.listing-image
.listing-details
.listing-location
.location-icon
.listing-meta
.meta-item
.meta-icon
.show-more-btn
.scroll-indicators
.indicator
.indicator.active
```

### 6. SupportSection Component

```jsx
function SupportSection()
```

**Purpose**: Support and help options

**Support Options**:
```javascript
const supportOptions = [
  { icon: '...COLOR', label: 'Instant Live-Chat', link: FAQ_URL },
  { icon: '...COLOR', label: 'Browse our FAQs', link: FAQ_URL },
  { icon: '/images/support-centre-icon.svg', label: 'Support Centre', link: '/help-center', isInternal: true }
];
```

**CSS Classes**:
```css
.support-section
.support-options
.support-card
.support-card-link
.support-icon
```

### 7. FloatingBadge Component

```jsx
function FloatingBadge({ onClick })
```

**Purpose**: Entry point for AI-powered market research signup (only shown to non-logged-in users)

**Key Elements**:
- Fixed position bottom-right
- Lottie atom animation (white)
- "Free" text on top
- "Market Research" text on bottom
- Expandable hover state showing "Free Market Research"
- Opens `AiSignupMarketReport` modal on click

**Lottie Animation URL**:
```javascript
'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1751640509056x731482311814151200/atom%20white.json'
```

**CSS Classes**:
```css
.floating-badge
.badge-content
.badge-icon
.badge-text-top
.badge-text-bottom
.badge-expanded
```

---

## Main HomePage Component

### State Management

```javascript
const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false);
const [selectedDays, setSelectedDays] = useState([]);
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [RecoveryComponent, setRecoveryComponent] = useState(null);
```

### Key Effects

1. **Password Reset Detection** - Checks for `type=recovery` in URL hash and redirects or dynamically loads `ResetPasswordPage`
2. **Auth Status Check** - Calls `checkAuthStatus()` on mount to determine if user is logged in
3. **SearchScheduleSelector Mounting** - Dynamically mounts the day selector component into the hero section

### Handlers

```javascript
handleExploreRentals()        // Navigate to /search.html with selected days
handleOpenAIResearchModal()   // Open AI signup modal
handleCloseAIResearchModal()  // Close AI signup modal
```

### Conditional Rendering

- **RecoveryComponent**: If detected, renders `ResetPasswordPage` instead of home page
- **FloatingBadge + AiSignupMarketReport**: Only rendered when `!isLoggedIn`

---

## SearchScheduleSelector Component

### Overview

Interactive day-of-week selector with URL parameter synchronization and styled-components.

**Location**: `app/src/islands/shared/SearchScheduleSelector.jsx`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSelectionChange` | Function | - | Callback when days change (receives array of day objects) |
| `onError` | Function | - | Callback for validation errors |
| `className` | String | - | Custom CSS class |
| `minDays` | Number | 2 | Minimum number of nights required |
| `requireContiguous` | Boolean | true | Require consecutive days |
| `initialSelection` | Number[] | - | Initial selected days (0-based). If not provided, reads from URL or defaults to Monday-Friday |
| `updateUrl` | Boolean | true | Sync selection to URL parameter |

### Day Indexing

| Day | Internal (JS) | URL Parameter | Display |
|-----|---------------|---------------|---------|
| Sunday | 0 | 1 | S |
| Monday | 1 | 2 | M |
| Tuesday | 2 | 3 | T |
| Wednesday | 3 | 4 | W |
| Thursday | 4 | 5 | T |
| Friday | 5 | 6 | F |
| Saturday | 6 | 7 | S |

**URL Parameter Format**: `?days-selected=2,3,4,5,6` (1-based)
**Default Selection**: Monday-Friday `[1,2,3,4,5]` (0-based)

### Key Features

- **Drag Selection**: Click and drag to select range of days
- **Contiguity Validation**: Ensures selected days are consecutive (with wrap-around support)
- **Wrap-Around Support**: Fri-Sat-Sun-Mon considered contiguous
- **Real-time Check-in/Check-out Display**: Shows check-in and check-out days based on selection
- **Error States**: Red highlight with pulse animation for invalid selections
- **URL Sync**: Updates browser URL without reload

### Styled Components

Uses `styled-components` for styling:
- `Container` - Main wrapper
- `SelectorRow` - Row containing calendar icon and days grid
- `CalendarIcon` - Calendar icon wrapper
- `DaysGrid` - Flexbox container for day cells
- `DayCell` - Individual day button with selection states
- `InfoContainer` - Container for check-in/check-out display
- `InfoText` - Text showing check-in/check-out or errors

### Validation Rules

```javascript
// Minimum nights check (nights = days - 1, checkout doesn't count)
if (nightCount < minDays) {
  error: "Please select at least 2 nights per week"
}

// Contiguity check (with wrap-around support)
if (!isContiguous(days)) {
  error: "Please select contiguous days (e.g., Mon-Tue-Wed, not Mon-Wed-Fri)"
}
```

---

## AiSignupMarketReport Modal

### Overview

Multi-stage AI-powered market research signup flow with automatic user account creation.

**Location**: `app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

### Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | Boolean | Modal visibility |
| `onClose` | Function | Close callback |
| `onSubmit` | Function | Custom submit handler (optional) |

### Flow Stages

```
1. freeform -> User enters description (optionally with email/phone embedded)
       |
       v
2. parsing -> Extracting contact info (1.5s animation)
       |
       +-- Auto-submit if email+phone are certain and complete
       v
3. contact -> Manual email/phone entry (if not auto-submitted)
       |
       v
4. loading -> Submitting to backend (1.5s animation)
       |
       v
5. final -> Success message (auto-closes after 3.5s and reloads page)
```

### Smart Features

- **Email Extraction**: Regex extraction from freeform text
- **Auto-Correction**: Fixes common typos (gmial.com -> gmail.com, etc.)
- **Phone Extraction**: Detects standard US phone formats (10+ digits)
- **Name Extraction**: Extracts name from text patterns or email local part
- **Auto-Submit**: Skips contact form if email+phone are high-certainty
- **Automatic User Account Creation**: Creates user with password `SL{Name}77`
- **Profile Parsing**: GPT-4 extracts structured data from freeform text

### Backend Integration

**Step 1: Account Creation**
```javascript
signupUser(email, generatedPassword, generatedPassword, {
  firstName: extractedName || 'Guest',
  lastName: '',
  userType: 'Guest',
  phoneNumber: phone || ''
})
```

**Step 2: Market Research Submission**
```javascript
POST ${SUPABASE_URL}/functions/v1/ai-signup-guest
{
  email: string,
  phone: string,
  text_inputted: string
}
```

**Step 3: Profile Parsing (Optional)**
```javascript
POST ${SUPABASE_URL}/functions/v1/bubble-proxy
{
  action: 'parse_profile',
  payload: { user_id, email, text_inputted }
}
```

### Lottie Animations

| Stage | Animation URL |
|-------|---------------|
| Parsing | `Animation - 1722533570126.json` |
| Loading | `Animation - 1722533570126.json` (same as parsing) |
| Success | `Report.json` |

### Internal Sub-Components

- `FreeformInput` - Textarea for describing logistics needs
- `ContactForm` - Email and phone input fields
- `ParsingStage` - Lottie animation with "Analyzing your request..." message
- `LoadingStage` - Lottie animation with custom message
- `FinalMessage` - Success Lottie with "Tomorrow morning, you'll receive a full report"
- `NavigationButtons` - Back/Next/Submit buttons
- `LottieAnimation` - Wrapper for loading and rendering Lottie JSON

### Effects

- **Modal Close Reset**: Resets flow state when modal closes
- **Body Scroll Lock**: Prevents background scrolling when modal is open
- **Escape Key Handler**: Closes modal on Escape key press
- **Auto-Close on Success**: Closes modal after 3.5s on final stage and reloads page

---

## Data Flow

### Day Selection

```
User interaction on SearchScheduleSelector
    |
    v
selectedDays state update (0-based indices)
    |
    +-- onSelectionChange callback -> HomePage.setSelectedDays()
    |
    +-- URL update (1-based) -> ?days-selected=2,3,4,5,6
            |
            v
    Explore Rentals click -> /search.html?days-selected={oneBased}
```

### Listing Navigation

```
ListingsPreview
    |
    +-- handleListingClick(propertyId)
            |
            v
        /view-split-lease/{propertyId}
    |
    +-- handleShowMore()
            |
            v
        /search.html?days-selected={selectedDays}
```

### AI Signup Flow

```
FloatingBadge click (only if !isLoggedIn)
    |
    v
AiSignupMarketReport modal opens
    |
    v
User enters description + contact
    |
    v
signupUser() -> Creates user account (SL{Name}77 password)
    |
    v
POST to ai-signup-guest Edge Function
    |
    v
POST to bubble-proxy (parse_profile action)
    |
    v
Market research report generated -> Emailed to user
    |
    v
Page reload to show logged-in state
```

---

## Styling Patterns

### CSS Variables (from `variables.css`)

```css
--color-primary: #31135d;      /* Deep purple */
--color-primary-hover: #1f0b38;
--color-secondary: #5B21B6;
--bg-light: #f3f4f6;
--bg-white: #ffffff;
--text-dark: #1a1a1a;
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.12);
--radius-lg: 12px;
```

### Button Styles

**Primary CTA (Hero/Local)**:
```css
.hero-cta-button,
.local-primary-button {
  background: white;
  color: #5B5FCF;
  border: 2px solid #5B5FCF;
  padding: 0.5rem 1.5rem;
  font-weight: 600;
  border-radius: 8px;
}
```

**Show More Button**:
```css
.show-more-btn {
  background: #5B21B6;
  color: white;
  padding: 1rem 2.5rem;
  border-radius: 0.75rem;
}
```

### Responsive Breakpoints

| Breakpoint | Layout Changes |
|------------|----------------|
| > 1024px | Desktop: 4-column listings grid |
| 768-1023px | Tablet: 3-column grid |
| 640-767px | Small tablet: 2-column grid |
| < 640px | Mobile: Horizontal scroll with snap |

---

## Key Integrations

### Header Integration

- SignUp/Login modal trigger
- Auth state detection
- Navigation menu
- LoggedInAvatar component

### Footer Integration

- Referral system (via bubble-proxy Edge Function)
- Import listing functionality
- App Store download link
- CreateDuplicateListingModal
- ImportListingModal

### Search Page Navigation

- Hero CTA -> `/search.html`
- Day selection persisted via URL params
- Show More button -> `/search.html`
- InvertedScheduleCards -> `/search.html?days-selected={days}`

### Password Reset Safety Net

HomePage detects `type=recovery` in URL hash and:
1. If at root (`/` or `/index.html`): Redirects to `/reset-password` with hash
2. If on other path (SPA fallback): Dynamically imports and renders `ResetPasswordPage`

---

## Constants Reference

### URLs (from `lib/constants.js`)

```javascript
SEARCH_URL = '/search'
VIEW_LISTING_URL = '/view-split-lease'
SIGNUP_LOGIN_URL = 'https://app.split.lease/signup-login'
ACCOUNT_PROFILE_URL = 'https://app.split.lease/account-profile'
FAQ_URL = '/faq'
```

### Day Constants

```javascript
DAYS = { SUNDAY: 0, MONDAY: 1, ..., SATURDAY: 6 }
DAY_NAMES = ['Sunday', 'Monday', ..., 'Saturday']
DAY_ABBREVIATIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
SCHEDULE_PATTERNS.WEEKNIGHT = [1, 2, 3, 4, 5]  // Default selection
```

### Property IDs

```javascript
PROPERTY_IDS = {
  ONE_PLATT_STUDIO: '1586447992720x748691103167545300',
  PIED_A_TERRE: '1701107772942x447054126943830000',
  FURNISHED_1BR: '1701115344294x620453327586984000',
  FURNISHED_STUDIO: '1701196985127x160157906679627780'
}
```

### Lottie Animations (from `lib/constants.js`)

```javascript
LOTTIE_ANIMATIONS = {
  HEADER_ICON: '...atom animation.json',
  ATOM_WHITE: '...atom white.json',
  PARSING: '...Animation - 1722533570126.json',
  LOADING: '...Animation - 1720724343172.lottie',
  SUCCESS: '...Report.json'
}
```

---

## Development Checklist

### When Modifying Hero Section
- [ ] Test day selector on all breakpoints
- [ ] Verify URL parameter sync works
- [ ] Check illustration positioning
- [ ] Test CTA button navigation
- [ ] Verify mobile Empire State image visibility

### When Modifying InvertedScheduleCards
- [ ] Test Lottie animations play on hover
- [ ] Verify progress bar animation
- [ ] Check navigation to search with correct days parameter
- [ ] Test on mobile (may need touch event handling)

### When Modifying Listings Section
- [ ] Verify real property IDs exist in database
- [ ] Test responsive grid/scroll behavior
- [ ] Check image loading and fallbacks
- [ ] Test "Show More" navigation with day selection
- [ ] Verify clean URL format for listing links (/view-split-lease/{id})

### When Modifying AI Signup
- [ ] Test all flow stages (freeform -> parsing -> contact -> loading -> final)
- [ ] Verify Edge Function connectivity (ai-signup-guest, bubble-proxy)
- [ ] Test email extraction and auto-correction
- [ ] Test phone number extraction (should not catch budget numbers)
- [ ] Test name extraction from text and email
- [ ] Verify user account creation with generated password
- [ ] Check Lottie animation loading
- [ ] Test auto-close and page reload on success

### Mobile Testing
- [ ] Hero section stacking
- [ ] Day selector touch interaction (drag selection)
- [ ] Listings horizontal scroll with snap
- [ ] Floating badge visibility and tap area
- [ ] InvertedScheduleCards touch interaction
- [ ] Footer layout and forms
- [ ] Modal responsiveness

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `app/CLAUDE.md` | React app architecture overview |
| `app/src/CLAUDE.md` | Source directory structure |
| `app/src/islands/pages/CLAUDE.md` | Page component patterns |
| `app/src/islands/CLAUDE.md` | Islands architecture |
| `app/src/styles/CLAUDE.md` | CSS architecture |
| `app/src/logic/CLAUDE.md` | Four-layer logic system |
| `DATABASE_SCHEMA_OVERVIEW.md` | Database tables reference |
| `.claude/Documentation/Auth/SIGNUP_FLOW.md` | Signup flow documentation |

---

**DOCUMENT_VERSION**: 2.0
**LAST_UPDATED**: 2026-01-20
**STATUS**: Complete Quick Reference
