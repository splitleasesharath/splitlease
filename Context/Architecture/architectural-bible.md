# Split Lease Architectural Bible
## The Commandments for AI-Native Development

### Core Philosophy
> "Every line of code should be written as if an AI agent will read, understand, modify, and test it tomorrow."

---

## The Ten Commandments of Architecture

### 1. Thou Shalt Write Self-Documenting Code
**Principle:** Code should explain itself through clear naming, structure, and inline documentation.

```typescript
// ❌ FORBIDDEN: Cryptic, undocumented code
const calc = (x, y, z) => x * y + z * 0.45;

// ✅ BLESSED: Self-documenting with clear intent
/**
 * Calculates the total split lease cost including fees
 * @param nightlyRate - Base rate per night in USD
 * @param numberOfNights - Total nights in the lease period  
 * @param platformFee - Platform fee as a percentage (0.45 = 45%)
 * @returns Total cost including all fees
 */
function calculateSplitLeaseCost(
  nightlyRate: number,
  numberOfNights: number,
  platformFeePercentage: number
): number {
  const baseCost = nightlyRate * numberOfNights;
  const platformFee = baseCost * platformFeePercentage;
  return baseCost + platformFee;
}
```

**AI Agent Directive:** When creating new functions, always include JSDoc comments with parameter descriptions, return types, and usage examples.

---

### 2. Thou Shalt Maintain Single Source of Truth
**Principle:** Each piece of data should have exactly one authoritative source.

```typescript
// ❌ FORBIDDEN: Data duplication
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6];

// ✅ BLESSED: Single source with derivations
const DAYS = [
  { index: 0, short: 'Sun', abbr: 'S', full: 'Sunday', isWeekend: true },
  { index: 1, short: 'Mon', abbr: 'M', full: 'Monday', isWeekend: false },
  // ... rest of days
] as const;

// Derive other formats from single source
const getDayAbbreviations = () => DAYS.map(d => d.abbr);
const getWeekdays = () => DAYS.filter(d => !d.isWeekend);
```

**AI Agent Directive:** Before creating new constants or data structures, check if the information already exists. If it does, derive from the existing source rather than duplicating.

---

### 3. Thou Shalt Test Every Path
**Principle:** No code shall be considered complete without comprehensive tests.

```typescript
// Every component must have:
// 1. Unit tests for logic
// 2. Integration tests for interactions
// 3. E2E tests for critical user flows

// File structure enforcement:
// components/
//   Header/
//     Header.tsx         <- Implementation
//     Header.test.tsx    <- Unit tests (REQUIRED)
//     Header.stories.tsx <- Visual tests (REQUIRED)
//     Header.e2e.ts      <- E2E tests for critical paths
```

**Testing Requirements:**
- Minimum 80% code coverage
- All happy paths tested
- All error states tested
- All edge cases documented and tested
- Performance benchmarks for critical paths

**AI Agent Directive:** When implementing a new feature, create the test file first (TDD). Write failing tests, then implement code to make them pass.

---

### 4. Thou Shalt Respect the Type System
**Principle:** TypeScript is not optional. Every value must have a type.

```typescript
// ❌ FORBIDDEN: Any types or implicit any
function processData(data) {  // implicit any
  return data.map(item => item.value);
}

// ✅ BLESSED: Fully typed with constraints
interface DataItem {
  id: string;
  value: number;
  metadata?: Record<string, unknown>;
}

function processData<T extends DataItem>(
  data: readonly T[]
): number[] {
  return data.map(item => item.value);
}

// Runtime validation for external data
import { z } from 'zod';

const DataItemSchema = z.object({
  id: z.string().uuid(),
  value: z.number().positive(),
  metadata: z.record(z.unknown()).optional()
});

function processExternalData(rawData: unknown): number[] {
  const validatedData = z.array(DataItemSchema).parse(rawData);
  return processData(validatedData);
}
```

**AI Agent Directive:** Never use `any` type. If type is unknown, use `unknown` and add runtime validation. All external data must be validated at boundaries.

---

### 5. Thou Shalt Embrace Immutability
**Principle:** Data flows in one direction. Never mutate, always transform.

```typescript
// ❌ FORBIDDEN: Mutation
function updateUserPreferences(user, newPrefs) {
  user.preferences = { ...user.preferences, ...newPrefs };
  return user;
}

// ✅ BLESSED: Immutable transformation
function updateUserPreferences(
  user: User,
  newPreferences: Partial<UserPreferences>
): User {
  return {
    ...user,
    preferences: {
      ...user.preferences,
      ...newPreferences
    },
    modifiedAt: new Date()
  };
}

// State management with immutability
const useUserStore = create<UserStore>((set) => ({
  user: null,
  updatePreferences: (prefs) => set((state) => ({
    user: state.user ? updateUserPreferences(state.user, prefs) : null
  }))
}));
```

**AI Agent Directive:** Always use const declarations. Never modify function parameters. Return new objects/arrays instead of mutating existing ones.

---

### 6. Thou Shalt Separate Concerns
**Principle:** Each module should have exactly one responsibility.

```typescript
// ❌ FORBIDDEN: Mixed concerns
class ListingComponent {
  constructor() {
    this.fetchData();
    this.setupEventListeners();
    this.validateForm();
    this.calculatePricing();
  }
  
  fetchData() { /* API calls */ }
  render() { /* UI rendering */ }
  validateForm() { /* Business logic */ }
  calculatePricing() { /* Business logic */ }
}

// ✅ BLESSED: Separated concerns
// api/listings.ts - Data fetching
export const listingsApi = {
  search: (params: SearchParams) => fetch('/api/listings/search', ...),
  getById: (id: string) => fetch(`/api/listings/${id}`)
};

// hooks/useListings.ts - State management
export function useListings(params: SearchParams) {
  return useQuery({
    queryKey: ['listings', params],
    queryFn: () => listingsApi.search(params)
  });
}

// components/ListingCard.tsx - Pure UI
export const ListingCard: FC<ListingCardProps> = ({ listing }) => (
  <div className={styles.card}>
    {/* Pure presentation */}
  </div>
);

// utils/pricing.ts - Business logic
export const pricingCalculator = {
  calculateTotal: (nights: number, rate: number) => nights * rate,
  applyDiscounts: (total: number, discounts: Discount[]) => ...
};
```

**AI Agent Directive:** Each file should export related functionality. If a file contains multiple unrelated exports, split it into separate modules.

---

### 7. Thou Shalt Handle Errors Gracefully
**Principle:** Every error is an opportunity to help the user.

```typescript
// ❌ FORBIDDEN: Silent failures
try {
  await saveData(data);
} catch (e) {
  console.log(e);  // User sees nothing
}

// ✅ BLESSED: Comprehensive error handling
class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public isOperational = true,
    public context?: Record<string, unknown>
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

async function saveListingWithRecovery(
  listing: Listing
): Promise<Result<Listing, ApplicationError>> {
  try {
    const saved = await listingsApi.save(listing);
    return { success: true, data: saved };
  } catch (error) {
    // Log for developers
    logger.error('Failed to save listing', { error, listing });
    
    // Attempt recovery
    if (error.code === 'NETWORK_ERROR') {
      const cached = await cacheManager.save(listing);
      return {
        success: false,
        error: new ApplicationError(
          'Saved offline. Will sync when connection returns.',
          'OFFLINE_SAVE',
          200,
          true,
          { cachedId: cached.id }
        )
      };
    }
    
    // User-friendly error
    return {
      success: false,
      error: new ApplicationError(
        'Unable to save your listing. Please try again.',
        'SAVE_FAILED',
        500,
        true,
        { originalError: error }
      )
    };
  }
}
```

**AI Agent Directive:** Every async operation must have error handling. Every error must be logged, categorized, and presented to the user appropriately.

---

### 8. Thou Shalt Optimize for Change
**Principle:** Design for tomorrow's requirements, not just today's.

```typescript
// ❌ FORBIDDEN: Hard-coded, inflexible
function calculatePrice(nights: number) {
  return nights * 150 + 45;  // What are these numbers?
}

// ✅ BLESSED: Configurable and extensible
interface PricingRule {
  name: string;
  priority: number;
  condition: (context: PricingContext) => boolean;
  apply: (basePrice: number, context: PricingContext) => number;
}

class PricingEngine {
  private rules: PricingRule[] = [];
  
  addRule(rule: PricingRule): this {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
    return this;
  }
  
  calculate(context: PricingContext): PriceBreakdown {
    let price = context.basePrice;
    const appliedRules: AppliedRule[] = [];
    
    for (const rule of this.rules) {
      if (rule.condition(context)) {
        const newPrice = rule.apply(price, context);
        appliedRules.push({
          name: rule.name,
          adjustment: newPrice - price
        });
        price = newPrice;
      }
    }
    
    return { total: price, breakdown: appliedRules };
  }
}

// Easy to extend with new rules
pricingEngine
  .addRule(weekendSurcharge)
  .addRule(longStayDiscount)
  .addRule(earlyBirdSpecial);
```

**AI Agent Directive:** Use configuration objects instead of hard-coded values. Design interfaces that allow extension without modification (Open/Closed Principle).

---

### 9. Thou Shalt Measure Everything
**Principle:** You cannot optimize what you do not measure.

```typescript
// Required measurements for every feature:

// 1. Performance metrics
performance.mark('search-start');
const results = await searchListings(params);
performance.mark('search-end');
performance.measure('search-duration', 'search-start', 'search-end');

// 2. Business metrics
analytics.track('Listing Searched', {
  userId: user.id,
  searchParams: params,
  resultsCount: results.length,
  duration: performance.getEntriesByName('search-duration')[0].duration
});

// 3. Error metrics
Sentry.setContext('search', { params, userId: user.id });

// 4. Feature flags with metrics
const showNewSearch = featureFlag('new-search-ui', {
  userId: user.id,
  onExposure: (variant) => {
    analytics.track('Feature Flag Exposed', {
      flag: 'new-search-ui',
      variant,
      userId: user.id
    });
  }
});
```

**Measurement Requirements:**
- API response times < 200ms (p95)
- UI interactions < 100ms response
- Error rate < 0.1%
- Test coverage > 80%
- Bundle size growth < 5% per quarter

**AI Agent Directive:** Include performance marks around critical operations. Add analytics events for user interactions. Monitor error rates and performance metrics.

---

### 10. Thou Shalt Document Intent, Not Implementation
**Principle:** Explain WHY, not just WHAT.

```typescript
// ❌ FORBIDDEN: Implementation-focused comments
// Loop through the array
for (let i = 0; i < items.length; i++) {
  // Add 1 to the value
  items[i].value += 1;
}

// ✅ BLESSED: Intent-focused documentation
/**
 * Apply nightly increment to account for the check-in day
 * being included in the total nights calculation.
 * 
 * Business Rule: When a user books Mon-Wed, they stay 3 nights
 * (Mon, Tue, Wed) but only need accommodation for 2 nights
 * since they check out on Wed morning.
 * 
 * @see https://splitlease.atlassian.net/browse/SL-1234
 */
function adjustForCheckInDayInclusion(bookings: Booking[]): Booking[] {
  return bookings.map(booking => ({
    ...booking,
    // Increment compensates for inclusive date ranging
    totalNights: booking.totalNights + CHECK_IN_DAY_ADJUSTMENT
  }));
}
```

**Documentation Standards:**
- Every business rule must link to its source
- Every optimization must explain its purpose
- Every workaround must describe the ideal solution
- Every deprecation must provide migration path

**AI Agent Directive:** Comments should explain business logic and edge cases. Reference tickets, RFCs, or documentation for context. Avoid obvious comments.

---

## Component Development Standards

### Directory Structure
```
components/
├── atomic/              # Atoms: buttons, inputs, labels
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   ├── Button.module.css
│   │   └── index.ts
├── molecules/          # Molecules: search bars, cards
├── organisms/          # Organisms: headers, forms
├── templates/          # Templates: page layouts
└── pages/             # Pages: full page components
```

### Component Checklist
Every component MUST have:
- [ ] TypeScript interface for props
- [ ] Default props where appropriate
- [ ] Memoization for expensive renders
- [ ] Accessibility attributes (ARIA)
- [ ] Error boundaries for safety
- [ ] Loading and error states
- [ ] Unit tests with > 90% coverage
- [ ] Storybook stories for all states
- [ ] Performance budget defined

### React Component Template
```typescript
import { FC, memo, useCallback, useMemo } from 'react';
import styles from './ComponentName.module.css';

export interface ComponentNameProps {
  /** Primary content to display */
  children: React.ReactNode;
  /** Optional CSS class for styling */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Callback fired when interaction occurs */
  onChange?: (value: string) => void;
}

/**
 * ComponentName provides [purpose and usage].
 * 
 * @example
 * ```tsx
 * <ComponentName onChange={handleChange}>
 *   Content here
 * </ComponentName>
 * ```
 */
export const ComponentName: FC<ComponentNameProps> = memo(({
  children,
  className,
  ariaLabel,
  onChange
}) => {
  // Memoized computations
  const computedValue = useMemo(() => {
    // Expensive calculation here
    return expensiveOperation();
  }, [dependency]);
  
  // Stable callbacks
  const handleChange = useCallback((value: string) => {
    onChange?.(value);
  }, [onChange]);
  
  return (
    <div 
      className={`${styles.container} ${className || ''}`}
      aria-label={ariaLabel}
      role="region"
    >
      {children}
    </div>
  );
});

ComponentName.displayName = 'ComponentName';
```

---

## API Design Standards

### RESTful Endpoints
```typescript
// Resource naming: plural nouns
GET    /api/v1/listings          // List
GET    /api/v1/listings/:id      // Read
POST   /api/v1/listings          // Create
PUT    /api/v1/listings/:id      // Update
DELETE /api/v1/listings/:id      // Delete

// Sub-resources
GET    /api/v1/listings/:id/availability
POST   /api/v1/listings/:id/bookings

// Actions as sub-resources
POST   /api/v1/listings/:id/publish
POST   /api/v1/listings/:id/archive
```

### Response Format
```typescript
// Success response
{
  "success": true,
  "data": { /* resource data */ },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}

// Error response  
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## State Management Principles

### Store Structure
```typescript
interface AppState {
  // Domain-based organization
  auth: AuthState;
  listings: ListingsState;
  bookings: BookingsState;
  ui: UIState;
  
  // Never store derived state
  // ❌ totalPrice: number
  // ✅ getTotalPrice: () => number
}

// Normalized data structure
interface ListingsState {
  byId: Record<string, Listing>;
  allIds: string[];
  searchResults: {
    query: SearchParams;
    ids: string[];
    loading: boolean;
    error: Error | null;
  };
}
```

### Action Patterns
```typescript
// Action creators follow FSA standard
interface Action<T = any> {
  type: string;
  payload?: T;
  error?: boolean;
  meta?: any;
}

// Async action lifecycle
const FETCH_LISTINGS = 'listings/FETCH';
const FETCH_LISTINGS_PENDING = 'listings/FETCH_PENDING';
const FETCH_LISTINGS_SUCCESS = 'listings/FETCH_SUCCESS';
const FETCH_LISTINGS_FAILURE = 'listings/FETCH_FAILURE';
```

---

## Database Schema Principles

### Naming Conventions
```sql
-- Tables: snake_case, plural
CREATE TABLE listings (
  -- Primary keys: table_singular_id
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys: referenced_table_singular_id
  user_id UUID NOT NULL REFERENCES users(user_id),
  
  -- Columns: snake_case
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Booleans: is_ or has_ prefix
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  has_availability BOOLEAN NOT NULL DEFAULT TRUE
);

-- Indexes: idx_table_columns
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);

-- Constraints: table_column_constraint
ALTER TABLE listings 
  ADD CONSTRAINT listings_price_positive 
  CHECK (price_per_night > 0);
```

### Migration Standards
```sql
-- Always include up and down migrations
-- migrations/001_create_listings.up.sql
CREATE TABLE listings (...);

-- migrations/001_create_listings.down.sql  
DROP TABLE IF EXISTS listings CASCADE;

-- Always use transactions
BEGIN;
  ALTER TABLE listings ADD COLUMN discount_percentage INT;
  UPDATE listings SET discount_percentage = 0 WHERE discount_percentage IS NULL;
  ALTER TABLE listings ALTER COLUMN discount_percentage SET NOT NULL;
COMMIT;
```

---

## Security Commandments

### Never Trust User Input
```typescript
// Always validate at boundaries
const validateInput = (input: unknown): ValidatedInput => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    age: z.number().min(18).max(150)
  });
  
  return schema.parse(input);
};

// Sanitize for display
const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
};
```

### Principle of Least Privilege
```typescript
// Users only see their own data
const getListings = async (userId: string) => {
  return db.listings.findMany({
    where: {
      OR: [
        { userId },
        { isPublic: true }
      ]
    },
    select: {
      // Only return necessary fields
      id: true,
      title: true,
      price: true,
      // Exclude sensitive fields
      internalNotes: false,
      costBasis: false
    }
  });
};
```

---

## Performance Commandments

### Bundle Size Budget
```javascript
// webpack.config.js
module.exports = {
  performance: {
    maxEntrypointSize: 250000,  // 250KB
    maxAssetSize: 200000,        // 200KB
    hints: 'error'                // Fail build if exceeded
  }
};
```

### Lazy Loading Strategy
```typescript
// Route-based code splitting
const SearchPage = lazy(() => import('./pages/SearchPage'));

// Component-based splitting for heavy components
const RichTextEditor = lazy(() => 
  import(/* webpackChunkName: "editor" */ './components/RichTextEditor')
);

// Intersection Observer for below-fold content
const LazyImage: FC<{ src: string }> = ({ src }) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { rootMargin: '50px' }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <img 
      ref={imgRef}
      src={isIntersecting ? src : undefined}
      loading="lazy"
    />
  );
};
```

---

## AI Agent Behavioral Rules

### Code Generation Rules
1. **Always write tests first** - TDD is mandatory
2. **Include comprehensive JSDoc** - Every function needs documentation
3. **Use semantic variable names** - No single letters except loop indices
4. **Prefer composition over inheritance** - Use hooks and HOCs over class inheritance
5. **Keep functions small** - Max 20 lines per function
6. **One file, one purpose** - Split when file exceeds 200 lines
7. **No magic numbers** - All values must be named constants
8. **Handle all edge cases** - Null, undefined, empty arrays, etc.
9. **Add performance marks** - Measure critical paths
10. **Include examples in comments** - Show usage patterns

### Refactoring Rules
1. **Never refactor without tests** - Ensure safety net exists
2. **One refactoring at a time** - Don't mix refactoring with features
3. **Preserve public APIs** - Deprecate, don't break
4. **Document breaking changes** - Include migration guide
5. **Benchmark before/after** - Ensure no performance regression

### Review Checklist for AI Agents
Before marking any task complete, verify:
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] Accessibility checked
- [ ] Performance budget met
- [ ] Error handling complete
- [ ] Security validated
- [ ] Code review passed
- [ ] Migrations included
- [ ] Monitoring added

---

## Continuous Improvement Protocol

### Weekly Reviews
Every Friday, AI agents should:
1. Analyze code coverage trends
2. Review error logs for patterns
3. Identify performance bottlenecks
4. Suggest refactoring opportunities
5. Update deprecated dependencies

### Monthly Audits
First Monday of each month:
1. Security vulnerability scan
2. Accessibility audit (WCAG 2.1 AA)
3. Performance benchmark against competitors
4. Bundle size analysis
5. Technical debt assessment

### Quarterly Planning
Every quarter:
1. Review and update this architectural bible
2. Assess new technology adoption
3. Plan major refactoring initiatives
4. Update AI agent training data
5. Revise performance budgets

---

## Emergency Procedures

### Production Incident Response
```typescript
// 1. Immediate response
logger.critical('Production incident detected', {
  severity: 'P1',
  service: 'listings',
  error: error.message,
  stack: error.stack
});

// 2. Circuit breaker activation
circuitBreaker.open('listings-service');

// 3. Fallback to cached data
const getCachedListings = () => {
  return cache.get('listings:fallback') || [];
};

// 4. User notification
notify.users({
  message: 'We are experiencing technical difficulties',
  severity: 'warning',
  expectedResolution: '15 minutes'
});

// 5. Rollback procedure
if (incident.severity === 'P1') {
  await deploymentManager.rollback('last-known-good');
}
```

### Rollback Decision Tree
```
Is it affecting > 1% of users?
  ├─ Yes → Is there data loss?
  │   ├─ Yes → IMMEDIATE ROLLBACK
  │   └─ No → Can we hotfix in < 15min?
  │       ├─ Yes → Deploy hotfix
  │       └─ No → ROLLBACK
  └─ No → Monitor for 1 hour
      └─ Escalating? → ROLLBACK
```

---

## Conclusion

These commandments are not suggestions—they are the law. Every line of code in the Split Lease codebase must adhere to these principles. AI agents must internalize these rules and apply them consistently.

Remember: We are building for the future. Every decision should consider:
1. **Maintainability** - Can another developer understand this in 6 months?
2. **Scalability** - Will this work with 10x the data/users?
3. **Testability** - Can we verify this works correctly?
4. **Observability** - Can we monitor this in production?
5. **Accessibility** - Can everyone use this feature?

The code we write today becomes the foundation for tomorrow. Build it right the first time.

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Approval:** Engineering Leadership Team

*"Move fast and break things" is dead. "Move thoughtfully and build things that last" is the way.*
