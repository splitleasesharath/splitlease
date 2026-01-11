# Implementation Plan: Environment-Based Supabase Project Routing

## Overview

This plan implements automatic environment detection at build time to route the frontend application to different Supabase projects based on the deployment target. Production deployments (main branch) will connect to `splitlease-backend-live`, while development/feature branch deployments will connect to `splitlease-backend-dev`.

## Success Criteria

- [ ] Production builds (main branch) use `splitlease-backend-live` project credentials
- [ ] Development/preview builds (non-main branches) use `splitlease-backend-dev` project credentials
- [ ] Environment detection occurs at build time (compile-time substitution)
- [ ] Local development can target either project via configuration
- [ ] Cloudflare Pages deployment correctly injects environment-appropriate variables
- [ ] No hardcoded credentials in source code (all values from environment variables)
- [ ] Existing functionality remains unchanged

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/.env` | Local development environment variables | Replace hardcoded live credentials with development credentials as default |
| `app/.env.example` | Environment variable template | Update with both project configurations |
| `app/.env.production` | NEW: Production environment file | Create with live project credentials |
| `app/.env.development` | NEW: Development environment file | Create with dev project credentials |
| `app/vite.config.js` | Vite build configuration | No changes needed - Vite handles .env files automatically |
| `app/src/lib/supabase.js` | Supabase client initialization | No changes needed - already uses import.meta.env |
| `app/src/lib/config.js` | Configuration bridge for inline scripts | Add environment name for debugging |
| `.pages.toml` | Cloudflare Pages configuration | Document environment variable setup |

### Supabase Project Details

| Environment | Project Name | Project ID | URL |
|-------------|--------------|------------|-----|
| Production | splitlease-backend-live | qcfifybkaddcoimjroca | https://qcfifybkaddcoimjroca.supabase.co |
| Development | splitlease-backend-dev | qzsmhgyojmwvtjmnrdea | https://qzsmhgyojmwvtjmnrdea.supabase.co |

### Related Documentation

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html) - How Vite handles .env files
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables) - Setting env vars in CF Pages

### Existing Patterns

- **Vite Environment Variable Pattern**: All client-side env vars prefixed with `VITE_` and accessed via `import.meta.env.VITE_*`
- **Build-time Substitution**: Vite replaces `import.meta.env.*` references at build time with actual values
- **Configuration Bridge**: `app/src/lib/config.js` exposes env vars to `window.ENV` for inline scripts

## Implementation Steps

### Step 1: Create Environment-Specific .env Files

**Files:** `app/.env.development`, `app/.env.production`
**Purpose:** Define environment-specific Supabase credentials that Vite will load based on build mode

**Details:**
- Create `app/.env.development` with splitlease-backend-dev credentials
- Create `app/.env.production` with splitlease-backend-live credentials
- Vite automatically loads `.env.development` for `vite dev` and `.env.production` for `vite build`

**app/.env.development** (create new file):
```bash
# Development Environment Configuration
# Supabase: splitlease-backend-dev (qzsmhgyojmwvtjmnrdea)
VITE_SUPABASE_URL=https://qzsmhgyojmwvtjmnrdea.supabase.co
VITE_SUPABASE_ANON_KEY=<dev-anon-key-placeholder>

# Google Maps (shared across environments)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCFcO3jCTvR69iA4UAxPi-sWHJ7zWPMJWo

# Hotjar (shared across environments)
VITE_HOTJAR_SITE_ID=6581463

# Environment identifier for debugging
VITE_ENVIRONMENT=development
```

**app/.env.production** (create new file):
```bash
# Production Environment Configuration
# Supabase: splitlease-backend-live (qcfifybkaddcoimjroca)
VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZmlmeWJrYWRkY29pbWpyb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NzU0MDUsImV4cCI6MjA3NTA1MTQwNX0.glGwHxds0PzVLF1Y8VBGX0jYz3zrLsgE9KAWWwkYms8

# Google Maps (shared across environments)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCFcO3jCTvR69iA4UAxPi-sWHJ7zWPMJWo

# Hotjar (shared across environments)
VITE_HOTJAR_SITE_ID=6581463

# Environment identifier for debugging
VITE_ENVIRONMENT=production
```

**Validation:** Run `bun run dev` and confirm console shows development environment

### Step 2: Update Base .env File

**Files:** `app/.env`
**Purpose:** The base .env file serves as fallback and local development default

**Details:**
- Remove hardcoded live credentials
- Default to development project for safety
- Add clear documentation

**app/.env** (update existing):
```bash
# Split Lease - Local Development Configuration
# ============================================================================
# This file is the BASE configuration. Environment-specific overrides:
# - .env.development: Loaded during `bun run dev` (development server)
# - .env.production: Loaded during `bun run build` (production build)
#
# For local development, this file is loaded first, then merged with
# .env.development. Values in .env.development take precedence.
# ============================================================================

# Supabase Configuration (DEFAULT: Development Project)
# These are overridden by .env.development or .env.production
VITE_SUPABASE_URL=https://qzsmhgyojmwvtjmnrdea.supabase.co
VITE_SUPABASE_ANON_KEY=<dev-anon-key-placeholder>

# Google Maps Configuration
# Get your API key from https://console.cloud.google.com/google/maps-apis
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCFcO3jCTvR69iA4UAxPi-sWHJ7zWPMJWo

# Hotjar Configuration
VITE_HOTJAR_SITE_ID=6581463

# Environment identifier
VITE_ENVIRONMENT=development

# ============================================================================
# REMOVED: VITE_BUBBLE_API_KEY (Migrated to Supabase Edge Functions)
# ============================================================================
# The Bubble API key is now stored server-side in Supabase Secrets.
# Client code no longer needs direct access to Bubble APIs.
# All Bubble workflows are proxied through Edge Functions.
# ============================================================================
```

**Validation:** Environment variables load correctly in development mode

### Step 3: Update .env.example Template

**Files:** `app/.env.example`
**Purpose:** Document both environment configurations for new developers

**Details:**
- Add sections for both development and production
- Include placeholders for sensitive values
- Document the environment selection mechanism

**app/.env.example** (update existing):
```bash
# Split Lease Environment Configuration
# ============================================================================
# ENVIRONMENT SELECTION:
# - Development (bun run dev): Uses .env.development
# - Production (bun run build): Uses .env.production
# - Cloudflare Pages: Environment variables set in dashboard
#
# SUPABASE PROJECTS:
# - Development: splitlease-backend-dev (qzsmhgyojmwvtjmnrdea)
# - Production: splitlease-backend-live (qcfifybkaddcoimjroca)
# ============================================================================

# Supabase Configuration
# Get these values from your Supabase project settings at https://supabase.com
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Maps Configuration
# Get your API key from https://console.cloud.google.com/google/maps-apis
# Enable Maps JavaScript API and Places API for your project
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Hotjar Configuration
VITE_HOTJAR_SITE_ID=your-hotjar-site-id

# Environment Identifier (for debugging)
VITE_ENVIRONMENT=development

# ============================================================================
# CLOUDFLARE PAGES DEPLOYMENT
# ============================================================================
# Set environment variables in Cloudflare Pages dashboard:
# 1. Go to Pages project > Settings > Environment variables
# 2. Add variables for Production and Preview environments separately
#
# PRODUCTION (main branch):
#   VITE_SUPABASE_URL = https://qcfifybkaddcoimjroca.supabase.co
#   VITE_SUPABASE_ANON_KEY = <live-anon-key>
#   VITE_ENVIRONMENT = production
#
# PREVIEW (all other branches):
#   VITE_SUPABASE_URL = https://qzsmhgyojmwvtjmnrdea.supabase.co
#   VITE_SUPABASE_ANON_KEY = <dev-anon-key>
#   VITE_ENVIRONMENT = preview
# ============================================================================

# ============================================================================
# REMOVED: Bubble API Configuration (Migrated to Supabase Edge Functions)
# ============================================================================
# All Bubble API calls now route through Supabase Edge Functions:
# - bubble-proxy: Handles data workflows (listings, photos, referrals)
# - auth-user: Handles authentication (native Supabase Auth)
#
# API keys are stored server-side in Supabase Secrets for security.
# To configure Edge Functions secrets:
# npx supabase secrets set BUBBLE_API_KEY="your-key-here"
# ============================================================================
```

**Validation:** Template is clear and comprehensive

### Step 4: Update .gitignore for Environment Files

**Files:** `app/.gitignore`
**Purpose:** Ensure sensitive environment files are not committed while allowing examples

**Details:**
- Add `.env.production` to gitignore (contains live credentials)
- Keep `.env.example` tracked
- Consider `.env.development` handling (may contain dev credentials)

**Add to app/.gitignore:**
```gitignore
# Environment files with sensitive data
.env
.env.local
.env.production
.env.production.local
.env.development.local

# Keep .env.example tracked for documentation
# .env.development can be tracked if it only contains dev credentials
```

**Validation:** `git status` shows .env.production is ignored

### Step 5: Update Configuration Bridge

**Files:** `app/src/lib/config.js`
**Purpose:** Expose environment identifier for debugging

**Details:**
- Add VITE_ENVIRONMENT to window.ENV
- Improve environment detection logging
- Add Supabase project identifier for clarity

**app/src/lib/config.js** (update existing):
```javascript
/**
 * Configuration Bridge for Inline Scripts
 *
 * Exposes Vite environment variables to window.ENV so they can be accessed
 * by inline <script> tags in HTML files where import.meta.env is not available.
 */

// Expose environment variables to global window object
window.ENV = {
  // Google Maps
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,

  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Hotjar
  HOTJAR_SITE_ID: import.meta.env.VITE_HOTJAR_SITE_ID,

  // Environment identifier (from VITE_ENVIRONMENT or auto-detected)
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || (function() {
    if (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '') {
      return 'development';
    }

    if (window.location.hostname.includes('staging') ||
        window.location.hostname.includes('test') ||
        window.location.hostname.includes('preview')) {
      return 'staging';
    }

    return 'production';
  })(),

  // Supabase project identifier (extracted from URL for debugging)
  SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'unknown'
};

// Log configuration loaded (useful for debugging)
console.log('Environment configuration loaded');
console.log('  Environment:', window.ENV.ENVIRONMENT);
console.log('  Supabase Project:', window.ENV.SUPABASE_PROJECT_ID);
console.log('  Supabase URL:', window.ENV.SUPABASE_URL || 'NOT SET');
console.log('  Google Maps API Key:', window.ENV.GOOGLE_MAPS_API_KEY ?
  window.ENV.GOOGLE_MAPS_API_KEY.substring(0, 20) + '...' : 'NOT SET');

// Dispatch event to notify that config is ready
window.dispatchEvent(new Event('env-config-loaded'));
```

**Validation:** Console logs show correct project ID for each environment

### Step 6: Document Cloudflare Pages Configuration

**Files:** `.pages.toml`, `.claude/Documentation/CLOUDFLARE_PAGES_ENV_CONFIG.md`
**Purpose:** Document how to configure environment variables in Cloudflare Pages

**Details:**
- Update .pages.toml comments with environment variable instructions
- Create documentation for Cloudflare Pages setup

**.pages.toml** (update existing):
```toml
# Cloudflare Pages configuration
# Dashboard settings take precedence over this file
# Current dashboard settings (as of 2025-11-14):
# - Root directory: app
# - Build command: npm run build
# - Build output: dist
# - Build watch paths: **/*
#
# ============================================================================
# ENVIRONMENT VARIABLES (Set in Cloudflare Pages Dashboard)
# ============================================================================
# Go to: Pages project > Settings > Environment variables
#
# PRODUCTION ENVIRONMENT (main branch):
#   VITE_SUPABASE_URL = https://qcfifybkaddcoimjroca.supabase.co
#   VITE_SUPABASE_ANON_KEY = <live-anon-key>
#   VITE_GOOGLE_MAPS_API_KEY = <google-maps-key>
#   VITE_HOTJAR_SITE_ID = 6581463
#   VITE_ENVIRONMENT = production
#
# PREVIEW ENVIRONMENT (all other branches):
#   VITE_SUPABASE_URL = https://qzsmhgyojmwvtjmnrdea.supabase.co
#   VITE_SUPABASE_ANON_KEY = <dev-anon-key>
#   VITE_GOOGLE_MAPS_API_KEY = <google-maps-key>
#   VITE_HOTJAR_SITE_ID = 6581463
#   VITE_ENVIRONMENT = preview
#
# Note: Vite requires the VITE_ prefix for client-side variables.
# Variables without the prefix are only available during build.
# ============================================================================

[build]
command = "npm run build"
cwd = "app"
publish = "dist"

[build.environment]
NODE_VERSION = "20"
```

**Validation:** Documentation is clear and actionable

### Step 7: Create Cloudflare Pages Environment Documentation

**Files:** `.claude/Documentation/CLOUDFLARE_PAGES_ENV_CONFIG.md` (NEW)
**Purpose:** Comprehensive guide for setting up Cloudflare Pages environment variables

**Content:**
```markdown
# Cloudflare Pages Environment Configuration

## Overview

Split Lease uses environment-based Supabase project routing to separate production and development/preview environments. This document explains how to configure Cloudflare Pages to inject the correct environment variables at build time.

## Supabase Projects

| Environment | Project Name | Project ID | Use Case |
|-------------|--------------|------------|----------|
| Production | splitlease-backend-live | qcfifybkaddcoimjroca | Main branch deployments |
| Development | splitlease-backend-dev | qzsmhgyojmwvtjmnrdea | Preview/feature branch deployments |

## Cloudflare Pages Setup

### Step 1: Access Environment Variables

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account and the `splitlease` Pages project
3. Navigate to **Settings** > **Environment variables**

### Step 2: Configure Production Variables

Under **Production** environment, add:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://qcfifybkaddcoimjroca.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<live-anon-key>` |
| `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyCFcO3jCTvR69iA4UAxPi-sWHJ7zWPMJWo` |
| `VITE_HOTJAR_SITE_ID` | `6581463` |
| `VITE_ENVIRONMENT` | `production` |

### Step 3: Configure Preview Variables

Under **Preview** environment, add:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://qzsmhgyojmwvtjmnrdea.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<dev-anon-key>` |
| `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyCFcO3jCTvR69iA4UAxPi-sWHJ7zWPMJWo` |
| `VITE_HOTJAR_SITE_ID` | `6581463` |
| `VITE_ENVIRONMENT` | `preview` |

### Step 4: Deploy and Verify

1. Push a commit to trigger a build
2. Check build logs for environment variable substitution
3. Visit the deployed site and check browser console for:
   ```
   Environment configuration loaded
     Environment: production (or preview)
     Supabase Project: qcfifybkaddcoimjroca (or qzsmhgyojmwvtjmnrdea)
   ```

## How It Works

1. **Build Time**: Cloudflare Pages injects environment variables before running `npm run build`
2. **Vite Processing**: Vite replaces `import.meta.env.VITE_*` references with actual values
3. **Runtime**: The built JavaScript contains hardcoded values (no runtime environment switching)

## Troubleshooting

### Variables Not Being Substituted

- Ensure variable names start with `VITE_` (required for client-side access)
- Check build logs for any errors during variable substitution
- Verify variables are set for the correct environment (Production vs Preview)

### Wrong Project Connected

- Check browser console for `Supabase Project:` log
- Verify the URL matches expected project ID
- Redeploy if environment variables were recently changed

## Security Considerations

- Anon keys are safe to expose (they have RLS restrictions)
- Never expose service role keys in frontend code
- Google Maps API keys should have domain restrictions configured

## Local Development

For local development, Vite loads environment files in this order:
1. `.env` (base configuration)
2. `.env.development` (dev mode) or `.env.production` (build mode)
3. `.env.local` (local overrides, gitignored)

To test with production project locally:
```bash
VITE_SUPABASE_URL=https://qcfifybkaddcoimjroca.supabase.co bun run dev
```
```

**Validation:** Documentation covers all necessary setup steps

## Edge Cases & Error Handling

| Edge Case | Handling |
|-----------|----------|
| Missing environment variables | Supabase client throws error with clear message |
| Wrong anon key for project | API calls fail with 401; check console for project ID |
| Local development targeting wrong project | Override via CLI or .env.local |
| Build without env vars | Vite build fails with undefined substitution |

## Testing Considerations

### Local Testing

1. **Test Development Mode:**
   ```bash
   cd app && bun run dev
   # Check console: Should show qzsmhgyojmwvtjmnrdea
   ```

2. **Test Production Build:**
   ```bash
   cd app && bun run build && bun run preview
   # Check console: Should show qcfifybkaddcoimjroca
   ```

3. **Test Environment Override:**
   ```bash
   VITE_SUPABASE_URL=https://qzsmhgyojmwvtjmnrdea.supabase.co bun run build
   # Should use dev project even in production build
   ```

### Cloudflare Deployment Testing

1. **Production (main branch):**
   - Deploy to main branch
   - Visit https://splitlease.pages.dev
   - Verify console shows production project ID

2. **Preview (feature branch):**
   - Create feature branch and push
   - Visit preview URL (e.g., https://feature-xyz.splitlease.pages.dev)
   - Verify console shows development project ID

### Functional Testing

- [ ] User can log in (verifies auth-user Edge Function routes correctly)
- [ ] Search page loads listings (verifies database connection)
- [ ] Proposal creation works (verifies proposal Edge Function routes correctly)

## Rollback Strategy

If issues arise with the new configuration:

1. **Immediate Rollback:**
   - In Cloudflare Pages, update environment variables to point to desired project
   - Trigger rebuild

2. **Code Rollback:**
   - Revert .env file changes
   - Remove .env.development and .env.production
   - Deploy with hardcoded values (not recommended long-term)

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Development project anon key | REQUIRED | Must obtain from Supabase dashboard |
| Cloudflare Pages access | REQUIRED | Need admin access to configure env vars |
| Dev project Edge Functions | OPTIONAL | May need to deploy Edge Functions to dev project |

### CRITICAL: Development Project Setup

Before implementing, ensure:
1. `splitlease-backend-dev` project has same Edge Functions deployed
2. Dev project has necessary Supabase Secrets configured
3. Dev project database has required tables and data

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Preview deploys use wrong Supabase project | Low | Medium | Clear documentation, console logging |
| Edge Functions not deployed to dev project | Medium | High | Deploy all Edge Functions to dev before implementing |
| Anon key mismatch causes auth failures | Low | High | Test thoroughly before production deploy |
| Breaking change to existing deploys | Low | High | Implement during low-traffic period |

---

## Files Referenced in This Plan

| File | Action |
|------|--------|
| `app/.env` | UPDATE - Remove hardcoded live credentials, default to dev |
| `app/.env.development` | CREATE - Development environment configuration |
| `app/.env.production` | CREATE - Production environment configuration |
| `app/.env.example` | UPDATE - Document both environments |
| `app/.gitignore` | UPDATE - Add .env.production to ignore |
| `app/src/lib/config.js` | UPDATE - Add VITE_ENVIRONMENT and project ID |
| `.pages.toml` | UPDATE - Add environment variable documentation |
| `.claude/Documentation/CLOUDFLARE_PAGES_ENV_CONFIG.md` | CREATE - Setup guide |

---

**VERSION**: 1.0
**CREATED**: 2026-01-09
**AUTHOR**: Claude Code (Implementation Planning Architect)
