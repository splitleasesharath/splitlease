/**
 * ErrorOverlay - Display error messages in an overlay
 */
export function ErrorOverlay({
  errorState,
  onClose
}) {
  if (!errorState.hasError) return null;

  const getErrorTitle = () => {
    switch (errorState.errorType) {
      case 'minimum_nights':
        return 'Minimum Days Required';
      case 'maximum_nights':
        return 'Maximum Days Exceeded';
      case 'maximum_nights_warning':
        return 'Host Preference Notice';
      case 'contiguity':
        return 'Days Not Consecutive';
      case 'availability':
        return 'Day Not Available';
      case 'days_selected':
        return 'Invalid Selection';
      case 'nights_outside_host':
        return 'Outside Host Availability';
      default:
        return 'Error';
    }
  };

  const getAdditionalMessage = () => {
    if (errorState.errorType === 'maximum_nights_warning') {
      return 'You can continue selecting more days, but please note that exceeding the host\'s preferred maximum may reduce the likelihood of your reservation being approved.';
    }
    return null;
  };

  // Determine if X button should be shown (hide for warning dialogs)
  const showCloseButton = errorState.errorType !== 'maximum_nights_warning';

  return (
    <div className="error-overlay-backdrop" onClick={showCloseButton ? onClose : undefined}>
      <div className="error-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="error-header">
          <h3>{getErrorTitle()}</h3>
          {showCloseButton && (
            <button
              className="error-close"
              onClick={onClose}
              aria-label="Close error"
            >
              ×
            </button>
          )}
        </div>
        <div className="error-content">
          <p>{errorState.errorMessage}</p>
          {getAdditionalMessage() && (
            <p className="error-additional-info">{getAdditionalMessage()}</p>
          )}
        </div>
        <div className="error-actions">
          <button className="error-button" onClick={onClose}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
