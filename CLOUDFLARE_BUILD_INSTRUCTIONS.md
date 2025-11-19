# Cloudflare Pages Build Configuration

## Issue Found
The production site at https://split.lease/faq is serving OLD static HTML instead of the new React-based FAQ page.

## Root Cause
Cloudflare Pages is either:
1. Not building the project correctly
2. Serving cached old content
3. Has incorrect build settings

## Correct Build Settings for Cloudflare Pages

### Build Configuration
```
Build command: cd app && npm install && npm run build
Build output directory: app/dist
Root directory: (leave blank or set to `/`)
Node version: 18
```

### Environment Variables (Already Set)
- `SLACK_WEBHOOK_ACQUISITION`
- `SLACK_WEBHOOK_GENERAL`

### What Should Happen
1. Cloudflare should run `cd app && npm install && npm run build`
2. This creates `app/dist/` with all built files
3. The `app/dist/faq.html` should reference `/assets/faq-[hash].js` and `/assets/faq-[hash].css`
4. The site should serve the React app, NOT static HTML

### Current Problem
- Production is serving old HTML with `<link rel="stylesheet" href="styles.css">` and `<script src="script.js">`
- This causes 404 errors and the page doesn't work
- The correct built file has `<script type="module" crossorigin src="/assets/faq-OzQ7noPU.js">`

## Fix Steps
1. **Delete all deployments** in Cloudflare Pages dashboard (optional but recommended)
2. **Purge Cloudflare cache** for the entire site
3. **Trigger a new deployment** from the latest commit
4. **Verify build logs** show successful build
5. **Test** https://split.lease/faq in incognito mode

## Verification
After deployment, the FAQ page should:
- Load with full styling
- Show Header and Footer
- Load FAQ data from Supabase
- Have a working "Can't find the answer?" modal
- Console should show NO 404 errors for styles.css or script.js
