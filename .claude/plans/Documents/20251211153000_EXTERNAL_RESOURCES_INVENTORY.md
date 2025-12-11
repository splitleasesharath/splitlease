# Split Lease External Resources Inventory

**Generated**: 2025-12-11
**Scope**: Complete enumeration of all external APIs, services, and third-party resources

---

## Executive Summary

The Split Lease application integrates with **12 distinct external services/resources** across 5 categories:
1. Core Infrastructure (Supabase, Cloudflare, Bubble.io)
2. AI/ML Services (OpenAI)
3. Mapping Services (Google Maps)
4. Analytics & Tracking (Hotjar)
5. Communication (Slack)

---

## 1. SUPABASE (Primary Backend)

### Service Overview
| Attribute | Value |
|-----------|-------|
| **Service Name** | Supabase |
| **Purpose** | Database, Authentication, Edge Functions |
| **Primary Use** | PostgreSQL database, user auth, serverless API |

### Configuration
| Environment Variable | Location | Description |
|---------------------|----------|-------------|
| `VITE_SUPABASE_URL` | `app/.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `app/.env` | Public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secrets | Admin key (server-side only) |

### Implementation Files
- `app/src/lib/supabase.js` - Client initialization
- `app/src/lib/auth.js` - Authentication functions
- `app/src/lib/supabaseUtils.js` - Query helpers
- `supabase/functions/*` - All Edge Functions

### Edge Functions Using Supabase
| Function | Purpose |
|----------|---------|
| `auth-user` | Login, signup, password reset |
| `bubble-proxy` | Bubble API proxy |
| `proposal` | Proposal CRUD |
| `listing` | Listing CRUD |
| `ai-gateway` | AI completions |
| `bubble_sync` | Data sync operations |

---

## 2. BUBBLE.IO (Legacy Backend)

### Service Overview
| Attribute | Value |
|-----------|-------|
| **Service Name** | Bubble.io |
| **Purpose** | Legacy backend, workflows, data storage |
| **Primary Use** | Source of truth for proposals, workflows |
| **Base URL** | `https://app.split.lease` |

### Configuration
| Environment Variable | Location | Description |
|---------------------|----------|-------------|
| `BUBBLE_API_BASE_URL` | Supabase Secrets | Bubble API endpoint |
| `BUBBLE_API_KEY` | Supabase Secrets | Bearer token for API auth |

### Implementation Files
- `app/src/lib/bubbleAPI.js` - Proxied API client
- `app/src/lib/constants.js` - API URLs (deprecated, for reference)
- `supabase/functions/_shared/bubbleSync.ts` - Sync service
- `supabase/functions/bubble-proxy/*` - Proxy handlers
- `supabase/functions/bubble_sync/*` - Queue-based sync

### CDN Resources from Bubble
| URL Pattern | Purpose | Files Using |
|-------------|---------|-------------|
| `https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/*` | Lottie animations, images | `app/src/lib/constants.js`, HTML files |
| `https://d1muf25xaso8hp.cloudfront.net/*` | Image hosting (Bubble CDN) | Help center articles HTML |

### Lottie Animation URLs
```javascript
// From app/src/lib/constants.js
HEADER_ICON: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1760473171600x280130752685858750/atom%20animation.json'
PARSING: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1722533720265x199451206376484160/Animation%20-%201722533570126.json'
LOADING: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1720724605167x733559911663532000/Animation%20-%201720724343172.lottie'
SUCCESS: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1745939792891x394981453861459140/Report.json'
ATOM_WHITE: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1746105302928x174581704119754800/atom%20white.json'
```

---

## 3. CLOUDFLARE (Hosting & Edge)

### Service Overview
| Attribute | Value |
|-----------|-------|
| **Service Name** | Cloudflare Pages |
| **Purpose** | Static hosting, CDN, Pages Functions |
| **Primary Use** | Frontend hosting, edge API functions |

### Configuration
| Setting | Location | Description |
|---------|----------|-------------|
| `SLACK_WEBHOOK_ACQUISITION` | Cloudflare Pages Secrets | FAQ inquiry webhook |
| `SLACK_WEBHOOK_GENERAL` | Cloudflare Pages Secrets | General notifications |

### Implementation Files
- `app/functions/api/faq-inquiry.js` - Cloudflare Pages Function
- `app/public/_redirects` - Routing configuration
- `app/public/_headers` - HTTP headers
- `app/public/_routes.json` - Functions routing

---

## 4. GOOGLE MAPS

### Service Overview
| Attribute | Value |
|-----------|-------|
| **Service Name** | Google Maps Platform |
| **Purpose** | Map display, Places API, geocoding |
| **Primary Use** | Search page map, listing location display |

### Configuration
| Environment Variable | Location | Description |
|---------------------|----------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | `app/.env` | Maps JavaScript API key |

### API Endpoints Used
| Endpoint | Purpose |
|----------|---------|
| `https://maps.googleapis.com/maps/api/js` | Maps JavaScript API |
| Places Library | Address autocomplete |

### Implementation Files
- `app/src/lib/mapUtils.js` - Map utilities
- `app/src/lib/config.js` - Exposes API key to window.ENV
- `app/src/islands/shared/GoogleMap.jsx` - Map component
- HTML files with Google Maps loading scripts:
  - `app/public/search.html`
  - `app/public/view-split-lease.html`
  - `app/public/self-listing.html`
  - `app/public/self-listing-v2.html`
  - `app/public/preview-split-lease.html`
  - `app/public/favorite-listings.html`
  - `app/public/search-test.html`

### NPM Package
```json
"@react-google-maps/api": "^2.20.7"
"@googlemaps/markerclusterer": "^2.x.x"
```

---

## 5. OPENAI

### Service Overview
| Attribute | Value |
|-----------|-------|
| **Service Name** | OpenAI API |
| **Purpose** | AI text generation |
| **Primary Use** | Listing descriptions, titles, AI-powered features |

### Configuration
| Environment Variable | Location | Description |
|---------------------|----------|-------------|
| `OPENAI_API_KEY` | Supabase Secrets | API authentication |

### API Endpoints Used
| Endpoint | Purpose |
|----------|---------|
| `https://api.openai.com/v1/chat/completions` | Chat completions |

### Implementation Files
- `supabase/functions/_shared/openai.ts` - OpenAI client wrapper
- `supabase/functions/ai-gateway/*` - AI gateway edge function
- `app/src/lib/aiService.js` - Frontend AI service client

### Prompts Configured
| Prompt Key | Purpose | Public |
|------------|---------|--------|
| `listing-description` | Generate listing descriptions | Yes |
| `listing-title` | Generate listing titles | Yes |
| `proposal-summary` | AI proposal analysis | No |

---

## 6. HOTJAR (Analytics)

### Service Overview
| Attribute | Value |
|-----------|-------|
| **Service Name** | Hotjar |
| **Purpose** | User behavior analytics, heatmaps, recordings |
| **Site ID** | 6581463 |

### Configuration
| Environment Variable | Location | Description |
|---------------------|----------|-------------|
| `VITE_HOTJAR_SITE_ID` | `app/.env` | Hotjar site identifier |

### API Endpoints Used
| Endpoint | Purpose |
|----------|---------|
| `https://static.hotjar.com/c/hotjar-*.js` | Tracking script |

### Implementation Files
- `app/src/lib/hotjar.js` - Hotjar initialization
- All HTML files in `app/public/*.html` - Inline tracking script

### HTML Pages with Hotjar
All 27 main HTML pages include Hotjar tracking:
- `index.html`, `search.html`, `view-split-lease.html`
- `guest-proposals.html`, `host-proposals.html`
- `self-listing.html`, `self-listing-v2.html`
- `listing-dashboard.html`, `favorite-listings.html`
- `account-profile.html`, `reset-password.html`
- `faq.html`, `help-center.html`, `help-center-category.html`
- `policies.html`, `careers.html`, `about-us.html`
- `list-with-us.html`, `why-split-lease.html`
- `guest-success.html`, `host-success.html`
- `rental-application.html`, `host-overview.html`
- `preview-split-lease.html`, `404.html`
- `search-test.html`, `_internal-test.html`

---

## 7. SLACK (Notifications)

### Service Overview
| Attribute | Value |
|-----------|-------|
| **Service Name** | Slack Webhooks |
| **Purpose** | Notifications, error reporting, FAQ inquiries |
| **Primary Use** | Internal team alerts |

### Configuration
| Environment Variable | Location | Description |
|---------------------|----------|-------------|
| `SLACK_WEBHOOK_ACQUISITION` | Cloudflare/Supabase | Acquisition channel |
| `SLACK_WEBHOOK_GENERAL` | Cloudflare/Supabase | General channel |
| `SLACK_WEBHOOK_DATABASE_WEBHOOK` | Supabase Secrets | Database error logs |

### Implementation Files
- `supabase/functions/_shared/slack.ts` - Slack utility class
- `supabase/functions/slack/index.ts` - Slack edge function
- `app/functions/api/faq-inquiry.js` - FAQ to Slack
- `app/src/lib/slackService.js` - Frontend Slack client

### Slack Channels Used
| Channel | Purpose | Trigger |
|---------|---------|---------|
| Acquisition | FAQ inquiries, signups | User form submissions |
| General | General notifications | Various events |
| Database | Error reporting | Edge function errors |

---

## 8. CDN RESOURCES (External Scripts)

### Google Fonts
| Font Family | Pages Using |
|-------------|-------------|
| DM Sans | host-success, host-overview, careers, help-center, rental-application |
| Lato | favorite-listings, guest-success |
| Inter | about-us, careers |
| Nunito Sans | about-us |
| Martel | host-success, help-center |
| Cousine | rental-application |

### Font Loading Pattern
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
```

### Implementation Files
- `app/public/about-us.html`
- `app/public/careers.html`
- `app/public/favorite-listings.html`
- `app/public/guest-success.html`
- `app/public/help-center.html`
- `app/public/help-center-category.html`
- `app/public/host-overview.html`
- `app/public/host-success.html`
- `app/public/logged-in-avatar-demo.html`
- `app/public/rental-application.html`

---

## 9. UNPKG CDN (JavaScript Libraries)

### Lottie Web
| Library | Version | Purpose |
|---------|---------|---------|
| lottie-web | 5.12.2 | Animation player |

### Implementation
```html
<script src="https://unpkg.com/lottie-web@5.12.2/build/player/lottie.min.js"></script>
```

### Files Using
- `app/public/search.html`
- `app/public/search-test.html`

### Feather Icons
| Library | Purpose |
|---------|---------|
| feather-icons | Icon library |

### Implementation
```html
<script src="https://unpkg.com/feather-icons"></script>
```

### Files Using
- `app/public/careers.html`
- Multiple help center article HTML files

---

## 10. CDNJS (CSS Libraries)

### Font Awesome
| Library | Version | Purpose |
|---------|---------|---------|
| font-awesome | 6.4.0 | Icon library |

### Implementation
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

### Files Using
- `app/public/policies.html`

---

## 11. JSDELIVR CDN

### Supabase JS (Inline Scripts)
| Library | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | 2 | Supabase client (used in account-profile inline script) |

### Implementation
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### Files Using
- `app/public/account-profile.html` (inline script section)

---

## 12. NPM DEPENDENCIES (External Service Clients)

### From package.json
| Package | Version | External Service |
|---------|---------|------------------|
| `@supabase/supabase-js` | ^2.38.0 | Supabase |
| `@react-google-maps/api` | ^2.20.7 | Google Maps |
| `lottie-react` | ^2.4.1 | Lottie animations |
| `framer-motion` | ^12.23.24 | Local (animations) |
| `react-hook-form` | ^7.66.1 | Local (forms) |
| `zod` | ^4.1.12 | Local (validation) |

---

## Summary Table

| # | Service | Category | Config Method | Server/Client |
|---|---------|----------|---------------|---------------|
| 1 | Supabase | Infrastructure | Environment vars | Both |
| 2 | Bubble.io | Infrastructure | Supabase Secrets | Server only |
| 3 | Cloudflare | Infrastructure | Platform secrets | Server only |
| 4 | Google Maps | Mapping | Environment var | Client |
| 5 | OpenAI | AI/ML | Supabase Secrets | Server only |
| 6 | Hotjar | Analytics | Environment var | Client |
| 7 | Slack | Communication | Platform secrets | Server only |
| 8 | Google Fonts | CDN | Hardcoded URLs | Client |
| 9 | Unpkg | CDN | Hardcoded URLs | Client |
| 10 | CDNJS | CDN | Hardcoded URLs | Client |
| 11 | jsDelivr | CDN | Hardcoded URLs | Client |
| 12 | Bubble CDN | CDN | Hardcoded URLs | Client |

---

## Security Notes

### API Keys Stored Server-Side Only
- `BUBBLE_API_KEY` - Supabase Secrets
- `OPENAI_API_KEY` - Supabase Secrets
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase Secrets
- `SLACK_WEBHOOK_*` - Supabase/Cloudflare Secrets

### API Keys Exposed to Client (Safe by Design)
- `VITE_SUPABASE_ANON_KEY` - Public anon key, RLS enforced
- `VITE_GOOGLE_MAPS_API_KEY` - Restricted to specific domains
- `VITE_HOTJAR_SITE_ID` - Analytics only, read-only

### Not Currently Implemented
- Payment processors (Stripe, PayPal) - Not found
- Email services (SendGrid, Mailgun) - Not found (Supabase Auth handles email)
- Social OAuth providers - Not found (email/password only)
- File storage services (S3, Cloudinary) - Not found (uses Bubble CDN)
- SMS services (Twilio) - Not found
- Error tracking (Sentry, LogRocket) - Not found (uses Slack)

---

## Recommendations

1. **Consider adding Sentry** for production error monitoring
2. **Google Analytics** could complement Hotjar for traffic analytics
3. **Payment processing** will be needed when monetization begins
4. **Social OAuth** could improve signup conversion
5. **Email service** may be needed for marketing beyond transactional emails

---

**Document Version**: 1.0
**Last Updated**: 2025-12-11
