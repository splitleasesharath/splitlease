# Header Component

A fully accessible, performant navigation header built with ESM + React Islands architecture. Implements WCAG 2.1 AA compliance, keyboard navigation, and responsive design.

## Features

- **Accessibility First**: Full WCAG 2.1 AA compliance with proper ARIA attributes and keyboard navigation
- **Responsive Design**: Optimized layouts for desktop, tablet, and mobile devices
- **Performance Optimized**: React.memo, stable callbacks, CSS Modules for efficient rendering
- **Islands Architecture**: Easy to mount in vanilla HTML with auto-mount capability
- **TypeScript**: Full type safety with comprehensive JSDoc documentation
- **Tested**: 87%+ test coverage with unit, integration, and accessibility tests

## Installation

```bash
npm install @split-lease/components
```

## Basic Usage

### As a React Component

```tsx
import { Header } from '@split-lease/components';

function App() {
  return (
    <Header
      logoSrc="/assets/logo.png"
      exploreHref="/search"
      className="my-header"
    />
  );
}
```

### As an Island (Vanilla HTML)

#### Auto-Mount

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Site</title>
    <link rel="stylesheet" href="/dist/split-lease-components.css">
</head>
<body>
    <!-- Option 1: Using data-component attribute -->
    <div
        data-component="header"
        data-logo-src="/logo.png"
        data-explore-href="/search"
    ></div>

    <!-- Option 2: Using common ID -->
    <div id="site-header"
         data-logo-src="/logo.png"></div>

    <script type="module">
        import '/dist/islands/header.js';
        // Auto-mounts on DOMContentLoaded
    </script>
</body>
</html>
```

#### Manual Mount

```html
<div id="custom-header"></div>

<script type="module">
    import { mountHeader } from '/dist/islands/header.js';

    const root = mountHeader('custom-header', {
        logoSrc: '/custom-logo.png',
        exploreHref: '/custom-search',
        className: 'custom-class'
    });

    // Later, for cleanup:
    // root.unmount();
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `logoSrc` | `string` | `'shared/images/logo.png'` | URL for the logo image |
| `exploreHref` | `string` | `'search/index.html'` | URL for the explore/search functionality |
| `className` | `string` | `''` | Additional CSS class names |

## Data Attributes (Islands)

When using as an island, props can be specified via data attributes:

- `data-logo-src` → `logoSrc`
- `data-explore-href` → `exploreHref`
- `data-class-name` → `className`
- `data-manual-mount="true"` → Prevents auto-mounting

## Keyboard Navigation

The Header component supports full keyboard navigation:

- **Tab**: Move between interactive elements
- **Enter** / **Space**: Open/close dropdown menus
- **ArrowDown**: Navigate to next dropdown item (or open and focus first item)
- **ArrowUp**: Navigate to previous dropdown item
- **Escape**: Close dropdown and return focus to trigger

## Accessibility Features

- **ARIA Attributes**: Proper `aria-expanded`, `aria-haspopup`, `role` attributes
- **Screen Reader Support**: Descriptive labels and state announcements
- **Keyboard Navigation**: Full functionality without mouse
- **Focus Management**: Logical tab order and visible focus indicators
- **Semantic HTML**: `<header>`, `<nav>`, proper landmark roles

## Styling

The component uses CSS Modules for scoped styling. To customize:

### CSS Custom Properties

The Header exposes CSS custom properties you can override:

```css
.Header__mainHeader {
  --header-bg-color: #your-color;
  --header-text-color: #your-color;
  --dropdown-bg: #your-color;
  --button-bg: #your-color;
  /* etc... */
}
```

### Custom Classes

Pass a `className` prop to add your own classes:

```tsx
<Header className="my-custom-header" />
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- iOS Safari: Latest 2 versions
- Android Chrome: Latest 2 versions

## Performance

- **Bundle Size**: < 50KB (gzipped with dependencies)
- **Initial Render**: < 16ms (60 FPS)
- **Tree-Shakeable**: ESM format for optimal bundling
- **Memoized**: Prevents unnecessary re-renders

## Migration from Legacy Header

If you're upgrading from the old Header component:

1. **CSS**: Old Header used global CSS. New Header uses CSS Modules. The styles are automatically scoped.

2. **Props**: The props interface remains the same - no breaking changes.

3. **Class Names**: Internal class names have changed (now scoped). If you were targeting them with CSS, update your selectors.

4. **Imports**: Change from:
   ```js
   import Header from './Header';
   ```
   To:
   ```js
   import { Header } from '@split-lease/components';
   ```

## Examples

### With Custom Logo and Explore Link

```tsx
<Header
  logoSrc="https://cdn.example.com/logo.png"
  exploreHref="https://example.com/listings"
/>
```

### In an Island with Data Attributes

```html
<div
  id="site-header"
  data-component="header"
  data-logo-src="/assets/brand/logo.svg"
  data-explore-href="/search/properties"
  data-class-name="sticky-header"
></div>
```

### Multiple Instances

```html
<!-- Mobile Header -->
<div data-component="header"
     data-logo-src="/mobile-logo.png"
     class="mobile-only"></div>

<!-- Desktop Header -->
<div data-component="header"
     data-logo-src="/desktop-logo.png"
     class="desktop-only"></div>

<script type="module">
    import '/dist/islands/header.js';
</script>
```

## Troubleshooting

### Header doesn't mount as an island

1. Check the browser console for errors
2. Ensure the island script is loaded: `import '/dist/islands/header.js'`
3. Verify the mount point exists: `<div id="site-header"></div>`
4. Check data attributes are correctly formatted (kebab-case)

### Styles not loading

1. Ensure CSS file is linked: `<link rel="stylesheet" href="/dist/split-lease-components.css">`
2. Check for CSS conflicts with existing styles
3. Use browser DevTools to inspect applied styles

### TypeScript errors

1. Ensure `@split-lease/components` is installed
2. Check TypeScript version (>= 5.0 required)
3. Verify imports: `import { Header, HeaderProps } from '@split-lease/components'`

## API Reference

### `mountHeader(elementId, runtimeProps?): Root | null`

Manually mount a Header component as an island.

**Parameters:**
- `elementId` (string): The ID of the DOM element to mount into
- `runtimeProps` (HeaderProps, optional): Props to pass to the component

**Returns:** React Root instance for cleanup, or null if mount fails

**Example:**
```js
const root = mountHeader('my-header', { logoSrc: '/logo.png' });
```

### `Header` Component

React functional component for rendering the navigation header.

**Type:** `React.FC<HeaderProps>`

**Example:**
```tsx
import { Header } from '@split-lease/components';

<Header logoSrc="/logo.png" exploreHref="/search" />
```

## Contributing

When contributing to the Header component:

1. **Tests**: Maintain > 90% coverage
2. **Accessibility**: Run `npm run test` to check jest-axe violations
3. **Performance**: Render time must be < 16ms
4. **Documentation**: Update this README for any API changes

## License

MIT

## Support

For issues or questions:
- GitHub Issues: https://github.com/splitlease/tac/issues
- Email: support@split.lease

---

**Version:** 0.1.0
**Last Updated:** 2025-10-31
