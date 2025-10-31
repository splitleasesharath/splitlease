# Islands Architecture

This directory contains React "island" mount scripts - JavaScript modules that hydrate React components into static HTML pages.

## What is Islands Architecture?

Islands Architecture is a pattern where interactive React components (islands) are embedded into otherwise static HTML pages. Each island is independently hydrated, resulting in:

- **Faster Initial Load**: Only interactive parts load React
- **Better Performance**: Reduced JavaScript payload
- **Progressive Enhancement**: Works without JavaScript
- **SEO-Friendly**: Static HTML is immediately available

## How It Works

1. **Static HTML Pages** in `pages/` directory
2. **React Islands** mounted via scripts in this directory
3. **Component Library** in `components/src/`

```
┌─────────────────────────────────────┐
│     Static HTML Page (pages/)      │
│  ┌─────────────┐  ┌─────────────┐  │
│  │   Island 1  │  │   Island 2  │  │
│  │   (React)   │  │   (React)   │  │
│  └─────────────┘  └─────────────┘  │
│         Static Content              │
└─────────────────────────────────────┘
```

## Creating an Island

### 1. Build the React Component

```tsx
// components/src/organisms/SearchWidget/SearchWidget.tsx
import React, { useState } from 'react';

export const SearchWidget = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);

  const handleSearch = () => {
    // Search logic
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={handleSearch}>Search</button>
    </div>
  );
};
```

### 2. Create the Island Mount Script

```tsx
// islands/search-widget.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SearchWidget } from '@components/organisms/SearchWidget';

// Find all mount points
const mountPoints = document.querySelectorAll('[data-island="search-widget"]');

// Hydrate each island
mountPoints.forEach((element) => {
  // Get props from data attributes
  const props = {
    initialQuery: element.getAttribute('data-initial-query') || '',
  };

  // Create root and render
  const root = createRoot(element);
  root.render(<SearchWidget {...props} />);
});
```

### 3. Add to HTML Page

```html
<!-- pages/search.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Search Listings</title>
</head>
<body>
  <h1>Find Your Perfect Split Lease</h1>

  <!-- Island mount point -->
  <div
    data-island="search-widget"
    data-initial-query="San Francisco"
  ></div>

  <!-- Static content -->
  <p>Browse thousands of listings...</p>

  <!-- Load island script -->
  <script type="module" src="/islands/search-widget.js"></script>
</body>
</html>
```

## Island Naming Convention

- **File**: `kebab-case.tsx` (e.g., `search-widget.tsx`)
- **Data Attribute**: `data-island="kebab-case"` (e.g., `data-island="search-widget"`)
- **Built Output**: `/dist/islands/kebab-case.js`

## Passing Props to Islands

Use data attributes to pass props:

```html
<div
  data-island="listing-card"
  data-listing-id="123"
  data-price="2500"
  data-featured="true"
></div>
```

```tsx
// islands/listing-card.tsx
const element = document.querySelector('[data-island="listing-card"]');
const props = {
  listingId: element.getAttribute('data-listing-id'),
  price: parseInt(element.getAttribute('data-price')),
  featured: element.getAttribute('data-featured') === 'true',
};
```

## Multiple Islands on One Page

You can have multiple different islands:

```html
<div data-island="search-widget"></div>

<!-- Other content -->

<div data-island="featured-listings"></div>

<!-- More content -->

<div data-island="newsletter-signup"></div>

<script type="module" src="/islands/search-widget.js"></script>
<script type="module" src="/islands/featured-listings.js"></script>
<script type="module" src="/islands/newsletter-signup.js"></script>
```

## Best Practices

### 1. Keep Islands Small
Islands should be focused, single-purpose components.

### 2. Lazy Load When Possible
Use dynamic imports for non-critical islands:

```tsx
// Load on interaction
button.addEventListener('click', async () => {
  const { BookingForm } = await import('@components/organisms/BookingForm');
  // Mount BookingForm
});
```

### 3. Handle Missing Elements
Always check if mount points exist:

```tsx
const mountPoints = document.querySelectorAll('[data-island="my-island"]');

if (mountPoints.length === 0) {
  console.warn('No mount points found for my-island');
}
```

### 4. Error Boundaries
Wrap islands in error boundaries:

```tsx
import { ErrorBoundary } from '@components/ErrorBoundary';

root.render(
  <ErrorBoundary>
    <SearchWidget {...props} />
  </ErrorBoundary>
);
```

## Testing Islands

Test islands as you would any React component:

```tsx
// islands/search-widget.test.tsx
import { render, screen } from '@testing-library/react';
import { SearchWidget } from '@components/organisms/SearchWidget';

describe('SearchWidget Island', () => {
  it('mounts with initial query', () => {
    render(<SearchWidget initialQuery="test" />);
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
  });
});
```

## Building Islands

Islands are built alongside components:

```bash
npm run build
```

Output:
```
dist/
├── islands/
│   ├── search-widget.js
│   ├── listing-card.js
│   └── booking-form.js
└── components/
    └── split-lease-components.es.js
```

## Performance Considerations

- **Code Splitting**: Each island is a separate bundle
- **Shared Dependencies**: React/ReactDOM should be shared
- **Lazy Loading**: Load islands on interaction when possible
- **Bundle Size**: Keep islands under 50KB gzipped

## Migration Strategy

Start with static HTML and add islands incrementally:

1. Build static HTML pages
2. Identify interactive sections
3. Convert to React islands
4. Add mount scripts
5. Test and optimize
