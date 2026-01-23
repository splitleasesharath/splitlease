/**
 * Listings Overview Page (Admin Only)
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useListingsOverviewPageLogic hook
 *
 * Features:
 * - Advanced filtering by status, borough, neighborhood, date range
 * - Inline toggle editing (Active, Showcase, Usability)
 * - Location dropdown editing
 * - Error management (add/clear)
 * - Bulk price increment
 * - Pagination with load more
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Uses shared Header/Footer components
 * - Admin-only access with Gold Standard Auth Pattern
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useListingsOverviewPageLogic } from './useListingsOverviewPageLogic.js';
import ListingsHeader from './components/ListingsHeader.jsx';
import ListingsFilterPanel from './components/ListingsFilterPanel.jsx';
import ListingsTable from './components/ListingsTable.jsx';
import { PRESET_ERROR_CODES, PRICE_MULTIPLIERS } from './constants.js';
import './ListingsOverviewPage.css';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState() {
  return (
    <div className="lo-loading-state">
      <div className="lo-spinner"></div>
      <p>Loading listings...</p>
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

function ErrorState({ error, onRetry }) {
  return (
    <div className="lo-error-state">
      <div className="lo-error-icon">!</div>
      <h2 className="lo-error-title">Something went wrong</h2>
      <p className="lo-error-text">{error}</p>
      <button className="lo-btn lo-btn-primary" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState({ onClearFilters }) {
  return (
    <div className="lo-empty-state">
      <p>No listings found matching your filters.</p>
      <button className="lo-btn lo-btn-secondary" onClick={onClearFilters}>
        Clear Filters
      </button>
    </div>
  );
}

// ============================================================================
// MODAL CONTENT RENDERERS
// ============================================================================

function DescriptionModalContent({ listing }) {
  return (
    <div className="lo-modal-description">
      <h4>Description</h4>
      <p>{listing.description || 'No description provided.'}</p>
      <h4>Features</h4>
      <div className="lo-features-list">
        {listing.features.length > 0 ? (
          listing.features.map((feature, idx) => (
            <span key={idx} className="lo-feature-tag">{feature}</span>
          ))
        ) : (
          <p className="lo-no-data">No features listed.</p>
        )}
      </div>
      <h4>Host Information</h4>
      <p><strong>Name:</strong> {listing.host.name || 'N/A'}</p>
      <p><strong>Email:</strong> {listing.host.email || 'N/A'}</p>
      <p><strong>Phone:</strong> {listing.host.phone || 'N/A'}</p>
    </div>
  );
}

function PricingModalContent({ listing }) {
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  return (
    <div className="lo-modal-pricing">
      <div className="lo-price-row">
        <span>Nightly Rate:</span>
        <strong>{formatCurrency(listing.pricing.nightly)}</strong>
      </div>
      <div className="lo-price-row">
        <span>3 Nights Price:</span>
        <strong>{formatCurrency(listing.pricing.calculated3Night)}</strong>
      </div>
      {listing.pricing.override && (
        <div className="lo-price-row">
          <span>Price Override:</span>
          <strong>{formatCurrency(listing.pricing.override)}</strong>
        </div>
      )}
    </div>
  );
}

function ErrorsModalContent({ listing }) {
  return (
    <div className="lo-modal-errors">
      {listing.errors.length === 0 ? (
        <p className="lo-no-data">No errors assigned to this listing.</p>
      ) : (
        <ul className="lo-errors-list">
          {listing.errors.map((error, idx) => (
            <li key={idx} className="lo-error-item">
              {typeof error === 'string' ? error : error.code || error.message || JSON.stringify(error)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PriceResultModalContent({ successCount, failCount, multiplier }) {
  return (
    <div className="lo-modal-price-result">
      <p>Successfully updated <strong>{successCount}</strong> listing(s).</p>
      {failCount > 0 && (
        <p className="lo-warning">Failed to update {failCount} listing(s).</p>
      )}
      <p>Prices have been multiplied by <strong>{multiplier}x</strong></p>
    </div>
  );
}

// ============================================================================
// GENERIC MODAL COMPONENT (inline, no external dependency)
// ============================================================================

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="lo-modal-overlay" onClick={onClose}>
      <div className="lo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lo-modal-header">
          <h3 className="lo-modal-title">{title}</h3>
          <button className="lo-modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <div className="lo-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PRICE INCREMENT MODAL
// ============================================================================

function PriceIncrementModal({
  isOpen,
  customMultiplier,
  onMultiplierChange,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="lo-price-modal-overlay">
      <div className="lo-price-modal">
        <h3>Bulk Price Increment</h3>
        <p>This will update prices for all currently visible listings.</p>

        <div className="lo-price-options">
          <button
            className="lo-btn lo-btn-primary"
            onClick={() => onConfirm(PRICE_MULTIPLIERS.DEFAULT)}
          >
            Quick: {PRICE_MULTIPLIERS.DEFAULT}x ({((PRICE_MULTIPLIERS.DEFAULT - 1) * 100).toFixed(0)}% increase)
          </button>

          <div className="lo-custom-multiplier">
            <label>Custom Multiplier:</label>
            <input
              type="number"
              min={PRICE_MULTIPLIERS.MIN}
              max={PRICE_MULTIPLIERS.MAX}
              step="0.05"
              value={customMultiplier}
              onChange={(e) => onMultiplierChange(parseFloat(e.target.value) || PRICE_MULTIPLIERS.DEFAULT)}
            />
            <button
              className="lo-btn lo-btn-secondary"
              onClick={() => onConfirm(customMultiplier)}
            >
              Apply {customMultiplier}x
            </button>
          </div>
        </div>

        <div className="lo-modal-actions">
          <button className="lo-btn lo-btn-text" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ListingsOverviewPage() {
  const {
    // Auth state
    authState,

    // Reference data
    boroughs,
    neighborhoods,

    // Listings data
    listings,
    totalCount,
    hasMore,

    // Filter state
    filters,

    // UI state
    isLoading,
    isProcessing,
    error,

    // Modal state
    modalContent,
    isPriceModalOpen,
    customMultiplier,
    setCustomMultiplier,

    // Filter handlers
    handleFilterChange,
    handleResetFilters,

    // Pagination
    handleLoadMore,

    // Toggle handlers
    handleToggleUsability,
    handleToggleActive,
    handleToggleShowcase,

    // Location handlers
    handleBoroughChange,
    handleNeighborhoodChange,

    // Action handlers
    handleView,
    handleSeeDescription,
    handleSeePrices,
    handleSeeErrors,
    handleDelete,

    // Error management
    handleAddError,
    handleClearErrors,

    // Bulk price
    handleOpenPriceModal,
    handleClosePriceModal,
    handleIncrementPrices,

    // Modal
    closeModal,

    // Retry
    handleRetry,
  } = useListingsOverviewPageLogic();

  // Don't render content if redirecting (auth failed)
  if (authState.shouldRedirect) {
    return (
      <>
        <Header />
        <main className="lo-main-content">
          <div className="lo-page">
            <LoadingState />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Render modal content based on type
  const renderModalContent = () => {
    if (!modalContent.content) return null;

    switch (modalContent.content.type) {
      case 'description':
        return <DescriptionModalContent listing={modalContent.content.listing} />;
      case 'pricing':
        return <PricingModalContent listing={modalContent.content.listing} />;
      case 'errors':
        return <ErrorsModalContent listing={modalContent.content.listing} />;
      case 'priceResult':
        return (
          <PriceResultModalContent
            successCount={modalContent.content.successCount}
            failCount={modalContent.content.failCount}
            multiplier={modalContent.content.multiplier}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Header />

      <main className="lo-main-content">
        <div className="lo-page">
          {/* Page Header */}
          <ListingsHeader
            totalCount={totalCount}
            isProcessing={isProcessing}
            onIncrementPrices={handleOpenPriceModal}
          />

          <div className="lo-container">
            {/* Filter Panel */}
            <ListingsFilterPanel
              filters={filters}
              boroughs={boroughs}
              neighborhoods={neighborhoods}
              totalCount={totalCount}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />

            {/* Listings Table */}
            <div className="lo-listings-section">
              {isLoading && listings.length === 0 && <LoadingState />}

              {!isLoading && error && (
                <ErrorState error={error} onRetry={handleRetry} />
              )}

              {!isLoading && !error && listings.length === 0 && (
                <EmptyState onClearFilters={handleResetFilters} />
              )}

              {listings.length > 0 && (
                <ListingsTable
                  listings={listings}
                  boroughs={boroughs}
                  neighborhoods={neighborhoods}
                  errorOptions={PRESET_ERROR_CODES}
                  isLoading={isLoading}
                  onToggleUsability={handleToggleUsability}
                  onToggleActive={handleToggleActive}
                  onToggleShowcase={handleToggleShowcase}
                  onBoroughChange={handleBoroughChange}
                  onNeighborhoodChange={handleNeighborhoodChange}
                  onView={handleView}
                  onSeeDescription={handleSeeDescription}
                  onSeePrices={handleSeePrices}
                  onDelete={handleDelete}
                  onAddError={handleAddError}
                  onClearErrors={handleClearErrors}
                  onSeeErrors={handleSeeErrors}
                  onLoadMore={handleLoadMore}
                  hasMore={hasMore}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Generic Modal */}
      <Modal
        isOpen={modalContent.isOpen}
        onClose={closeModal}
        title={modalContent.title}
      >
        {renderModalContent()}
      </Modal>

      {/* Price Increment Modal */}
      <PriceIncrementModal
        isOpen={isPriceModalOpen}
        customMultiplier={customMultiplier}
        onMultiplierChange={setCustomMultiplier}
        onConfirm={handleIncrementPrices}
        onCancel={handleClosePriceModal}
      />
    </>
  );
}
