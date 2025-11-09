# Quick Start Guide - Footer Component

## Installation & Setup

### 1. Install Dependencies

```bash
cd footer-index
npm install
```

### 2. Build the Component

```bash
npm run build
```

## Using in Your Project

### Option 1: Local Installation

From your main project directory:

```bash
npm install ../footer-index
```

### Option 2: Direct Import (for development)

Copy the component files to your project:

```
your-project/
  src/
    components/
      Footer/
        Footer.tsx
        Footer.css
        index.ts
```

## Basic Implementation

### Step 1: Import the Component

```tsx
import Footer from '@splitlease/footer-index';
// or if copied locally:
import Footer from './components/Footer';
```

### Step 2: Add to Your App

```tsx
function App() {
  return (
    <div>
      <header>Your Header</header>
      <main>Your Content</main>
      <Footer />
    </div>
  );
}
```

### Step 3: Add Event Handlers (Optional)

```tsx
function App() {
  const handleReferral = async (method: 'text' | 'email', contact: string) => {
    // Send to your API
    await fetch('/api/referral', {
      method: 'POST',
      body: JSON.stringify({ method, contact })
    });
  };

  const handleImport = async (url: string, email: string) => {
    // Send to your API
    await fetch('/api/import', {
      method: 'POST',
      body: JSON.stringify({ url, email })
    });
  };

  return (
    <div>
      <main>Your Content</main>
      <Footer
        onReferralSubmit={handleReferral}
        onImportSubmit={handleImport}
      />
    </div>
  );
}
```

## Common Customizations

### Hide Optional Features

```tsx
<Footer
  showReferral={false}
  showImport={false}
/>
```

### Custom Branding

```tsx
<Footer
  copyrightText="© 2025 Your Company"
  footerNote="Made with love in Your City"
  termsUrl="/your-terms"
/>
```

### Custom Columns

```tsx
const myColumns = [
  {
    title: 'Support',
    links: [
      { text: 'Help Center', url: '/help' },
      { text: 'Contact Us', url: '/contact' }
    ]
  }
];

<Footer columns={myColumns} />
```

## Testing Locally

Use the example file to test:

```tsx
// example/App.tsx is provided with multiple examples
import App from './example/App';
```

## Next Steps

1. Read the full [README.md](./README.md) for all props and options
2. Check [example/App.tsx](./example/App.tsx) for implementation examples
3. Customize styles by overriding CSS classes
4. Integrate with your backend API for referral and import functionality

## Troubleshooting

### Styles not loading?
Make sure to import the component properly. The CSS is bundled with the component.

### TypeScript errors?
Ensure you have the correct type imports:
```tsx
import type { FooterProps, FooterColumn } from '@splitlease/footer-index';
```

### Need help?
Check the repository issues or create a new one at:
https://github.com/splitleasesharath/footer-index/issues
