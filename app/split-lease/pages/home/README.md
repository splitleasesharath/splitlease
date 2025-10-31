# SplitLease Homepage - Islands Architecture Implementation

## Overview

This homepage implementation uses an **Islands Architecture** pattern where static HTML is enhanced with interactive React components ("islands") that hydrate independently. This approach provides optimal performance with minimal JavaScript, ideal for Cloudflare Pages deployment.

## Architecture

### Static Foundation
The base page (`pages/index.html`) is static HTML with semantic markup, styled with CSS, and includes mount points for React islands.

### React Islands
Interactive components that hydrate on-demand:

1. **SearchScheduleSelector Island** (`#search-selector`)
   - Interactive day selector for schedule customization
   - URL parameter state management
   - Validation and error handling

2. **PopularListings Island** (`#popular-listings`)
   - Dynamic listing cards with data fetching
   - Loading and error states
   - Navigation to listing details

## Components

### Organisms
- **HeroSection**: Main hero area with value proposition
- **BenefitsSection**: Grid of value proposition cards
- **ScheduleTypeCards**: Weekend/Weeknight/Monthly schedule options
- **PopularListings**: Dynamic listings carousel
- **SupportSection**: Support options grid

### Molecules
- **ListingCard**: Individual listing display with image, location, bedrooms, price

## File Structure

```
app/split-lease/
├── components/
│   └── src/
│       ├── molecules/
│       │   └── ListingCard/
│       └── organisms/
│           ├── HeroSection/
│           ├── BenefitsSection/
│           ├── ScheduleTypeCards/
│           ├── PopularListings/
│           └── SupportSection/
├── islands/
│   ├── popular-listings.tsx    # Dynamic listings island
│   ├── schedule-selector.tsx   # Schedule selector island
│   └── index.ts                # Island exports
├── api/
│   └── listings.ts             # API client with Zod validation
├── pages/
│   ├── index.html              # Static homepage HTML
│   └── home/
│       ├── css/
│       │   └── home.css        # Homepage styles
│       ├── js/                 # Island bundles (generated)
│       └── images/             # Homepage assets
└── scripts/
    └── build-homepage.js       # Island build script
```

## Build Process

### Building Component Library
```bash
cd app/split-lease/components
npm run build
```
Outputs: `components/dist/split-lease-components.es.js`

### Building Homepage Islands
```bash
cd app/split-lease
npm run build:homepage
```
Outputs: `pages/home/js/popular-listings.js` and `pages/home/js/schedule-selector.js`

### Building Everything
```bash
cd app/split-lease
npm run build:all
```

## Island Hydration

Islands auto-hydrate when the DOM is ready:

```typescript
// Auto-mount pattern
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountIsland);
  } else {
    mountIsland();
  }
}
```

## State Management

### URL Parameters
Schedule selection state persists via URL parameters:
```
?days=1,2,3,4  // Monday-Thursday selected
```

### API Integration
- Runtime validation with Zod schemas
- Error handling with custom APIError class
- Timeout protection (10s default)
- Retry logic (future enhancement)

## Performance Optimizations

### Code Splitting
- Each island is a separate bundle
- Only loads what's needed for the current page
- React/ReactDOM externalized as globals

### Image Optimization
- Lazy loading with `loading="lazy"`
- Responsive images with srcset (future)
- WebP format with fallbacks (future)

### CSS Optimization
- CSS Modules for component scoping
- Styled-components for dynamic styling
- Critical CSS inlined (future)

## Testing Strategy

### Test Infrastructure
- **MSW** for API mocking
- **Faker.js** for test data generation
- **Jest-axe** for accessibility testing (ready)
- **Vitest** for unit tests
- **Playwright** for E2E tests

### Test Factories
Located in `tests/factories/homepage.ts`:
- `createMockListing()` - Generate realistic listing data
- `createStudioListing()` - 0-bedroom listing
- `createWeekendSchedule()` - Weekend day selection
- `createWeeknightSchedule()` - Weeknight day selection

## API Endpoints

### Popular Listings
```
GET /api/v1/listings/popular?limit=6
```

Response:
```json
{
  "success": true,
  "data": {
    "listings": [...]
  },
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```

### Search Listings
```
GET /api/v1/listings/search?days=1,2,3&limit=10
```

## Development Workflow

### Local Development
```bash
# Start dev server
cd app/split-lease
npm run dev

# Watch mode for tests
npm run test:watch

# Type checking
npm run type-check
```

### Building for Production
```bash
# Build islands
npm run build:homepage

# Build component library
npm --prefix components run build

# Build everything
npm run build:all
```

## Deployment

### Cloudflare Pages
1. Build command: `npm run build:all`
2. Output directory: `app/split-lease/pages`
3. Environment variables:
   - `VITE_API_URL` - API base URL

### Performance Budgets
- TTI < 3s
- FCP < 1.5s
- Bundle size < 250KB per entry point

### Caching Strategy
- Static assets: 1 year cache
- HTML: 5 minutes cache
- API responses: Edge caching

## Accessibility

- Semantic HTML structure
- ARIA attributes on interactive elements
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance (WCAG 2.1 AA)

## Future Enhancements

- [ ] E2E test suite (72 scenarios from spec)
- [ ] Performance monitoring (Web Vitals)
- [ ] Error tracking (Sentry integration)
- [ ] A/B testing framework
- [ ] Advanced filtering
- [ ] Real-time availability updates
- [ ] Progressive Web App features

## Architectural Principles

Following the **Ten Commandments of Architecture** from `architectural-bible.md`:

1. ✅ Self-documenting code with JSDoc
2. ✅ Single source of truth (components)
3. ⚠️  Test coverage (infrastructure ready)
4. ✅ Type safety with TypeScript strict mode
5. ✅ Immutability with const and immutable patterns
6. ✅ Separation of concerns (components/API/islands)
7. ✅ Error handling with APIError class
8. ✅ Configuration over hard-coding
9. ⚠️  Measurement (ready for implementation)
10. ✅ Intent-focused documentation

## Support

For questions or issues:
- Check the main project README
- Review architectural documentation in `Context/Architecture/`
- Consult the TDD guide for testing patterns
