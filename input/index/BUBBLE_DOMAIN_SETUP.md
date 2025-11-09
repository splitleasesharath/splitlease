# Setting Up split.lease with Bubble App Integration

## Overview
- **Main Site** (split.lease/): Your static site on Cloudflare Pages
- **Bubble App** (split.lease/app): Your Bubble app

## Method 1: Using Cloudflare Page Rules (Simplest)

### Step 1: In Cloudflare Dashboard

1. Go to your domain (split.lease) in Cloudflare
2. Navigate to **Rules → Page Rules**
3. Create a new Page Rule:
   ```
   URL: split.lease/app/*
   Settings: 
   - Forwarding URL (301 Permanent Redirect)
   - Destination: https://your-bubble-app.bubbleapps.io/app/$1
   ```

### Step 2: In Bubble

1. Go to Settings → Domain/Email
2. Add a domain: `split.lease`
3. Set the path to `/app`
4. Bubble will give you a CNAME record to add

### Step 3: Add Bubble's CNAME in Cloudflare

1. In Cloudflare DNS, add:
   ```
   Type: CNAME
   Name: app
   Target: [Bubble provides this]
   Proxy: OFF (Gray cloud)
   ```

## Method 2: Using Cloudflare Workers (Advanced - Better UX)

### Step 1: Deploy the Worker

1. In Cloudflare Dashboard → Workers
2. Create a new Worker
3. Paste the worker.js code (already created)
4. Save and Deploy

### Step 2: Add Worker Route

1. Go to your domain → Workers Routes
2. Add route:
   ```
   Route: split.lease/*
   Worker: [your-worker-name]
   ```

### Step 3: Update Worker with Your Bubble URL

Replace `your-bubble-app.bubbleapps.io` with your actual Bubble app URL in worker.js

## Method 3: Using Subdomain (Easiest)

Instead of `/app`, use `app.split.lease`:

### Step 1: In Cloudflare DNS

Add:
```
Type: CNAME
Name: app
Target: your-bubble-app.bubbleapps.io
Proxy: OFF (Gray cloud)
```

### Step 2: In Bubble

1. Settings → Domain/Email
2. Add domain: `app.split.lease`
3. Save

## Bubble Configuration Steps

### In Your Bubble App:

1. **Go to Settings → Domain/Email**

2. **Add Your Domain:**
   - Domain name: `split.lease`
   - Subdirectory: `/app` (or whatever path you want)

3. **Bubble Will Show:**
   ```
   Please add this DNS record:
   Type: CNAME
   Name: [something]
   Value: [bubble-provided-value].cloudfront.net
   ```

4. **SSL Certificate:**
   - Bubble will automatically provision SSL
   - Takes 15-60 minutes

### In Cloudflare:

1. **Add Bubble's Records:**
   ```
   Type: CNAME
   Name: _domainconnect
   Value: [Bubble provides this]
   Proxy: OFF (Gray cloud - important!)
   ```

2. **Configure Page Rules:**
   ```
   URL Pattern: split.lease/app*
   Settings: 
   - SSL: Flexible
   - Cache Level: Bypass
   - Forwarding URL: OFF (if using proxy)
   ```

## Testing Your Setup

### Check These URLs:
- `https://split.lease` → Your static site ✅
- `https://split.lease/app` → Your Bubble app ✅
- `https://split.lease/app/login` → Bubble login page ✅

### Troubleshooting:

**If Bubble app doesn't load:**
1. Check DNS propagation (can take 5-30 min)
2. Ensure Proxy is OFF for Bubble CNAMEs
3. Wait for SSL certificate (up to 1 hour)

**If you get redirect loops:**
1. Set SSL mode to "Flexible" in Cloudflare
2. Disable "Always Use HTTPS" for /app paths

**If paths don't work:**
1. Check _redirects file is deployed
2. Verify Worker is active (if using Method 2)

## Recommended Approach

**For Simplicity:** Use Method 3 (Subdomain)
- Easiest to set up
- No conflicts
- Clean separation

**For Best UX:** Use Method 2 (Workers)
- Keeps everything under main domain
- No visible redirects
- Most professional

## Important Notes

1. **Bubble's Domain Restrictions:**
   - Bubble Personal plan: No custom domain
   - Bubble Starter plan: Custom domain allowed
   - Make sure your Bubble plan supports custom domains

2. **SSL Certificates:**
   - Cloudflare provides SSL for main domain
   - Bubble provides SSL for their paths
   - May take up to 1 hour to provision

3. **Performance:**
   - Static site: Served from Cloudflare edge (fast)
   - Bubble app: Served from Bubble servers (slower)
   - Consider adding loading indicators

## Quick Setup Commands

```bash
# Deploy updated redirects
git add _redirects
git commit -m "Add Bubble app routing"
git push

# Test routing
curl -I https://split.lease/app
```

## Final Configuration

Your domain structure will be:
```
split.lease/           → Static site (Cloudflare Pages)
split.lease/app        → Bubble app dashboard
split.lease/app/login  → Bubble login
split.lease/app/signup → Bubble signup
split.lease/api        → Bubble API endpoints
```

Or with subdomain:
```
split.lease/     → Static site
app.split.lease/ → Bubble app
```