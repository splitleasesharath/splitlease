/**
 * Request Details Component
 * Form for setting price negotiation and message before submitting
 */

import { formatDate } from './dateUtils.js';

/**
 * @param {Object} props
 * @param {'adding' | 'removing' | 'swapping'} props.requestType - Type of request
 * @param {Date|null} props.dateToAdd - Date being added
 * @param {Date|null} props.dateToRemove - Date being removed
 * @param {string} props.message - Message to receiver
 * @param {Function} props.onMessageChange - Handler for message changes
 * @param {number} props.pricePercentage - Price as percentage of base (50-150)
 * @param {Function} props.onPriceChange - Handler for price changes
 * @param {number} props.baseNightlyPrice - Base nightly price for calculations
 * @param {Function} props.onBack - Handler for back button
 * @param {Function} props.onSubmit - Handler for submit
 * @param {boolean} props.isLoading - Loading state
 */
export default function RequestDetails({
  requestType,
  dateToAdd,
  dateToRemove,
  message,
  onMessageChange,
  pricePercentage,
  onPriceChange,
  baseNightlyPrice,
  onBack,
  onSubmit,
  isLoading,
}) {
  const proposedPrice = (baseNightlyPrice * pricePercentage) / 100;
  const priceDifference = proposedPrice - baseNightlyPrice;

  /**
   * Get request type label
   */
  const getTypeLabel = () => {
    switch (requestType) {
      case 'adding':
        return 'Adding a Date';
      case 'removing':
        return 'Removing a Date';
      case 'swapping':
        return 'Swapping Dates';
      default:
        return 'Date Change Request';
    }
  };

  /**
   * Get request type icon
   */
  const getTypeIcon = () => {
    switch (requestType) {
      case 'adding':
        return '➕';
      case 'removing':
        return '➖';
      case 'swapping':
        return '🔄';
      default:
        return '📅';
    }
  };

  return (
    <div className="dcr-details-container">
      {/* Header */}
      <div className="dcr-details-header">
        <button className="dcr-back-btn" onClick={onBack} aria-label="Go back">
          ←
        </button>
        <h2 className="dcr-title">Review Request</h2>
      </div>

      {/* Request Summary */}
      <div className="dcr-details-summary">
        <div className="dcr-summary-type">
          <span className="dcr-summary-icon">{getTypeIcon()}</span>
          <span className="dcr-summary-label">{getTypeLabel()}</span>
        </div>

        <div className="dcr-summary-dates">
          {dateToRemove && (
            <div className="dcr-summary-date dcr-date-remove-summary">
              <span className="dcr-date-label">Remove:</span>
              <span className="dcr-date-value">{formatDate(dateToRemove, 'EEEE, MMMM d, yyyy')}</span>
            </div>
          )}
          {dateToAdd && (
            <div className="dcr-summary-date dcr-date-add-summary">
              <span className="dcr-date-label">Add:</span>
              <span className="dcr-date-value">{formatDate(dateToAdd, 'EEEE, MMMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Price Negotiation (only for adding dates) */}
      {(requestType === 'adding' || requestType === 'swapping') && (
        <div className="dcr-price-section">
          <h3 className="dcr-section-title">Propose a Rate</h3>
          <p className="dcr-section-description">
            Suggest a nightly rate for the new date. The receiver can accept or negotiate.
          </p>

          <div className="dcr-price-slider-container">
            <input
              type="range"
              min="50"
              max="150"
              value={pricePercentage}
              onChange={(e) => onPriceChange(parseInt(e.target.value))}
              className="dcr-price-slider"
              aria-label="Price percentage"
            />
            <div className="dcr-price-labels">
              <span>50%</span>
              <span>100%</span>
              <span>150%</span>
            </div>
          </div>

          <div className="dcr-price-display">
            <div className="dcr-price-proposed">
              <span className="dcr-price-label">Proposed Rate:</span>
              <span className="dcr-price-value">${proposedPrice.toFixed(2)}/night</span>
            </div>
            <div className="dcr-price-comparison">
              <span className="dcr-price-label">Regular Rate:</span>
              <span className="dcr-price-value">${baseNightlyPrice.toFixed(2)}/night</span>
            </div>
            <div className={`dcr-price-difference ${priceDifference >= 0 ? 'dcr-price-positive' : 'dcr-price-negative'}`}>
              <span className="dcr-price-label">Difference:</span>
              <span className="dcr-price-value">
                {priceDifference >= 0 ? '+' : ''}${priceDifference.toFixed(2)} ({pricePercentage}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Message Section */}
      <div className="dcr-message-section">
        <h3 className="dcr-section-title">Add a Message (Optional)</h3>
        <textarea
          className="dcr-message-input"
          placeholder="Explain why you're requesting this change..."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={4}
          maxLength={500}
        />
        <div className="dcr-message-counter">{message.length}/500</div>
      </div>

      {/* Info Box */}
      <div className="dcr-info-box">
        <p>
          <strong>Note:</strong> Your request will be sent to the other party for approval.
          They have 48 hours to respond before the request expires.
        </p>
      </div>

      {/* Submit Button */}
      <div className="dcr-button-group">
        <button
          className="dcr-button-secondary"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </button>
        <button
          className="dcr-button-primary"
          onClick={onSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
}
