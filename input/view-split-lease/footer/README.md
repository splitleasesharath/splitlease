# Footer Index Component

A reusable React footer component for Split Lease applications with referral and import functionality.

## Features

- **Multi-column layout** with customizable links
- **Referral system** with text/email options
- **Import listing** functionality
- **Fully responsive** design
- **TypeScript support**
- **Customizable** content and callbacks

## Installation

```bash
npm install @splitlease/footer-index
```

Or if using locally:

```bash
npm install ../footer-index
```

## Usage

### Basic Usage

```tsx
import React from 'react';
import Footer from '@splitlease/footer-index';

function App() {
  return (
    <div>
      {/* Your app content */}
      <Footer />
    </div>
  );
}

export default App;
```

### Custom Configuration

```tsx
import React from 'react';
import Footer from '@splitlease/footer-index';
import type { FooterColumn } from '@splitlease/footer-index';

function App() {
  const customColumns: FooterColumn[] = [
    {
      title: 'Resources',
      links: [
        { text: 'Documentation', url: '/docs' },
        { text: 'API Reference', url: '/api' },
        { text: 'Support', url: '/support' }
      ]
    },
    {
      title: 'Company',
      links: [
        { text: 'About Us', url: '/about' },
        { text: 'Careers', url: '/careers' },
        { text: 'Contact', url: '/contact' }
      ]
    }
  ];

  const handleReferralSubmit = async (method: 'text' | 'email', contact: string) => {
    console.log(`Referral via ${method}:`, contact);
    // Add your API call here
  };

  const handleImportSubmit = async (url: string, email: string) => {
    console.log('Import listing:', { url, email });
    // Add your API call here
  };

  return (
    <Footer
      columns={customColumns}
      showReferral={true}
      showImport={true}
      onReferralSubmit={handleReferralSubmit}
      onImportSubmit={handleImportSubmit}
      copyrightText="© 2025 Your Company"
      footerNote="Made with love in Your City"
      termsUrl="/terms"
    />
  );
}

export default App;
```

### Hide Optional Features

```tsx
import React from 'react';
import Footer from '@splitlease/footer-index';

function App() {
  return (
    <Footer
      showReferral={false}
      showImport={false}
    />
  );
}

export default App;
```

## Props

### `FooterProps`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `FooterColumn[]` | Default columns | Array of footer columns with links |
| `showReferral` | `boolean` | `true` | Show/hide referral section |
| `showImport` | `boolean` | `true` | Show/hide import listing section |
| `onReferralSubmit` | `(method: 'text' \| 'email', contact: string) => void` | `undefined` | Callback when referral is submitted |
| `onImportSubmit` | `(url: string, email: string) => void` | `undefined` | Callback when import is submitted |
| `copyrightText` | `string` | `'© 2025 SplitLease'` | Copyright text |
| `footerNote` | `string` | `'Made with love in New York City'` | Footer note text |
| `termsUrl` | `string` | `'https://app.split.lease/terms'` | Terms of use URL |

### `FooterColumn`

```typescript
interface FooterColumn {
  title: string;
  links: FooterLink[];
}
```

### `FooterLink`

```typescript
interface FooterLink {
  text: string;
  url: string;
}
```

## Styling

The component comes with default styles that match the Split Lease design system. The CSS is automatically imported when you use the component.

### Custom Styling

You can override styles by targeting these classes:

- `.main-footer` - Main footer container
- `.footer-container` - Footer grid container
- `.footer-column` - Individual footer column
- `.referral-input` - Referral input field
- `.import-input` - Import input field
- `.share-btn` - Share button
- `.import-btn` - Import button
- `.footer-bottom` - Bottom footer bar

Example:

```css
.main-footer {
  background: #your-color;
}

.footer-column a:hover {
  color: #your-hover-color;
}
```

## Default Columns

The component includes default columns for:

1. **For Hosts** - Property listing links
2. **For Guests** - Search and support links
3. **Company** - About and careers links
4. **Refer a friend** - Referral system (optional)
5. **Import listing** - Import functionality (optional)

## Responsive Design

The footer automatically adapts to mobile screens:
- Desktop: 5-column grid layout
- Mobile (≤768px): Single column layout with borders between sections

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Repository

[https://github.com/splitleasesharath/footer-index](https://github.com/splitleasesharath/footer-index)
