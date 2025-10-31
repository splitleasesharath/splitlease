# SplitLease Marketplace Application

A modern marketplace application for renting properties on specific days of the week. Built with Islands Architecture, React components, and static HTML pages for optimal performance and SEO.

## Overview

SplitLease allows property owners to list their properties for rent on specific schedules (weeknights, weekends, or custom days), and guests to search and book properties based on their needs. This is a complete rebuild of the original Bubble-based SplitLease app using modern web development practices.

## Architecture

This project follows the **Islands Architecture** pattern:

- **Static HTML Pages**: Fast-loading, SEO-friendly pages
- **React Component Islands**: Interactive components mounted into specific DOM nodes
- **ESM Modules**: Modern JavaScript module system for optimal tree-shaking
- **Type-Safe API Layer**: Fully typed API client with runtime validation using Zod
- **Comprehensive Testing**: Unit, integration, and E2E tests

## Project Structure

```
app/split-lease/
├── api/                    # API client layer
│   ├── client.ts          # Main API client class
│   ├── config.ts          # API configuration
│   ├── interceptors.ts    # Request/response interceptors
│   ├── types.ts           # API-specific types
│   └── index.ts           # API exports
├── components/            # React component library
│   ├── src/
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── SearchScheduleSelector/
│   │   ├── ListingImageGrid/
│   │   ├── ProposalMenu/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── islands/               # Island mount points
│   ├── header.tsx
│   ├── footer.tsx
│   ├── search-selector.tsx
│   ├── listing-image-grid.tsx
│   ├── proposal-menu.tsx
│   └── index.ts
├── pages/                 # Static HTML pages
│   ├── index.html         # Home page
│   ├── search/            # Search/listings page
│   ├── view-split-lease/  # Listing detail page
│   └── shared/            # Shared assets
│       ├── css/
│       │   ├── variables.css
│       │   ├── reset.css
│       │   └── global.css
│       └── js/
│           ├── utils.js
│           └── mount-islands.js
├── types/                 # TypeScript type definitions
│   ├── models.ts          # Domain models with Zod schemas
│   ├── api.ts             # API types
│   ├── components.ts      # Component prop types
│   ├── utils.ts           # Utility types
│   └── index.ts           # Type exports
├── utils/                 # Utility functions
│   ├── constants.ts       # Application constants
│   ├── date.ts            # Date utilities
│   ├── currency.ts        # Currency utilities
│   ├── validation.ts      # Validation functions
│   ├── storage.ts         # Storage helpers
│   ├── analytics.ts       # Analytics tracking
│   ├── logger.ts          # Logging utilities
│   └── index.ts           # Utility exports
├── tests/                 # Test infrastructure
│   ├── setup.ts           # Test setup
│   ├── helpers.ts         # Test helpers
│   ├── factories.ts       # Test data factories
│   ├── mocks/             # MSW mock handlers
│   ├── components/        # Component tests
│   ├── integration/       # Integration tests
│   └── e2e/               # E2E tests with Playwright
├── scripts/               # Build and development scripts
│   ├── build-components.js
│   ├── build-pages.js
│   ├── dev.js
│   ├── deploy.js
│   └── validate.js
├── .eslintrc.json        # ESLint configuration
├── .prettierrc           # Prettier configuration
├── .gitignore            # Git ignore patterns
├── tsconfig.json         # TypeScript configuration
├── package.json          # Root package configuration
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. Install dependencies:

```bash
cd app/split-lease
npm install
```

2. Install component library dependencies:

```bash
cd components
npm install
cd ..
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building

Build the entire application:

```bash
npm run build
```

This will:
1. Build the component library
2. Process and optimize HTML pages
3. Output to the `dist/` directory

Build components only:

```bash
npm run build:components
```

Build pages only:

```bash
npm run build:pages
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the entire application
- `npm run build:components` - Build component library
- `npm run build:pages` - Build static pages
- `npm test` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run lint` - Lint code
- `npm run lint:fix` - Lint and fix code
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking
- `npm run validate` - Run all validation checks
- `npm run deploy` - Deploy to production

## Development Guidelines

### Adding a New Component

1. Create component in `components/src/ComponentName/`
2. Export from `components/src/index.ts`
3. Create island mount point in `islands/component-name.tsx`
4. Export from `islands/index.ts`
5. Add mount logic in `pages/shared/js/mount-islands.js`

### Adding a New Page

1. Create HTML file in `pages/your-page/index.html`
2. Add island mount points with data attributes
3. Link shared CSS files
4. Include mount-islands.js script

### Working with Types

All types are defined in the `types/` directory with Zod schemas for runtime validation:

```typescript
import { ListingSchema, type Listing } from '@/types';

// Validate data at runtime
const listing = ListingSchema.parse(apiData);
```

### API Client Usage

```typescript
import { apiClient } from '@/api';

// Search listings
const response = await apiClient.searchListings({
  page: 1,
  pageSize: 20,
  filters: { location: 'New York' }
});

// Get listing by ID
const listing = await apiClient.getListingById('listing-id');
```

### Using Utilities

```typescript
import { formatCurrency, formatDate, isValidEmail } from '@/utils';

const price = formatCurrency(150.50); // "$150.50"
const date = formatDate(new Date()); // "Jan 01, 2025"
const valid = isValidEmail('test@example.com'); // true
```

## Testing

### Unit Tests

Run with Vitest:

```bash
cd components
npm test
```

### Integration Tests

Place in `tests/integration/` and run with:

```bash
npm test
```

### E2E Tests

Run with Playwright:

```bash
npm run test:e2e
```

## Code Quality

### Linting

ESLint is configured for TypeScript and React:

```bash
npm run lint
```

### Formatting

Prettier is configured for consistent code formatting:

```bash
npm run format
```

### Type Checking

TypeScript is used throughout the project:

```bash
npm run typecheck
```

### Pre-commit Validation

Run all checks before committing:

```bash
npm run validate
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Deployment

Run the deployment script:

```bash
npm run deploy
```

This will:
1. Clean previous builds
2. Run validation checks
3. Run tests
4. Build components and pages
5. Deploy to configured target

Configure your deployment target in `scripts/deploy.js`.

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run validate` to ensure code quality
4. Submit a pull request

## License

Proprietary - SplitLease Team

## Additional Resources

- [Islands Architecture](https://jasonformat.com/islands-architecture/)
- [React Documentation](https://react.dev/)
- [Zod Documentation](https://zod.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

## Support

For questions or issues, contact the SplitLease development team.

---

**Built with ❤️ by the SplitLease Team**
