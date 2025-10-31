/**
 * SearchScheduleSelector Component
 * Refactored for ESM + React Islands Architecture
 *
 * A weekly schedule selector for choosing days/nights for property listings.
 * Supports drag selection, validation, and accessibility features.
 *
 * @module SearchScheduleSelector
 * @see {@link SearchScheduleSelectorProps} for component props
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import type {
  Day,
  SearchScheduleSelectorProps,
  ValidationResult,
} from './types';
import styles from './SearchScheduleSelector.module.css';

/**
 * Constant array of days of the week
 * Single source of truth for day data
 */
const DAYS_OF_WEEK: readonly Day[] = [
  { id: '1', singleLetter: 'S', fullName: 'Sunday', index: 0 },
  { id: '2', singleLetter: 'M', fullName: 'Monday', index: 1 },
  { id: '3', singleLetter: 'T', fullName: 'Tuesday', index: 2 },
  { id: '4', singleLetter: 'W', fullName: 'Wednesday', index: 3 },
  { id: '5', singleLetter: 'T', fullName: 'Thursday', index: 4 },
  { id: '6', singleLetter: 'F', fullName: 'Friday', index: 5 },
  { id: '7', singleLetter: 'S', fullName: 'Saturday', index: 6 },
] as const;

/**
 * Constants for timeout durations
 */
const VALIDATION_TIMEOUT_MS = 3000;
const ERROR_DISPLAY_TIMEOUT_MS = 6000;
const TOTAL_DAYS_IN_WEEK = 7;

/**
 * SearchScheduleSelector Component
 *
 * Interactive weekly schedule selector with drag selection, validation,
 * and comprehensive accessibility support.
 *
 * @component
 * @param {SearchScheduleSelectorProps} props - Component props
 * @returns {JSX.Element} Rendered component
 *
 * @example
 * <SearchScheduleSelector
 *   minDays={2}
 *   maxDays={5}
 *   requireContiguous={true}
 *   onSelectionChange={(days) => console.log('Selected:', days)}
 *   onError={(error) => console.error('Validation error:', error)}
 * />
 */
export const SearchScheduleSelector = memo<SearchScheduleSelectorProps>(function SearchScheduleSelector({
  onSelectionChange,
  onError,
  className = '',
  minDays = 2,
  maxDays = 5,
  requireContiguous = true,
  initialSelection = [],
}) {
  // State management with immutable patterns
  const [selectedDays, setSelectedDays] = useState<ReadonlySet<number>>(
    () => new Set(initialSelection.filter(idx => idx >= 0 && idx <= 6))
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [mouseDownIndex, setMouseDownIndex] = useState<number | null>(null);
  const [showError, setShowError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hasContiguityError, setHasContiguityError] = useState<boolean>(false);
  const [listingsCountPartial, setListingsCountPartial] = useState<number>(0);
  const [listingsCountExact, setListingsCountExact] = useState<number>(0);
  const [validationTimeout, setValidationTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [errorTimeout, setErrorTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Checks if a set of days is contiguous
   * Handles week-wrapping (e.g., Saturday-Sunday-Monday is contiguous)
   *
   * @param {ReadonlySet<number>} days - Set of day indices to check
   * @returns {boolean} True if days are contiguous
   *
   * @example
   * isContiguous(new Set([1, 2, 3])) // true (Mon-Tue-Wed)
   * isContiguous(new Set([1, 3])) // false (Mon, Wed - gap)
   * isContiguous(new Set([6, 0, 1])) // true (Sat-Sun-Mon - wraps)
   */
  const isContiguous = useCallback((days: ReadonlySet<number>): boolean => {
    if (days.size === 0) return true;

    const daysArray = Array.from(days).sort((a, b) => a - b);

    // Check normal contiguous sequence (e.g., 1,2,3,4)
    let isNormalContiguous = true;
    for (let i = 1; i < daysArray.length; i++) {
      const current = daysArray[i];
      const previous = daysArray[i - 1];
      if (current !== undefined && previous !== undefined && current - previous !== 1) {
        isNormalContiguous = false;
        break;
      }
    }

    if (isNormalContiguous) return true;

    // Check for week-wrapping contiguous sequence
    // Find if there's exactly one gap, and it wraps around the week
    let gapIndex = -1;
    for (let i = 1; i < daysArray.length; i++) {
      const current = daysArray[i];
      const previous = daysArray[i - 1];
      if (current !== undefined && previous !== undefined && current - previous > 1) {
        if (gapIndex !== -1) {
          // More than one gap - not contiguous
          return false;
        }
        gapIndex = i;
      }
    }

    // If there's a gap, check if it wraps around (Saturday to Sunday)
    if (gapIndex !== -1) {
      const lastElement = daysArray[daysArray.length - 1];
      const firstElement = daysArray[0];
      // Week wrapping: last day is Saturday (6) and first day is Sunday (0)
      if (lastElement === 6 && firstElement === 0) {
        return true;
      }
    }

    return false;
  }, []);

  /**
   * Validates the current selection against constraints
   *
   * @param {ReadonlySet<number>} days - Set of selected day indices
   * @returns {ValidationResult} Validation result with error message if invalid
   *
   * @example
   * validateSelection(new Set([1, 2])) // { valid: false, error: 'Please select at least 2 nights' }
   * validateSelection(new Set([1, 2, 3])) // { valid: true }
   */
  const validateSelection = useCallback(
    (days: ReadonlySet<number>): ValidationResult => {
      const dayCount = days.size;
      const nightCount = dayCount - 1;

      // Empty selection is valid
      if (dayCount === 0) {
        return { valid: true };
      }

      // Validate minimum nights
      if (nightCount < minDays) {
        return {
          valid: false,
          error: `Please select at least ${minDays} night${minDays > 1 ? 's' : ''} per week`,
        };
      }

      // Validate maximum nights
      if (nightCount > maxDays) {
        return {
          valid: false,
          error: `Please select no more than ${maxDays} night${maxDays > 1 ? 's' : ''} per week`,
        };
      }

      // Validate contiguity if required
      if (requireContiguous && !isContiguous(days)) {
        return {
          valid: false,
          error: 'Please select contiguous days (e.g., Mon-Tue-Wed, not Mon-Wed-Fri)',
        };
      }

      return { valid: true };
    },
    [minDays, maxDays, requireContiguous, isContiguous]
  );

  /**
   * Displays an error message with timeout
   * Clears previous error timeout and sets new one
   *
   * @param {string} error - Error message to display
   */
  const displayError = useCallback(
    (error: string) => {
      // Clear existing error timeout
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }

      setErrorMessage(error);
      setShowError(true);

      // Set new timeout to hide error
      const timeout = setTimeout(() => {
        setShowError(false);
      }, ERROR_DISPLAY_TIMEOUT_MS);

      setErrorTimeout(timeout);

      // Notify parent component of error
      if (onError) {
        onError(error);
      }
    },
    [onError, errorTimeout]
  );

  /**
   * Handles mouse down on a day cell (start of selection or drag)
   *
   * @param {number} dayIndex - Index of the day (0-6)
   */
  const handleMouseDown = useCallback((dayIndex: number) => {
    setMouseDownIndex(dayIndex);
  }, []);

  /**
   * Handles mouse enter on a day cell (during drag)
   * Calculates contiguous selection from drag start to current cell
   *
   * @param {number} dayIndex - Index of the day (0-6)
   */
  const handleMouseEnter = useCallback(
    (dayIndex: number) => {
      // Only handle drag if mouse is down and we've moved to a different cell
      if (mouseDownIndex !== null && dayIndex !== mouseDownIndex) {
        setIsDragging(true);

        // Calculate contiguous selection from start to current index
        const start = mouseDownIndex;
        let dayCount: number;

        if (dayIndex >= start) {
          // Forward selection (e.g., Mon -> Fri)
          dayCount = dayIndex - start + 1;
        } else {
          // Wrap-around selection (e.g., Sat -> Mon)
          dayCount = (TOTAL_DAYS_IN_WEEK - start) + dayIndex + 1;
        }

        // Create new selection set (immutable update)
        const newSelection = new Set<number>();
        for (let i = 0; i < dayCount; i++) {
          const currentDay = (start + i) % TOTAL_DAYS_IN_WEEK;
          newSelection.add(currentDay);
        }

        setSelectedDays(newSelection);
      }
    },
    [mouseDownIndex]
  );

  /**
   * Handles mouse up on a day cell (end of selection or click)
   * Validates selection and triggers callbacks
   *
   * @param {number} dayIndex - Index of the day (0-6)
   */
  const handleMouseUp = useCallback(
    (dayIndex: number) => {
      if (mouseDownIndex === null) return;

      if (!isDragging && dayIndex === mouseDownIndex) {
        // Simple click - toggle selection
        setSelectedDays(prev => {
          const newSelection = new Set(prev);

          if (newSelection.has(dayIndex)) {
            newSelection.delete(dayIndex);
          } else {
            newSelection.add(dayIndex);
          }

          // Clear previous validation timeout
          if (validationTimeout) {
            clearTimeout(validationTimeout);
          }

          // Set new validation timeout (delayed validation)
          const timeout = setTimeout(() => {
            const validation = validateSelection(newSelection);
            if (!validation.valid && validation.error) {
              displayError(validation.error);
            }
          }, VALIDATION_TIMEOUT_MS);

          setValidationTimeout(timeout);

          return newSelection;
        });
      } else if (isDragging) {
        // Drag selection - validate immediately
        const validation = validateSelection(selectedDays);
        if (!validation.valid && validation.error) {
          displayError(validation.error);
          // Reset selection on invalid drag
          setSelectedDays(new Set());
        }
      }

      // Reset drag state
      setIsDragging(false);
      setMouseDownIndex(null);
    },
    [isDragging, mouseDownIndex, selectedDays, validationTimeout, validateSelection, displayError]
  );

  /**
   * Handles keyboard interaction for accessibility
   * Supports Enter and Space keys for toggling selection
   *
   * @param {React.KeyboardEvent} event - Keyboard event
   * @param {number} dayIndex - Index of the day (0-6)
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, dayIndex: number) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();

        setSelectedDays(prev => {
          const newSelection = new Set(prev);

          if (newSelection.has(dayIndex)) {
            newSelection.delete(dayIndex);
          } else {
            newSelection.add(dayIndex);
          }

          return newSelection;
        });
      }
    },
    []
  );

  /**
   * Resets the selection and clears all timeouts
   */
  const handleReset = useCallback(() => {
    setSelectedDays(new Set());

    // Clear all timeouts
    if (validationTimeout) {
      clearTimeout(validationTimeout);
      setValidationTimeout(null);
    }
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      setErrorTimeout(null);
    }

    setShowError(false);
  }, [validationTimeout, errorTimeout]);

  /**
   * Effect: Notify parent of selection changes
   */
  useEffect(() => {
    if (onSelectionChange) {
      const selectedDaysArray = Array.from(selectedDays)
        .map(index => DAYS_OF_WEEK[index])
        .filter((day): day is Day => day !== undefined);
      onSelectionChange(selectedDaysArray);
    }

    // Check contiguity and display error if needed
    if (selectedDays.size > 1 && requireContiguous) {
      const isValid = isContiguous(selectedDays);
      const wasContiguousError = hasContiguityError;
      setHasContiguityError(!isValid);

      if (!isValid && !wasContiguousError && !showError) {
        displayError('Please select contiguous days (e.g., Mon-Tue-Wed, not Mon-Wed-Fri)');
      }
    } else {
      setHasContiguityError(false);
      if (showError) {
        setShowError(false);
      }
    }
  }, [selectedDays, onSelectionChange, requireContiguous, isContiguous, hasContiguityError, showError, displayError]);

  /**
   * Effect: Update listing counts (mock implementation)
   * TODO: Replace with actual API call in production
   */
  useEffect(() => {
    if (selectedDays.size > 0) {
      // Mock listing counts - replace with actual API call
      setListingsCountPartial(Math.floor(Math.random() * 20));
      setListingsCountExact(Math.floor(Math.random() * 10));
    } else {
      setListingsCountPartial(0);
      setListingsCountExact(0);
    }
  }, [selectedDays]);

  /**
   * Effect: Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, [validationTimeout, errorTimeout]);

  /**
   * Memoized computation of container class names
   */
  const containerClassName = useMemo(
    () => `${styles.container} ${className}`.trim(),
    [className]
  );

  /**
   * Memoized computation of day cell class names
   */
  const getDayCellClassName = useCallback(
    (index: number) => {
      const classes = [styles.dayCell];

      if (isDragging) {
        classes.push(styles.dragging);
      }

      if (hasContiguityError && selectedDays.has(index)) {
        classes.push(styles.hasError);
      }

      return classes.join(' ');
    },
    [isDragging, hasContiguityError, selectedDays]
  );

  return (
    <div className={containerClassName} role="region" aria-label="Weekly schedule selector">
      <div className={styles.selectorRow}>
        <div className={styles.calendarIcon} aria-hidden="true">
          📅
        </div>

        <div className={styles.daysGrid}>
          {DAYS_OF_WEEK.map((day, index) => (
            <button
              key={day.id}
              className={getDayCellClassName(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMouseDown(index);
              }}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseUp={() => handleMouseUp(index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              role="button"
              aria-pressed={selectedDays.has(index)}
              aria-label={`Select ${day.fullName}`}
              tabIndex={0}
              type="button"
            >
              {day.singleLetter}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.infoContainer}>
        {selectedDays.size > 0 && (
          <>
            <p className={styles.infoText}>
              {listingsCountExact} exact match{listingsCountExact !== 1 ? 'es' : ''} • {listingsCountPartial} partial match{listingsCountPartial !== 1 ? 'es' : ''}
            </p>
            <button
              className={styles.resetButton}
              onClick={handleReset}
              type="button"
              aria-label="Clear selection"
            >
              Clear selection
            </button>
          </>
        )}
      </div>

      {showError && (
        <div className={styles.errorPopup} role="alert" aria-live="assertive">
          <span className={styles.errorIcon} aria-hidden="true">
            ⚠️
          </span>
          <p className={styles.errorMessage}>{errorMessage}</p>
        </div>
      )}
    </div>
  );
});

// Set display name for debugging
SearchScheduleSelector.displayName = 'SearchScheduleSelector';

export default SearchScheduleSelector;
