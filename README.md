# Split Lease - Islands Architecture

A modern web application for periodic tenancy rentals using Islands Architecture - combining static HTML pages with interactive React component islands.

## Overview

Split Lease is a rental platform that enables users to rent properties for specific days of the week (e.g., weeknights, weekends, or custom schedules). The application uses an Islands Architecture pattern where static HTML pages are enhanced with interactive React components loaded as UMD bundles.

## Features

- 🏝️ **Islands Architecture**: Static HTML with React component islands
- 📅 **Interactive Schedule Selector**: Visual day-of-week picker with drag selection
- 🎨 **Styled Components**: Fully styled with styled-components and Framer Motion animations
- ⚡ **Fast Loading**: Minimal JavaScript, CDN-based React, progressive enhancement
- 📱 **Responsive Design**: Mobile-first design with responsive layouts
- 🔧 **UMD Bundle**: Components exposed as `window.SplitLeaseComponents`

## Prerequisites

- Node.js 18+
- Modern web browser (ES2020 support)

## Project Structure

```
app/split-lease/
├── components/              # React components library (UMD bundle)
│   ├── src/
│   │   └── SearchScheduleSelector/
│   │       ├── SearchScheduleSelector.tsx
│   │       ├── SearchScheduleSelector.styles.ts
│   │       ├── types.ts
│   │       └── index.ts
│   ├── dist/               # Built UMD bundle (generated)
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── pages/                  # Static HTML pages with islands
│   ├── index.html         # Home page
│   ├── home/
│   │   ├── css/
│   │   ├── images/
│   │   └── js/
│   ├── search/
│   │   ├── index.html     # Search page
│   │   ├── css/
│   │   └── js/
│   └── shared/
│       ├── images/
│       └── js/
│
└── __init_all__.patch     # Project documentation
```

## Setup and Installation

### 1. Install Component Dependencies

```bash
cd app/split-lease/components
npm install
```

### 2. Build Component Library

```bash
cd app/split-lease/components
npm run build
```

This generates:
- `dist/split-lease-components.umd.cjs` - UMD bundle
- `dist/style.css` - Component styles

### 3. View Pages

Open the HTML files in your browser:
- Home page: `pages/index.html`
- Search page: `pages/search/index.html`

No build step required for pages - they load React via CDN and include the UMD bundle.

## Component Development

### Building the Components Library

```bash
cd components
npm run build        # Build UMD bundle
npm run typecheck    # Type check without emitting
```

### Adding New Components

1. Create a new folder under `components/src/YourComponent/`
2. Add `YourComponent.tsx`, `YourComponent.styles.ts`, `types.ts`, and `index.ts`
3. Export the component from `components/src/index.ts`
4. Run `npm run build` in the `components/` directory
5. Use in pages via `window.SplitLeaseComponents.YourComponent`

Example component structure:
```typescript
// components/src/YourComponent/index.ts
export { YourComponent } from './YourComponent';
export type { YourComponentProps } from './types';
```

### Using Components in Pages

Components are mounted as islands using React's `createRoot`:

```html
<!-- Include React CDN -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- Include components bundle -->
<script src="../components/dist/split-lease-components.umd.cjs"></script>

<!-- Mount island -->
<div id="search-selector"></div>
<script>
  const { SearchScheduleSelector } = window.SplitLeaseComponents || {};
  if (SearchScheduleSelector) {
    ReactDOM.createRoot(document.getElementById('search-selector'))
      .render(React.createElement(SearchScheduleSelector, {
        minDays: 2,
        maxDays: 5,
        requireContiguous: true
      }));
  }
</script>
```

## SearchScheduleSelector Component

The main component for selecting weekly rental schedules.

### Props

```typescript
interface SearchScheduleSelectorProps {
  listing?: Listing;                    // Optional listing data
  onSelectionChange?: (selectedDays: Day[]) => void;  // Selection callback
  onError?: (error: string) => void;    // Error callback
  className?: string;                    // CSS class name
  minDays?: number;                      // Minimum nights (default: 2)
  maxDays?: number;                      // Maximum nights (default: 5)
  requireContiguous?: boolean;           // Require consecutive days (default: true)
  initialSelection?: number[];           // Initial selected day indices
}
```

### Features

- **Drag Selection**: Click and drag to select multiple days
- **Click Toggle**: Single click to toggle individual days
- **Validation**: Real-time validation with error messages
- **Contiguous Days**: Optional enforcement of consecutive day selection
- **Animations**: Smooth transitions using Framer Motion
- **Match Counts**: Shows exact and partial listing matches (placeholder)

## Architecture Pattern

### Islands Architecture Benefits

1. **Performance**: Only interactive parts load JavaScript
2. **SEO**: Static HTML content is immediately available
3. **Progressive Enhancement**: Works without JavaScript, enhanced with it
4. **Flexibility**: Mix static and dynamic content easily
5. **Simplicity**: No complex build process for pages

### How It Works

1. Static HTML pages define the structure and content
2. React components are built as a UMD bundle
3. Pages include React via CDN and the components bundle
4. Islands are mounted at specific DOM nodes using `ReactDOM.createRoot`
5. Components are fully isolated and self-contained

## Development Workflow

### For Component Changes

1. Edit component files in `components/src/`
2. Run `npm run build` in `components/`
3. Refresh the browser to see changes
4. Run `npm run typecheck` to verify TypeScript types

### For Page Changes

1. Edit HTML, CSS, or JS files in `pages/`
2. Refresh the browser (no build step needed)

## Technology Stack

- **React 18**: UI components with hooks
- **TypeScript**: Type-safe component development
- **Styled Components**: CSS-in-JS styling
- **Framer Motion**: Smooth animations and transitions
- **Vite**: Fast build tool for UMD bundle
- **Islands Architecture**: Performance-optimized page architecture

## Browser Support

- Modern browsers with ES2020 support
- React 18 compatible
- CSS Grid and Flexbox support required

## Pages Overview

### Home Page (`pages/index.html`)
- Hero section with schedule selector
- Value propositions
- Listing previews
- Call-to-action sections
- Footer and navigation

### Search Page (`pages/search/index.html`)
- Search filters sidebar
- Results grid placeholder
- Map preview placeholder

## Future Enhancements

- Additional interactive components (filters, map, listings grid)
- Server-side rendering for initial state
- API integration for real listing data
- User authentication islands
- Booking flow components