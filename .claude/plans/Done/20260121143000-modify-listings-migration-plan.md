# Implementation Plan: Modify Listings Admin Tool Migration

## Overview
Migrate the `_modify-listings` TypeScript/React admin tool from the external GitHub repository (https://github.com/splitleasesharath/_modify-listings.git) into the Split Lease monorepo. This involves converting TypeScript to JavaScript, adapting the component architecture to follow the Hollow Component Pattern, and integrating with existing Split Lease infrastructure.

## Success Criteria
- [ ] Route registered at `/_internal/modify-listings` with `adminOnly: true`
- [ ] HTML entry point created at `app/public/modify-listings.html`
- [ ] JSX entry point created at `app/src/modify-listings.jsx`
- [ ] Page component follows Hollow Component Pattern (`ModifyListingsPage.jsx` + `useModifyListingsPageLogic.js`)
- [ ] All 6 sections implemented (Address, Features, Lease Styles/Pricing, Photos, Rules, Reviews)
- [ ] Sidebar components implemented (Search Optimising, Status, Space Snapshot, Preview)
- [ ] TypeScript types converted to JSDoc documentation
- [ ] Photo upload integrated with existing `lib/photoUpload.js`
- [ ] Amenities/lookups integrated with existing `lib/dataLookups.js`
- [ ] FK-safe database update pattern implemented (only send changed fields)
- [ ] Admin authentication enforced via route config
- [ ] `bun run generate-routes` executed successfully
- [ ] Page renders without errors in development mode

## Context & References

### Source Repository Structure
| Source File | Purpose | Target Location |
|-------------|---------|-----------------|
| `src/components/ModifyListingsPage.tsx` | Main page component | `app/src/islands/pages/ModifyListingsPage/ModifyListingsPage.jsx` |
| `src/components/sections/*.tsx` | Section components (6) | `app/src/islands/pages/ModifyListingsPage/sections/*.jsx` |
| `src/components/sidebar/*.tsx` | Sidebar components (4) | `app/src/islands/pages/ModifyListingsPage/sidebar/*.jsx` |
| `src/components/shared/*.tsx` | Form components (13) | `app/src/islands/pages/ModifyListingsPage/shared/*.jsx` |
| `src/hooks/useListingForm.ts` | Form state hook | Merge into `useModifyListingsPageLogic.js` |
| `src/hooks/useListingAPI.ts` | API hook | Merge into `useModifyListingsPageLogic.js` |
| `src/types/listing.ts` | TypeScript types | Convert to JSDoc in page logic file |
| `src/data/amenities.ts` | Amenity data | Use existing `lib/dataLookups.js` |
| `src/data/dropdownOptions.ts` | Dropdown options | Create `app/src/islands/pages/ModifyListingsPage/data/dropdownOptions.js` |
| `src/utils/supabase.ts` | Supabase client | Use existing `lib/supabase.js` |

### Related Documentation
- [largeCLAUDE.md](.claude/Documentation/largeCLAUDE.md) - Full architecture reference
- [ROUTING_GUIDE.md](.claude/Documentation/Routing/ROUTING_GUIDE.md) - Route registration
- [lib/listingService.js](app/src/lib/listingService.js) - Existing listing CRUD and FK mapping patterns
- [lib/photoUpload.js](app/src/lib/photoUpload.js) - Photo upload utilities
- [lib/dataLookups.js](app/src/lib/dataLookups.js) - Amenities, house rules, safety features lookups
- [VerifyUsersPage.jsx](app/src/islands/pages/VerifyUsersPage.jsx) - Example admin tool pattern

### Existing Patterns to Follow
- **Hollow Component Pattern**: Page component contains only JSX, all logic in `useModifyListingsPageLogic.js`
- **Admin Route Pattern**: Use `adminOnly: true` in `routes.config.js`
- **FK-Safe Updates**: Only send changed fields to avoid FK constraint violations (12 FKs on listing table)
- **Day Indexing**: Database uses 0-based (Sun=0 to Sat=6), Bubble uses 1-based - convert at API boundaries
- **Photo Upload**: Use `uploadPhotos()` from `lib/photoUpload.js`
- **Lookups**: Use `initializeLookups()` and getters from `lib/dataLookups.js`

## Implementation Steps

### Phase 1: Route and Entry Point Setup

#### Step 1.1: Register Admin Route
**Files:** `app/src/routes.config.js`
**Purpose:** Register the modify-listings page as an admin-only internal tool
**Details:**
- Add route entry in the CORPORATE INTERNAL TOOLS section
- Set `path: '/_internal/modify-listings'`
- Set `file: 'modify-listings.html'`
- Set `adminOnly: true`
- Set `protected: true`
- Set `cloudflareInternal: false`
- Set `internalName: 'modify-listings-view'`
**Validation:** Route appears in routes array after save

```javascript
{
  path: '/_internal/modify-listings',
  file: 'modify-listings.html',
  aliases: ['/_internal/modify-listings.html', '/modify-listings'],
  protected: true,
  adminOnly: true,
  cloudflareInternal: false,
  internalName: 'modify-listings-view',
  hasDynamicSegment: false
}
```

#### Step 1.2: Create HTML Entry Point
**Files:** `app/public/modify-listings.html`
**Purpose:** Create the static HTML shell for the React island
**Details:**
- Copy structure from existing admin tools (e.g., `verify-users.html`)
- Set appropriate title: "Modify Listings - Split Lease Admin"
- Include `<div id="root"></div>` mount point
- Reference `<script type="module" src="/src/modify-listings.jsx"></script>`
**Validation:** File exists and contains root div

#### Step 1.3: Create JSX Entry Point
**Files:** `app/src/modify-listings.jsx`
**Purpose:** Mount the React application to the DOM
**Details:**
- Import React and createRoot from react-dom/client
- Import ModifyListingsPage from islands/pages/ModifyListingsPage
- Import ToastProvider from islands/shared/Toast
- Mount to #root element
**Validation:** No import errors when file is loaded

```javascript
import React from 'react';
import { createRoot } from 'react-dom/client';
import ModifyListingsPage from './islands/pages/ModifyListingsPage';
import { ToastProvider } from './islands/shared/Toast';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <ToastProvider>
    <ModifyListingsPage />
  </ToastProvider>
);
```

#### Step 1.4: Generate Routes
**Files:** `app/public/_redirects`, `app/public/_routes.json`
**Purpose:** Regenerate Cloudflare routing files
**Details:**
- Run `bun run generate-routes` from app directory
- Verify no validation errors
- Check that new route appears in generated files
**Validation:** Command completes without errors

---

### Phase 2: Directory Structure Setup

#### Step 2.1: Create Component Directory Structure
**Files:** Multiple directories
**Purpose:** Establish the folder structure for the page module
**Details:**
- Create `app/src/islands/pages/ModifyListingsPage/`
- Create subdirectories: `sections/`, `sidebar/`, `shared/`, `data/`
- Create `index.js` barrel export
**Validation:** All directories exist

```
app/src/islands/pages/ModifyListingsPage/
├── index.js                    # Barrel export
├── ModifyListingsPage.jsx      # Main page (hollow component)
├── useModifyListingsPageLogic.js  # All business logic
├── ModifyListingsPage.css      # Styles
├── sections/
│   ├── index.js
│   ├── AddressSection.jsx
│   ├── FeaturesSection.jsx
│   ├── LeaseStylesSection.jsx
│   ├── PhotosSection.jsx
│   ├── RulesSection.jsx
│   └── ReviewsSection.jsx
├── sidebar/
│   ├── index.js
│   ├── ListingPreview.jsx
│   ├── SearchOptimising.jsx
│   ├── SpaceSnapshot.jsx
│   └── StatusSection.jsx
├── shared/
│   ├── index.js
│   ├── FormInput.jsx
│   ├── FormTextArea.jsx
│   ├── FormDropdown.jsx
│   ├── FormCheckbox.jsx
│   ├── FormCheckboxGroup.jsx
│   ├── FormDatePicker.jsx
│   ├── FormRangeInput.jsx
│   ├── FormToggle.jsx
│   ├── SectionContainer.jsx
│   ├── NavigationTabs.jsx
│   ├── SaveButton.jsx
│   └── Alert.jsx
└── data/
    ├── index.js
    └── dropdownOptions.js
```

---

### Phase 3: Data and Utilities

#### Step 3.1: Create Dropdown Options Data
**Files:** `app/src/islands/pages/ModifyListingsPage/data/dropdownOptions.js`
**Purpose:** Provide static dropdown options for form fields
**Details:**
- Convert TypeScript to JavaScript
- Export arrays for: spaceTypes, bedrooms, bathrooms, kitchenTypes, parkingTypes, cancellationPolicies, genderOptions, photoTypes, usStates, checkInTimes, checkOutTimes
- Use format: `{ value: 'string', label: 'Display String' }`
**Validation:** File exports all option arrays

#### Step 3.2: Create Data Index Barrel
**Files:** `app/src/islands/pages/ModifyListingsPage/data/index.js`
**Purpose:** Re-export all data modules
**Details:**
- Export all from dropdownOptions.js
**Validation:** Imports work from `./data`

---

### Phase 4: Shared Form Components

#### Step 4.1: Create FormInput Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/FormInput.jsx`
**Purpose:** Reusable text input field with label
**Details:**
- Convert from TypeScript, remove type annotations
- Props: label, name, value, onChange, placeholder, required, disabled, maxLength, type
- Include error state display
- Use inline styles following VerifyUsersPage pattern
**Validation:** Component renders with all prop combinations

#### Step 4.2: Create FormTextArea Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/FormTextArea.jsx`
**Purpose:** Multi-line text input
**Details:**
- Props: label, name, value, onChange, rows, placeholder, required, disabled, maxLength
- Include character count display when maxLength provided
**Validation:** Component renders with textarea

#### Step 4.3: Create FormDropdown Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/FormDropdown.jsx`
**Purpose:** Select dropdown with options
**Details:**
- Props: label, name, value, onChange, options, placeholder, required, disabled
- Options format: `[{ value, label }]`
**Validation:** Dropdown shows all options

#### Step 4.4: Create FormCheckbox Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/FormCheckbox.jsx`
**Purpose:** Single checkbox input
**Details:**
- Props: label, name, checked, onChange, disabled
**Validation:** Checkbox toggles correctly

#### Step 4.5: Create FormCheckboxGroup Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/FormCheckboxGroup.jsx`
**Purpose:** Group of checkboxes for multi-select (amenities, rules)
**Details:**
- Props: label, name, options, selectedValues, onChange, columns (1-4), required, groupByCategory
- Support category grouping for amenities
- Use grid layout for multi-column display
**Validation:** Multiple checkboxes render in grid

#### Step 4.6: Create FormDatePicker Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/FormDatePicker.jsx`
**Purpose:** Date input with calendar
**Details:**
- Props: label, name, value, onChange, min, max, required, disabled
- Use native date input (type="date")
**Validation:** Date selection works

#### Step 4.7: Create FormRangeInput Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/FormRangeInput.jsx`
**Purpose:** Numeric range input (min/max)
**Details:**
- Props: label, minName, maxName, minValue, maxValue, onMinChange, onMaxChange, minLimit, maxLimit
**Validation:** Both inputs update independently

#### Step 4.8: Create FormToggle Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/FormToggle.jsx`
**Purpose:** Toggle switch for boolean values
**Details:**
- Props: label, name, checked, onChange, disabled
- Style similar to VerifyUsersPage toggle
**Validation:** Toggle switches on/off

#### Step 4.9: Create SectionContainer Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/SectionContainer.jsx`
**Purpose:** Wrapper for form sections with title and save button
**Details:**
- Props: title, children, onSave, isSaving, lastSaved
- Display save status and timestamp
**Validation:** Container wraps children with header

#### Step 4.10: Create NavigationTabs Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/NavigationTabs.jsx`
**Purpose:** Left sidebar navigation for section switching
**Details:**
- Props: sections, activeSection, onSectionChange
- Highlight active section
- Show completion indicators
**Validation:** Tab clicks change active section

#### Step 4.11: Create SaveButton Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/SaveButton.jsx`
**Purpose:** Save button with loading state
**Details:**
- Props: onClick, isLoading, disabled, lastSaved
- Show spinner when loading
- Display "Saved at X" timestamp
**Validation:** Button shows loading state

#### Step 4.12: Create Alert Component
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/Alert.jsx`
**Purpose:** Display success/error/warning messages
**Details:**
- Props: type (success|error|warning|info), message, onClose
- Auto-dismiss after 5 seconds (configurable)
**Validation:** Alert displays and dismisses

#### Step 4.13: Create Shared Index Barrel
**Files:** `app/src/islands/pages/ModifyListingsPage/shared/index.js`
**Purpose:** Re-export all shared components
**Details:**
- Export all form components
**Validation:** All imports work from `./shared`

---

### Phase 5: Section Components

#### Step 5.1: Create AddressSection Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sections/AddressSection.jsx`
**Purpose:** Space Snapshot section - address and property basics
**Details:**
- Convert from TypeScript AddressSection.tsx
- Form fields: listingName (35 char max), fullAddress, typeOfSpace, bedrooms, beds, bathrooms, kitchenType, parkingType
- Address parsing: extract street number, street name from full address
- Use FormInput, FormDropdown from shared/
- Use dropdownOptions for select fields
- Props: listing, onUpdate (partial update callback)
- Include address verification button (call `onVerifyAddress` prop)
**Validation:** All form fields render and update listing state

#### Step 5.2: Create FeaturesSection Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sections/FeaturesSection.jsx`
**Purpose:** Features section - description and amenities
**Details:**
- Convert from TypeScript FeaturesSection.tsx
- Form fields: descriptionOfLodging, neighborhoodDescription, amenitiesInsideUnit (40+ checkboxes), amenitiesOutsideUnit (30+ checkboxes)
- Use FormTextArea, FormCheckboxGroup from shared/
- Integrate with `lib/dataLookups.js` for amenity data: use `getAmenities()`, `initializeLookups()`
- Template loader for description (insert placeholders)
- Props: listing, onUpdate
**Validation:** Amenity checkboxes populate from lookups

#### Step 5.3: Create LeaseStylesSection Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sections/LeaseStylesSection.jsx`
**Purpose:** Lease styles and pricing section
**Details:**
- Convert from TypeScript LeaseStylesSection.tsx
- Form fields: rentalType (nightly|weekly|monthly radio), availableNights (day checkboxes), weeklyPattern, damageDeposit (min $500), maintenanceFee, monthlyCompensation, weeklyCompensation, nightly rates
- Conditional visibility: show rate fields based on rentalType
- Host compensation auto-calculation (~85% of monthly)
- Use FormInput (type="number"), FormCheckbox from shared/
- Props: listing, onUpdate
**Validation:** Pricing fields show/hide based on rental type

#### Step 5.4: Create PhotosSection Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sections/PhotosSection.jsx`
**Purpose:** Photo management section
**Details:**
- Convert from TypeScript PhotosSection.tsx
- Features: upload multiple photos, drag-and-drop reorder, delete individual/all, photo type classification
- Minimum 3 photos validation
- Use `lib/photoUpload.js`: `uploadPhoto()`, `uploadPhotos()`, `deletePhoto()`
- Photo display: thumbnail grid with sort order
- Props: listing, onUpdate, onUploadPhoto, onDeletePhoto
- Store photos in format compatible with `Features - Photos` column
**Validation:** Upload, reorder, delete all work

#### Step 5.5: Create RulesSection Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sections/RulesSection.jsx`
**Purpose:** Rules and availability section
**Details:**
- Convert from TypeScript RulesSection.tsx
- Form fields: cancellationPolicy (dropdown), houseRules (30+ checkboxes), preferredGender, numberOfGuests (1-20), checkInTime, checkOutTime, idealMinDuration, idealMaxDuration, blockedDates (add/remove dates)
- Integrate with `lib/dataLookups.js` for house rules: use `getHouseRules()`
- Use `getAllCancellationPolicies()` from dataLookups for dropdown options
- Blocked dates calendar UI
- Props: listing, onUpdate
**Validation:** House rules checkboxes populate from lookups

#### Step 5.6: Create ReviewsSection Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sections/ReviewsSection.jsx`
**Purpose:** Reviews and safety features section
**Details:**
- Convert from TypeScript ReviewsSection.tsx
- Form fields: safetyFeatures (checkboxes), squareFootage, firstDayAvailable, previousReviewsLink
- Integrate with `lib/dataLookups.js` for safety features: use `getSafetyFeatures()`
- Props: listing, onUpdate
**Validation:** Safety feature checkboxes populate from lookups

#### Step 5.7: Create Sections Index Barrel
**Files:** `app/src/islands/pages/ModifyListingsPage/sections/index.js`
**Purpose:** Re-export all section components
**Validation:** All imports work from `./sections`

---

### Phase 6: Sidebar Components

#### Step 6.1: Create SearchOptimising Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sidebar/SearchOptimising.jsx`
**Purpose:** Display search ranking and listing code
**Details:**
- Display fields (read-only): search ranking, listing code (_id), click counter, bulk upload ID
- Props: listing
**Validation:** Read-only fields display listing data

#### Step 6.2: Create StatusSection Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sidebar/StatusSection.jsx`
**Purpose:** Approval and activity toggles
**Details:**
- Form fields: Approved (toggle), Active (toggle), availabilityConfirmed (toggle), showcase (toggle)
- Props: listing, onUpdate, isProcessing
**Validation:** Toggles update listing state

#### Step 6.3: Create SpaceSnapshot Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sidebar/SpaceSnapshot.jsx`
**Purpose:** Quick view of property details
**Details:**
- Display summary: name, address, bedrooms, bathrooms, type
- Read-only preview of address section data
- Props: listing
**Validation:** Summary displays correctly

#### Step 6.4: Create ListingPreview Component
**Files:** `app/src/islands/pages/ModifyListingsPage/sidebar/ListingPreview.jsx`
**Purpose:** Preview card showing how listing appears to guests
**Details:**
- Display: main photo, name, price, location
- Link to open full preview (`/preview-split-lease/:id`)
- Props: listing
**Validation:** Preview card renders with listing data

#### Step 6.5: Create Sidebar Index Barrel
**Files:** `app/src/islands/pages/ModifyListingsPage/sidebar/index.js`
**Purpose:** Re-export all sidebar components
**Validation:** All imports work from `./sidebar`

---

### Phase 7: Page Logic Hook

#### Step 7.1: Create Page Logic Hook
**Files:** `app/src/islands/pages/ModifyListingsPage/useModifyListingsPageLogic.js`
**Purpose:** All business logic following Hollow Component Pattern
**Details:**
- Merge functionality from useListingForm.ts and useListingAPI.ts
- State management:
  - `listing` - current listing data
  - `originalListing` - original data for change detection
  - `activeSection` - current section ('address'|'features'|'leaseStyles'|'photos'|'rules'|'reviews')
  - `isLoading` - loading state
  - `isSaving` - saving state
  - `error` - error message
  - `alert` - alert notification state
- API functions:
  - `fetchListing(listingId)` - load listing from Supabase
  - `saveListing()` - save changes to Supabase (FK-safe)
  - `uploadPhoto(file)` - upload via lib/photoUpload.js
  - `deletePhoto(photoId)` - delete photo
  - `verifyAddress(address)` - Google Maps verification
- Form management:
  - `updateListing(partialData)` - merge partial updates
  - `setActiveSection(sectionName)` - change active section
  - `hasUnsavedChanges()` - compare listing vs originalListing
- Auto-save: Debounced save every 30 seconds when changes detected
- beforeunload handler for unsaved changes warning
- Initialize `lib/dataLookups.js` on mount

**CRITICAL - FK-Safe Update Pattern:**
```javascript
const saveChanges = async () => {
  // Only send fields that actually changed
  const changedFields = {};
  for (const [key, value] of Object.entries(listing)) {
    if (JSON.stringify(value) !== JSON.stringify(originalListing[key])) {
      changedFields[key] = value;
    }
  }

  if (Object.keys(changedFields).length === 0) {
    return; // Nothing to save
  }

  // Call updateListing from listingService with ONLY changed fields
  await updateListing(listingId, changedFields);
};
```

**Validation:** Hook returns all required state and functions

---

### Phase 8: Main Page Component

#### Step 8.1: Create Main Page Component
**Files:** `app/src/islands/pages/ModifyListingsPage/ModifyListingsPage.jsx`
**Purpose:** Hollow component that renders UI using logic hook
**Details:**
- Import and use `useModifyListingsPageLogic` hook
- Layout: Header + Alert + Three-column layout (left nav | main content | right sidebar)
- Render sections based on `activeSection` state
- Use inline styles following VerifyUsersPage pattern
- Include unsaved changes indicator in header
- Pass appropriate handlers to section components
- Read listingId from URL params: `?id=LISTING_ID`
**Validation:** Page renders with all sections accessible

#### Step 8.2: Create Page CSS (Optional)
**Files:** `app/src/islands/pages/ModifyListingsPage/ModifyListingsPage.css`
**Purpose:** Page-specific styles
**Details:**
- Define any styles not achievable with inline styles
- Follow existing CSS patterns
**Validation:** Styles apply correctly

#### Step 8.3: Create Page Index Barrel
**Files:** `app/src/islands/pages/ModifyListingsPage/index.js`
**Purpose:** Default export for the page
**Details:**
- Export ModifyListingsPage as default
**Validation:** Import works from `./ModifyListingsPage`

---

### Phase 9: Integration Testing

#### Step 9.1: Verify Route Generation
**Files:** N/A (command execution)
**Purpose:** Ensure routes are properly generated
**Details:**
- Run `bun run generate-routes` from app directory
- Verify no errors
- Check `_redirects` contains new route
**Validation:** Command succeeds, route in output files

#### Step 9.2: Start Dev Server and Test
**Files:** N/A (manual testing)
**Purpose:** Verify page loads and functions
**Details:**
- Run `bun run dev` from app directory
- Navigate to `http://localhost:8000/_internal/modify-listings`
- Verify page loads without console errors
- Test listing search/selection
- Test section navigation
- Test form field updates
- Test save functionality
**Validation:** All features work without errors

#### Step 9.3: Test Photo Upload Flow
**Files:** N/A (manual testing)
**Purpose:** Verify photo operations work
**Details:**
- Upload a test photo
- Verify it appears in photo grid
- Test reorder via drag-and-drop
- Test delete functionality
- Verify photos persist after save
**Validation:** Photo CRUD operations complete successfully

#### Step 9.4: Test FK-Safe Update Pattern
**Files:** N/A (manual testing)
**Purpose:** Verify updates don't trigger FK violations
**Details:**
- Load a listing with existing FK values
- Make a small change (e.g., update name only)
- Save and verify no 409 FK violation errors
- Check network tab to confirm only changed fields sent
**Validation:** No FK constraint errors

---

## Edge Cases & Error Handling

### Listing Not Found
- Display "Listing not found" error state
- Provide option to search for different listing

### Network Errors
- Display error alert with retry option
- Preserve form state on failure
- Log full error details for debugging

### Validation Errors
- Highlight invalid fields with red border
- Display field-specific error messages
- Prevent save until validation passes

### Photo Upload Failures
- Show error alert with specific failure reason
- Allow retry of failed uploads
- Don't lose already uploaded photos

### Concurrent Edit Detection
- Compare modified dates before save
- Alert user if listing was modified elsewhere
- Offer to reload fresh data

### FK Constraint Violations
- Log full error: code, message, details, hint
- Display user-friendly error message
- Identify which FK field caused the issue

## Testing Considerations

### Unit Tests (Future)
- Test `useModifyListingsPageLogic` hook in isolation
- Mock Supabase calls
- Verify FK-safe update logic

### Integration Tests (Manual)
- Test each section's form fields
- Test save/load cycle
- Test photo upload/delete
- Test with listings that have null FK values (legacy data)

### Edge Cases to Test
- Load listing with no photos
- Load listing with null FK fields
- Update only non-FK fields
- Update FK fields specifically
- Upload photos with special characters in filename

## Rollback Strategy

If issues arise:
1. Remove route from `routes.config.js`
2. Run `bun run generate-routes`
3. Delete `app/public/modify-listings.html`
4. Delete `app/src/modify-listings.jsx`
5. Delete `app/src/islands/pages/ModifyListingsPage/` directory
6. Commit revert

## Dependencies & Blockers

### Prerequisites
- None - all integrations use existing infrastructure

### External Dependencies
- `lib/supabase.js` - Supabase client
- `lib/photoUpload.js` - Photo upload utilities
- `lib/dataLookups.js` - Amenities, house rules, safety features
- `lib/listingService.js` - FK mapping functions
- `islands/shared/Toast` - Toast notifications

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| FK constraint violations | Medium | High | Implement FK-safe update pattern, test with legacy data |
| Photo upload failures | Low | Medium | Use existing photoUpload.js patterns |
| TypeScript conversion errors | Low | Medium | Convert incrementally, test each component |
| Missing amenity/lookup data | Low | Low | Initialize lookups on page mount, handle cache misses |
| Style inconsistencies | Low | Low | Follow VerifyUsersPage inline style pattern |

---

## File References Summary

### New Files to Create
| File | Purpose |
|------|---------|
| `app/public/modify-listings.html` | HTML entry point |
| `app/src/modify-listings.jsx` | JSX entry point |
| `app/src/islands/pages/ModifyListingsPage/index.js` | Barrel export |
| `app/src/islands/pages/ModifyListingsPage/ModifyListingsPage.jsx` | Main page component |
| `app/src/islands/pages/ModifyListingsPage/useModifyListingsPageLogic.js` | Page logic hook |
| `app/src/islands/pages/ModifyListingsPage/ModifyListingsPage.css` | Optional styles |
| `app/src/islands/pages/ModifyListingsPage/data/index.js` | Data barrel |
| `app/src/islands/pages/ModifyListingsPage/data/dropdownOptions.js` | Dropdown options |
| `app/src/islands/pages/ModifyListingsPage/shared/index.js` | Shared components barrel |
| `app/src/islands/pages/ModifyListingsPage/shared/FormInput.jsx` | Text input component |
| `app/src/islands/pages/ModifyListingsPage/shared/FormTextArea.jsx` | Textarea component |
| `app/src/islands/pages/ModifyListingsPage/shared/FormDropdown.jsx` | Select component |
| `app/src/islands/pages/ModifyListingsPage/shared/FormCheckbox.jsx` | Checkbox component |
| `app/src/islands/pages/ModifyListingsPage/shared/FormCheckboxGroup.jsx` | Checkbox group component |
| `app/src/islands/pages/ModifyListingsPage/shared/FormDatePicker.jsx` | Date picker component |
| `app/src/islands/pages/ModifyListingsPage/shared/FormRangeInput.jsx` | Range input component |
| `app/src/islands/pages/ModifyListingsPage/shared/FormToggle.jsx` | Toggle switch component |
| `app/src/islands/pages/ModifyListingsPage/shared/SectionContainer.jsx` | Section wrapper |
| `app/src/islands/pages/ModifyListingsPage/shared/NavigationTabs.jsx` | Section navigation |
| `app/src/islands/pages/ModifyListingsPage/shared/SaveButton.jsx` | Save button component |
| `app/src/islands/pages/ModifyListingsPage/shared/Alert.jsx` | Alert component |
| `app/src/islands/pages/ModifyListingsPage/sections/index.js` | Sections barrel |
| `app/src/islands/pages/ModifyListingsPage/sections/AddressSection.jsx` | Address section |
| `app/src/islands/pages/ModifyListingsPage/sections/FeaturesSection.jsx` | Features section |
| `app/src/islands/pages/ModifyListingsPage/sections/LeaseStylesSection.jsx` | Lease/pricing section |
| `app/src/islands/pages/ModifyListingsPage/sections/PhotosSection.jsx` | Photos section |
| `app/src/islands/pages/ModifyListingsPage/sections/RulesSection.jsx` | Rules section |
| `app/src/islands/pages/ModifyListingsPage/sections/ReviewsSection.jsx` | Reviews section |
| `app/src/islands/pages/ModifyListingsPage/sidebar/index.js` | Sidebar barrel |
| `app/src/islands/pages/ModifyListingsPage/sidebar/SearchOptimising.jsx` | Search ranking sidebar |
| `app/src/islands/pages/ModifyListingsPage/sidebar/StatusSection.jsx` | Status toggles sidebar |
| `app/src/islands/pages/ModifyListingsPage/sidebar/SpaceSnapshot.jsx` | Property summary sidebar |
| `app/src/islands/pages/ModifyListingsPage/sidebar/ListingPreview.jsx` | Preview card sidebar |

### Existing Files to Modify
| File | Change |
|------|--------|
| `app/src/routes.config.js` | Add route entry |

### Existing Files to Reference (Do Not Modify)
| File | Purpose |
|------|---------|
| `app/src/lib/supabase.js` | Supabase client |
| `app/src/lib/photoUpload.js` | Photo upload utilities |
| `app/src/lib/dataLookups.js` | Lookup data utilities |
| `app/src/lib/listingService.js` | Listing CRUD and FK mapping |
| `app/src/islands/pages/VerifyUsersPage.jsx` | Admin tool pattern reference |
| `app/src/islands/shared/Toast.jsx` | Toast notifications |

---

**Plan Version:** 1.0
**Created:** 2026-01-21
**Author:** Claude (Implementation Planner)
