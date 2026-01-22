/**
 * AdminThreadsPage - Admin Dashboard for Thread/Message Management
 *
 * This is a HOLLOW COMPONENT - it contains NO business logic.
 * All logic is delegated to useAdminThreadsPageLogic hook.
 *
 * Features:
 * - View ALL messaging threads across the platform
 * - Filter by guest email, host email, proposal ID, thread ID
 * - Soft delete threads (recoverable)
 * - Send reminders to host/guest via email or SMS
 * - View messages categorized by sender type
 *
 * @see useAdminThreadsPageLogic.js for all business logic
 */

import { Toaster } from 'react-hot-toast';
import { useAdminThreadsPageLogic } from './useAdminThreadsPageLogic';
import AdminHeader from './components/AdminHeader';
import FilterBar from './components/FilterBar';
import ThreadList from './components/ThreadList';
import ThreadCard from './components/ThreadCard';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import ReminderModal from './components/ReminderModal';

export default function AdminThreadsPage() {
  const logic = useAdminThreadsPageLogic();

  // Not authenticated yet
  if (logic.authState === 'checking') {
    return (
      <div className="admin-threads">
        <LoadingState message="Checking authentication..." />
      </div>
    );
  }

  // Not admin
  if (logic.authState === 'unauthorized') {
    return (
      <div className="admin-threads">
        <ErrorState
          message="You do not have permission to access this page."
          onRetry={null}
        />
      </div>
    );
  }

  // Loading state
  if (logic.isLoading && !logic.threads.length) {
    return (
      <div className="admin-threads">
        <AdminHeader />
        <LoadingState message="Loading threads..." />
        <Toaster position="top-right" />
      </div>
    );
  }

  // Error state
  if (logic.error && !logic.threads.length) {
    return (
      <div className="admin-threads">
        <AdminHeader />
        <ErrorState
          message={logic.error}
          onRetry={logic.handleRetry}
        />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="admin-threads">
      <AdminHeader />

      {/* Stats Summary */}
      <div className="admin-threads__stats">
        <div className="admin-threads__stat">
          <span className="admin-threads__stat-value">{logic.stats.total}</span>
          <span className="admin-threads__stat-label">Total Threads</span>
        </div>
        <div className="admin-threads__stat">
          <span className="admin-threads__stat-value">{logic.stats.withMessages}</span>
          <span className="admin-threads__stat-label">With Messages</span>
        </div>
        <div className="admin-threads__stat">
          <span className="admin-threads__stat-value">{logic.stats.recentActivity}</span>
          <span className="admin-threads__stat-label">Active (24h)</span>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={logic.filters}
        onFilterChange={logic.handleFilterChange}
        onClearFilters={logic.handleClearFilters}
        onSearch={logic.handleSearch}
      />

      {/* Thread List */}
      {logic.filteredThreads.length === 0 ? (
        <EmptyState
          title={logic.hasActiveFilters ? 'No matching threads' : 'No threads found'}
          message={
            logic.hasActiveFilters
              ? 'Try adjusting your filters or search terms'
              : 'Threads will appear here once users start messaging'
          }
          onClearFilters={logic.hasActiveFilters ? logic.handleClearFilters : null}
        />
      ) : (
        <ThreadList>
          {logic.filteredThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onDelete={logic.handleDeleteThread}
              onSendReminder={logic.handleOpenReminderModal}
              onViewMessages={logic.handleViewMessages}
              expandedThreadId={logic.expandedThreadId}
              onToggleExpand={logic.handleToggleExpand}
            />
          ))}
        </ThreadList>
      )}

      {/* Pagination */}
      {logic.totalPages > 1 && (
        <div className="admin-threads__pagination">
          <button
            className="admin-threads__pagination-btn"
            onClick={() => logic.setPage(logic.page - 1)}
            disabled={logic.page === 1}
          >
            Previous
          </button>
          <span className="admin-threads__pagination-info">
            Page {logic.page} of {logic.totalPages}
          </span>
          <button
            className="admin-threads__pagination-btn"
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
        />
      )}

      {/* Reminder Modal */}
      {logic.reminderModal && (
        <ReminderModal
          isOpen={logic.reminderModal.isOpen}
          thread={logic.reminderModal.thread}
          onSend={logic.handleSendReminder}
          onClose={logic.handleCloseReminderModal}
          isSending={logic.isSendingReminder}
        />
      )}

      {/* Loading Overlay */}
      {logic.isLoading && logic.threads.length > 0 && (
        <div className="admin-threads__loading-overlay">
          <div className="admin-threads__loading-spinner" />
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
