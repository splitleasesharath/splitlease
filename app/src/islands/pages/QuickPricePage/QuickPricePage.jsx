/**
 * QuickPricePage - Admin Dashboard for Listing Price Management
 *
 * This is a HOLLOW COMPONENT - it contains NO business logic.
 * All logic is delegated to useQuickPricePageLogic hook.
 *
 * Features:
 * - View all listings with pricing data
 * - Filter by rental type, borough, neighborhood, active status
 * - Inline price editing via modal
 * - Set/clear price overrides
 * - Activate/deactivate listings
 * - Bulk operations (update, export)
 * - View global pricing configuration (read-only)
 *
 * @see useQuickPricePageLogic.js for all business logic
 */

import { useToast } from '../../shared/Toast';
import { useQuickPricePageLogic } from './useQuickPricePageLogic';
import PricingFilters from './components/PricingFilters';
import ListingsTable from './components/ListingsTable';
import PricingConfigPanel from './components/PricingConfigPanel';
import PriceEditModal from './components/PriceEditModal';
import BulkActionsBar from './components/BulkActionsBar';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';

export default function QuickPricePage() {
  const { showToast } = useToast();
  const logic = useQuickPricePageLogic({ showToast });

  // Loading state (initial load)
  if (logic.isLoading && !logic.listings.length) {
    return (
      <div className="quick-price">
        <LoadingState message="Loading listings..." />
      </div>
    );
  }

  // Error state
  if (logic.error && !logic.listings.length) {
    return (
      <div className="quick-price">
        <ErrorState
          message={logic.error}
          onRetry={logic.handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="quick-price">
      {/* Header */}
      <header className="quick-price__header">
        <div className="quick-price__header-content">
          <h1 className="quick-price__title">Quick Price</h1>
          <p className="quick-price__subtitle">
            Manage listing prices and overrides
          </p>
        </div>
        <div className="quick-price__header-stats">
          <div className="quick-price__stat">
            <span className="quick-price__stat-value">{logic.stats.total}</span>
            <span className="quick-price__stat-label">Total</span>
          </div>
          <div className="quick-price__stat quick-price__stat--active">
            <span className="quick-price__stat-value">{logic.stats.active}</span>
            <span className="quick-price__stat-label">Active</span>
          </div>
          <div className="quick-price__stat quick-price__stat--override">
            <span className="quick-price__stat-value">{logic.stats.withOverride}</span>
            <span className="quick-price__stat-label">With Override</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="quick-price__content">
        {/* Left Sidebar - Filters */}
        <aside className="quick-price__sidebar quick-price__sidebar--left">
          <PricingFilters
            searchQuery={logic.searchQuery}
            onSearchChange={logic.setSearchQuery}
            rentalTypeFilter={logic.rentalTypeFilter}
            onRentalTypeChange={logic.setRentalTypeFilter}
            rentalTypeOptions={logic.rentalTypeOptions}
            boroughFilter={logic.boroughFilter}
            onBoroughChange={logic.setBoroughFilter}
            boroughOptions={logic.boroughOptions}
            neighborhoodFilter={logic.neighborhoodFilter}
            onNeighborhoodChange={logic.setNeighborhoodFilter}
            activeOnlyFilter={logic.activeOnlyFilter}
            onActiveOnlyChange={logic.setActiveOnlyFilter}
            sortField={logic.sortField}
            onSortFieldChange={logic.setSortField}
            sortOptions={logic.sortOptions}
            sortOrder={logic.sortOrder}
            onSortOrderToggle={logic.toggleSortOrder}
            onClearFilters={logic.handleClearFilters}
          />
        </aside>

        {/* Main Table Area */}
        <main className="quick-price__main">
          {/* Bulk Action Toolbar (shown when items selected) */}
          {logic.selectedListings.length > 0 && (
            <BulkActionsBar
              selectedCount={logic.selectedListings.length}
              onSelectAll={logic.handleSelectAll}
              onClearSelection={logic.handleClearSelection}
              onBulkExport={logic.handleBulkExport}
              isAllSelected={logic.isAllSelected}
            />
          )}

          {/* Listings Table */}
          {logic.listings.length === 0 ? (
            <EmptyState
              title={logic.searchQuery || logic.rentalTypeFilter || logic.boroughFilter ? 'No matching listings' : 'No listings found'}
              message={
                logic.searchQuery || logic.rentalTypeFilter || logic.boroughFilter
                  ? 'Try adjusting your filters or search terms'
                  : 'Listings will appear here once created'
              }
              onClearFilters={logic.searchQuery || logic.rentalTypeFilter || logic.boroughFilter ? logic.handleClearFilters : null}
            />
          ) : (
            <>
              <ListingsTable
                listings={logic.listings}
                selectedListings={logic.selectedListings}
                onSelectListing={logic.handleSelectListing}
                onSelectAll={logic.handleSelectAll}
                isAllSelected={logic.isAllSelected}
                onEditListing={logic.handleOpenEdit}
                onToggleActive={logic.handleToggleActive}
                onSetOverride={logic.handleSetOverride}
              />

              {/* Pagination */}
              {logic.totalPages > 1 && (
                <div className="quick-price__pagination">
                  <button
                    className="quick-price__pagination-btn"
                    onClick={() => logic.setPage(logic.page - 1)}
                    disabled={logic.page === 1}
                  >
                    Previous
                  </button>
                  <span className="quick-price__pagination-info">
                    Page {logic.page} of {logic.totalPages} ({logic.totalCount} total)
                  </span>
                  <button
                    className="quick-price__pagination-btn"
                    onClick={() => logic.setPage(logic.page + 1)}
                    disabled={logic.page === logic.totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* Right Sidebar - Pricing Config */}
        <aside className="quick-price__sidebar quick-price__sidebar--right">
          <PricingConfigPanel config={logic.pricingConfig} />
        </aside>
      </div>

      {/* Edit Modal */}
      {logic.editingListing && (
        <PriceEditModal
          listing={logic.editingListing}
          formData={logic.editFormData}
          onChange={logic.handleEditFormChange}
          onSave={logic.handleSaveEdit}
          onClose={logic.handleCloseEdit}
          isLoading={logic.isLoading}
        />
      )}

      {/* Loading Overlay */}
      {logic.isLoading && logic.listings.length > 0 && (
        <div className="quick-price__loading-overlay">
          <div className="quick-price__loading-spinner" />
        </div>
      )}
    </div>
  );
}
