# Domain Migration Plan: GitHub Pages to Cloudflare Pages

## Migration Overview
Migrating from: `https://splitleasesharath.github.io/index_lite/`  
Migrating to: `https://index-lite.pages.dev/`

## Why This Migration?
- GitHub Pages has usage policies that may restrict marketplace/commercial sites
- Cloudflare Pages offers better performance and CDN capabilities
- No usage restrictions for marketplace functionality
- Free tier provides generous limits

## Files Requiring Updates

### 1. HTML Files (index.html)
**Locations to update:**
- Line 10: `<meta property="og:url" content="https://splitleasesharath.github.io/index_lite/">`
- Line 13: `<meta property="og:image" content="https://splitleasesharath.github.io/index_lite/assets/og-image.jpg">`
- Line 17: `<meta name="twitter:image" content="https://splitleasesharath.github.io/index_lite/assets/twitter-card.jpg">`
- Line 18: `<link rel="canonical" href="https://splitleasesharath.github.io/index_lite/">`
- Line 31: Logo href link (if using absolute URL)

**Update to:**
```html
<meta property="og:url" content="https://index-lite.pages.dev/">
<meta property="og:image" content="https://index-lite.pages.dev/assets/og-image.jpg">
<meta name="twitter:image" content="https://index-lite.pages.dev/assets/twitter-card.jpg">
<link rel="canonical" href="https://index-lite.pages.dev/">
```

### 2. README.md
**Current references:**
- Live Demo link
- Installation instructions
- Any GitHub Pages deployment references

**Update sections:**
- Change all instances of `https://splitleasesharath.github.io/index_lite/` to `https://index-lite.pages.dev/`
- Add Cloudflare Pages deployment section
- Keep GitHub repository link unchanged

### 3. CLAUDE.md
**Current references:**
- Site URL in deployment section
- GitHub Pages deployment instructions
- Testing URLs

**Update sections:**
- Line 58: Site URL
- Line 288: Check deployment URL
- Any testing/validation URLs
- Add Cloudflare Pages deployment workflow

### 4. JavaScript Files (script.js)
**Search for:**
- Any hardcoded URLs containing `splitleasesharath.github.io`
- API endpoints
- Redirect URLs

### 5. CSS Files (styles.css)
**Search for:**
- Any hardcoded background-image URLs
- Font URLs with absolute paths

## Step-by-Step Migration Process

### Phase 1: Preparation
1. **Backup current state**
   - All files are already backed up (.backup files exist)
   - Git history preserves all changes

2. **Search for all URL occurrences**
   ```bash
   grep -r "splitleasesharath.github.io" .
   grep -r "github.io/index_lite" .
   ```

### Phase 2: Implementation
1. **Update HTML meta tags**
   - Open index.html
   - Replace all GitHub Pages URLs with Cloudflare Pages URL
   - Ensure relative paths remain unchanged

2. **Update documentation**
   - README.md: Update demo link and deployment instructions
   - CLAUDE.md: Update deployment section and site URLs

3. **Update any hardcoded URLs in JS/CSS**
   - Search and replace absolute URLs
   - Maintain relative paths for assets

### Phase 3: Cloudflare Configuration
1. **DNS Settings** (if using custom domain later)
   - Add CNAME record pointing to `index-lite.pages.dev`

2. **Build Configuration**
   - Build command: (none - static site)
   - Build output directory: `/`
   - Root directory: `/`

3. **Environment Variables**
   - None required for static site

### Phase 4: Testing
1. **Local Testing**
   - Test all links work with new domain
   - Verify meta tags are correct
   - Check console for any errors

2. **Deployment Testing**
   - Push to repository
   - Verify Cloudflare Pages auto-deployment
   - Test live site functionality

### Phase 5: Post-Migration
1. **GitHub Pages** (optional)
   - Can disable GitHub Pages in repository settings
   - Or add redirect from old URL to new URL

2. **Update external references**
   - Any social media links
   - Portfolio references
   - Documentation elsewhere

## Cloudflare Pages Advantages
- **Performance**: Global CDN with 200+ locations
- **Analytics**: Built-in Web Analytics (privacy-focused)
- **Redirects**: Easy redirect rules via _redirects file
- **Headers**: Custom headers via _headers file
- **Functions**: Serverless functions support (if needed later)
- **Preview URLs**: Automatic preview URLs for branches

## Important Notes
1. **Repository remains on GitHub**: Only hosting moves to Cloudflare
2. **Continuous Deployment**: Push to GitHub → Auto-deploy to Cloudflare
3. **Free Tier Limits**: 
   - 500 builds per month
   - 100,000 requests per day
   - Unlimited bandwidth
   - Unlimited sites

## Rollback Plan
If issues occur:
1. Revert git commits
2. GitHub Pages site remains available as backup
3. Can run both simultaneously during transition

## Commands to Execute

```bash
# 1. Pull latest changes
git pull origin main

# 2. Make URL updates (will be done programmatically)

# 3. Commit changes
git add -A
git commit -m "Migrate domain from GitHub Pages to Cloudflare Pages

- Update all hardcoded URLs from splitleasesharath.github.io to index-lite.pages.dev
- Update meta tags for SEO and social sharing
- Update documentation with new deployment process
- Maintain all relative paths for assets"

# 4. Push to repository
git push origin main
```

## Verification Checklist
- [ ] All meta tags updated with new domain
- [ ] Canonical URL points to Cloudflare Pages
- [ ] README demo link works
- [ ] No broken links or resources
- [ ] Social sharing previews work correctly
- [ ] All interactive features functional
- [ ] No console errors on live site

## Additional Cloudflare Features to Consider
1. **Page Rules**: Cache everything, forwarding rules
2. **Workers**: Edge computing for dynamic features
3. **R2 Storage**: For large assets (if needed)
4. **Turnstile**: CAPTCHA alternative for forms
5. **Web Analytics**: Track visitor metrics

This migration will provide better performance, reliability, and flexibility for your Split Lease clone project.