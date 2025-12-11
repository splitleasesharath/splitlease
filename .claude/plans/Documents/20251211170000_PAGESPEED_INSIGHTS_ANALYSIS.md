# PageSpeed Insights Analysis Report

**URL Analyzed:** https://split.lease/
**Date:** December 11, 2025
**Form Factor:** Mobile
**Tool Version:** Lighthouse 13.0.1
**Test Conditions:** Emulated Moto G Power, Slow 4G throttling, HeadlessChromium 137.0.7151.119

---

## Executive Summary

The Split Lease homepage is experiencing **critical performance issues** with an overall Performance score of **42/100** (Poor). The primary bottlenecks are:

1. **Third-party JavaScript** (Lottie + Hotjar) consuming 3.2+ seconds of CPU time
2. **Unoptimized images** causing 106 KiB of unnecessary downloads
3. **Render-blocking resources** delaying First Contentful Paint by 560ms
4. **Unused JavaScript** totaling 195 KiB that could be code-split or lazy-loaded

---

## Overall Scores

| Category | Score | Status |
|----------|-------|--------|
| **Performance** | 42 | Poor (Red) |
| **Accessibility** | 93 | Good (Green) |
| **Best Practices** | 77 | Needs Improvement (Orange) |
| **SEO** | 83 | Needs Improvement (Orange) |

---

## Core Web Vitals & Performance Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| **First Contentful Paint (FCP)** | 3.8s | < 1.8s | Poor |
| **Largest Contentful Paint (LCP)** | 7.2s | < 2.5s | Poor |
| **Total Blocking Time (TBT)** | 910ms | < 200ms | Poor |
| **Cumulative Layout Shift (CLS)** | 0 | < 0.1 | Good |
| **Speed Index** | 6.8s | < 3.4s | Poor |

### LCP Breakdown

The LCP element is the **Empire State Building image** (`mobile-empire-state` class).

| Subpart | Duration | Analysis |
|---------|----------|----------|
| Time to first byte | 0ms | Excellent - Cloudflare CDN working |
| Resource load delay | 1,750ms | **Critical** - Image not preloaded |
| Resource load duration | 170ms | Good - Image loads fast once started |
| Element render delay | 1,520ms | **Critical** - JavaScript blocking render |

**Root Cause:** The LCP image isn't discovered early by the browser because it's rendered by JavaScript. The 1,750ms delay is the time spent downloading and executing JavaScript before the image request starts.

---

## Critical Performance Issues

### 1. Third-Party JavaScript Dominance

**Total Third-Party CPU Time: 3,251ms (74% of all script execution)**

| Resource | Total CPU Time | Script Evaluation | Impact |
|----------|---------------|-------------------|--------|
| **Lottie Player (unpkg.com)** | 1,754ms | 1,231ms | 40% of script time |
| **Hotjar (modules.js)** | 1,497ms | 484ms | 34% of script time |
| Cloudflare beacon | 59ms | 54ms | Minimal |

**Evidence of Hotjar Impact:**
- Hotjar is responsible for **8 of 10 long main-thread tasks**
- Longest Hotjar task: 541ms (starts at 7,368ms)
- Hotjar WebSocket connections failing: `wss://ws.hotjar.com/api/v2/client/ws`

**Recommendation:**
```javascript
// Defer Lottie loading until after LCP
const loadLottie = () => {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
  document.body.appendChild(script);
};

// Load after user interaction or after 3 seconds
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadLottie);
} else {
  setTimeout(loadLottie, 3000);
}
```

### 2. Unused JavaScript (195 KiB potential savings)

| Resource | Transfer Size | Unused | Percentage |
|----------|--------------|--------|------------|
| AiSignupMarketReport-B7mQNHw5.js | 88.0 KiB | 74.4 KiB | 85% unused |
| auth-CDtPfHMK.js | 49.6 KiB | 40.1 KiB | 81% unused |
| lottie-player.js | 95.8 KiB | 55.0 KiB | 57% unused |
| lottie-web/lottie.js | 76.2 KiB | 43.7 KiB | 57% unused |
| Hotjar modules.js | 55.9 KiB | 25.2 KiB | 45% unused |

**Root Cause Analysis:**

1. **AiSignupMarketReport** - This component is likely imported but only shown conditionally. Since the homepage may not show this component to all users, 85% of the code is never executed.

2. **auth.js** - Authentication code is loaded for all users, but most homepage visitors are unauthenticated. Consider lazy-loading auth code only when needed.

3. **Lottie** - Loading full Lottie library for what appears to be decorative animations. Consider:
   - Using CSS animations instead
   - Using a lighter Lottie alternative like `lottie-web/player/esm/lottie_light.js`
   - Only loading Lottie after page load

### 3. Render-Blocking Resources (560ms delay)

| Resource | Transfer Size | Block Duration |
|----------|--------------|----------------|
| split.lease (HTML) | 31.0 KiB | 2,420ms |
| Toast-CRJZ48Hk.css | 1.7 KiB | 490ms |
| LoggedInAvatar-CiZJ97Tu.css | 1.8 KiB | 490ms |
| Footer-rIbDp9jb.css | 2.2 KiB | 490ms |
| client-C5EJK9pw.css | 25.2 KiB | 970ms |
| Google Fonts (Inter) | 1.5 KiB | 750ms |

**Recommendations:**
1. **Inline critical CSS** - Extract above-the-fold CSS (~15 KiB) and inline it in `<head>`
2. **Preload key CSS** - Add `<link rel="preload">` for critical stylesheets
3. **Defer non-critical CSS** - Load footer styles asynchronously
4. **Self-host Google Fonts** - Eliminates DNS lookup + connection time

### 4. Image Optimization Issues (106 KiB savings)

| Image | Actual Size | Display Size | Savings |
|-------|-------------|--------------|---------|
| Empire State Building | 768x768 | 300x300 | 71.8 KiB |
| logo.png | 522x522 | 40x40 | 25.1 KiB |
| Icon-Backpack Hero | 177x192 | 66x72 | 4.6 KiB |
| Icon-Skyline | 192x192 | 72x72 | 4.1 KiB |

**Recommendations:**
1. **Create responsive image variants** using `srcset`:
```html
<img
  src="logo-40.webp"
  srcset="logo-40.webp 1x, logo-80.webp 2x"
  width="40"
  height="40"
  alt="Split Lease"
/>
```

2. **Use WebP/AVIF formats** - Modern formats provide 25-50% better compression

3. **Preload LCP image**:
```html
<link rel="preload" as="image" href="/assets/images/empire-state-300.webp" />
```

### 5. Inefficient Cache Policies

| Resource | Current TTL | Recommended |
|----------|-------------|-------------|
| Bubble.io CDN images | 1 day | 1 year (with versioning) |
| Apple App Store badge | 10 minutes | 1 week |
| Hotjar script | 1 minute | Cannot control |
| Cloudflare beacon | 1 day | Cannot control |

**Note:** Third-party cache headers cannot be controlled, but Bubble.io images should be served through a CDN with longer cache times.

---

## Main Thread Work Breakdown

**Total Main Thread Time: 4.4 seconds**

| Category | Time | Percentage |
|----------|------|------------|
| Script Evaluation | 1,924ms | 44% |
| Other | 1,036ms | 24% |
| Garbage Collection | 596ms | 14% |
| Style & Layout | 408ms | 9% |
| Rendering | 297ms | 7% |
| Script Parsing | 110ms | 2% |

**Analysis:** Script evaluation dominates at 44%. The 596ms garbage collection time indicates memory pressure from JavaScript execution, particularly from Lottie animations.

---

## Long Tasks Analysis

**10 long tasks detected (tasks > 50ms)**

| # | Resource | Start Time | Duration | Impact |
|---|----------|-----------|----------|--------|
| 1 | Hotjar modules.js | 7,368ms | 541ms | **Severe** |
| 2 | Hotjar modules.js | 5,568ms | 321ms | High |
| 3 | Hotjar modules.js | 6,168ms | 275ms | High |
| 4 | Hotjar modules.js | 5,120ms | 109ms | Medium |
| 5 | client-D8A2Fahq.js | 4,031ms | 109ms | Medium |
| 6 | Hotjar modules.js | 4,950ms | 79ms | Low |
| 7 | Unattributable | 868ms | 74ms | Low |
| 8 | Hotjar modules.js | 3,968ms | 63ms | Low |
| 9 | Hotjar modules.js | 4,153ms | 58ms | Low |
| 10 | Cloudflare beacon | 6,942ms | 50ms | Low |

**Hotjar is responsible for 80% of long tasks.** The longest task (541ms) is nearly 11x the recommended maximum of 50ms.

---

## Security & Best Practices Issues

### High Severity

1. **No Content Security Policy (CSP)** - Site is vulnerable to XSS attacks
   ```
   Recommended: Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://static.hotjar.com; ...
   ```

2. **No HSTS Policy** - Site vulnerable to downgrade attacks
   ```
   Recommended: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```

3. **No X-Frame-Options** - Site vulnerable to clickjacking
   ```
   Recommended: X-Frame-Options: DENY
   ```

### Medium Severity

1. **Deprecated API usage** - Hotjar using deprecated `overflow: visible` behavior
2. **Console errors** - Hotjar WebSocket connections failing (non-critical)

---

## Accessibility Issues

### Contrast Issues (Footer Section)

The following elements fail WCAG 2.1 AA contrast requirements:

| Element | Issue |
|---------|-------|
| `<h4>` "Import your listing" | Insufficient contrast |
| `<p class="import-text">` | Insufficient contrast |
| `<input class="import-input">` (URL) | Insufficient contrast |
| `<input class="import-input">` (email) | Insufficient contrast |
| `<button class="import-btn">` | Insufficient contrast |

**Recommendation:** Increase text/border contrast in the import listing section of the footer.

### Structural Issues

1. **Missing main landmark** - Add `<main>` element wrapping primary content
2. **Heading order** - Headings skip levels (e.g., h1 to h3)

---

## SEO Issues

### 1. Non-Descriptive Link Text

| Link | Current Text | Issue |
|------|--------------|-------|
| `/why-split-lease.html` | "Learn More" | Generic, not descriptive |

**Fix:** Change to "Learn more about Split Lease benefits" or similar descriptive text.

### 2. Invalid robots.txt

**Line 29 Error:**
```
Content-signal: search=yes,ai-train=no
```
`Content-signal` is not a valid robots.txt directive.

---

## DOM Statistics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Total Elements | 2,301 | < 1,500 | Warning |
| Maximum Depth | 23 | < 15 | Warning |
| Most Children | 84 | < 60 | Warning |

**Analysis:** The DOM is larger than recommended. Consider:
- Virtualizing long lists
- Removing unnecessary wrapper elements
- Lazy-loading below-fold content

---

## Third-Party Resource Summary

| Provider | Transfer Size | CPU Time | Purpose |
|----------|--------------|----------|---------|
| Unpkg (Lottie) | 97 KiB | 1,035ms | Animations |
| Hotjar | 63 KiB | 384ms | Analytics |
| Bubble.io CDN | 344 KiB | 1ms | Images |
| Google Fonts | 50 KiB | 0ms | Typography |
| Cloudflare | 7 KiB | 10ms | CDN/Analytics |
| Apple Developer | 12 KiB | 0ms | App Store badge |
| Unsplash | 39 KiB | 0ms | Stock images |
| Amazon S3 | 9 KiB | 0ms | Assets |

**Total Third-Party:** 621 KiB transfer, 1,430ms CPU

---

## Passed Audits (Positive Findings)

1. No layout shift issues (CLS = 0)
2. No duplicate JavaScript bundles
3. Proper font-display: swap usage
4. No legacy JavaScript detected
5. Mobile viewport configured correctly
6. CSS is minified
7. JavaScript is minified
8. Acceptable total network payload (1,358 KiB)
9. No non-composited animations
10. Images have explicit width/height attributes

---

## Prioritized Recommendations

### Priority 1: Critical (Impact: High, Effort: Medium)

| Action | Expected Improvement | Implementation |
|--------|---------------------|----------------|
| Defer Lottie loading | -1.7s TBT | Load after user interaction |
| Preload LCP image | -1.5s LCP | Add preload link tag |
| Optimize/defer Hotjar | -0.9s TBT | Load after page interaction |

### Priority 2: High (Impact: Medium, Effort: Low)

| Action | Expected Improvement | Implementation |
|--------|---------------------|----------------|
| Resize logo.png | -25 KiB | Create 40x40 and 80x80 versions |
| Resize hero image | -72 KiB | Create 300x300 version |
| Code-split AiSignupMarketReport | -74 KiB | Dynamic import |

### Priority 3: Medium (Impact: Medium, Effort: Medium)

| Action | Expected Improvement | Implementation |
|--------|---------------------|----------------|
| Inline critical CSS | -560ms render blocking | Extract and inline |
| Self-host Google Fonts | -750ms FOUT | Download and serve locally |
| Implement CSP headers | Security | Cloudflare _headers file |

### Priority 4: Lower (Impact: Low, Effort: Low)

| Action | Expected Improvement | Implementation |
|--------|---------------------|----------------|
| Fix footer contrast | Accessibility +2-3 pts | Increase text contrast |
| Add main landmark | Accessibility | Add `<main>` element |
| Fix robots.txt | SEO | Remove invalid directive |
| Descriptive link text | SEO | Update "Learn More" links |

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 hours)
- [ ] Add preload for LCP image
- [ ] Resize logo.png to proper dimensions
- [ ] Fix robots.txt invalid directive
- [ ] Add main landmark element

### Phase 2: JavaScript Optimization (4-6 hours)
- [ ] Defer Lottie player loading
- [ ] Defer Hotjar to after page interaction
- [ ] Code-split AiSignupMarketReport.js
- [ ] Lazy-load auth.js for unauthenticated users

### Phase 3: CSS & Font Optimization (2-3 hours)
- [ ] Extract and inline critical CSS
- [ ] Self-host Google Fonts
- [ ] Async load non-critical stylesheets

### Phase 4: Security Headers (1 hour)
- [ ] Implement Content Security Policy
- [ ] Add HSTS header
- [ ] Add X-Frame-Options header

### Phase 5: Image Pipeline (2-4 hours)
- [ ] Create responsive image variants
- [ ] Convert to WebP format
- [ ] Implement srcset for all images

---

## Expected Results After Optimization

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Performance Score | 42 | 75-85 | +33-43 pts |
| FCP | 3.8s | 1.5s | -61% |
| LCP | 7.2s | 2.5s | -65% |
| TBT | 910ms | 200ms | -78% |
| Speed Index | 6.8s | 3.0s | -56% |

---

## Related Files

| File | Purpose |
|------|---------|
| `app/public/index.html` | Homepage HTML |
| `app/src/main.jsx` | Homepage entry point |
| `app/src/islands/pages/HomePage.jsx` | Homepage component |
| `app/public/_headers` | Cloudflare security headers |
| `app/vite.config.js` | Build configuration |
| `app/src/lib/hotjar.js` | Hotjar integration |

---

**Report Generated:** December 11, 2025
**Analysis Tool:** Lighthouse 13.0.1 via PageSpeed Insights
