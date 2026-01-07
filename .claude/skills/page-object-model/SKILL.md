---
name: page-object-model
description: Implement Page Object Model pattern for E2E tests to encapsulate page selectors and interactions. Use this skill when building Playwright test suites, refactoring brittle E2E tests, or establishing E2E test architecture. Changes to UI require updates in one place, not across dozens of test files.
license: MIT
---

This skill guides implementation of the Page Object Model (POM) pattern for Playwright E2E tests. POM encapsulates page structure and interactions into reusable classes, making tests readable and maintainable.

## When to Use This Skill

- Setting up new E2E test architecture
- Refactoring brittle tests with scattered selectors
- Testing complex multi-step flows (checkout, onboarding)
- Building reusable test components for marketplace features
- Reducing test maintenance when UI changes

## Core Concept

```
WITHOUT POM:
┌─────────────────────────────────────────────────────────┐
│ test1.spec.ts: page.locator('.btn-primary').click()    │
│ test2.spec.ts: page.locator('.btn-primary').click()    │
│ test3.spec.ts: page.locator('.btn-primary').click()    │
│                                                         │
│ UI changes → Update 50+ files                          │
└─────────────────────────────────────────────────────────┘

WITH POM:
┌─────────────────────────────────────────────────────────┐
│ ListingPage.ts: bookButton = getByRole('button', ...)  │
│                                                         │
│ test1.spec.ts: listingPage.clickBook()                 │
│ test2.spec.ts: listingPage.clickBook()                 │
│ test3.spec.ts: listingPage.clickBook()                 │
│                                                         │
│ UI changes → Update 1 file                             │
└─────────────────────────────────────────────────────────┘
```

## Basic Page Object Structure

```typescript
// e2e/pages/BasePage.ts
import { Page, Locator } from '@playwright/test'

export abstract class BasePage {
  readonly page: Page
  
  constructor(page: Page) {
    this.page = page
  }
  
  // Common elements across all pages
  get navbar() { return this.page.getByRole('navigation') }
  get footer() { return this.page.getByRole('contentinfo') }
  get loadingSpinner() { return this.page.getByTestId('loading-spinner') }
  
  // Common actions
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }
  
  async waitForSpinnerToDisappear() {
    await this.loadingSpinner.waitFor({ state: 'hidden' })
  }
}
```

## Page Objects for Split Lease

### Listing Page

```typescript
// e2e/pages/ListingPage.ts
import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class ListingPage extends BasePage {
  // Locators - define once, use everywhere
  readonly title: Locator
  readonly price: Locator
  readonly description: Locator
  readonly gallery: Locator
  readonly bookButton: Locator
  readonly contactHostButton: Locator
  readonly amenitiesList: Locator
  readonly hostCard: Locator
  readonly reviewsSection: Locator
  readonly calendarPicker: Locator
  readonly guestSelector: Locator

  constructor(page: Page) {
    super(page)
    this.title = page.getByRole('heading', { level: 1 })
    this.price = page.getByTestId('listing-price')
    this.description = page.getByTestId('listing-description')
    this.gallery = page.getByTestId('listing-gallery')
    this.bookButton = page.getByRole('button', { name: /book now/i })
    this.contactHostButton = page.getByRole('button', { name: /contact host/i })
    this.amenitiesList = page.getByRole('list', { name: /amenities/i })
    this.hostCard = page.getByTestId('host-card')
    this.reviewsSection = page.getByTestId('reviews-section')
    this.calendarPicker = page.getByRole('application', { name: /calendar/i })
    this.guestSelector = page.getByLabel(/guests/i)
  }

  // Navigation
  async goto(listingId: string) {
    await this.page.goto(`/listings/${listingId}`)
    await this.waitForPageLoad()
  }

  // Actions
  async selectDates(checkIn: Date, checkOut: Date) {
    await this.calendarPicker.getByRole('button', { name: this.formatDate(checkIn) }).click()
    await this.calendarPicker.getByRole('button', { name: this.formatDate(checkOut) }).click()
  }

  async setGuestCount(count: number) {
    await this.guestSelector.fill(count.toString())
  }

  async clickBook() {
    await this.bookButton.click()
    await this.page.waitForURL(/\/checkout/)
  }

  async clickContactHost() {
    await this.contactHostButton.click()
    await this.page.waitForSelector('[data-testid="message-modal"]')
  }

  async openGallery() {
    await this.gallery.click()
    await this.page.waitForSelector('[data-testid="gallery-modal"]')
  }

  // Assertions
  async expectTitle(title: string) {
    await expect(this.title).toHaveText(title)
  }

  async expectPrice(price: string) {
    await expect(this.price).toContainText(price)
  }

  async expectAmenity(amenity: string) {
    await expect(this.amenitiesList).toContainText(amenity)
  }

  async expectHostName(name: string) {
    await expect(this.hostCard).toContainText(name)
  }

  async expectBookButtonEnabled() {
    await expect(this.bookButton).toBeEnabled()
  }

  async expectBookButtonDisabled() {
    await expect(this.bookButton).toBeDisabled()
  }

  // Helpers
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }
}
```

### Checkout Page

```typescript
// e2e/pages/CheckoutPage.ts
import { Page, Locator, FrameLocator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class CheckoutPage extends BasePage {
  readonly bookingSummary: Locator
  readonly totalPrice: Locator
  readonly payButton: Locator
  readonly cancelButton: Locator
  readonly stripeFrame: FrameLocator
  readonly promoCodeInput: Locator
  readonly applyPromoButton: Locator
  readonly errorAlert: Locator

  constructor(page: Page) {
    super(page)
    this.bookingSummary = page.getByTestId('booking-summary')
    this.totalPrice = page.getByTestId('total-price')
    this.payButton = page.getByRole('button', { name: /pay/i })
    this.cancelButton = page.getByRole('button', { name: /cancel/i })
    this.stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
    this.promoCodeInput = page.getByLabel(/promo code/i)
    this.applyPromoButton = page.getByRole('button', { name: /apply/i })
    this.errorAlert = page.getByRole('alert')
  }

  // Navigation
  async goto(bookingId: string) {
    await this.page.goto(`/checkout/${bookingId}`)
    await this.waitForPageLoad()
  }

  // Stripe Card Actions
  async fillCardNumber(number: string) {
    await this.stripeFrame.getByPlaceholder('Card number').fill(number)
  }

  async fillCardExpiry(expiry: string) {
    await this.stripeFrame.getByPlaceholder('MM / YY').fill(expiry)
  }

  async fillCardCvc(cvc: string) {
    await this.stripeFrame.getByPlaceholder('CVC').fill(cvc)
  }

  async fillCardZip(zip: string) {
    await this.stripeFrame.getByPlaceholder('ZIP').fill(zip)
  }

  async fillCard(card: { number: string; expiry: string; cvc: string; zip?: string }) {
    await this.fillCardNumber(card.number)
    await this.fillCardExpiry(card.expiry)
    await this.fillCardCvc(card.cvc)
    if (card.zip) await this.fillCardZip(card.zip)
  }

  async applyPromoCode(code: string) {
    await this.promoCodeInput.fill(code)
    await this.applyPromoButton.click()
  }

  async submitPayment() {
    await this.payButton.click()
  }

  async completePayment(card: { number: string; expiry: string; cvc: string; zip?: string }) {
    await this.fillCard(card)
    await this.submitPayment()
    await this.page.waitForURL(/\/booking-confirmed/, { timeout: 30000 })
  }

  // Assertions
  async expectTotal(amount: string) {
    await expect(this.totalPrice).toContainText(amount)
  }

  async expectError(message: string | RegExp) {
    await expect(this.errorAlert).toContainText(message)
  }

  async expectPayButtonText(text: string | RegExp) {
    await expect(this.payButton).toContainText(text)
  }
}
```

### Search Page

```typescript
// e2e/pages/SearchPage.ts
import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class SearchPage extends BasePage {
  readonly searchInput: Locator
  readonly searchButton: Locator
  readonly filterButton: Locator
  readonly resultsGrid: Locator
  readonly resultCards: Locator
  readonly sortDropdown: Locator
  readonly priceRangeMin: Locator
  readonly priceRangeMax: Locator
  readonly categoryFilter: Locator
  readonly noResultsMessage: Locator
  readonly resultCount: Locator
  readonly mapToggle: Locator

  constructor(page: Page) {
    super(page)
    this.searchInput = page.getByRole('searchbox')
    this.searchButton = page.getByRole('button', { name: /search/i })
    this.filterButton = page.getByRole('button', { name: /filter/i })
    this.resultsGrid = page.getByTestId('results-grid')
    this.resultCards = page.getByTestId('listing-card')
    this.sortDropdown = page.getByLabel(/sort by/i)
    this.priceRangeMin = page.getByLabel(/minimum price/i)
    this.priceRangeMax = page.getByLabel(/maximum price/i)
    this.categoryFilter = page.getByRole('group', { name: /category/i })
    this.noResultsMessage = page.getByText(/no listings found/i)
    this.resultCount = page.getByTestId('result-count')
    this.mapToggle = page.getByRole('button', { name: /map/i })
  }

  // Navigation
  async goto(query?: string) {
    const url = query ? `/search?q=${encodeURIComponent(query)}` : '/search'
    await this.page.goto(url)
    await this.waitForPageLoad()
  }

  // Actions
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.searchButton.click()
    await this.waitForResults()
  }

  async setPriceRange(min: number, max: number) {
    await this.priceRangeMin.fill(min.toString())
    await this.priceRangeMax.fill(max.toString())
    await this.waitForResults()
  }

  async selectCategory(category: string) {
    await this.categoryFilter.getByLabel(category).check()
    await this.waitForResults()
  }

  async sortBy(option: string) {
    await this.sortDropdown.selectOption(option)
    await this.waitForResults()
  }

  async clickResult(index: number) {
    await this.resultCards.nth(index).click()
    await this.page.waitForURL(/\/listings\//)
  }

  async toggleMap() {
    await this.mapToggle.click()
  }

  // Waiting
  async waitForResults() {
    await this.waitForSpinnerToDisappear()
    // Wait for either results or no-results message
    await Promise.race([
      this.resultCards.first().waitFor({ timeout: 10000 }).catch(() => {}),
      this.noResultsMessage.waitFor({ timeout: 10000 }).catch(() => {}),
    ])
  }

  // Assertions
  async expectResultCount(count: number) {
    await expect(this.resultCards).toHaveCount(count)
  }

  async expectMinResults(count: number) {
    const actual = await this.resultCards.count()
    expect(actual).toBeGreaterThanOrEqual(count)
  }

  async expectNoResults() {
    await expect(this.noResultsMessage).toBeVisible()
  }

  async expectResultWithTitle(title: string) {
    await expect(this.resultsGrid).toContainText(title)
  }

  // Data extraction
  async getResultTitles(): Promise<string[]> {
    return this.resultCards.getByTestId('listing-title').allTextContents()
  }

  async getResultPrices(): Promise<number[]> {
    const priceTexts = await this.resultCards.getByTestId('listing-price').allTextContents()
    return priceTexts.map(t => parseInt(t.replace(/[^0-9]/g, '')))
  }
}
```

### Login Page

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly forgotPasswordLink: Locator
  readonly signUpLink: Locator
  readonly googleButton: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator

  constructor(page: Page) {
    super(page)
    this.emailInput = page.getByLabel(/email/i)
    this.passwordInput = page.getByLabel(/password/i)
    this.submitButton = page.getByRole('button', { name: /sign in/i })
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i })
    this.signUpLink = page.getByRole('link', { name: /sign up/i })
    this.googleButton = page.getByRole('button', { name: /google/i })
    this.errorMessage = page.getByRole('alert')
    this.successMessage = page.getByText(/success/i)
  }

  // Navigation
  async goto() {
    await this.page.goto('/login')
  }

  // Actions
  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async loginAndWait(email: string, password: string, redirectUrl = '/dashboard') {
    await this.login(email, password)
    await this.page.waitForURL(redirectUrl)
  }

  // Assertions
  async expectError(message: string | RegExp) {
    await expect(this.errorMessage).toContainText(message)
  }

  async expectOnLoginPage() {
    await expect(this.page).toHaveURL(/\/login/)
  }
}
```

## Component Page Objects

For reusable UI components that appear on multiple pages:

```typescript
// e2e/components/MessageModal.ts
import { Page, Locator } from '@playwright/test'

export class MessageModal {
  readonly page: Page
  readonly modal: Locator
  readonly recipientName: Locator
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly closeButton: Locator

  constructor(page: Page) {
    this.page = page
    this.modal = page.getByTestId('message-modal')
    this.recipientName = this.modal.getByTestId('recipient-name')
    this.messageInput = this.modal.getByLabel(/message/i)
    this.sendButton = this.modal.getByRole('button', { name: /send/i })
    this.closeButton = this.modal.getByRole('button', { name: /close/i })
  }

  async sendMessage(text: string) {
    await this.messageInput.fill(text)
    await this.sendButton.click()
  }

  async close() {
    await this.closeButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }
}

// e2e/components/DateRangePicker.ts
import { Page, Locator } from '@playwright/test'

export class DateRangePicker {
  readonly container: Locator
  readonly startDateInput: Locator
  readonly endDateInput: Locator
  readonly calendar: Locator
  readonly nextMonthButton: Locator
  readonly prevMonthButton: Locator

  constructor(page: Page, containerSelector = '[data-testid="date-picker"]') {
    this.container = page.locator(containerSelector)
    this.startDateInput = this.container.getByLabel(/check-in|start/i)
    this.endDateInput = this.container.getByLabel(/check-out|end/i)
    this.calendar = this.container.getByRole('application', { name: /calendar/i })
    this.nextMonthButton = this.container.getByRole('button', { name: /next month/i })
    this.prevMonthButton = this.container.getByRole('button', { name: /previous month/i })
  }

  async selectRange(startDate: Date, endDate: Date) {
    await this.navigateToMonth(startDate)
    await this.clickDate(startDate)
    await this.navigateToMonth(endDate)
    await this.clickDate(endDate)
  }

  private async navigateToMonth(date: Date) {
    // Implementation to navigate calendar to correct month
  }

  private async clickDate(date: Date) {
    const dayButton = this.calendar.getByRole('button', { 
      name: new RegExp(`${date.getDate()}`) 
    })
    await dayButton.click()
  }
}
```

## Page Object Manager (Fixture)

Create a fixture to instantiate page objects:

```typescript
// e2e/fixtures/pages.ts
import { test as base } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { SearchPage } from '../pages/SearchPage'
import { ListingPage } from '../pages/ListingPage'
import { CheckoutPage } from '../pages/CheckoutPage'

type Pages = {
  loginPage: LoginPage
  searchPage: SearchPage
  listingPage: ListingPage
  checkoutPage: CheckoutPage
}

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page))
  },
  listingPage: async ({ page }, use) => {
    await use(new ListingPage(page))
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page))
  },
})

export { expect } from '@playwright/test'
```

## Using Page Objects in Tests

```typescript
// e2e/tests/booking-flow.spec.ts
import { test, expect } from '../fixtures/pages'

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto()
    await loginPage.loginAndWait('buyer@test.com', 'password123')
  })

  test('complete booking from search to confirmation', async ({ 
    searchPage, 
    listingPage, 
    checkoutPage 
  }) => {
    // Search for listings
    await searchPage.goto()
    await searchPage.search('downtown')
    await searchPage.setPriceRange(500, 1500)
    await searchPage.expectMinResults(1)
    
    // Select first result
    await searchPage.clickResult(0)
    
    // View listing and book
    await listingPage.expectBookButtonEnabled()
    await listingPage.selectDates(
      new Date('2025-02-01'),
      new Date('2025-02-07')
    )
    await listingPage.clickBook()
    
    // Complete checkout
    await checkoutPage.expectTotal('$')
    await checkoutPage.completePayment({
      number: '4242424242424242',
      expiry: '12/34',
      cvc: '123',
      zip: '12345'
    })
    
    // Verify confirmation
    await expect(checkoutPage.page).toHaveURL(/\/booking-confirmed/)
  })

  test('handles declined card', async ({ searchPage, listingPage, checkoutPage }) => {
    await searchPage.goto()
    await searchPage.clickResult(0)
    await listingPage.clickBook()
    
    await checkoutPage.fillCard({
      number: '4000000000000002', // Decline card
      expiry: '12/34',
      cvc: '123'
    })
    await checkoutPage.submitPayment()
    
    await checkoutPage.expectError(/declined/i)
  })
})
```

## File Organization

```
e2e/
├── fixtures/
│   ├── pages.ts              # Page object fixtures
│   └── auth.ts               # Auth state fixtures
├── pages/
│   ├── BasePage.ts           # Common functionality
│   ├── LoginPage.ts
│   ├── SearchPage.ts
│   ├── ListingPage.ts
│   ├── CheckoutPage.ts
│   ├── DashboardPage.ts
│   └── index.ts              # Export all pages
├── components/
│   ├── MessageModal.ts
│   ├── DateRangePicker.ts
│   ├── Navbar.ts
│   └── index.ts
├── tests/
│   ├── auth.spec.ts
│   ├── search.spec.ts
│   ├── booking-flow.spec.ts
│   └── messaging.spec.ts
└── playwright.config.ts
```

## Anti-Patterns to Avoid

| ❌ Anti-Pattern | ✅ Correct Approach |
|----------------|---------------------|
| Selectors in test files | All selectors in page objects |
| `page.locator('.btn')` in tests | `listingPage.bookButton` |
| Duplicating wait logic | Encapsulate in page object methods |
| Giant page objects | Split into components for reusable parts |
| Business logic in page objects | Page objects only handle UI interaction |
| Assertions scattered in page objects | Keep assertions in test files or dedicated assertion methods |

## Best Practices

1. **One page object per page/view**: Don't mix multiple pages
2. **Descriptive method names**: `clickBook()` not `click()`
3. **Return types for navigation**: Methods that navigate should wait for new page
4. **Lazy locators**: Define locators as properties, not in constructor
5. **Composition over inheritance**: Use component page objects
6. **Keep page objects focused**: UI interaction only, no test logic
