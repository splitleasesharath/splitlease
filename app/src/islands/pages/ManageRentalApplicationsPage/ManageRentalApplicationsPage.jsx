/**
 * ManageRentalApplicationsPage - Admin dashboard for managing rental applications
 *
 * This is a HOLLOW COMPONENT - all logic lives in useManageRentalApplicationsPageLogic.js
 *
 * Features:
 * - List view with search, filters, sorting, pagination
 * - Detail view for individual applications
 * - Edit modal for updating application data
 * - Status management (approve, deny, etc.)
 * - Deep linking support via URL parameter (?id=xxx)
 */

import React from 'react';
import { useManageRentalApplicationsPageLogic } from './useManageRentalApplicationsPageLogic.js';
import SearchFilters from './components/SearchFilters.jsx';
import ApplicationsTable from './components/ApplicationsTable.jsx';
import ApplicationDetailView from './components/ApplicationDetailView.jsx';
import EditApplicationModal from './modals/EditApplicationModal.jsx';
import { useToast } from '../../shared/Toast.jsx';

export default function ManageRentalApplicationsPage() {
  const { showToast } = useToast();
  const logic = useManageRentalApplicationsPageLogic({ showToast });

  // Loading state
  if (logic.isInitializing) {
    return (
      <div className="manage-rental-apps">
        <div className="manage-rental-apps__loading">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthorized
  if (!logic.isAuthorized) {
    return (
      <div className="manage-rental-apps">
        <div className="manage-rental-apps__unauthorized">
          <h2>Access Denied</h2>
          <p>You are not authorized to view this page. Admin access required.</p>
          <a href="/" className="btn btn--primary">Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-rental-apps">
      {/* Header */}
      <header className="manage-rental-apps__header">
        <div className="manage-rental-apps__header-content">
          <h1>Manage Rental Applications</h1>
          <p className="manage-rental-apps__subtitle">
            {logic.pagination.total} total application{logic.pagination.total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats Summary */}
        <div className="manage-rental-apps__stats">
          <div className="stat-card stat-card--submitted">
            <span className="stat-card__value">{logic.stats.submitted}</span>
            <span className="stat-card__label">Submitted</span>
          </div>
          <div className="stat-card stat-card--under-review">
            <span className="stat-card__value">{logic.stats.underReview}</span>
            <span className="stat-card__label">Under Review</span>
          </div>
          <div className="stat-card stat-card--approved">
            <span className="stat-card__value">{logic.stats.approved}</span>
            <span className="stat-card__label">Approved</span>
          </div>
          <div className="stat-card stat-card--denied">
            <span className="stat-card__value">{logic.stats.denied}</span>
            <span className="stat-card__label">Denied</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="manage-rental-apps__main">
        {/* Error Banner */}
        {logic.error && (
          <div className="manage-rental-apps__error-banner">
            <span>{logic.error}</span>
            <button onClick={logic.handleRetry} className="btn btn--small">
              Retry
            </button>
          </div>
        )}

        {/* View Toggle: List or Detail */}
        {logic.viewMode === 'list' ? (
          <>
            <SearchFilters
              filters={logic.filters}
              statusOptions={logic.statusOptions}
              onUpdateFilters={logic.handleUpdateFilters}
              onClearFilters={logic.handleClearFilters}
            />

            <ApplicationsTable
              applications={logic.applications}
              isLoading={logic.isLoading}
              pagination={logic.pagination}
              sort={logic.sort}
              onSelectApplication={logic.handleSelectApplication}
              onUpdateSort={logic.handleUpdateSort}
              onChangePage={logic.handleChangePage}
              onChangePageSize={logic.handleChangePageSize}
            />
          </>
        ) : (
          <ApplicationDetailView
            application={logic.selectedApplication}
            isLoading={logic.isLoadingDetail}
            onBack={logic.handleBackToList}
            onEdit={logic.handleOpenEditModal}
            onUpdateStatus={logic.handleUpdateStatus}
            statusOptions={logic.statusOptions}
          />
        )}
      </main>

      {/* Edit Modal */}
      {logic.isEditModalOpen && (
        <EditApplicationModal
          application={logic.selectedApplication}
          editSection={logic.editSection}
          onClose={logic.handleCloseEditModal}
          onSave={logic.handleSaveEdit}
          isSaving={logic.isSaving}
        />
      )}
    </div>
  );
}
