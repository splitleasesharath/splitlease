# Public Pages Component Mapping

## Page Structure

Each page follows this pattern:

```
public/[page].html           → HTML shell
src/[page].jsx               → React entry point
src/islands/pages/[Page]/    → Page component directory
├── [Page]Page.jsx           → Hollow component (UI only)
├── use[Page]PageLogic.js    → Logic hook
└── components/              → Page-specific components
```

## Homepage (index)

| Layer | File |
|-------|------|
| HTML | `public/index.html` |
| Entry | `src/main.jsx` |
| Page | `src/islands/pages/HomePage/HomePage.jsx` |
| Logic | `src/islands/pages/HomePage/useHomePageLogic.js` |
| CSS | `src/styles/main.css` |

**Key Components:**
- Header/Navigation
- Hero section
- Featured listings
- Value propositions
- Footer

## Search Page

| Layer | File |
|-------|------|
| HTML | `public/search.html` |
| Entry | `src/search.jsx` |
| Page | `src/islands/pages/SearchPage/SearchPage.jsx` |
| Logic | `src/islands/pages/SearchPage/useSearchPageLogic.js` |

**Key Components:**
- Search filters (days, price, location)
- Map view (Google Maps)
- Listing cards
- Pagination

## View Listing (view-split-lease)

| Layer | File |
|-------|------|
| HTML | `public/view-split-lease.html` |
| Entry | `src/view-split-lease.jsx` |
| Page | `src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx` |
| Logic | `src/islands/pages/ViewSplitLeasePage/useViewSplitLeasePageLogic.js` |

**Key Components:**
- Photo gallery
- Listing details
- Pricing breakdown
- Host information
- Booking widget
- Amenities grid
- Location map

## FAQ Page

| Layer | File |
|-------|------|
| HTML | `public/faq.html` |
| Entry | `src/faq.jsx` |
| Page | `src/islands/pages/FAQPage/FAQPage.jsx` |
| CSS | `src/styles/faq.css` |

**Key Components:**
- Category navigation
- Accordion questions
- Search/filter

## Info Pages (Policies, About Us, Careers, etc.)

These pages share similar structure:

| Page | Entry | Page Component |
|------|-------|----------------|
| Policies | `src/policies.jsx` | `PoliciesPage` |
| About Us | `src/about-us.jsx` | `AboutUsPage` |
| Careers | `src/careers.jsx` | `CareersPage` |
| List With Us | `src/list-with-us.jsx` | `ListWithUsPage` |
| Why Split Lease | `src/why-split-lease.jsx` | `WhySplitLeasePage` |
| Host Guarantee | `src/host-guarantee.jsx` | `HostGuaranteePage` |

**Common Components:**
- Hero/header section
- Content sections
- CTA buttons
- Footer

## Help Center

| Layer | File |
|-------|------|
| HTML | `public/help-center.html` |
| Entry | `src/help-center.jsx` |
| Page | `src/islands/pages/HelpCenterPage/HelpCenterPage.jsx` |
| CSS | `src/styles/help-center.css` |

**Key Components:**
- Category cards
- Article navigation
- Search functionality

## Shared Components

Located in `src/islands/shared/`:

| Component | Usage |
|-----------|-------|
| `Header.jsx` | Site-wide header/nav |
| `Footer.jsx` | Site-wide footer |
| `Button.jsx` | Styled buttons |
| `Card.jsx` | Content cards |
| `Modal.jsx` | Modal dialogs |
| `ListingCard.jsx` | Listing preview cards |
| `GoogleMap.jsx` | Map integration |
| `PhotoGallery.jsx` | Image galleries |

## CSS Files

### Global Styles

| File | Purpose |
|------|---------|
| `src/styles/variables.css` | CSS custom properties (colors, fonts, spacing) |
| `src/styles/main.css` | Global resets, base styles |

### Page-Specific Styles

| File | Page |
|------|------|
| `src/styles/faq.css` | FAQ page |
| `src/styles/careers.css` | Careers page |
| `src/styles/help-center.css` | Help center |
| `src/styles/list-with-us.css` | List With Us page |
| `src/styles/why-split-lease.css` | Why Split Lease page |

## Design Change Priority

When applying new design:

1. **First**: `variables.css` - Sets global tokens
2. **Second**: Shared components - Affects all pages
3. **Third**: Page-specific components
4. **Last**: Page-specific CSS files

## Responsive Breakpoints

Current breakpoints (preserve these):

```css
/* Mobile first */
@media (min-width: 480px) { /* Small phones */ }
@media (min-width: 768px) { /* Tablets */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1280px) { /* Large desktop */ }
```
