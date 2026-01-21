/**
 * LeasesOverviewPage - Admin Dashboard for Lease Management
 *
 * This is a HOLLOW COMPONENT - it contains NO business logic.
 * All logic is delegated to useLeasesOverviewPageLogic hook.
 *
 * Features:
 * - View all leases with filtering/search
 * - Update lease status
 * - Soft delete (cancel) and hard delete leases
 * - Bulk operations (status change, export, delete)
 * - Document management (upload, view, delete)
 *
 * @see useLeasesOverviewPageLogic.js for all business logic
 */

import { useToast } from '../../shared/Toast';
import { useLeasesOverviewPageLogic } from './useLeasesOverviewPageLogic';
import LeaseCard from './components/LeaseCard';
import SearchBox from './components/SearchBox';
import LeaseDropdown from './components/LeaseDropdown';
import BulkActionToolbar from './components/BulkActionToolbar';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';
import ConfirmDialog from './components/ConfirmDialog';

export default function LeasesOverviewPage() {
  const { showToast } = useToast();
  const logic = useLeasesOverviewPageLogic({ showToast });

  // Loading state
  if (logic.isLoading && !logic.leases.length) {
    return (
      <div className="leases-overview">
        <LoadingState message="Loading leases..." />
      </div>
    );
  }

  // Error state
  if (logic.error && !logic.leases.length) {
    return (
      <div className="leases-overview">
        <ErrorState
          message={logic.error}
          onRetry={logic.handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="leases-overview">
      {/* Header */}
      <header className="leases-overview__header">
        <div className="leases-overview__header-content">
          <h1 className="leases-overview__title">Leases Overview</h1>
          <p className="leases-overview__subtitle">
            Manage and monitor all lease agreements
          </p>
        </div>
        <div className="leases-overview__header-stats">
          <div className="leases-overview__stat">
            <span className="leases-overview__stat-value">{logic.stats.total}</span>
            <span className="leases-overview__stat-label">Total</span>
          </div>
          <div className="leases-overview__stat leases-overview__stat--active">
            <span className="leases-overview__stat-value">{logic.stats.active}</span>
            <span className="leases-overview__stat-label">Active</span>
          </div>
          <div className="leases-overview__stat leases-overview__stat--completed">
            <span className="leases-overview__stat-value">{logic.stats.completed}</span>
            <span className="leases-overview__stat-label">Completed</span>
          </div>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="leases-overview__filters">
        <SearchBox
          value={logic.searchQuery}
          onChange={logic.setSearchQuery}
          placeholder="Search by ID, guest, listing..."
        />
        <LeaseDropdown
          value={logic.statusFilter}
          onChange={logic.setStatusFilter}
          options={logic.statusOptions}
          label="Status"
        />
        <LeaseDropdown
          value={logic.sortField}
          onChange={logic.setSortField}
          options={logic.sortOptions}
          label="Sort by"
        />
        <button
          className={`leases-overview__sort-order ${logic.sortOrder === 'desc' ? 'leases-overview__sort-order--desc' : ''}`}
          onClick={logic.toggleSortOrder}
          aria-label={`Sort ${logic.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Bulk Action Toolbar (shown when items selected) */}
      {logic.selectedLeases.length > 0 && (
        <BulkActionToolbar
          selectedCount={logic.selectedLeases.length}
          onSelectAll={logic.handleSelectAll}
          onClearSelection={logic.handleClearSelection}
          onBulkStatusChange={logic.handleBulkStatusChange}
          onBulkExport={logic.handleBulkExport}
          onBulkDelete={logic.handleBulkSoftDelete}
          isAllSelected={logic.isAllSelected}
          statusOptions={logic.bulkStatusOptions}
        />
      )}

      {/* Lease Cards Grid */}
      {logic.filteredLeases.length === 0 ? (
        <EmptyState
          title={logic.searchQuery || logic.statusFilter !== 'all' ? 'No matching leases' : 'No leases found'}
          message={
            logic.searchQuery || logic.statusFilter !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Leases will appear here once created'
          }
          onClearFilters={logic.searchQuery || logic.statusFilter !== 'all' ? logic.handleClearFilters : null}
        />
      ) : (
        <div className="leases-overview__grid">
          {logic.filteredLeases.map((lease) => (
            <LeaseCard
              key={lease.id}
              lease={lease}
              isSelected={logic.selectedLeases.includes(lease.id)}
              onSelect={logic.handleSelectLease}
              onStatusChange={logic.handleStatusChange}
              onSoftDelete={logic.handleSoftDelete}
              onHardDelete={logic.handleHardDelete}
              onViewDocuments={logic.handleViewDocuments}
              onUploadDocument={logic.handleUploadDocument}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {logic.totalPages > 1 && (
        <div className="leases-overview__pagination">
          <button
            className="leases-overview__pagination-btn"
            onClick={() => logic.setPage(logic.page - 1)}
            disabled={logic.page === 1}
          >
            Previous
          </button>
          <span className="leases-overview__pagination-info">
            Page {logic.page} of {logic.totalPages}
          </span>
          <button
            className="leases-overview__pagination-btn"
            onClick={() => logic.setPage(logic.page + 1)}
            disabled={logic.page === logic.totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Confirm Dialog for Delete Operations */}
      {logic.confirmDialog && (
        <ConfirmDialog
          isOpen={logic.confirmDialog.isOpen}
          title={logic.confirmDialog.title}
          message={logic.confirmDialog.message}
          confirmLabel={logic.confirmDialog.confirmLabel}
          confirmType={logic.confirmDialog.confirmType}
          onConfirm={logic.confirmDialog.onConfirm}
          onCancel={logic.handleCloseConfirmDialog}
          requiresDoubleConfirm={logic.confirmDialog.requiresDoubleConfirm}
        />
      )}

      {/* Loading Overlay */}
      {logic.isLoading && logic.leases.length > 0 && (
        <div className="leases-overview__loading-overlay">
          <div className="leases-overview__loading-spinner" />
        </div>
      )}
    </div>
  );
}
