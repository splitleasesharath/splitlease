# Custom Domain Setup Checklist

## Domain Purchase Options (Prices are approximate)

### Budget Domains ($10-15/year)
- `.xyz` - $10/year
- `.site` - $12/year
- `.online` - $12/year
- `.tech` - $12/year
- `.space` - $11/year

### Standard Domains ($15-25/year)
- `.com` - $15/year (if available)
- `.net` - $15/year
- `.org` - $15/year
- `.co` - $25/year
- `.live` - $20/year

### Premium Options ($25+/year)
- `.io` - $40/year
- `.app` - $20/year
- `.dev` - $20/year

## After Purchase - Setup Steps

1. **In Cloudflare Pages Dashboard:**
   - Go to your project
   - Click "Custom domains"
   - Add your domain
   - Add www subdomain

2. **Update Site Configuration:**
   - Edit `_redirects` file:
     ```
     https://www.yourdomain.com/* https://yourdomain.com/:splat 301
     http://yourdomain.com/* https://yourdomain.com/:splat 301
     ```

3. **Update Meta Tags in index.html:**
   - Change canonical URL
   - Update og:url
   - Update sitemap references

4. **Enable Cloudflare Features:**
   - [ ] Auto Minify (Speed → Optimization)
   - [ ] Brotli compression (Speed → Optimization)
   - [ ] HTTP/3 (Network)
   - [ ] 0-RTT Connection Resumption (Network)
   - [ ] Always Use HTTPS (SSL/TLS → Edge Certificates)

## DNS Records (Automatic with Cloudflare Domain)

```
Type    Name    Content                         Proxy
CNAME   @       split-lease-clone.pages.dev    ✅
CNAME   www     split-lease-clone.pages.dev    ✅
```

## SSL Configuration
- **Encryption mode**: Full (strict)
- **Minimum TLS**: 1.2
- **Automatic HTTPS Rewrites**: ON

## Page Rules (Optional - Free tier gets 3)

1. **Force HTTPS:**
   - URL: `http://*yourdomain.com/*`
   - Setting: Always Use HTTPS

2. **Remove www:**
   - URL: `www.yourdomain.com/*`
   - Setting: Forwarding URL (301)
   - Destination: `https://yourdomain.com/$1`

3. **Cache Everything:**
   - URL: `yourdomain.com/styles.css`
   - Setting: Cache Level - Cache Everything
   - Edge Cache TTL: 1 month

## Performance Settings

- **Caching Level**: Standard
- **Browser Cache TTL**: 4 hours
- **Crawler Hints**: ON
- **Early Hints**: ON
- **Rocket Loader**: OFF (can break JavaScript)

## Testing After Setup

1. **Check DNS Propagation:**
   - Visit: https://www.whatsmydns.net
   - Enter your domain
   - Should show Cloudflare IPs

2. **Test SSL:**
   - Visit: https://www.ssllabs.com/ssltest/
   - Enter your domain
   - Should get A+ rating

3. **Test Performance:**
   - Visit: https://pagespeed.web.dev
   - Enter your new domain
   - Should maintain good scores

## Timeline

- **Domain Purchase**: Instant
- **DNS Propagation**: 5 minutes - 48 hours (usually under 1 hour)
- **SSL Certificate**: Automatic, usually within 15 minutes
- **Full Setup**: Under 1 hour

## Recommended Domain Names

Based on availability (check these):
1. `splitlease.site` - Clean, professional
2. `split-lease.online` - Descriptive
3. `mysplitlease.com` - Personal touch
4. `splitlease.xyz` - Modern, cheapest
5. `getsplitlease.com` - Action-oriented

## Cost Breakdown (Annual)

- **Domain**: $10-25/year
- **Cloudflare Pages**: FREE
- **SSL Certificate**: FREE
- **CDN**: FREE
- **Analytics**: FREE
- **Total**: Just the domain cost!

## Support

- **Cloudflare Support**: https://community.cloudflare.com
- **Pages Docs**: https://developers.cloudflare.com/pages
- **Domain Docs**: https://developers.cloudflare.com/registrar