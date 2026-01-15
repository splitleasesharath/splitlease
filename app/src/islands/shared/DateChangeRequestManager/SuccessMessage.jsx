/**
 * Success Message Component
 * Post-submission feedback for date change requests
 */

/**
 * @param {Object} props
 * @param {'adding' | 'removing' | 'swapping'} props.requestType - Type of request
 * @param {boolean} props.isAcceptance - Whether this was an acceptance (vs creation)
 * @param {Function} props.onClose - Handler for closing the modal
 */
export default function SuccessMessage({
  requestType,
  isAcceptance,
  onClose,
}) {
  /**
   * Get success message based on action type
   */
  const getMessage = () => {
    if (isAcceptance) {
      return {
        title: 'Request Accepted!',
        description: 'The date change has been applied to the lease. Both parties will receive a confirmation.',
        icon: '✓',
      };
    }

    switch (requestType) {
      case 'adding':
        return {
          title: 'Request Sent!',
          description: 'Your request to add a date has been sent. You\'ll be notified when they respond.',
          icon: '➕',
        };
      case 'removing':
        return {
          title: 'Request Sent!',
          description: 'Your request to remove a date has been sent. You\'ll be notified when they respond.',
          icon: '➖',
        };
      case 'swapping':
        return {
          title: 'Request Sent!',
          description: 'Your request to swap dates has been sent. You\'ll be notified when they respond.',
          icon: '🔄',
        };
      default:
        return {
          title: 'Success!',
          description: 'Your request has been processed successfully.',
          icon: '✓',
        };
    }
  };

  const { title, description, icon } = getMessage();

  return (
    <div className="dcr-success-container">
      <div className="dcr-success-icon">{icon}</div>
      <h2 className="dcr-success-title">{title}</h2>
      <p className="dcr-success-description">{description}</p>

      <div className="dcr-success-info">
        <p>
          <strong>What happens next?</strong>
        </p>
        <ul className="dcr-success-list">
          {!isAcceptance ? (
            <>
              <li>The other party has 48 hours to respond</li>
              <li>You'll receive a notification when they reply</li>
              <li>If accepted, the lease dates will be updated automatically</li>
            </>
          ) : (
            <>
              <li>The lease dates have been updated</li>
              <li>Both parties will receive a confirmation email</li>
              <li>Payment adjustments (if any) will be processed</li>
            </>
          )}
        </ul>
      </div>

      <button className="dcr-button-primary dcr-success-button" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
