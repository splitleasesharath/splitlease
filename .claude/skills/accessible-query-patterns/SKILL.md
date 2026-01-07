---
name: accessible-query-patterns
description: Write stable, accessible test selectors using Testing Library and Playwright query priorities. Use this skill when writing component tests, E2E tests, or refactoring flaky tests with brittle selectors. Queries by role and accessible name survive UI refactors and enforce accessibility.
license: MIT
---

This skill guides writing stable, accessible test selectors. The right query strategy eliminates flaky tests caused by CSS/class changes while enforcing accessibility standards.

## When to Use This Skill

- Writing new component or E2E tests
- Refactoring tests with brittle selectors
- Debugging flaky tests that break on UI changes
- Enforcing accessibility in test suite
- Onboarding AI agents to testing patterns

## Query Priority (Most to Least Preferred)

```
┌─────────────────────────────────────────────────────────┐
│  1. getByRole        ← BEST: Accessible, stable        │
│  2. getByLabelText   ← Forms: Label associations       │
│  3. getByPlaceholder ← Inputs without labels           │
│  4. getByText        ← Static content                  │
│  5. getByTestId      ← Escape hatch for complex UI     │
│  6. getByClass/CSS   ← AVOID: Breaks on styling changes│
└─────────────────────────────────────────────────────────┘
```

## Role-Based Queries (Priority 1)

### Common ARIA Roles

| Role | Elements | Example |
|------|----------|---------|
| `button` | `<button>`, `<input type="submit">` | `getByRole('button', { name: 'Submit' })` |
| `link` | `<a href>` | `getByRole('link', { name: 'View listing' })` |
| `textbox` | `<input type="text">`, `<textarea>` | `getByRole('textbox', { name: 'Email' })` |
| `checkbox` | `<input type="checkbox">` | `getByRole('checkbox', { name: 'Accept terms' })` |
| `radio` | `<input type="radio">` | `getByRole('radio', { name: 'Monthly' })` |
| `combobox` | `<select>`, autocomplete inputs | `getByRole('combobox', { name: 'Category' })` |
| `listbox` | `<select>`, `<ul role="listbox">` | `getByRole('listbox')` |
| `option` | `<option>`, `<li role="option">` | `getByRole('option', { name: 'Apartment' })` |
| `heading` | `<h1>`-`<h6>` | `getByRole('heading', { level: 1 })` |
| `img` | `<img>` | `getByRole('img', { name: 'Profile photo' })` |
| `navigation` | `<nav>` | `getByRole('navigation')` |
| `main` | `<main>` | `getByRole('main')` |
| `dialog` | `<dialog>`, modals | `getByRole('dialog', { name: 'Confirm booking' })` |
| `alert` | `<div role="alert">` | `getByRole('alert')` |
| `tab` | Tab components | `getByRole('tab', { name: 'Reviews' })` |
| `tabpanel` | Tab content | `getByRole('tabpanel')` |
| `grid` | Data tables, calendars | `getByRole('grid')` |
| `row` | Table/grid rows | `getByRole('row')` |
| `cell` | Table cells | `getByRole('cell', { name: '150' })` |

### Role Query Patterns

```typescript
// ✅ GOOD: Specific role + accessible name
screen.getByRole('button', { name: 'Book now' })
screen.getByRole('link', { name: 'View all listings' })
screen.getByRole('heading', { name: 'Search Results', level: 2 })

// ✅ GOOD: Partial matching with regex
screen.getByRole('button', { name: /submit/i })
screen.getByRole('heading', { name: /welcome/i })

// ✅ GOOD: State-based queries
screen.getByRole('button', { name: 'Submit', disabled: true })
screen.getByRole('checkbox', { name: 'Remember me', checked: true })
screen.getByRole('tab', { name: 'Reviews', selected: true })

// ❌ BAD: Role without name (ambiguous)
screen.getByRole('button') // Which button?

// ❌ BAD: Overly specific name (brittle)
screen.getByRole('button', { name: 'Book now for $150/night' }) // Price changes break this
```

## Label Queries (Priority 2)

For form elements, query by their associated label:

```typescript
// ✅ GOOD: Query by label text
screen.getByLabelText('Email address')
screen.getByLabelText(/password/i)

// Works with various label patterns:
// <label for="email">Email</label><input id="email" />
// <label>Email <input /></label>
// <input aria-label="Email" />
// <input aria-labelledby="email-label" />

// ✅ GOOD: Specific input type
screen.getByLabelText('Email', { selector: 'input[type="email"]' })
```

## Text Queries (Priority 3)

For non-interactive content:

```typescript
// ✅ GOOD: Static text content
screen.getByText('No listings found')
screen.getByText(/\$150/)
screen.getByText('Welcome back, John')

// ✅ GOOD: Partial matching
screen.getByText(/welcome/i)
screen.getByText(/\d+ results/)

// ⚠️ CAUTION: Dynamic text is brittle
screen.getByText('3 listings found') // Breaks if count changes

// ✅ BETTER: Use test ID for dynamic counts
screen.getByTestId('result-count')
```

## Test ID Queries (Priority 4 - Escape Hatch)

When semantic queries don't work:

```typescript
// ✅ ACCEPTABLE: Complex components without accessible roles
screen.getByTestId('listing-card')
screen.getByTestId('price-breakdown')
screen.getByTestId('calendar-picker')

// ✅ ACCEPTABLE: Dynamic content
screen.getByTestId('listing-123')
screen.getByTestId(`booking-${bookingId}`)

// In component:
<div data-testid="listing-card">...</div>
```

## Playwright vs Testing Library Syntax

| Testing Library (Vitest/Jest) | Playwright |
|------------------------------|------------|
| `screen.getByRole('button')` | `page.getByRole('button')` |
| `screen.getByLabelText('Email')` | `page.getByLabel('Email')` |
| `screen.getByPlaceholderText('Search')` | `page.getByPlaceholder('Search')` |
| `screen.getByText('Submit')` | `page.getByText('Submit')` |
| `screen.getByTestId('card')` | `page.getByTestId('card')` |
| `screen.getByAltText('Logo')` | `page.getByAltText('Logo')` |

## Scoped Queries

Query within a container to avoid ambiguity:

```typescript
// Testing Library
const listingCard = screen.getByTestId('listing-card')
within(listingCard).getByRole('button', { name: 'Book' })
within(listingCard).getByText('$150')

// Playwright
const listingCard = page.getByTestId('listing-card')
listingCard.getByRole('button', { name: 'Book' })
listingCard.getByText('$150')

// Or chain locators
page.getByTestId('listing-card').getByRole('button', { name: 'Book' })
```

## Split Lease Query Examples

### Listing Card Component

```tsx
// Component
<article data-testid="listing-card" aria-label={listing.title}>
  <img src={listing.image} alt={`Photo of ${listing.title}`} />
  <h3>{listing.title}</h3>
  <p data-testid="listing-price">${listing.price}/night</p>
  <button onClick={onBook}>Book now</button>
  <button onClick={onSave} aria-label="Save to wishlist">
    <HeartIcon />
  </button>
</article>

// Tests
const card = screen.getByRole('article', { name: 'Downtown Studio' })
within(card).getByRole('img', { name: /photo of downtown/i })
within(card).getByRole('heading', { name: 'Downtown Studio' })
within(card).getByTestId('listing-price') // Dynamic price
within(card).getByRole('button', { name: 'Book now' })
within(card).getByRole('button', { name: 'Save to wishlist' })
```

### Search Form

```tsx
// Component
<form role="search" aria-label="Search listings">
  <input 
    type="search" 
    aria-label="Search location"
    placeholder="Where to?"
  />
  <select aria-label="Category">
    <option value="">All categories</option>
    <option value="apartment">Apartment</option>
    <option value="house">House</option>
  </select>
  <button type="submit">Search</button>
</form>

// Tests
const searchForm = screen.getByRole('search', { name: 'Search listings' })
within(searchForm).getByRole('searchbox', { name: 'Search location' })
within(searchForm).getByRole('combobox', { name: 'Category' })
within(searchForm).getByRole('option', { name: 'Apartment' })
within(searchForm).getByRole('button', { name: 'Search' })
```

### Booking Summary

```tsx
// Component
<section aria-labelledby="booking-summary-heading">
  <h2 id="booking-summary-heading">Booking Summary</h2>
  <dl>
    <dt>Check-in</dt>
    <dd data-testid="check-in-date">Feb 1, 2025</dd>
    <dt>Check-out</dt>
    <dd data-testid="check-out-date">Feb 7, 2025</dd>
    <dt>Nights</dt>
    <dd data-testid="night-count">6</dd>
    <dt>Total</dt>
    <dd data-testid="total-price">$900</dd>
  </dl>
</section>

// Tests
const summary = screen.getByRole('region', { name: 'Booking Summary' })
within(summary).getByRole('heading', { name: 'Booking Summary' })
within(summary).getByTestId('check-in-date')
within(summary).getByTestId('total-price')
```

### Tab Navigation

```tsx
// Component
<div role="tablist" aria-label="Listing details">
  <button role="tab" aria-selected="true" aria-controls="desc-panel">
    Description
  </button>
  <button role="tab" aria-selected="false" aria-controls="reviews-panel">
    Reviews (24)
  </button>
  <button role="tab" aria-selected="false" aria-controls="location-panel">
    Location
  </button>
</div>

// Tests
screen.getByRole('tablist', { name: 'Listing details' })
screen.getByRole('tab', { name: 'Description', selected: true })
screen.getByRole('tab', { name: /reviews/i })
screen.getByRole('tabpanel')
```

## Common Mistakes and Fixes

### Mistake 1: Querying by class/CSS

```typescript
// ❌ BAD: Breaks when styling changes
screen.getByClassName('btn-primary')
page.locator('.listing-card')
page.locator('#submit-button')

// ✅ GOOD: Semantic query
screen.getByRole('button', { name: 'Submit' })
page.getByRole('article', { name: /listing/i })
```

### Mistake 2: Ambiguous queries

```typescript
// ❌ BAD: Multiple buttons on page
screen.getByRole('button')
screen.getByText('Click')

// ✅ GOOD: Specific name or scope
screen.getByRole('button', { name: 'Add to cart' })
within(modal).getByRole('button', { name: 'Confirm' })
```

### Mistake 3: Exact text matching for dynamic content

```typescript
// ❌ BAD: Breaks when count changes
screen.getByText('Showing 10 results')

// ✅ GOOD: Regex or test ID
screen.getByText(/showing \d+ results/i)
screen.getByTestId('result-count')
```

### Mistake 4: Querying hidden elements

```typescript
// ❌ BAD: May select hidden duplicate
screen.getByRole('button', { name: 'Submit' })

// ✅ GOOD: Ensure visible (Testing Library default)
// Testing Library ignores hidden by default

// Playwright: explicitly check visibility
page.getByRole('button', { name: 'Submit' }).and(page.locator(':visible'))
```

### Mistake 5: Not using aria-label for icon buttons

```tsx
// ❌ BAD: No accessible name
<button onClick={onClose}><XIcon /></button>

// ✅ GOOD: Accessible name
<button onClick={onClose} aria-label="Close modal">
  <XIcon aria-hidden="true" />
</button>

// Test
screen.getByRole('button', { name: 'Close modal' })
```

## Query Decision Flowchart

```
Is it a form input?
├── YES → getByLabelText('Label text')
└── NO ↓

Is it a button/link/heading/interactive element?
├── YES → getByRole('role', { name: 'accessible name' })
└── NO ↓

Is it static text content?
├── YES → getByText('text') or getByText(/regex/)
└── NO ↓

Is it an image?
├── YES → getByRole('img', { name: 'alt text' })
└── NO ↓

Is it a complex custom component?
├── YES → getByTestId('unique-id')
└── NO → Reconsider component accessibility
```

## Enforcing Query Patterns with ESLint

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['testing-library'],
  rules: {
    'testing-library/prefer-screen-queries': 'error',
    'testing-library/prefer-presence-queries': 'error',
    'testing-library/prefer-role-queries': 'warn',
    'testing-library/no-container': 'error',
    'testing-library/no-node-access': 'error',
  }
}
```

## Anti-Patterns Summary

| ❌ Never Use | ✅ Use Instead |
|-------------|----------------|
| `.querySelector()` | `getByRole()`, `getByTestId()` |
| `getByClassName()` | `getByRole()`, `getByText()` |
| `container.firstChild` | Specific query |
| `getByRole('button')` alone | `getByRole('button', { name: '...' })` |
| Hardcoded dynamic text | Regex or test IDs |
| XPath | Playwright/RTL queries |
