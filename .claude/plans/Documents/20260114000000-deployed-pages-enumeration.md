# Split Lease - Deployed Pages Enumeration

**Generated:** 2026-01-14
**Source:** routes.config.js

---

## Overview

| Category | Count |
|----------|-------|
| **Total Registered Routes** | 33 |
| **Protected Routes** (require login) | 11 |
| **Public Routes** | 22 |
| **Routes with Dynamic Segments** | 5 |
| **Routes Using Cloudflare _internal/** | 21 |
| **Dev-Only Routes** | 2 |
| **Deprecated Routes** | 1 |
| **Unregistered HTML Files** | 3 |

---

## Protected Pages (Login Required)

### Host-Only Pages

Pages exclusively for property hosts managing their listings:

| Route | File | Purpose |
|-------|------|---------|
| /host-overview | host-overview.html | Host dashboard - overview of all host activities |
| /listing-dashboard | listing-dashboard.html | Manage all listings - view, edit, create listings |
| /self-listing | self-listing.html | Create/edit individual listing (original version) |
| /host-proposals/:userId | host-proposals.html | View all proposals received for host listings |
| /preview-split-lease/:id | preview-split-lease.html | Preview listing before publishing |

**Total Host-Only Pages:** 5

---

### Guest-Only Pages

Pages exclusively for guests browsing and booking properties:

| Route | File | Purpose |
|-------|------|---------|
| /guest-proposals/:userId | guest-proposals.html | View all proposals submitted by guest |
| /favorite-listings | favorite-listings.html | Saved/favorited listings |

**Total Guest-Only Pages:** 2

---

### Shared Protected Pages

Pages accessible to both hosts and guests (role-agnostic):

| Route | File | Purpose |
|-------|------|---------|
| /account-profile/:userId | account-profile.html | User profile, settings, rental application |
| /messages | messages.html | Real-time messaging between hosts and guests |

**Total Shared Protected Pages:** 2

---

### Deprecated Protected Pages

| Route | File | Status |
|-------|------|--------|
| /rental-application | rental-application.html | DEPRECATED - Redirects to /account-profile |

---

## Public Pages (No Login Required)

### Homepage
| Route | File | Purpose |
|-------|------|---------|
| / | index.html | Main landing page |

---

### Search & Discovery
| Route | File | Purpose |
|-------|------|---------|
| /search | search.html | Main search interface for browsing listings |
| /search-test | search-test.html | Search testing/development page |
| /view-split-lease/:id | view-split-lease.html | Public listing detail view |

---

### Information & Marketing
| Route | File | Purpose |
|-------|------|---------|
| /faq | faq.html | Frequently asked questions |
| /policies | policies.html | Terms of service, privacy policy |
| /list-with-us | list-with-us.html | Host onboarding information (v1) |
| /list-with-us-v2 | list-with-us-v2.html | Host onboarding information (v2) |
| /why-split-lease | why-split-lease.html | Platform value proposition |
| /about-us | about-us.html | Company information |
| /careers | careers.html | Job opportunities |
| /host-guarantee | host-guarantee.html | Host protection program details |

---

### Help Center
| Route | File | Purpose |
|-------|------|---------|
| /help-center | help-center.html | Help center home |
| /help-center/:category | help-center-category.html | Category-specific help |

---

### Referral Program
| Route | File | Purpose | Aliases |
|-------|------|---------|---------|
| /referral-invite | referral-invite.html | Referral landing page | /ref, /referral |

---

### Success Pages
| Route | File | Purpose |
|-------|------|---------|
| /guest-success | guest-success.html | Shown after successful proposal submission |
| /host-success | host-success.html | Shown after successful listing creation |

---

### Authentication
| Route | File | Purpose |
|-------|------|---------|
| /reset-password | reset-password.html | Password reset flow |
| /auth/verify | auth-verify.html | Email verification |

---

### Error Pages
| Route | File | Purpose |
|-------|------|---------|
| /404 | 404.html | Page not found |

---

### Public Self-Listing
| Route | File | Purpose | Notes |
|-------|------|---------|-------|
| /self-listing-v2 | self-listing-v2.html | Create/edit listing v2 | Currently NOT protected (unlike v1) |

---

## Internal/Development Pages

| Route | File | Purpose | Access |
|-------|------|---------|--------|
| /index-dev | index-dev.html | Development homepage variant | Dev only |
| /_internal-test | _internal-test.html | Internal testing | Internal |
| /_email-sms-unit | _email-sms-unit.html | Email/SMS testing | Internal |
| /referral-demo | referral-demo.html | Referral demo | Dev only |

---

## Unregistered HTML Files

These files exist in app/public/ but are NOT registered in routes.config.js:

| File | Likely Purpose |
|------|----------------|
| listing-card-demo.html | Demo/testing for listing card component |
| listing-card-f.html | Alternative listing card demo |
| logged-in-avatar-demo.html | Demo/testing for user avatar component |

---

## Protected Pages Summary

### By User Type

| User Type | Page Count | Routes |
|-----------|------------|--------|
| **Host Only** | 5 | /host-overview, /listing-dashboard, /self-listing, /host-proposals/:userId, /preview-split-lease/:id |
| **Guest Only** | 2 | /guest-proposals/:userId, /favorite-listings |
| **Shared (Both)** | 2 | /account-profile/:userId, /messages |
| **Deprecated** | 1 | /rental-application |
| **Total Protected** | 11 | - |

---

## Technical Notes

### Cloudflare _internal/ Directory

21 routes use cloudflareInternal: true flag, which causes them to be served from _internal/ directory. This prevents Cloudflare aggressive 308 redirects that strip query parameters and hash fragments.

### Dynamic Routes

6 routes have dynamic segments:

| Route | Dynamic Pattern | Parameter |
|-------|----------------|-----------|
| /view-split-lease | /view-split-lease/:id | Listing ID |
| /preview-split-lease | /preview-split-lease/:id | Listing ID |
| /guest-proposals | /guest-proposals/:userId | User ID |
| /account-profile | /account-profile/:userId | User ID |
| /host-proposals | /host-proposals/:userId | User ID |
| /help-center/:category | /help-center/:category | Category slug |

---

**Last Updated:** 2026-01-14
