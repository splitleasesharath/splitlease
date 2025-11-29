# Public Directory - Static Assets

**GENERATED**: 2025-11-26
**PARENT**: app/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Static HTML entry points and public assets served directly
[PATTERN]: HTML pages import React entry points via Vite
[SERVED]: Files served at root URL path

---

## ### SUBDIRECTORIES ###

### assets/
[INTENT]: Static media assets
[SUBDIRS]: fonts/, icons/, images/, lotties/, resources/, videos/

### help-center-articles/
[INTENT]: Static help center article pages
[SUBDIRS]: css/, js/, guests/, hosts/, knowledge-base/
[PATTERN]: Pre-rendered HTML for SEO

### images/
[INTENT]: Additional images at root level

---

## ### HTML_ENTRY_POINTS ###

[PATTERN]: Each HTML file mounts a React component

### 404.html → src/404.jsx
### account-profile.html → src/account-profile.jsx (protected)
### careers.html → src/careers.jsx
### faq.html → src/faq.jsx
### guest-success.html → src/guest-success.jsx
### help-center.html → src/help-center.jsx
### help-center-category.html → src/help-center-category.jsx
### host-success.html → src/host-success.jsx
### index.html → src/main.jsx (home page)
### index-dev.html → src/main.jsx (dev variant)
### list-with-us.html → src/list-with-us.jsx
### logged-in-avatar-demo.html → demo page
### policies.html → src/policies.jsx
### search.html → src/search.jsx
### search-test.html → src/search-test.jsx
### self-listing.html → src/self-listing.jsx
### view-split-lease.html → src/view-split-lease.jsx
### why-split-lease.html → src/why-split-lease.jsx

---

## ### CONFIGURATION_FILES ###

### _headers
[INTENT]: Cloudflare header rules (CSP, caching, CORS)

### _redirects
[INTENT]: Cloudflare redirect rules (SPA fallbacks, legacy URLs)

### _routes.json
[INTENT]: Cloudflare Functions routing configuration

---

## ### HTML_TEMPLATE_PATTERN ###

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Page Title | Split Lease</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/page-name.jsx"></script>
</body>
</html>
```

---

## ### ASSETS_STRUCTURE ###

### assets/fonts/
[INTENT]: Web fonts

### assets/icons/
[INTENT]: SVG icons and icon sprites

### assets/images/
[INTENT]: UI images (logo, hero, etc.)

### assets/lotties/
[INTENT]: Lottie animation JSON files

### assets/resources/
[INTENT]: Downloadable resources (PDFs)

### assets/videos/
[INTENT]: Video files (time-lapse background)

---

**HTML_FILE_COUNT**: 20
**SUBDIRECTORY_COUNT**: 3
