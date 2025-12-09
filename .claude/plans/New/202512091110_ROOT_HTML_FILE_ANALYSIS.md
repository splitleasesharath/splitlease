# Root HTML File Analysis

**Generated**: 2025-12-09 11:10
**Analyst**: Claude Code
**Status**: Complete

---

## Executive Summary

Analysis of 9 HTML files located at the project root directory concludes that **all files are standalone design prototypes/test files** and are **NOT actively referenced by the production codebase**. Only one file (`split-lease-private-flow-final version.html`) is mentioned in a CSS comment as a design reference.

---

## Files Analyzed

### Nightly Rate Calculator Files (6 files)
| File | Purpose | Status |
|------|---------|--------|
| `nightly-rate-calculator.html` | Nightly rate pricing calculator | **PROTOTYPE** |
| `nightly-rate-calculator_dev.html` | Development version | **PROTOTYPE** |
| `nightly-rate-calculator_dev_v2.html` | Development iteration v2 | **PROTOTYPE** |
| `nightly-rate-calculator_dev_v3.html` | Development iteration v3 | **PROTOTYPE** |
| `nightly-rate-calculator_dev_v4.html` | Development iteration v4 | **PROTOTYPE** |
| `nightly-rate-calculator_dev_v5.html` | Development iteration v5 (Simplified Pricing Calculator) | **PROTOTYPE** |

### Split Lease Private Flow Files (3 files)
| File | Purpose | Status |
|------|---------|--------|
| `split-lease-private-flow-final version.html` | Private concierge multi-step form | **DESIGN REFERENCE** |
| `split-lease-private-flow-steps.html` | Multi-step flow prototype | **PROTOTYPE** |
| `split-lease-private-flow-steps-v5pricing.html` | Multi-step flow with v5 pricing | **PROTOTYPE** |

---

## Reference Analysis

### Code References Found
| Location | File Referenced | Type |
|----------|-----------------|------|
| `app/src/islands/pages/SelfListingPageV2/styles/SelfListingPageV2.css:3` | `split-lease-private-flow-final version.html` | CSS Comment (Design Reference) |

### NOT Found In:
- Vite configuration (`vite.config.js`) - No rollup input entries
- Routes configuration (`routes.config.js`) - No route definitions
- Cloudflare redirects (`_redirects`) - No redirect rules
- Any JavaScript/JSX imports across the codebase
- Any HTML link/script references

---

## Technical Details

### File Characteristics

**Nightly Rate Calculator Files:**
- Self-contained HTML files with embedded CSS and JavaScript
- Shadow DOM implementation for style isolation
- Slider-based UI for pricing calculations
- Output data display for debugging/integration testing
- Development iterations showing progressive refinement

**Split Lease Private Flow Files:**
- Self-contained HTML files with embedded CSS and JavaScript
- Multi-step wizard forms with progress indicators
- CSS variables matching the production theme (`--primary: #5b21b6`)
- Card-based UI components with animations
- Form validation and step navigation logic

### Git Status
- All 9 files are **tracked in git** (not ignored)
- Not listed in `.gitignore`

---

## Classification

| Classification | Files |
|----------------|-------|
| **Design Prototype** | All 9 files |
| **Active Production Code** | None |
| **Design Reference** | `split-lease-private-flow-final version.html` (CSS comment only) |
| **Safe to Remove** | All 9 files (with backup recommended) |

---

## Recommendations

### Option A: Archive (Recommended)
Move files to a designated archive directory:
```
/prototypes/
  ├── nightly-rate-calculator/
  │   ├── nightly-rate-calculator.html
  │   ├── nightly-rate-calculator_dev.html
  │   └── ... (v2-v5)
  └── private-flow/
      ├── split-lease-private-flow-final version.html
      ├── split-lease-private-flow-steps.html
      └── split-lease-private-flow-steps-v5pricing.html
```

### Option B: Add to .gitignore
Add pattern to `.gitignore` to exclude from version control:
```
# Prototype HTML files
nightly-rate-calculator*.html
split-lease-private-flow*.html
```

### Option C: Delete
Remove all 9 files after confirming with team that design work is complete.

---

## Appendix: SelfListingPageV2 CSS Reference

```css
/* app/src/islands/pages/SelfListingPageV2/styles/SelfListingPageV2.css */
/**
 * SelfListingPageV2 Styles
 * Matches the design from split-lease-private-flow-final version.html
 */

:root {
  --v2-primary: #5b21b6;
  --v2-primary-light: #7c3aed;
  ...
}
```

The CSS file explicitly states it was designed to match `split-lease-private-flow-final version.html`, confirming this HTML file served as the design source for the production component.

---

**END OF ANALYSIS**
