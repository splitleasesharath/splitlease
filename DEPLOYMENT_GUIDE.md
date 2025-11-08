# Split Lease - Complete Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Option A: Netlify Deployment (Recommended)](#option-a-netlify-deployment-recommended)
4. [Option B: Vercel Deployment](#option-b-vercel-deployment)
5. [Option C: React Router Migration](#option-c-react-router-migration-advanced)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Current Architecture
- **Framework**: React 18 + Vite 5
- **Pattern**: ESM + React Islands (Multi-Page App)
- **Backend**: Supabase PostgreSQL
- **External Services**: Bubble.io (auth/messaging), Google Maps API

### Deployment Goals
- `split.lease/` → Home page
- `split.lease/search?borough=manhattan&days=1,2,3` → Search with filters
- `split.lease/view-split-lease/12345` → Dynamic listing detail pages

### Current Status
✅ Build system configured (Vite)
✅ ViewSplitLeasePage has URL parsing
⚠️ SearchPage needs URL parameter support
⚠️ Missing deployment configuration files

---

## Pre-Deployment Checklist

### 1. Verify Build Process

```bash
cd "C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\app"

# Install dependencies (if not done)
npm install

# Test development server
npm run dev
# Opens: http://localhost:5173/

# Build production version
npm run build
# Output: app/dist/
```

**Expected build output:**
```
dist/
├── index.html
├── search.html
├── view-split-lease.html
├── public/assets/
└── assets/
    ├── main-[hash].js
    ├── search-[hash].js
    └── viewSplitLease-[hash].js
```

### 2. Environment Variables

Create `.env` file in `app/` directory:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Important**: Never commit `.env` to git. Use `.env.example` for template.

### 3. Add SearchPage URL Parameter Support

**File**: `app/src/islands/pages/SearchPage.jsx`

Add this utility function near the top of the component:

```javascript
// Add after imports, before the main component
const loadFiltersFromUrl = () => {
  const params = new URLSearchParams(window.location.search);

  return {
    borough: params.get('borough') || '',
    neighborhoods: params.get('neighborhoods')?.split(',').filter(Boolean) || [],
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    listingType: params.get('listingType') || '',
    sortBy: params.get('sort') || 'recommended',
    days: params.get('days')?.split(',').map(Number).filter(d => !isNaN(d)) || []
  };
};

// Inside SearchPage component, use it in useEffect:
useEffect(() => {
  const urlFilters = loadFiltersFromUrl();

  // Apply filters to state
  if (urlFilters.borough) setBorough(urlFilters.borough);
  if (urlFilters.neighborhoods.length > 0) setNeighborhoods(urlFilters.neighborhoods);
  if (urlFilters.minPrice) setMinPrice(urlFilters.minPrice);
  if (urlFilters.maxPrice) setMaxPrice(urlFilters.maxPrice);
  if (urlFilters.listingType) setListingType(urlFilters.listingType);
  if (urlFilters.sortBy) setSortBy(urlFilters.sortBy);
  if (urlFilters.days.length > 0) setSelectedDays(urlFilters.days);
}, []);
```

---

## Option A: Netlify Deployment (Recommended)

**Time**: 2-3 hours | **Difficulty**: Easy | **Cost**: Free tier available

### Why Netlify?
- Simple drag-and-drop deployment
- Automatic HTTPS
- Built-in form handling
- Excellent free tier
- Great redirect/rewrite support

### Step 1: Create Routing Configuration

Create `app/public/_redirects` file:

```bash
# Netlify redirects configuration
# Handles dynamic paths for Single Page App behavior

# Listing detail pages - rewrite to view-split-lease.html
/view-split-lease/*  /view-split-lease.html  200

# Search page with any query parameters
/search  /search.html  200
/search/*  /search.html  200

# Home page (catch-all)
/*  /index.html  200
```

**Why this works:**
- When user visits `split.lease/view-split-lease/12345`, Netlify serves `view-split-lease.html`
- React component reads `window.location.pathname` to extract `12345`
- The `200` status code means "rewrite" (not redirect), so URL stays clean

### Step 2: Update Build Configuration

Ensure `vite.config.js` copies `_redirects` to dist:

**File**: `app/vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        search: resolve(__dirname, 'public/search.html'),
        viewSplitLease: resolve(__dirname, 'public/view-split-lease.html')
      }
    }
  }
});
```

**Note**: Vite automatically copies `public/_redirects` to `dist/_redirects` during build.

### Step 3: Build for Production

```bash
cd app
npm run build

# Verify _redirects was copied
ls dist/_redirects  # Should exist
```

### Step 4: Deploy to Netlify

#### Option 4A: Netlify CLI (Recommended)

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
cd app
netlify init

# Follow prompts:
# - Create & configure new site? Yes
# - Team: Your team
# - Site name: split-lease (or your preferred name)
# - Build command: npm run build
# - Publish directory: dist

# Deploy
netlify deploy --prod
```

#### Option 4B: Netlify Web UI (Drag & Drop)

1. Go to https://app.netlify.com/
2. Sign up / Login
3. Click "Sites" → "Add new site" → "Deploy manually"
4. Drag `app/dist/` folder into the upload area
5. Wait for deployment (usually 30-60 seconds)

### Step 5: Configure Environment Variables

1. Go to Site Settings → Build & deploy → Environment
2. Add variables:
   - `VITE_SUPABASE_URL` = `your-supabase-url`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
3. Click "Save"
4. Trigger new deployment: Deploys → Trigger deploy → Deploy site

### Step 6: Connect Custom Domain

1. Go to Domain settings → Add custom domain
2. Enter: `split.lease`
3. Follow DNS configuration instructions:

**For GoDaddy/Namecheap/other DNS providers:**

Add these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 75.2.60.5 | 3600 |
| CNAME | www | your-site.netlify.app | 3600 |

4. Wait for DNS propagation (5 minutes - 48 hours, usually ~1 hour)
5. Netlify will automatically provision SSL certificate

### Step 7: Test Deployment

```bash
# Test all routes
curl https://split.lease/
curl https://split.lease/search?borough=manhattan
curl https://split.lease/view-split-lease/1751256334113x168754253854834940

# Or open in browser:
# - https://split.lease/
# - https://split.lease/search?borough=brooklyn&days=1,2,3
# - https://split.lease/view-split-lease/1751256334113x168754253854834940
```

---

## Option B: Vercel Deployment

**Time**: 2-3 hours | **Difficulty**: Easy | **Cost**: Free tier available

### Why Vercel?
- Created by Next.js team (Vite-friendly)
- Instant deployments
- Excellent performance
- Great analytics

### Step 1: Create Routing Configuration

Create `app/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/view-split-lease/:id",
      "destination": "/view-split-lease.html"
    },
    {
      "source": "/search",
      "destination": "/search.html"
    },
    {
      "source": "/",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Step 2: Build for Production

```bash
cd app
npm run build

# Verify vercel.json exists
ls vercel.json  # Should exist in app/ directory
```

### Step 3: Deploy to Vercel

#### Option 3A: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from app directory
cd app
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your username
# - Link to existing project? No
# - Project name? split-lease
# - In which directory is your code located? ./
# - Want to override settings? No

# Deploy to production
vercel --prod
```

#### Option 3B: Vercel GitHub Integration

1. Push code to GitHub repository
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Vite
   - Root Directory: `app`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables (see below)
6. Click "Deploy"

### Step 4: Configure Environment Variables

**Via Vercel CLI:**
```bash
vercel env add VITE_SUPABASE_URL
# Paste your Supabase URL
# Select: Production, Preview, Development

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your anon key
# Select: Production, Preview, Development
```

**Via Vercel Web UI:**
1. Go to Project Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Select environments: Production, Preview, Development
4. Save and redeploy

### Step 5: Connect Custom Domain

1. Go to Project Settings → Domains
2. Add domain: `split.lease`
3. Configure DNS:

**A Records:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**CNAME Record:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

4. Wait for SSL provisioning (~5 minutes)

---

## Option C: React Router Migration (Advanced)

**Time**: 4-5 hours | **Difficulty**: Moderate | **When to use**: If you need client-side navigation, protected routes, or complex routing logic

### Pros & Cons

**Pros:**
- Single JavaScript bundle (smaller total size)
- Client-side navigation (no page reloads)
- Easier to add auth guards
- Better for complex routing logic

**Cons:**
- Requires code refactoring
- Slightly larger initial load
- More complex error handling
- Need to handle 404s differently

### Step 1: Install Dependencies

```bash
cd app
npm install react-router-dom
```

### Step 2: Create App Root Component

Create `app/src/App.jsx`:

```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './islands/pages/HomePage.jsx';
import SearchPage from './islands/pages/SearchPage.jsx';
import ViewSplitLeasePage from './islands/pages/ViewSplitLeasePage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/view-split-lease/:listingId" element={<ViewSplitLeasePage />} />

        {/* 404 redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 3: Update ViewSplitLeasePage

**File**: `app/src/islands/pages/ViewSplitLeasePage.jsx`

```javascript
import { useParams } from 'react-router-dom';

export default function ViewSplitLeasePage() {
  const { listingId } = useParams(); // Get from React Router instead of URL parsing

  useEffect(() => {
    if (!listingId) {
      setError('No listing ID provided');
      setLoading(false);
      return;
    }

    loadListing(listingId);
  }, [listingId]);

  // Remove getListingIdFromUrl() function - no longer needed

  // ... rest of component
}
```

### Step 4: Update Entry Point

**File**: `app/src/main.jsx`

```javascript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/main.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### Step 5: Update HTML Entry

**File**: `app/public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Split Lease - Share Rent by Day</title>
  <link rel="icon" href="/assets/images/favicon.ico">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

### Step 6: Update Vite Config

**File**: `app/vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: resolve(__dirname, 'public/index.html') // Single entry point
    }
  }
});
```

### Step 7: Add Navigation Links

Update components to use React Router's `Link`:

```javascript
import { Link } from 'react-router-dom';

// Instead of <a href="/search">
<Link to="/search">Browse Listings</Link>

// Instead of <a href={`/view-split-lease/${listing._id}`}>
<Link to={`/view-split-lease/${listing._id}`}>View Details</Link>
```

### Step 8: Update Netlify/Vercel Config

**Netlify `_redirects`:**
```
/* /index.html 200
```

**Vercel `vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Step 9: Build and Deploy

```bash
npm run build
netlify deploy --prod  # or vercel --prod
```

---

## Post-Deployment

### 1. Verify All Routes

Test these URLs in your browser:

- ✅ `https://split.lease/` → Home page loads
- ✅ `https://split.lease/search` → Search page loads
- ✅ `https://split.lease/search?borough=manhattan&days=1,2,3` → Filters applied
- ✅ `https://split.lease/view-split-lease/1751256334113x168754253854834940` → Listing loads

### 2. Test Core Functionality

**Home Page:**
- [ ] Day selector works
- [ ] "Find Your Split" button navigates to search
- [ ] Auth modals open (Welcome → Login → Signup)
- [ ] Featured listings display

**Search Page:**
- [ ] Listings load from Supabase
- [ ] Filters work (borough, neighborhood, price)
- [ ] Day selector filters results
- [ ] Clicking listing navigates to detail page
- [ ] Google Maps displays markers
- [ ] URL parameters update when filters change

**Listing Detail Page:**
- [ ] Images load in gallery
- [ ] Property details display
- [ ] Pricing calculator works
- [ ] "Contact Host" modal opens
- [ ] Google Maps shows location
- [ ] Amenities/rules display

### 3. Performance Optimization

**Enable Compression:**

Netlify (automatic)
Vercel (automatic)

**Check Lighthouse Score:**
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://split.lease --view
```

**Target Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

### 4. Setup Monitoring

**Netlify Analytics:**
1. Go to Site → Analytics
2. Enable (free tier: 250k pageviews/month)

**Vercel Analytics:**
1. Go to Project → Analytics
2. Enable (free tier included)

**Sentry Error Tracking (Optional):**
```bash
npm install @sentry/react @sentry/vite-plugin
```

### 5. Configure Supabase Security

**Row Level Security (RLS):**

```sql
-- Enable RLS on tables
ALTER TABLE listing ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photo ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public listings are viewable by everyone"
  ON listing FOR SELECT
  USING (true);

CREATE POLICY "Public photos are viewable by everyone"
  ON listing_photo FOR SELECT
  USING (true);
```

### 6. Setup Continuous Deployment

**Netlify + GitHub:**
1. Go to Site settings → Build & deploy → Continuous deployment
2. Link GitHub repository
3. Set build settings:
   - Base directory: `app`
   - Build command: `npm run build`
   - Publish directory: `app/dist`
4. Enable automatic deploys

**Vercel + GitHub:**
1. Already set up if you used GitHub integration
2. Every push to `main` branch auto-deploys
3. Pull requests create preview deployments

---

## Troubleshooting

### Issue 1: Blank Page on Deployment

**Symptoms:** Site loads but shows white screen

**Causes:**
- Missing environment variables
- Console errors (check browser DevTools)
- Asset path issues

**Fixes:**
```bash
# Check build output
npm run build
npm run preview  # Test locally at http://localhost:4173

# Verify environment variables are set in hosting platform
netlify env:list
# or
vercel env ls

# Check browser console for errors
# Open DevTools → Console
```

### Issue 2: 404 on View Listing Page

**Symptoms:** `split.lease/view-split-lease/12345` returns 404

**Cause:** Missing redirect configuration

**Fix:**

**Netlify:**
Ensure `dist/_redirects` exists:
```bash
cat app/dist/_redirects
# Should show:
# /view-split-lease/* /view-split-lease.html 200
```

**Vercel:**
Ensure `vercel.json` exists in deployment:
```bash
cat app/vercel.json
```

### Issue 3: Supabase Connection Fails

**Symptoms:** "Failed to load listings" errors

**Causes:**
- Incorrect Supabase credentials
- CORS issues
- RLS policies blocking access

**Fixes:**

1. **Verify credentials:**
```javascript
// In browser console
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);
// Should show actual values, not 'undefined'
```

2. **Check CORS in Supabase:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add site URL: `https://split.lease`

3. **Verify RLS policies:**
```sql
-- In Supabase SQL Editor
SELECT * FROM listing LIMIT 1;
-- Should return data (if not, RLS policy is blocking)
```

### Issue 4: Search Filters Don't Work

**Symptoms:** URL has `?borough=manhattan` but filters don't apply

**Cause:** SearchPage not reading URL parameters

**Fix:**
Add URL parameter parsing (see Pre-Deployment Checklist → Step 3)

### Issue 5: Images Not Loading

**Symptoms:** Broken image icons

**Causes:**
- Incorrect asset paths
- Vite not copying public assets

**Fixes:**

1. **Check Vite config:**
```javascript
// vite.config.js
export default defineConfig({
  publicDir: 'public', // ← Must be set
  // ...
});
```

2. **Verify build output:**
```bash
ls app/dist/public/assets/images/
# Should contain logo.svg, etc.
```

3. **Use absolute paths:**
```javascript
// ✅ Correct
<img src="/assets/images/logo.svg" />

// ❌ Wrong
<img src="./assets/images/logo.svg" />
```

### Issue 6: Google Maps Not Loading

**Symptoms:** Map container is blank

**Causes:**
- API key restrictions
- Missing API key
- CORS/referer restrictions

**Fixes:**

1. **Verify API key in console:**
```javascript
console.log(GOOGLE_MAPS_API_KEY);
```

2. **Update Google Cloud Console:**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Edit API key
   - HTTP referrers → Add: `split.lease/*`, `*.split.lease/*`
   - Save

3. **Check browser console for Google Maps errors**

### Issue 7: Slow Initial Load

**Symptoms:** Site takes 5+ seconds to load

**Causes:**
- Large JavaScript bundles
- Unoptimized images
- Too many external requests

**Fixes:**

1. **Code splitting:**
```javascript
// Use dynamic imports for heavy components
const SearchPage = lazy(() => import('./islands/pages/SearchPage.jsx'));
```

2. **Optimize images:**
```bash
# Install imagemin
npm install imagemin imagemin-webp --save-dev

# Convert images to WebP
```

3. **Analyze bundle:**
```bash
npm install rollup-plugin-visualizer --save-dev
```

Add to `vite.config.js`:
```javascript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true })
  ]
});
```

---

## Quick Reference

### Common Commands

```bash
# Development
cd app
npm install
npm run dev

# Build
npm run build
npm run preview

# Deploy
netlify deploy --prod
# or
vercel --prod

# Environment Variables
netlify env:set VAR_NAME value
vercel env add VAR_NAME

# Check deployment status
netlify status
vercel inspect <deployment-url>
```

### File Locations

| File | Path |
|------|------|
| **Package.json** | `app/package.json` |
| **Vite Config** | `app/vite.config.js` |
| **Environment** | `app/.env` |
| **Netlify Config** | `app/public/_redirects` |
| **Vercel Config** | `app/vercel.json` |
| **Build Output** | `app/dist/` |
| **Home Page** | `app/src/islands/pages/HomePage.jsx` |
| **Search Page** | `app/src/islands/pages/SearchPage.jsx` |
| **Listing Page** | `app/src/islands/pages/ViewSplitLeasePage.jsx` |

### Support Resources

- **Netlify Docs**: https://docs.netlify.com/
- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev/
- **React Router**: https://reactrouter.com/
- **Supabase Docs**: https://supabase.com/docs

---

## Next Steps

After successful deployment:

1. **Setup Analytics** (Netlify Analytics / Vercel Analytics)
2. **Configure SEO** (meta tags, sitemap, robots.txt)
3. **Add Sentry** (error tracking)
4. **Setup CI/CD** (automated testing + deployment)
5. **Performance monitoring** (Web Vitals, Lighthouse CI)
6. **Security audit** (SSL, CSP headers, dependency scanning)

---

**You're ready to deploy!** 🚀

Choose your deployment path:
- **Quick & Easy**: Option A (Netlify with server rewrites)
- **Modern Stack**: Option B (Vercel)
- **Future-Proof**: Option C (React Router migration)

For most cases, **Option A (Netlify)** is the recommended starting point.
