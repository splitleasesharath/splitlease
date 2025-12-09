# Split Lease - Configuration & Deployment Guide

**Generated**: 2025-11-26
**Purpose**: Quick reference for all configuration files and deployment procedures

---

## 1. Root Configuration Files

### .pages.toml - Cloudflare Pages Deployment

```toml
# Cloudflare Pages build configuration
build_dir = "app"                    # Output directory (build artifacts)
command = "npm run build"            # Build command
root_dir = "."                       # Project root
output_dir = "dist"                  # Artifacts subdirectory (app/dist/)
```

**Key Points**:
- Build runs from project root, builds `app/` directory
- Output saved to `app/dist/`
- Deployed to Cloudflare Pages with automatic HTTPS
- Use `/deploy` command to trigger

### .node-version - Node.js Version Lock

```
18
```

**Requirement**: Node.js 18.x must be used for all builds and development.

### build.sh - Manual Build Script

```bash
#!/bin/bash
# Builds production version for Cloudflare Pages deployment
cd app
npm ci
npm run build
```

**Usage**: `./build.sh` when manual build needed

### package.json - Root Monorepo Configuration

```json
{
  "name": "split-lease-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "cd app && npm ci && npm run build",
    "start": "cd app && npm ci && npm run build",
    "dev": "cd app && npm install && npm run dev",
    "preview": "cd app && npm run preview"
  },
  "description": "Split Lease application monorepo - Cloudflare Pages deployment",
  "devDependencies": {
    "playwright": "^1.57.0"
  }
}
```

**Commands**:
- `npm run build` - Production build
- `npm run dev` - Development server
- `npm run preview` - Preview production locally

---

## 2. App Configuration Files

### app/package.json - Application Dependencies

**Key Scripts**:
```json
{
  "dev": "vite",                     // Development server
  "build": "vite build",             // Production build
  "preview": "vite preview"          // Preview production
}
```

### app/vite.config.js - Vite Build Configuration

**Key Configuration**:
- Entry points: All HTML files in `public/`
- Islands pattern: Each page is independent React root
- Output: `dist/` directory
- Development server: Port 5173 by default

### app/.env - Application Environment Variables

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_GOOGLE_MAPS_API_KEY=<your-api-key>
```

**Note**: These are client-side variables (VITE_ prefix) - safe to expose

### app/.env.example - Environment Template

Template file for developers - commit to git, actual `.env` is git-ignored

### app/tsconfig.json - TypeScript Configuration

**Targets**:
- Module: ES2020
- JSX support enabled
- Lib: ES2020, DOM, DOM.Iterable

---

## 3. Supabase Configuration

### supabase/config.toml - Supabase Project Configuration

**Defines**:
- Database settings (PostgreSQL)
- Auth configuration
- Function definitions
- Secret references
- Rollback/migration settings

**DO NOT EDIT MANUALLY** - Use Supabase dashboard or CLI

### supabase/SECRETS_SETUP.md - API Key Configuration

**Required Secrets** (set in Supabase Dashboard):

```
BUBBLE_API_BASE_URL
  Value: https://app.split.lease/version-test/api/1.1

BUBBLE_API_KEY
  Value: (from Bubble workspace settings)

BUBBLE_AUTH_BASE_URL
  Value: https://upgradefromstr.bubbleapps.io/api/1.1

SUPABASE_SERVICE_ROLE_KEY
  Value: (from Supabase Dashboard → Project Settings → API)
```

**Setup Location**:
- Supabase Dashboard → Project Settings → Secrets
- NOT in environment files (git-ignored)

---

## 4. Deployment Configuration Files

### public/_headers - Cloudflare HTTP Headers

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=()
  Cache-Control: public, max-age=3600
```

Sets HTTP security headers for all responses.

### public/_redirects - Cloudflare URL Redirects

**Redirect Rules**:
- Legacy routes → New routes
- Help center paths → Dynamic routing
- Dynamic view-split-lease routes

**Format**: `source destination [status]`

### public/_routes.json - Cloudflare Workers/Functions Routes

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/images/*", "/assets/*"]
}
```

Configures which routes are served by Workers (if using).

### public/index.html - Home Page Entry

```html
<!-- Landing page - loads main.jsx Island -->
<div id="app"></div>
<script type="module" src="/src/main.jsx"></script>
```

**Key Pattern**: Each HTML file loads ONE React Island independently

---

## 5. Claude Code Configuration

### .claude/settings.json - Permissions & Restrictions

**Allowed Operations**:
```json
{
  "bash": {
    "allowed": [
      "mkdir", "uv", "find", "mv", "grep", "npm",
      "ls", "cp", "chmod", "touch"
    ]
  },
  "allowScripts": [
    "./scripts/copy_dot_env.sh"
  ]
}
```

**Blocked Operations**:
- `git push --force` / `git push -f` (no force push)
- `rm -rf` (no recursive deletion)

### .claude/commands/ - Custom Commands

**Available Commands**:

| Command | File | Purpose |
|---------|------|---------|
| `/deploy` | `deploy.md` | Build and deploy to Cloudflare |
| `/preview` | `preview.md` | Start dev server and open browser |
| `/prime` | `prime.md` | Project initialization |

**Extended Commands** (in `Dump/`):
- `/bug` - Bug report template
- `/feature` - Feature implementation
- `/e2e:test-basic-search` - Run search tests
- And 40+ more...

---

## 6. Git Configuration

### .gitignore - Files to Ignore

**Ignored Patterns**:
```
node_modules/
.env                      # Environment files
dist/                     # Build output
.wrangler/                # Wrangler cache
.temp*                    # Temp directories
/dump/                    # Dump directory
/input/                   # Input directory
```

### .gitattributes - Git Attributes

**Normalization**:
```
* text=auto
*.js text eol=lf
*.json text eol=lf
*.md text eol=lf
```

Ensures consistent line endings across platforms.

---

## 7. Build & Deployment Process

### Development Workflow

```bash
# 1. Install root dependencies
npm install

# 2. Install app dependencies (includes supabase)
cd app
npm install

# 3. Start development server
npm run dev
# Server runs on http://localhost:5173

# 4. View in browser
# Pages auto-reload on file changes
```

### Production Build

```bash
# Method 1: Using npm
npm run build

# Method 2: Using build script
./build.sh

# Method 3: Using Claude command
/deploy
```

### Build Process

1. **Install dependencies**: `npm ci` (clean install)
2. **Run build**: `vite build`
3. **Output**: Files generated in `app/dist/`
4. **Artifacts**:
   - `index.html` (landing page)
   - `search.html`, `view-split-lease.html`, etc. (page entries)
   - `assets/` (CSS, JS bundles)
   - Sourcemaps for debugging

### Cloudflare Pages Deployment

**Trigger**:
```bash
/deploy command OR manual push to main branch
```

**Process**:
1. Clone repository
2. Install Node 18
3. Run `npm run build`
4. Upload `app/dist/` artifacts
5. Configure routing (via _routes.json)
6. Set HTTP headers (via _headers)
7. Apply redirects (via _redirects)

**Verification**:
- Check Cloudflare Pages dashboard
- Visit https://splitlease.pages.dev (or custom domain)
- Verify all pages load without errors

---

## 8. Environment Variables Reference

### Root `.env` (CLI Tools)

```
GITHUB_PAT=<github-personal-access-token>
CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=true
E2B_API_KEY=<e2b-sandbox-api-key>
```

**Not committed** to git (in `.gitignore`)

### App `app/.env` (Client-Side)

```
VITE_SUPABASE_URL=https://xyzabc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```

**Prefix**: `VITE_` makes variables available to client
**Not committed** to git (in `.gitignore`)

### Supabase Secrets (Server-Side)

```
BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY=<api-key-from-bubble>
BUBBLE_AUTH_BASE_URL=https://upgradefromstr.bubbleapps.io/api/1.1
SUPABASE_SERVICE_ROLE_KEY=<super-admin-key>
```

**Stored in**: Supabase Dashboard → Project Settings → Secrets
**Access**: Available to Edge Functions only
**NOT in code**: Never expose in frontend

---

## 9. Deployment Checklist

Before deploying to production:

- [ ] All tests passing locally
- [ ] No console errors in dev server
- [ ] Environment variables set correctly
- [ ] Supabase secrets configured
- [ ] Build succeeds: `npm run build`
- [ ] Preview works: `npm run preview`
- [ ] Database migrations applied
- [ ] Edge Functions deployed: `supabase functions deploy`
- [ ] No hardcoded URLs (use constants)
- [ ] No API keys in code
- [ ] Git history clean (no uncommitted changes)
- [ ] Branch is up to date with main
- [ ] PR merged and approved (if applicable)

### Deploy Command

```bash
/deploy
```

This command automatically:
1. Commits all changes
2. Builds with auto-fix (max 3 attempts)
3. Deploys to Cloudflare Pages
4. Pushes fixes to GitHub

---

## 10. Edge Function Deployment

### Local Testing

```bash
# Start local function server
supabase functions serve

# Server runs on http://localhost:54321
# Functions available at http://localhost:54321/functions/v1/<function-name>
```

### Deploy Specific Function

```bash
supabase functions deploy bubble-auth-proxy
```

### Deploy All Functions

```bash
supabase functions deploy
```

### View Function Logs

```bash
supabase functions logs bubble-auth-proxy --tail
```

### Deploy with Secrets

```bash
# Secrets must be configured in Supabase Dashboard first
# Then deploy function - it will have access to secrets
supabase functions deploy ai-gateway
```

---

## 11. Performance & Caching

### Cache Strategy

**Static Assets**:
- CSS/JS: Long-term cache (browser caches for days)
- Images: Long-term cache
- HTML: No cache (always fetch latest)

**Configuration** (in `public/_headers`):
```
Cache-Control: public, max-age=3600  # 1 hour default
```

### Bundle Optimization

**Vite Configuration**:
- Code splitting per route
- Tree-shaking dead code
- CSS minification
- JS minification

**Result**: Efficient production bundles for fast page loads

---

## 12. Troubleshooting

### Build Fails

**Check**:
1. Node version: `node --version` (must be 18.x)
2. Dependencies: `npm ci` in `app/` directory
3. TypeScript errors: `npm run build` shows errors
4. Missing environment: Check `app/.env` has required variables

**Fix**:
```bash
cd app
rm -rf node_modules package-lock.json
npm ci
npm run build
```

### Deployment Fails

**Check Cloudflare Dashboard**:
1. Function logs
2. Build output
3. Error messages
4. Deployment history

**Retry**:
```bash
/deploy    # Retry deployment
```

### Edge Function Not Working

**Check**:
1. Secrets configured in Supabase
2. Function logs: `supabase functions logs <name>`
3. CORS headers correct
4. Input validation passing

**Debug**:
```bash
# Test function locally
supabase functions serve
# Call: http://localhost:54321/functions/v1/bubble-proxy
```

### Auth Not Working

**Check**:
1. `BUBBLE_AUTH_BASE_URL` secret set
2. `BUBBLE_API_KEY` secret set
3. Token stored in `secureStorage`
4. Token not expired

**Review**:
- `app/src/lib/auth.js` - Auth logic
- `supabase/functions/bubble-auth-proxy/` - Auth function
- `docs/AUTH_FLOW_COMPLETE.md` - Full auth flow

---

## 13. Configuration Summary Table

| Config File | Location | Purpose | Editable |
|------------|----------|---------|----------|
| `.pages.toml` | Root | Cloudflare Pages build | Yes |
| `.node-version` | Root | Node version lock | No (use nvm) |
| `package.json` | Root | Root scripts | Yes |
| `app/vite.config.js` | App | Vite build settings | Yes |
| `app/package.json` | App | App dependencies | Yes |
| `app/.env` | App | Client env vars | Yes (git-ignored) |
| `supabase/config.toml` | Supabase | DB/function config | Dashboard |
| `public/_headers` | Public | HTTP headers | Yes |
| `public/_redirects` | Public | URL redirects | Yes |
| `.claude/settings.json` | .claude | Claude Code perms | Restricted |

---

## 14. Key Deployment Endpoints

### Production
- **Domain**: https://splitlease.pages.dev (or custom domain)
- **API**: Edge Functions at `/api/` routes
- **Database**: Supabase PostgreSQL
- **Storage**: Cloudflare R2 (if configured)

### Development
- **Server**: http://localhost:5173
- **Functions**: http://localhost:54321/functions/v1
- **Database**: Local Supabase (if configured)

---

## 15. CI/CD Pipeline (GitHub)

### Automatic Deployment
- Push to `main` branch triggers Cloudflare Pages build
- Uses Node 18 (from `.node-version`)
- Runs `npm run build`
- Deploys to production on success

### Manual Deployment
```bash
/deploy command
```

Commits, builds, and pushes to GitHub

### Rollback
- Revert commit on main branch
- Cloudflare Pages will redeploy previous version

---

**Document Version**: 1.0
**Last Updated**: 2025-11-26
**Status**: Complete Configuration Reference
