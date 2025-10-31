import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  PriceDisplay,
  Price,
  PriceUnit,
  Section,
  Label,
  InfoIcon,
  Input,
  CheckboxContainer,
  Checkbox,
  CheckboxLabel,
  DaysGrid,
  DayButton,
  StatusText,
  WarningNote,
  NoteLabel,
  NoteText,
  Select,
  HostNote,
  PricingSummary,
  PricingRow,
  PricingLabel,
  PricingValue,
  ActionButton,
} from './ProposalMenu.styles';
import type { ProposalMenuProps, WeekDay, ReservationSpanOption } from './types';

const DAYS_OF_WEEK: WeekDay[] = [
  { id: 'sun', label: 'S', index: 0 },
  { id: 'mon', label: 'M', index: 1 },
  { id: 'tue', label: 'T', index: 2 },
  { id: 'wed', label: 'W', index: 3 },
  { id: 'thu', label: 'T', index: 4 },
  { id: 'fri', label: 'F', index: 5 },
  { id: 'sat', label: 'S', index: 6 },
];

const RESERVATION_SPAN_OPTIONS: ReservationSpanOption[] = [
  { value: 6, label: '6 weeks' },
  { value: 7, label: '7 weeks' },
  { value: 8, label: '8 weeks' },
  { value: 9, label: '9 weeks (~2 months)' },
  { value: 10, label: '10 weeks' },
  { value: 12, label: '12 weeks' },
  { value: 13, label: '13 weeks (3 months)' },
  { value: 16, label: '16 weeks' },
  { value: 17, label: '17 weeks (~4 months)' },
  { value: 20, label: '20 weeks' },
  { value: 22, label: '22 weeks (~5 months)' },
  { value: 26, label: '26 weeks (6 months)' },
  { value: 0, label: 'Other (wks)' },
];

export const ProposalMenu: React.FC<ProposalMenuProps> = ({
  pricing,
  hostPreferences,
  onProposalChange,
  className,
  initialMoveInDate = '',
  initialSelectedDays = [],
  initialReservationSpan = 13,
}) => {
  const [moveInDate, setMoveInDate] = useState(initialMoveInDate);
  const [strictMoveIn, setStrictMoveIn] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set(initialSelectedDays));
  const [reservationSpan, setReservationSpan] = useState(initialReservationSpan);
  const [customWeeks, setCustomWeeks] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Calculate check-in and check-out days
  const getCheckInCheckOutDays = useCallback(() => {
    if (selectedDays.size === 0) return { checkIn: null, checkOut: null };

    const daysArray = Array.from(selectedDays).sort((a, b) => a - b);
    const checkInIndex = daysArray[0];
    const checkOutIndex = daysArray[daysArray.length - 1];

    return {
      checkIn: DAYS_OF_WEEK[checkInIndex].label === 'S' && checkInIndex === 0 ? 'Sunday' :
               DAYS_OF_WEEK[checkInIndex].label === 'M' ? 'Monday' :
               DAYS_OF_WEEK[checkInIndex].label === 'T' && checkInIndex === 2 ? 'Tuesday' :
               DAYS_OF_WEEK[checkInIndex].label === 'W' ? 'Wednesday' :
               DAYS_OF_WEEK[checkInIndex].label === 'T' && checkInIndex === 4 ? 'Thursday' :
               DAYS_OF_WEEK[checkInIndex].label === 'F' ? 'Friday' : 'Saturday',
      checkOut: DAYS_OF_WEEK[checkOutIndex].label === 'S' && checkOutIndex === 0 ? 'Sunday' :
                DAYS_OF_WEEK[checkOutIndex].label === 'M' ? 'Monday' :
                DAYS_OF_WEEK[checkOutIndex].label === 'T' && checkOutIndex === 2 ? 'Tuesday' :
                DAYS_OF_WEEK[checkOutIndex].label === 'W' ? 'Wednesday' :
                DAYS_OF_WEEK[checkOutIndex].label === 'T' && checkOutIndex === 4 ? 'Thursday' :
                DAYS_OF_WEEK[checkOutIndex].label === 'F' ? 'Friday' : 'Saturday',
    };
  }, [selectedDays]);

  // Calculate pricing
  const calculatePricing = useCallback(() => {
    const nightsPerWeek = selectedDays.size > 0 ? selectedDays.size - 1 : 0;
    const fourWeekRent = nightsPerWeek * 4 * pricing.perNight;

    const effectiveSpan = showCustomInput && customWeeks ? parseInt(customWeeks) : reservationSpan;
    const reservationTotal = (fourWeekRent / 4) * effectiveSpan;

    return {
      fourWeekRent,
      reservationTotal,
      nightsPerWeek,
    };
  }, [selectedDays, pricing.perNight, reservationSpan, showCustomInput, customWeeks]);

  const pricing_calc = calculatePricing();
  const { checkIn, checkOut } = getCheckInCheckOutDays();

  // Handle day selection
  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(dayIndex)) {
        newSelection.delete(dayIndex);
      } else {
        newSelection.add(dayIndex);
      }
      return newSelection;
    });
  };

  // Handle reservation span change
  const handleReservationSpanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    if (value === 0) {
      setShowCustomInput(true);
      setReservationSpan(0);
    } else {
      setShowCustomInput(false);
      setReservationSpan(value);
      setCustomWeeks('');
    }
  };

  // Check if selection is outside host preferences
  const isOutsideHostPreference = () => {
    const effectiveSpan = showCustomInput && customWeeks ? parseInt(customWeeks) : reservationSpan;
    return effectiveSpan < hostPreferences.minWeeks || effectiveSpan > hostPreferences.maxWeeks;
  };

  const isDaysOutsidePreference = () => {
    if (!hostPreferences.idealDays) return false;
    const nightsPerWeek = selectedDays.size > 0 ? selectedDays.size - 1 : 0;
    return nightsPerWeek > hostPreferences.idealDays;
  };

  // Notify parent of changes
  useEffect(() => {
    if (onProposalChange) {
      const effectiveSpan = showCustomInput && customWeeks ? parseInt(customWeeks) : reservationSpan;
      onProposalChange({
        moveInDate,
        strictMoveIn,
        selectedDays: Array.from(selectedDays),
        reservationSpan: effectiveSpan,
        customWeeks: showCustomInput ? parseInt(customWeeks) || 0 : undefined,
        fourWeekRent: pricing_calc.fourWeekRent,
        reservationTotal: pricing_calc.reservationTotal,
      });
    }
  }, [moveInDate, strictMoveIn, selectedDays, reservationSpan, customWeeks, showCustomInput, pricing_calc.fourWeekRent, pricing_calc.reservationTotal, onProposalChange]);

  return (
    <Container className={className}>
      {/* Price Display */}
      <PriceDisplay>
        <Price>${pricing.perNight.toFixed(2)}</Price>
        <PriceUnit>/night</PriceUnit>
      </PriceDisplay>

      {/* Ideal Move-In */}
      <Section>
        <Label htmlFor="move-in-date">
          Ideal Move-In
          <InfoIcon title="Enter your preferred move-in date">?</InfoIcon>
        </Label>
        <Input
          id="move-in-date"
          type="text"
          placeholder="MM/DD/YYYY"
          value={moveInDate}
          onChange={(e) => setMoveInDate(e.target.value)}
        />
        <CheckboxContainer>
          <Checkbox
            id="strict-move-in"
            type="checkbox"
            checked={strictMoveIn}
            onChange={(e) => setStrictMoveIn(e.target.checked)}
          />
          <CheckboxLabel htmlFor="strict-move-in">
            Strict (no negotiation on exact move in)
          </CheckboxLabel>
        </CheckboxContainer>
      </Section>

      {/* Weekly Schedule */}
      <Section>
        <Label>Weekly Schedule</Label>
        <DaysGrid>
          {DAYS_OF_WEEK.map((day) => (
            <DayButton
              key={day.id}
              $isSelected={selectedDays.has(day.index)}
              onClick={() => handleDayToggle(day.index)}
              aria-pressed={selectedDays.has(day.index)}
              aria-label={`Toggle ${day.id}`}
            >
              {day.label}
            </DayButton>
          ))}
        </DaysGrid>

        {selectedDays.size > 0 && (
          <>
            <StatusText>
              {selectedDays.size} days, {selectedDays.size - 1} nights Selected
            </StatusText>
            {checkIn && checkOut && (
              <>
                <StatusText>Check-in day is {checkIn}</StatusText>
                <StatusText>Check-out day is {checkOut}</StatusText>
              </>
            )}
          </>
        )}

        {isDaysOutsidePreference() && (
          <WarningNote>
            <NoteLabel>Note:</NoteLabel>
            <NoteText>
              You have selected more days than the host would like. This will lower your chances of the proposal being accepted.
            </NoteText>
          </WarningNote>
        )}
      </Section>

      {/* Reservation Span */}
      <Section>
        <Label htmlFor="reservation-span">
          Reservation Span
          <InfoIcon title="Select the total length of your stay">?</InfoIcon>
        </Label>
        <Select
          id="reservation-span"
          value={showCustomInput ? 0 : reservationSpan}
          onChange={handleReservationSpanChange}
        >
          {RESERVATION_SPAN_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        {showCustomInput && (
          <Input
            type="number"
            placeholder="Enter # of Weeks"
            value={customWeeks}
            onChange={(e) => setCustomWeeks(e.target.value)}
            min={1}
          />
        )}

        <HostNote>
          Host's ideal # of weeks in reservation: {hostPreferences.minWeeks} - {hostPreferences.maxWeeks}
        </HostNote>

        {isOutsideHostPreference() && (
          <WarningNote>
            <NoteLabel>Note:</NoteLabel>
            <NoteText>
              Your selected duration is outside the host's preferred range. This may affect your proposal's acceptance.
            </NoteText>
          </WarningNote>
        )}
      </Section>

      {/* Pricing Summary */}
      {selectedDays.size > 0 && (
        <PricingSummary>
          <PricingRow>
            <PricingLabel>4-Week Rent:</PricingLabel>
            <PricingValue>${pricing_calc.fourWeekRent.toFixed(2)}</PricingValue>
          </PricingRow>
          <PricingRow>
            <PricingLabel>Reservation Estimated Total:</PricingLabel>
            <PricingValue>${pricing_calc.reservationTotal.toFixed(2)}</PricingValue>
          </PricingRow>
        </PricingSummary>
      )}

      {/* Action Button */}
      <ActionButton>
        Update Split Lease Proposal
      </ActionButton>
    </Container>
  );
};

export default ProposalMenu;
