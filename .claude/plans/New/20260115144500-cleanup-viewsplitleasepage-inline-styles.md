# Cleanup Plan: Extract Inline Styles from ViewSplitLeasePage.jsx

**Generated**: 2026-01-15 14:45:00
**Chunk**: 8 of 15 (FP Refactoring Plan)
**File**: `app/src/islands/pages/ViewSplitLeasePage.jsx`
**Target**: `app/src/islands/pages/ViewSplitLeasePage.module.css`

---

## 1. Executive Summary

### What is Being Cleaned Up
Extract **226 inline style objects** from `ViewSplitLeasePage.jsx` to the existing CSS Module file. This eliminates runtime style object creation on every render, improves performance, and centralizes styling for maintainability.

### Why This Cleanup is Needed
- **Performance**: Each inline `style={{...}}` creates a new object reference on every render, preventing React's reconciliation optimizations
- **Maintainability**: Scattered inline styles make global design changes difficult
- **Consistency**: CSS Module enables proper hover/focus states via pseudo-classes instead of JS event handlers
- **Bundle Size**: CSS is more efficiently compressed than JS style objects

### Scope and Boundaries
- **In Scope**: All 226 `style={{...}}` occurrences in ViewSplitLeasePage.jsx
- **Out of Scope**: Component logic, state management, event handlers (except inline hover/focus handlers that set styles)
- **Dependencies**: Existing CSS Module already has 28 class definitions to extend

### Expected Outcomes
- Zero inline `style={{...}}` in the component (except truly dynamic values)
- All styles consolidated in `ViewSplitLeasePage.module.css`
- Simplified component with only `className={styles.xxx}` references
- Elimination of ~50 inline event handlers used solely for hover/focus styling

---

## 2. Current State Analysis

### File Statistics
| Metric | Count |
|--------|-------|
| Total Lines | 3,628 |
| Inline style={{}} | 226 |
| Existing CSS Classes | 28 (in .module.css) |
| JS Hover/Focus Handlers | ~50 |
| Component Sections | 12 major |

### Existing CSS Module Classes (Already Defined)
The file already imports and uses a partial CSS module:
```javascript
import styles from './ViewSplitLeasePage.module.css';
```

Current classes in `ViewSplitLeasePage.module.css`:
- `schedulePatternContainer`, `schedulePatternHeader`, `schedulePatternLabel`, `schedulePatternText`, `schedulePatternTextBold`, `schedulePatternTextAccent`
- `loadingStateContainer`, `loadingSpinner`
- `errorStateContainer`, `errorIcon`, `errorTitle`, `errorMessage`, `errorButton`
- `photoGalleryMobileContainer`, `photoGalleryMobileImage`, `photoGalleryDesktopGrid`, `photoGalleryImage`
- `mainContainer`, `mainContent`, `leftColumn`, `rightColumn`
- `buttonPrimary`, `formInput`, `modalOverlay`

### Inline Style Categories (Grouped by Component Section)

#### Category A: Helper Components (Lines 282-405)
| Line Range | Component | Style Count | Pattern |
|------------|-----------|-------------|---------|
| 290-328 | `SchedulePatternHighlight` | 7 | Container, flex layout, text styling |
| 338-359 | `LoadingState` | 2 | Centered flex container, spinner animation |
| 364-403 | `ErrorState` | 5 | Centered text, emoji icon, button |

#### Category B: Photo Gallery (Lines 419-685)
| Line Range | Component | Style Count | Pattern |
|------------|-----------|-------------|---------|
| 425-476 | Mobile gallery view | 8 | Relative positioning, image sizing, button overlay |
| 480-518 | Desktop grid styles | 6 | Grid configurations (1-5+ photo layouts) |
| 520-533 | Common image styles | 2 | Object-fit, cursor, border-radius |
| 571-681 | Gallery items | 12 | Grid spanning, absolute positioned button |

#### Category C: Main Layout (Lines 1528-1597)
| Line Range | Component | Style Count | Pattern |
|------------|-----------|-------------|---------|
| 1532, 1544 | Loading/Error mains | 2 | Min-height, padding-top |
| 1579-1589 | Main content grid | 1 | Responsive grid layout |
| 1592-1597 | Left column | 1 | Min-width, overflow |

#### Category D: Content Sections (Lines 1600-2268)
| Line Range | Section | Style Count | Pattern |
|------------|---------|-------------|---------|
| 1600-1617 | Photo section | 2 | Section margin, placeholder |
| 1620-1659 | Listing header | 4 | H1 styling, location flex |
| 1662-1700 | Features grid | 16 | Grid layout, feature cards with icons |
| 1703-1738 | Description | 4 | Heading, paragraph, button |
| 1742-1788 | Storage section | 6 | Card layout, icon+text |
| 1792-1829 | Neighborhood | 4 | Similar to description |
| 1833-1895 | Commute section | 8 | Icon rows, text styling |
| 1899-1965 | Amenities | 10 | Subheadings, grid layout |
| 1969-1996 | House rules | 6 | List layout with icons |
| 2000-2040 | Map section | 4 | Container, loading placeholder |
| 2044-2168 | Host section | 12 | Profile card, buttons |
| 2173-2268 | Cancellation policy | 18 | Card with case sections |

#### Category E: Desktop Booking Widget (Lines 2271-2814)
| Line Range | Section | Style Count | Pattern |
|------------|---------|-------------|---------|
| 2274-2300 | Widget container | 1 | Sticky positioning, shadow |
| 2302-2330 | Price display | 3 | Gradient background, text |
| 2333-2420 | Move-in date input | 6 | Label, input, help text |
| 2425-2496 | Strict mode checkbox | 4 | Flex layout, checkbox styling |
| 2500-2582 | Schedule selector wrapper | 4 | Container, custom schedule |
| 2585-2684 | Reservation span select | 5 | Label, select, dropdown arrow |
| 2687-2708 | Price breakdown | 3 | Row layout |
| 2711-2736 | Total row | 3 | Border-top, large price |
| 2750-2813 | Create proposal button | 2 | Full-width, gradient |

#### Category F: Modals (Lines 2818-3059)
| Line Range | Modal | Style Count | Pattern |
|------------|-------|-------------|---------|
| 2820-2923 | Tutorial modal | 10 | Overlay, content card, buttons |
| 2928-3059 | Photo modal | 14 | Fullscreen overlay, navigation |

#### Category G: Mobile Booking Bar (Lines 3196-3622)
| Line Range | Section | Style Count | Pattern |
|------------|---------|-------------|---------|
| 3203-3210 | Overlay backdrop | 1 | Fixed overlay |
| 3214-3227 | Bottom bar container | 1 | Fixed bottom, shadow |
| 3231-3286 | Collapsed view | 6 | Price display, continue button |
| 3290-3616 | Expanded view | 32 | Full booking form duplicate |
| 3621 | Spacer | 1 | Dynamic height |

### Style Pattern Analysis

#### Pattern 1: Responsive Ternary Styles (HIGH FREQUENCY - ~80 occurrences)
```javascript
style={{ fontSize: isMobile ? '1rem' : '1.125rem' }}
style={{ padding: isMobile ? '0.75rem' : '1rem' }}
style={{ marginBottom: isMobile ? '1.25rem' : '1.5rem' }}
```
**Solution**: CSS media queries with mobile-first approach

#### Pattern 2: Static Inline Styles (HIGH FREQUENCY - ~60 occurrences)
```javascript
style={{ fontWeight: '600', marginBottom: '0.5rem' }}
style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
```
**Solution**: Direct CSS class extraction

#### Pattern 3: Color Constants (MEDIUM FREQUENCY - ~40 occurrences)
```javascript
style={{ color: COLORS.TEXT_LIGHT }}
style={{ background: COLORS.BG_LIGHT }}
style={{ color: COLORS.PRIMARY }}
```
**Solution**: CSS custom properties (`--color-text-light`, etc.)

#### Pattern 4: Hover/Focus Handlers (MEDIUM FREQUENCY - ~50 handlers)
```javascript
onMouseEnter={(e) => e.target.style.background = COLORS.PRIMARY_HOVER}
onMouseLeave={(e) => e.target.style.background = COLORS.PRIMARY}
```
**Solution**: CSS `:hover`, `:focus` pseudo-classes

#### Pattern 5: Dynamic Conditional Styles (LOW FREQUENCY - ~16 occurrences)
```javascript
style={{ display: isMobile ? 'none' : 'block' }}
style={{ background: existingProposalForListing ? '#D1D5DB' : '#31135d' }}
style={{ height: mobileBookingExpanded ? '0' : '140px' }}
```
**Solution**: Conditional className or CSS variables with JS toggle

---

## 3. Target State Definition

### CSS Architecture
```
ViewSplitLeasePage.module.css
├── CSS Custom Properties (colors, spacing)
├── Base Layout Classes
│   ├── .mainContainer, .mainContent
│   ├── .leftColumn, .rightColumn
│   └── Responsive variants
├── Section Classes
│   ├── .sectionContainer, .sectionTitle
│   └── Per-section specifics
├── Component Classes
│   ├── Helper Components (Loading, Error, Gallery)
│   ├── Booking Widget
│   ├── Mobile Booking Bar
│   └── Modals
└── Utility Classes
    ├── .hidden, .hiddenMobile, .hiddenDesktop
    └── .flexCenter, .textCenter
```

### Class Naming Convention
- **BEM-inspired**: `componentName`, `componentName__element`, `componentName--modifier`
- **Responsive**: No suffixes; use media queries inside class
- **State variants**: `componentName.isActive`, `componentName.isDisabled`

### Example Transformation

**BEFORE (Lines 1669-1697)**:
```jsx
<div style={{ textAlign: 'center', padding: isMobile ? '0.75rem' : '1rem', background: COLORS.BG_LIGHT, borderRadius: isMobile ? '6px' : '8px' }}>
  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: isMobile ? '1.5rem' : '2rem' }}>
    <img src="/assets/images/fridge.svg" alt="Kitchen" style={{ width: isMobile ? '1.5rem' : '2rem', height: isMobile ? '1.5rem' : '2rem' }} />
  </div>
  <div style={{ fontSize: isMobile ? '0.8125rem' : '1rem' }}>{listing['Kitchen Type']}</div>
</div>
```

**AFTER**:
```jsx
<div className={styles.featureCard}>
  <div className={styles.featureIconWrapper}>
    <img src="/assets/images/fridge.svg" alt="Kitchen" className={styles.featureIcon} />
  </div>
  <div className={styles.featureText}>{listing['Kitchen Type']}</div>
</div>
```

```css
/* ViewSplitLeasePage.module.css */
.featureCard {
  text-align: center;
  padding: 0.75rem;
  background: var(--color-bg-light);
  border-radius: 6px;
}

.featureIconWrapper {
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 1.5rem;
}

.featureIcon {
  width: 1.5rem;
  height: 1.5rem;
}

.featureText {
  font-size: 0.8125rem;
}

@media (min-width: 901px) {
  .featureCard {
    padding: 1rem;
    border-radius: 8px;
  }

  .featureIconWrapper {
    height: 2rem;
  }

  .featureIcon {
    width: 2rem;
    height: 2rem;
  }

  .featureText {
    font-size: 1rem;
  }
}
```

---

## 4. File-by-File Action Plan

### File 1: `app/src/islands/pages/ViewSplitLeasePage.module.css`

**Current State**: 238 lines with partial extraction
**Required Changes**: Add ~200 new class definitions organized by section

#### Section 1: CSS Custom Properties (Add at top)
```css
/* Add after line 1 */
:root {
  --color-primary: #31135d;
  --color-primary-hover: #1f0b38;
  --color-text-dark: #111827;
  --color-text-light: #6B7280;
  --color-bg-light: #f3f4f6;
  --color-border: #E5E7EB;
  --color-success: #16a34a;
  --color-warning: #ea580c;
  --color-error: #dc2626;
  --color-purple-accent: #7C3AED;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(49, 19, 93, 0.1);
  --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

#### Section 2: Layout Classes (Extend existing)
```css
/* Already have .mainContainer, .mainContent, .leftColumn, .rightColumn */
/* Add responsive behavior properly */

.mainContainerLoading {
  min-height: 70vh;
  padding-top: calc(80px + 2rem);
}

.mainGrid {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xl);
  padding-top: calc(100px + 2rem);
  display: grid;
  grid-template-columns: 1fr 440px;
  gap: var(--spacing-xl);
  box-sizing: border-box;
  width: 100%;
}

@media (max-width: 900px) {
  .mainGrid {
    grid-template-columns: 1fr;
    padding: var(--spacing-md);
    padding-top: calc(80px + 1rem);
    gap: var(--spacing-lg);
  }
}
```

#### Section 3: Section Components (NEW)
```css
/* Content Section Base */
.section {
  margin-bottom: var(--spacing-lg);
}

.sectionDesktop {
  margin-bottom: var(--spacing-xl);
}

@media (max-width: 900px) {
  .sectionDesktop {
    margin-bottom: var(--spacing-lg);
  }
}

.sectionTitle {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text-dark);
}

@media (max-width: 900px) {
  .sectionTitle {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
}

.sectionContent {
  line-height: 1.6;
  color: var(--color-text-light);
  white-space: pre-wrap;
}
```

#### Section 4: Feature Grid (NEW)
```css
/* Features Grid */
.featuresGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

@media (max-width: 900px) {
  .featuresGrid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
  }
}

.featureCard {
  text-align: center;
  padding: var(--spacing-md);
  background: var(--color-bg-light);
  border-radius: var(--radius-md);
}

@media (max-width: 900px) {
  .featureCard {
    padding: 0.75rem;
    border-radius: var(--radius-sm);
  }
}

.featureIconWrapper {
  margin-bottom: var(--spacing-sm);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 2rem;
}

@media (max-width: 900px) {
  .featureIconWrapper {
    height: 1.5rem;
  }
}

.featureIcon {
  width: 2rem;
  height: 2rem;
}

@media (max-width: 900px) {
  .featureIcon {
    width: 1.5rem;
    height: 1.5rem;
  }
}

.featureText {
  font-size: 1rem;
}

@media (max-width: 900px) {
  .featureText {
    font-size: 0.8125rem;
  }
}
```

#### Section 5: Listing Header (NEW)
```css
/* Listing Header */
.listingTitle {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: var(--spacing-md);
  color: var(--color-text-dark);
}

@media (max-width: 900px) {
  .listingTitle {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }
}

.listingMeta {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  color: var(--color-text-light);
  font-size: 1rem;
}

@media (max-width: 900px) {
  .listingMeta {
    gap: var(--spacing-sm);
    font-size: 0.875rem;
  }
}

.locationLink {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s;
}

.locationLink:hover {
  color: var(--color-primary);
}
```

#### Section 6: Storage/Commute Cards (NEW)
```css
/* Info Card (Storage, Commute items) */
.infoCard {
  padding: var(--spacing-lg);
  background: var(--color-bg-light);
  border-radius: var(--radius-lg);
}

@media (max-width: 900px) {
  .infoCard {
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
  }
}

.infoCardRow {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.infoCardIcon {
  min-width: 24px;
  min-height: 24px;
  color: var(--color-primary);
}

.infoCardTitle {
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
}

.infoCardSubtitle {
  color: var(--color-text-light);
  font-size: 0.9375rem;
}

.infoCardSubtitleSmall {
  color: var(--color-text-light);
  font-size: 0.875rem;
}
```

#### Section 7: Amenities Grid (NEW)
```css
/* Amenities */
.amenitiesSection {
  margin-bottom: var(--spacing-md);
}

.amenitiesCategoryTitle {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 900px) {
  .amenitiesCategoryTitle {
    font-size: 0.75rem;
  }
}

.amenitiesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .amenitiesGrid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--spacing-sm);
  }
}

.amenityItem {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
}

@media (max-width: 900px) {
  .amenityItem {
    padding: 0.375rem;
  }
}

.amenityIcon {
  width: 24px;
  height: 24px;
}

@media (max-width: 900px) {
  .amenityIcon {
    width: 20px;
    height: 20px;
  }
}

.amenityText {
  font-size: 0.875rem;
}

@media (max-width: 900px) {
  .amenityText {
    font-size: 0.8125rem;
  }
}
```

#### Section 8: House Rules (NEW)
```css
/* House Rules */
.houseRulesList {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.houseRuleItem {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
}

@media (max-width: 900px) {
  .houseRuleItem {
    padding: 0.375rem;
  }
}

.houseRuleIcon {
  width: 24px;
  height: 24px;
}

@media (max-width: 900px) {
  .houseRuleIcon {
    width: 20px;
    height: 20px;
  }
}

.houseRuleText {
  font-size: 1rem;
}

@media (max-width: 900px) {
  .houseRuleText {
    font-size: 0.875rem;
  }
}
```

#### Section 9: Map Section (NEW)
```css
/* Map Section */
.mapContainer {
  height: 400px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-bg-light);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-light);
}

@media (max-width: 900px) {
  .mapContainer {
    height: 300px;
    border-radius: var(--radius-md);
  }
}

.mapPlaceholder {
  color: var(--color-text-light);
  font-size: 0.9rem;
  text-align: center;
}
```

#### Section 10: Host Section (NEW)
```css
/* Host Section */
.hostCard {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: var(--spacing-md);
  background: var(--color-bg-light);
  border-radius: 10px;
}

@media (max-width: 900px) {
  .hostCard {
    padding: 0.75rem;
    border-radius: var(--radius-md);
  }
}

.hostPhoto {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

@media (max-width: 900px) {
  .hostPhoto {
    width: 40px;
    height: 40px;
  }
}

.hostInfo {
  flex: 1;
}

.hostName {
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 0.125rem;
}

@media (max-width: 900px) {
  .hostName {
    font-size: 0.875rem;
  }
}

.hostLabel {
  color: var(--color-text-light);
  font-size: 0.8125rem;
}

@media (max-width: 900px) {
  .hostLabel {
    font-size: 0.75rem;
  }
}

.hostActions {
  display: flex;
  gap: var(--spacing-sm);
}

.hostButtonPrimary {
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  box-shadow: 0 2px 6px rgba(49, 19, 93, 0.2);
}

.hostButtonPrimary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(49, 19, 93, 0.25);
}

@media (max-width: 900px) {
  .hostButtonPrimary {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }
}

.hostButtonSecondary {
  padding: 0.5rem 1rem;
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.hostButtonSecondary:hover {
  background: var(--color-primary);
  color: white;
  transform: translateY(-1px);
}

@media (max-width: 900px) {
  .hostButtonSecondary {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }
}
```

#### Section 11: Cancellation Policy (NEW)
```css
/* Cancellation Policy */
.cancellationCard {
  padding: var(--spacing-lg);
  background: var(--color-bg-light);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-bg-light);
}

@media (max-width: 900px) {
  .cancellationCard {
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
  }
}

.cancellationTitle {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--color-primary);
}

@media (max-width: 900px) {
  .cancellationTitle {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
}

.cancellationCase {
  margin-bottom: 0.75rem;
}

.cancellationCaseTitle {
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.cancellationCaseBest {
  color: var(--color-success);
}

.cancellationCaseMedium {
  color: var(--color-warning);
}

.cancellationCaseWorst {
  color: var(--color-error);
}

.cancellationCaseText {
  color: var(--color-text-light);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.cancellationSummary {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid #e5e7eb;
}

.cancellationSummaryTitle {
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  font-size: 0.875rem;
}

.cancellationSummaryList {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--color-text-light);
  font-size: 0.875rem;
  line-height: 1.6;
}

.cancellationSummaryItem {
  margin-bottom: var(--spacing-xs);
}

.cancellationLink {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.cancellationLink:hover {
  text-decoration: underline;
}
```

#### Section 12: Desktop Booking Widget (NEW)
```css
/* Booking Widget */
.bookingWidget {
  position: sticky;
  top: calc(80px + 20px);
  align-self: flex-start;
  height: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-xl);
  padding: 28px;
  background: white;
  box-shadow: var(--shadow-lg), 0 0 1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.bookingWidget:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35), 0 0 1px rgba(0, 0, 0, 0.05);
}

@media (max-width: 900px) {
  .bookingWidget {
    display: none;
  }
}

.bookingPriceDisplay {
  background: linear-gradient(135deg, #f8f9ff 0%, #faf5ff 100%);
  padding: 12px;
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
  border: 1px solid #e9d5ff;
}

.bookingPriceValue {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #31135d 0%, #31135d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
  display: inline-block;
}

.bookingPriceUnit {
  font-size: 16px;
  color: var(--color-text-light);
  font-weight: 500;
  background: none;
  -webkit-text-fill-color: var(--color-text-light);
}

/* Form Labels */
.bookingLabel {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.bookingLabelText {
  cursor: pointer;
}

.bookingInfoIcon {
  width: 16px;
  height: 16px;
  color: #9CA3AF;
  cursor: pointer;
}

/* Date Input */
.bookingDateInput {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-dark);
  transition: all 0.2s ease;
  cursor: pointer;
  background: white;
  box-shadow: var(--shadow-sm);
}

.bookingDateInput:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.bookingDateInput:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(49, 19, 93, 0.15);
  transform: translateY(-1px);
  outline: none;
}

.bookingHelpText {
  font-size: 12px;
  color: var(--color-text-light);
  line-height: 1.4;
  margin-bottom: 10px;
  font-weight: 400;
  padding-left: 4px;
}

/* Strict Mode Checkbox */
.bookingCheckboxWrapper {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px;
  background: linear-gradient(135deg, #f8f9ff 0%, #faf5ff 100%);
  border-radius: 10px;
  border: 1px solid #e9d5ff;
  transition: all 0.2s ease;
}

.bookingCheckboxWrapper:hover {
  background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%);
  border-color: #d8b4fe;
}

.bookingCheckbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
  margin-top: 2px;
  flex-shrink: 0;
}

.bookingCheckboxLabel {
  font-size: 14px;
  color: var(--color-text-dark);
  user-select: none;
  line-height: 1.5;
  font-weight: 500;
}

.bookingCheckboxLabelText {
  cursor: pointer;
}

.bookingCheckboxInfoIcon {
  display: inline-block;
  width: 14px;
  height: 14px;
  vertical-align: middle;
  margin-left: 2px;
  opacity: 0.6;
  cursor: pointer;
}

/* Schedule Selector Container */
.bookingScheduleWrapper {
  margin-bottom: 14px;
  padding: 12px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.bookingScheduleInfo {
  margin-top: 12px;
  font-size: 13px;
  color: #4B5563;
}

.bookingScheduleStrong {
  color: var(--color-primary);
}

.bookingCustomScheduleLink {
  background: none;
  border: none;
  color: var(--color-purple-accent);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
}

/* Custom Schedule Textarea */
.bookingCustomScheduleInput {
  margin-top: 10px;
}

.bookingTextarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.bookingTextarea:focus {
  border-color: var(--color-purple-accent);
  outline: none;
}

.bookingTextareaHelp {
  margin-top: 6px;
  font-size: 11px;
  color: var(--color-text-light);
}

/* Select Dropdown */
.bookingSelectWrapper {
  position: relative;
}

.bookingSelect {
  width: 100%;
  padding: 10px 12px;
  padding-right: 40px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-dark);
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  box-shadow: var(--shadow-sm);
}

.bookingSelect:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.bookingSelect:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(49, 19, 93, 0.15);
  outline: none;
}

.bookingSelectArrow {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--color-primary);
  pointer-events: none;
}

/* Price Breakdown */
.bookingPriceBreakdown {
  margin-bottom: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  border-radius: 10px;
  border: 1px solid var(--color-border);
}

.bookingPriceRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
}

.bookingPriceLabel {
  color: var(--color-text-dark);
  font-weight: 500;
}

.bookingPriceAmount {
  color: var(--color-text-dark);
  font-weight: 700;
  font-size: 16px;
}

/* Total Row */
.bookingTotalRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-top: 2px solid var(--color-border);
  margin-bottom: 10px;
}

.bookingTotalLabel {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-dark);
}

.bookingTotalAmount {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #31135d 0%, #31135d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Create Proposal Button */
.bookingSubmitButton {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #31135d 0%, #31135d 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 14px rgba(49, 19, 93, 0.4);
  position: relative;
  overflow: hidden;
}

.bookingSubmitButton:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(49, 19, 93, 0.5);
}

.bookingSubmitButton:disabled {
  background: #D1D5DB;
  cursor: not-allowed;
  box-shadow: none;
}

.bookingExistingLink {
  display: block;
  text-align: center;
  margin-top: 12px;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
}

.bookingExistingLink:hover {
  text-decoration: underline;
}
```

#### Section 13: Modals (NEW)
```css
/* Modal Overlay Base */
.modalOverlayBase {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modalOverlayDark {
  background: rgba(0, 0, 0, 0.5);
}

.modalOverlayDarker {
  background: rgba(0, 0, 0, 0.9);
}

/* Tutorial Modal */
.tutorialModal {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  max-width: 500px;
  position: relative;
}

.tutorialCloseButton {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-light);
}

.tutorialTitle {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: var(--spacing-md);
  color: var(--color-text-dark);
}

.tutorialContent {
  line-height: 1.6;
  color: var(--color-text-light);
  margin-bottom: var(--spacing-lg);
}

.tutorialHighlight {
  padding: var(--spacing-md);
  background: var(--color-bg-light);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.tutorialHighlightIcon {
  font-size: 2rem;
  margin-bottom: var(--spacing-sm);
}

.tutorialHighlightText {
  font-size: 0.875rem;
  color: var(--color-text-dark);
}

.tutorialActions {
  display: flex;
  gap: var(--spacing-md);
}

.tutorialButtonPrimary {
  flex: 1;
  padding: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

.tutorialButtonSecondary {
  flex: 1;
  padding: 0.75rem;
  background: white;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
}

/* Photo Modal */
.photoModal {
  flex-direction: column;
}

.photoModalClose {
  position: absolute;
  top: var(--spacing-xl);
  right: var(--spacing-xl);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 2rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002;
}

@media (max-width: 900px) {
  .photoModalClose {
    top: var(--spacing-md);
    right: var(--spacing-md);
  }
}

.photoModalImage {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  margin-bottom: 5rem;
}

@media (max-width: 900px) {
  .photoModalImage {
    max-width: 95vw;
    max-height: 75vh;
    margin-bottom: 6rem;
  }
}

.photoModalNav {
  position: absolute;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--spacing-lg);
  align-items: center;
  z-index: 1001;
}

@media (max-width: 900px) {
  .photoModalNav {
    bottom: 4rem;
    gap: var(--spacing-sm);
  }
}

.photoModalNavButton {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .photoModalNavButton {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}

.photoModalCounter {
  color: white;
  font-size: 0.875rem;
  white-space: nowrap;
  min-width: 80px;
  text-align: center;
}

@media (max-width: 900px) {
  .photoModalCounter {
    font-size: 0.75rem;
    min-width: 60px;
  }
}

.photoModalCloseBottom {
  position: absolute;
  bottom: var(--spacing-lg);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: none;
  color: var(--color-text-dark);
  padding: 0.75rem 2.5rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  z-index: 1001;
}

@media (max-width: 900px) {
  .photoModalCloseBottom {
    bottom: var(--spacing-md);
    padding: 0.5rem 2rem;
    font-size: 0.875rem;
  }
}
```

#### Section 14: Mobile Booking Bar (NEW)
```css
/* Mobile Booking Bar */
.mobileBookingOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
}

.mobileBookingBar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  transition: all 0.3s ease;
}

.mobileBookingBarExpanded {
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  max-height: 80vh;
  overflow-y: auto;
}

.mobileBookingCollapsed {
  padding: 12px 16px;
}

.mobileBookingExpanded {
  padding: 20px 16px 24px;
}

/* Collapsed View */
.mobileBookingPriceRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.mobileBookingPriceInfo {
  flex: 1;
}

.mobileBookingPriceValue {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary);
}

.mobileBookingPriceUnit {
  font-size: 14px;
  color: var(--color-text-light);
  font-weight: 500;
}

.mobileBookingContinueButton {
  padding: 12px 24px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

/* Expanded View */
.mobileBookingHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.mobileBookingTitle {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-dark);
  margin: 0;
}

.mobileBookingCloseButton {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-light);
  padding: 4px;
}

.mobileBookingPriceDisplay {
  background: linear-gradient(135deg, #f8f9ff 0%, #faf5ff 100%);
  padding: 12px;
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
  border: 1px solid #e9d5ff;
}

.mobileBookingPriceLarge {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-primary);
}

/* Mobile Form Elements */
.mobileBookingFieldGroup {
  margin-bottom: 16px;
}

.mobileBookingLabel {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 8px;
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mobileBookingInput {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-dark);
  box-sizing: border-box;
}

.mobileBookingSelect {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-dark);
  background: white;
  box-sizing: border-box;
}

/* Mobile Strict Mode */
.mobileBookingCheckboxWrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9ff;
  border-radius: 10px;
  border: 1px solid #e9d5ff;
}

.mobileBookingCheckbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.mobileBookingCheckboxLabel {
  font-size: 14px;
  color: var(--color-text-dark);
  font-weight: 500;
}

/* Mobile Schedule Section */
.mobileBookingScheduleWrapper {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

/* Mobile Price Breakdown */
.mobileBookingBreakdown {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid var(--color-border);
}

.mobileBookingBreakdownRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 15px;
}

.mobileBookingBreakdownLabel {
  color: var(--color-text-dark);
  font-weight: 500;
}

.mobileBookingBreakdownAmount {
  color: var(--color-text-dark);
  font-weight: 700;
}

.mobileBookingTotalRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.mobileBookingTotalLabel {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-dark);
}

.mobileBookingTotalAmount {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-primary);
}

/* Mobile Submit Button */
.mobileBookingSubmitButton {
  width: 100%;
  padding: 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.mobileBookingSubmitButton:disabled {
  background: #D1D5DB;
  cursor: not-allowed;
}

.mobileBookingExistingLink {
  display: block;
  text-align: center;
  margin-top: 12px;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
}

/* Mobile Spacer */
.mobileBookingSpacer {
  height: 140px;
}

.mobileBookingSpacerCollapsed {
  height: 0;
}
```

#### Section 15: Utility Classes (NEW)
```css
/* Utility Classes */
.hiddenMobile {
  display: block;
}

@media (max-width: 900px) {
  .hiddenMobile {
    display: none;
  }
}

.hiddenDesktop {
  display: none;
}

@media (max-width: 900px) {
  .hiddenDesktop {
    display: block;
  }
}

.readMoreButton {
  margin-top: var(--spacing-sm);
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 600;
  text-decoration: underline;
}
```

**Dependencies**: None - extends existing file
**Verification**: CSS lint pass, no duplicate class names

---

### File 2: `app/src/islands/pages/ViewSplitLeasePage.jsx`

**Current State**: 3,628 lines with 226 inline styles
**Required Changes**: Replace all inline styles with className references

#### Transformation Summary by Section

| Section | Lines | Current | After |
|---------|-------|---------|-------|
| SchedulePatternHighlight | 290-328 | 7 inline styles | 6 classNames |
| LoadingState | 338-359 | 2 inline styles | 2 classNames |
| ErrorState | 364-405 | 5 inline styles | 5 classNames |
| PhotoGallery | 419-685 | 26 inline styles | 12 classNames |
| Main Layout | 1528-1597 | 4 inline styles | 4 classNames |
| Content Sections | 1600-2268 | 84 inline styles | 40 classNames |
| Booking Widget | 2271-2814 | 52 inline styles | 25 classNames |
| Tutorial Modal | 2818-2923 | 10 inline styles | 8 classNames |
| Photo Modal | 2925-3059 | 14 inline styles | 10 classNames |
| Mobile Booking | 3196-3622 | 41 inline styles | 22 classNames |
| **TOTAL** | - | **226** | **~134** classes |

#### Detailed Transformation: Helper Components

**SchedulePatternHighlight (Lines 290-328)**

BEFORE:
```jsx
<div style={{
  marginTop: '8px',
  padding: '10px 12px',
  background: 'linear-gradient(135deg, #EDE9FE 0%, #F3E8FF 100%)',
  borderRadius: '8px',
  border: '1px solid #C4B5FD',
  fontSize: '13px'
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px'
  }}>
    {/* SVG icon */}
    <span style={{
      fontWeight: '600',
      color: '#5B21B6',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      fontSize: '11px'
    }}>
      {patternInfo.cycleDescription}
    </span>
  </div>
  <div style={{ color: '#6B21A8' }}>
    <span style={{ fontWeight: '700' }}>{patternInfo.actualWeeks} actual weeks</span>
    <span style={{ color: '#7C3AED' }}> of stay within {reservationSpan}-week span</span>
  </div>
</div>
```

AFTER:
```jsx
<div className={styles.schedulePatternContainer}>
  <div className={styles.schedulePatternHeader}>
    {/* SVG icon */}
    <span className={styles.schedulePatternLabel}>
      {patternInfo.cycleDescription}
    </span>
  </div>
  <div className={styles.schedulePatternText}>
    <span className={styles.schedulePatternTextBold}>{patternInfo.actualWeeks} actual weeks</span>
    <span className={styles.schedulePatternTextAccent}> of stay within {reservationSpan}-week span</span>
  </div>
</div>
```

**LoadingState (Lines 338-359)**

BEFORE:
```jsx
<div style={{
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '60vh',
  padding: '2rem'
}}>
  <div style={{
    width: '60px',
    height: '60px',
    border: `4px solid ${COLORS.BG_LIGHT}`,
    borderTop: `4px solid ${COLORS.PRIMARY}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }}></div>
</div>
```

AFTER:
```jsx
<div className={styles.loadingStateContainer}>
  <div className={styles.loadingSpinner}></div>
</div>
```

**ErrorState (Lines 364-405)**

BEFORE:
```jsx
<div style={{
  textAlign: 'center',
  padding: '4rem 2rem',
  maxWidth: '600px',
  margin: '0 auto'
}}>
  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
  <h2 style={{
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '1rem',
    color: COLORS.TEXT_DARK
  }}>
    Property Not Found
  </h2>
  <p style={{
    fontSize: '1.125rem',
    color: COLORS.TEXT_LIGHT,
    marginBottom: '2rem'
  }}>
    {message}
  </p>
  <a href="/search.html" style={{...}}>Browse All Listings</a>
</div>
```

AFTER:
```jsx
<div className={styles.errorStateContainer}>
  <div className={styles.errorIcon}>⚠️</div>
  <h2 className={styles.errorTitle}>Property Not Found</h2>
  <p className={styles.errorMessage}>{message}</p>
  <a href="/search.html" className={styles.errorButton}>Browse All Listings</a>
</div>
```

#### Detailed Transformation: Content Sections

**Features Grid (Lines 1662-1700)**

BEFORE (repeated 4 times):
```jsx
<div style={{ textAlign: 'center', padding: isMobile ? '0.75rem' : '1rem', background: COLORS.BG_LIGHT, borderRadius: isMobile ? '6px' : '8px' }}>
  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', height: isMobile ? '1.5rem' : '2rem' }}>
    <img src="/assets/images/fridge.svg" alt="Kitchen" style={{ width: isMobile ? '1.5rem' : '2rem', height: isMobile ? '1.5rem' : '2rem' }} />
  </div>
  <div style={{ fontSize: isMobile ? '0.8125rem' : '1rem' }}>{listing['Kitchen Type']}</div>
</div>
```

AFTER:
```jsx
<div className={styles.featureCard}>
  <div className={styles.featureIconWrapper}>
    <img src="/assets/images/fridge.svg" alt="Kitchen" className={styles.featureIcon} />
  </div>
  <div className={styles.featureText}>{listing['Kitchen Type']}</div>
</div>
```

**Host Section Buttons (Lines 2080-2165)**

BEFORE:
```jsx
<button
  onClick={() => setShowContactHostModal(true)}
  style={{
    padding: isMobile ? '0.375rem 0.75rem' : '0.5rem 1rem',
    background: COLORS.PRIMARY,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: isMobile ? '0.8125rem' : '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    boxShadow: '0 2px 6px rgba(49, 19, 93, 0.2)'
  }}
  onMouseEnter={(e) => {
    e.target.style.background = COLORS.PRIMARY_HOVER;
    e.target.style.transform = 'translateY(-1px)';
    e.target.style.boxShadow = '0 3px 8px rgba(49, 19, 93, 0.25)';
  }}
  onMouseLeave={(e) => {
    e.target.style.background = COLORS.PRIMARY;
    e.target.style.transform = '';
    e.target.style.boxShadow = '0 2px 6px rgba(49, 19, 93, 0.2)';
  }}
>
  {/* icon + text */}
</button>
```

AFTER:
```jsx
<button
  onClick={() => setShowContactHostModal(true)}
  className={styles.hostButtonPrimary}
>
  {/* icon + text */}
</button>
```

(CSS handles `:hover` state automatically)

#### Events to Remove/Replace

The following inline event handlers ONLY set styles and can be completely removed:

| Line | Element | Handler | Replacement |
|------|---------|---------|-------------|
| 2097-2106 | Host Message button | onMouseEnter/Leave | CSS :hover |
| 2139-2148 | Host Profile button | onMouseEnter/Leave | CSS :hover |
| 2260-2261 | Cancellation link | onMouseEnter/Leave | CSS :hover |
| 2288-2298 | Booking widget | onMouseEnter/Leave | CSS :hover |
| 2389-2408 | Date input | onMouseEnter/Leave/Focus/Blur | CSS :hover/:focus |
| 2436-2443 | Strict mode wrapper | onMouseEnter/Leave | CSS :hover |
| 2641-2658 | Select dropdown | onMouseEnter/Leave/Focus/Blur | CSS :hover/:focus |
| 2771-2781 | Submit button | onMouseEnter/Leave | CSS :hover |
| 2804-2809 | Existing proposal link | onMouseEnter/Leave | CSS :hover |

**~50 inline event handlers can be completely removed**

---

## 5. Execution Order

### Phase 1: CSS Foundation (Est. 30 min)
1. Add CSS custom properties to top of module file
2. Add utility classes at bottom
3. Verify no naming conflicts with existing classes

### Phase 2: Helper Components (Est. 20 min)
4. Update `SchedulePatternHighlight` component (already has CSS, just needs JSX update)
5. Update `LoadingState` component
6. Update `ErrorState` component
7. Test components render correctly

### Phase 3: Layout Sections (Est. 45 min)
8. Add layout CSS classes
9. Update main render layout (main, left-column)
10. Update section containers throughout content
11. Update listing header section
12. Update features grid section

### Phase 4: Content Sections Part 1 (Est. 60 min)
13. Add description section CSS and update JSX
14. Add storage section CSS and update JSX
15. Add neighborhood section CSS and update JSX
16. Add commute section CSS and update JSX
17. Add amenities section CSS and update JSX
18. Add house rules section CSS and update JSX

### Phase 5: Content Sections Part 2 (Est. 45 min)
19. Add map section CSS and update JSX
20. Add host section CSS and update JSX
21. Add cancellation policy CSS and update JSX
22. Remove inline hover handlers from host buttons

### Phase 6: Booking Widget (Est. 60 min)
23. Add booking widget container CSS
24. Add form element CSS (inputs, selects, labels)
25. Update price display section
26. Update form inputs and remove inline handlers
27. Update submit button and remove inline handlers
28. Update schedule wrapper section

### Phase 7: Modals (Est. 45 min)
29. Add tutorial modal CSS and update JSX
30. Add photo modal CSS and update JSX
31. Remove inline handlers from modal buttons

### Phase 8: Mobile Booking (Est. 60 min)
32. Add mobile overlay CSS
33. Add mobile bar collapsed CSS and update JSX
34. Add mobile bar expanded CSS and update JSX
35. Update mobile form elements
36. Add spacer utility

### Phase 9: Cleanup and Verification (Est. 30 min)
37. Remove unused COLORS constant usages (if all moved to CSS)
38. Remove any remaining inline style objects
39. Run lint check
40. Visual verification in browser

**Total Estimated Time: ~7 hours**

---

## 6. Risk Assessment

### Potential Breaking Changes

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Responsive breakpoints differ | Medium | Medium | Use exact 900px breakpoint as in original |
| Color values drift | Low | Low | CSS variables match COLORS constants exactly |
| Specificity conflicts | Low | Medium | CSS Module scoping prevents conflicts |
| Dynamic styles break | Medium | High | Keep truly dynamic styles as inline (e.g., conditional backgrounds) |
| SVG styling | Low | Low | Keep inline SVG styles for stroke/fill |

### Edge Cases to Watch

1. **Dynamic disabled states**: `existingProposalForListing` toggles button background
   - Solution: Use conditional className: `className={existingProposalForListing ? styles.buttonDisabled : styles.buttonPrimary}`

2. **Mobile booking bar height**: `mobileBookingExpanded` toggles height dynamically
   - Solution: Conditional className for spacer

3. **Photo gallery grid configurations**: Grid changes based on photo count
   - Solution: Keep grid configuration in JS, only extract common image styles

4. **Price display dynamic values**: Price amounts are computed
   - Solution: Keep price values in JSX, extract surrounding styling to CSS

### Rollback Considerations

- CSS Module changes are additive - old styles remain until JSX is updated
- Can rollback JSX changes file-by-file if issues arise
- Git commit after each major section allows granular rollback

---

## 7. Verification Checklist

### Pre-Implementation
- [ ] Read existing CSS Module file completely
- [ ] Identify all COLORS constant usages
- [ ] Document all responsive breakpoints used

### Per-Section Verification
- [ ] CSS class renders with expected styles
- [ ] Responsive behavior matches original
- [ ] Hover/focus states work correctly
- [ ] No visual regressions in browser
- [ ] No console warnings about class names

### Post-Implementation
- [ ] `bun run lint` passes in app/ directory
- [ ] `bun run build` succeeds
- [ ] Desktop view matches original
- [ ] Mobile view matches original (at 375px and 768px)
- [ ] All modals open and display correctly
- [ ] Booking widget hover effects work
- [ ] Form inputs focus states work
- [ ] Photo gallery navigation works
- [ ] Mobile booking bar expand/collapse works

### Performance Verification
- [ ] React DevTools shows fewer re-renders on state changes
- [ ] No new runtime warnings in console
- [ ] Component mount time unchanged or improved

---

## 8. Reference Appendix

### All File Paths
| Path | Purpose |
|------|---------|
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Primary file to modify |
| `app/src/islands/pages/ViewSplitLeasePage.module.css` | CSS Module to extend |
| `app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.css` | Legacy CSS (do not modify) |
| `app/src/lib/constants.js` | Contains COLORS constant |

### COLORS Constant Reference
From `app/src/lib/constants.js`:
```javascript
export const COLORS = {
  PRIMARY: '#31135d',
  PRIMARY_HOVER: '#1f0b38', // or similar
  TEXT_DARK: '#111827',
  TEXT_LIGHT: '#6B7280',
  BG_LIGHT: '#f3f4f6',
  // ... etc
};
```

### Key Line Ranges Quick Reference
| Component/Section | Start Line | End Line |
|-------------------|------------|----------|
| Imports | 1 | 42 |
| Helper functions | 44 | 207 |
| SchedulePatternHighlight | 282 | 330 |
| LoadingState | 336 | 360 |
| ErrorState | 362 | 405 |
| PhotoGallery | 419 | 685 |
| Main component start | 691 | - |
| Main render | 1528 | 3628 |
| Desktop booking widget | 2271 | 2814 |
| Tutorial modal | 2818 | 2923 |
| Photo modal | 2925 | 3059 |
| Mobile booking bar | 3196 | 3622 |

### CSS Class Naming Reference
| Prefix | Usage |
|--------|-------|
| `section*` | Content section containers |
| `feature*` | Feature grid items |
| `listing*` | Listing header elements |
| `info*` | Info cards (storage, commute) |
| `amenity*` | Amenity grid items |
| `houseRule*` | House rules list |
| `map*` | Map section |
| `host*` | Host section |
| `cancellation*` | Cancellation policy |
| `booking*` | Desktop booking widget |
| `mobile*` | Mobile booking bar |
| `tutorial*` | Tutorial modal |
| `photo*` | Photo modal |

---

**Plan Status**: READY FOR EXECUTION
**Estimated Effort**: 7 hours
**Constraint Reminder**: Do NOT commit after completion - plan only, no implementation
