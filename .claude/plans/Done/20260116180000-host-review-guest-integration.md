# Implementation Plan: Host Review Guest Integration

## Overview

Integrate the host-review-guest component library into Split Lease as a shared island module. This plan adapts the TypeScript/React components to follow the project's Islands Architecture conventions, extracts business logic to the four-layer logic system, and establishes integration points with Supabase patterns.

## Success Criteria

- [ ] HostReviewGuest shared island module created and functional
- [ ] All components converted from TypeScript to JSX with proper prop validation
- [ ] Business logic extracted to calculators, rules, and processors layers
- [ ] Service layer integrated with Supabase Edge Function pattern
- [ ] CSS follows project conventions with `hrg-` namespace prefix
- [ ] Database review table exists (or plan for creation documented)
- [ ] Component exportable via barrel file (index.js)

---

## Context & References

### Relevant Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/shared/VirtualMeetingManager/` | Reference module structure | Pattern to follow |
| `app/src/islands/shared/FavoriteButton/` | Simpler module reference | Pattern to follow |
| `app/src/logic/calculators/index.js` | Calculators barrel | Add review exports |
| `app/src/logic/rules/index.js` | Rules barrel | Add review exports |
| `app/src/logic/processors/index.js` | Processors barrel | Add review exports |
| `app/src/lib/supabase.js` | Supabase client | Import for service |
| `app/src/styles/variables.css` | CSS custom properties | Reference for styling |

### Related Documentation

- `.claude/CLAUDE.md` - Project conventions and architecture rules
- `app/CLAUDE.md` - Frontend architecture details
- `app/src/islands/CLAUDE.md` - Islands Architecture patterns
- `app/src/islands/shared/VirtualMeetingManager/CLAUDE.md` - Module documentation pattern

### Existing Patterns to Follow

1. **Barrel Export Pattern** (from VirtualMeetingManager/index.js):
   ```javascript
   export { default as ComponentName } from './ComponentName.jsx';
   export { default } from './MainComponent.jsx';
   export { default as serviceName } from './serviceName.js';
   ```

2. **Service Layer Pattern** (from virtualMeetingService.js):
   ```javascript
   const { data, error } = await supabase.functions.invoke('function-name', {
     body: { action: 'action_name', payload: { ... } }
   });
   return { status: 'success'|'error', data, message };
   ```

3. **Calculator Pattern** (from calculatePricingBreakdown.js):
   - Named exports with `calculate*` or `get*` prefix
   - Pure functions with explicit parameter validation
   - Throws on invalid input (no fallbacks)
   - JSDoc with @intent, @rule annotations

4. **Rules Pattern** (from canAcceptProposal.js):
   - Named exports with `can*`, `is*`, `has*`, `should*` prefix
   - Returns strict boolean
   - Handles deleted/null cases explicitly

5. **CSS Namespace Pattern** (from VirtualMeetingManager.css):
   - Prefix all classes with module abbreviation (e.g., `vm-*`)
   - CSS custom properties for theming
   - Mobile-first responsive design

---

## Implementation Steps

### Step 1: Create Directory Structure

**Files:** `app/src/islands/shared/HostReviewGuest/`

**Purpose:** Establish the feature module directory with all required files.

**Details:**

Create the following directory structure:
```
app/src/islands/shared/HostReviewGuest/
  HostReviewGuest.jsx       # Main container component
  RatingCategory.jsx        # Individual rating dimension
  StarRating.jsx            # Interactive 5-star input
  HostReviewGuest.css       # All component styles (hrg-* prefix)
  hostReviewGuestService.js # API service layer
  index.js                  # Barrel exports
  CLAUDE.md                 # Module documentation (optional, create last)
```

**Validation:** Directory exists with empty files ready for content.

---

### Step 2: Create Business Logic - Calculator Layer

**Files:** `app/src/logic/calculators/reviews/calculateReviewScore.js`

**Purpose:** Pure function to calculate average review score from ratings array.

**Details:**

```javascript
/**
 * Calculate the average score from a review's rating details.
 *
 * @intent Provide consistent score calculation for guest reviews.
 * @rule All 12 categories must have valid ratings (1-5).
 * @rule Returns average rounded to 1 decimal place.
 *
 * @param {object} params - Named parameters.
 * @param {Array<{value: number}>} params.ratings - Array of rating objects.
 * @returns {number} Average score (1.0 to 5.0).
 *
 * @throws {Error} If ratings array is empty or contains invalid values.
 *
 * @example
 * calculateReviewScore({ ratings: [{value: 5}, {value: 4}] })
 * // => 4.5
 */
export function calculateReviewScore({ ratings }) {
  // Validate input
  if (!Array.isArray(ratings) || ratings.length === 0) {
    throw new Error('calculateReviewScore: ratings must be a non-empty array');
  }

  // Validate each rating
  for (const rating of ratings) {
    if (typeof rating.value !== 'number' || rating.value < 1 || rating.value > 5) {
      throw new Error(
        `calculateReviewScore: invalid rating value ${rating.value}, must be 1-5`
      );
    }
  }

  const sum = ratings.reduce((acc, r) => acc + r.value, 0);
  const average = sum / ratings.length;

  // Round to 1 decimal place
  return Math.round(average * 10) / 10;
}
```

Also create `app/src/logic/calculators/reviews/calculateFormCompletion.js`:

```javascript
/**
 * Calculate form completion percentage for review submission.
 *
 * @intent Show progress feedback during review form completion.
 * @rule Counts ratings with non-zero values.
 *
 * @param {object} params - Named parameters.
 * @param {Array<{value: number}>} params.ratings - Array of rating objects.
 * @param {number} params.totalCategories - Expected total categories (default 12).
 * @returns {number} Completion percentage (0-100).
 */
export function calculateFormCompletion({ ratings, totalCategories = 12 }) {
  if (!Array.isArray(ratings)) {
    return 0;
  }

  const completed = ratings.filter(r => r.value > 0).length;
  return Math.round((completed / totalCategories) * 100);
}
```

**Validation:**
- Run: `bun run lint` (no errors in new files)
- Unit test: `calculateReviewScore({ ratings: [{value:5},{value:4},{value:3}] })` returns `4.0`

---

### Step 3: Create Business Logic - Rules Layer

**Files:** `app/src/logic/rules/reviews/reviewValidation.js`

**Purpose:** Boolean predicates for review form validation.

**Details:**

```javascript
/**
 * Review validation rules.
 * Boolean predicates for guest review form validation.
 */

import { REVIEW_CATEGORY_COUNT } from '../../constants/reviewCategories.js';

/**
 * Check if all required rating categories are completed.
 *
 * @param {object} params - Named parameters.
 * @param {Array<{value: number}>} params.ratings - Array of rating objects.
 * @returns {boolean} True if all 12 categories have valid ratings.
 */
export function isReviewComplete({ ratings }) {
  if (!Array.isArray(ratings)) {
    return false;
  }

  if (ratings.length !== REVIEW_CATEGORY_COUNT) {
    return false;
  }

  return ratings.every(r =>
    typeof r.value === 'number' && r.value >= 1 && r.value <= 5
  );
}

/**
 * Check if a single rating value is valid.
 *
 * @param {object} params - Named parameters.
 * @param {number} params.value - Rating value to validate.
 * @returns {boolean} True if value is 1-5.
 */
export function isValidRating({ value }) {
  return typeof value === 'number' && value >= 1 && value <= 5;
}

/**
 * Check if review can be submitted.
 *
 * @param {object} params - Named parameters.
 * @param {Array<{value: number}>} params.ratings - Rating objects.
 * @param {boolean} params.isSubmitting - Whether submission is in progress.
 * @returns {boolean} True if form can be submitted.
 */
export function canSubmitReview({ ratings, isSubmitting = false }) {
  if (isSubmitting) {
    return false;
  }

  return isReviewComplete({ ratings });
}

/**
 * Check if guest has already been reviewed for this stay.
 *
 * @param {object} params - Named parameters.
 * @param {string|null} params.existingReviewId - Existing review ID if any.
 * @returns {boolean} True if review already exists.
 */
export function hasExistingReview({ existingReviewId }) {
  return existingReviewId !== null && existingReviewId !== undefined;
}
```

Also create `app/src/logic/constants/reviewCategories.js`:

```javascript
/**
 * Review category constants.
 * Defines the 12 behavioral dimensions for guest reviews.
 */

export const REVIEW_CATEGORY_COUNT = 12;

export const REVIEW_CATEGORIES = [
  {
    id: 'check_in_out',
    title: 'Check-in/Check-out Etiquette',
    question: 'How well did the guest respect check-in and check-out times?'
  },
  {
    id: 'communication',
    title: 'Communication',
    question: 'How responsive and clear was the guest in communication?'
  },
  {
    id: 'cleanliness',
    title: 'Cleanliness',
    question: 'How clean was the property left after the stay?'
  },
  {
    id: 'payment',
    title: 'Payment Reliability',
    question: 'How reliable was the guest with payments?'
  },
  {
    id: 'house_rules',
    title: 'House Rules Compliance',
    question: 'How well did the guest follow house rules?'
  },
  {
    id: 'noise',
    title: 'Noise Consideration',
    question: 'How considerate was the guest regarding noise levels?'
  },
  {
    id: 'amenity_usage',
    title: 'Amenity Usage',
    question: 'How responsibly did the guest use amenities?'
  },
  {
    id: 'trash',
    title: 'Trash & Recycling',
    question: 'How well did the guest handle trash and recycling?'
  },
  {
    id: 'neighbor_respect',
    title: 'Neighbor Respect',
    question: 'How respectful was the guest to neighbors?'
  },
  {
    id: 'property_care',
    title: 'Property Care',
    question: 'How well did the guest care for the property?'
  },
  {
    id: 'guest_behavior',
    title: 'Guest Behavior',
    question: 'How appropriate was the guest\'s overall behavior?'
  },
  {
    id: 'recommendation',
    title: 'Would Recommend',
    question: 'Would you recommend this guest to other hosts?'
  }
];

export const RATING_SCALE_LABELS = [
  '', // Index 0 unused
  'Very poor',
  'Poor',
  'Average',
  'Good',
  'Excellent'
];
```

**Validation:**
- `isReviewComplete({ ratings: [{value:5},{value:4}] })` returns `false` (not 12 items)
- `canSubmitReview({ ratings: all12ValidRatings, isSubmitting: false })` returns `true`

---

### Step 4: Create Business Logic - Processors Layer

**Files:** `app/src/logic/processors/reviews/reviewAdapter.js`

**Purpose:** Data transformation between API and UI formats.

**Details:**

```javascript
/**
 * Review data transformation processors.
 * Adapts data between API format and UI component format.
 */

import { REVIEW_CATEGORIES } from '../../constants/reviewCategories.js';

/**
 * Initialize empty ratings array for form.
 *
 * @returns {Array<{categoryId: string, title: string, question: string, value: number}>}
 */
export function createEmptyRatings() {
  return REVIEW_CATEGORIES.map(category => ({
    categoryId: category.id,
    title: category.title,
    question: category.question,
    value: 0
  }));
}

/**
 * Adapt form data to API submission format.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.guestId - Guest user ID.
 * @param {string} params.hostId - Host user ID.
 * @param {string} params.leaseId - Lease ID.
 * @param {string} params.stayId - Stay ID.
 * @param {Array<{categoryId: string, value: number}>} params.ratings - Rating data.
 * @param {string} [params.feedback] - Optional feedback text.
 * @param {number} params.overallScore - Calculated average score.
 * @returns {object} API-formatted review object.
 */
export function adaptReviewForSubmission({
  guestId,
  hostId,
  leaseId,
  stayId,
  ratings,
  feedback,
  overallScore
}) {
  if (!guestId || !hostId || !leaseId || !stayId) {
    throw new Error('adaptReviewForSubmission: missing required IDs');
  }

  return {
    guest_id: guestId,
    host_id: hostId,
    lease_id: leaseId,
    stay_id: stayId,
    ratings: ratings.map(r => ({
      category_id: r.categoryId,
      value: r.value
    })),
    overall_score: overallScore,
    feedback: feedback || null,
    created_at: new Date().toISOString()
  };
}

/**
 * Adapt API review data to UI display format.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.apiReview - Review from API.
 * @returns {object} UI-formatted review object.
 */
export function adaptReviewFromApi({ apiReview }) {
  if (!apiReview) {
    return null;
  }

  return {
    id: apiReview.id || apiReview._id,
    guestId: apiReview.guest_id,
    hostId: apiReview.host_id,
    leaseId: apiReview.lease_id,
    stayId: apiReview.stay_id,
    ratings: (apiReview.ratings || []).map(r => ({
      categoryId: r.category_id,
      title: REVIEW_CATEGORIES.find(c => c.id === r.category_id)?.title || r.category_id,
      question: REVIEW_CATEGORIES.find(c => c.id === r.category_id)?.question || '',
      value: r.value
    })),
    overallScore: apiReview.overall_score,
    feedback: apiReview.feedback,
    createdAt: apiReview.created_at
  };
}
```

**Validation:**
- `createEmptyRatings()` returns array of 12 objects with `value: 0`
- `adaptReviewForSubmission({ valid params })` returns snake_case object

---

### Step 5: Update Logic Index Files

**Files:**
- `app/src/logic/calculators/index.js`
- `app/src/logic/rules/index.js`
- `app/src/logic/processors/index.js`
- `app/src/logic/constants/index.js` (create if doesn't exist)

**Purpose:** Export new review logic from barrel files.

**Details:**

Add to `app/src/logic/calculators/index.js`:
```javascript
// Review Calculators
export { calculateReviewScore } from './reviews/calculateReviewScore.js'
export { calculateFormCompletion } from './reviews/calculateFormCompletion.js'
```

Add to `app/src/logic/rules/index.js`:
```javascript
// Review Rules
export {
  isReviewComplete,
  isValidRating,
  canSubmitReview,
  hasExistingReview
} from './reviews/reviewValidation.js'
```

Add to `app/src/logic/processors/index.js`:
```javascript
// Review Processors
export {
  createEmptyRatings,
  adaptReviewForSubmission,
  adaptReviewFromApi
} from './reviews/reviewAdapter.js'
```

Create `app/src/logic/constants/index.js` (if needed):
```javascript
// Review Constants
export {
  REVIEW_CATEGORY_COUNT,
  REVIEW_CATEGORIES,
  RATING_SCALE_LABELS
} from './reviewCategories.js'

// Re-export existing constants
export * from './proposalStages.js'
export * from './proposalStatuses.js'
```

**Validation:** Import statements work from consuming files.

---

### Step 6: Create Service Layer

**Files:** `app/src/islands/shared/HostReviewGuest/hostReviewGuestService.js`

**Purpose:** API service layer following Supabase Edge Function pattern.

**Details:**

```javascript
/**
 * Host Review Guest API Service Layer
 * Handles review submission and retrieval via Supabase Edge Functions.
 */

import { supabase } from '../../../lib/supabase.js';

/**
 * Submit a new guest review.
 *
 * @param {object} reviewData - Formatted review data (from adaptReviewForSubmission).
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function submitGuestReview(reviewData) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('guest-review', {
      body: {
        action: 'create',
        payload: reviewData
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to submit review');
    }

    return {
      status: 'success',
      data: responseData?.data
    };
  } catch (error) {
    console.error('API Error (submit-guest-review):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if a review exists for a specific stay.
 *
 * @param {string} stayId - Stay ID to check.
 * @param {string} hostId - Host ID who would have submitted.
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function checkExistingReview(stayId, hostId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('guest-review', {
      body: {
        action: 'check',
        payload: { stayId, hostId }
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to check review');
    }

    return {
      status: 'success',
      data: responseData?.data
    };
  } catch (error) {
    console.error('API Error (check-guest-review):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch review by ID.
 *
 * @param {string} reviewId - Review ID.
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function fetchReview(reviewId) {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('guest-review', {
      body: {
        action: 'get',
        payload: { reviewId }
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to fetch review');
    }

    return {
      status: 'success',
      data: responseData?.data
    };
  } catch (error) {
    console.error('API Error (fetch-guest-review):', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Export as service object
export const hostReviewGuestService = {
  submitReview: submitGuestReview,
  checkExisting: checkExistingReview,
  fetchReview: fetchReview
};

export default hostReviewGuestService;
```

**Validation:** Service imports correctly, mock calls don't throw.

---

### Step 7: Create StarRating Component

**Files:** `app/src/islands/shared/HostReviewGuest/StarRating.jsx`

**Purpose:** Interactive 5-star rating input with keyboard and click support.

**Details:**

```jsx
/**
 * StarRating Component
 *
 * Interactive 5-star rating widget with full keyboard accessibility.
 * Supports Arrow keys for navigation, Enter/Space for selection.
 */

import { useState, useCallback } from 'react';

const StarRating = ({
  value = 0,
  onChange,
  maxStars = 5,
  disabled = false,
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32
  };
  const starSize = sizeMap[size] || sizeMap.medium;

  const handleClick = useCallback((starValue) => {
    if (!disabled && onChange) {
      onChange(starValue);
    }
  }, [disabled, onChange]);

  const handleKeyDown = useCallback((e, starValue) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onChange?.(starValue);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        if (starValue < maxStars) {
          onChange?.(starValue + 1);
        }
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        if (starValue > 1) {
          onChange?.(starValue - 1);
        }
        break;
      default:
        break;
    }
  }, [disabled, onChange, maxStars]);

  const handleMouseEnter = useCallback((starValue) => {
    if (!disabled) {
      setHoverValue(starValue);
    }
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setHoverValue(0);
  }, []);

  const displayValue = hoverValue || value;

  return (
    <div
      className={`hrg-star-rating hrg-star-rating--${size} ${disabled ? 'hrg-star-rating--disabled' : ''}`}
      role="group"
      aria-label="Rating"
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxStars }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= displayValue;

        return (
          <button
            key={starValue}
            type="button"
            className={`hrg-star ${isFilled ? 'hrg-star--filled' : ''}`}
            onClick={() => handleClick(starValue)}
            onKeyDown={(e) => handleKeyDown(e, starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            disabled={disabled}
            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
            aria-pressed={value === starValue}
            tabIndex={disabled ? -1 : 0}
          >
            <svg
              width={starSize}
              height={starSize}
              viewBox="0 0 24 24"
              fill={isFilled ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
```

**Validation:** Component renders 5 stars, click changes value, keyboard nav works.

---

### Step 8: Create RatingCategory Component

**Files:** `app/src/islands/shared/HostReviewGuest/RatingCategory.jsx`

**Purpose:** Display single rating dimension with context question.

**Details:**

```jsx
/**
 * RatingCategory Component
 *
 * Displays a single rating dimension with title, question, and star input.
 * Shows scale labels ("Very poor" to "Excellent") based on current value.
 */

import StarRating from './StarRating.jsx';
import { RATING_SCALE_LABELS } from '../../../logic/constants/reviewCategories.js';

const RatingCategory = ({
  category,  // { title, question }
  value = 0,
  onChange,
  disabled = false
}) => {
  const scaleLabel = value > 0 ? RATING_SCALE_LABELS[value] : '';

  return (
    <div className={`hrg-rating-category ${disabled ? 'hrg-rating-category--disabled' : ''}`}>
      <div className="hrg-rating-category__header">
        <h4 className="hrg-rating-category__title">{category.title}</h4>
        {scaleLabel && (
          <span className="hrg-rating-category__scale-label">{scaleLabel}</span>
        )}
      </div>

      <p className="hrg-rating-category__question">{category.question}</p>

      <div className="hrg-rating-category__input">
        <StarRating
          value={value}
          onChange={onChange}
          disabled={disabled}
          size="medium"
        />
      </div>
    </div>
  );
};

export default RatingCategory;
```

**Validation:** Component renders title, question, and stars.

---

### Step 9: Create Main HostReviewGuest Component

**Files:** `app/src/islands/shared/HostReviewGuest/HostReviewGuest.jsx`

**Purpose:** Main container form for collecting guest reviews.

**Details:**

```jsx
/**
 * HostReviewGuest Component
 *
 * Master form for hosts to review guests after a completed stay.
 * Collects ratings across 12 behavioral dimensions and optional feedback.
 *
 * Usage:
 *   <HostReviewGuest
 *     guest={guestObject}
 *     host={hostObject}
 *     lease={leaseObject}
 *     stay={stayObject}
 *     isVisible={showModal}
 *     onClose={() => setShowModal(false)}
 *     onSubmit={(review) => handleReviewSubmitted(review)}
 *   />
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import RatingCategory from './RatingCategory.jsx';
import hostReviewGuestService from './hostReviewGuestService.js';
import { calculateReviewScore } from '../../../logic/calculators/reviews/calculateReviewScore.js';
import { calculateFormCompletion } from '../../../logic/calculators/reviews/calculateFormCompletion.js';
import { canSubmitReview, isReviewComplete } from '../../../logic/rules/reviews/reviewValidation.js';
import { createEmptyRatings, adaptReviewForSubmission } from '../../../logic/processors/reviews/reviewAdapter.js';
import './HostReviewGuest.css';

const HostReviewGuest = ({
  guest,
  host,
  lease,
  stay,
  isVisible = false,
  onClose,
  onSubmit
}) => {
  // State management
  const [ratings, setRatings] = useState(() => createEmptyRatings());
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submittedReview, setSubmittedReview] = useState(null);

  // Reset form when visibility changes
  useEffect(() => {
    if (isVisible) {
      setRatings(createEmptyRatings());
      setFeedback('');
      setError(null);
      setSubmittedReview(null);
    }
  }, [isVisible]);

  // Calculate average score
  const averageScore = useMemo(() => {
    const validRatings = ratings.filter(r => r.value > 0);
    if (validRatings.length === 0) return 0;

    try {
      return calculateReviewScore({ ratings: validRatings });
    } catch {
      return 0;
    }
  }, [ratings]);

  // Calculate form completion percentage
  const completionPercentage = useMemo(() => {
    return calculateFormCompletion({ ratings });
  }, [ratings]);

  // Check if form can be submitted
  const canSubmit = useMemo(() => {
    return canSubmitReview({ ratings, isSubmitting });
  }, [ratings, isSubmitting]);

  // Handle rating change for a category
  const handleRatingChange = useCallback((categoryId, value) => {
    setRatings(prev => prev.map(r =>
      r.categoryId === categoryId ? { ...r, value } : r
    ));
    setError(null);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!canSubmit) {
      setError('Please complete all rating categories before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reviewData = adaptReviewForSubmission({
        guestId: guest?._id || guest?.id,
        hostId: host?._id || host?.id,
        leaseId: lease?._id || lease?.id,
        stayId: stay?._id || stay?.id,
        ratings,
        feedback,
        overallScore: averageScore
      });

      const result = await hostReviewGuestService.submitReview(reviewData);

      if (result.status === 'success') {
        setSubmittedReview(result.data);
        if (onSubmit) {
          onSubmit(result.data);
        }
      } else {
        throw new Error(result.message || 'Failed to submit review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, guest, host, lease, stay, ratings, feedback, averageScore, onSubmit]);

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Success confirmation view
  if (submittedReview) {
    return (
      <div className="hrg-overlay" onClick={handleBackdropClick}>
        <div className="hrg-container hrg-container--success">
          <button
            type="button"
            className="hrg-close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            &times;
          </button>

          <div className="hrg-success-content">
            <div className="hrg-success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            <h2 className="hrg-success-title">Review Submitted!</h2>

            <p className="hrg-success-message">
              Thank you for reviewing {guest?.firstName || guest?.name || 'your guest'}.
              Your feedback helps maintain our community standards.
            </p>

            <div className="hrg-success-score">
              <span className="hrg-success-score__label">Overall Score</span>
              <span className="hrg-success-score__value">{averageScore.toFixed(1)}</span>
            </div>

            <button
              type="button"
              className="hrg-button-primary"
              onClick={handleClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main review form view
  return (
    <div className="hrg-overlay" onClick={handleBackdropClick}>
      <div className="hrg-container">
        <button
          type="button"
          className="hrg-close-btn"
          onClick={handleClose}
          aria-label="Close"
        >
          &times;
        </button>

        <div className="hrg-header">
          <h2 className="hrg-title">Review Guest</h2>
          <p className="hrg-subtitle">
            How was your experience hosting {guest?.firstName || guest?.name || 'this guest'}?
          </p>
        </div>

        {/* Progress indicator */}
        <div className="hrg-progress">
          <div className="hrg-progress__bar">
            <div
              className="hrg-progress__fill"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="hrg-progress__text">{completionPercentage}% complete</span>
        </div>

        {/* Error message */}
        {error && (
          <div className="hrg-error" role="alert">
            {error}
          </div>
        )}

        {/* Rating form */}
        <form className="hrg-form" onSubmit={handleSubmit}>
          <div className="hrg-categories">
            {ratings.map(rating => (
              <RatingCategory
                key={rating.categoryId}
                category={{ title: rating.title, question: rating.question }}
                value={rating.value}
                onChange={(value) => handleRatingChange(rating.categoryId, value)}
                disabled={isSubmitting}
              />
            ))}
          </div>

          {/* Optional feedback */}
          <div className="hrg-feedback">
            <label htmlFor="hrg-feedback" className="hrg-feedback__label">
              Additional Comments (Optional)
            </label>
            <textarea
              id="hrg-feedback"
              className="hrg-feedback__input"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share any additional thoughts about your guest..."
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          {/* Average score display */}
          {isReviewComplete({ ratings }) && (
            <div className="hrg-score-preview">
              <span className="hrg-score-preview__label">Average Score</span>
              <span className="hrg-score-preview__value">{averageScore.toFixed(1)}</span>
            </div>
          )}

          {/* Submit button */}
          <div className="hrg-actions">
            <button
              type="button"
              className="hrg-button-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="hrg-button-primary"
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HostReviewGuest;
```

**Validation:** Component renders form with 12 categories, submit disabled until complete.

---

### Step 10: Create CSS Styles

**Files:** `app/src/islands/shared/HostReviewGuest/HostReviewGuest.css`

**Purpose:** All component styles with `hrg-` namespace prefix.

**Details:**

```css
/**
 * Host Review Guest Styles
 * Component namespace: hrg-*
 * Based on Split Lease design system
 */

/* ============================================
   CSS VARIABLES
   ============================================ */

:root {
  --hrg-primary: var(--color-primary, #31135d);
  --hrg-primary-hover: var(--color-primary-hover, #1f0b38);
  --hrg-success: #059669;
  --hrg-error: #dc2626;
  --hrg-star-filled: #fbbf24;
  --hrg-star-empty: #d1d5db;
  --hrg-overlay-bg: rgba(0, 0, 0, 0.5);
  --hrg-border-color: #e5e7eb;
  --hrg-text-primary: #1f2937;
  --hrg-text-secondary: #6b7280;
}

/* ============================================
   OVERLAY & CONTAINER
   ============================================ */

.hrg-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--hrg-overlay-bg);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}

.hrg-container {
  background: white;
  border-radius: 16px;
  padding: 24px 32px;
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  position: relative;
  margin-top: 20px;
}

.hrg-container--success {
  max-width: 400px;
  text-align: center;
}

.hrg-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 24px;
  color: var(--hrg-text-secondary);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
}

.hrg-close-btn:hover {
  color: var(--hrg-text-primary);
}

/* ============================================
   HEADER
   ============================================ */

.hrg-header {
  margin-bottom: 20px;
}

.hrg-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--hrg-text-primary);
  margin: 0 0 8px 0;
}

.hrg-subtitle {
  font-size: 14px;
  color: var(--hrg-text-secondary);
  margin: 0;
}

/* ============================================
   PROGRESS BAR
   ============================================ */

.hrg-progress {
  margin-bottom: 20px;
}

.hrg-progress__bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.hrg-progress__fill {
  height: 100%;
  background: var(--hrg-primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.hrg-progress__text {
  font-size: 12px;
  color: var(--hrg-text-secondary);
}

/* ============================================
   ERROR MESSAGE
   ============================================ */

.hrg-error {
  background: #fee2e2;
  color: var(--hrg-error);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

/* ============================================
   RATING CATEGORIES
   ============================================ */

.hrg-categories {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.hrg-rating-category {
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.hrg-rating-category--disabled {
  opacity: 0.6;
}

.hrg-rating-category__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.hrg-rating-category__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--hrg-text-primary);
  margin: 0;
}

.hrg-rating-category__scale-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--hrg-primary);
  background: rgba(49, 19, 93, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}

.hrg-rating-category__question {
  font-size: 13px;
  color: var(--hrg-text-secondary);
  margin: 0 0 12px 0;
}

.hrg-rating-category__input {
  display: flex;
  justify-content: center;
}

/* ============================================
   STAR RATING
   ============================================ */

.hrg-star-rating {
  display: flex;
  gap: 4px;
}

.hrg-star-rating--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.hrg-star {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: var(--hrg-star-empty);
  transition: transform 0.1s, color 0.2s;
}

.hrg-star:hover:not(:disabled) {
  transform: scale(1.15);
}

.hrg-star--filled {
  color: var(--hrg-star-filled);
}

.hrg-star:focus {
  outline: 2px solid var(--hrg-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ============================================
   FEEDBACK TEXTAREA
   ============================================ */

.hrg-feedback {
  margin-bottom: 20px;
}

.hrg-feedback__label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--hrg-text-primary);
  margin-bottom: 8px;
}

.hrg-feedback__input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--hrg-border-color);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
}

.hrg-feedback__input:focus {
  outline: none;
  border-color: var(--hrg-primary);
}

.hrg-feedback__input::placeholder {
  color: #9ca3af;
}

/* ============================================
   SCORE PREVIEW
   ============================================ */

.hrg-score-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, rgba(49, 19, 93, 0.05), rgba(49, 19, 93, 0.1));
  border-radius: 12px;
  margin-bottom: 20px;
}

.hrg-score-preview__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--hrg-text-primary);
}

.hrg-score-preview__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--hrg-primary);
}

/* ============================================
   BUTTONS
   ============================================ */

.hrg-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.hrg-button-primary {
  background: var(--hrg-primary);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.hrg-button-primary:hover:not(:disabled) {
  background: var(--hrg-primary-hover);
}

.hrg-button-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.hrg-button-secondary {
  background: white;
  color: var(--hrg-text-secondary);
  padding: 12px 24px;
  border-radius: 8px;
  border: 1px solid var(--hrg-border-color);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.hrg-button-secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.hrg-button-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ============================================
   SUCCESS STATE
   ============================================ */

.hrg-success-content {
  padding: 24px 0;
}

.hrg-success-icon {
  color: var(--hrg-success);
  margin-bottom: 16px;
}

.hrg-success-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--hrg-text-primary);
  margin: 0 0 12px 0;
}

.hrg-success-message {
  font-size: 14px;
  color: var(--hrg-text-secondary);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.hrg-success-score {
  background: #f0fdf4;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.hrg-success-score__label {
  display: block;
  font-size: 12px;
  color: var(--hrg-text-secondary);
  margin-bottom: 4px;
}

.hrg-success-score__value {
  font-size: 32px;
  font-weight: 700;
  color: var(--hrg-success);
}

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */

@media (max-width: 600px) {
  .hrg-overlay {
    padding: 10px;
  }

  .hrg-container {
    padding: 16px;
    border-radius: 12px;
    margin-top: 10px;
  }

  .hrg-title {
    font-size: 18px;
  }

  .hrg-actions {
    flex-direction: column-reverse;
  }

  .hrg-button-primary,
  .hrg-button-secondary {
    width: 100%;
  }

  .hrg-rating-category {
    padding: 12px;
  }
}
```

**Validation:** No CSS lint errors, all classes prefixed with `hrg-`.

---

### Step 11: Create Barrel Export File

**Files:** `app/src/islands/shared/HostReviewGuest/index.js`

**Purpose:** Export all module components and services.

**Details:**

```javascript
/**
 * Host Review Guest - Main Export File
 * Export all components, services, and utilities
 */

// Main Component
export { default as HostReviewGuest } from './HostReviewGuest.jsx';
export { default } from './HostReviewGuest.jsx';

// Subcomponents
export { default as StarRating } from './StarRating.jsx';
export { default as RatingCategory } from './RatingCategory.jsx';

// Services
export { default as hostReviewGuestService } from './hostReviewGuestService.js';
export * from './hostReviewGuestService.js';
```

**Validation:** Import works: `import { HostReviewGuest } from 'islands/shared/HostReviewGuest'`

---

### Step 12: Document Database Requirements

**Files:** N/A (documentation only)

**Purpose:** Identify database table needs for the Edge Function.

**Details:**

The `guest-review` Edge Function will require a `guest_review` table in Supabase:

```sql
-- Table: guest_review (to be created via migration)
CREATE TABLE guest_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  _id TEXT UNIQUE DEFAULT generate_bubble_id(), -- Bubble-compatible ID
  guest_id TEXT NOT NULL REFERENCES "user"(_id),
  host_id TEXT NOT NULL REFERENCES "user"(_id),
  lease_id TEXT REFERENCES lease(_id),
  stay_id TEXT REFERENCES stay(_id),
  ratings JSONB NOT NULL, -- Array of {category_id, value}
  overall_score NUMERIC(2,1) NOT NULL, -- 1.0 to 5.0
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  "Modified Date" TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_score CHECK (overall_score >= 1.0 AND overall_score <= 5.0)
);

-- Index for common queries
CREATE INDEX idx_guest_review_stay_id ON guest_review(stay_id);
CREATE INDEX idx_guest_review_host_id ON guest_review(host_id);

-- RLS Policy (hosts can only see/create their own reviews)
ALTER TABLE guest_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can manage their own reviews"
  ON guest_review
  FOR ALL
  USING (host_id = auth.uid()::text);
```

**Note:** Do NOT apply this migration without explicit instruction. This documents the expected schema for the Edge Function.

**Validation:** Schema documented, migration NOT applied.

---

### Step 13: Create Edge Function Stub (Documentation)

**Files:** N/A (documentation only)

**Purpose:** Document the required Edge Function interface.

**Details:**

The `guest-review` Edge Function should support these actions:

```typescript
// supabase/functions/guest-review/index.ts

interface RequestBody {
  action: 'create' | 'check' | 'get';
  payload: CreatePayload | CheckPayload | GetPayload;
}

interface CreatePayload {
  guest_id: string;
  host_id: string;
  lease_id: string;
  stay_id: string;
  ratings: Array<{ category_id: string; value: number }>;
  overall_score: number;
  feedback: string | null;
}

interface CheckPayload {
  stayId: string;
  hostId: string;
}

interface GetPayload {
  reviewId: string;
}
```

**Note:** Edge Function creation is outside this plan scope. Mark as TODO.

**Validation:** Interface documented for future implementation.

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| Guest/host object missing fields | Use optional chaining: `guest?.firstName \|\| guest?.name \|\| 'Guest'` |
| Rating value out of range | Validation in rules layer throws error |
| Network error on submit | Show error message, keep form data intact |
| User closes modal mid-form | Reset form on next open |
| Duplicate review submission | Edge Function should check `checkExisting` first |
| Missing required IDs | adaptReviewForSubmission throws explicit error |

---

## Testing Considerations

1. **Unit Tests:**
   - `calculateReviewScore` with various rating arrays
   - `isReviewComplete` with incomplete/complete ratings
   - `adaptReviewForSubmission` with valid/invalid params

2. **Integration Tests:**
   - Form completion flow (all 12 categories)
   - Submit button enable/disable states
   - Error display on failed submission

3. **Accessibility Tests:**
   - Keyboard navigation through stars
   - Screen reader announcements for ratings
   - Focus management in modal

---

## Rollback Strategy

1. Delete the entire `app/src/islands/shared/HostReviewGuest/` directory
2. Remove exports from logic index files
3. Delete logic files:
   - `app/src/logic/calculators/reviews/`
   - `app/src/logic/rules/reviews/`
   - `app/src/logic/processors/reviews/`
   - `app/src/logic/constants/reviewCategories.js`
4. Revert index file changes

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| Supabase client (`lib/supabase.js`) | Available | Existing |
| CSS variables (`styles/variables.css`) | Available | Existing |
| `guest-review` Edge Function | TODO | Required for actual API calls |
| `guest_review` database table | TODO | Required for data persistence |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Edge Function not created | High | API calls fail | Service returns mock error until ready |
| Database table missing | High | Data not persisted | Document schema, defer creation |
| CSS conflicts | Low | Styling issues | Use `hrg-` namespace prefix |
| Logic layer pattern drift | Low | Inconsistency | Follow existing patterns exactly |

---

## Files Referenced in This Plan

### New Files to Create

1. `app/src/islands/shared/HostReviewGuest/HostReviewGuest.jsx`
2. `app/src/islands/shared/HostReviewGuest/RatingCategory.jsx`
3. `app/src/islands/shared/HostReviewGuest/StarRating.jsx`
4. `app/src/islands/shared/HostReviewGuest/HostReviewGuest.css`
5. `app/src/islands/shared/HostReviewGuest/hostReviewGuestService.js`
6. `app/src/islands/shared/HostReviewGuest/index.js`
7. `app/src/logic/calculators/reviews/calculateReviewScore.js`
8. `app/src/logic/calculators/reviews/calculateFormCompletion.js`
9. `app/src/logic/rules/reviews/reviewValidation.js`
10. `app/src/logic/processors/reviews/reviewAdapter.js`
11. `app/src/logic/constants/reviewCategories.js`

### Existing Files to Modify

12. `app/src/logic/calculators/index.js` - Add review exports
13. `app/src/logic/rules/index.js` - Add review exports
14. `app/src/logic/processors/index.js` - Add review exports

### Reference Files (Read-Only Context)

15. `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.jsx`
16. `app/src/islands/shared/VirtualMeetingManager/virtualMeetingService.js`
17. `app/src/islands/shared/VirtualMeetingManager/VirtualMeetingManager.css`
18. `app/src/islands/shared/VirtualMeetingManager/index.js`
19. `app/src/islands/shared/FavoriteButton/FavoriteButton.jsx`
20. `app/src/logic/calculators/pricing/calculatePricingBreakdown.js`
21. `app/src/logic/rules/proposals/canAcceptProposal.js`
22. `app/src/lib/supabase.js`

---

**VERSION**: 1.0
**CREATED**: 2026-01-16
**ESTIMATED EFFORT**: 4-6 hours
**AUTHOR**: Implementation Planner
