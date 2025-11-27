# SPLIT LEASE ARCHITECTURE GUIDE
## Agent Instructions & Guardrails for Claude Code

## CORE ARCHITECTURE PRINCIPLES

**Stack Identity**: ESM-only monolithic architecture with React Islands, Vite build system, Cloudflare Pages deployment, Supabase PostgreSQL database.

**Execution Model**: Currently static HTML + client-side React hydration. Future evolution to server-side rendering with Cloudflare Workers, but all code must work in both modes.

**Module Philosophy**: Strict ES modules everywhere. No CommonJS, no UMD, no dual packages. All imports require explicit .js or .jsx extensions.

**Component Strategy**: React islands for interactive UI mounted to static HTML containers. Shared components create references through imports, never duplication. Build system handles code splitting automatically.

**Development Stage**: Early phase with 6 pages and 2 reusable components. Scaling to 30 pages and 30+ components. All architectural decisions must support this scale.

---

## PROJECT STRUCTURE

```
/
├── src/
│   ├── islands/                  # React components (JSX)
│   │   ├── shared/              # Reusable across pages
│   │   │   ├── Button.jsx
│   │   │   ├── FormInput.jsx
│   │   │   ├── DatePicker.jsx
│   │   │   └── Avatar.jsx
│   │   └── pages/               # Page-specific islands
│   │       ├── BookingForm.jsx
│   │       ├── SearchFilters.jsx
│   │       └── ProfilePage.jsx
│   ├── routes/                  # Future server routes (prepare structure now)
│   │   ├── index.js
│   │   ├── home.js
│   │   └── booking.js
│   ├── lib/                     # Shared utilities
│   │   ├── supabase.js         # Supabase client configuration
│   │   ├── constants.js
│   │   └── validators.js
│   └── styles/                  # CSS files
│       └── main.css
├── public/                      # Static assets (built output goes here)
│   ├── index.html
│   ├── booking.html
│   └── assets/                  # Images, fonts, etc.
├── dist/                        # Vite build output (gitignored)
├── vite.config.js              # Vite configuration
├── package.json                # Must include "type": "module"
└── .gitignore                  # Must ignore dist/ and node_modules/
```

---

## CRITICAL FILE CONFIGURATIONS

### package.json Requirements
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.38.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

### vite.config.js Structure
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // Add each HTML page as entry point
        main: './public/index.html',
        booking: './public/booking.html',
        profile: './public/profile.html'
        // Scale to 30 pages by adding entries here
      }
    }
  }
});
```

### .gitignore Requirements
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

---

## ESM MODULE RULES (STRICT)

**All imports must have explicit extensions:**
```javascript
// ✅ CORRECT
import { utils } from './lib/utils.js';
import Button from './islands/shared/Button.jsx';
import { createClient } from '@supabase/supabase-js';

// ❌ FORBIDDEN
import { utils } from './lib/utils';        // No extension
import Button from './islands/shared/Button'; // No extension
const express = require('express');          // No CommonJS
```

**Import ordering convention:**
1. External packages (node_modules)
2. Internal absolute paths (if configured)
3. Internal relative - components
4. Internal relative - utilities
5. Internal relative - same directory

**No default export barrels:**
```javascript
// ❌ FORBIDDEN
export { Button } from './Button.jsx';
export { FormInput } from './FormInput.jsx';

// ✅ CORRECT - Import directly from source
import Button from '../shared/Button.jsx';
```

---

## REACT ISLANDS PATTERN

### Current Implementation (Static HTML + Client Hydration)

**HTML Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Booking Page</title>
  <link rel="stylesheet" href="/src/styles/main.css">
</head>
<body>
  <header><h1>Book Your Stay</h1></header>
  
  <main>
    <!-- Island mount point -->
    <div id="booking-form"></div>
  </main>

  <!-- Island hydration script -->
  <script type="module">
    import { createRoot } from 'react-dom/client';
    import BookingForm from '/src/islands/pages/BookingForm.jsx';
    
    const root = document.getElementById('booking-form');
    const reactRoot = createRoot(root);
    reactRoot.render(<BookingForm propertyId="123" />);
  </script>
</body>
</html>
```

**Island Component Structure:**
```javascript
// src/islands/pages/BookingForm.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Button from '../shared/Button.jsx';
import DatePicker from '../shared/DatePicker.jsx';

export default function BookingForm({ property