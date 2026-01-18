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

## Testing

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

---

**VERSION**: 1.0
**CREATED**: 2026-01-09
