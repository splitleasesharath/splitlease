import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  user-select: none;

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const SelectorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  max-width: 100%;
  overflow: hidden;
`;

const CalendarIcon = styled.div`
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  @media (max-width: 400px) {
    width: 32px;
    height: 32px;
    margin-right: 4px;
  }
`;

const DaysGrid = styled.div`
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
  flex-shrink: 1;
  min-width: 0;

  /* Attention animation on page load */
  animation: attention-pulse 0.6s ease-out 0.5s both;

  @keyframes attention-pulse {
    0% {
      transform: scale(1);
    }
    25% {
      transform: scale(1.05);
    }
    50% {
      transform: scale(0.98);
    }
    75% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
    }
  }

  @media (max-width: 768px) {
    gap: 4px;
  }

  @media (max-width: 360px) {
    gap: 2px;
  }
`;

const DayCell = styled.button`
  width: 34px;
  height: 34px;
  min-width: 34px;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Inter", Helvetica, Arial, sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 17px;
  border: none;
  border-radius: 8px;
  padding: 0;
  cursor: ${props => props.$isDragging ? 'grabbing' : 'pointer'};
  transition: transform 0.15s ease-in-out, background 0.2s ease-in-out;
  box-shadow: none;
  box-sizing: border-box;

  /* Error state styling */
  ${props => props.$hasError && props.$isSelected && `
    background-color: #d32f2f !important;
    color: #ffffff !important;
    animation: pulse-error 1.5s ease-in-out infinite;

    @keyframes pulse-error {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `}

  /* Normal selected/unselected state (no error) */
  ${props => !props.$hasError && `
    background-color: ${props.$isSelected ? '#4B47CE' : '#B2B2B2'};
    color: #ffffff;
  `}

  &:hover {
    transform: scale(1.05) translateY(-2px);
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid #4B47CE;
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    width: 34px;
    height: 34px;
    font-size: 14px;
  }

  @media (max-width: 480px) {
    width: 30px;
    height: 30px;
    min-width: 30px;
    min-height: 30px;
    font-size: 13px;
  }

  @media (max-width: 360px) {
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
    font-size: 12px;
  }
`;

const InfoContainer = styled.div`
  min-height: 24px;
  max-width: 450px;
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 5px 0 16px 0;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const InfoText = styled.p`
  margin: 0;
  font-size: 14.7px;
  font-weight: 400;
  color: #000000;
  text-align: center;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  width: 100%;

  strong {
    font-weight: 600;
  }

  .day-name {
    color: #31135D;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const CheckInOutRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const RepeatIcon = styled.svg`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #4B47CE;
`;

const RepeatPatternText = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Days of the week constant - Starting with Sunday (S, M, T, W, T, F, S)
 * Uses 0-based indexing matching JavaScript Date.getDay()
 */
const DAYS_OF_WEEK = [
  { id: '0', singleLetter: 'S', fullName: 'Sunday', index: 0 },
  { id: '1', singleLetter: 'M', fullName: 'Monday', index: 1 },
  { id: '2', singleLetter: 'T', fullName: 'Tuesday', index: 2 },
  { id: '3', singleLetter: 'W', fullName: 'Wednesday', index: 3 },
  { id: '4', singleLetter: 'T', fullName: 'Thursday', index: 4 },
  { id: '5', singleLetter: 'F', fullName: 'Friday', index: 5 },
  { id: '6', singleLetter: 'S', fullName: 'Saturday', index: 6 },
];

/**
 * Get human-readable repeat pattern description
 * @param {string} weekPattern - The week pattern key (e.g., 'every-week', 'one-on-off')
 * @returns {string|null} The repeat description or null if every week
 */
const getRepeatPatternText = (weekPattern) => {
  const patterns = {
    'every-week': null, // No repeat text for every week
    'one-on-off': 'Repeats 1 week on, 1 week off',
    'two-on-off': 'Repeats 2 weeks on, 2 weeks off',
    'one-three-off': 'Repeats 1 week on, 3 weeks off',
  };
  return patterns[weekPattern] || null;
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Get initial selection from URL parameter or default to Monday-Friday
 * URL parameter format: ?days-selected=1,2,3,4,5 (0-based, where 0=Sunday)
 * Internal format: [1,2,3,4,5] (0-based, where 0=Sunday)
 */
const getInitialSelectionFromUrl = () => {
  // Try to get from URL parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const daysParam = urlParams.get('days-selected');

  if (daysParam) {
    try {
      // Parse 0-based indices from URL directly
      const dayIndices = daysParam.split(',').map(d => parseInt(d.trim(), 10));
      const validDays = dayIndices.filter(d => d >= 0 && d <= 6); // Validate 0-based range

      if (validDays.length > 0) {
        console.log('📅 SearchScheduleSelector: Loaded selection from URL:', {
          urlParam: daysParam,
          dayIndices: validDays
        });
        return validDays;
      }
    } catch (e) {
      console.warn('⚠️ Failed to parse days-selected URL parameter:', e);
    }
  }

  // Default to Monday-Friday (0-based: [1,2,3,4,5])
  console.log('📅 SearchScheduleSelector: Using default Monday-Friday selection');
  return [1, 2, 3, 4, 5];
};

/**
 * SearchScheduleSelector Component
 *
 * A weekly schedule selector for split-lease arrangements.
 * Allows users to select 2-5 contiguous nights per week.
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onSelectionChange] - Callback fired when the selection changes
 * @param {Function} [props.onError] - Callback fired when a validation error occurs
 * @param {string} [props.className] - Custom styling class name
 * @param {number} [props.minDays=2] - Minimum number of days that can be selected
 * @param {boolean} [props.requireContiguous=true] - Whether to require contiguous day selection
 * @param {number[]} [props.initialSelection] - Initial selected days (array of day indices 0-6). If not provided, reads from URL or defaults to Monday-Friday
 * @param {string} [props.weekPattern='every-week'] - The weekly pattern (e.g., 'every-week', 'one-on-off', 'two-on-off', 'one-three-off')
 *
 * @example
 * ```jsx
 * <SearchScheduleSelector
 *   onSelectionChange={(days) => console.log(days)}
 *   onError={(error) => console.error(error)}
 * />
 * ```
 */
export default function SearchScheduleSelector({
  onSelectionChange,
  onError,
  className,
  minDays = 2,
  requireContiguous = true,
  initialSelection,
  updateUrl = true,
  weekPattern = 'every-week',
}) {
  // Use initialSelection if provided, otherwise get from URL or use default
  const getInitialState = () => {
    if (initialSelection !== undefined && initialSelection !== null) {
      return new Set(initialSelection);
    }
    return new Set(getInitialSelectionFromUrl());
  };

  const [selectedDays, setSelectedDays] = useState(getInitialState());
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownIndex, setMouseDownIndex] = useState(null);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasContiguityError, setHasContiguityError] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState(null);
  const [errorTimeout, setErrorTimeout] = useState(null);
  const [checkinDay, setCheckinDay] = useState('');
  const [checkoutDay, setCheckoutDay] = useState('');

  /**
   * Check if selected days are contiguous (handles wrap-around)
   * Uses the exact logic from index_lite page
   * Example: [5, 6, 0, 1, 2] (Fri, Sat, Sun, Mon, Tue) is contiguous
   */
  const isContiguous = useCallback((days) => {
    const daysArray = Array.from(days);

    // Edge cases
    if (daysArray.length <= 1) {
      return true;
    }

    if (daysArray.length >= 6) {
      return true;
    }

    const sortedDays = [...daysArray].sort((a, b) => a - b);

    // STEP 1: Check if selected days are continuous (regular check)
    let isRegularContinuous = true;
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] !== sortedDays[i - 1] + 1) {
        isRegularContinuous = false;
        break;
      }
    }

    if (isRegularContinuous) {
      return true;
    }

    // STEP 2: Check if UNSELECTED days are continuous (implies wrap-around)
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const unselectedDays = allDays.filter(day => !sortedDays.includes(day));

    if (unselectedDays.length === 0) {
      // All days selected
      return true;
    }

    // Check if unselected days are continuous
    const sortedUnselected = [...unselectedDays].sort((a, b) => a - b);
    for (let i = 1; i < sortedUnselected.length; i++) {
      if (sortedUnselected[i] !== sortedUnselected[i - 1] + 1) {
        // Unselected days not continuous, selection is not valid
        return false;
      }
    }

    // Unselected days are continuous, selection wraps around!
    return true;
  }, []);

  /**
   * Validate the current selection
   * NOTE: Nights = Days - 1 (last day is checkout, doesn't count as a night)
   */
  const validateSelection = useCallback(
    (days) => {
      const dayCount = days.size;
      const nightCount = dayCount - 1; // Checkout day doesn't count as a night

      if (dayCount === 0) {
        return { valid: true };
      }

      // Need at least minDays + 1 days to have minDays nights
      // Example: 2 nights requires 3 days (check-in + 2 nights + checkout)
      if (nightCount < minDays) {
        return {
          valid: false,
          error: `Please select at least ${minDays} night${minDays > 1 ? 's' : ''} per week`,
        };
      }

      if (requireContiguous && !isContiguous(days)) {
        return {
          valid: false,
          error: 'Please select contiguous days (e.g., Mon-Tue-Wed, not Mon-Wed-Fri)',
        };
      }

      return { valid: true };
    },
    [minDays, requireContiguous, isContiguous]
  );

  /**
   * Display error message
   */
  const displayError = useCallback(
    (error) => {
      // Clear any existing error timeout
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }

      setErrorMessage(error);
      setShowError(true);

      // Hide error after 6 seconds
      const timeout = setTimeout(() => {
        setShowError(false);
      }, 6000);

      setErrorTimeout(timeout);

      if (onError) {
        onError(error);
      }
    },
    [onError, errorTimeout]
  );

  /**
   * Handle mouse down - Start tracking for click vs drag
   */
  const handleMouseDown = useCallback((dayIndex) => {
    setMouseDownIndex(dayIndex);
  }, []);

  /**
   * Handle mouse enter - If dragging, fill range
   */
  const handleMouseEnter = useCallback(
    (dayIndex) => {
      // Only drag if mouse is down and we moved to a different cell
      if (mouseDownIndex !== null && dayIndex !== mouseDownIndex) {
        setIsDragging(true);

        const newSelection = new Set();
        const totalDays = 7;
        const start = mouseDownIndex;

        // Calculate range with wrap-around
        let dayCount;
        if (dayIndex >= start) {
          dayCount = dayIndex - start + 1;
        } else {
          dayCount = (totalDays - start) + dayIndex + 1;
        }

        // Fill all days in range
        for (let i = 0; i < dayCount; i++) {
          const currentDay = (start + i) % totalDays;
          newSelection.add(currentDay);
        }

        setSelectedDays(newSelection);
      }
    },
    [mouseDownIndex]
  );

  /**
   * Handle mouse up - Determine if click or drag, then act accordingly
   */
  const handleMouseUp = useCallback(
    (dayIndex) => {
      if (mouseDownIndex === null) return;

      // Check if this was a click (same cell) or drag (different cell)
      if (!isDragging && dayIndex === mouseDownIndex) {
        // CLICK - Toggle the day
        setSelectedDays(prev => {
          const newSelection = new Set(prev);

          if (newSelection.has(dayIndex)) {
            // Check if removing this day would go below minimum nights
            // After removal: (size - 1) days, which gives (size - 1 - 1) = (size - 2) nights
            const daysAfterRemoval = newSelection.size - 1;
            const nightsAfterRemoval = daysAfterRemoval - 1; // Checkout day doesn't count
            if (nightsAfterRemoval < minDays) {
              // Prevent removal and show error
              displayError(`Cannot remove day - you must select at least ${minDays} night${minDays > 1 ? 's' : ''} per week`);
              return prev; // Return unchanged selection
            }
            newSelection.delete(dayIndex);
          } else {
            newSelection.add(dayIndex);
          }

          // Clear existing validation timeout
          if (validationTimeout) {
            clearTimeout(validationTimeout);
          }

          // Schedule validation after 3 seconds of inactivity
          const timeout = setTimeout(() => {
            // Only validate if selection is invalid
            const validation = validateSelection(newSelection);
            if (!validation.valid && validation.error) {
              displayError(validation.error);
            }
          }, 3000);

          setValidationTimeout(timeout);

          return newSelection;
        });
      } else if (isDragging) {
        // DRAG - Validate immediately
        const validation = validateSelection(selectedDays);
        if (!validation.valid && validation.error) {
          displayError(validation.error);
          setSelectedDays(new Set());
        }
      }

      // Reset drag state
      setIsDragging(false);
      setMouseDownIndex(null);
    },
    [isDragging, mouseDownIndex, selectedDays, validationTimeout, validateSelection, displayError, minDays]
  );

  /**
   * Calculate check-in and check-out days based on selection
   * Uses the exact logic from index_lite page
   */
  const calculateCheckinCheckout = useCallback((days) => {
    if (days.size === 0) {
      setCheckinDay('');
      setCheckoutDay('');
      return;
    }

    if (!isContiguous(days)) {
      setCheckinDay('');
      setCheckoutDay('');
      return;
    }

    const selectedDaysArray = Array.from(days);

    // Single day selection
    if (selectedDaysArray.length === 1) {
      setCheckinDay(DAYS_OF_WEEK[selectedDaysArray[0]].fullName);
      setCheckoutDay(DAYS_OF_WEEK[selectedDaysArray[0]].fullName);
      return;
    }

    // Multiple day selection
    const sortedDays = [...selectedDaysArray].sort((a, b) => a - b);
    const hasSunday = sortedDays.includes(0);
    const hasSaturday = sortedDays.includes(6);

    // Check if this is a wrap-around case
    if (hasSunday && hasSaturday && sortedDays.length < 7) {
      // Find the gap (unselected days) in the week
      let gapStart = -1;
      let gapEnd = -1;

      // Look for the gap in the sorted days
      for (let i = 0; i < sortedDays.length - 1; i++) {
        if (sortedDays[i + 1] - sortedDays[i] > 1) {
          // Found the gap
          gapStart = sortedDays[i] + 1;  // First unselected day
          gapEnd = sortedDays[i + 1] - 1;  // Last unselected day
          break;
        }
      }

      if (gapStart !== -1 && gapEnd !== -1) {
        // Wrap-around case with a gap in the middle
        // Check-in: First selected day AFTER the gap ends
        // Check-out: Last selected day BEFORE the gap starts

        // Check-in is the smallest day after the gap (considering wrap)
        let checkinDayIndex;
        if (sortedDays.some(day => day > gapEnd)) {
          // There are days after the gap in the same week
          checkinDayIndex = sortedDays.find(day => day > gapEnd);
        } else {
          // Wrap to Sunday
          checkinDayIndex = 0;
        }

        // Check-out is the largest day before the gap
        let checkoutDayIndex;
        if (sortedDays.some(day => day < gapStart)) {
          // There are days before the gap
          checkoutDayIndex = sortedDays.filter(day => day < gapStart).pop();
        } else {
          // Wrap to Saturday
          checkoutDayIndex = 6;
        }

        setCheckinDay(DAYS_OF_WEEK[checkinDayIndex].fullName);
        setCheckoutDay(DAYS_OF_WEEK[checkoutDayIndex].fullName);
      } else {
        // No gap found (shouldn't happen with Sunday and Saturday selected)
        // Use standard min/max
        setCheckinDay(DAYS_OF_WEEK[sortedDays[0]].fullName);
        setCheckoutDay(DAYS_OF_WEEK[sortedDays[sortedDays.length - 1]].fullName);
      }
    } else {
      // Non-wrap-around case: use first and last in sorted order
      setCheckinDay(DAYS_OF_WEEK[sortedDays[0]].fullName);
      setCheckoutDay(DAYS_OF_WEEK[sortedDays[sortedDays.length - 1]].fullName);
    }
  }, [isContiguous]);

  /**
   * Update URL parameter when selection changes
   * Format: ?days-selected=1,2,3,4,5 (0-based, where 0=Sunday)
   * Only updates URL if updateUrl prop is true
   */
  useEffect(() => {
    if (!updateUrl) {
      console.log('📅 SearchScheduleSelector: URL updates disabled');
      return;
    }

    const selectedDaysArray = Array.from(selectedDays).sort((a, b) => a - b);

    if (selectedDaysArray.length > 0) {
      // Use 0-based indices directly in URL
      const daysParam = selectedDaysArray.join(',');

      // Update URL without reloading the page
      const url = new URL(window.location);
      url.searchParams.set('days-selected', daysParam);
      window.history.replaceState({}, '', url);

      console.log('📅 SearchScheduleSelector: Updated URL parameter:', {
        dayIndices: selectedDaysArray,
        urlParam: daysParam
      });

      // Dispatch custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('daysSelected', { detail: { days: selectedDaysArray } }));
    } else {
      // Remove parameter if no days selected
      const url = new URL(window.location);
      url.searchParams.delete('days-selected');
      window.history.replaceState({}, '', url);

      console.log('📅 SearchScheduleSelector: Removed URL parameter (no days selected)');
    }
  }, [selectedDays, updateUrl]);

  /**
   * Update parent component on selection change
   * Also check for contiguity errors in real-time
   */
  useEffect(() => {
    if (onSelectionChange) {
      const selectedDaysArray = Array.from(selectedDays).map(
        index => DAYS_OF_WEEK[index]
      );
      onSelectionChange(selectedDaysArray);
    }

    // Calculate check-in/check-out
    calculateCheckinCheckout(selectedDays);

    // Validate the current selection to determine if error should be cleared
    const validation = validateSelection(selectedDays);
    const selectionIsValid = validation.valid;

    // Check for contiguity error (visual feedback + immediate alert)
    if (selectedDays.size > 1 && requireContiguous) {
      const isContiguousNow = isContiguous(selectedDays);
      const wasContiguousError = hasContiguityError;
      setHasContiguityError(!isContiguousNow);

      // Show contiguity error immediately only if it's a NEW error (wasn't already showing)
      if (!isContiguousNow && !wasContiguousError && !showError) {
        displayError('Please select contiguous days (e.g., Mon-Tue-Wed, not Mon-Wed-Fri)');
      } else if (isContiguousNow && showError && wasContiguousError) {
        // Selection became contiguous, clear the error immediately
        if (errorTimeout) {
          clearTimeout(errorTimeout);
        }
        setShowError(false);
      } else if (selectionIsValid && showError) {
        // Selection became valid (enough nights AND contiguous), clear any error
        if (errorTimeout) {
          clearTimeout(errorTimeout);
        }
        setShowError(false);
      }
    } else {
      setHasContiguityError(false);
      // Hide error if selection becomes valid (has enough nights)
      if (showError && selectionIsValid) {
        if (errorTimeout) {
          clearTimeout(errorTimeout);
        }
        setShowError(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays]);


  return (
    <Container className={className}>
      <SelectorRow>
        <CalendarIcon>
          <img
            src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1748370325535x745487629939088300/calendar-minimalistic-svgrepo-com%202.svg"
            alt="Calendar"
          />
        </CalendarIcon>

        <DaysGrid>
          {DAYS_OF_WEEK.map((day, index) => (
            <DayCell
              key={day.id}
              $isSelected={selectedDays.has(index)}
              $isDragging={isDragging}
              $hasError={hasContiguityError}
              $errorStyle={1}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMouseDown(index);
              }}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseUp={() => handleMouseUp(index)}
              role="button"
              aria-pressed={selectedDays.has(index)}
              aria-label={`Select ${day.fullName}`}
            >
              {day.singleLetter}
            </DayCell>
          ))}
        </DaysGrid>
      </SelectorRow>

      <InfoContainer>
        {selectedDays.size > 0 && (
          <>
            <InfoText>
              {showError ? (
                <span style={{ color: '#d32f2f' }}>
                  {errorMessage}
                </span>
              ) : selectedDays.size === 7 ? (
                <span className="day-name">Full Time</span>
              ) : (
                checkinDay && checkoutDay && (
                  <CheckInOutRow>
                    <RepeatIcon viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M17 2L21 6M21 6L17 10M21 6H8C5.23858 6 3 8.23858 3 11M7 22L3 18M3 18L7 14M3 18H16C18.7614 18 21 15.7614 21 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </RepeatIcon>
                    <span>
                      <strong>Check-in:</strong> <span className="day-name">{checkinDay}</span> • <strong>Check-out:</strong> <span className="day-name">{checkoutDay}</span>
                    </span>
                  </CheckInOutRow>
                )
              )}
            </InfoText>
            {!showError && selectedDays.size < 7 && getRepeatPatternText(weekPattern) && (
              <RepeatPatternText>
                {getRepeatPatternText(weekPattern)}
              </RepeatPatternText>
            )}
          </>
        )}
      </InfoContainer>
    </Container>
  );
}
