/**
 * QRCodeDashboard Component
 *
 * Main container for managing QR codes in a house manual.
 * Follows the Hollow Component pattern - all logic delegated to useQRCodeDashboardLogic.
 *
 * Usage:
 *   <QRCodeDashboard
 *     houseManualId="abc123"
 *     listingId="xyz789"
 *     hostId="host456"
 *     isVisible={showDashboard}
 *     onClose={() => setShowDashboard(false)}
 *     onQRCodesChanged={() => refreshData()}
 *   />
 */

import PropTypes from 'prop-types';
import { useQRCodeDashboardLogic } from './useQRCodeDashboardLogic.js';
import { QRCodeGrid, QRCodeForm, PrintPreview } from './components/index.js';
import { useToast } from '../Toast.jsx';
import './QRCodeDashboard.css';

/**
 * Loading State Component
 */
const LoadingState = () => (
  <div className="qrcd__loading">
    <div className="qrcd__spinner" />
    <p>Loading QR codes...</p>
  </div>
);

/**
 * Error State Component
 */
const ErrorState = ({ message, onRetry }) => (
  <div className="qrcd__error">
    <div className="qrcd__error-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    </div>
    <h3 className="qrcd__error-title">Something went wrong</h3>
    <p className="qrcd__error-message">{message || 'Failed to load QR codes'}</p>
    {onRetry && (
      <button type="button" className="qrcd__error-retry" onClick={onRetry}>
        Try Again
      </button>
    )}
  </div>
);

ErrorState.propTypes = {
  message: PropTypes.string,
  onRetry: PropTypes.func
};

/**
 * QRCodeDashboard Component
 */
const QRCodeDashboard = ({
  houseManualId,
  listingId,
  hostId,
  isVisible = true,
  onClose,
  onQRCodesChanged,
  initialMode = 'view'
}) => {
  // Toast hook for notifications
  const { showToast } = useToast();

  // Business logic hook
  const {
    // Data
    qrCodes,
    houseManual,
    selectedQRCodes,
    editingQRCode,
    availableUseCases,

    // Selection state
    selectedIds,
    allSelected,
    hasSelection,

    // UI state
    mode,
    isLoading,
    isSaving,
    error,

    // Selection handlers
    handleSelect,
    handleSelectAll,
    handleClearSelection,

    // CRUD handlers
    handleCreate,
    handleUpdate,
    handleDelete,
    handleDeleteSelected,

    // Mode handlers
    handleStartCreate,
    handleStartEdit,
    handleStartPreview,
    handleCancelMode,

    // Data refresh
    refreshData
  } = useQRCodeDashboardLogic({
    houseManualId,
    listingId,
    hostId,
    initialMode,
    onQRCodesChanged,
    showToast
  });

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  // Handle close button
  const handleCloseClick = () => {
    if (onClose) {
      onClose();
    }
  };

  // Handle form submission (create or update)
  const handleFormSubmit = async (formData) => {
    if (mode === 'edit' && editingQRCode) {
      await handleUpdate(editingQRCode.id, formData);
    } else {
      await handleCreate(formData);
    }
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className="qrcd-overlay" onClick={handleBackdropClick}>
      <div className="qrcd">
        {/* Header */}
        <div className="qrcd__header">
          <div className="qrcd__header-info">
            <h2 className="qrcd__title">QR Code Dashboard</h2>
            {houseManual && (
              <p className="qrcd__subtitle">{houseManual.name}</p>
            )}
          </div>
          <button
            type="button"
            className="qrcd__close"
            onClick={handleCloseClick}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="qrcd__content">
          {/* Loading State */}
          {isLoading && <LoadingState />}

          {/* Error State */}
          {!isLoading && error && (
            <ErrorState message={error} onRetry={refreshData} />
          )}

          {/* Main Content */}
          {!isLoading && !error && (
            <>
              {/* View Mode - Grid */}
              {mode === 'view' && (
                <QRCodeGrid
                  qrCodes={qrCodes}
                  selectedIds={selectedIds}
                  allSelected={allSelected}
                  onSelect={handleSelect}
                  onSelectAll={handleSelectAll}
                  onEdit={handleStartEdit}
                  onDelete={handleDelete}
                  onDeleteSelected={handleDeleteSelected}
                  onPrintSelected={handleStartPreview}
                  onCreateClick={handleStartCreate}
                  disabled={isSaving}
                />
              )}

              {/* Create Mode - Form */}
              {mode === 'create' && (
                <QRCodeForm
                  isEditing={false}
                  onSubmit={handleFormSubmit}
                  onCancel={handleCancelMode}
                  isSaving={isSaving}
                />
              )}

              {/* Edit Mode - Form */}
              {mode === 'edit' && (
                <QRCodeForm
                  initialData={editingQRCode}
                  isEditing={true}
                  onSubmit={handleFormSubmit}
                  onCancel={handleCancelMode}
                  isSaving={isSaving}
                />
              )}

              {/* Preview Mode - Print Preview */}
              {mode === 'preview' && (
                <PrintPreview
                  qrCodes={selectedQRCodes}
                  houseManualName={houseManual?.name}
                  onBack={handleCancelMode}
                  onPrintComplete={() => {
                    showToast({
                      title: 'Print Complete',
                      content: 'Your QR codes are ready',
                      type: 'success'
                    });
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

QRCodeDashboard.propTypes = {
  // Required: House manual to manage QR codes for
  houseManualId: PropTypes.string.isRequired,

  // Optional: Listing context for display
  listingId: PropTypes.string,

  // Optional: Host ID for creating QR codes
  hostId: PropTypes.string,

  // Visibility control (for modal usage)
  isVisible: PropTypes.bool,

  // Callback when dashboard closes
  onClose: PropTypes.func,

  // Callback when QR codes are modified
  onQRCodesChanged: PropTypes.func,

  // Initial mode
  initialMode: PropTypes.oneOf(['view', 'create', 'edit', 'preview'])
};

QRCodeDashboard.defaultProps = {
  isVisible: true,
  initialMode: 'view'
};

export default QRCodeDashboard;
