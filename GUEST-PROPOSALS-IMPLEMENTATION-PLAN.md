# Guest Proposals Page - Comprehensive Implementation Plan

**Project:** Split Lease Guest Proposals - Complete Feature Implementation
**Version:** 1.0
**Date:** 2025-11-19
**Status:** Implementation Ready
**Current Completion:** 70% → Target: 100%

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Context](#project-context)
3. [Architecture Overview](#architecture-overview)
4. [Phase 1: Critical Features](#phase-1-critical-features)
5. [Phase 2: High-Priority Features](#phase-2-high-priority-features)
6. [Phase 3: Medium-Priority Features](#phase-3-medium-priority-features)
7. [Phase 4: Low-Priority Features](#phase-4-low-priority-features)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)
10. [Appendix](#appendix)

---

## Executive Summary

### Current State

The Guest Proposals page has been rebuilt from the Bubble.io implementation with a **70% completion rate**. The foundation is excellent:

✅ **Core Architecture** (100%)
- Triple loading strategy (URL → Dropdown → First proposal)
- Dual proposal system (original + host counteroffer)
- Soft delete pattern
- Direct database integration (Supabase)
- No fallback mechanisms

✅ **Working Features**
- Proposal selector dropdown
- Basic proposal card display
- Progress tracker (6 stages)
- Virtual meeting system (95% complete)
- Compare terms modal (95% complete)
- Delete/Cancel proposals (basic)

### Remaining Work (30%)

**Critical Gaps:**
1. Google Maps integration (MapModal placeholder)
2. Edit Proposal form (placeholder only)
3. Complete Cancel Proposal decision tree (7 variations)

**High-Priority Gaps:**
4. External reviews system (Airbnb/VRBO)
5. Backend API workflows (CORE-create-lease)
6. Dynamic action button logic refinement

**Medium/Low Priority:**
7. Calendar UI for virtual meetings
8. Host profile enhancements
9. Real-time updates
10. Mobile responsive polish

### Timeline & Resources

- **Phase 1 (Critical):** 1-2 weeks | 2 developers
- **Phase 2 (High Priority):** 1 week | 2 developers
- **Phase 3 (Medium/Low):** 1 week | 1 developer
- **Phase 4 (Testing & Deploy):** 3-5 days | 1 developer

**Total: 4-5 weeks to 100% completion**

---

## Project Context

### Documentation References

This implementation plan is based on comprehensive documentation:

**Primary Sources:**
1. `input/context/guest-proposals/COMPREHENSIVE-DOCUMENTATION-SUMMARY.md`
   - 90% implementation ready
   - Complete feature catalog
   - Database schema requirements

2. `input/context/guest-proposals/design/DESIGN-FINAL-ASSIMILATION.md`
   - 100% UI specifications
   - Component catalog
   - Data binding patterns
   - Responsive strategy

3. `input/context/guest-proposals/workflow/WORKFLOW-PASS2-ASSIMILATION.md`
   - Critical workflows (16 fully documented)
   - Accept Counteroffer (7 steps)
   - Cancel Proposal (7 variations)
   - Virtual Meeting system

4. `input/context/guest-proposals/workflow/VM-IMPLEMENTATION-QUICKSTART.md`
   - Step-by-step VM implementation
   - 5-state workflow
   - Database schema
   - Testing checklist

5. `input/context/guest-proposals/live/PASS5-COMPREHENSIVE-SUMMARY.md`
   - User-facing behavior
   - Component specifications
   - Technology stack recommendations

### Current Codebase Structure

```
app/src/
├── guest-proposals.jsx                    # Entry point (20 lines)
├── islands/
│   ├── pages/
│   │   └── GuestProposalsPage.jsx        # Main page (643 lines) ✅
│   ├── proposals/
│   │   ├── ProposalSelector.jsx          # Dropdown (100%) ✅
│   │   ├── ProposalCard.jsx              # Main display (85%) 🟡
│   │   ├── ProgressTracker.jsx           # 6-stage tracker (100%) ✅
│   │   └── EmptyState.jsx                # No proposals (100%) ✅
│   ├── modals/
│   │   ├── CompareTermsModal.jsx         # Counteroffer (95%) ✅
│   │   ├── VirtualMeetingModal.jsx       # VM system (95%) ✅
│   │   ├── HostProfileModal.jsx          # Host info (80%) 🟡
│   │   ├── MapModal.jsx                  # PLACEHOLDER (30%) ❌
│   │   └── EditProposalModal.jsx         # PLACEHOLDER (10%) ❌
│   └── shared/
│       ├── Header.jsx
│       └── Footer.jsx
└── lib/
    ├── supabase.js                        # Database client
    └── auth.js                            # Authentication
```

### Database Schema (Supabase)

**Tables Used:**
- `proposal` - Main proposal data (original + hc fields)
- `listing` - Property details
- `user` - User profiles & verification
- `zat_features_houserule` - House rules
- `virtualmeetingschedulesandlinks` - Virtual meetings
- `Booking - Lease` - Lease records
- `Reviews Listings External` - External reviews (TO BE CREATED)

---

## Architecture Overview

### Design Principles (CRITICAL - DO NOT VIOLATE)

Per project guidelines in `.claude/CLAUDE.md`:

**1. No Fallback Mechanisms**
```typescript
// ❌ NEVER do this
const proposal = fetchedProposal || mockProposal || defaultProposal;

// ✅ ALWAYS do this
const proposal = fetchedProposal;
if (!proposal) {
  throw new Error('Proposal not found');
}
```

**2. Match Solution to Scale**
- Don't over-engineer for hypothetical needs
- Use simple, direct solutions
- Appropriate complexity for current requirements

**3. Embrace Constraints**
- Work within tool boundaries
- Don't fight the architecture
- Simple > clever

**4. Be Direct**
- Code does exactly what it says
- No hidden magic
- Clear intent

### Data Flow Architecture

```
User Action (UI)
    ↓
Action Handler (GuestProposalsPage.jsx)
    ↓
Supabase Query (Direct, no abstraction)
    ↓
State Update (React setState)
    ↓
Component Re-render
    ↓
UI Update
```

**No intermediate layers. No caching (unless explicitly needed). No fallbacks.**

### Triple Loading Strategy (IMPLEMENTED ✅)

```typescript
// Priority order for loading proposals:
1. URL Parameter (?proposal=abc123)
   → Parse URL, fetch specific proposal

2. Dropdown Selection
   → User changes dropdown, update URL, fetch proposal

3. First Proposal (Default)
   → Page load with no params, auto-select first proposal
```

### Dual Proposal System (IMPLEMENTED ✅)

```typescript
// Every proposal has TWO sets of terms:

interface Proposal {
  // Original (guest submitted)
  'Move in range start': Date;
  'nights per week (num)': number;
  'proposal nightly price': number;
  // ... all original fields

  // Host-Changed (counteroffer) - NULLABLE
  'hc move in date'?: Date;
  'hc nights per week'?: number;
  'hc nightly price'?: number;
  // ... all hc fields

  'counter offer happened': boolean;
}

// Display logic:
const displayValue = proposal['counter offer happened'] && proposal['hc move in date']
  ? proposal['hc move in date']
  : proposal['Move in range start'];
```

---

## Phase 1: Critical Features

### FEATURE 1.1: Google Maps Integration (MapModal)

**Priority:** 🔴 CRITICAL
**Effort:** 1-2 days
**Status:** Currently placeholder (30% complete)
**File:** `app/src/islands/modals/MapModal.jsx`

#### Documentation Reference

- **DESIGN-FINAL-ASSIMILATION.md** (lines 221-278) - Dual Map Strategy
- **COMPREHENSIVE-DOCUMENTATION-SUMMARY.md** (lines 115, 460-461)

#### Requirements Specification

**From Bubble Implementation:**
- **Primary:** Google Maps plugin (googlemap(bdk) by Brownfox dev)
- **Fallback Strategy:** Native Bubble map element (dual implementation)
- **Dynamic Centering:** Map centers on listing address when URL parameter exists
- **Features:**
  - Custom marker for listing location
  - Zoom controls
  - Street view access
  - Nearby properties display (future)

#### Technical Implementation

##### Step 1: Install Dependencies

```bash
npm install @react-google-maps/api
```

##### Step 2: Environment Setup

```env
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

##### Step 3: Complete Implementation

```typescript
/**
 * MapModal Component - COMPLETE IMPLEMENTATION
 *
 * Shows Google Map with listing location marker
 * Based on: DESIGN-FINAL-ASSIMILATION.md lines 221-278
 */

import { useState, useCallback } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const defaultCenter = {
  lat: 40.7128, // NYC default
  lng: -74.0060
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    // Optional: Custom map styling for brand consistency
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

export default function MapModal({ listing, address, onClose }) {
  const [map, setMap] = useState(null);

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: ['places'] // For future address autocomplete
  });

  // Parse address to coordinates
  // In production, listing should have coordinates stored
  const center = listing?.['Location - Coordinates']
    ? {
        lat: listing['Location - Coordinates'].lat,
        lng: listing['Location - Coordinates'].lng
      }
    : defaultCenter;

  const onLoad = useCallback((map) => {
    setMap(map);
    // Auto-center on marker
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(center);
    map.fitBounds(bounds);
    map.setZoom(15); // Optimal zoom for neighborhood view
  }, [center]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Error handling
  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
          <div className="bg-white rounded-lg p-6 max-w-md relative z-10">
            <h3 className="text-lg font-semibold text-red-600 mb-3">
              Map Failed to Load
            </h3>
            <p className="text-gray-600 mb-4">
              Unable to load Google Maps. Please check your internet connection or try again later.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-700">
              <strong>Address:</strong><br />
              {address || listing?.['Location - Address']}
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full relative z-10">
            <div className="h-[500px] bg-gray-100 rounded flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mb-3"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {listing?.Name || 'Listing Location'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {listing?.['Location - Hood']}, {listing?.['Location - Borough']}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white px-4 pb-4">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={15}
              options={mapOptions}
              onLoad={onLoad}
              onUnmount={onUnmount}
            >
              {/* Marker for listing location */}
              <Marker
                position={center}
                title={listing?.Name}
                animation={window.google.maps.Animation.DROP}
                icon={{
                  url: '/assets/images/split-lease-purple-circle.png',
                  scaledSize: new window.google.maps.Size(40, 40),
                }}
              />
            </GoogleMap>

            {/* Address Display */}
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
              <strong>Full Address:</strong><br />
              {address || listing?.['Location - Address'] || 'Address not available'}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || listing?.['Location - Address'])}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Testing Checklist

```markdown
- [ ] Map loads without errors
- [ ] Marker appears at correct location
- [ ] Map centers on listing address
- [ ] Zoom controls work
- [ ] Street view accessible
- [ ] Error handling displays when API fails
- [ ] Loading state shows during initial load
- [ ] "Open in Google Maps" link works
- [ ] Modal closes on background click
- [ ] Mobile responsive (touch controls work)
```

#### Database Requirements

**IMPORTANT:** Ensure `listing` table has coordinates:

```sql
-- Add coordinates column if missing
ALTER TABLE listing
ADD COLUMN IF NOT EXISTS "Location - Coordinates" JSONB;

-- Update existing records (one-time migration)
-- Use geocoding service or manual entry for existing listings
```

**Coordinate Format:**
```json
{
  "lat": 40.7489,
  "lng": -73.9680
}
```

---

### FEATURE 1.2: Edit Proposal Form (EditProposalModal)

**Priority:** 🔴 CRITICAL
**Effort:** 3-4 days
**Status:** Currently placeholder (10% complete)
**File:** `app/src/islands/modals/EditProposalModal.jsx`

#### Documentation Reference

- **WORKFLOW-PASS2-ASSIMILATION.md** - Edit proposal workflow
- **DESIGN-FINAL-ASSIMILATION.md** (lines 285-335) - Schedule visualization
- **COMPREHENSIVE-DOCUMENTATION-SUMMARY.md** (lines 302, 317)

#### Requirements Specification

**From Bubble Implementation:**

**Editable Fields:**
1. Move-in date range (start & end)
2. Reservation span (weeks)
3. Days selected (S M T W T F S checkboxes)
4. Nights per week (calculated from days)
5. Check-in day (dropdown)
6. Check-out day (dropdown)

**Business Rules:**
- Only editable when status = "Awaiting Host Review" or "Under Review"
- Cannot edit after host has reviewed
- Must recalculate pricing when terms change
- Validation against listing availability

**UI Components Needed:**
- Date range picker
- Week count selector
- Day checkboxes with visual circles
- Dropdown selectors for check-in/out
- Real-time price display
- Validation error messages

#### Technical Implementation

##### Step 1: Install Dependencies

```bash
npm install react-datepicker react-hook-form @hookform/resolvers zod date-fns
```

##### Step 2: Schema Definition

```typescript
// app/src/lib/schemas/proposal.ts

import * as z from 'zod';

export const editProposalSchema = z.object({
  moveInStart: z.date({
    required_error: 'Move-in start date is required',
  }),
  moveInEnd: z.date({
    required_error: 'Move-in end date is required',
  }),
  reservationWeeks: z.number()
    .min(4, 'Minimum 4 weeks required')
    .max(52, 'Maximum 52 weeks allowed'),
  daysSelected: z.array(z.enum([
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ])).min(1, 'Select at least one day'),
  nightsPerWeek: z.number()
    .min(1, 'Must stay at least 1 night per week')
    .max(7, 'Cannot exceed 7 nights per week'),
  checkInDay: z.enum([
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]),
  checkOutDay: z.enum([
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]),
}).refine((data) => {
  // Validation: move-in end must be after start
  return data.moveInEnd > data.moveInStart;
}, {
  message: 'End date must be after start date',
  path: ['moveInEnd'],
}).refine((data) => {
  // Validation: nights per week must match days selected
  return data.nightsPerWeek === data.daysSelected.length;
}, {
  message: 'Nights per week must match selected days',
  path: ['nightsPerWeek'],
});

export type EditProposalFormData = z.infer<typeof editProposalSchema>;
```

##### Step 3: Complete Form Implementation

```typescript
/**
 * EditProposalModal Component - COMPLETE IMPLEMENTATION
 *
 * Allows guests to modify proposal terms before host review
 * Based on: Bubble edit proposal workflow
 *
 * Features:
 * - Date range picker
 * - Day selector with visual circles (S M T W T F S)
 * - Real-time price calculation
 * - Form validation with zod
 * - Optimistic UI updates
 */

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DatePicker from 'react-datepicker';
import { differenceInWeeks } from 'date-fns';
import { supabase } from '../../lib/supabase.js';
import { editProposalSchema, EditProposalFormData } from '../../lib/schemas/proposal.ts';
import 'react-datepicker/dist/react-datepicker.css';

export default function EditProposalModal({ proposal, listing, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState(null);

  // Check if editing is allowed
  const isEditable = ['Awaiting Host Review', 'Under Review'].includes(proposal?.Status);

  if (!isEditable) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
          <div className="bg-white rounded-lg p-6 max-w-md relative z-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Cannot Edit Proposal
            </h3>
            <p className="text-gray-600">
              Proposals can only be edited while awaiting host review.
              Your proposal has progressed past this stage.
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initialize form with current proposal values
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<EditProposalFormData>({
    resolver: zodResolver(editProposalSchema),
    defaultValues: {
      moveInStart: new Date(proposal['Move in range start']),
      moveInEnd: new Date(proposal['Move in range end']),
      reservationWeeks: proposal['Reservation Span (Weeks)'],
      daysSelected: proposal['Days Selected'] || [],
      nightsPerWeek: proposal['nights per week (num)'],
      checkInDay: proposal['check in day'],
      checkOutDay: proposal['check out day'],
    },
  });

  // Watch form values for real-time updates
  const watchedValues = watch();
  const { moveInStart, moveInEnd, daysSelected, nightsPerWeek } = watchedValues;

  // Calculate reservation weeks from date range
  useEffect(() => {
    if (moveInStart && moveInEnd) {
      const weeks = differenceInWeeks(moveInEnd, moveInStart);
      if (weeks > 0) {
        setValue('reservationWeeks', weeks);
      }
    }
  }, [moveInStart, moveInEnd, setValue]);

  // Calculate nights per week from selected days
  useEffect(() => {
    if (daysSelected) {
      setValue('nightsPerWeek', daysSelected.length);
    }
  }, [daysSelected, setValue]);

  // Calculate pricing in real-time
  useEffect(() => {
    if (watchedValues.reservationWeeks && watchedValues.nightsPerWeek) {
      const totalNights = watchedValues.reservationWeeks * watchedValues.nightsPerWeek;
      const nightlyRate = listing?.['Nightly Price'] || 0;
      const cleaningFee = listing?.['Cleaning Fee'] || 0;
      const damageDeposit = listing?.['Damage Deposit'] || 0;

      const subtotal = totalNights * nightlyRate;
      const total = subtotal + cleaningFee + damageDeposit;

      setCalculatedPrice({
        totalNights,
        nightlyRate,
        subtotal,
        cleaningFee,
        damageDeposit,
        total,
      });
    }
  }, [watchedValues.reservationWeeks, watchedValues.nightsPerWeek, listing]);

  // Form submission handler
  async function onSubmit(data: EditProposalFormData) {
    setLoading(true);

    try {
      // Update proposal in database
      const { error } = await supabase
        .from('proposal')
        .update({
          'Move in range start': data.moveInStart.toISOString(),
          'Move in range end': data.moveInEnd.toISOString(),
          'Reservation Span (Weeks)': data.reservationWeeks,
          'Days Selected': data.daysSelected,
          'nights per week (num)': data.nightsPerWeek,
          'check in day': data.checkInDay,
          'check out day': data.checkOutDay,
          'Total Price for Reservation (guest)': calculatedPrice?.total || 0,
          'proposal nightly price': calculatedPrice?.nightlyRate || 0,
          'cleaning fee': calculatedPrice?.cleaningFee || 0,
          'damage deposit': calculatedPrice?.damageDeposit || 0,
          'Modified Date': new Date().toISOString(),
        })
        .eq('_id', proposal._id);

      if (error) throw error;

      alert('Proposal updated successfully!');
      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      console.error('Error updating proposal:', error);
      alert('Failed to update proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Day selection UI
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function toggleDay(day: string) {
    const current = watchedValues.daysSelected || [];
    if (current.includes(day)) {
      setValue('daysSelected', current.filter(d => d !== day));
    } else {
      setValue('daysSelected', [...current, day]);
    }
  }

  // Format currency
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Proposal - {listing?.Name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Modify your rental terms before host review
              </p>
            </div>

            {/* Form Body */}
            <div className="bg-white px-4 py-5 sm:p-6 space-y-6">

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Move-in Start Date
                  </label>
                  <Controller
                    name="moveInStart"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        selected={field.value}
                        onChange={(date) => field.onChange(date)}
                        minDate={new Date()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        dateFormat="MMM dd, yyyy"
                      />
                    )}
                  />
                  {errors.moveInStart && (
                    <p className="mt-1 text-sm text-red-600">{errors.moveInStart.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Move-in End Date
                  </label>
                  <Controller
                    name="moveInEnd"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        selected={field.value}
                        onChange={(date) => field.onChange(date)}
                        minDate={moveInStart}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        dateFormat="MMM dd, yyyy"
                      />
                    )}
                  />
                  {errors.moveInEnd && (
                    <p className="mt-1 text-sm text-red-600">{errors.moveInEnd.message}</p>
                  )}
                </div>
              </div>

              {/* Reservation Span (Auto-calculated) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reservation Span
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-700">
                  {watchedValues.reservationWeeks} weeks
                </div>
              </div>

              {/* Days Selected */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Days Selected ({watchedValues.daysSelected?.length || 0} nights/week)
                </label>
                <div className="flex gap-2 justify-center">
                  {days.map((day, idx) => {
                    const isSelected = watchedValues.daysSelected?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`w-12 h-12 rounded-full font-medium text-sm transition-colors ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title={day}
                      >
                        {dayLetters[idx]}
                      </button>
                    );
                  })}
                </div>
                {errors.daysSelected && (
                  <p className="mt-2 text-sm text-red-600">{errors.daysSelected.message}</p>
                )}
              </div>

              {/* Check-in/Check-out Days */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-in Day
                  </label>
                  <select
                    {...register('checkInDay')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  >
                    {days.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  {errors.checkInDay && (
                    <p className="mt-1 text-sm text-red-600">{errors.checkInDay.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-out Day
                  </label>
                  <select
                    {...register('checkOutDay')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  >
                    {days.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  {errors.checkOutDay && (
                    <p className="mt-1 text-sm text-red-600">{errors.checkOutDay.message}</p>
                  )}
                </div>
              </div>

              {/* Pricing Summary */}
              {calculatedPrice && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Updated Pricing</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {formatCurrency(calculatedPrice.nightlyRate)} × {calculatedPrice.totalNights} nights
                      </span>
                      <span className="font-medium">{formatCurrency(calculatedPrice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cleaning Fee</span>
                      <span className="font-medium">{formatCurrency(calculatedPrice.cleaningFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Damage Deposit</span>
                      <span className="font-medium">{formatCurrency(calculatedPrice.damageDeposit)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-purple-200">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-purple-600 text-lg">
                        {formatCurrency(calculatedPrice.total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Errors Summary */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">Please fix the following errors:</h4>
                  <ul className="text-sm text-red-600 space-y-1">
                    {Object.entries(errors).map(([key, error]) => (
                      <li key={key}>• {error.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={loading || Object.keys(errors).length > 0}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:text-sm"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

#### Testing Checklist

```markdown
- [ ] Form loads with current proposal values
- [ ] Date pickers work and validate min/max dates
- [ ] Day selection toggles correctly
- [ ] Nights per week auto-calculates from selected days
- [ ] Reservation weeks auto-calculates from date range
- [ ] Pricing updates in real-time
- [ ] Check-in/out dropdowns populate correctly
- [ ] Validation errors display for invalid inputs
- [ ] Form submission updates database correctly
- [ ] Success message displays after save
- [ ] Modal closes after successful save
- [ ] Cannot edit proposals past "Under Review" status
- [ ] Loading state prevents duplicate submissions
```

---

### FEATURE 1.3: Cancel Proposal Decision Tree

**Priority:** 🔴 CRITICAL
**Effort:** 2 days
**Status:** Basic implementation exists (50% complete)
**File:** `app/src/islands/pages/GuestProposalsPage.jsx` (lines 301-329)

#### Documentation Reference

- **WORKFLOW-PASS2-ASSIMILATION.md** (lines 218-228) - 7 Cancel Variations
- **COMPREHENSIVE-DOCUMENTATION-SUMMARY.md** (lines 227-228)

#### Requirements Specification

**From Bubble Implementation:**

The cancel button has **7 conditional workflow variations** based on:

1. **Source Check:** Triggered from Compare Terms popup vs main page
2. **Already Cancelled Check:** Proposal already cancelled/rejected
3. **Usual Order Check:** Order ≤5 vs Order >5
4. **House Manual Check:** If order >5 AND house manual exists

**Decision Tree:**

```
Cancel Button Clicked
├─ From Compare Terms popup?
│  └─ YES → Close popup first, then proceed to cancel
│
├─ Already cancelled/rejected?
│  └─ YES → Show "already cancelled" message, stop
│
├─ Usual Order ≤ 5?
│  └─ YES → Quick Cancel Flow
│     ├─ Prompt for reason
│     ├─ Update Status = "Cancelled by Guest"
│     ├─ Set reason for cancellation
│     └─ Show confirmation
│
└─ Usual Order > 5?
   └─ YES → Complex Cancel Flow
      ├─ Check if House Manual exists
      │  └─ YES → Revoke house manual access
      ├─ Prompt for reason
      ├─ Update Status = "Cancelled by Guest"
      ├─ Set reason for cancellation
      ├─ Log cancellation in audit trail
      └─ Send notification to host
```

#### Technical Implementation

##### Step 1: Update Database Schema

Ensure `proposal` table has required fields:

```sql
-- Check if fields exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'proposal'
  AND column_name IN ('Status - Usual Order', 'House Rules', 'reason for cancellation');

-- Add if missing
ALTER TABLE proposal
ADD COLUMN IF NOT EXISTS "Status - Usual Order" INTEGER DEFAULT 0;

-- Note: 'House Rules' and 'reason for cancellation' should already exist
```

##### Step 2: Complete Cancel Implementation

```typescript
/**
 * COMPLETE Cancel Proposal Workflow
 *
 * Implements 7 conditional variations from Bubble
 * Based on: WORKFLOW-PASS2-ASSIMILATION.md lines 218-228
 *
 * File: app/src/islands/pages/GuestProposalsPage.jsx
 * Replace existing handleCancelProposal function (lines 301-329)
 */

/**
 * Cancel Proposal - Complete Decision Tree
 *
 * @param {string} source - 'main' | 'compare-modal' | 'other'
 */
async function handleCancelProposal(source = 'main') {
  if (!selectedProposal) return;

  try {
    // ============================================================
    // CHECK 1: Triggered from Compare Terms popup?
    // ============================================================
    if (source === 'compare-modal') {
      console.log('📍 Cancel triggered from Compare Terms popup');
      // Close the compare modal first
      setShowCompareTermsModal(false);
      // Small delay to allow modal to close
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // ============================================================
    // CHECK 2: Already Cancelled/Rejected?
    // ============================================================
    const currentStatus = selectedProposal.Status || '';
    const alreadyCancelled = [
      'Cancelled by Guest',
      'Cancelled by Host',
      'Cancelled by Split Lease',
      'Rejected by Host',
      'Rejected by Split Lease'
    ].some(status => currentStatus.includes(status));

    if (alreadyCancelled) {
      alert('This proposal has already been cancelled or rejected and cannot be cancelled again.');
      return;
    }

    // ============================================================
    // CHECK 3 & 4: Usual Order Determines Flow Type
    // ============================================================
    const usualOrder = selectedProposal['Status - Usual Order'] || 0;
    const houseRules = selectedProposal['House Rules'];
    const hasHouseManual = houseRules && Array.isArray(houseRules) && houseRules.length > 0;

    console.log('📊 Cancel Decision Factors:', {
      usualOrder,
      hasHouseManual,
      source,
      currentStatus
    });

    // ============================================================
    // FLOW A: Quick Cancel (Usual Order ≤ 5)
    // ============================================================
    if (usualOrder <= 5) {
      console.log('⚡ Quick Cancel Flow (Order ≤ 5)');

      const confirmed = window.confirm(
        'Are you sure you want to cancel this proposal? This action cannot be undone.'
      );

      if (!confirmed) return;

      const reason = window.prompt(
        'Please provide a reason for cancellation (optional):'
      );

      if (reason === null) return; // User clicked cancel on prompt

      // Update database
      const { error } = await supabase
        .from('proposal')
        .update({
          Status: 'Cancelled by Guest',
          'reason for cancellation': reason || 'No reason provided',
          'Modified Date': new Date().toISOString()
        })
        .eq('_id', selectedProposal._id);

      if (error) throw error;

      console.log('✅ Quick cancel completed');
      alert('Your proposal has been cancelled successfully.');

      // Reload proposal
      await loadProposalDetails(selectedProposal);
      return;
    }

    // ============================================================
    // FLOW B: Complex Cancel (Usual Order > 5)
    // ============================================================
    console.log('🔄 Complex Cancel Flow (Order > 5)');

    // Sub-check: House Manual Access Revocation
    if (hasHouseManual) {
      console.log('🏠 House manual detected - will revoke access');
    }

    const confirmed = window.confirm(
      hasHouseManual
        ? 'This proposal has progressed past the initial review stage. Cancelling will revoke your access to the house manual and any shared documents. Are you sure you want to proceed?'
        : 'This proposal has progressed past the initial review stage. Are you sure you want to cancel?'
    );

    if (!confirmed) return;

    const reason = window.prompt(
      'Please provide a detailed reason for cancellation (required for advanced-stage proposals):'
    );

    if (!reason || reason.trim() === '') {
      alert('A cancellation reason is required for proposals at this stage.');
      return;
    }

    // Begin transaction-like updates
    const updates = [];

    // Update 1: Change proposal status
    updates.push(
      supabase
        .from('proposal')
        .update({
          Status: 'Cancelled by Guest',
          'reason for cancellation': reason.trim(),
          'Modified Date': new Date().toISOString()
        })
        .eq('_id', selectedProposal._id)
    );

    // Update 2: Revoke house manual access (if applicable)
    if (hasHouseManual) {
      // TODO: Implement house manual access revocation
      // This might involve:
      // - Removing user from shared document permissions
      // - Updating access control table
      // - Logging revocation in audit trail
      console.log('🔒 Revoking house manual access (placeholder)');

      // Example implementation:
      // updates.push(
      //   supabase
      //     .from('house_manual_access')
      //     .update({ revoked: true, revoked_at: new Date().toISOString() })
      //     .eq('proposal_id', selectedProposal._id)
      // );
    }

    // Update 3: Create audit log entry (best practice for complex cancellations)
    updates.push(
      supabase
        .from('audit_log')
        .insert({
          entity_type: 'proposal',
          entity_id: selectedProposal._id,
          action: 'cancel',
          actor_id: currentUser?._id || localStorage.getItem('splitlease_session_id'),
          details: {
            reason,
            usual_order: usualOrder,
            house_manual_revoked: hasHouseManual,
            cancelled_at: new Date().toISOString()
          }
        })
        .select()
    );

    // Execute all updates
    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('❌ Errors during complex cancel:', errors);
      throw new Error('Failed to cancel proposal completely. Please contact support.');
    }

    console.log('✅ Complex cancel completed');

    // Success message
    alert(
      hasHouseManual
        ? 'Your proposal has been cancelled. Access to the house manual has been revoked. The host will be notified of your cancellation.'
        : 'Your proposal has been cancelled. The host will be notified.'
    );

    // TODO: Send notification to host (optional - can be backend job)
    // sendCancellationNotification(selectedProposal._host._id, selectedProposal._id, reason);

    // Reload proposal
    await loadProposalDetails(selectedProposal);

  } catch (err) {
    console.error('❌ Error during cancel proposal:', err);
    alert('Failed to cancel proposal. Please try again or contact support if the issue persists.');
  }
}
```

##### Step 3: Create Audit Log Table (Optional but Recommended)

```sql
-- Create audit_log table for tracking important actions
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
```

##### Step 4: Update Compare Terms Modal

Add cancel button with source parameter:

```typescript
// In CompareTermsModal.jsx
<button
  onClick={() => {
    handleCancelProposal('compare-modal');
    onClose();
  }}
  className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50"
>
  Cancel Proposal
</button>
```

#### Testing Checklist

```markdown
**Test Case 1: Cancel from Compare Modal**
- [ ] Open Compare Terms modal
- [ ] Click cancel from modal
- [ ] Verify modal closes first
- [ ] Verify cancellation proceeds

**Test Case 2: Already Cancelled**
- [ ] Cancel a proposal
- [ ] Try to cancel same proposal again
- [ ] Verify "already cancelled" message appears

**Test Case 3: Quick Cancel (Order ≤ 5)**
- [ ] Create proposal with Status Order ≤ 5
- [ ] Cancel proposal
- [ ] Verify simple confirmation dialog
- [ ] Verify reason prompt (optional)
- [ ] Verify status updates to "Cancelled by Guest"

**Test Case 4: Complex Cancel (Order > 5, No Manual)**
- [ ] Create proposal with Status Order > 5
- [ ] Ensure no house rules
- [ ] Cancel proposal
- [ ] Verify detailed confirmation dialog
- [ ] Verify reason prompt (required)
- [ ] Verify status updates

**Test Case 5: Complex Cancel (Order > 5, With Manual)**
- [ ] Create proposal with Status Order > 5
- [ ] Add house rules to proposal
- [ ] Cancel proposal
- [ ] Verify house manual warning in dialog
- [ ] Verify access revocation message
- [ ] Verify audit log entry created

**Test Case 6: Cancel Validation**
- [ ] Attempt complex cancel without reason
- [ ] Verify error message "reason required"
- [ ] Cancel is prevented

**Test Case 7: Database Integrity**
- [ ] After each cancel, verify:
  - [ ] Status field updated correctly
  - [ ] Reason field populated
  - [ ] Modified Date updated
  - [ ] Audit log entry exists (if applicable)
```

---

## Phase 2: High-Priority Features

### FEATURE 2.1: External Reviews System

**Priority:** 🟡 HIGH
**Effort:** 2-3 days
**Status:** Not implemented (0% complete)
**Files:** New component + Database migration

#### Documentation Reference

- **DESIGN-FINAL-ASSIMILATION.md** (lines 340-383) - External Review Import
- **COMPREHENSIVE-DOCUMENTATION-SUMMARY.md** (lines 432-436)

#### Requirements Specification

**From Bubble Implementation:**

**Data Type:** `Reviews Listings External`

**Fields:**
- `platform`: "Airbnb" | "VRBO"
- `reviewerName`: string
- `reviewerPhoto`: string (URL)
- `reviewDate`: Date
- `rating`: number (1-5 or 1-10 scale)
- `description`: string (truncated to 200 chars in UI)
- `originalUrl`: string (optional)

**Display Location:**
- Host Profile Modal
- Shown below verification badges
- Grouped by platform

**Purpose:**
- Build trust with external verified reviews
- Show host credibility across platforms
- Display social proof from established marketplaces

#### Technical Implementation

##### Step 1: Database Schema

```sql
-- Create external_reviews table
CREATE TABLE IF NOT EXISTS external_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listing(_id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('Airbnb', 'VRBO', 'Booking.com')),
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_photo TEXT,
    review_date DATE NOT NULL,
    rating DECIMAL(3,2) NOT NULL CHECK (rating >= 0 AND rating <= 10),
    description TEXT NOT NULL,
    original_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_external_reviews_listing ON external_reviews(listing_id);
CREATE INDEX idx_external_reviews_platform ON external_reviews(platform);
CREATE INDEX idx_external_reviews_date ON external_reviews(review_date DESC);

-- Add RLS policy for read access
ALTER TABLE external_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to external reviews"
ON external_reviews FOR SELECT
USING (true);
```

##### Step 2: Component Implementation

```typescript
// app/src/islands/shared/ExternalReviews.jsx

/**
 * ExternalReviews Component
 *
 * Displays verified reviews from Airbnb, VRBO, etc.
 * Shows platform badge, reviewer info, rating, and truncated description
 *
 * Used in: HostProfileModal
 */

export default function ExternalReviews({ listingId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!listingId) return;

    async function loadReviews() {
      try {
        const { data, error } = await supabase
          .from('external_reviews')
          .select('*')
          .eq('listing_id', listingId)
          .order('review_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        setReviews(data || []);
      } catch (err) {
        console.error('Error loading external reviews:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, [listingId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || reviews.length === 0) {
    return null; // Don't show section if no reviews
  }

  // Group reviews by platform
  const groupedReviews = reviews.reduce((acc, review) => {
    if (!acc[review.platform]) acc[review.platform] = [];
    acc[review.platform].push(review);
    return acc;
  }, {});

  // Platform badge colors
  const platformColors = {
    'Airbnb': 'bg-red-100 text-red-700',
    'VRBO': 'bg-blue-100 text-blue-700',
    'Booking.com': 'bg-green-100 text-green-700',
  };

  // Truncate description to 200 chars
  function truncate(text, maxLength = 200) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  // Format date
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  }

  // Render star rating
  function renderStars(rating) {
    const stars = Math.round(rating); // Convert to 5-star if needed
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < stars ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  }

  return (
    <div className="border-t pt-4 mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-4">
        External Reviews ({reviews.length})
      </h4>

      <div className="space-y-4">
        {Object.entries(groupedReviews).map(([platform, platformReviews]) => (
          <div key={platform} className="space-y-3">
            {/* Platform Header */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-medium rounded ${platformColors[platform] || 'bg-gray-100 text-gray-700'}`}>
                {platform}
              </span>
              <span className="text-xs text-gray-500">
                {platformReviews.length} {platformReviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {/* Reviews */}
            {platformReviews.slice(0, 3).map((review) => (
              <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                {/* Reviewer Info */}
                <div className="flex items-start gap-3 mb-2">
                  {review.reviewer_photo ? (
                    <img
                      src={review.reviewer_photo}
                      alt={review.reviewer_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium">
                      {review.reviewer_name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {review.reviewer_name}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatDate(review.review_date)}
                      </span>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-sm text-gray-700 leading-relaxed">
                  {truncate(review.description, 200)}
                </p>

                {/* Original Link */}
                {review.original_url && (
                  <a
                    href={review.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-purple-600 hover:text-purple-700"
                  >
                    View on {platform}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            ))}

            {/* Show More Link */}
            {platformReviews.length > 3 && (
              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                Show {platformReviews.length - 3} more {platform} reviews
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

##### Step 3: Update Host Profile Modal

```typescript
// In HostProfileModal.jsx, add after verification section:

import ExternalReviews from '../shared/ExternalReviews.jsx';

// ... inside modal body:
{listing && (
  <>
    {/* Existing featured listing section */}

    {/* NEW: External Reviews */}
    <ExternalReviews listingId={listing._id} />
  </>
)}
```

##### Step 4: Data Import Strategy

**Option A: Manual Data Entry (Quick Start)**
- Create admin interface to manually add reviews
- Copy/paste from Airbnb/VRBO
- Good for initial launch with 5-10 key reviews

**Option B: Web Scraping (Automated)**
- Build scraper for Airbnb/VRBO review pages
- Schedule daily/weekly syncs
- Requires parsing HTML (fragile, may break)
- Legal considerations

**Option C: API Integration (Best Long-term)**
- Use official APIs if available
- Airbnb doesn't have public review API
- VRBO/HomeAway might have partner access
- Most reliable but requires partnerships

**Recommended:** Start with Option A, transition to Option B/C later.

##### Step 5: Admin Interface for Import (Optional)

```typescript
// app/src/islands/admin/ImportReviews.jsx

export default function ImportReviews() {
  const [formData, setFormData] = useState({
    listingId: '',
    platform: 'Airbnb',
    reviewerName: '',
    reviewerPhoto: '',
    reviewDate: '',
    rating: '',
    description: '',
    originalUrl: '',
  });

  async function handleSubmit(e) {
    e.preventDefault();

    const { error } = await supabase
      .from('external_reviews')
      .insert({
        listing_id: formData.listingId,
        platform: formData.platform,
        reviewer_name: formData.reviewerName,
        reviewer_photo: formData.reviewerPhoto || null,
        review_date: formData.reviewDate,
        rating: parseFloat(formData.rating),
        description: formData.description,
        original_url: formData.originalUrl || null,
      });

    if (error) {
      alert('Error importing review: ' + error.message);
    } else {
      alert('Review imported successfully!');
      // Reset form
      setFormData({
        listingId: '',
        platform: 'Airbnb',
        reviewerName: '',
        reviewerPhoto: '',
        reviewDate: '',
        rating: '',
        description: '',
        originalUrl: '',
      });
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Import External Review</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Listing ID</label>
          <input
            type="text"
            value={formData.listingId}
            onChange={(e) => setFormData({...formData, listingId: e.target.value})}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Platform</label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({...formData, platform: e.target.value})}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="Airbnb">Airbnb</option>
            <option value="VRBO">VRBO</option>
            <option value="Booking.com">Booking.com</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Reviewer Name</label>
          <input
            type="text"
            value={formData.reviewerName}
            onChange={(e) => setFormData({...formData, reviewerName: e.target.value})}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Reviewer Photo URL (optional)</label>
          <input
            type="url"
            value={formData.reviewerPhoto}
            onChange={(e) => setFormData({...formData, reviewerPhoto: e.target.value})}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Review Date</label>
          <input
            type="date"
            value={formData.reviewDate}
            onChange={(e) => setFormData({...formData, reviewDate: e.target.value})}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Rating (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            step="0.1"
            value={formData.rating}
            onChange={(e) => setFormData({...formData, rating: e.target.value})}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Review Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border rounded"
            rows="4"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Original URL (optional)</label>
          <input
            type="url"
            value={formData.originalUrl}
            onChange={(e) => setFormData({...formData, originalUrl: e.target.value})}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Import Review
        </button>
      </form>
    </div>
  );
}
```

#### Testing Checklist

```markdown
- [ ] Database table created successfully
- [ ] Can insert review records manually
- [ ] Reviews load in HostProfileModal
- [ ] Reviews grouped by platform correctly
- [ ] Star ratings display correctly
- [ ] Review text truncates at 200 characters
- [ ] Reviewer photos display (or fallback initials)
- [ ] "View on Platform" links work
- [ ] No reviews = section hidden
- [ ] Loading state displays during fetch
- [ ] Multiple platforms display separately
- [ ] Admin import interface works (if implemented)
```

---

