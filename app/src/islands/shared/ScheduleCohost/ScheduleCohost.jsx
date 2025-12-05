/**
 * Schedule Co-Host Component
 * Modal for scheduling meetings with Split Lease specialists
 */

import { useState, useEffect } from 'react';
import {
  generateAvailableTimeSlots,
  createCoHostRequest,
  validateTimeSlots,
  sanitizeInput,
} from './cohostService';
import './ScheduleCohost.css';

/**
 * @param {Object} props
 * @param {string} props.userId - Current user's Bubble ID
 * @param {string} props.userEmail - Current user's email
 * @param {string} props.userName - Current user's name
 * @param {string} [props.listingId] - Associated listing ID
 * @param {Function} [props.onRequestSubmitted] - Callback when request is submitted
 * @param {Function} props.onClose - Callback to close the modal
 */
export default function ScheduleCohost({
  userId,
  userEmail,
  userName,
  listingId,
  onRequestSubmitted,
  onClose,
}) {
  const [stage, setStage] = useState('form'); // 'form' | 'submitted' | 'rating'
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [requestId, setRequestId] = useState(null);

  // Rating state
  const [rating, setRating] = useState(0);
  const [ratingMessage, setRatingMessage] = useState('');

  // Initialize available slots
  useEffect(() => {
    const slots = generateAvailableTimeSlots();
    setAvailableSlots(slots);
  }, []);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSlotSelect = (slotId) => {
    setError(null);
    setSelectedSlots((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      }
      if (prev.length < 3) {
        return [...prev, slotId];
      }
      return prev;
    });
  };

  const handleClearSlots = () => {
    setSelectedSlots([]);
    setError(null);
  };

  const handleSubjectChange = (e) => {
    const value = sanitizeInput(e.target.value);
    if (value.length <= 500) {
      setSubject(value);
      setError(null);
    }
  };

  const handleDetailsChange = (e) => {
    const value = sanitizeInput(e.target.value);
    if (value.length <= 1000) {
      setDetails(value);
    }
  };

  const handleSubmit = async () => {
    const validation = validateTimeSlots(selectedSlots);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Scheduling your booking...');
    setError(null);

    const result = await createCoHostRequest({
      userId,
      userEmail,
      userName,
      listingId,
      selectedTimes: selectedSlots,
      subject,
      details,
    });

    setIsLoading(false);
    setLoadingMessage('');

    if (result.success) {
      setRequestId(result.requestId);
      setSuccessMessage('Co-Host request submitted successfully!');
      setStage('submitted');
      onRequestSubmitted?.(result.requestId, result.virtualMeetingId);
    } else {
      setError(result.error || 'Failed to submit request');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getSelectedSlotDetails = () => {
    return selectedSlots.map((slotId) => {
      const slot = availableSlots.find((s) => s.id === slotId);
      return slot?.formattedTime || slotId;
    });
  };

  return (
    <div className="schedule-cohost-overlay" onClick={handleBackdropClick}>
      <div className="schedule-cohost-modal">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="schedule-cohost-loading">
            <div className="schedule-cohost-spinner" />
            <p className="schedule-cohost-loading-text">{loadingMessage}</p>
          </div>
        )}

        {/* Close Button */}
        <button className="schedule-cohost-close" onClick={onClose} type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="schedule-cohost-header">
          <div className="schedule-cohost-header-title">
            <span className="schedule-cohost-icon">👥</span>
            <h2 className="schedule-cohost-title">Meet with a Co-Host</h2>
          </div>
          <p className="schedule-cohost-subtitle">Get personalized guidance and support.</p>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="schedule-cohost-alert schedule-cohost-alert--success">
            <span className="schedule-cohost-alert-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="schedule-cohost-alert schedule-cohost-alert--error">
            <span className="schedule-cohost-alert-icon">✕</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form Stage */}
        {stage === 'form' && (
          <>
            {/* Team Members */}
            <div className="schedule-cohost-team">
              <div className="schedule-cohost-avatars">
                {['A', 'B', 'C', 'D'].map((letter, index) => (
                  <div key={letter} className="schedule-cohost-avatar" style={{ zIndex: 10 - index }}>
                    {letter}
                  </div>
                ))}
              </div>
              <p className="schedule-cohost-team-text">
                One of our team members will join as your co-host
              </p>
            </div>

            {/* Time Slots */}
            <div className="schedule-cohost-timeslots">
              <div className="schedule-cohost-timeslots-header">
                <label className="schedule-cohost-label">
                  Select 3 Time Slots (EST)
                  <span className="schedule-cohost-count"> ({selectedSlots.length}/3 selected)</span>
                </label>
                {selectedSlots.length > 0 && (
                  <button
                    className="schedule-cohost-clear-btn"
                    onClick={handleClearSlots}
                    type="button"
                  >
                    Clear Time Slots
                  </button>
                )}
              </div>
              <div className="schedule-cohost-slots-grid">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlots.includes(slot.id);
                  const isDisabled = !isSelected && selectedSlots.length >= 3;
                  return (
                    <button
                      key={slot.id}
                      className={`schedule-cohost-slot ${isSelected ? 'schedule-cohost-slot--selected' : ''} ${isDisabled ? 'schedule-cohost-slot--disabled' : ''}`}
                      onClick={() => handleSlotSelect(slot.id)}
                      disabled={isDisabled}
                      type="button"
                    >
                      {slot.formattedTime}
                    </button>
                  );
                })}
              </div>
              <p className="schedule-cohost-timezone">Current timezone: Eastern Standard Time (EST)</p>
            </div>

            {/* Form Fields */}
            <div className="schedule-cohost-form">
              <div className="schedule-cohost-field">
                <label className="schedule-cohost-label">Need help with...</label>
                <textarea
                  className="schedule-cohost-textarea"
                  value={subject}
                  onChange={handleSubjectChange}
                  placeholder="I need help with..."
                  rows={3}
                />
                <span className={`schedule-cohost-charcount ${subject.length > 450 ? 'schedule-cohost-charcount--warning' : ''}`}>
                  {subject.length}/500 characters
                </span>
              </div>

              <div className="schedule-cohost-field">
                <label className="schedule-cohost-label">Additional details (optional)</label>
                <textarea
                  className="schedule-cohost-textarea"
                  value={details}
                  onChange={handleDetailsChange}
                  placeholder="Type any details of what you want to get help with (optional)"
                  rows={5}
                />
                <span className={`schedule-cohost-charcount ${details.length > 900 ? 'schedule-cohost-charcount--warning' : ''}`}>
                  {details.length}/1000 characters
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="schedule-cohost-actions">
              <button
                className="schedule-cohost-submit"
                onClick={handleSubmit}
                disabled={selectedSlots.length !== 3 || isLoading}
                type="button"
              >
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </button>
              {selectedSlots.length < 3 && (
                <p className="schedule-cohost-hint">
                  Please select {3 - selectedSlots.length} more time slot{3 - selectedSlots.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </>
        )}

        {/* Submitted Stage */}
        {stage === 'submitted' && (
          <div className="schedule-cohost-submitted">
            <div className="schedule-cohost-success-icon">✓</div>
            <h3 className="schedule-cohost-success-title">Your request has been submitted!</h3>
            <p className="schedule-cohost-success-text">Your suggested meeting times:</p>
            <div className="schedule-cohost-selected-times">
              {getSelectedSlotDetails().map((time, index) => (
                <div key={index} className="schedule-cohost-selected-time">
                  #{index + 1} - {time}
                </div>
              ))}
            </div>
            <p className="schedule-cohost-success-info">
              We'll reach out to confirm a time that works for everyone.
            </p>
            <button
              className="schedule-cohost-done-btn"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </div>
        )}

        {/* Request ID (if available) */}
        {requestId && stage === 'submitted' && (
          <div className="schedule-cohost-metadata">
            <span className="schedule-cohost-metadata-label">Request ID:</span>
            <span className="schedule-cohost-metadata-value">{requestId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
