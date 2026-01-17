# PricingSection Regression Analysis Report

**Date:** 2026-01-16
**Issue:** Weekly/Monthly pricing layouts not displaying - showing Nightly layout with empty values for all listing types
**Status:** RESOLVED

---

## Executive Summary

The PricingSection component stopped working correctly after a **partial refactor** on January 16, 2026 (commit `9d704cf8`). The refactor introduced a React Context pattern to eliminate prop drilling but **failed to update PricingSection** to use this new pattern, while simultaneously **removing the props** from the parent component's render call.

**Time to diagnose:** ~30 minutes
**Root cause:** Incomplete migration during automated refactoring

---

## Timeline of Events

### 1. Original Implementation (Working)
**Commit:** `39d0356e` (Dec 19, 2025)
**Title:** "fix(pricing-section): Add bottom Save button and fix Weekly lease display"

The PricingSection was designed with **props-based data flow**:
```jsx
// PricingSection.jsx - BEFORE refactor
export default function PricingSection({ listing, onEdit }) {
  // Used props directly
  const isWeekly = (listing?.leaseStyle || '').toLowerCase() === 'weekly';
  // ... worked correctly
}

// ListingDashboardPage.jsx - BEFORE refactor
<PricingSection
  listing={listing}
  onEdit={() => handleEditSection('pricing')}
/>
```

### 2. Partial Refactor (Breaking Change)
**Commit:** `9d704cf8` (Jan 16, 2026)
**Title:** "refactor(AUTO / Cleanup): Implement chunks 14, 17, 18, 19, 20, 21, 22, 23, 24, 25"

This automated refactor:
1. ✅ Created `ListingDashboardContext.jsx` with `useListingDashboard()` hook
2. ✅ Updated `DescriptionSection` to use context
3. ✅ Updated `PropertyInfoSection` to use context
4. ✅ Updated `SecondaryActions`, `AlertBanner`, `ActionCardGrid`, `NavigationHeader`
5. ❌ **DID NOT update `PricingSection`** to use context
6. ❌ **Removed props** from `<PricingSection />` in parent

**Components Updated:** 6
**Components Missed:** PricingSection, RulesSection, AmenitiesSection, DetailsSection, AvailabilitySection, PhotosSection, CancellationPolicySection

```jsx
// ListingDashboardPage.jsx - AFTER refactor
<PricingSection />  // No props! But component still expected them
```

---

## Root Cause Analysis

### The Disconnect

| Layer | Before Refactor | After Refactor | Status |
|-------|-----------------|----------------|--------|
| Context | Did not exist | Created `ListingDashboardProvider` | ✅ New |
| Parent Render | `<PricingSection listing={listing} onEdit={...} />` | `<PricingSection />` | ❌ Props removed |
| PricingSection | `function PricingSection({ listing, onEdit })` | Same (unchanged) | ❌ Still expects props |

### Why It Showed "Nightly" for Everything

```javascript
// PricingSection.jsx
const isNightly = (listing?.leaseStyle || 'Nightly').toLowerCase() === 'nightly';
```

When `listing` is `undefined` (no props passed), `listing?.leaseStyle` returns `undefined`, and the fallback `'Nightly'` is used. This caused:
- All listings to appear as "Nightly"
- All pricing values to be `$0` (from `listing?.weeklyHostRate || 0`)
- The schedule selector to show with empty data

---

## Why Diagnosis Took 30 Minutes

### 1. Data Layer Was Correct
The initial investigation showed:
- Database had correct values (`rental type: "Weekly"`, `Weekly Host Rate: 950`)
- `useListingData` transformation logged correct values
- Red herring: assumed the issue was in data fetching or transformation

### 2. Multiple Layers to Trace
The data flow spans multiple files:
```
Supabase DB → useListingData hook → Context Provider → Component Props
```

### 3. Silent Failure Pattern
The component didn't throw errors - it just showed incorrect UI with default values. No console errors indicated the missing props.

### 4. Debug Logging Misdirection
Initial debug logs in `useListingData.js` confirmed data was correct:
```
🔍 DEBUG rental type raw value: Weekly
```

But the issue was **after** transformation, in how data was passed to the component.

---

## The Fix

**Single line change** - Update PricingSection to use context instead of props:

```jsx
// BEFORE (broken)
export default function PricingSection({ listing, onEdit }) {

// AFTER (fixed)
import { useListingDashboard } from '../context/ListingDashboardContext';

export default function PricingSection() {
  const { listing, handleEditSection } = useListingDashboard();
  const onEdit = () => handleEditSection('pricing');
```

---

## Other Components at Risk

The following components may have the same issue (using props but parent not passing them):

| Component | Uses Props? | Uses Context? | Risk |
|-----------|-------------|---------------|------|
| RulesSection | ✅ Yes | ❌ No | **HIGH** |
| AmenitiesSection | ✅ Yes | ❌ No | **HIGH** |
| DetailsSection | ✅ Yes | ❌ No | **HIGH** |
| AvailabilitySection | ✅ Yes | ❌ No | **HIGH** |
| PhotosSection | ✅ Yes | ❌ No | **HIGH** |
| CancellationPolicySection | ✅ Yes | ❌ No | **HIGH** |

---

## Recommendations

### 1. Complete the Migration
All section components should be updated to use `useListingDashboard()` context hook consistently.

### 2. Add PropTypes or TypeScript
With prop validation, missing props would generate console warnings:
```javascript
PricingSection.propTypes = {
  listing: PropTypes.object.isRequired,
  onEdit: PropTypes.func.isRequired,
};
```

### 3. Automated Refactoring Review
When running automated refactors, verify:
- All affected files are updated consistently
- No component is left expecting props that are no longer passed
- Run visual/E2E tests after large refactors

### 4. Add Context Validation
Enhance the context hook to warn when data is missing:
```javascript
export function useListingDashboard() {
  const context = useContext(ListingDashboardContext);
  if (!context) {
    throw new Error('useListingDashboard must be used within ListingDashboardProvider');
  }
  if (!context.listing) {
    console.warn('⚠️ useListingDashboard: listing data not yet loaded');
  }
  return context;
}
```

---

## Files Referenced

- [ListingDashboardContext.jsx](../../../app/src/islands/pages/ListingDashboardPage/context/ListingDashboardContext.jsx)
- [PricingSection.jsx](../../../app/src/islands/pages/ListingDashboardPage/components/PricingSection.jsx)
- [ListingDashboardPage.jsx](../../../app/src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx)
- [useListingData.js](../../../app/src/islands/pages/ListingDashboardPage/hooks/useListingData.js)

---

## Commits Referenced

| Commit | Date | Description |
|--------|------|-------------|
| `39d0356e` | Dec 19, 2025 | Original working implementation with Weekly/Monthly support |
| `9d704cf8` | Jan 16, 2026 | Partial refactor that broke PricingSection |
| (current) | Jan 16, 2026 | Fix: Update PricingSection to use context |
