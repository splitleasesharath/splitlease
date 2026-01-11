/**
 * Request Management Component
 * Accept/decline interface for the receiver of a date change request
 */

import { useState } from 'react';
import { formatDate, getTimeRemaining, isExpiringSoon } from './dateUtils.js';

/**
 * @param {Object} props
 * @param {Object} props.request - The date change request to manage
 * @param {Object} props.currentUser - Current user object
 * @param {Function} props.onAccept - Handler for accepting request
 * @param {Function} props.onDecline - Handler for declining request
 * @param {boolean} props.isLoading - Loading state
 */
export default function RequestManagement({
  request,
  currentUser,
  onAccept,
  onDecline,
  isLoading,
}) {
  const [responseMessage, setResponseMessage] = useState('');
  const [showDeclineReason, setShowDeclineReason] = useState(false);

  // Get time remaining until expiration
  const timeRemaining = request.expirationDate
    ? getTimeRemaining(request.expirationDate)
    : { hours: 48, minutes: 0, isExpired: false };

  const expiringSoon = request.expirationDate
    ? isExpiringSoon(request.expirationDate)
    : false;

  /**
   * Get request type label
   */
  const getTypeLabel = () => {
    switch (request.typeOfRequest) {
      case 'adding':
        return 'Adding a Date';
      case 'removing':
        return 'Removing a Date';
      case 'swapping':
        return 'Swapping Dates';
      default:
        return 'Date Change';
    }
  };

  /**
   * Get status badge class
   */
  const getStatusClass = () => {
    switch (request.requestStatus) {
      case 'waiting_for_answer':
        return 'dcr-status-pending';
      case 'accepted':
        return 'dcr-status-accepted';
      case 'rejected':
        return 'dcr-status-rejected';
      case 'expired':
        return 'dcr-status-expired';
      default:
        return 'dcr-status-default';
    }
  };

  /**
   * Get requester name
   */
  const getRequesterName = () => {
    const requester = request.requester;
    return requester?.['Name - First'] || requester?.firstName || requester?.name || 'User';
  };

  /**
   * Handle accept click
   */
  const handleAccept = () => {
    onAccept(responseMessage);
  };

  /**
   * Handle decline click
   */
  const handleDecline = () => {
    if (!showDeclineReason) {
      setShowDeclineReason(true);
      return;
    }
    onDecline(responseMessage);
  };

  // Check if current user is the receiver
  const userId = currentUser?._id || currentUser?.id;
  const isReceiver = userId === request.requestReceiver;

  // If request is already resolved, show status
  if (request.requestStatus !== 'waiting_for_answer') {
    return (
      <div className="dcr-manage-container">
        <h2 className="dcr-title">Request Status</h2>

        <div className={`dcr-status-badge ${getStatusClass()}`}>
          {request.requestStatus === 'accepted' && '✓ Accepted'}
          {request.requestStatus === 'rejected' && '✗ Declined'}
          {request.requestStatus === 'expired' && '⏱ Expired'}
          {request.requestStatus === 'cancelled' && '🚫 Cancelled'}
        </div>

        {request.answerToRequest && (
          <div className="dcr-response-message">
            <strong>Response:</strong>
            <p>{request.answerToRequest}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dcr-manage-container">
      <h2 className="dcr-title">Date Change Request</h2>

      {/* Expiration Warning */}
      {expiringSoon && (
        <div className="dcr-expiration-warning">
          ⚠️ This request expires soon!
        </div>
      )}

      {/* Expiration Countdown */}
      <div className={`dcr-expiration-countdown ${expiringSoon ? 'dcr-expiring-soon' : ''}`}>
        {timeRemaining.isExpired ? (
          <span>Request has expired</span>
        ) : (
          <span>
            Expires in {timeRemaining.hours}h {timeRemaining.minutes}m
          </span>
        )}
      </div>

      {/* Request Type Badge */}
      <div className="dcr-type-badge">
        {request.typeOfRequest === 'adding' && '➕'}
        {request.typeOfRequest === 'removing' && '➖'}
        {request.typeOfRequest === 'swapping' && '🔄'}
        <span>{getTypeLabel()}</span>
      </div>

      {/* Requester Info */}
      <div className="dcr-requester-info">
        <span className="dcr-requester-label">Requested by:</span>
        <span className="dcr-requester-name">{getRequesterName()}</span>
      </div>

      {/* Request Details */}
      <div className="dcr-request-details">
        {request.dateRemoved && (
          <div className="dcr-detail-row">
            <span className="dcr-detail-label">Date to Remove:</span>
            <span className="dcr-detail-value dcr-date-remove">
              {formatDate(request.dateRemoved, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
        )}

        {request.dateAdded && (
          <div className="dcr-detail-row">
            <span className="dcr-detail-label">Date to Add:</span>
            <span className="dcr-detail-value dcr-date-add">
              {formatDate(request.dateAdded, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>
        )}

        {request.priceRateOfNight && (
          <div className="dcr-detail-row">
            <span className="dcr-detail-label">Proposed Rate:</span>
            <span className="dcr-detail-value">
              ${request.priceRateOfNight.toFixed(2)}/night
              {request.comparedToRegularRate && (
                <span className="dcr-price-percentage">
                  ({request.comparedToRegularRate}% of regular)
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Requester's Message */}
      {request.messageFromRequester && (
        <div className="dcr-requester-message">
          <strong>Message:</strong>
          <p>{request.messageFromRequester}</p>
        </div>
      )}

      {/* Response Section (only for receiver) */}
      {isReceiver && !timeRemaining.isExpired && (
        <>
          {/* Response Message Input */}
          <div className="dcr-response-section">
            <label className="dcr-response-label">
              {showDeclineReason ? 'Reason for declining (optional):' : 'Add a response (optional):'}
            </label>
            <textarea
              className="dcr-response-input"
              placeholder={showDeclineReason ? 'Let them know why...' : 'Add a message...'}
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Action Buttons */}
          <div className="dcr-action-buttons">
            {!showDeclineReason ? (
              <>
                <button
                  className="dcr-button-accept"
                  onClick={handleAccept}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Accept'}
                </button>
                <button
                  className="dcr-button-decline"
                  onClick={handleDecline}
                  disabled={isLoading}
                >
                  Decline
                </button>
              </>
            ) : (
              <>
                <button
                  className="dcr-button-secondary"
                  onClick={() => setShowDeclineReason(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  className="dcr-button-decline"
                  onClick={handleDecline}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Confirm Decline'}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Not receiver message */}
      {!isReceiver && (
        <div className="dcr-waiting-message">
          <p>Waiting for response from the other party...</p>
        </div>
      )}
    </div>
  );
}
