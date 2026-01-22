# Code Refactoring Plan - ../app

Date: 2026-01-21
Audit Type: general

## Summary

This plan addresses **18+ duplicate formatDate implementations** and consolidates them to use the canonical `lib/dateFormatters.js`. The goal is to improve maintainability and ensure consistent date formatting across the application.

### Files with Duplicate formatDate Implementations:
1. `src/lib/dateFormatters.js` (CANONICAL - keep as-is)
2. `src/lib/proposals/dataTransformers.js:235`
3. `src/logic/processors/proposals/processProposalData.js:213`
4. `src/islands/shared/ExternalReviews.jsx:79`
5. `src/islands/shared/ScheduleCohost/cohostService.js:96,112,126`
6. `src/islands/shared/HostEditingProposal/types.js:187,212`
7. `src/islands/pages/MessagingPage/components/MessageThread.jsx:19`
8. `src/islands/pages/HostProposalsPage/InfoGrid.jsx:22`
9. `src/islands/pages/HostProposalsPage/formatters.js:23,54,84`
10. `src/islands/pages/ListingDashboardPage/components/PropertyInfoSection.jsx:111`
11. `src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx:82`
12. `src/islands/pages/proposals/VirtualMeetingsSection.jsx:74`
13. `src/islands/pages/proposals/displayUtils.js:37`
14. `src/islands/modals/ProposalDetailsModal.jsx:101`
15. `src/islands/modals/GuestEditingProposalModal.jsx:74,84,94`
16. `src/islands/modals/CompareTermsModal.jsx:96`

### Critical Files (DO NOT MODIFY):
- `src/lib/supabase.js` (93 dependents)
- `src/lib/secureStorage.js` (89 dependents)
- `src/lib/auth.js` (79 dependents)
- `src/lib/constants.js` (52 dependents)
- `src/lib/dataLookups.js` (40 dependents)

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 1, 2)

### CHUNK 1: Remove duplicate formatDate from HostProposalsPage/formatters.js
**File:** `src/islands/pages/HostProposalsPage/formatters.js`
**Line:** 23-86
**Issue:** Contains duplicate formatDate, formatFullDate, formatDateTime, and formatDateRange functions that duplicate lib/dateFormatters.js
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
/**
 * Format a date as M/D/YY
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
}

/**
 * Format a date as full date (e.g., "Mar 28, 2025")
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatFullDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a date with time (e.g., "Mar 28, 2025 12:00 pm")
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', '');
}

/**
 * Format time only (e.g., "2:00 pm")
 * @param {string} time - The time string
 * @returns {string} Formatted time string
 */
export function formatTime(time) {
  if (!time) return '';
  return time.toLowerCase();
}

/**
 * Format a date range
 * @param {Date|string} start - Start date
 * @param {Date|string} end - End date
 * @returns {string} Formatted date range
 */
export function formatDateRange(start, end) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}
```

**Refactored Code:**
```javascript
/**
 * Formatting utilities for Host Proposals Page
 *
 * Re-exports date functions from the canonical dateFormatters module
 * for backwards compatibility.
 */
import { formatDateDisplay, formatDateTimeDisplay, formatDateRange as formatDateRangeCanonical } from '../../../lib/dateFormatters.js';

/**
 * Format a number as currency (USD)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format a date as M/D/YY
 * @deprecated Use formatDateDisplay from lib/dateFormatters.js with { format: 'short' }
 */
export function formatDate(date) {
  return formatDateDisplay(date, { format: 'short', fallback: '' });
}

/**
 * Format a date as full date (e.g., "Mar 28, 2025")
 * @deprecated Use formatDateDisplay from lib/dateFormatters.js with { format: 'medium' }
 */
export function formatFullDate(date) {
  return formatDateDisplay(date, { format: 'medium', fallback: '' });
}

/**
 * Format a date with time (e.g., "Mar 28, 2025 12:00 pm")
 * @deprecated Use formatDateTimeDisplay from lib/dateFormatters.js
 */
export function formatDateTime(date) {
  return formatDateTimeDisplay(date, { fallback: '' });
}

/**
 * Format time only (e.g., "2:00 pm")
 * @param {string} time - The time string
 * @returns {string} Formatted time string
 */
export function formatTime(time) {
  if (!time) return '';
  return time.toLowerCase();
}

/**
 * Format a date range
 * @deprecated Use formatDateRange from lib/dateFormatters.js
 */
export function formatDateRange(start, end) {
  return formatDateRangeCanonical(start, end, { format: 'short' });
}
```

**Testing:**
- [ ] Verify /host-proposals page loads without errors
- [ ] Check that dates display correctly in proposal cards
- [ ] Verify date range formatting works correctly

~~~~~

### CHUNK 2: Remove duplicate formatDate from HostProposalsPage/InfoGrid.jsx
**File:** `src/islands/pages/HostProposalsPage/InfoGrid.jsx`
**Line:** 22-31
**Issue:** Contains local formatDate function that duplicates lib/dateFormatters.js
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
/**
 * Format date for display
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string like "Jan 15, 2026"
 */
function formatDate(date) {
  if (!date) return 'TBD';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

// Replace local formatDate usage with:
// formatDateDisplay(date, { format: 'medium', fallback: 'TBD' })
```

**Full File Refactored Code:**
```javascript
/**
 * InfoGrid Component (V7 Design)
 *
 * 5-column info grid displaying:
 * - Move-in date
 * - Move-out date
 * - Duration (weeks)
 * - Schedule (day range)
 * - Nights per week
 *
 * Responsive: 5 cols on desktop, 2 cols on mobile
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format schedule range from days selected
 * @param {Array} daysSelected - Array of 0-indexed days
 * @returns {string} Schedule string like "Mon - Fri"
 */
function formatScheduleRange(daysSelected) {
  if (!Array.isArray(daysSelected) || daysSelected.length === 0) return 'TBD';

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sorted = [...daysSelected].map(d => Number(d)).sort((a, b) => a - b);

  if (sorted.length === 1) {
    return dayNames[sorted[0]] || 'TBD';
  }

  const first = dayNames[sorted[0]] || '';
  const last = dayNames[sorted[sorted.length - 1]] || '';
  return `${first} - ${last}`;
}

/**
 * Calculate nights per week from days selected
 * @param {Array} daysSelected - Array of 0-indexed days
 * @returns {string} Nights string like "4/week"
 */
function calculateNights(daysSelected) {
  if (!Array.isArray(daysSelected) || daysSelected.length === 0) return 'TBD';
  // Nights = days - 1 (guest leaves on last day)
  const nights = Math.max(0, daysSelected.length - 1);
  return `${nights}/week`;
}

/**
 * InfoGrid displays proposal details in a grid layout
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 */
export function InfoGrid({ proposal }) {
  const moveIn = proposal?.start_date || proposal?.move_in_date;
  const moveOut = proposal?.end_date || proposal?.move_out_date;
  const weeks = proposal?.duration_weeks || proposal?.weeks || proposal?.total_weeks;
  const daysSelected = proposal?.days_selected || proposal?.Days_Selected || [];

  // Calculate duration from dates if not provided
  let duration = weeks;
  if (!duration && moveIn && moveOut) {
    const start = new Date(moveIn);
    const end = new Date(moveOut);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    duration = Math.round(diffDays / 7);
  }

  return (
    <div className="hp7-info-grid">
      <div className="hp7-info-item">
        <div className="hp7-info-label">Move-in</div>
        <div className="hp7-info-value">{formatDateDisplay(moveIn, { format: 'medium', fallback: 'TBD' })}</div>
      </div>
      <div className="hp7-info-item">
        <div className="hp7-info-label">Move-out</div>
        <div className="hp7-info-value">{formatDateDisplay(moveOut, { format: 'medium', fallback: 'TBD' })}</div>
      </div>
      <div className="hp7-info-item">
        <div className="hp7-info-label">Duration</div>
        <div className="hp7-info-value">{duration ? `${duration} weeks` : 'TBD'}</div>
      </div>
      <div className="hp7-info-item">
        <div className="hp7-info-label">Schedule</div>
        <div className="hp7-info-value">{formatScheduleRange(daysSelected)}</div>
      </div>
      <div className="hp7-info-item">
        <div className="hp7-info-label">Nights</div>
        <div className="hp7-info-value">{calculateNights(daysSelected)}</div>
      </div>
    </div>
  );
}

export default InfoGrid;
```

**Testing:**
- [ ] Verify InfoGrid renders correctly with proposal data
- [ ] Check move-in and move-out dates display as "Jan 15, 2026" format
- [ ] Verify TBD fallback works for missing dates

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 3, 4)

### CHUNK 3: Remove duplicate formatDate from proposals/displayUtils.js
**File:** `src/islands/pages/proposals/displayUtils.js`
**Line:** 37-48
**Issue:** Contains duplicate formatDate function that should use lib/dateFormatters.js
**Affected Pages:** /guest-proposals, /view-split-lease

**Current Code:**
```javascript
/**
 * Format date for display
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(dateValue) {
  if (!dateValue) return 'TBD';

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return 'TBD';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format date for display
 * @deprecated Use formatDateDisplay from lib/dateFormatters.js directly
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(dateValue) {
  return formatDateDisplay(dateValue, { format: 'medium', fallback: 'TBD' });
}
```

**Testing:**
- [ ] Verify proposal cards display dates correctly
- [ ] Check TBD fallback for missing dates
- [ ] Test with various date formats (ISO strings, Date objects)

~~~~~

### CHUNK 4: Remove duplicate formatDateTime from proposals/VirtualMeetingsSection.jsx
**File:** `src/islands/pages/proposals/VirtualMeetingsSection.jsx`
**Line:** 74-85
**Issue:** Contains local formatDateTime function that duplicates lib/dateFormatters.js
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
```

**Refactored Code:**
```javascript
import { formatDateTimeDisplay } from '../../../lib/dateFormatters.js';

// Replace local formatDateTime usage with:
// formatDateTimeDisplay(dateTimeStr, { fallback: '' })
```

**Testing:**
- [ ] Verify virtual meeting dates display correctly
- [ ] Check time formatting includes day of week

~~~~~

## PAGE GROUP: /listing-dashboard (Chunks: 5, 6)

### CHUNK 5: Remove duplicate formatDate from ListingDashboardPage/AvailabilitySection.jsx
**File:** `src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx`
**Line:** 82-86
**Issue:** Contains local formatDate function inside component that should use lib/dateFormatters.js
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../../lib/dateFormatters.js';

// Add import at top of file, then replace formatDate usage with:
// formatDateDisplay(date, { format: 'short', fallback: '' })
// Note: short format gives M/D/YY, but the current format uses MM/DD/YYYY
// For exact match, use a custom format or keep the local function
```

**Note:** The current format `MM/DD/YYYY` doesn't match any standard format in dateFormatters.js. Consider either:
1. Adding a new format option to dateFormatters.js
2. Keeping the local function for this specific use case

**Testing:**
- [ ] Verify blocked dates display correctly in the calendar
- [ ] Check range selection hint shows correct date format

~~~~~

### CHUNK 6: Remove duplicate formatDate from ListingDashboardPage/PropertyInfoSection.jsx
**File:** `src/islands/pages/ListingDashboardPage/components/PropertyInfoSection.jsx`
**Line:** 111-120
**Issue:** Contains local formatDate function that duplicates lib/dateFormatters.js
**Affected Pages:** /listing-dashboard

**Current Code:**
```javascript
function formatDate(date) {
  if (!date) return 'Not set';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Not set';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../../lib/dateFormatters.js';

// Replace local formatDate with:
// formatDateDisplay(date, { format: 'medium', fallback: 'Not set' })
```

**Testing:**
- [ ] Verify property info section displays dates correctly
- [ ] Check "Not set" fallback works for missing dates

~~~~~

## PAGE GROUP: /messaging (Chunk: 7)

### CHUNK 7: Refactor MessageThread formatDateSeparator to use dateFormatters
**File:** `src/islands/pages/MessagingPage/components/MessageThread.jsx`
**Line:** 19-37
**Issue:** Contains local formatDateSeparator function with custom "Today"/"Yesterday" logic
**Affected Pages:** /messaging

**Current Code:**
```javascript
function formatDateSeparator(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../../lib/dateFormatters.js';

/**
 * Format date for separator display with relative "Today"/"Yesterday" labels
 * Note: This has custom logic for relative dates that isn't in dateFormatters.js
 * Consider adding a formatRelativeDate function to dateFormatters.js
 */
function formatDateSeparator(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    // Use canonical formatter for non-relative dates
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
```

**Note:** This function has custom "Today"/"Yesterday" logic that isn't in dateFormatters.js. Consider adding a `formatRelativeDate` function to the canonical module in a future refactor.

**Testing:**
- [ ] Verify message thread date separators show "Today" for today's messages
- [ ] Check "Yesterday" label works correctly
- [ ] Verify older dates show full weekday format

~~~~~

## PAGE GROUP: Modals (Chunks: 8, 9, 10)

### CHUNK 8: Remove duplicate formatDate from ProposalDetailsModal
**File:** `src/islands/modals/ProposalDetailsModal.jsx`
**Line:** 101-108
**Issue:** Contains local formatDate function that duplicates lib/dateFormatters.js
**Affected Pages:** Multiple (modal used across guest-proposals, host-proposals)

**Current Code:**
```javascript
  // Format date
  function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../lib/dateFormatters.js';

// Replace local formatDate with:
// formatDateDisplay(date, { format: 'long', fallback: '' })
// Note: Current format includes weekday which isn't in dateFormatters.js 'long' format
// Need to add weekday support or keep local function
```

**Note:** The current format includes weekday ("Monday, January 15, 2025") which isn't supported by dateFormatters.js. Consider either:
1. Adding a 'full' format to dateFormatters.js that includes weekday
2. Keeping this local function for now

**Testing:**
- [ ] Verify proposal details modal shows full date with weekday
- [ ] Test modal opens correctly from proposal cards

~~~~~

### CHUNK 9: Remove duplicate formatDate functions from GuestEditingProposalModal
**File:** `src/islands/modals/GuestEditingProposalModal.jsx`
**Line:** 74-96
**Issue:** Contains formatDateFull, formatDateShort, and formatDate functions that duplicate lib/dateFormatters.js
**Affected Pages:** /guest-proposals (modal)

**Current Code:**
```javascript
function formatDateFull(date) {
  if (!date || !(date instanceof Date)) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

function formatDateShort(date) {
  if (!date || !(date instanceof Date)) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function formatDate(date, isSmallScreen = false) {
  return isSmallScreen ? formatDateShort(date) : formatDateFull(date)
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../lib/dateFormatters.js';

/**
 * Format date with weekday for full display
 * Note: dateFormatters.js doesn't have weekday support yet
 * Keeping local for now, consider adding to canonical module
 */
function formatDateFull(date) {
  if (!date || !(date instanceof Date)) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

function formatDateShort(date) {
  if (!date || !(date instanceof Date)) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

function formatDate(date, isSmallScreen = false) {
  return isSmallScreen ? formatDateShort(date) : formatDateFull(date)
}
```

**Note:** These functions include weekday formatting that isn't in dateFormatters.js. Requires enhancement to canonical module first.

**Testing:**
- [ ] Verify guest editing modal displays dates correctly on desktop
- [ ] Check responsive date format on mobile (shorter format)

~~~~~

### CHUNK 10: Remove duplicate formatDate from CompareTermsModal
**File:** `src/islands/modals/CompareTermsModal.jsx`
**Line:** 96-106
**Issue:** Contains local formatDate function that duplicates lib/dateFormatters.js
**Affected Pages:** /guest-proposals, /host-proposals (modal)

**Current Code:**
```javascript
  function formatDate(dateString) {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'TBD';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../lib/dateFormatters.js';

// Replace local formatDate with:
// formatDateDisplay(dateString, { format: 'medium', fallback: 'TBD' })
```

**Testing:**
- [ ] Verify compare terms modal shows dates correctly
- [ ] Check TBD fallback for missing dates

~~~~~

## PAGE GROUP: Shared Components (Chunks: 11, 12, 13)

### CHUNK 11: Remove duplicate formatDate from ExternalReviews.jsx
**File:** `src/islands/shared/ExternalReviews.jsx`
**Line:** 79-84
**Issue:** Contains local formatDate function inside component
**Affected Pages:** /view-split-lease, /host-profile (where reviews are shown)

**Current Code:**
```javascript
  // Format date
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  }
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../lib/dateFormatters.js';

// Note: Current format is "Jan 2025" (month + year only)
// dateFormatters.js doesn't have this format
// Consider adding a 'month-year' format or keep local
```

**Note:** The current format shows only month and year ("Jan 2025") which isn't in dateFormatters.js. This is a unique use case for reviews.

**Testing:**
- [ ] Verify external reviews show month + year format
- [ ] Check reviews display correctly in host profile modal

~~~~~

### CHUNK 12: Remove duplicate date formatters from HostEditingProposal/types.js
**File:** `src/islands/shared/HostEditingProposal/types.js`
**Line:** 187-226
**Issue:** Contains formatDate and formatDateForInput functions that partially duplicate lib/dateFormatters.js
**Affected Pages:** /host-proposals (editing modal)

**Current Code:**
```javascript
export function formatDate(date, format = 'full') {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  if (format === 'full') {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // short format: M/D/YYYY
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function formatDateForInput(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format date for display
 * @deprecated Use formatDateDisplay from lib/dateFormatters.js
 */
export function formatDate(date, format = 'full') {
  if (format === 'full') {
    // Note: weekday not supported in dateFormatters.js yet
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return formatDateDisplay(date, { format: 'short', fallback: '' });
}

/**
 * Format date for HTML date input (YYYY-MM-DD)
 */
export function formatDateForInput(date) {
  return formatDateDisplay(date, { format: 'iso', fallback: '' });
}
```

**Testing:**
- [ ] Verify host editing modal displays dates correctly
- [ ] Check date input fields populate correctly with ISO format

~~~~~

### CHUNK 13: Remove duplicate date formatters from ScheduleCohost/cohostService.js
**File:** `src/islands/shared/ScheduleCohost/cohostService.js`
**Line:** 96-140
**Issue:** Contains formatDateTime, formatDateForDisplay, and formatDateForBubble functions
**Affected Pages:** /schedule-cohost

**Current Code:**
```javascript
export function formatDateTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function formatDateForDisplay(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateForBubble(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  // Bubble expects ISO string
  return d.toISOString();
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay, formatDateTimeDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format datetime for display
 * @deprecated Use formatDateTimeDisplay from lib/dateFormatters.js
 */
export function formatDateTime(date) {
  return formatDateTimeDisplay(date, { fallback: '' });
}

/**
 * Format date for display with weekday
 * Note: dateFormatters.js long format doesn't include weekday
 */
export function formatDateForDisplay(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format date for Bubble.io API (ISO string)
 */
export function formatDateForBubble(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}
```

**Testing:**
- [ ] Verify cohost scheduling shows dates correctly
- [ ] Check Bubble.io API calls receive ISO format dates

~~~~~

## PAGE GROUP: Logic Processors (Chunks: 14, 15)

### CHUNK 14: Remove duplicate formatDate from processProposalData.js
**File:** `src/logic/processors/proposals/processProposalData.js`
**Line:** 213-244
**Issue:** Contains formatDate and formatDateTime functions that duplicate lib/dateFormatters.js
**Affected Pages:** All pages using proposal data processing

**Current Code:**
```javascript
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateTime(datetime) {
  if (!datetime) return '';
  const d = new Date(datetime);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay, formatDateTimeDisplay } from '../../../lib/dateFormatters.js';

/**
 * Format date for display
 * @deprecated Use formatDateDisplay from lib/dateFormatters.js
 */
export function formatDate(date) {
  return formatDateDisplay(date, { format: 'medium', fallback: '' });
}

/**
 * Format datetime for display
 * @deprecated Use formatDateTimeDisplay from lib/dateFormatters.js
 */
export function formatDateTime(datetime) {
  return formatDateTimeDisplay(datetime, { fallback: '' });
}
```

**Testing:**
- [ ] Verify proposal data processing returns correctly formatted dates
- [ ] Check downstream components receive expected date formats

~~~~~

### CHUNK 15: Remove duplicate formatDate from lib/proposals/dataTransformers.js
**File:** `src/lib/proposals/dataTransformers.js`
**Line:** 235-247
**Issue:** Contains formatDate function that duplicates lib/dateFormatters.js
**Affected Pages:** All pages using proposal data transformers

**Current Code:**
```javascript
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
```

**Refactored Code:**
```javascript
import { formatDateDisplay } from '../dateFormatters.js';

/**
 * Format date for display
 * @deprecated Use formatDateDisplay from lib/dateFormatters.js
 */
export function formatDate(date) {
  return formatDateDisplay(date, { format: 'medium', fallback: '' });
}
```

**Testing:**
- [ ] Verify proposal data transformers work correctly
- [ ] Check all proposal cards display dates properly

~~~~~

## PREREQUISITE: Enhance lib/dateFormatters.js (Chunk: 0)

### CHUNK 0: Add weekday support to dateFormatters.js
**File:** `src/lib/dateFormatters.js`
**Line:** 18-61
**Issue:** Missing 'full' format with weekday and 'month-year' format needed by various components
**Affected Pages:** All pages (this is the canonical formatter)

**Current Code:**
```javascript
export function formatDateDisplay(dateValue, options = {}) {
  const { format = 'medium', fallback = '' } = options;

  if (!dateValue) return fallback;

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return fallback;

  switch (format) {
    case 'short':
      // M/D/YY format
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear().toString().slice(-2);
      return `${month}/${day}/${year}`;

    case 'medium':
      // Jan 15, 2025 format
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

    case 'long':
      // January 15, 2025 format
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

    case 'iso':
      // 2025-01-15 format
      return date.toISOString().split('T')[0];

    default:
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
  }
}
```

**Refactored Code:**
```javascript
export function formatDateDisplay(dateValue, options = {}) {
  const { format = 'medium', fallback = '' } = options;

  if (!dateValue) return fallback;

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return fallback;

  switch (format) {
    case 'short':
      // M/D/YY format
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear().toString().slice(-2);
      return `${month}/${day}/${year}`;

    case 'medium':
      // Jan 15, 2025 format
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

    case 'long':
      // January 15, 2025 format
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

    case 'full':
      // Monday, January 15, 2025 format (includes weekday)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

    case 'full-short':
      // Mon, Jan 15, 2025 format (short weekday)
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

    case 'month-year':
      // Jan 2025 format (for reviews, etc.)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });

    case 'iso':
      // 2025-01-15 format
      return date.toISOString().split('T')[0];

    default:
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
  }
}
```

**Testing:**
- [ ] Verify all existing format options still work
- [ ] Test new 'full' format returns weekday + full date
- [ ] Test new 'full-short' format returns short weekday + short date
- [ ] Test new 'month-year' format returns only month and year

~~~~~

## Summary

| Chunk | File | Page Group | Priority |
|-------|------|------------|----------|
| 0 | `src/lib/dateFormatters.js` | PREREQUISITE | HIGH |
| 1 | `src/islands/pages/HostProposalsPage/formatters.js` | /host-proposals | HIGH |
| 2 | `src/islands/pages/HostProposalsPage/InfoGrid.jsx` | /host-proposals | HIGH |
| 3 | `src/islands/pages/proposals/displayUtils.js` | /guest-proposals | HIGH |
| 4 | `src/islands/pages/proposals/VirtualMeetingsSection.jsx` | /guest-proposals | MEDIUM |
| 5 | `src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx` | /listing-dashboard | MEDIUM |
| 6 | `src/islands/pages/ListingDashboardPage/components/PropertyInfoSection.jsx` | /listing-dashboard | MEDIUM |
| 7 | `src/islands/pages/MessagingPage/components/MessageThread.jsx` | /messaging | LOW |
| 8 | `src/islands/modals/ProposalDetailsModal.jsx` | Modals | MEDIUM |
| 9 | `src/islands/modals/GuestEditingProposalModal.jsx` | Modals | MEDIUM |
| 10 | `src/islands/modals/CompareTermsModal.jsx` | Modals | MEDIUM |
| 11 | `src/islands/shared/ExternalReviews.jsx` | Shared | LOW |
| 12 | `src/islands/shared/HostEditingProposal/types.js` | Shared | MEDIUM |
| 13 | `src/islands/shared/ScheduleCohost/cohostService.js` | Shared | LOW |
| 14 | `src/logic/processors/proposals/processProposalData.js` | Logic | HIGH |
| 15 | `src/lib/proposals/dataTransformers.js` | Logic | HIGH |

**Total Chunks:** 16 (including prerequisite)
**Estimated Impact:** 18+ duplicate functions consolidated to 1 canonical source
