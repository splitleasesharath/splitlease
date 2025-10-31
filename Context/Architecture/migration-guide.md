# Split Lease: UMD to ESM + React Islands Migration Guide

## Executive Summary
This guide provides a systematic approach to migrate Split Lease from React UMD + HTML pages to a modern ESM + React Islands architecture, optimized for AI-agent development and maintaining clean, testable code.

## Phase 1: Project Structure Foundation (Days 1-3)

### Step 1.1: Initialize Modern Build System
```bash
# Create new project structure
mkdir -p app/split-lease-v2/{
  components,     # React component library
  islands,        # React island mount scripts
  pages,          # Static HTML pages
  shared,         # Shared assets and utilities
  tests,          # Test suites
  scripts,        # Build and deployment scripts
  docs            # Documentation
}

# Initialize package.json with ESM support
cd app/split-lease-v2
npm init -y
npm install --save-dev vite @vitejs/plugin-react typescript
npm install react react-dom
```

### Step 1.2: Configure Vite for ESM + Islands
Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        // Component library bundle
        components: resolve(__dirname, 'components/src/index.ts'),
        // Individual island entry points
        'islands/header': resolve(__dirname, 'islands/header.tsx'),
        'islands/footer': resolve(__dirname, 'islands/footer.tsx'),
        'islands/search-selector': resolve(__dirname, 'islands/search-selector.tsx'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        // Preserve folder structure for islands
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});
```

### Step 1.3: TypeScript Configuration for ESM
Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "paths": {
      "@components/*": ["./components/src/*"],
      "@islands/*": ["./islands/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["components/**/*", "islands/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Phase 2: Component Library Migration (Days 4-7)

### Step 2.1: Migrate Component Structure
Transform each component from UMD to ESM format:

**Before (UMD):**
```typescript
// components/src/Header/Header.tsx (old)
export const Header: React.FC<HeaderProps> = ({ ... }) => { ... };
export default Header;
```

**After (ESM):**
```typescript
// components/src/Header/Header.tsx (new)
import type { FC } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import styles from './Header.module.css';

export interface HeaderProps {
  logoSrc?: string;
  exploreHref?: string;
  className?: string;
}

export const Header: FC<HeaderProps> = ({ 
  logoSrc = '/assets/logo.png',
  exploreHref = '/search',
  className 
}) => {
  // Component logic here
};

// Named export only for tree-shaking
```

### Step 2.2: Implement CSS Modules
Convert CSS to CSS Modules for scoped styling:

```css
/* Header.module.css */
.mainHeader {
  position: fixed;
  top: 0;
  /* ... */
}

.navContainer {
  composes: container from '@shared/styles/layout.module.css';
  /* ... */
}
```

### Step 2.3: Create Component Index
```typescript
// components/src/index.ts
export { Header } from './Header/Header';
export { Footer } from './Footer/Footer';
export { SearchScheduleSelector } from './SearchScheduleSelector/SearchScheduleSelector';

export type { HeaderProps } from './Header/Header';
export type { FooterProps } from './Footer/Footer';
export type { SearchScheduleSelectorProps } from './SearchScheduleSelector/SearchScheduleSelector';
```

## Phase 3: React Islands Implementation (Days 8-10)

### Step 3.1: Create Island Mount Scripts
Each island becomes a self-contained ESM module:

```typescript
// islands/header.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Header } from '@components/Header/Header';

// Island initialization function
export function mountHeader(elementId: string, props?: Record<string, any>) {
  const container = document.getElementById(elementId);
  if (!container) {
    console.error(`Mount point #${elementId} not found`);
    return null;
  }

  // Parse data attributes for configuration
  const dataProps = Object.fromEntries(
    Array.from(container.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => [
        attr.name.replace(/^data-/, '').replace(/-./g, x => x[1].toUpperCase()),
        attr.value
      ])
  );

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Header {...dataProps} {...props} />
    </React.StrictMode>
  );

  return root;
}

// Auto-mount on DOMContentLoaded if element exists
if (typeof document !== 'undefined') {
  const init = () => {
    const headerElement = document.getElementById('site-header');
    if (headerElement && !headerElement.hasAttribute('data-manual-mount')) {
      mountHeader('site-header');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
```

### Step 3.2: HTML Page Structure with ESM
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Split Lease</title>
    
    <!-- Preload critical resources -->
    <link rel="preload" href="/dist/components.css" as="style">
    <link rel="preload" href="/dist/islands/header.js" as="script" crossorigin>
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="/dist/components.css">
    <link rel="stylesheet" href="/styles/page.css">
</head>
<body>
    <!-- React Island Mount Points -->
    <div id="site-header" 
         data-logo-src="/assets/logo.png"
         data-explore-href="/search"></div>

    <!-- Static content -->
    <main class="page-content">
        <!-- Your static HTML content -->
    </main>

    <!-- Search Selector Island -->
    <div id="search-selector"
         data-min-days="2"
         data-max-days="5"
         data-require-contiguous="true"></div>

    <!-- Footer Island -->
    <div id="site-footer"
         data-show-referral="true"
         data-show-import="true"></div>

    <!-- ESM Module Loading -->
    <script type="module">
        // Import islands as ES modules
        import { mountHeader } from '/dist/islands/header.js';
        import { mountFooter } from '/dist/islands/footer.js';
        import { mountSearchSelector } from '/dist/islands/search-selector.js';
        
        // Manual mounting with additional runtime props if needed
        document.addEventListener('DOMContentLoaded', () => {
            // Example: Add runtime configuration
            const userConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
            
            mountHeader('site-header', { 
                userLoggedIn: userConfig.isLoggedIn 
            });
            
            mountSearchSelector('search-selector', {
                onSelectionChange: (days) => {
                    console.log('Selected days:', days);
                    // Handle selection
                }
            });
        });
    </script>
</body>
</html>
```

## Phase 4: Data Layer Integration (Days 11-14)

### Step 4.1: Create Type-Safe Data Models
Map Bubble datatypes to TypeScript interfaces:

```typescript
// types/models.ts
export interface SplitLease {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  availableDays: number[]; // 1-7 mapping to days
  pricePerNight: number;
  location: Location;
  amenities: Amenity[];
  images: Image[];
  createdAt: Date;
  modifiedAt: Date;
}

export interface User {
  id: string;
  email: string;
  username: string;
  profile: UserProfile;
  preferences: UserPreferences;
}

// Create runtime validators
import { z } from 'zod';

export const SplitLeaseSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  title: z.string(),
  // ... rest of schema
});
```

### Step 4.2: API Client with Type Safety
```typescript
// api/client.ts
class SplitLeaseAPI {
  private baseURL: string;
  
  constructor(baseURL = 'https://app.split.lease/api/v1') {
    this.baseURL = baseURL;
  }

  async searchListings(params: SearchParams): Promise<SplitLease[]> {
    const response = await fetch(`${this.baseURL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    const data = await response.json();
    
    // Validate response data
    return data.results.map(item => 
      SplitLeaseSchema.parse(item)
    );
  }
  
  // Add other API methods
}

export const api = new SplitLeaseAPI();
```

## Phase 5: Testing Infrastructure (Days 15-17)

### Step 5.1: Component Testing with Vitest
```typescript
// tests/components/Header.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@components/Header/Header';

describe('Header Component', () => {
  it('renders with default props', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
  
  it('handles navigation correctly', () => {
    const { container } = render(<Header />);
    const navLink = screen.getByText('Sign In');
    
    fireEvent.click(navLink);
    // Assert navigation behavior
  });
  
  it('shows logged-in state correctly', () => {
    render(<Header userLoggedIn={true} username="testuser" />);
    expect(screen.getByText('Hello testuser')).toBeInTheDocument();
  });
});
```

### Step 5.2: E2E Testing with Playwright
```typescript
// tests/e2e/search-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test('should filter listings by schedule', async ({ page }) => {
    await page.goto('/search');
    
    // Wait for React islands to mount
    await page.waitForSelector('#search-selector');
    
    // Select weeknight schedule
    await page.click('[data-day="1"]'); // Monday
    await page.click('[data-day="2"]'); // Tuesday
    await page.click('[data-day="3"]'); // Wednesday
    
    // Verify URL updates
    await expect(page).toHaveURL(/schedule_days=1,2,3/);
    
    // Verify listings update
    const listings = await page.locator('.listing-card').count();
    expect(listings).toBeGreaterThan(0);
  });
});
```

## Phase 6: Build Pipeline & Deployment (Days 18-20)

### Step 6.1: Build Script Configuration
```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "npm run build:components && npm run build:islands && npm run build:pages",
    "build:components": "vite build --config vite.components.config.ts",
    "build:islands": "vite build --config vite.islands.config.ts", 
    "build:pages": "node scripts/build-pages.js",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "preview": "vite preview"
  }
}
```

### Step 6.2: Asset Optimization
```javascript
// scripts/build-pages.js
import { glob } from 'glob';
import { minify } from 'html-minifier-terser';
import { readFile, writeFile } from 'fs/promises';

async function buildPages() {
  const htmlFiles = await glob('pages/**/*.html');
  
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf-8');
    
    // Process HTML: inject hashes, optimize assets
    const processed = html
      .replace(/\/dist\/islands\/(.*?)\.js/g, (match, name) => {
        const hash = getFileHash(`dist/islands/${name}.js`);
        return `/dist/islands/${name}.${hash}.js`;
      });
    
    // Minify HTML
    const minified = await minify(processed, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true
    });
    
    await writeFile(`dist/${file}`, minified);
  }
}
```

## Phase 7: Migration Execution Checklist

### Week 1: Foundation
- [ ] Set up new project structure
- [ ] Configure build tools (Vite, TypeScript)
- [ ] Create component library scaffold
- [ ] Set up testing infrastructure

### Week 2: Component Migration  
- [ ] Migrate Header component to ESM
- [ ] Migrate Footer component to ESM
- [ ] Migrate SearchScheduleSelector to ESM
- [ ] Convert CSS to CSS Modules
- [ ] Create comprehensive component tests

### Week 3: Islands & Integration
- [ ] Implement island mount scripts
- [ ] Update HTML pages to use ESM imports
- [ ] Integrate with existing API endpoints
- [ ] Set up E2E test suite
- [ ] Performance optimization and testing

### Week 4: Deployment & Monitoring
- [ ] Set up CI/CD pipeline
- [ ] Configure production builds
- [ ] Deploy to staging environment
- [ ] Performance monitoring setup
- [ ] Gradual rollout to production

## Phase 8: AI Agent Integration Points

### Step 8.1: Command Context Files
Create structured context for AI agents:

```typescript
// .claude/commands/create_component.md
# Create React Component

## Variables
component_name: $1
component_type: $2 (page|island|shared)

## Instructions
1. Create component file at `components/src/${component_name}/${component_name}.tsx`
2. Create styles at `components/src/${component_name}/${component_name}.module.css`
3. Create test at `tests/components/${component_name}.test.tsx`
4. Export from `components/src/index.ts`
5. If island, create mount script at `islands/${component_name}.tsx`

## Template
Use ESM format with:
- Named exports only
- TypeScript interfaces for props
- CSS Modules for styling
- Comprehensive JSDoc comments
```

### Step 8.2: Workflow Automation
```typescript
// scripts/ai-workflow.ts
interface WorkflowStep {
  name: string;
  command: string;
  validation: () => Promise<boolean>;
  rollback?: () => Promise<void>;
}

class AIWorkflowRunner {
  async runWorkflow(steps: WorkflowStep[]) {
    const completed: WorkflowStep[] = [];
    
    for (const step of steps) {
      try {
        console.log(`Executing: ${step.name}`);
        await this.execute(step.command);
        
        const isValid = await step.validation();
        if (!isValid) {
          throw new Error(`Validation failed for ${step.name}`);
        }
        
        completed.push(step);
      } catch (error) {
        // Rollback completed steps
        for (const completedStep of completed.reverse()) {
          if (completedStep.rollback) {
            await completedStep.rollback();
          }
        }
        throw error;
      }
    }
  }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: React Islands Not Mounting
```javascript
// Debug helper
window.DEBUG_ISLANDS = true;

// In island mount script
if (window.DEBUG_ISLANDS) {
  console.log(`Mounting ${componentName} to #${elementId}`);
  console.log('Props:', props);
  console.log('Container:', container);
}
```

#### Issue 2: ESM Import Errors
- Ensure all imports use `.js` extension
- Check `type: "module"` in package.json
- Verify Vite is serving correct MIME type

#### Issue 3: CSS Module Conflicts
- Use unique class names
- Leverage CSS Module composition
- Implement CSS reset at global level

## Performance Optimization Checklist

- [ ] Implement code splitting for islands
- [ ] Use dynamic imports for heavy components
- [ ] Enable Vite's CSS code splitting
- [ ] Implement resource hints (preload, prefetch)
- [ ] Use React.lazy for conditional components
- [ ] Optimize bundle sizes with tree shaking
- [ ] Implement service worker for offline support
- [ ] Use CDN for static assets
- [ ] Enable HTTP/2 push for critical resources
- [ ] Implement proper caching headers

## Success Metrics

Track these KPIs during and after migration:

1. **Performance Metrics:**
   - Time to Interactive (TTI) < 3s
   - First Contentful Paint (FCP) < 1.5s
   - Core Web Vitals all in "Good" range

2. **Development Metrics:**
   - Test coverage > 80%
   - Build time < 30s
   - Zero TypeScript errors
   - All E2E tests passing

3. **Business Metrics:**
   - No increase in bounce rate
   - Maintain or improve conversion rates
   - Reduced infrastructure costs
   - Improved developer velocity

## Conclusion

This migration guide provides a systematic approach to modernizing Split Lease's frontend architecture. The ESM + React Islands pattern offers:

- Better performance through code splitting
- Improved developer experience with modern tooling
- Type safety throughout the application
- AI-agent friendly architecture
- Maintainable and testable codebase

Follow the phases sequentially, validate each step with tests, and maintain backward compatibility during the transition period.
