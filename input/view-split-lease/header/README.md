# Split Lease Header Component

A reusable, standalone header component extracted from the Split Lease index lite page. This component includes all the functionality and visual styling needed for the Split Lease navigation header.

## Features

- **Responsive Design**: Adapts seamlessly from desktop to mobile screens
- **Dropdown Menus**: Interactive "Host with Us" and "Stay with Us" dropdown navigation
- **Mobile Menu**: Hamburger menu for mobile devices (optional)
- **Authentication Integration**: Sign In/Sign Up links that redirect to Split Lease auth page
- **Keyboard Accessible**: Full keyboard navigation support
- **Customizable**: CSS variables for easy theming
- **Zero Dependencies**: Pure HTML, CSS, and vanilla JavaScript

## Quick Start

### 1. Include the Component Files

Add these three files to your project:
- `header.html` - The header markup
- `header.css` - Component styles
- `header.js` - Interactive functionality

### 2. Basic Usage

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Page</title>

    <!-- Include header styles -->
    <link rel="stylesheet" href="header.css">

    <!-- Optional: Include fonts for better appearance -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Include header HTML -->
    <!-- Copy content from header.html here -->

    <!-- Your page content -->
    <main style="margin-top: 72px;">
        <!-- Add margin-top to account for fixed header -->
        <h1>Your Content Here</h1>
    </main>

    <!-- Include header script -->
    <script src="header.js"></script>
</body>
</html>
```

### 3. Add Your Logo

Replace the logo image source in `header.html`:

```html
<img src="your-logo-path.png" alt="Split Lease" class="logo-image">
```

## Customization

### CSS Variables

Customize the header appearance by overriding CSS variables:

```css
:root {
    --header-bg-color: #31135D;        /* Header background color */
    --header-text-color: white;         /* Text color */
    --button-bg: rgb(255, 255, 255);   /* Explore Rentals button background */
    --button-text: rgb(109, 35, 207);  /* Button text color */
    --dropdown-bg: white;               /* Dropdown menu background */
    --dropdown-text: #1a1a1a;          /* Dropdown text color */
}
```

### Component Options

**Disable Mobile Menu:**
The hamburger menu is already hidden by default. The component uses a simplified mobile navigation.

**Change Links:**
Edit the `href` attributes in `header.html` to point to your desired URLs.

**Modify Dropdown Items:**
Add, remove, or modify dropdown menu items in the `.dropdown-menu` sections of `header.html`.

## Component Structure

### Header Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  [Host ▼]  [Guest ▼]  [Explore] [Sign In|Sign Up] │
└─────────────────────────────────────────────────────────┘
```

### Dropdown Menus

Both "Host with Us" and "Stay with Us" dropdowns feature:
- Hover to open/close
- Click to toggle
- Keyboard navigation (Tab, Arrow keys, Enter)
- Touch-friendly on mobile

### Mobile View

On screens < 768px:
- Logo text hidden (logo image only)
- Simplified text ("Host" instead of "Host with Us")
- Explore Rentals button hidden
- Compact layout

## JavaScript API

### Functions

```javascript
// Initialize the header (called automatically on page load)
initSplitLeaseHeader()

// Toggle mobile menu
toggleMobileMenu()

// Open authentication modal (redirects to Split Lease)
openAuthModal()

// Setup dropdown menus
setupDropdownMenus()
```

### Events

The component automatically handles:
- Click events on dropdowns
- Hover states
- Keyboard navigation
- Mobile menu toggle
- Smooth scrolling for anchor links

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Styling Notes

### Fixed Header

The header is fixed to the top of the page. Add margin/padding to your content:

```css
body {
    padding-top: 72px; /* Height of header */
}

/* Or on your main content */
main {
    margin-top: 72px;
}
```

### Z-Index

The header uses `z-index: 9999` to stay above other content. Adjust if needed:

```css
.main-header {
    z-index: 1000; /* Your preferred value */
}
```

## Integration Examples

### Static HTML Site

Simply copy `header.html` content into your page and include the CSS and JS files.

### React/Vue/Angular

You can adapt the component for frameworks:

```jsx
// React Example
import './header.css';
import { useEffect } from 'react';

function Header() {
    useEffect(() => {
        // Initialize header functionality
        if (window.initSplitLeaseHeader) {
            window.initSplitLeaseHeader();
        }
    }, []);

    return (
        // Paste header.html content here as JSX
    );
}
```

### WordPress

Add to your theme's `header.php`:

```php
<link rel="stylesheet" href="<?php echo get_template_directory_uri(); ?>/header.css">

<!-- Header HTML here -->

<script src="<?php echo get_template_directory_uri(); ?>/header.js"></script>
```

## Files Included

- `header.html` - Component markup (96 lines)
- `header.css` - Styles and responsive design (370 lines)
- `header.js` - Interactive functionality (120 lines)
- `demo.html` - Working example/demo page
- `README.md` - This documentation

## License

This component is part of the Split Lease project. Contact Split Lease for usage terms.

## Support

For issues or questions:
- GitHub: https://github.com/splitleasesharath/index-header
- Original Repository: https://github.com/splitleasesharath/index_lite

## Changelog

### v1.0.0 (2025-10-14)
- Initial extraction from index_lite repository
- Full dropdown menu functionality
- Responsive mobile design
- Keyboard accessibility
- CSS variables for customization
