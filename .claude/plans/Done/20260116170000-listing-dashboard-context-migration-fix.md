# Implementation Plan: ListingDashboard Context Migration Fix

**Created**: 2026-01-16 17:00:00
**Classification**: BUG FIX
**Priority**: HIGH (Production regression)
**Estimated Complexity**: Low (pattern already established)

---

## Problem Summary

Commit `9d704cf8` ("refactor(AUTO / Cleanup): Implement chunks 14-25") performed an incomplete context migration:

1. **Created** `ListingDashboardContext` to centralize state management
2. **Updated** `ListingDashboardPage.jsx` to use context and removed all props from section component renders
3. **Migrated** only 2 components (`PropertyInfoSection`, `DescriptionSection`) to use the context hook
4. **Left 7 components broken** - they still expect props that are no longer passed

### The Silent Failure Pattern

```jsx
// Parent now renders:
<PricingSection />  // No props

// But component still expects:
export default function PricingSection({ listing, onEdit }) {
  const isNightly = (listing?.leaseStyle || 'Nightly').toLowerCase() === 'nightly';
  // listing is undefined → fallback 'Nightly' always wins → wrong UI
}
```

---

## Root Cause Analysis

### Git Evidence

**BEFORE commit 9d704cf8** (working):
```jsx
<PricingSection
  listing={listing}
  onEdit={() => handleEditSection('pricing')}
/>
```

**AFTER commit 9d704cf8** (broken):
```jsx
<PricingSection />
```

### Components Status

| Component | Signature | Status |
|-----------|-----------|--------|
| `PropertyInfoSection` | `()` + uses `useListingDashboard()` | MIGRATED |
| `DescriptionSection` | `()` + uses `useListingDashboard()` | MIGRATED |
| `PricingSection` | `({ listing, onEdit })` | BROKEN |
| `RulesSection` | `({ listing, onEdit })` | BROKEN |
| `AmenitiesSection` | `({ listing, onEditInUnit, onEditBuilding })` | BROKEN |
| `DetailsSection` | `({ listing, onEdit })` | BROKEN |
| `AvailabilitySection` | `({ listing, onEdit, onBlockedDatesChange, onAvailabilityChange })` | BROKEN |
| `PhotosSection` | `({ listing, onAddPhotos, onDeletePhoto, onSetCover, onReorderPhotos })` | BROKEN |
| `CancellationPolicySection` | `({ listing, onPolicyChange, onRestrictionsChange })` | BROKEN |

---

## Fix Strategy

**Approach**: Complete the migration by updating all 7 broken components to use the context hook, matching the established pattern from `PropertyInfoSection` and `DescriptionSection`.

**Why this approach**:
1. Follows the original migration intent
2. Pattern already proven working in 2 components
3. Context already exports all needed handlers
4. Minimal code changes (just hook usage, no new logic)

---

## Implementation Steps

### Step 1: PricingSection.jsx

**File**: `app/src/islands/pages/ListingDashboardPage/components/PricingSection.jsx`

**Changes**:
```jsx
// ADD import at top
import { useListingDashboard } from '../context/ListingDashboardContext';

// CHANGE function signature from:
export default function PricingSection({ listing, onEdit }) {

// TO:
export default function PricingSection() {
  const { listing, handleEditSection } = useListingDashboard();

// CHANGE onClick handler from:
onClick={onEdit}

// TO:
onClick={() => handleEditSection('pricing')}
```

---

### Step 2: RulesSection.jsx

**File**: `app/src/islands/pages/ListingDashboardPage/components/RulesSection.jsx`

**Changes**:
```jsx
// ADD import at top
import { useListingDashboard } from '../context/ListingDashboardContext';

// CHANGE function signature from:
export default function RulesSection({ listing, onEdit }) {

// TO:
export default function RulesSection() {
  const { listing, handleEditSection } = useListingDashboard();

// CHANGE onClick handler from:
onClick={onEdit}

// TO:
onClick={() => handleEditSection('rules')}
```

---

### Step 3: AmenitiesSection.jsx

**File**: `app/src/islands/pages/ListingDashboardPage/components/AmenitiesSection.jsx`

**Changes**:
```jsx
// ADD import at top
import { useListingDashboard } from '../context/ListingDashboardContext';

// CHANGE function signature from:
export default function AmenitiesSection({ listing, onEditInUnit, onEditBuilding }) {

// TO:
export default function AmenitiesSection() {
  const { listing, handleEditSection } = useListingDashboard();

// CHANGE onClick handlers from:
onClick={onEditInUnit}
onClick={onEditBuilding}

// TO:
onClick={() => handleEditSection('amenities')}
onClick={() => handleEditSection('amenities', 'building')}
```

---

### Step 4: DetailsSection.jsx

**File**: `app/src/islands/pages/ListingDashboardPage/components/DetailsSection.jsx`

**Changes**:
```jsx
// ADD import at top
import { useListingDashboard } from '../context/ListingDashboardContext';

// CHANGE function signature from:
export default function DetailsSection({ listing, onEdit }) {

// TO:
export default function DetailsSection() {
  const { listing, handleEditSection } = useListingDashboard();

// CHANGE onClick handler from:
onClick={onEdit}

// TO:
onClick={() => handleEditSection('details')}
```

---

### Step 5: AvailabilitySection.jsx

**File**: `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`

**Changes**:
```jsx
// ADD import (note: already imports useState, useCallback, useMemo)
import { useListingDashboard } from '../context/ListingDashboardContext';

// CHANGE function signature from:
export default function AvailabilitySection({ listing, onEdit, onBlockedDatesChange, onAvailabilityChange }) {

// TO:
export default function AvailabilitySection() {
  const { listing, handleEditSection, handleBlockedDatesChange, handleAvailabilityChange } = useListingDashboard();

// CHANGE onClick handler from:
onClick={onEdit}

// TO:
onClick={() => handleEditSection('availability')}

// CHANGE callback references from:
onBlockedDatesChange(...)
onAvailabilityChange(...)

// TO:
handleBlockedDatesChange(...)
handleAvailabilityChange(...)
```

---

### Step 6: PhotosSection.jsx

**File**: `app/src/islands/pages/ListingDashboardPage/components/PhotosSection.jsx`

**Changes**:
```jsx
// ADD import (note: already imports useState)
import { useListingDashboard } from '../context/ListingDashboardContext';

// CHANGE function signature from:
export default function PhotosSection({ listing, onAddPhotos, onDeletePhoto, onSetCover, onReorderPhotos }) {

// TO:
export default function PhotosSection() {
  const {
    listing,
    handleEditSection,
    handleDeletePhoto,
    handleSetCoverPhoto,
    handleReorderPhotos
  } = useListingDashboard();

// CHANGE callback references:
// onAddPhotos → () => handleEditSection('photos')
// onDeletePhoto → handleDeletePhoto
// onSetCover → handleSetCoverPhoto
// onReorderPhotos → handleReorderPhotos
```

---

### Step 7: CancellationPolicySection.jsx

**File**: `app/src/islands/pages/ListingDashboardPage/components/CancellationPolicySection.jsx`

**Changes**:
```jsx
// ADD import (note: already imports useState, useEffect)
import { useListingDashboard } from '../context/ListingDashboardContext';

// CHANGE function signature from:
export default function CancellationPolicySection({ listing, onPolicyChange, onRestrictionsChange }) {

// TO:
export default function CancellationPolicySection() {
  const {
    listing,
    handleCancellationPolicyChange,
    handleCancellationRestrictionsChange
  } = useListingDashboard();

// CHANGE callback references:
// onPolicyChange → handleCancellationPolicyChange
// onRestrictionsChange → handleCancellationRestrictionsChange
```

---

## Context Hook Reference

The `useListingDashboard()` hook provides (from `useListingDashboardPageLogic.js:378-437`):

```javascript
{
  // Data
  listing,
  counts,
  isLoading,
  error,
  currentUser,
  existingCohostRequest,

  // Photo handlers
  handleSetCoverPhoto,
  handleDeletePhoto,
  handleReorderPhotos,

  // UI state
  activeTab,
  editSection,
  editFocusField,
  highlightedFields,

  // Handlers needed by section components
  handleEditSection,           // All sections
  handleBlockedDatesChange,    // AvailabilitySection
  handleAvailabilityChange,    // AvailabilitySection
  handleCancellationPolicyChange,      // CancellationPolicySection
  handleCancellationRestrictionsChange, // CancellationPolicySection

  // ... plus many more for modals/navigation
}
```

---

## Testing Checklist

After implementation, verify each section:

- [ ] **PricingSection**: Shows correct lease style, pricing, nights schedule
- [ ] **RulesSection**: Shows house rules, preferred gender, max guests
- [ ] **AmenitiesSection**: Shows in-unit and building amenities
- [ ] **DetailsSection**: Shows property features, safety features
- [ ] **AvailabilitySection**: Calendar displays, blocked dates work, availability toggle works
- [ ] **PhotosSection**: Photos display, delete/reorder/set-cover work
- [ ] **CancellationPolicySection**: Policy dropdown works, restrictions textarea works

Edit buttons should open correct edit modals for each section.

---

## Files to Modify

1. `app/src/islands/pages/ListingDashboardPage/components/PricingSection.jsx` (Line 12)
2. `app/src/islands/pages/ListingDashboardPage/components/RulesSection.jsx` (Line 53)
3. `app/src/islands/pages/ListingDashboardPage/components/AmenitiesSection.jsx` (Line 40)
4. `app/src/islands/pages/ListingDashboardPage/components/DetailsSection.jsx` (Line 100)
5. `app/src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx` (Line 61)
6. `app/src/islands/pages/ListingDashboardPage/components/PhotosSection.jsx` (Line 75)
7. `app/src/islands/pages/ListingDashboardPage/components/CancellationPolicySection.jsx` (Line 9)

## Reference Files (Working Examples)

- `app/src/islands/pages/ListingDashboardPage/components/PropertyInfoSection.jsx` - Line 116 (migrated)
- `app/src/islands/pages/ListingDashboardPage/components/DescriptionSection.jsx` - Line 3 (migrated)
- `app/src/islands/pages/ListingDashboardPage/context/ListingDashboardContext.jsx` - Context definition
- `app/src/islands/pages/ListingDashboardPage/useListingDashboardPageLogic.js` - Hook that provides all values

---

## Risk Assessment

**Low Risk** - This is a straightforward pattern replication:
1. Pattern already working in 2 components
2. No new logic, just different data access method
3. All needed handlers already exposed by context
4. Each component can be fixed independently

---

## Commit Message Template

```
fix(ListingDashboard): complete context migration for section components

The refactor commit 9d704cf8 created ListingDashboardContext but only
migrated 2 of 9 section components. This left 7 components receiving
undefined props, causing silent failures with fallback values.

Components fixed:
- PricingSection: now uses useListingDashboard() for listing, handleEditSection
- RulesSection: now uses useListingDashboard() for listing, handleEditSection
- AmenitiesSection: now uses useListingDashboard() for listing, handleEditSection
- DetailsSection: now uses useListingDashboard() for listing, handleEditSection
- AvailabilitySection: now uses useListingDashboard() for listing, handlers
- PhotosSection: now uses useListingDashboard() for listing, photo handlers
- CancellationPolicySection: now uses useListingDashboard() for listing, policy handlers

Fixes production regression where listing data appeared blank/incorrect.
```
