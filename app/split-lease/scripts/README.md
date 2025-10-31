# Build Scripts

Automation scripts for building, deploying, and managing the SplitLease application.

## Available Scripts

### build.js
Orchestrates the complete build process for the application.

**Usage:**
```bash
npm run build
# or
node scripts/build.js
```

**What it does:**
1. Cleans previous build artifacts
2. Type-checks TypeScript
3. Builds component library
4. Builds island mount scripts
5. Processes static pages
6. Generates bundle size report

### deploy.js
Deployment script for staging and production environments.

**Usage:**
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Build Process

### 1. Clean
Removes previous build artifacts:
```
dist/
coverage/
.cache/
```

### 2. Type Check
Runs TypeScript compiler in check mode:
```bash
tsc --noEmit
```

### 3. Build Components
Builds the component library with Vite:
```bash
cd components && npm run build
```

Output:
```
components/dist/
├── split-lease-components.es.js
├── split-lease-components.umd.js
└── split-lease-components.d.ts
```

### 4. Build Islands
Builds individual island bundles:
```
dist/islands/
├── search-widget.js
├── listing-card.js
└── booking-form.js
```

### 5. Process Pages
Copies static HTML pages and assets:
```
dist/pages/
├── index.html
├── search.html
└── shared/
    ├── css/
    └── images/
```

### 6. Bundle Analysis
Generates bundle size report:
```
Bundle Size Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Component Library    45.2 KB (gzip)
Search Widget        12.8 KB (gzip)
Listing Card          8.4 KB (gzip)
Booking Form         18.7 KB (gzip)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total                85.1 KB (gzip)
```

## Development Scripts

### Start Dev Server
```bash
npm run dev
```

Starts Vite dev server on `http://localhost:5173`

### Watch Mode
```bash
npm run dev:watch
```

Watches for file changes and rebuilds automatically.

## Testing Scripts

### Run Unit Tests
```bash
npm run test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Run E2E Tests
```bash
npm run test:e2e
```

## Quality Scripts

### Type Check
```bash
npm run type-check
```

Runs TypeScript compiler without emitting files.

### Lint
```bash
npm run lint
```

Runs ESLint on all TypeScript files.

### Format
```bash
npm run format
```

Formats code with Prettier.

### Format Check
```bash
npm run format:check
```

Checks if code is formatted correctly (useful for CI).

## CI/CD Scripts

### CI Build
```bash
npm run ci:build
```

Full build with strict checks for CI environment:
- Type checking
- Linting
- Testing with coverage
- Production build

### Pre-commit
```bash
npm run pre-commit
```

Runs before each commit:
- Format check
- Lint
- Type check
- Quick tests

## Custom Build Options

### Environment Variables

Control build behavior with environment variables:

```bash
# Build for production
NODE_ENV=production npm run build

# Build with source maps
VITE_SOURCEMAP=true npm run build

# Skip type checking (faster builds)
SKIP_TYPE_CHECK=true npm run build

# Build specific islands only
BUILD_ISLANDS="search-widget,listing-card" npm run build
```

### Build Targets

```bash
# Build for modern browsers only
TARGET=modern npm run build

# Build for legacy browser support
TARGET=legacy npm run build
```

## Troubleshooting

### Build Fails with Type Errors

```bash
# Run type check to see errors
npm run type-check

# Fix errors, then rebuild
npm run build
```

### Out of Memory Error

```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Stale Cache Issues

```bash
# Clear all caches
rm -rf node_modules/.vite
rm -rf dist
npm run build
```

### Slow Builds

```bash
# Skip non-essential checks in development
SKIP_TYPE_CHECK=true npm run build

# Or use watch mode for incremental builds
npm run dev:watch
```

## Creating New Scripts

Add scripts to `package.json`:

```json
{
  "scripts": {
    "my-script": "node scripts/my-script.js"
  }
}
```

Create the script file:

```javascript
// scripts/my-script.js
#!/usr/bin/env node

console.log('Running my script...');

// Your script logic here

process.exit(0);
```

Make it executable:

```bash
chmod +x scripts/my-script.js
```

## Best Practices

1. **Always type-check before building**
   ```bash
   npm run type-check && npm run build
   ```

2. **Run tests before deploying**
   ```bash
   npm run test && npm run deploy
   ```

3. **Check bundle sizes**
   ```bash
   npm run build
   # Review bundle size report
   ```

4. **Use environment-specific configs**
   ```bash
   # .env.development
   VITE_API_BASE_URL=http://localhost:3000

   # .env.production
   VITE_API_BASE_URL=https://api.splitlease.com
   ```

5. **Monitor build times**
   ```bash
   time npm run build
   ```
