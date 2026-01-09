/**
 * Date Change Request Manager - Main Component
 * Manages 4 different views for date change request workflows:
 * 1. Create Request - Select dates and request type (calendar view)
 * 2. Request Details - Set price/message before submitting
 * 3. Request Management - Accept/decline interface (receiver only)
 * 4. Success Message - Post-submission feedback
 */

import { useState, useEffect } from 'react';
import dateChangeRequestService from './dateChangeRequestService.js';
import DateChangeRequestCalendar from './DateChangeRequestCalendar.jsx';
import RequestTypeSelector from './RequestTypeSelector.jsx';
import RequestDetails from './RequestDetails.jsx';
import RequestManagement from './RequestManagement.jsx';
import ThrottlingWarning from './ThrottlingWarning.jsx';
import ThrottlingWarningPopup from './ThrottlingWarningPopup.jsx';
import ThrottlingBlockPopup from './ThrottlingBlockPopup.jsx';
import SuccessMessage from './SuccessMessage.jsx';
import './DateChangeRequestManager.css';

/**
 * ViewState type: 'create' | 'details' | 'manage' | 'success' | ''
 *
 * @param {Object} props
 * @param {Object} props.lease - Lease object containing booking info
 * @param {Object} props.currentUser - Current user object
 * @param {string} [props.initialView='create'] - Initial view state
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} [props.onSuccess] - Optional callback when operation succeeds
 * @param {Object} [props.requestToManage] - Specific request to manage (for manage view)
 * @param {number} [props.baseNightlyPrice] - Base nightly price for percentage calculations
 */
export default function DateChangeRequestManager({
  lease,
  currentUser,
  initialView = 'create',
  onClose,
  onSuccess,
  requestToManage = null,
  baseNightlyPrice = 150,
}) {
  // State management
  const [view, setView] = useState(initialView);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Request creation state
  const [requestType, setRequestType] = useState(null); // 'adding' | 'removing' | 'swapping'
  const [dateToAdd, setDateToAdd] = useState(null);
  const [dateToRemove, setDateToRemove] = useState(null);
  const [message, setMessage] = useState('');
  const [pricePercentage, setPricePercentage] = useState(100); // 50-150%

  // Throttling state
  const [throttleStatus, setThrottleStatus] = useState(null);
  const [showWarningPopup, setShowWarningPopup] = useState(false);
  const [showBlockPopup, setShowBlockPopup] = useState(false);
  const [otherParticipantName, setOtherParticipantName] = useState('');

  // Existing requests state
  const [existingRequests, setExistingRequests] = useState([]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Fetch throttle status and existing requests on mount
  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id;
    if (userId && lease?._id) {
      fetchThrottleStatus(userId);
      fetchExistingRequests(lease._id);
    }
  }, [currentUser, lease]);

  /**
   * Fetch enhanced throttle status for current user on this lease
   */
  const fetchThrottleStatus = async (userId) => {
    const leaseId = lease?._id || lease?.id;
    if (!leaseId) return;

    const result = await dateChangeRequestService.getEnhancedThrottleStatus(leaseId, userId);
    if (result.status === 'success') {
      setThrottleStatus(result.data);
      setOtherParticipantName(result.data?.otherParticipantName || 'the other party');

      // If user is blocked, show the block popup immediately
      if (result.data?.isBlocked || result.data?.throttleLevel === 'hard_block') {
        setShowBlockPopup(true);
      }
    }
  };

  /**
   * Fetch existing date change requests for this lease
   */
  const fetchExistingRequests = async (leaseId) => {
    const result = await dateChangeRequestService.getAll(leaseId);
    if (result.status === 'success') {
      setExistingRequests(result.data || []);
    }
  };

  /**
   * Get user ID (handle different field names)
   */
  const getUserId = () => {
    return currentUser?._id || currentUser?.id || currentUser?.userId;
  };

  /**
   * Determine if current user is the host
   */
  const isHost = () => {
    const userId = getUserId();
    const hostId = lease?.hostId || lease?.['Host'];
    return userId === hostId;
  };

  /**
   * Get the receiver ID (opposite of requester)
   */
  const getReceiverId = () => {
    const hostId = lease?.hostId || lease?.['Host'];
    const guestId = lease?.guestId || lease?.['Guest'];
    return isHost() ? guestId : hostId;
  };

  /**
   * Calculate proposed price based on percentage
   */
  const calculateProposedPrice = () => {
    return (baseNightlyPrice * pricePercentage) / 100;
  };

  /**
   * Validate request before submission
   */
  const validateRequest = () => {
    if (!requestType) {
      return 'Please select a request type';
    }

    if (requestType === 'adding' && !dateToAdd) {
      return 'Please select a date to add';
    }

    if (requestType === 'removing' && !dateToRemove) {
      return 'Please select a date to remove';
    }

    if (requestType === 'swapping' && (!dateToAdd || !dateToRemove)) {
      return 'Please select both dates for swap';
    }

    if (throttleStatus?.isThrottled) {
      return 'You have reached the request limit. Please try again later.';
    }

    return null;
  };

  /**
   * Handle proceeding to details view
   * Checks throttle status and shows appropriate popup if needed
   */
  const handleProceedToDetails = () => {
    const validationError = validateRequest();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check throttle status before proceeding
    if (throttleStatus?.throttleLevel === 'hard_block' || throttleStatus?.isBlocked) {
      setShowBlockPopup(true);
      return;
    }

    // Show soft warning if at 5+ requests and user hasn't dismissed warnings
    if (throttleStatus?.showWarning) {
      setShowWarningPopup(true);
      return;
    }

    // No throttle issues, proceed to details
    setView('details');
  };

  /**
   * Handle continuing after soft warning popup
   * @param {boolean} dontShowAgain - Whether user checked "Don't show again"
   */
  const handleContinueAfterWarning = async (dontShowAgain) => {
    setShowWarningPopup(false);

    // Save preference if checkbox was checked
    if (dontShowAgain) {
      const userId = getUserId();
      const leaseId = lease?._id || lease?.id;
      if (userId && leaseId) {
        await dateChangeRequestService.updateWarningPreference(leaseId, userId, true);
      }
    }

    // Proceed to details view
    setView('details');
  };

  /**
   * Handle closing the warning popup (cancel)
   */
  const handleWarningCancel = () => {
    setShowWarningPopup(false);
  };

  /**
   * Handle closing the block popup
   */
  const handleBlockClose = () => {
    setShowBlockPopup(false);
    onClose(); // Close the entire modal since user is blocked
  };

  /**
   * Handle submitting a new date change request
   */
  const handleSubmitRequest = async () => {
    const validationError = validateRequest();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await dateChangeRequestService.create({
        leaseId: lease._id || lease.id,
        typeOfRequest: requestType,
        dateAdded: dateToAdd,
        dateRemoved: dateToRemove,
        message: message,
        priceRate: calculateProposedPrice(),
        percentageOfRegular: pricePercentage,
        requestedById: getUserId(),
        receiverId: getReceiverId(),
      });

      if (result.status === 'success') {
        setSuccess('Request submitted successfully!');
        setView('success');
        if (onSuccess) onSuccess(result.data);
      } else {
        throw new Error(result.message || 'Failed to submit request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle accepting a request (for receiver)
   */
  const handleAcceptRequest = async (responseMessage) => {
    if (!requestToManage) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await dateChangeRequestService.accept(
        requestToManage.id || requestToManage._id,
        responseMessage
      );

      if (result.status === 'success') {
        setSuccess('Request accepted!');
        setView('success');
        if (onSuccess) onSuccess(result.data);
      } else {
        throw new Error(result.message || 'Failed to accept request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept request');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle declining a request (for receiver)
   */
  const handleDeclineRequest = async (reason) => {
    if (!requestToManage) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await dateChangeRequestService.decline(
        requestToManage.id || requestToManage._id,
        reason
      );

      if (result.status === 'success') {
        setSuccess('Request declined');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess(result.data);
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to decline request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline request');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle date selection from calendar
   */
  const handleDateSelect = (date, selectionType) => {
    if (selectionType === 'add') {
      setDateToAdd(date);
    } else if (selectionType === 'remove') {
      setDateToRemove(date);
    }
  };

  /**
   * Handle going back from details view
   */
  const handleBack = () => {
    if (view === 'details') {
      setView('create');
    }
  };

  /**
   * Reset form state
   */
  const resetForm = () => {
    setRequestType(null);
    setDateToAdd(null);
    setDateToRemove(null);
    setMessage('');
    setPricePercentage(100);
    setView('create');
  };

  /**
   * Handle success modal close
   */
  const handleSuccessClose = () => {
    onClose();
  };

  // Get booked dates from lease
  const bookedDates = lease?.bookedDates || lease?.['List of Booked Dates'] || [];
  const reservationStart = lease?.reservationStart || lease?.['Reservation Period : Start'];
  const reservationEnd = lease?.reservationEnd || lease?.['Reservation Period : End'];

  // Don't render if no view is set
  if (!view) {
    return null;
  }

  return (
    <div className="dcr-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dcr-container">
        {/* Close Button */}
        <button className="dcr-close-btn" onClick={onClose} aria-label="Close">
          &times;
        </button>

        {/* Global Error/Success Messages */}
        {error && <div className="dcr-error">{error}</div>}
        {success && <div className="dcr-success">{success}</div>}

        {/* Throttling Warning */}
        {throttleStatus && view !== 'success' && view !== 'manage' && (
          <ThrottlingWarning
            requestCount={throttleStatus.requestCount}
            limit={throttleStatus.limit}
            isThrottled={throttleStatus.isThrottled}
          />
        )}

        {/* Create Request View */}
        {view === 'create' && (
          <div className="dcr-create-container">
            <h2 className="dcr-title">Request Date Change</h2>
            <p className="dcr-description">
              Select the type of change and choose the date(s) on the calendar.
            </p>

            <RequestTypeSelector
              selectedType={requestType}
              onTypeSelect={setRequestType}
              disabled={isLoading}
            />

            <DateChangeRequestCalendar
              bookedDates={bookedDates}
              reservationStart={reservationStart}
              reservationEnd={reservationEnd}
              requestType={requestType}
              dateToAdd={dateToAdd}
              dateToRemove={dateToRemove}
              onDateSelect={handleDateSelect}
              existingRequests={existingRequests}
              disabled={!requestType || isLoading}
            />

            <div className="dcr-button-group">
              <button
                className="dcr-button-primary"
                onClick={handleProceedToDetails}
                disabled={!requestType || isLoading || throttleStatus?.isBlocked}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Request Details View */}
        {view === 'details' && (
          <RequestDetails
            requestType={requestType}
            dateToAdd={dateToAdd}
            dateToRemove={dateToRemove}
            message={message}
            onMessageChange={setMessage}
            pricePercentage={pricePercentage}
            onPriceChange={setPricePercentage}
            baseNightlyPrice={baseNightlyPrice}
            onBack={handleBack}
            onSubmit={handleSubmitRequest}
            isLoading={isLoading}
          />
        )}

        {/* Request Management View (for receiver) */}
        {view === 'manage' && requestToManage && (
          <RequestManagement
            request={requestToManage}
            currentUser={currentUser}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
            isLoading={isLoading}
          />
        )}

        {/* Success Message View */}
        {view === 'success' && (
          <SuccessMessage
            requestType={requestType}
            isAcceptance={initialView === 'manage'}
            onClose={handleSuccessClose}
          />
        )}
      </div>

      {/* Throttling Warning Popup (Soft Warning at 5+ requests) */}
      <ThrottlingWarningPopup
        isOpen={showWarningPopup}
        onClose={handleWarningCancel}
        onContinue={handleContinueAfterWarning}
        otherParticipantName={otherParticipantName}
      />

      {/* Throttling Block Popup (Hard Block at 10+ requests) */}
      <ThrottlingBlockPopup
        isOpen={showBlockPopup}
        onClose={handleBlockClose}
        otherParticipantName={otherParticipantName}
      />
    </div>
  );
}
