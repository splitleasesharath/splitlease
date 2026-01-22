/**
 * AvailabilityCalendar - Weekly calendar view for managing host availability
 * Shows time slots and allows blocking/unblocking
 */

import { useMemo } from 'react';
import {
  calculateWeeklyCalendarGrid,
  calculateWeeklyAvailabilitySummary,
  formatDateString
} from '../../../../logic/calculators/availability/calculateAvailableSlots';

export default function AvailabilityCalendar({
  blockedSlots = [],
  selectedHost,
  hosts = [],
  onSelectHost,
  onBlockSlot,
  onUnblockSlot,
  onBlockFullDay,
  onUnblockFullDay,
  weekStart,
  onNavigateWeek,
  isLoading
}) {
  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    return calculateWeeklyCalendarGrid(weekStart, blockedSlots);
  }, [weekStart, blockedSlots]);

  // Calculate availability summary
  const summary = useMemo(() => {
    return calculateWeeklyAvailabilitySummary(calendarDays);
  }, [calendarDays]);

  // Format week display
  const weekDisplay = useMemo(() => {
    if (calendarDays.length === 0) return '';
    const start = calendarDays[0].displayDate;
    const end = calendarDays[6].displayDate;
    return `${start} - ${end}`;
  }, [calendarDays]);

  const handleSlotClick = (day, slot) => {
    if (!selectedHost) return;

    if (slot.available) {
      onBlockSlot(day.dateStr, slot.startTime, slot.endTime);
    } else if (!slot.isFullDayBlocked) {
      onUnblockSlot(slot.id || `${day.dateStr}-${slot.startTime}`);
    }
  };

  const handleDayHeaderClick = (day) => {
    if (!selectedHost) return;

    if (day.isFullDayBlocked) {
      onUnblockFullDay(day.dateStr);
    } else {
      onBlockFullDay(day.dateStr);
    }
  };

  return (
    <div className="availability-calendar">
      {/* Header */}
      <header className="availability-calendar__header">
        <h3 className="availability-calendar__title">Host Availability</h3>

        {/* Host Selector */}
        <div className="availability-calendar__host-select">
          <label className="availability-calendar__label" htmlFor="host-select">
            Select Host:
          </label>
          <select
            id="host-select"
            value={selectedHost?.id || ''}
            onChange={(e) => {
              const host = hosts.find(h => h.id === e.target.value);
              onSelectHost(host || null);
            }}
            className="availability-calendar__select"
          >
            <option value="">Choose a host...</option>
            {hosts.map(host => (
              <option key={host.id} value={host.id}>
                {host.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {!selectedHost ? (
        <div className="availability-calendar__placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <p>Select a host to view and manage their availability</p>
        </div>
      ) : (
        <>
          {/* Week Navigation */}
          <div className="availability-calendar__nav">
            <button
              className="availability-calendar__nav-btn"
              onClick={() => onNavigateWeek('prev')}
              disabled={isLoading}
              aria-label="Previous week"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="availability-calendar__week-display">{weekDisplay}</span>
            <button
              className="availability-calendar__nav-btn"
              onClick={() => onNavigateWeek('next')}
              disabled={isLoading}
              aria-label="Next week"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Summary */}
          <div className="availability-calendar__summary">
            <div className="availability-calendar__summary-item">
              <span className="availability-calendar__summary-value availability-calendar__summary-value--available">
                {summary.availableSlots}
              </span>
              <span className="availability-calendar__summary-label">Available</span>
            </div>
            <div className="availability-calendar__summary-item">
              <span className="availability-calendar__summary-value availability-calendar__summary-value--blocked">
                {summary.blockedSlots}
              </span>
              <span className="availability-calendar__summary-label">Blocked</span>
            </div>
            <div className="availability-calendar__summary-item">
              <span className="availability-calendar__summary-value">
                {summary.percentageAvailable}%
              </span>
              <span className="availability-calendar__summary-label">Open</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="availability-calendar__grid">
            {/* Day Headers */}
            {calendarDays.map(day => (
              <div
                key={day.dateStr}
                className={`availability-calendar__day-header ${day.isFullDayBlocked ? 'availability-calendar__day-header--blocked' : ''}`}
                onClick={() => handleDayHeaderClick(day)}
                role="button"
                tabIndex={0}
                title={day.isFullDayBlocked ? 'Click to unblock full day' : 'Click to block full day'}
              >
                <span className="availability-calendar__day-name">{day.dayName}</span>
                <span className="availability-calendar__day-date">{day.displayDate}</span>
                {day.isFullDayBlocked && (
                  <span className="availability-calendar__blocked-badge">Blocked</span>
                )}
              </div>
            ))}

            {/* Time Slots */}
            {calendarDays.map(day => (
              <div key={`slots-${day.dateStr}`} className="availability-calendar__day-slots">
                {day.slots.map(slot => (
                  <button
                    key={`${day.dateStr}-${slot.hour}`}
                    className={`availability-calendar__slot ${
                      slot.available
                        ? 'availability-calendar__slot--available'
                        : 'availability-calendar__slot--blocked'
                    }`}
                    onClick={() => handleSlotClick(day, slot)}
                    disabled={isLoading || slot.isFullDayBlocked}
                    title={slot.available ? `Block ${slot.label}` : `Unblock ${slot.label}`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="availability-calendar__legend">
            <div className="availability-calendar__legend-item">
              <span className="availability-calendar__legend-color availability-calendar__legend-color--available" />
              <span>Available</span>
            </div>
            <div className="availability-calendar__legend-item">
              <span className="availability-calendar__legend-color availability-calendar__legend-color--blocked" />
              <span>Blocked</span>
            </div>
          </div>
        </>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="availability-calendar__loading">
          <div className="availability-calendar__spinner" />
        </div>
      )}
    </div>
  );
}
