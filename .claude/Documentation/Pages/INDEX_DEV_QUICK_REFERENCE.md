# Index Dev Page - Quick Reference Guide

**GENERATED**: 2025-12-11
**PAGE_TYPE**: Development Landing Page (Variant of Home Page)
**ENTRY_POINT**: `app/src/main.jsx`
**COMPONENT**: `app/src/islands/pages/HomePage.jsx`
**HTML_FILE**: `app/public/index-dev.html`
**ROUTE**: `/index-dev` (devOnly: true)

---

## Page Overview

The Index Dev page is a **development-only variant** of the main Home page. It serves the same `HomePage.jsx` component but uses a specialized HTML template (`index-dev.html`) that includes experimental CSS overrides for testing UI variations.

**Key Differences from Production Home Page (`index.html`)**:
- Custom value card styling (Variation 16: Ultra-Minimal with Breathing Glow)
- Transparent card backgrounds
- Enhanced hover animations with breathing glow effect
- Dev-only CSS overrides embedded in HTML `<style>` block

---

## Architecture

### Islands Pattern

```
index-dev.html (static HTML with dev CSS overrides)
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
                    +-- InvertedScheduleCards
                    +-- LocalSection
                    +-- ListingsPreview
                    +-- SupportSection
                    +-- Footer
                    +-- FloatingBadge (logged-out only)
                    |       +-- AiSignupMarketReport (modal)
```

### Entry Point

```jsx
// app/src/main.jsx
import { createRoot } from 'react-dom/client';
import HomePage from './islands/pages/HomePage.jsx';

createRoot(document.getElementById('home-page')).render(<HomePage />);
```

### Route Configuration

```javascript
// app/src/routes.config.js
{
  path: '/index-dev',
  file: 'index-dev.html',
  aliases: ['/index-dev.html'],
  protected: false,
  cloudflareInternal: false,
  hasDynamicSegment: false,
  devOnly: true  // Excluded from production build
}
```

---

## File Inventory

### Core Files

| File | Purpose |
|------|---------|
| `app/src/main.jsx` | Entry point that mounts HomePage to DOM |
| `app/src/islands/pages/HomePage.jsx` | Main page component (shared with index.html) |
| `app/public/index-dev.html` | HTML template with dev-specific CSS overrides |

### HTML Template Structure

```html
<!-- app/public/index-dev.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Split Lease - DEV VERSION - Ongoing Rentals for Repeat Stays</title>
  <meta name="description" content="Find flexible rentals for repeat stays in NYC">
  <link rel="icon" type="image/png" href="/assets/images/split-lease-purple-circle.png">
  <link rel="stylesheet" href="/src/styles/main.css">
  <style>
    /* Dev-only overrides for value cards - Variation 16: Ultra-Minimal with Breathing Glow */
    /* ... embedded CSS ... */
  </style>
</head>
<body>
  <div id="home-page"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

### Shared Components Used

| Component | Location | Purpose |
|-----------|----------|---------|
| `Header` | `islands/shared/Header.jsx` | Site navigation, auth modals |
| `Footer` | `islands/shared/Footer.jsx` | Site footer, referral, app download |
| `SearchScheduleSelector` | `islands/shared/SearchScheduleSelector.jsx` | Day selection UI with URL sync |
| `AiSignupMarketReport` | `islands/shared/AiSignupMarketReport/` | AI market research modal |

---

## Dev-Only CSS Overrides

The `index-dev.html` file includes embedded CSS that overrides the default value card styling:

### Value Props Section Overrides

```css
/* Dev-only overrides for value cards - Variation 16: Ultra-Minimal with Breathing Glow */
.value-props {
  padding: 3rem 2rem;
}

.value-container {
  gap: 1rem;
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 768px) {
  .value-container {
    grid-template-columns: 1fr;
  }
}

.value-card {
  background: transparent !important;
  padding: 1.5rem;
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: none !important;
  border-radius: 0 !important;
  border: none !important;
}
```

### Value Icon Styling

```css
.value-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.value-icon::before {
  content: '';
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(circle,
      rgba(49, 19, 93, 0.4) 0%,
      rgba(74, 29, 127, 0.2) 40%,
      transparent 70%);
  opacity: 0;
  animation: breathe 3s ease-in-out infinite;
  animation-play-state: paused;
  filter: blur(8px);
  z-index: -1;
}
```

### Breathing Glow Animation

```css
@keyframes breathe {
  0%, 100% {
    transform: scale(0.85);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.6;
  }
}

.value-card:hover .value-icon::before {
  animation-play-state: running;
}

.value-card:hover .value-icon {
  transform: translateY(-10px) scale(1.05);
}
```

### Icon Image Effects

```css
.value-icon img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  filter: grayscale(0.4) opacity(0.7);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.value-card:hover .value-icon img {
  filter: grayscale(0) opacity(1) drop-shadow(0 6px 16px rgba(49, 19, 93, 0.4));
}
```

### Title Hover Effects

```css
.value-card h3 {
  font-size: 0.875rem;
  font-weight: 400;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
  transition: all 0.4s ease;
}

.value-card:hover h3 {
  color: #111827;
  font-weight: 500;
}
```

---

## HomePage Component Sections

### 1. Hero Section

**Purpose**: Primary CTA area with headline and day schedule selector

**Internal Component**: `Hero({ onExploreRentals })`

**Key Elements**:
- Mobile-only floating Empire State Building image
- Hero content wrapper with NYC illustrations (Brooklyn Bridge left, Empire State right)
- Headline: "Ongoing Rentals for Repeat Stays"
- Subheadline: "Discover flexible rental options in NYC. Only pay for the nights you need."
- `SearchScheduleSelector` component (mounted via `useEffect`)
- "Explore Rentals" CTA button

### 2. Value Propositions Section

**Purpose**: Four-column grid showcasing key benefits

**Internal Component**: `ValuePropositions()`

**Value Props**:
1. "100s of Split Leases, or source off market"
2. "Financially optimal. 45% less than Airbnb"
3. "Safely store items while you're away."
4. "Same room, same bed. Unlike a hotel."

**Icons**: Hosted on Bubble CDN (192x192 images)

### 3. Inverted Schedule Cards Section

**Purpose**: Quick navigation to pre-filtered search results by schedule type

**Internal Component**: `InvertedScheduleCards()`

**Schedule Options**:
| ID | Title | Days Parameter | Description |
|----|-------|----------------|-------------|
| `weeknight` | Weeknight Listings | `2,3,4,5,6` | Monday-Friday |
| `weekend` | Weekend Listings | `6,7,1,2` | Fri-Sun+Mon |
| `monthly` | Monthly Listings | `1,2,3,4,5,6,7` | All days |

**Features**:
- Lottie animations (loaded dynamically)
- Hover-triggered animation playback
- Progress bar showing animation position
- Click navigates to `/search.html?days-selected={days}`

### 4. Local Section

**Purpose**: Marketing section explaining the flexible rental concept

**Internal Component**: `LocalSection({ onExploreRentals })`

**Features**:
1. Move-in Ready - Fully-furnished spaces
2. Everything You Need - Storage for personal items
3. Total Flexibility - Switch neighborhoods seasonally

**CTAs**:
- Primary: "Explore Rentals" button
- Secondary: "Learn More" link to `/why-split-lease.html`

### 5. Listings Preview Section

**Purpose**: Showcase featured real properties from database

**Internal Component**: `ListingsPreview({ selectedDays = [] })`

**Featured Listings** (from `PROPERTY_IDS` constant):
| Property | ID | Location |
|----------|-----|----------|
| One Platt Studio | `PROPERTY_IDS.ONE_PLATT_STUDIO` | Financial District, Manhattan |
| Perfect 2 BR Apartment | `PROPERTY_IDS.PIED_A_TERRE` | Upper East Side, Manhattan |
| Fully furnished 1bdr | `PROPERTY_IDS.FURNISHED_1BR` | Harlem, Manhattan |
| Furnished Studio Apt | `PROPERTY_IDS.FURNISHED_STUDIO` | Hell's Kitchen, Manhattan |

**Navigation**:
- Card click: `/view-split-lease/{propertyId}`
- "Show me more Rentals": `/search.html?days-selected={selectedDays}`

### 6. Support Section

**Purpose**: Support and help options

**Internal Component**: `SupportSection()`

**Options**:
| Label | Link | Target |
|-------|------|--------|
| Instant Live-Chat | `FAQ_URL` | External |
| Browse our FAQs | `FAQ_URL` | External |
| Support Centre | `/help-center` | Internal |

### 7. Floating Badge

**Purpose**: Entry point for AI-powered market research signup (logged-out users only)

**Internal Component**: `FloatingBadge({ onClick })`

**Features**:
- Fixed position (bottom-right)
- Lottie atom animation (autoplay loop)
- Expandable text on hover
- Opens `AiSignupMarketReport` modal on click
- Only visible when `!isLoggedIn`

---

## State Management

### HomePage State

```javascript
const [isAIResearchModalOpen, setIsAIResearchModalOpen] = useState(false);
const [selectedDays, setSelectedDays] = useState([]);
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [RecoveryComponent, setRecoveryComponent] = useState(null);
```

### Effects

1. **Password Reset Detection**: Checks for `type=recovery` in URL hash, redirects or dynamically loads `ResetPasswordPage`
2. **Auth Status Check**: Calls `checkAuthStatus()` on mount
3. **SearchScheduleSelector Mount**: Creates mount point in hero section and renders the selector

---

## Imports

```javascript
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import SearchScheduleSelector from '../shared/SearchScheduleSelector.jsx';
import AiSignupMarketReport from '../shared/AiSignupMarketReport';
import { checkAuthStatus } from '../../lib/auth.js';
import { PROPERTY_IDS, FAQ_URL } from '../../lib/constants.js';
```

---

## Navigation Flow

### Day Selection to Search

```
User selects days in SearchScheduleSelector
    |
    v
onSelectionChange callback updates selectedDays state
    |
    v
User clicks "Explore Rentals" or "Show me more Rentals"
    |
    v
handleExploreRentals() converts 0-based to 1-based indices
    |
    v
Redirects to /search.html?days-selected={1-based comma-separated}
```

### Schedule Card Navigation

```
User hovers on schedule card
    |
    v
Lottie animation plays, progress bar animates
    |
    v
User clicks "Explore listings" button
    |
    v
handleExploreClick(days) redirects to /search.html?days-selected={days}
```

### AI Research Flow

```
User clicks FloatingBadge (logged-out only)
    |
    v
setIsAIResearchModalOpen(true)
    |
    v
AiSignupMarketReport modal opens
    |
    v
User completes multi-step signup flow
    |
    v
handleCloseAIResearchModal() closes modal
```

---

## Styling Patterns

### CSS Variables Used (from `variables.css`)

```css
--color-primary: #31135d;      /* Deep purple */
--color-primary-hover: #1f0b38;
--color-secondary: #5B21B6;
--bg-light: #f3f4f6;
--bg-white: #ffffff;
--text-dark: #1a1a1a;
```

### Dev Override Colors

```css
/* Value card breathing glow gradient */
rgba(49, 19, 93, 0.4)   /* Primary purple 40% opacity */
rgba(74, 29, 127, 0.2)  /* Secondary purple 20% opacity */

/* Text colors */
#6b7280  /* Gray-500 - default title */
#111827  /* Gray-900 - hover title */
```

---

## External Dependencies

### Lottie Player

Loaded dynamically in `InvertedScheduleCards`:

```javascript
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
  script.async = true;
  document.body.appendChild(script);
  // Cleanup on unmount
}, []);
```

### Lottie Animation URLs

| Purpose | URL |
|---------|-----|
| Weeknight Schedule | `...Days-of-the-week-lottie.json` |
| Weekend Schedule | `...weekend-lottie.json` |
| Monthly Schedule | `...Weeks-of-the-month-lottie.json` |
| Floating Badge Atom | `...atom white.json` |

---

## Development Usage

### Accessing the Page

```
http://localhost:8000/index-dev
http://localhost:8000/index-dev.html
```

### Purpose

Use this page to:
- Test UI variations for value proposition cards
- Compare breathing glow animation vs production styling
- Experiment with ultra-minimal card designs
- Preview changes before promoting to production

### Production Exclusion

The `devOnly: true` flag in `routes.config.js` ensures this page is:
- **Excluded** from production builds (`buildRollupInputs` skips it)
- **Not deployed** to Cloudflare Pages
- **Only accessible** in local development

---

## Development Checklist

### When Modifying Dev CSS Overrides
- [ ] Test on all breakpoints (desktop, tablet, mobile)
- [ ] Verify breathing animation performance
- [ ] Check hover state transitions
- [ ] Compare with production styling in `index.html`

### When Testing Value Card Variations
- [ ] Verify icon sizing (72x72)
- [ ] Test hover lift animation (`translateY(-10px)`)
- [ ] Check grayscale filter removal on hover
- [ ] Validate text color transition

### When Promoting Changes to Production
- [ ] Copy relevant CSS to appropriate stylesheet
- [ ] Test on `index.html` (production)
- [ ] Remove dev-specific overrides from `index-dev.html`
- [ ] Update this documentation

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [HOME_QUICK_REFERENCE.md](./HOME_QUICK_REFERENCE.md) | Production home page documentation |
| [app/CLAUDE.md](../../../app/CLAUDE.md) | React app architecture overview |
| [app/src/islands/pages/CLAUDE.md](../../../app/src/islands/pages/CLAUDE.md) | Page component patterns |
| [Routing/ROUTING_GUIDE.md](../Routing/ROUTING_GUIDE.md) | Route configuration guide |

---

**DOCUMENT_VERSION**: 1.0
**LAST_UPDATED**: 2025-12-11
**STATUS**: Complete Quick Reference
