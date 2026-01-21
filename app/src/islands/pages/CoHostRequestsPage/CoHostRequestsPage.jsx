/**
 * CoHostRequestsPage - Admin tool for managing co-host assistance requests
 *
 * Hollow component pattern: All logic is in useCoHostRequestsPageLogic.js
 * This component only handles rendering.
 *
 * Features:
 * - List view with card-based layout
 * - Filter by status, search by name/email/listing
 * - Statistics dashboard showing counts by status
 * - Assign co-hosts to requests
 * - Add admin/request notes
 * - View full request details in modal
 * - Update request status (close requests)
 */

import useCoHostRequestsPageLogic from './useCoHostRequestsPageLogic.js';
import StatisticsBar from './components/StatisticsBar.jsx';
import FilterSection from './components/FilterSection.jsx';
import CoHostRequestCard from './components/CoHostRequestCard.jsx';
import RequestDetailsModal from './components/RequestDetailsModal.jsx';
import AssignCoHostModal from './components/AssignCoHostModal.jsx';
import NotesModal from './components/NotesModal.jsx';
import Pagination from './components/Pagination.jsx';
import './CoHostRequestsPage.css';

export default function CoHostRequestsPage() {
  const {
    // List state
    requests,
    totalCount,
    currentPage,
    totalPages,
    isLoading,

    // Filter state
    statusFilter,
    searchText,
    sortField,
    sortOrder,
    statusOptions,

    // Statistics state
    formattedStats,

    // Detail modal state
    selectedRequest,
    isDetailModalOpen,

    // Assign modal state
    isAssignModalOpen,
    assigningRequestId,
    availableCoHosts,
    isLoadingCoHosts,

    // Notes modal state
    isNotesModalOpen,
    editingNotesRequest,

    // Processing state
    isProcessing,
    error,

    // Data fetching
    fetchRequests,
    fetchAvailableCoHosts,

    // Action handlers
    updateStatus,
    assignCoHost,
    addNotes,
    closeRequest,

    // UI handlers
    openDetailModal,
    closeDetailModal,
    openAssignModal,
    closeAssignModal,
    openNotesModal,
    closeNotesModal,
    handleStatusFilterChange,
    handleSearchChange,
    handleSortChange,
    handlePageChange,
    clearFilters,

    // Computed values
    getStatusColor,
    getStatusLabel,
    formatDate,
  } = useCoHostRequestsPageLogic();

  return (
    <div className="cohost-requests-page">
      {/* Header */}
      <header className="cohost-requests-header">
        <div className="header-content">
          <h1 className="header-title">Co-Host Requests</h1>
          <p className="header-subtitle">
            Manage host assistance requests and assign co-hosts
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="refresh-button"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* Main Content */}
      <main className="cohost-requests-main">
        {/* Statistics Bar */}
        <StatisticsBar
          stats={formattedStats}
          totalCount={totalCount}
          onStatusClick={handleStatusFilterChange}
          activeStatus={statusFilter}
        />

        {/* Filter Section */}
        <FilterSection
          statusFilter={statusFilter}
          searchText={searchText}
          sortField={sortField}
          sortOrder={sortOrder}
          statusOptions={statusOptions}
          onStatusChange={handleStatusFilterChange}
          onSearchChange={handleSearchChange}
          onSortChange={handleSortChange}
          onClearFilters={clearFilters}
        />

        {/* Error State */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={fetchRequests} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <span>Loading requests...</span>
          </div>
        ) : requests.length === 0 ? (
          /* Empty State */
          <div className="empty-container">
            <EmptyIcon />
            <h3 className="empty-title">No Requests Found</h3>
            <p className="empty-text">
              {statusFilter || searchText
                ? 'No requests match your current filters. Try adjusting your search criteria.'
                : 'There are no co-host requests in the system yet.'}
            </p>
            {(statusFilter || searchText) && (
              <button onClick={clearFilters} className="clear-filters-button">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          /* Request Cards */
          <>
            <div className="requests-grid">
              {requests.map((request) => (
                <CoHostRequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={() => openDetailModal(request)}
                  onAssignCoHost={() => openAssignModal(request.id)}
                  onAddNotes={() => openNotesModal(request)}
                  onCloseRequest={() => closeRequest(request.id)}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  formatDate={formatDate}
                  isProcessing={isProcessing}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="cohost-requests-footer">
        <p className="footer-text">
          Split Lease Admin Dashboard - Internal Use Only
        </p>
      </footer>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          onClose={closeDetailModal}
          onAssignCoHost={() => openAssignModal(selectedRequest.id)}
          onAddNotes={() => openNotesModal(selectedRequest)}
          onCloseRequest={() => closeRequest(selectedRequest.id)}
          onUpdateStatus={updateStatus}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
          formatDate={formatDate}
          isProcessing={isProcessing}
        />
      )}

      {/* Assign Co-Host Modal */}
      {isAssignModalOpen && (
        <AssignCoHostModal
          requestId={assigningRequestId}
          cohosts={availableCoHosts}
          isLoading={isLoadingCoHosts}
          onAssign={assignCoHost}
          onClose={closeAssignModal}
          onSearch={fetchAvailableCoHosts}
          isProcessing={isProcessing}
        />
      )}

      {/* Notes Modal */}
      {isNotesModalOpen && editingNotesRequest && (
        <NotesModal
          request={editingNotesRequest}
          onSave={addNotes}
          onClose={closeNotesModal}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

// ===== ICONS =====

function EmptyIcon() {
  return (
    <svg
      className="empty-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
